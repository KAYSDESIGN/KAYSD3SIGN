#if canImport(CoreImage)
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import MFDomain
import MFEngine

/// Local 2D compositor: turns a `RenderPlan` into an image with Core Image (GPU), no network.
///
/// Paint keeps the photo's shading: the base luminance is normalized around 0.5 inside the mask,
/// then overlaid on the target color, so shadows, volumes and reflections of the original photo survive.
/// Finishes beyond gloss/satin/matte are approximations and are labelled « Simulation » in the UI.
public final class BikeCompositor: @unchecked Sendable {
    public typealias AssetLoader = @Sendable (String) -> CIImage?

    private let context: CIContext
    private let loadAsset: AssetLoader
    /// Fill used where an original part is erased and no clean plate exists.
    private let stageColor: CIColor

    public init(loadAsset: @escaping AssetLoader, stageColor: CIColor = CIColor(red: 0.96, green: 0.96, blue: 0.97),
                context: CIContext = CIContext(options: [.cacheIntermediates: true])) {
        self.loadAsset = loadAsset
        self.stageColor = stageColor
        self.context = context
    }

    public enum CompositorError: Error, Equatable {
        case missingAsset(String)
        case renderFailed
    }

    public func render(_ plan: RenderPlan) throws -> CGImage {
        guard case .base(let baseName)? = plan.layers.first else { throw CompositorError.renderFailed }
        guard let base = loadAsset(baseName) else { throw CompositorError.missingAsset(baseName) }
        let extent = base.extent
        var current = base

        for layer in plan.layers.dropFirst() {
            switch layer {
            case .base:
                continue
            case .erase(let maskName):
                let mask = try loadMask(maskName, extent: extent)
                let fill = CIImage(color: stageColor).cropped(to: extent)
                current = blend(fill, over: current, mask: mask)
            case .component(_, let maskName, let style):
                let mask = try loadMask(maskName, extent: extent)
                current = blend(styled(base, style: style, mask: mask), over: current, mask: mask)
            case .occluder(_, let maskName, let style):
                let mask = try loadMask(maskName, extent: extent)
                let source = style.map { styled(base, style: $0, mask: mask) } ?? base
                current = blend(source, over: current, mask: mask)
            case .accessory(_, let assetName, let anchor, let placement):
                guard let asset = loadAsset(assetName) else { throw CompositorError.missingAsset(assetName) }
                current = place(asset, anchor: anchor, placement: placement, in: extent).composited(over: current)
            }
        }
        guard let cg = context.createCGImage(current.cropped(to: extent), from: extent) else { throw CompositorError.renderFailed }
        return cg
    }

    // MARK: - Materials

    private func styled(_ base: CIImage, style: ComponentStyle, mask: CIImage) -> CIImage {
        switch style {
        case .paint(let material):
            return paint(base, material: material, mask: mask)
        case .wrap(let wrap):
            // v1: films are rendered as paint; stripes, patterns, stickers and imported logos are planned.
            for layer in wrap.layers.reversed() {
                if case .film(let material, _) = layer.content { return paint(base, material: material, mask: mask) }
            }
            return base
        }
    }

