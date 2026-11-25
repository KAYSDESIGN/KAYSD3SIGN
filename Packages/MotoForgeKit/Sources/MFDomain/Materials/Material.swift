import Foundation

/// All finishes and effects of the paint studio.
public enum PaintEffect: String, CaseIterable, Hashable, Sendable, Codable {
    case gloss, matte, satin, metallic, pearl, candy, glitter, chameleon, iridescent, holographic
    case chrome, coloredChrome, anodized, brushedMetal, carbon, forgedCarbon
    case fluorescent, uvReactive, phosphorescent, thermochromic, photochromic, simulatedGlow, marble

    public var localizedName: String {
        switch self {
        case .gloss: "Brillant"
        case .matte: "Mat"
        case .satin: "Satiné"
        case .metallic: "Métallisé"
        case .pearl: "Nacré"
        case .candy: "Candy"
        case .glitter: "Pailleté"
        case .chameleon: "Caméléon"
        case .iridescent: "Iridescent"
        case .holographic: "Holographique"
        case .chrome: "Chromé"
        case .coloredChrome: "Chrome coloré"
        case .anodized: "Anodisé"
        case .brushedMetal: "Métal brossé"
        case .carbon: "Carbone"
        case .forgedCarbon: "Carbone forgé"
        case .fluorescent: "Fluorescent"
        case .uvReactive: "Réactif aux UV"
        case .phosphorescent: "Phosphorescent"
        case .thermochromic: "Thermochromique"
        case .photochromic: "Photochromique"
        case .simulatedGlow: "Effet incandescent simulé"
        case .marble: "Effet marbré"
        }
    }

    /// Whether the on-screen result is a lighting-independent approximation (« Simulation »).
    ///
    /// The 2D engine does not compute physical lighting, so any effect that depends on viewing angle,
    /// light spectrum, temperature or darkness is a simulation and must be labelled as such.
    public var isLightingSimulation: Bool {
        switch self {
        case .gloss, .matte, .satin, .carbon, .forgedCarbon, .brushedMetal, .marble: false
        default: true
        }
    }

    /// Whether the 2D engine renders this effect in the current version.
    /// Effects not yet rendered are shown as « Bientôt disponible », never faked.
    public var renderAvailability: FeatureAvailability {
        switch self {
        case .gloss, .matte, .satin, .metallic, .pearl, .candy: .available
        default: .planned
        }
    }

    /// Effects that rely on a secondary color (flip / gradient).
    public var usesSecondaryColor: Bool {
        switch self {
        case .chameleon, .iridescent, .coloredChrome, .pearl, .candy, .marble: true
        default: false
        }
    }

    public var usesFlakes: Bool { self == .metallic || self == .glitter }
}

/// A gradient stop for multi-color paint (position 0…1 along `MaterialParameters.gradientAngleDegrees`).
public struct GradientStop: Hashable, Sendable, Codable {
    public var position: Double
    public var color: RGBColor
    public init(position: Double, color: RGBColor) {
        self.position = min(max(position, 0), 1)
        self.color = color
    }
}

/// Fine-tuning of a material. All normalized values are 0…1 unless stated otherwise.
public struct MaterialParameters: Hashable, Sendable, Codable {
    /// Hue shift in degrees (-180…180) applied on top of the base color.
    public var hueShiftDegrees: Double = 0
    /// Saturation multiplier (0…2, 1 = unchanged).
    public var saturation: Double = 1
    /// Brightness offset (-1…1).
    public var brightness: Double = 0
    public var gloss: Double = 0.8
    public var roughness: Double = 0.2
    public var effectIntensity: Double = 0.5
    public var pearlIntensity: Double = 0
    public var flakeSize: Double = 0.3
    public var flakeDensity: Double = 0.5
    public var secondaryColor: RGBColor?
    public var gradientAngleDegrees: Double = 0
    /// Two or more stops → multi-color transition. Empty → solid color.
    public var gradientStops: [GradientStop] = []

    public init() {}

    /// Returns a copy with every value clamped to its legal range.
    public func clamped() -> MaterialParameters {
        var p = self
        p.hueShiftDegrees = min(max(p.hueShiftDegrees, -180), 180)
        p.saturation = min(max(p.saturation, 0), 2)
        p.brightness = min(max(p.brightness, -1), 1)
        for kp in [\MaterialParameters.gloss, \.roughness, \.effectIntensity, \.pearlIntensity, \.flakeSize, \.flakeDensity] {
            p[keyPath: kp] = min(max(p[keyPath: kp], 0), 1)
        }
        p.gradientAngleDegrees = p.gradientAngleDegrees.truncatingRemainder(dividingBy: 360)
        p.gradientStops.sort { $0.position < $1.position }
        return p
    }

    public static func defaults(for effect: PaintEffect) -> MaterialParameters {
        var p = MaterialParameters()
        switch effect {
        case .matte: p.gloss = 0.05; p.roughness = 0.9
        case .satin: p.gloss = 0.4; p.roughness = 0.5
        case .metallic: p.flakeSize = 0.2; p.flakeDensity = 0.6
        case .pearl: p.pearlIntensity = 0.5
        case .candy: p.gloss = 0.95; p.roughness = 0.05; p.effectIntensity = 0.7
        default: break
        }
        return p
    }
}

/// Layer 3 of the rendering engine: what a component is made of / painted with.
public struct Material: Hashable, Sendable, Codable {
    public var baseColor: PaintColor
    public var effect: PaintEffect
    public var parameters: MaterialParameters

    public init(baseColor: PaintColor, effect: PaintEffect = .gloss, parameters: MaterialParameters? = nil) {
        self.baseColor = baseColor
        self.effect = effect
        self.parameters = (parameters ?? .defaults(for: effect)).clamped()
    }

    /// Bi-color or multi-color paint.
    public var isMultiColor: Bool { parameters.gradientStops.count >= 2 }
}
