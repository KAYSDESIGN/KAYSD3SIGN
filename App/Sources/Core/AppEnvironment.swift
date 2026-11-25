import SwiftUI
import Observation
import OSLog
import MFDomain
import MFCatalog
import MFPersistence
import MFAI

/// Dependency container injected in the SwiftUI environment.
/// Every service is a protocol so implementations (bundled vs remote catalog, AI vendor…) can be swapped.
@MainActor
@Observable
final class AppEnvironment {
    let catalog: any CatalogRepository
    let store: any ProjectStore
    let ai: any AIProvider
    /// Country used to resolve homologation (user-editable in settings, planned).
    var homologationCountry: String

    init(catalog: any CatalogRepository, store: any ProjectStore, ai: any AIProvider, homologationCountry: String = "FR") {
        self.catalog = catalog
        self.store = store
        self.ai = ai
        self.homologationCountry = homologationCountry
    }

    static func live() -> AppEnvironment {
        let log = Logger(subsystem: "app.motoforge", category: "bootstrap")
        let store: any ProjectStore
        do {
            store = SwiftDataProjectStore(modelContainer: try SwiftDataProjectStore.makeContainer())
        } catch {
            log.error("SwiftData indisponible, stockage mémoire utilisé : \(error.localizedDescription)")
            store = InMemoryProjectStore()
        }
        let catalog: any CatalogRepository
        do {
            catalog = try BundledCatalogRepository()
        } catch {
            log.fault("Catalogue embarqué introuvable : \(error.localizedDescription)")
            catalog = BundledCatalogRepository(data: Data())
        }
        // No AI vendor in v1 — features are shown as « Bientôt disponible ».
        return AppEnvironment(catalog: catalog, store: store, ai: UnavailableAIProvider())
    }
}
