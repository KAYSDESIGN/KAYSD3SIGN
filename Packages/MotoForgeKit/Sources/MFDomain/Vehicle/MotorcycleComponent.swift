import Foundation

/// A customizable part of the motorcycle (tank, rims, frame…).
public struct MotorcycleComponent: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<MotorcycleComponent>
    public var id: ID
    public var kind: ComponentKind
    /// Display name; defaults to the kind's name but can be model-specific.
    public var displayName: String
    public var supportedModes: Set<CustomizationMode>

    public init(
        id: ID,
        kind: ComponentKind,
        displayName: String? = nil,
        supportedModes: Set<CustomizationMode> = [.paint, .wrap]
    ) {
        self.id = id
        self.kind = kind
        self.displayName = displayName ?? kind.localizedName
        self.supportedModes = supportedModes
    }
}

public enum ComponentKind: Hashable, Sendable, Codable {
    case tank
    case tankShrouds
    case fairings
    case frontFender
    case rearFender
    case tailSection
    case frontWheel
    case rearWheel
    case fork
    case frame
    case swingarm
    case handlebar
    case levers
    case brakeCalipers
    case seat
    case engineCovers
    case protections
    /// Model-specific element not covered above.
    case other(String)

    public static let standardKinds: [ComponentKind] = [
        .tank, .tankShrouds, .fairings, .frontFender, .rearFender, .tailSection,
        .frontWheel, .rearWheel, .fork, .frame, .swingarm, .handlebar, .levers,
        .brakeCalipers, .seat, .engineCovers, .protections
    ]

    public var localizedName: String {
        switch self {
        case .tank: "Réservoir"
        case .tankShrouds: "Écopes"
        case .fairings: "Carénages"
        case .frontFender: "Garde-boue avant"
        case .rearFender: "Garde-boue arrière"
        case .tailSection: "Coque arrière"
        case .frontWheel: "Jante avant"
        case .rearWheel: "Jante arrière"
        case .fork: "Fourche"
        case .frame: "Cadre"
        case .swingarm: "Bras oscillant"
        case .handlebar: "Guidon"
        case .levers: "Leviers"
        case .brakeCalipers: "Étriers de frein"
        case .seat: "Selle"
        case .engineCovers: "Caches moteur"
        case .protections: "Protections"
        case .other(let name): name
        }
    }

    /// Stable slug used to build component identifiers.
    public var slug: String {
        switch self {
        case .tank: "tank"
        case .tankShrouds: "tank-shrouds"
        case .fairings: "fairings"
        case .frontFender: "front-fender"
        case .rearFender: "rear-fender"
        case .tailSection: "tail-section"
        case .frontWheel: "front-wheel"
        case .rearWheel: "rear-wheel"
        case .fork: "fork"
        case .frame: "frame"
        case .swingarm: "swingarm"
        case .handlebar: "handlebar"
        case .levers: "levers"
        case .brakeCalipers: "brake-calipers"
        case .seat: "seat"
        case .engineCovers: "engine-covers"
        case .protections: "protections"
        case .other(let name):
            "other-" + name.lowercased().filter { $0.isLetter || $0.isNumber || $0 == "-" }
        }
    }
}

/// The four customization modes of the workshop.
public enum CustomizationMode: String, CaseIterable, Hashable, Sendable, Codable {
    case paint
    case wrap
    case accessories
    case details

    public var localizedName: String {
        switch self {
        case .paint: "Peinture"
        case .wrap: "Covering"
        case .accessories: "Accessoires"
        case .details: "Détails"
        }
    }
}