    private func paint(_ base: CIImage, material: Material, mask: CIImage) -> CIImage {
        let p = material.parameters
        let extent = base.extent

        // 1. Shading: luminance normalized so the masked average sits at 0.5.
        let gray = base.applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0])
        let average = maskedAverageLuminance(gray, mask: mask)
        let gain = average > 0.001 ? 0.5 / average : 1
        var shading = gray.applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: gain, y: 0, z: 0, w: 0),
            "inputGVector": CIVector(x: 0, y: gain, z: 0, w: 0),
            "inputBVector": CIVector(x: 0, y: 0, z: gain, w: 0)
        ])

        // 2. Finish: gloss keeps contrast (reflections), roughness flattens it.
        let contrast = 0.45 + 0.55 * p.gloss * (1 - 0.6 * p.roughness)
        shading = shading.applyingFilter("CIColorControls", parameters: [kCIInputContrastKey: contrast])

        // 3. Color layer (solid, bi-color or multi-color gradient).
        let color = material.baseColor.rgb.adjusted(by: p)
        var colorLayer = CIImage(color: CIColor(red: color.red, green: color.green, blue: color.blue)).cropped(to: extent)
        if p.gradientStops.count >= 2, let first = p.gradientStops.first, let last = p.gradientStops.last {
            colorLayer = gradient(from: first.color.adjusted(by: p), to: last.color.adjusted(by: p),
                                  angle: p.gradientAngleDegrees, in: mask.extent.intersection(extent))
                .composited(over: colorLayer)
        }

        var result = shading.applyingFilter("CIOverlayBlendMode", parameters: [kCIInputBackgroundImageKey: colorLayer])

        // 4. Simulated effects (labelled « Simulation » in the UI).
        switch material.effect {
        case .metallic, .glitter:
            let noise = CIFilter.randomGenerator().outputImage!
                .transformed(by: CGAffineTransform(scaleX: 0.6 + 2 * p.flakeSize, y: 0.6 + 2 * p.flakeSize))
                .applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0, kCIInputContrastKey: 1 + p.flakeDensity])
                .cropped(to: extent)
            let flakes = noise.applyingFilter("CIColorMatrix", parameters: ["inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0.18 * p.effectIntensity)])
            result = flakes.applyingFilter("CISoftLightBlendMode", parameters: [kCIInputBackgroundImageKey: result])
        case .pearl:
            let tint = p.secondaryColor ?? RGBColor.white
            let pearl = CIImage(color: CIColor(red: tint.red, green: tint.green, blue: tint.blue, alpha: 0.35 * p.pearlIntensity)).cropped(to: extent)
            result = pearl.applyingFilter("CIScreenBlendMode", parameters: [kCIInputBackgroundImageKey: result])
        case .candy:
            result = result.applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 1 + 0.4 * p.effectIntensity, kCIInputBrightnessKey: -0.04])
        default:
            break
        }
        return result.cropped(to: extent)
    }

    private func maskedAverageLuminance(_ gray: CIImage, mask: CIImage) -> Double {
        let region = mask.extent.intersection(gray.extent)
        guard !region.isEmpty else { return 0.5 }
        let masked = gray.applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: mask])
        let a = averagePixel(masked, region), m = averagePixel(mask, region)
        return m > 0.0001 ? a / m : 0.5
    }

    private func averagePixel(_ image: CIImage, _ region: CGRect) -> Double {
        let avg = image.applyingFilter("CIAreaAverage", parameters: [kCIInputExtentKey: CIVector(cgRect: region)])
        var px = [Float](repeating: 0, count: 4)
        context.render(avg, toBitmap: &px, rowBytes: 16, bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                       format: .RGBAf, colorSpace: nil)
        return Double(px[0])
    }

    private func gradient(from a: RGBColor, to b: RGBColor, angle: Double, in rect: CGRect) -> CIImage {
        let radians = angle * .pi / 180
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let half = max(rect.width, rect.height) / 2
        let dx = cos(radians) * half, dy = sin(radians) * half
        let f = CIFilter.smoothLinearGradient()
        f.point0 = CGPoint(x: center.x - dx, y: center.y - dy)
        f.point1 = CGPoint(x: center.x + dx, y: center.y + dy)
        f.color0 = CIColor(red: a.red, green: a.green, blue: a.blue)
        f.color1 = CIColor(red: b.red, green: b.green, blue: b.blue)
        return f.outputImage!.cropped(to: rect)
    }

    // MARK: - Helpers

    private func loadMask(_ name: String, extent: CGRect) throws -> CIImage {
        guard let mask = loadAsset(name) else { throw CompositorError.missingAsset(name) }
        // Masks are grayscale; CIBlendWithMask reads luminance. Scale if exported at another size.
        guard mask.extent.size != extent.size, mask.extent.width > 0, mask.extent.height > 0 else { return mask }
        return mask.transformed(by: CGAffineTransform(scaleX: extent.width / mask.extent.width, y: extent.height / mask.extent.height))
    }

    private func blend(_ top: CIImage, over bottom: CIImage, mask: CIImage) -> CIImage {
        top.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: bottom, kCIInputMaskImageKey: mask])
    }

    /// Normalized coordinates have a top-left origin; Core Image uses bottom-left.
    private func place(_ asset: CIImage, anchor: NormalizedPoint, placement: Placement, in extent: CGRect) -> CIImage {
        let ax = asset.extent.width * anchor.x, ay = asset.extent.height * (1 - anchor.y)
        let tx = extent.width * placement.position.x, ty = extent.height * (1 - placement.position.y)
        let t = CGAffineTransform(translationX: -ax, y: -ay)
            .concatenating(CGAffineTransform(scaleX: placement.scale, y: placement.scale))
            .concatenating(CGAffineTransform(rotationAngle: -placement.rotationDegrees * .pi / 180))
            .concatenating(CGAffineTransform(translationX: tx, y: ty))
        return asset.transformed(by: t)
    }
}
#endif
