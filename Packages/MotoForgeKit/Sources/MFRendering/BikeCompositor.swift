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

    /// - Parameter scale: output scale (e.g. 0.35 for thumbnails); every input is resampled first so the cost drops with it.
    public func render(_ plan: RenderPlan, scale: CGFloat = 1) throws -> CGImage {
        guard scale < 1 else { return try renderPlan(plan) }
        // A throw-away compositor with a resampling loader: no shared mutable state (thread-safe), same CIContext.
        let original = loadAsset
        let scaled = BikeCompositor(loadAsset: { original($0)?.transformed(by: CGAffineTransform(scaleX: scale, y: scale)) },
                                    stageColor: stageColor, context: context)
        return try scaled.renderPlan(plan)
    }

    private func load(_ name: String) -> CIImage? { loadAsset(name) }

    private func renderPlan(_ plan: RenderPlan) throws -> CGImage {
        guard case .base(let baseName)? = plan.layers.first else { throw CompositorError.renderFailed }
        guard let base = load(baseName) else { throw CompositorError.missingAsset(baseName) }
        let extent = base.extent
        var current = base

        for layer in plan.layers.dropFirst() {
            switch layer {
            case .base:
                continue
            case .erase(let maskName):
                let mask = try loadMask(maskName, extent: extent)
                // Prefer a clean plate (the bike rendered without that part); fall back to the stage colour.
                let fill = Self.cleanPlateName(forMask: maskName).flatMap { self.load($0) } ?? CIImage(color: stageColor).cropped(to: extent)
                current = blend(fill, over: current, mask: mask)
            case .component(_, let maskName, let style):
                let mask = try loadMask(maskName, extent: extent)
                current = blend(styled(base, style: style, mask: mask), over: current, mask: mask)
            case .occluder(_, let maskName, let style):
                let mask = try loadMask(maskName, extent: extent)
                let source = style.map { styled(base, style: $0, mask: mask) } ?? base
                current = blend(source, over: current, mask: mask)
            case .accessory(_, let assetName, let anchor, let placement):
                guard let asset = load(assetName) else { throw CompositorError.missingAsset(assetName) }
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
            return covering(base, wrap: wrap, mask: mask)
        }
    }

    // MARK: - Covering (vinyl wrap layers)

    /// Renders wrap layers bottom-to-top. Every layer keeps the photo shading (overlay blend on the
    /// normalized luminance), is clipped to the component mask and to its own region.
    private func covering(_ base: CIImage, wrap: WrapDesign, mask: CIImage) -> CIImage {
        let extent = base.extent
        let bounds = maskBounds(mask, extent: extent)
        let shading = normalizedShading(base, mask: mask, gloss: 0.8, roughness: 0.2)
        var result = base
        for layer in wrap.layers {
            // Region of the component covered by this layer (normalized to the component bounds, top-left origin).
            let r = layer.region
            let regionRect = CGRect(x: bounds.minX + r.x * bounds.width,
                                    y: bounds.maxY - (r.y + r.height) * bounds.height,
                                    width: r.width * bounds.width, height: r.height * bounds.height)
            guard let (color, coverage) = layerImage(layer, shading: shading, base: base, mask: mask, bounds: bounds, extent: extent) else { continue }
            var layerMask = mask.applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: coverage])
            if wrap.coverage == .partial || r != .full {
                let regionMask = CIImage(color: .white).cropped(to: regionRect)
                    .composited(over: CIImage(color: .black).cropped(to: extent))
                layerMask = layerMask.applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: regionMask])
            }
            if layer.opacity < 1 {
                layerMask = layerMask.applyingFilter("CIColorMatrix", parameters: [
                    "inputRVector": CIVector(x: layer.opacity, y: 0, z: 0, w: 0),
                    "inputGVector": CIVector(x: 0, y: layer.opacity, z: 0, w: 0),
                    "inputBVector": CIVector(x: 0, y: 0, z: layer.opacity, w: 0)
                ])
            }
            result = blend(color, over: result, mask: layerMask.cropped(to: extent))
        }
        return result.cropped(to: extent)
    }

    /// Returns (colored layer image, coverage mask white where the layer has content).
    private func layerImage(_ layer: WrapLayer, shading: CIImage, base: CIImage, mask: CIImage, bounds: CGRect, extent: CGRect) -> (CIImage, CIImage)? {
        let full = CIImage(color: .white).cropped(to: extent)
        func shaded(_ colorImage: CIImage) -> CIImage {
            shading.applyingFilter("CIOverlayBlendMode", parameters: [kCIInputBackgroundImageKey: colorImage]).cropped(to: extent)
        }
        func solid(_ c: RGBColor) -> CIImage { CIImage(color: CIColor(red: c.red, green: c.green, blue: c.blue)).cropped(to: extent) }
        let p = layer.placement
        let center = CGPoint(x: extent.width * p.position.x, y: extent.height * (1 - p.position.y))
        let size = max(bounds.width, bounds.height) * CGFloat(p.scale)
        let rotation = CGAffineTransform(translationX: -center.x, y: -center.y)
            .concatenating(CGAffineTransform(rotationAngle: -p.rotationDegrees * .pi / 180))
            .concatenating(CGAffineTransform(translationX: center.x, y: center.y))

        switch layer.content {
        case .film(let material, _):
            return (paint(base, material: material, mask: mask), full)
        case .gradient(let stops, let angle):
            guard let first = stops.first, let last = stops.last else { return nil }
            let g = gradient(from: first.color, to: last.color, angle: angle, in: bounds).composited(over: solid(first.color))
            return (shaded(g), full)
        case .stripe(let color, let widthRatio, let count, let spacingRatio):
            let stripeHeight = max(bounds.height * CGFloat(widthRatio) * CGFloat(p.scale), 1)
            let spacing = bounds.height * CGFloat(spacingRatio) * CGFloat(p.scale)
            var stripes = CIImage(color: .black).cropped(to: extent)
            let n = max(count, 1)
            let total = CGFloat(n) * stripeHeight + CGFloat(n - 1) * spacing
            for i in 0..<n {
                let y = center.y - total / 2 + CGFloat(i) * (stripeHeight + spacing)
                let band = CIImage(color: .white).cropped(to: CGRect(x: extent.minX - extent.width, y: y, width: extent.width * 3, height: stripeHeight))
                stripes = band.composited(over: stripes)
            }
            return (shaded(solid(color)), stripes.transformed(by: rotation).cropped(to: extent))
        case .geometricPattern(let name, let primary, let secondary):
            let cell = max(bounds.width * 0.06 * CGFloat(p.scale), 2)
            let pattern: CIImage
            if name == "stripes" {
                let f = CIFilter.stripesGenerator()
                f.center = center; f.color0 = CIColor(red: primary.red, green: primary.green, blue: primary.blue)
                f.color1 = CIColor(red: secondary.red, green: secondary.green, blue: secondary.blue); f.width = Float(cell); f.sharpness = 1
                pattern = f.outputImage!
            } else {
                let f = CIFilter.checkerboardGenerator()
                f.center = center; f.color0 = CIColor(red: primary.red, green: primary.green, blue: primary.blue)
                f.color1 = CIColor(red: secondary.red, green: secondary.green, blue: secondary.blue); f.width = Float(cell); f.sharpness = 1
                pattern = f.outputImage!
            }
            return (shaded(pattern.transformed(by: rotation).cropped(to: extent)), full)
        case .sticker(let assetName):
            guard let img = load(assetName) else { return nil }
            return decal(img, center: center, size: size, rotation: p.rotationDegrees, extent: extent, shading: shading, tile: false)
        case .userImage(let file, let isTexture):
            guard let img = load("file:" + file) else { return nil }
            return decal(img, center: center, size: size, rotation: p.rotationDegrees, extent: extent, shading: shading, tile: isTexture)
        }
    }

    /// Places an RGBA image (sticker, logo, texture) and lets the bike shading show through.
    private func decal(_ img: CIImage, center: CGPoint, size: CGFloat, rotation: Double, extent: CGRect, shading: CIImage, tile: Bool) -> (CIImage, CIImage) {
        let s = size / max(img.extent.width, img.extent.height)
        var placed = img.transformed(by: CGAffineTransform(translationX: -img.extent.midX, y: -img.extent.midY)
            .concatenating(CGAffineTransform(scaleX: s, y: s))
            .concatenating(CGAffineTransform(rotationAngle: -rotation * .pi / 180))
            .concatenating(CGAffineTransform(translationX: center.x, y: center.y)))
        if tile {
            let tile = CIFilter.affineTile()
            tile.inputImage = placed
            tile.transform = .identity
            placed = tile.outputImage ?? placed
        }
        placed = placed.cropped(to: extent)
        // Coverage = decal alpha as a grayscale mask.
        let alpha = placed.applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 1), "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 1),
            "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 1), "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0),
            "inputBiasVector": CIVector(x: 0, y: 0, z: 0, w: 1)
        ]).composited(over: CIImage(color: .black).cropped(to: extent))
        let opaque = placed.composited(over: CIImage(color: .white).cropped(to: extent))
        // Printed vinyl: decal colors multiplied by the (0.5-centred) shading, i.e. overlay.
        let shaded = shading.applyingFilter("CIOverlayBlendMode", parameters: [kCIInputBackgroundImageKey: opaque]).cropped(to: extent)
        return (shaded, alpha)
    }

    /// Tight bounds of the white area of a mask (Core Image coordinates).
    private func maskBounds(_ mask: CIImage, extent: CGRect) -> CGRect {
        let scale: CGFloat = 0.125
        let small = mask.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        let w = Int((extent.width * scale).rounded(.up)), h = Int((extent.height * scale).rounded(.up))
        guard w > 0, h > 0 else { return extent }
        var px = [UInt8](repeating: 0, count: w * h * 4)
        context.render(small, toBitmap: &px, rowBytes: w * 4, bounds: CGRect(x: 0, y: 0, width: w, height: h), format: .RGBA8, colorSpace: nil)
        var minX = w, minY = h, maxX = -1, maxY = -1
        for y in 0..<h { for x in 0..<w where px[(y * w + x) * 4] > 127 {
            minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
        } }
        guard maxX >= 0 else { return extent }
        // Bitmap rows go top-down; Core Image y goes bottom-up.
        return CGRect(x: CGFloat(minX) / scale, y: extent.height - CGFloat(maxY + 1) / scale,
                      width: CGFloat(maxX - minX + 1) / scale, height: CGFloat(maxY - minY + 1) / scale)
    }

    private func normalizedShading(_ base: CIImage, mask: CIImage, gloss: Double, roughness: Double) -> CIImage {
        let gray = base.applyingFilter("CIColorControls", parameters: [kCIInputSaturationKey: 0])
        let average = maskedAverageLuminance(gray, mask: mask)
        let gain = average > 0.001 ? 0.5 / average : 1
        return gray.applyingFilter("CIColorMatrix", parameters: [
            "inputRVector": CIVector(x: gain, y: 0, z: 0, w: 0),
            "inputGVector": CIVector(x: 0, y: gain, z: 0, w: 0),
            "inputBVector": CIVector(x: 0, y: 0, z: gain, w: 0)
        ]).applyingFilter("CIColorControls", parameters: [kCIInputContrastKey: 0.55 + 0.45 * gloss * (1 - 0.6 * roughness)])
            .applyingFilter("CIToneCurve", parameters: Self.highlightCurve)
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
        let contrast = 0.55 + 0.45 * p.gloss * (1 - 0.6 * p.roughness)
        shading = Self.compressHighlights(shading.applyingFilter("CIColorControls", parameters: [kCIInputContrastKey: contrast]))

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

    /// Keeps mid-tones (the paint colour) intact while compressing specular highlights and deep shadows,
    /// so a red stays red instead of turning pink under the photo's reflections.
    static var highlightCurve: [String: Any] { [
        "inputPoint0": CIVector(x: 0, y: 0.10), "inputPoint1": CIVector(x: 0.25, y: 0.31),
        "inputPoint2": CIVector(x: 0.5, y: 0.5), "inputPoint3": CIVector(x: 0.75, y: 0.62),
        "inputPoint4": CIVector(x: 1, y: 0.72)
    ] }

    static func compressHighlights(_ image: CIImage) -> CIImage {
        image.applyingFilter("CIToneCurve", parameters: highlightCurve)
    }

    /// `mask_<angle>_<part>` → `clean_<part>_<angle>`.
    static func cleanPlateName(forMask mask: String) -> String? {
        guard mask.hasPrefix("mask_") else { return nil }
        let parts = mask.dropFirst(5).split(separator: "_", maxSplits: 1)
        guard parts.count == 2 else { return nil }
        return "clean_\(parts[1])_\(parts[0])"
    }

    private func loadMask(_ name: String, extent: CGRect) throws -> CIImage {
        guard let mask = load(name) else { throw CompositorError.missingAsset(name) }
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
