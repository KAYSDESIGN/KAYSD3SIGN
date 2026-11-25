import Foundation
import MFDomain

/// Progress of a project, derived from its shopping list (mockup « Mes projets » progress bar).
///
/// Each line weighs the same: installed = 1, ordered = 0.5, to buy = 0.
/// A project without any line has 0 % progress and is « en cours ».
public enum ProjectProgress {
    public static func fraction(of project: CustomizationProject) -> Double {
        let items = project.shoppingList
        guard !items.isEmpty else { return 0 }
        let score = items.reduce(0.0) { total, item in
            switch item.status {
            case .installed: total + 1
            case .ordered: total + 0.5
            case .toBuy: total
            }
        }
        return score / Double(items.count)
    }

    public static func percent(of project: CustomizationProject) -> Int {
        Int((fraction(of: project) * 100).rounded())
    }

    /// « Terminé » = every line installed.
    public static func isCompleted(_ project: CustomizationProject) -> Bool {
        !project.shoppingList.isEmpty && project.shoppingList.allSatisfy { $0.status == .installed }
    }
}

/// Recent and favorite colors of the paint studio.
public enum ColorMemory {
    public static let recentLimit = 12

    /// Inserts at the front, de-duplicated by 8-bit value, capped at `recentLimit`.
    public static func pushRecent(_ color: RGBColor, into favorites: inout UserFavorites) {
        favorites.recentColors.removeAll { $0.hexString == color.hexString }
        favorites.recentColors.insert(color, at: 0)
        if favorites.recentColors.count > recentLimit {
            favorites.recentColors.removeLast(favorites.recentColors.count - recentLimit)
        }
    }

    public static func toggleFavorite(_ color: RGBColor, in favorites: inout UserFavorites) {
        if let i = favorites.colors.firstIndex(where: { $0.hexString == color.hexString }) {
            favorites.colors.remove(at: i)
        } else {
            favorites.colors.append(color)
        }
    }

    public static func isFavorite(_ color: RGBColor, in favorites: UserFavorites) -> Bool {
        favorites.colors.contains { $0.hexString == color.hexString }
    }
}

/// Rows of the budget screen (ring + legend), in display order.
public struct BudgetRow: Hashable, Sendable, Identifiable {
    public enum Category: String, CaseIterable, Sendable {
        case accessories, paint, wrap, labor, shipping

        public var localizedName: String {
            switch self {
            case .accessories: "Pièces et accessoires"
            case .paint: "Peinture"
            case .wrap: "Covering"
            case .labor: "Main-d'œuvre"
            case .shipping: "Livraison"
            }
        }
    }

    public var id: Category { category }
    public let category: Category
    public let amount: Decimal
    /// Number of shopping list lines in this category (accessories only).
    public let itemCount: Int?
    /// True when the amount is entirely backed by verified prices.
    public let isVerified: Bool
}

extension BudgetSummary {
    public func rows(itemCount: Int) -> [BudgetRow] {
        [
            BudgetRow(category: .accessories, amount: accessoriesVerified + accessoriesEstimated, itemCount: itemCount,
                      isVerified: accessoriesEstimated == 0 && accessoriesVerified > 0),
            BudgetRow(category: .paint, amount: paintEstimate, itemCount: nil, isVerified: false),
            BudgetRow(category: .wrap, amount: wrapEstimate, itemCount: nil, isVerified: false),
            BudgetRow(category: .labor, amount: labor, itemCount: nil, isVerified: false),
            BudgetRow(category: .shipping, amount: shipping, itemCount: nil, isVerified: false)
        ]
    }

    /// Ring fill: total / maximum, clamped to 0…1. Nil without a maximum.
    public var maximumUsage: Double? {
        guard let maximum, maximum > 0 else { return nil }
        return min(max(NSDecimalNumber(decimal: total / maximum).doubleValue, 0), 1)
    }
}

/// Money display, French conventions (« 2 347,90 € »).
public enum MoneyFormatting {
    public static func string(_ amount: Decimal, currency: String, locale: Locale = Locale(identifier: "fr_FR")) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = currency
        f.locale = locale
        f.minimumFractionDigits = 2
        f.maximumFractionDigits = 2
        return f.string(from: NSDecimalNumber(decimal: amount)) ?? "\(amount) \(currency)"
    }

    public static func string(_ money: Money) -> String { string(money.amount, currency: money.currency) }
}
