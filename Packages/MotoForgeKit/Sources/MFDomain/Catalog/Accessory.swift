import Foundation

public enum AccessoryCategory: String, CaseIterable, Hashable, Sendable, Codable {
    case mirrors, exhausts, levers, shifters, footpegs, handlebars, barEnds, grips
    case licensePlateHolders, indicators, lighting, seats, windscreens
    case engineProtection, frameProtection, fairings, fenders, wheels, other

    public var localizedName: String {
        switch self {
        case .mirrors: "Rétroviseurs"
        case .exhausts: "Échappements"
        case .levers: "Leviers de frein et d'embrayage"
        case .shifters: "Sélecteurs"
        case .footpegs: "Repose-pieds"
        case .handlebars: "Guidons"
        case .barEnds: "Embouts de guidon"
        case .grips: "Poignées"
        case .licensePlateHolders: "Supports de plaque"
        case .indicators: "Clignotants"
        case .lighting: "Éclairage"
        case .seats: "Selles"
        case .windscreens: "Bulles"
        case .engineProtection: "Protections moteur"
        case .frameProtection: "Protections de cadre"
        case .fairings: "Carénages"
        case .fenders: "Garde-boue"
        case .wheels: "Jantes"
        case .other: "Autres accessoires"
        }
    }

    public var systemImage: String {
        switch self {
        case .mirrors: "rectangle.portrait.on.rectangle.portrait"
        case .exhausts: "flame"
        case .levers: "hand.point.up.left"
        case .shifters: "arrow.up.arrow.down"
        case .footpegs: "shoeprints.fill"
        case .handlebars: "line.horizontal.3"
        case .barEnds: "smallcircle.filled.circle"
        case .grips: "hand.raised"
        case .licensePlateHolders: "rectangle.and.pencil.and.ellipsis"
        case .indicators: "arrowtriangle.left.and.line.vertical.and.arrowtriangle.right"
        case .lighting: "lightbulb"
        case .seats: "chair"
        case .windscreens: "wind"
        case .engineProtection: "shield"
        case .frameProtection: "shield.lefthalf.filled"
        case .fairings: "square.on.square"
        case .fenders: "drop"
        case .wheels: "circle.circle"
        case .other: "wrench.and.screwdriver"
        }
    }
}

/// A commercial product (one manufacturer reference family).
public struct Accessory: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<Accessory>
    public var id: ID
    public var category: AccessoryCategory
    public var commercialName: String
    public var manufacturer: String
    public var manufacturerURL: URL?
    public var description: String
    public var materials: [String]
    /// Remote or bundled photo identifiers (licensed for use).
    public var photos: [String]
    public var variants: [AccessoryVariant]
    public var verification: Verification

    public init(
        id: ID, category: AccessoryCategory, commercialName: String, manufacturer: String,
        manufacturerURL: URL? = nil, description: String, materials: [String] = [], photos: [String] = [],
        variants: [AccessoryVariant], verification: Verification
    ) {
        self.id = id
        self.category = category
        self.commercialName = commercialName
        self.manufacturer = manufacturer
        self.manufacturerURL = manufacturerURL
        self.description = description
        self.materials = materials
        self.photos = photos
        self.variants = variants
        self.verification = verification
    }
}

/// A precise purchasable reference (color / finish) of an accessory.
public struct AccessoryVariant: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<AccessoryVariant>
    public var id: ID
    public var accessoryID: Accessory.ID
    /// Exact manufacturer part number.
    public var reference: String
    public var colorway: String
    public var compatibilities: [AccessoryCompatibility]
    public var homologations: [HomologationRecord]
    public var offers: [MerchantOffer]
    public var visualAssets: [AccessoryVisualAsset]

    public init(
        id: ID, accessoryID: Accessory.ID, reference: String, colorway: String,
        compatibilities: [AccessoryCompatibility] = [], homologations: [HomologationRecord] = [],
        offers: [MerchantOffer] = [], visualAssets: [AccessoryVisualAsset] = []
    ) {
        self.id = id
        self.accessoryID = accessoryID
        self.reference = reference
        self.colorway = colorway
        self.compatibilities = compatibilities
        self.homologations = homologations
        self.offers = offers
        self.visualAssets = visualAssets
    }

    public func visualAsset(for angle: ViewAngle) -> AccessoryVisualAsset? {
        visualAssets.first { $0.angle == angle }
    }
}

/// A verified fitment between an accessory reference and motorcycle variants.
public struct AccessoryCompatibility: Hashable, Sendable, Codable {
    public var vehicleVariantIDs: [MotorcycleVariant.ID]
    /// Required adapters / kits, by exact reference.
    public var requiredAdapters: [String]
    /// Fitment notes as published by the manufacturer (e.g. "requires removal of passenger pegs").
    public var notes: String?
    public var verification: Verification

    public init(vehicleVariantIDs: [MotorcycleVariant.ID], requiredAdapters: [String] = [], notes: String? = nil, verification: Verification) {
        self.vehicleVariantIDs = vehicleVariantIDs
        self.requiredAdapters = requiredAdapters
        self.notes = notes
        self.verification = verification
    }
}

/// Layer 4 visual of an accessory for one angle.
public struct AccessoryVisualAsset: Hashable, Sendable, Codable {
    public var angle: ViewAngle
    public var assetName: String
    /// Anchor point inside the asset (normalized to the asset's own size).
    public var assetAnchor: NormalizedPoint
    /// Placement of the anchor on the base view, scale and orientation.
    public var placement: Placement
    /// Original components hidden when this accessory is fitted (e.g. stock mirror).
    public var hidesComponents: [MotorcycleComponent.ID]
    /// Original-part masks to erase (asset names), in addition to hidden components.
    public var eraseMaskAssets: [String]
    /// Draw order relative to component masks.
    public var zIndex: Int
    /// Components that occlude the accessory in this angle (drawn again on top).
    public var occludedBy: [MotorcycleComponent.ID]

    public init(
        angle: ViewAngle, assetName: String, assetAnchor: NormalizedPoint = .center, placement: Placement,
        hidesComponents: [MotorcycleComponent.ID] = [], eraseMaskAssets: [String] = [],
        zIndex: Int, occludedBy: [MotorcycleComponent.ID] = []
    ) {
        self.angle = angle
        self.assetName = assetName
        self.assetAnchor = assetAnchor
        self.placement = placement
        self.hidesComponents = hidesComponents
        self.eraseMaskAssets = eraseMaskAssets
        self.zIndex = zIndex
        self.occludedBy = occludedBy
    }
}

/// A seller's offer for a reference.
public struct MerchantOffer: Hashable, Sendable, Codable {
    public var merchantName: String
    public var url: URL
    public var price: Money
    public var shippingCost: Money?
    /// Tax context exactly as shown by the source (« HT », « TTC »…), never guessed.
    public var taxNote: String?
    public var verification: Verification

    public init(merchantName: String, url: URL, price: Money, shippingCost: Money? = nil, taxNote: String? = nil, verification: Verification) {
        self.merchantName = merchantName
        self.url = url
        self.price = price
        self.shippingCost = shippingCost
        self.taxNote = taxNote
        self.verification = verification
    }

    public var priceKind: PriceKind { verification.isTrustworthy ? .verified : .estimate }
}

extension AccessoryVariant {
    /// True only when a sourced, verified fitment lists this vehicle. Names and descriptions are never used.
    public func isVerifiedCompatible(with vehicleID: MotorcycleVariant.ID) -> Bool {
        compatibilities.contains { $0.verification.isTrustworthy && $0.vehicleVariantIDs.contains(vehicleID) }
    }
}
