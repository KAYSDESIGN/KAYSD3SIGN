import Foundation
import MFDomain

/// A full, versioned catalog payload (bundled JSON today, Supabase export later — same schema).
public struct CatalogSnapshot: Hashable, Sendable, Codable {
    public static let currentSchemaVersion = 1

    public var schemaVersion: Int
    /// Monotonic catalog revision, used for cache invalidation and sync.
    public var revision: Int
    public var generatedAt: Date
    public var brands: [MotorcycleBrand]
    public var models: [MotorcycleModel]
    public var generations: [MotorcycleGeneration]
    public var variants: [MotorcycleVariant]
    public var accessories: [Accessory]
    /// Reference color lists (RAL, manufacturer…). Entries must be verified to be shown as references.
    public var referenceColors: [PaintColor]

    public init(schemaVersion: Int = CatalogSnapshot.currentSchemaVersion, revision: Int, generatedAt: Date,
                brands: [MotorcycleBrand], models: [MotorcycleModel], generations: [MotorcycleGeneration],
                variants: [MotorcycleVariant], accessories: [Accessory], referenceColors: [PaintColor]) {
        self.schemaVersion = schemaVersion
        self.revision = revision
        self.generatedAt = generatedAt
        self.brands = brands
        self.models = models
        self.generations = generations
        self.variants = variants
        self.accessories = accessories
        self.referenceColors = referenceColors
    }

    public static func decoder() -> JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }

    public static func encoder() -> JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        return e
    }
}

public enum CatalogError: Error, Equatable, Sendable {
    case resourceMissing(String)
    case unsupportedSchema(Int)
    case decoding(String)
    case notFound(String)
}

/// Read access to the catalog. Implementations: bundled JSON (offline), remote (planned), cache.
public protocol CatalogRepository: Sendable {
    func snapshot() async throws -> CatalogSnapshot
}

extension CatalogRepository {
    public func brands() async throws -> [MotorcycleBrand] { try await snapshot().brands }

    public func models(of brand: MotorcycleBrand.ID) async throws -> [MotorcycleModel] {
        try await snapshot().models.filter { $0.brandID == brand }
    }

    public func generations(of model: MotorcycleModel.ID) async throws -> [MotorcycleGeneration] {
        try await snapshot().generations.filter { $0.modelID == model }
    }

    public func variants(of generation: MotorcycleGeneration.ID) async throws -> [MotorcycleVariant] {
        try await snapshot().variants.filter { $0.generationID == generation }
    }

    public func variant(_ id: MotorcycleVariant.ID) async throws -> MotorcycleVariant {
        guard let v = try await snapshot().variants.first(where: { $0.id == id }) else { throw CatalogError.notFound(id.rawValue) }
        return v
    }

    /// Accessories with at least one verified-compatible reference for the vehicle (others are never shown).
    public func compatibleAccessories(for vehicle: MotorcycleVariant.ID, category: AccessoryCategory? = nil) async throws -> [Accessory] {
        let all = try await snapshot().accessories.filter { category == nil || $0.category == category }
        return all.compactMap { accessory in
            var copy = accessory
            copy.variants = accessory.variants.filter { $0.isVerifiedCompatible(with: vehicle) }
            return copy.variants.isEmpty ? nil : copy
        }
    }
}

/// Catalog shipped inside the app bundle — works fully offline.
public struct BundledCatalogRepository: CatalogRepository {
    private let data: Data

    /// Loads `catalog.json` shipped with this package.
    public init(resourceName: String = "catalog") throws {
        try self.init(resourceName: resourceName, bundle: .module)
    }

    public init(resourceName: String, bundle: Bundle) throws {
        guard let url = bundle.url(forResource: resourceName, withExtension: "json") else {
            throw CatalogError.resourceMissing(resourceName)
        }
        self.data = try Data(contentsOf: url)
    }

    public init(data: Data) {
        self.data = data
    }

    public func snapshot() async throws -> CatalogSnapshot {
        let snapshot: CatalogSnapshot
        do {
            snapshot = try CatalogSnapshot.decoder().decode(CatalogSnapshot.self, from: data)
        } catch {
            throw CatalogError.decoding(String(describing: error))
        }
        guard snapshot.schemaVersion <= CatalogSnapshot.currentSchemaVersion else {
            throw CatalogError.unsupportedSchema(snapshot.schemaVersion)
        }
        return snapshot
    }
}
