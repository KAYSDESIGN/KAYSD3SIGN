#if canImport(CoreImage)
import CoreImage
import Foundation
import Testing
import MFDomain
@testable import MFEngine
@testable import MFRendering

@Suite("Compositeur Core Image")
struct CompositorTests {
    static let size = CGRect(x: 0, y: 0, width: 200, height: 100)

    /// Synthetic assets: grey bike on transparent, a red 20×20 accessory, a mask covering the left half.
    static func assets(_ name: String) -> CIImage? {
        switch name {
        case "base": return CIImage(color: CIColor(red: 0.5, green: 0.5, blue: 0.5)).cropped(to: size)
        case "clean": return CIImage(color: CIColor(red: 0, green: 0, blue: 1)).cropped(to: size)
        case "acc": return CIImage(color: CIColor(red: 1, green: 0, blue: 0)).cropped(to: CGRect(x: 0, y: 0, width: 20, height: 20))
        case "mask_left": return CIImage(color: .white).cropped(to: CGRect(x: 0, y: 0, width: 100, height: 100))
            .composited(over: CIImage(color: .black).cropped(to: size))
        default: return nil
        }
    }

    func pixel(_ image: CGImage, x: Int, yFromTop y: Int) -> (Int, Int, Int) {
        let ctx = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4,
                            space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
        let p = ctx.data!.bindMemory(to: UInt8.self, capacity: image.width * image.height * 4)
        let i = (y * image.width + x) * 4
        return (Int(p[i]), Int(p[i + 1]), Int(p[i + 2]))
    }

    @Test func accessoryIsDrawnAtItsPlacement() throws {
        let c = BikeCompositor(loadAsset: Self.assets)
        let plan = RenderPlan(angle: .rightProfile, layers: [
            .base(asset: "base"),
            .accessory(variantID: "a", asset: "acc", anchor: .center, placement: Placement(position: NormalizedPoint(x: 0.75, y: 0.5)))
        ], accessoriesWithoutVisual: [], componentsNotVisible: [])
        let img = try c.render(plan)
        #expect(img.width == 200)
        let (r, g, b) = pixel(img, x: 150, yFromTop: 50)
        #expect(r > 200 && g < 60 && b < 60, "accessory pixel = \(r),\(g),\(b)")
        let (r2, _, _) = pixel(img, x: 20, yFromTop: 50)
        #expect(abs(r2 - 128) < 40, "base pixel = \(r2)")
    }

    @Test func eraseUsesCleanPlateWhenAvailable() throws {
        let c = BikeCompositor(loadAsset: { name in
            name == "clean_left_rightProfile" ? Self.assets("clean") : Self.assets(name == "mask_rightProfile_left" ? "mask_left" : name)
        })
        let plan = RenderPlan(angle: .rightProfile, layers: [.base(asset: "base"), .erase(maskAsset: "mask_rightProfile_left")],
                              accessoriesWithoutVisual: [], componentsNotVisible: [])
        let img = try c.render(plan)
        let (_, _, b) = pixel(img, x: 20, yFromTop: 50)
        #expect(b > 200, "left half should come from the clean plate")
        let (r, _, _) = pixel(img, x: 180, yFromTop: 50)
        #expect(abs(r - 128) < 40)
    }

    @Test func paintRecolorsMaskedArea() throws {
        let c = BikeCompositor(loadAsset: { Self.assets($0 == "m" ? "mask_left" : $0) })
        let red = PaintColor(id: "r", name: "r", rgb: RGBColor(red: 1, green: 0, blue: 0))
        let plan = RenderPlan(angle: .rightProfile, layers: [.base(asset: "base"),
            .component(id: "c", maskAsset: "m", style: .paint(Material(baseColor: red, effect: .gloss)))],
                              accessoriesWithoutVisual: [], componentsNotVisible: [])
        let img = try c.render(plan)
        let (r, g, _) = pixel(img, x: 20, yFromTop: 50)
        #expect(r > 150 && g < 80, "painted pixel = \(r),\(g)")
    }

    @Test func scaledRenderKeepsProportions() throws {
        let c = BikeCompositor(loadAsset: Self.assets)
        let plan = RenderPlan(angle: .rightProfile, layers: [.base(asset: "base")], accessoriesWithoutVisual: [], componentsNotVisible: [])
        #expect(try c.render(plan, scale: 0.5).width == 100)
    }

    @Test func cleanPlateNaming() {
        #expect(BikeCompositor.cleanPlateName(forMask: "mask_rightProfile_rear-fender") == "clean_rear-fender_rightProfile")
        #expect(BikeCompositor.cleanPlateName(forMask: "other") == nil)
    }
}
#endif
