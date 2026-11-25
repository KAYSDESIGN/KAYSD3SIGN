import Foundation

public enum HomologationStatus: String, CaseIterable, Hashable, Sendable, Codable {
    case approved
    case approvedWithConditions
    case notApproved
    case notVerified

    public var localizedName: String {
        switch self {
        case .approved: "Homologué pour ce véhicule"
        case .approvedWithConditions: "Homologué sous conditions"
        case .notApproved: "Non homologué"
        case .notVerified: "Non vérifié"
        }
    }

    public var systemImage: String {
        switch self {
        case .approved: "checkmark.seal.fill"
        case .approvedWithConditions: "exclamationmark.triangle.fill"
        case .notApproved: "xmark.octagon.fill"
        case .notVerified: "questionmark.circle"
        }
    }
}

/// A sourced homologation statement, specific to a country, a vehicle and a mounting configuration.
public struct HomologationRecord: Hashable, Sendable, Codable {
    /// ISO 3166-1 alpha-2 (e.g. "FR").
    public var countryCode: String
    public var vehicleVariantID: MotorcycleVariant.ID
    /// Identifies the mounting configuration (e.g. "standard", "with-adapter-XYZ"). `nil` = any.
    public var mountingConfiguration: String?
    public var status: HomologationStatus
    /// Approval number(s) (e.g. E-mark), conditions of use.
    public var approvalNumbers: [String]
    public var conditions: [String]
    public var verification: Verification

    public init(
        countryCode: String, vehicleVariantID: MotorcycleVariant.ID, mountingConfiguration: String? = nil,
        status: HomologationStatus, approvalNumbers: [String] = [], conditions: [String] = [], verification: Verification
    ) {
        self.countryCode = countryCode.uppercased()
        self.vehicleVariantID = vehicleVariantID
        self.mountingConfiguration = mountingConfiguration
        self.status = status
        self.approvalNumbers = approvalNumbers
        self.conditions = conditions
        self.verification = verification
    }
}
