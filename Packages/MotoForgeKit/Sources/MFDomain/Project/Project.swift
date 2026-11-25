import Foundation

// MARK: - Garage

/// A motorcycle owned by the user.
public struct OwnedMotorcycle: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<UUIDTag>
    public var id: ID
    public var variantID: MotorcycleVariant.ID
    public var originalColorwayID: OriginalColorway.ID?
    /// Model year of the user's own motorcycle (entered by the user).
    public var year: Int?
    /// Mileage entered by the user.
    public var mileageKm: Int?
    /// Optional user nickname ("Ma CB").
    public var nickname: String?
    public var addedAt: Date

    public init(id: ID = .generate(), variantID: MotorcycleVariant.ID, originalColorwayID: OriginalColorway.ID?,
                year: Int? = nil, mileageKm: Int? = nil, nickname: String? = nil, addedAt: Date = Date()) {
        self.id = id
        self.variantID = variantID
        self.originalColorwayID = originalColorwayID
        self.year = year
        self.mileageKm = mileageKm
        self.nickname = nickname
        self.addedAt = addedAt
    }
}

public struct UserGarage: Hashable, Sendable, Codable {
    public var motorcycles: [OwnedMotorcycle]
    public var selectedMotorcycleID: OwnedMotorcycle.ID?

    public init(motorcycles: [OwnedMotorcycle] = [], selectedMotorcycleID: OwnedMotorcycle.ID? = nil) {
        self.motorcycles = motorcycles
        self.selectedMotorcycleID = selectedMotorcycleID
    }

    public var selected: OwnedMotorcycle? {
        motorcycles.first { $0.id == selectedMotorcycleID } ?? motorcycles.first
    }
}

/// Favorites and color memory of the user (paint studio, catalog).
public struct UserFavorites: Hashable, Sendable, Codable {
    public var accessoryIDs: [Accessory.ID]
    public var colors: [RGBColor]
    /// Most recent first.
    public var recentColors: [RGBColor]

    public init(accessoryIDs: [Accessory.ID] = [], colors: [RGBColor] = [], recentColors: [RGBColor] = []) {
        self.accessoryIDs = accessoryIDs
        self.colors = colors
        self.recentColors = recentColors
    }
}

// MARK: - Configuration (single source of truth, image-independent)

/// How one component looks in a project.
public enum ComponentStyle: Hashable, Sendable, Codable {
    case paint(Material)
    case wrap(WrapDesign)
}

/// An accessory fitted in a project.
public struct AccessorySelection: Hashable, Sendable, Codable {
    public var accessoryID: Accessory.ID
    public var variantID: AccessoryVariant.ID
    public var category: AccessoryCategory
    /// User fine-tuning on top of the asset's default placement, per angle.
    public var placementAdjustments: [ViewAngle: Placement]

    public init(accessoryID: Accessory.ID, variantID: AccessoryVariant.ID, category: AccessoryCategory,
                placementAdjustments: [ViewAngle: Placement] = [:]) {
        self.accessoryID = accessoryID
        self.variantID = variantID
        self.category = category
        self.placementAdjustments = placementAdjustments
    }
}

/// The complete, angle-independent description of a customized motorcycle.
///
/// Every view angle renders from this same value. Switching angles never mutates it.
public struct ProjectConfiguration: Hashable, Sendable, Codable {
    public var vehicleVariantID: MotorcycleVariant.ID
    public var originalColorwayID: OriginalColorway.ID?
    /// Only overridden components are stored; others keep the original colorway.
    public var componentStyles: [MotorcycleComponent.ID: ComponentStyle]
    /// At most one accessory per category slot (see `ConfigurationEditor`).
    public var accessories: [AccessorySelection]

    public init(vehicleVariantID: MotorcycleVariant.ID, originalColorwayID: OriginalColorway.ID? = nil,
                componentStyles: [MotorcycleComponent.ID: ComponentStyle] = [:], accessories: [AccessorySelection] = []) {
        self.vehicleVariantID = vehicleVariantID
        self.originalColorwayID = originalColorwayID
        self.componentStyles = componentStyles
        self.accessories = accessories
    }

