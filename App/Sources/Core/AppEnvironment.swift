import SwiftUI
import OSLog
import MFDomain
import MFCatalog
import MFPersistence
import MFAI
import MFRendering

/// Dependency container. Every service is a protocol so implementations can be swapped
/// (bundled vs remote catalog, AI vendor via backend…).
@MainActor
struct AppEnvironment {
    let model: AppModel
    let router: AppRouter
    let ai: any AIProvider
    let compositor: BikeCompositor
    /// Country used to resolve homologation.
    let homologationCountry = "FR"

    static func live() -> AppEnvironment {
        let log = Logger(subsystem: "app.motoforge", category: "bootstrap")
        let store: any ProjectStore
        let uiTesting = ProcessInfo.processInfo.arguments.contains("UITEST")
        do {
            store = uiTesting ? InMemoryProjectStore() : try SwiftDataProjectStore.make()
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
        return AppEnvironment(
            model: AppModel(catalog: catalog, store: store),
            router: AppRouter(),
            // No AI vendor in v1 — features are shown as « Bientôt disponible ».
            ai: UnavailableAIProvider(),
            compositor: BikeCompositor(loadAsset: BundleAssets.ciImage(named:))
        )
    }
}
