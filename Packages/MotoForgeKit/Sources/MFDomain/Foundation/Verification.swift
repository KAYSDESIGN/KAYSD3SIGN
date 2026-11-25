import Foundation

/// Provenance of any externally sourced fact (price, compatibility, homologation, color code…).
///
/// MOTOFORGE never displays a fact as verified unless it carries a source and a verification date.
public struct Verification: Hashable, Sendable, Codable {
    public enum Status: String, Hashable, Sendable, Codable, CaseIterable {
        /// Checked against the cited source on `verifiedAt`.
        case verified
        /// Entered but not yet checked against a primary source. Must be shown as such.
        case unverified
    }

    public var status: Status
    /// Human-readable source (e.g. "Fiche produit fabricant", "Catalogue Honda 2021").
    public var source: String?
    public var sourceURL: URL?
    public var verifiedAt: Date?
    /// Free text: who/how it was verified, caveats.
    public var notes: String?

    public init(
        status: Status,
        source: String? = nil,
        sourceURL: URL? = nil,
        verifiedAt: Date? = nil,
        notes: String? = nil
    ) {
        self.status = status
        self.source = source
        self.sourceURL = sourceURL
        self.verifiedAt = verifiedAt
        self.notes = notes
    }

    public static let unverified = Verification(status: .unverified)

    /// A verification is only trustworthy when it is marked verified *and* has a source and a date.
    public var isTrustworthy: Bool {
        status == .verified && source?.isEmpty == false && verifiedAt != nil
    }
}

/// Explicit availability of a feature, so the UI never pretends something works.
public enum FeatureAvailability: String, Hashable, Sendable, Codable {
    case available
    /// Designed and modelled, not implemented yet → shown as « Bientôt disponible ».
    case planned
}