    /// The untouched factory configuration.
    public var isOriginal: Bool { componentStyles.isEmpty && accessories.isEmpty }
}

// MARK: - Budget & shopping list

public struct ProjectBudget: Hashable, Sendable, Codable {
    public var currency: String
    public var maximum: Money?
    /// Estimated paint cost, entered by the user or from a quote.
    public var paintEstimate: Money?
    public var wrapEstimate: Money?
    public var labor: Money?
    /// Shipping not already included in merchant offers.
    public var extraShipping: Money?

    public init(currency: String = "EUR", maximum: Money? = nil, paintEstimate: Money? = nil,
                wrapEstimate: Money? = nil, labor: Money? = nil, extraShipping: Money? = nil) {
        self.currency = currency
        self.maximum = maximum
        self.paintEstimate = paintEstimate
        self.wrapEstimate = wrapEstimate
        self.labor = labor
        self.extraShipping = extraShipping
    }
}

public struct ShoppingListItem: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<UUIDTag>

    public enum Kind: Hashable, Sendable, Codable {
        case accessory(variantID: AccessoryVariant.ID)
        case paint
        case wrap
        case labor
        case custom
    }

    public enum Status: String, CaseIterable, Hashable, Sendable, Codable {
        case toBuy, ordered, installed

        public var localizedName: String {
            switch self {
            case .toBuy: "À acheter"
            case .ordered: "Commandé"
            case .installed: "Installé"
            }
        }
    }

    public var id: ID
    public var kind: Kind
    public var label: String
    public var quantity: Int
    public var unitPrice: PricedAmount?
    public var shipping: PricedAmount?
    public var status: Status
    public var merchantURL: URL?

    public init(id: ID = .generate(), kind: Kind, label: String, quantity: Int = 1, unitPrice: PricedAmount?,
                shipping: PricedAmount? = nil, status: Status = .toBuy, merchantURL: URL? = nil) {
        self.id = id
        self.kind = kind
        self.label = label
        self.quantity = max(1, quantity)
        self.unitPrice = unitPrice
        self.shipping = shipping
        self.status = status
        self.merchantURL = merchantURL
    }

    /// Money is considered spent once the item is ordered or installed.
    public var isSpent: Bool { status != .toBuy }
}

// MARK: - Project

public struct CustomizationProject: Identifiable, Hashable, Sendable, Codable {
    public typealias ID = Identifier<UUIDTag>
    public var id: ID
    public var name: String
    public var motorcycleID: OwnedMotorcycle.ID
    public var configuration: ProjectConfiguration
    public var budget: ProjectBudget
    public var shoppingList: [ShoppingListItem]
    public var isFavorite: Bool
    public var createdAt: Date
    public var updatedAt: Date

    public init(id: ID = .generate(), name: String, motorcycleID: OwnedMotorcycle.ID, configuration: ProjectConfiguration,
                budget: ProjectBudget = ProjectBudget(), shoppingList: [ShoppingListItem] = [], isFavorite: Bool = false,
                createdAt: Date = Date(), updatedAt: Date? = nil) {
        self.id = id
        self.name = name
        self.motorcycleID = motorcycleID
        self.configuration = configuration
        self.budget = budget
        self.shoppingList = shoppingList
        self.isFavorite = isFavorite
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
    }

    /// Duplicate with a new identity (configuration, budget and list are copied).
    public func duplicated(named newName: String? = nil, at date: Date = Date()) -> CustomizationProject {
        CustomizationProject(
            name: newName ?? "\(name) (copie)",
            motorcycleID: motorcycleID,
            configuration: configuration,
            budget: budget,
            shoppingList: shoppingList.map { var item = $0; item.id = .generate(); return item },
            isFavorite: false,
            createdAt: date
        )
    }
}
