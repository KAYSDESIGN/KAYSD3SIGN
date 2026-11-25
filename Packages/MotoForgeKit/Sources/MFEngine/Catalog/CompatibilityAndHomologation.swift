import Foundation
import MFDomain

/// Compatibility rules. Only verified, sourced fitments count.
public enum CompatibilityChecker {
    public static func isVerifiedCompatible(_ variant: AccessoryVariant, with vehicleID: MotorcycleVariant.ID) -> Bool {
        variant.isVerifiedCompatible(with: vehicleID)
    }

    public static func compatibility(of variant: AccessoryVariant, with vehicleID: MotorcycleVariant.ID) -> AccessoryCompatibility? {
        variant.compatibilities.first { $0.verification.isTrustworthy && $0.vehicleVariantIDs.contains(vehicleID) }
    }

    /// Catalog filter: accessories keeping only the variants verified for this vehicle.
    /// Accessories with no such variant are excluded entirely.
    public static func filter(_ accessories: [Accessory], for vehicleID: MotorcycleVariant.ID) -> [Accessory] {
        accessories.compactMap { accessory in
            var copy = accessory
            copy.variants = accessory.variants.filter { isVerifiedCompatible($0, with: vehicleID) }
            return copy.variants.isEmpty ? nil : copy
        }
    }
}

/// Resolves the homologation status for a precise context.
///
/// Never infers anything from product names or descriptions: only sourced `HomologationRecord`s count.
public enum HomologationResolver {
    public struct Resolution: Hashable, Sendable {
        public let status: HomologationStatus
        public let record: HomologationRecord?
    }

    public static func resolve(
        _ variant: AccessoryVariant,
        country: String,
        vehicle: MotorcycleVariant.ID,
        mountingConfiguration: String? = nil
    ) -> Resolution {
        let country = country.uppercased()
        let candidates = variant.homologations.filter {
            $0.verification.isTrustworthy && $0.countryCode == country && $0.vehicleVariantID == vehicle
        }
        // Exact mounting configuration first, then records valid for any configuration.
        let match = candidates.first { $0.mountingConfiguration != nil && $0.mountingConfiguration == mountingConfiguration }
            ?? candidates.first { $0.mountingConfiguration == nil }
        guard let match else { return Resolution(status: .notVerified, record: nil) }
        return Resolution(status: match.status, record: match)
    }
}

/// Best offer selection for pricing.
public enum OfferSelector {
    /// Cheapest verified offer in the requested currency; falls back to the cheapest unverified one (as an estimate).
    public static func bestOffer(for variant: AccessoryVariant, currency: String) -> MerchantOffer? {
        let inCurrency = variant.offers.filter { $0.price.currency == currency.uppercased() }
        let verified = inCurrency.filter { $0.verification.isTrustworthy }
        return (verified.isEmpty ? inCurrency : verified).min { $0.price.amount < $1.price.amount }
    }
}
