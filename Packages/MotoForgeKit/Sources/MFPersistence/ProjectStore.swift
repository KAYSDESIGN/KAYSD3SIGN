import Foundation
import MFDomain

public enum PersistenceError: Error, Equatable, Sendable {
    case notFound(String)
    case corrupted(String)
}

/// Local storage of the user's garage and projects. Works fully offline.
public protocol ProjectStore: Sendable {
    func loadGarage() async throws -> UserGarage
    func saveGarage(_ garage: UserGarage) async throws

    func allProjects() async throws -> [CustomizationProject]
    func project(_ id: CustomizationProject.ID) async throws -> CustomizationProject
    /// Insert or update. Implementations set `updatedAt`.
    func save(_ project: CustomizationProject) async throws
    func delete(_ id: CustomizationProject.ID) async throws
}

extension ProjectStore {
    public func projects(for motorcycle: OwnedMotorcycle.ID) async throws -> [CustomizationProject] {
        try await allProjects().filter { $0.motorcycleID == motorcycle }
    }

    public func rename(_ id: CustomizationProject.ID, to name: String) async throws {
        var p = try await project(id)
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        p.name = trimmed
        try await save(p)
    }

    @discardableResult
    public func duplicate(_ id: CustomizationProject.ID) async throws -> CustomizationProject {
        let copy = try await project(id).duplicated()
        try await save(copy)
        return copy
    }
}

/// Shared JSON coding for stored payloads (stable across app versions).
enum PayloadCoding {
    static func encoder() -> JSONEncoder {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.sortedKeys]
        return e
    }

    static func decoder() -> JSONDecoder {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }
}

/// In-memory store for tests, previews and as a fallback.
public actor InMemoryProjectStore: ProjectStore {
    private var garage = UserGarage()
    private var projects: [CustomizationProject.ID: CustomizationProject] = [:]
    private let now: @Sendable () -> Date

    public init(now: @escaping @Sendable () -> Date = { Date() }) {
        self.now = now
    }

    public func loadGarage() async throws -> UserGarage { garage }
    public func saveGarage(_ garage: UserGarage) async throws { self.garage = garage }

    public func allProjects() async throws -> [CustomizationProject] {
        projects.values.sorted { $0.updatedAt > $1.updatedAt }
    }

    public func project(_ id: CustomizationProject.ID) async throws -> CustomizationProject {
        guard let p = projects[id] else { throw PersistenceError.notFound(id.rawValue) }
        return p
    }

    public func save(_ project: CustomizationProject) async throws {
        var p = project
        p.updatedAt = now()
        projects[p.id] = p
    }

    public func delete(_ id: CustomizationProject.ID) async throws {
        guard projects.removeValue(forKey: id) != nil else { throw PersistenceError.notFound(id.rawValue) }
    }
}
