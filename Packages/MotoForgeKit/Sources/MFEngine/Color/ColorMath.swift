import Foundation
import MFDomain

/// Hue (0…360), saturation and brightness (0…1).
public struct HSBColor: Hashable, Sendable {
    public var hue: Double
    public var saturation: Double
    public var brightness: Double

    public init(hue: Double, saturation: Double, brightness: Double) {
        var h = hue.truncatingRemainder(dividingBy: 360)
        if h < 0 { h += 360 }
        self.hue = h
        self.saturation = min(max(saturation, 0), 1)
        self.brightness = min(max(brightness, 0), 1)
    }
}

extension RGBColor {
    // MARK: HEX

    /// Parses `#RRGGBB`, `RRGGBB` or `#RGB`. Returns nil for anything else.
    public init?(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        guard s.count == 6, let value = UInt32(s, radix: 16) else { return nil }
        self.init(red8: Int((value >> 16) & 0xFF), green8: Int((value >> 8) & 0xFF), blue8: Int(value & 0xFF))
    }

    /// Uppercase `#RRGGBB`.
    public var hexString: String {
        let (r, g, b) = rgb8
        return "#" + [r, g, b].map { String(format: "%02X", $0) }.joined()
    }

    public var rgb8: (Int, Int, Int) {
        (Int((red * 255).rounded()), Int((green * 255).rounded()), Int((blue * 255).rounded()))
    }

    // MARK: HSB

    public init(hsb: HSBColor) {
        let h = hsb.hue / 60, s = hsb.saturation, v = hsb.brightness
        let i = Int(floor(h)) % 6
        let f = h - floor(h)
        let p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f))
        switch i {
        case 0: self.init(red: v, green: t, blue: p)
        case 1: self.init(red: q, green: v, blue: p)
        case 2: self.init(red: p, green: v, blue: t)
        case 3: self.init(red: p, green: q, blue: v)
        case 4: self.init(red: t, green: p, blue: v)
        default: self.init(red: v, green: p, blue: q)
        }
    }

    public var hsb: HSBColor {
        let maxC = max(red, green, blue), minC = min(red, green, blue)
        let delta = maxC - minC
        var hue = 0.0
        if delta > 0 {
            if maxC == red { hue = 60 * ((green - blue) / delta).truncatingRemainder(dividingBy: 6) }
            else if maxC == green { hue = 60 * ((blue - red) / delta + 2) }
            else { hue = 60 * ((red - green) / delta + 4) }
        }
        return HSBColor(hue: hue, saturation: maxC == 0 ? 0 : delta / maxC, brightness: maxC)
    }

    // MARK: Perception

    /// WCAG relative luminance (sRGB, linearized).
    public var relativeLuminance: Double {
        func lin(_ c: Double) -> Double { c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(red) + 0.7152 * lin(green) + 0.0722 * lin(blue)
    }

    /// Applies the material's hue/saturation/brightness adjustments.
    public func adjusted(by p: MaterialParameters) -> RGBColor {
        let base = hsb
        let adjusted = HSBColor(
            hue: base.hue + p.hueShiftDegrees,
            saturation: base.saturation * p.saturation,
            brightness: base.brightness + p.brightness
        )
        return RGBColor(hsb: adjusted)
    }
}

/// Picks a representative color from a photograph region.
///
/// Pixels are given as RGBA8 bytes; very dark / blown-out pixels (specular highlights, deep shadows)
/// are discarded so the result approximates the paint color rather than the lighting.
public enum ColorSampler {
    public static func representativeColor(rgba: [UInt8], ignoreExtremes: Bool = true) -> RGBColor? {
        guard rgba.count >= 4 else { return nil }
        var r = 0.0, g = 0.0, b = 0.0, n = 0.0
        var i = 0
        while i + 3 < rgba.count {
            let pr = Double(rgba[i]) / 255, pg = Double(rgba[i + 1]) / 255, pb = Double(rgba[i + 2]) / 255
            let alpha = Double(rgba[i + 3]) / 255
            i += 4
            guard alpha > 0.5 else { continue }
            if ignoreExtremes {
                let v = max(pr, pg, pb)
                if v < 0.06 || (pr > 0.97 && pg > 0.97 && pb > 0.97) { continue }
            }
            r += pr; g += pg; b += pb; n += 1
        }
        guard n > 0 else { return ignoreExtremes ? representativeColor(rgba: rgba, ignoreExtremes: false) : nil }
        return RGBColor(red: r / n, green: g / n, blue: b / n)
    }
}
