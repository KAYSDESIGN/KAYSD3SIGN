import Foundation
import MFDomain

/// Budget breakdown of a project. Verified and estimated amounts are kept separate.
public struct BudgetSummary: Hashable, Sendable {
    public let currency: String
    public let accessoriesVerified: Decimal
    public let accessoriesEstimated: Decimal
    public let paintEstimate: Decimal
    public let wrapEstimate: Decimal
    public let labor: Decimal
    public let shipping: Decimal
    public let total: Decimal
    public let spent: Decimal
    public let remainingToSpend: Decimal
    public let maximum: Decimal?
    /// `maximum - total`, negative when over budget.
    public let marginToMaximum: Decimal?
    /// Items whose currency differs from the budget currency (excluded from totals, never converted silently).
    public let excludedItems: [ShoppingListItem.ID]
    /// Share of `total` backed by verified prices (0…1).
    public let verifiedShare: Double

    public var isOverBudget: Bool { (marginToMaximum ?? 0) < 0 }
}

public enum BudgetCalculator {
    /// Builds shopping list lines for accessories that are fitted but not yet listed.
    public static func syncShoppingList(
        _ list: [ShoppingListItem],
        configuration: ProjectConfiguration,
        accessories: (AccessoryVariant.ID) -> (Accessory, AccessoryVariant)?,
        currency: String
    ) -> [ShoppingListItem] {
        let fittedIDs = Set(configuration.accessories.map(\.variantID))
        // Keep custom lines and accessory lines still fitted (or already ordered/installed).
        var result = list.filter { item in
            guard case .accessory(let id) = item.kind else { return true }
            return fittedIDs.contains(id) || item.isSpent
        }
        let listed = Set(result.compactMap { item -> AccessoryVariant.ID? in
            if case .accessory(let id) = item.kind { return id } else { return nil }
        })
        for selection in configuration.accessories where !listed.contains(selection.variantID) {
            guard let (accessory, variant) = accessories(selection.variantID) else { continue }
            let offer = OfferSelector.bestOffer(for: variant, currency: currency)
            result.append(ShoppingListItem(
                kind: .accessory(variantID: variant.id),
                label: "\(accessory.manufacturer) \(accessory.commercialName) — \(variant.reference)",
                unitPrice: offer.map { PricedAmount($0.price, kind: $0.priceKind, checkedAt: $0.verification.verifiedAt) },
                shipping: offer?.shippingCost.map { PricedAmount($0, kind: offer!.priceKind, checkedAt: offer!.verification.verifiedAt) },
                merchantURL: offer?.url
            ))
        }
        return result
    }

    public static func summarize(budget: ProjectBudget, shoppingList: [ShoppingListItem]) -> BudgetSummary {
        let currency = budget.currency
        var verified: Decimal = 0, estimated: Decimal = 0, shipping: Decimal = 0, spent: Decimal = 0
        var paintLines: Decimal = 0, wrapLines: Decimal = 0, laborLines: Decimal = 0
        var excluded: [ShoppingListItem.ID] = []
        var verifiedTotal: Decimal = 0

        for item in shoppingList {
            let unit = item.unitPrice
            let ship = item.shipping
            if let unit, unit.money.currency != currency { excluded.append(item.id); continue }
            if let ship, ship.money.currency != currency { excluded.append(item.id); continue }

            let lineAmount = (unit?.money.amount ?? 0) * Decimal(item.quantity)
            let shipAmount = ship?.money.amount ?? 0
            switch item.kind {
            case .accessory, .custom:
                if unit?.kind == .verified { verified += lineAmount } else { estimated += lineAmount }
            case .paint: paintLines += lineAmount
            case .wrap: wrapLines += lineAmount
            case .labor: laborLines += lineAmount
            }
            if unit?.kind == .verified { verifiedTotal += lineAmount }
            if ship?.kind == .verified { verifiedTotal += shipAmount }
            shipping += shipAmount
            if item.isSpent { spent += lineAmount + shipAmount }
        }

        func amount(_ m: Money?) -> Decimal { (m?.currency == currency ? m?.amount : nil) ?? 0 }
        let paint = paintLines + amount(budget.paintEstimate)
        let wrap = wrapLines + amount(budget.wrapEstimate)
        let labor = laborLines + amount(budget.labor)
        shipping += amount(budget.extraShipping)

        let total = verified + estimated + paint + wrap + labor + shipping
        let maximum = budget.maximum?.currency == currency ? budget.maximum?.amount : nil
        let share = total == 0 ? 1 : NSDecimalNumber(decimal: verifiedTotal / total).doubleValue

        return BudgetSummary(
            currency: currency,
            accessoriesVerified: verified,
            accessoriesEstimated: estimated,
            paintEstimate: paint,
            wrapEstimate: wrap,
            labor: labor,
            shipping: shipping,
            total: total,
            spent: spent,
            remainingToSpend: total - spent,
            maximum: maximum,
            marginToMaximum: maximum.map { $0 - total },
            excludedItems: excluded,
            verifiedShare: share
        )
    }
}
