import Foundation

// MARK: - Brand / Model / Generation / Variant

public struct MotorcycleBrand: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<MotorcycleBrand>
    public var id: ID
    public var name: String

    public init(id: ID, name: String) {
        self.id = id
        self.name = name
    }
}

public struct MotorcycleModel: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<MotorcycleModel>
    public var id: ID
    public var brandID: MotorcycleBrand.ID
    public var name: String

    public init(id: ID, brandID: MotorcycleBrand.ID, name: String) {
        self.id = id
        self.brandID = brandID
        self.name = name
    }
}

public struct MotorcycleGeneration: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<MotorcycleGeneration>
    public var id: ID
    public var modelID: MotorcycleModel.ID
    /// Manufacturer frame/type code, e.g. "JC91".
    public var code: String
    /// Model years covered. `nil` until verified against a primary source.
    public var firstYear: Int?
    public var lastYear: Int?
    public var verification: Verification

    public init(
        id: ID,
        modelID: MotorcycleModel.ID,
        code: String,
        firstYear: Int? = nil,
        lastYear: Int? = nil,
        verification: Verification = .unverified
    ) {
        self.id = id
        self.modelID = modelID
        self.code = code
        self.firstYear = firstYear
        self.lastYear = lastYear
        self.verification = verification
    }

    public func covers(year: Int) -> Bool {
        guard let firstYear else { return false }
        return year >= firstYear && year <= (lastYear ?? Int.max)
    }
}

/// An original (factory) colorway of a variant.
public struct OriginalColorway: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<OriginalColorway>
    public var id: ID
    /// Commercial name as published by the manufacturer.
    public var name: String
    /// Manufacturer paint code(s) when documented.
    public var manufacturerCodes: [String]
    /// Default material per component for this colorway (the « configuration d'origine »).
    public var componentMaterials: [MotorcycleComponent.ID: Material]
    public var verification: Verification

    public init(
        id: ID,
        name: String,
        manufacturerCodes: [String] = [],
        componentMaterials: [MotorcycleComponent.ID: Material] = [:],
        verification: Verification = .unverified
    ) {
        self.id = id
        self.name = name
        self.manufacturerCodes = manufacturerCodes
        self.componentMaterials = componentMaterials
        self.verification = verification
    }
}

/// A precise, purchasable configuration of a motorcycle (year + version).
public struct MotorcycleVariant: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<MotorcycleVariant>
    public var id: ID
    public var generationID: MotorcycleGeneration.ID
    public var year: Int?
    /// Version / market label (e.g. "Standard", "ABS"), as documented.
    public var versionName: String
    public var colorways: [OriginalColorway]
    public var components: [MotorcycleComponent]
    public var views: [MotorcycleView]
    public var verification: Verification

    public init(
        id: ID,
        generationID: MotorcycleGeneration.ID,
        year: Int? = nil,
        versionName: String,
        colorways: [OriginalColorway] = [],
        components: [MotorcycleComponent] = [],
        views: [MotorcycleView] = [],
        verification: Verification = .unverified
    ) {
        self.id = id
        self.generationID = generationID
        self.year = year
        self.versionName = versionName
        self.colorways = colorways
        self.components = components
        self.views = views
        self.verification = verification
    }

    public func component(_ id: MotorcycleComponent.ID) -> MotorcycleComponent? {
        components.first { $0.id == id }
    }

    public func view(for angle: ViewAngle) -> MotorcycleView? {
        views.first { $0.angle == angle }
    }

    /// Angles for which reference visuals actually exist.
    public var availableAngles: [ViewAngle] {
        ViewAngle.allCases.filter { view(for: $0) != nil }
    }
}

// MARK: - Views & masks

/// The six supported camera angles. A true 360° rotation is NOT one of them.
public enum ViewAngle: String, CaseIterable, Hashable, Sendable, Codable {
    case front
    case rear
    case leftProfile
    case rightProfile
    case frontThreeQuarter
    case rearThreeQuarter

    public var localizedName: String {
        switch self {
        case .front: "Face avant"
        case .rear: "Face arrière"
        case .leftProfile: "Profil gauche"
        case .rightProfile: "Profil droit"
        case .frontThreeQuarter: "Trois quarts avant"
        case .rearThreeQuarter: "Trois quarts arrière"
        }
    }
}

/// Reference visual of a variant for one angle (layer 1 of the rendering engine).
public struct MotorcycleView: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<MotorcycleView>
    public var id: ID
    public var angle: ViewAngle
    /// Asset name of the base image (bundled or cached).
    public var baseImageAsset: String
    /// Pixel size of the base image; masks share the same size.
    public var pixelWidth: Int
    public var pixelHeight: Int
    public var masks: [ComponentMask]
    /// Licensing / provenance of the visual (authorized resources only).
    public var license: Verification

    public init(
        id: ID,
        angle: ViewAngle,
        baseImageAsset: String,
        pixelWidth: Int,
        pixelHeight: Int,
        masks: [ComponentMask] = [],
        license: Verification = .unverified
    ) {
        self.id = id
        self.angle = angle
        self.baseImageAsset = baseImageAsset
        self.pixelWidth = pixelWidth
        self.pixelHeight = pixelHeight
        self.masks = masks
        self.license = license
    }

    public func mask(for component: MotorcycleComponent.ID) -> ComponentMask? {
        masks.first { $0.componentID == component }
    }
}

/// Per-angle mask of one component (layer 2). Grayscale, same size as the base image.
public struct ComponentMask: Hashable, Sendable, Codable {
    public var componentID: MotorcycleComponent.ID
    public var maskAsset: String
    /// Tight bounds of the mask, used for hit-testing and cropping.
    public var bounds: NormalizedRect
    /// Painter's order: higher draws on top.
    public var zIndex: Int

    public init(componentID: MotorcycleComponent.ID, maskAsset: String, bounds: NormalizedRect, zIndex: Int) {
        self.componentID = componentID
        self.maskAsset = maskAsset
        self.bounds = bounds
        self.zIndex = zIndex
    }
}
