import Foundation

/// A monetary amount. Always `Decimal`, never floating point.
public struct Money: Hashable, Sendable, Codable, CustomStringConvertible {
    public var amount: Decimal
    /// ISO 4217 code, e.g. "EUR".
    public var currency: String

    public init(_ amount: Decimal, _ currency: String) {
        self.amount = amount
        self.currency = currency.uppercased()
    }

    public static func zero(_ currency: String) -> Money { Money(0, currency) }

    public var description: String { "\(amount) \(currency)" }
}

public enum MoneyError: Error, Equatable, Sendable {
    case currencyMismatch(String, String)
}

extension Money {
    public func adding(_ other: Money) throws -> Money {
        guard currency == other.currency else { throw MoneyError.currencyMismatch(currency, other.currency) }
        return Money(amount + other.amount, currency)
    }

    public func subtracting(_ other: Money) throws -> Money {
        guard currency == other.currency else { throw MoneyError.currencyMismatch(currency, other.currency) }
        return Money(amount - other.amount, currency)
    }

    public func multiplied(by quantity: Int) -> Money {
        Money(amount * Decimal(quantity), currency)
    }
}

/// Whether a price comes from a verified merchant offer or is an estimate.
public enum PriceKind: String, Hashable, Sendable, Codable {
    /// From a `MerchantOffer` with a source and a verification date.
    case verified
    /// Estimated (paint, wrap, user input, unverified offer). Always labelled « estimation ».
    case estimate
    /// Entered by the user (labor, shipping…).
    case userProvided
}

/// A price together with its provenance.
public struct PricedAmount: Hashable, Sendable, Codable {
    public var money: Money
    public var kind: PriceKind
    public var checkedAt: Date?

    public init(_ money: Money, kind: PriceKind, checkedAt: Date? = nil) {
        self.money = money
        self.kind = kind
        self.checkedAt = checkedAt
    }
}
