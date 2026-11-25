import Foundation
import Testing
import MFDomain
@testable import MFPersistence

@Suite("Persistance")
struct PersistenceTests {
    @Test func crudAndAutosaveTimestamps() async throws {
        let store = InMemoryProjectStore(now: { Date(timeIntervalSince1970: 1000) })
        let p = CustomizationProject(name: "Projet", motorcycleID: "m", configuration: ProjectConfiguration(vehicleVariantID: "v"),
                                     createdAt: Date(timeIntervalSince1970: 0))
        try await store.save(p)
        #expect(try await store.project(p.id).updatedAt == Date(timeIntervalSince1970: 1000))
        try await store.rename(p.id, to: "  Street  ")
        #expect(try await store.project(p.id).name == "Street")
        try await store.rename(p.id, to: "   ")
        #expect(try await store.project(p.id).name == "Street")
        let copy = try await store.duplicate(p.id)
        #expect(try await store.allProjects().count == 2)
        #expect(try await store.projects(for: "m").count == 2)
        try await store.delete(copy.id)
        await #expect(throws: PersistenceError.notFound(copy.id.rawValue)) { try await store.project(copy.id) }
    }

    @Test func garagePersists() async throws {
        let store = InMemoryProjectStore()
        let bike = OwnedMotorcycle(variantID: "honda.cb125r.jc91.base", originalColorwayID: nil)
        try await store.saveGarage(UserGarage(motorcycles: [bike], selectedMotorcycleID: bike.id))
        #expect(try await store.loadGarage().selected == bike)
    }
}
