import Foundation

/// An sRGB color with components in 0…1.
public struct RGBColor: Hashable, Sendable, Codable {
    public var red: Double
    public var green: Double
    public var blue: Double

    public init(red: Double, green: Double, blue: Double) {
        self.red = Self.clamp(red)
        self.green = Self.clamp(green)
        self.blue = Self.clamp(blue)
    }

    /// 8-bit initializer.
    public init(red8: Int, green8: Int, blue8: Int) {
        self.init(red: Double(red8) / 255, green: Double(green8) / 255, blue: Double(blue8) / 255)
    }

    static func clamp(_ v: Double) -> Double { min(max(v, 0), 1) }

    public static let white = RGBColor(red: 1, green: 1, blue: 1)
    public static let black = RGBColor(red: 0, green: 0, blue: 0)
}

/// Where a color definition comes from.
public enum PaintColorSource: Hashable, Sendable, Codable {
    /// Picked freely by the user (wheel, RGB/HEX/HSB sliders, photo sample).
    case custom
    /// RAL Classic reference. The sRGB value is an approximation of a physical swatch.
    case ral(code: String)
    /// Documented manufacturer color.
    case manufacturer(brandID: MotorcycleBrand.ID, code: String)
    /// Commercial paint or film product.
    case commercialProduct(manufacturer: String, reference: String)
    /// Sampled from a user photograph.
    case photoSample
}

/// A named color usable in the paint studio.
public struct PaintColor: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<PaintColor>
    public var id: ID
    public var name: String
    public var rgb: RGBColor
    public var source: PaintColorSource
    /// Required for `.ral`, `.manufacturer` and `.commercialProduct` sources to be shown as reference colors.
    public var verification: Verification

    public init(id: ID, name: String, rgb: RGBColor, source: PaintColorSource = .custom, verification: Verification = .unverified) {
        self.id = id
        self.name = name
        self.rgb = rgb
        self.source = source
        self.verification = verification
    }

    /// Creates an ad-hoc custom color (not part of any reference list).
    public static func custom(_ rgb: RGBColor, name: String = "Personnalisée") -> PaintColor {
        PaintColor(id: Identifier("custom.\(UUID().uuidString.lowercased())"), name: name, rgb: rgb, source: .custom)
    }

    /// A reference color (RAL, manufacturer, product) is only displayed as such when verified.
    public var isVerifiedReference: Bool {
        switch source {
        case .custom, .photoSample: false
        case .ral, .manufacturer, .commercialProduct: verification.isTrustworthy
        }
    }
}
