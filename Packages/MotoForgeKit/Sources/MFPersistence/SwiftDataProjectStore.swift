#if canImport(SwiftData)
import Foundation
import SwiftData
import MFDomain

/// SwiftData record. The domain value is stored as a versioned JSON payload so the domain model can
/// evolve without SwiftData migrations; indexed columns are duplicated for sorting and filtering.
@Model
public final class ProjectRecord {
    @Attribute(.unique) public var id: String
    public var name: String
    public var motorcycleID: String
    public var isFavorite: Bool
    public var updatedAt: Date
    public var payloadVersion: Int
    @Attribute(.externalStorage) public var payload: Data

    init(id: String, name: String, motorcycleID: String, isFavorite: Bool, updatedAt: Date, payloadVersion: Int, payload: Data) {
        self.id = id
        self.name = name
        self.motorcycleID = motorcycleID
        self.isFavorite = isFavorite
        self.updatedAt = updatedAt
        self.payloadVersion = payloadVersion
        self.payload = payload
    }
}

@Model
public final class GarageRecord {
    @Attribute(.unique) public var key: String
    public var payload: Data

    init(key: String, payload: Data) {
        self.key = key
        self.payload = payload
    }
}

/// SwiftData-backed store. All access goes through this actor's own model context.
@ModelActor
public actor SwiftDataProjectStore: ProjectStore {
    static let payloadVersion = 1
    static let garageKey = "garage"

    public static func makeContainer(inMemory: Bool = false) throws -> ModelContainer {
        let config = ModelConfiguration(isStoredInMemoryOnly: inMemory)
        return try ModelContainer(for: ProjectRecord.self, GarageRecord.self, configurations: config)
    }

    public func loadGarage() async throws -> UserGarage {
        let key = Self.garageKey
        let records = try modelContext.fetch(FetchDescriptor<GarageRecord>(predicate: #Predicate { $0.key == key }))
        guard let record = records.first else { return UserGarage() }
        do { return try PayloadCoding.decoder().decode(UserGarage.self, from: record.payload) }
        catch { throw PersistenceError.corrupted("garage") }
    }

    public func saveGarage(_ garage: UserGarage) async throws {
        let key = Self.garageKey
        let data = try PayloadCoding.encoder().encode(garage)
        if let record = try modelContext.fetch(FetchDescriptor<GarageRecord>(predicate: #Predicate { $0.key == key })).first {
            record.payload = data
        } else {
            modelContext.insert(GarageRecord(key: key, payload: data))
        }
        try modelContext.save()
    }

    public func allProjects() async throws -> [CustomizationProject] {
        let descriptor = FetchDescriptor<ProjectRecord>(sortBy: [SortDescriptor(\.updatedAt, order: .reverse)])
        return try modelContext.fetch(descriptor).compactMap { try? decode($0) }
    }

    public func project(_ id: CustomizationProject.ID) async throws -> CustomizationProject {
        guard let record = try fetch(id) else { throw PersistenceError.notFound(id.rawValue) }
        return try decode(record)
    }

    public func save(_ project: CustomizationProject) async throws {
        var p = project
        p.updatedAt = Date()
        let data = try PayloadCoding.encoder().encode(p)
        if let record = try fetch(p.id) {
            record.name = p.name
            record.isFavorite = p.isFavorite
            record.updatedAt = p.updatedAt
            record.payloadVersion = Self.payloadVersion
            record.payload = data
        } else {
            modelContext.insert(ProjectRecord(
                id: p.id.rawValue, name: p.name, motorcycleID: p.motorcycleID.rawValue, isFavorite: p.isFavorite,
                updatedAt: p.updatedAt, payloadVersion: Self.payloadVersion, payload: data))
        }
        try modelContext.save()
    }

    public func delete(_ id: CustomizationProject.ID) async throws {
        guard let record = try fetch(id) else { throw PersistenceError.notFound(id.rawValue) }
        modelContext.delete(record)
        try modelContext.save()
    }

    private func fetch(_ id: CustomizationProject.ID) throws -> ProjectRecord? {
        let raw = id.rawValue
        return try modelContext.fetch(FetchDescriptor<ProjectRecord>(predicate: #Predicate { $0.id == raw })).first
    }

    private func decode(_ record: ProjectRecord) throws -> CustomizationProject {
        do { return try PayloadCoding.decoder().decode(CustomizationProject.self, from: record.payload) }
        catch { throw PersistenceError.corrupted(record.id) }
    }
}
#endif
