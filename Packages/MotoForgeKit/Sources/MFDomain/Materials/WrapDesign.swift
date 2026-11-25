import Foundation

/// A vinyl wrap design applied to one component (covering studio).
public struct WrapDesign: Hashable, Sendable, Codable {
    public enum Coverage: String, Hashable, Sendable, Codable {
        case full
        case partial
    }

    public var coverage: Coverage
    /// Bottom-to-top layers (films, stripes, patterns, stickers, logos, textures).
    public var layers: [WrapLayer]

    public init(coverage: Coverage = .full, layers: [WrapLayer] = []) {
        self.coverage = coverage
        self.layers = layers
    }
}

public struct WrapLayer: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<WrapLayer>

    public enum Content: Hashable, Sendable, Codable {
        /// Solid or finished film. `product` is set when it maps to a real commercial film.
        case film(material: Material, product: WrapFilmProduct?)
        case gradient(stops: [GradientStop], angleDegrees: Double)
        case stripe(color: RGBColor, widthRatio: Double, count: Int, spacingRatio: Double)
        case geometricPattern(name: String, primary: RGBColor, secondary: RGBColor)
        /// Built-in sticker from the app's library.
        case sticker(assetName: String)
        /// Logo or texture imported by the user (stored locally, referenced by file name).
        case userImage(localFileName: String, isTexture: Bool)
    }

    public var id: ID
    public var content: Content
    public var placement: Placement
    /// Region of the component covered by this layer (partial wraps).
    public var region: NormalizedRect
    public var opacity: Double

    public init(id: ID = Identifier(UUID().uuidString.lowercased()), content: Content,
                placement: Placement = .identity, region: NormalizedRect = .full, opacity: Double = 1) {
        self.id = id
        self.content = content
        self.placement = placement
        self.region = region
        self.opacity = min(max(opacity, 0), 1)
    }
}

/// Reference to a commercial wrap film. Prepared for manufacturer catalogs (integration planned).
public struct WrapFilmProduct: Hashable, Sendable, Codable {
    public var manufacturer: String
    public var productLine: String
    public var reference: String
    public var colorName: String
    public var verification: Verification

    public init(manufacturer: String, productLine: String, reference: String, colorName: String, verification: Verification) {
        self.manufacturer = manufacturer
        self.productLine = productLine
        self.reference = reference
        self.colorName = colorName
        self.verification = verification
    }
}
