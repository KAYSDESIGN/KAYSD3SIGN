import SwiftUI
import Observation
import OSLog
import MFDomain
import MFEngine
import MFCatalog
import MFPersistence

/// Loading state of a screen's data.
enum LoadState: Equatable {
    case idle, loading, loaded
    case failed(String)
}

/// Which reference visuals the workshop shows.
enum VisualMode: String {
    /// User-supplied photos (private set, personal use).
    case photo
    /// Project 3D renders (always available, accessories visible).
    case render3D
}

/// Shared app state: catalog snapshot, garage, projects, favorites.
/// Screens read from it and call its intent methods; every mutation is persisted immediately (autosave).
@MainActor
@Observable
final class AppModel {
    private(set) var catalog: CatalogSnapshot?
    private(set) var garage = UserGarage()
    private(set) var projects: [CustomizationProject] = []
    private(set) var favorites = UserFavorites()
    private(set) var state: LoadState = .idle
    /// Private photo views (App/PrivatePhotos), empty when the set is not bundled.
    private(set) var photoViews: [MotorcycleView] = []
    var visualMode: VisualMode = VisualMode(rawValue: UserDefaults.standard.string(forKey: "visualMode") ?? "") ?? .photo {
        didSet { UserDefaults.standard.set(visualMode.rawValue, forKey: "visualMode") }
    }
    var hasPhotoSet: Bool { !photoViews.isEmpty }
    /// Photos are shown only when the private set exists and the user chose them.
    var usesPhotos: Bool { hasPhotoSet && visualMode == .photo }
    /// Last non-blocking error, shown as an alert.
    var errorMessage: String?

    private let catalogRepository: any CatalogRepository
    private let store: any ProjectStore
    private let log = Logger(subsystem: "app.motoforge", category: "model")

    init(catalog: any CatalogRepository, store: any ProjectStore) {
        self.catalogRepository = catalog
        self.store = store
    }

    // MARK: Loading

    func load() async {
        guard state != .loading else { return }
        state = .loading
        do {
            catalog = try await catalogRepository.snapshot()
            garage = try await store.loadGarage()
            projects = try await store.allProjects()
            favorites = try await store.loadFavorites()
            photoViews = PrivatePhotoSet.load()
            state = .loaded
        } catch {
            log.error("Chargement impossible : \(String(describing: error))")
            state = .failed("Impossible de charger vos données. Réessayez.")
        }
    }

    /// UI tests only: a garage with one CB125R and one project with two fitted parts.
    func seedForUITests() async {
        guard garage.motorcycles.isEmpty, let variant = catalog?.variants.first else { return }
        let bike = OwnedMotorcycle(variantID: variant.id, originalColorwayID: variant.colorways.first?.id, year: 2022, mileageKm: 12480)
        await addMotorcycle(bike)
        guard let project = await createProject(for: bike, name: "CB125R Bi-ton") else { return }
        var categories = Set<AccessoryCategory>()
        for accessory in compatibleAccessories(for: variant.id) where categories.count < 3 {
            guard let v = accessory.variants.first(where: { !$0.visualAssets.isEmpty }), categories.insert(accessory.category).inserted else { continue }
            try? await addAccessory(accessory, variant: v, to: project.id)
        }
        if var p = self.project(project.id) {
            p.budget.maximum = Money(3500, p.budget.currency)
            p.budget.paintEstimate = Money(450, p.budget.currency)
            await save(p)
        }
    }

    // MARK: Catalog lookups

    /// Variant with the visuals currently selected (photos or 3D).
    func variant(_ id: MotorcycleVariant.ID) -> MotorcycleVariant? {
        guard var v = variant3D(id) else { return nil }
        if usesPhotos && v.generationID.rawValue == "honda.cb125r.jc91" { v.views = photoViews }
        return v
    }

    /// Variant with the project's 3D visuals (accessory renders are aligned with these only).
    func variant3D(_ id: MotorcycleVariant.ID) -> MotorcycleVariant? {
        catalog?.variants.first { $0.id == id }
    }

    /// « Honda CB125R » for a variant.
    func displayName(of variantID: MotorcycleVariant.ID) -> String {
        guard let catalog, let v = variant(variantID),
              let gen = catalog.generations.first(where: { $0.id == v.generationID }),
              let model = catalog.models.first(where: { $0.id == gen.modelID }),
              let brand = catalog.brands.first(where: { $0.id == model.brandID }) else { return "Moto" }
        return "\(brand.name) \(model.name)"
    }

    func generationCode(of variantID: MotorcycleVariant.ID) -> String? {
        guard let v = variant(variantID) else { return nil }
        return catalog?.generations.first { $0.id == v.generationID }?.code
    }

    func accessory(_ id: Accessory.ID) -> Accessory? {
        catalog?.accessories.first { $0.id == id }
    }

    func accessoryVariant(_ id: AccessoryVariant.ID) -> (Accessory, AccessoryVariant)? {
        guard let catalog else { return nil }
        for a in catalog.accessories {
            if let v = a.variants.first(where: { $0.id == id }) { return (a, v) }
        }
        return nil
    }

    /// Accessories verified compatible with the bike (never anything else).
    func compatibleAccessories(for variantID: MotorcycleVariant.ID) -> [Accessory] {
        CompatibilityChecker.filter(catalog?.accessories ?? [], for: variantID)
    }

    // MARK: Garage

    var selectedMotorcycle: OwnedMotorcycle? { garage.selected }

    func motorcycle(_ id: OwnedMotorcycle.ID) -> OwnedMotorcycle? {
        garage.motorcycles.first { $0.id == id }
    }

    func addMotorcycle(_ bike: OwnedMotorcycle) async {
        var g = garage
        g.motorcycles.append(bike)
        g.selectedMotorcycleID = bike.id
        await saveGarage(g)
    }

    func updateMotorcycle(_ bike: OwnedMotorcycle) async {
        var g = garage
        guard let i = g.motorcycles.firstIndex(where: { $0.id == bike.id }) else { return }
        g.motorcycles[i] = bike
        await saveGarage(g)
    }

    func selectMotorcycle(_ id: OwnedMotorcycle.ID) async {
        var g = garage
        g.selectedMotorcycleID = id
        await saveGarage(g)
    }

    /// Removes the bike and its projects.
    func deleteMotorcycle(_ id: OwnedMotorcycle.ID) async {
        for p in projects where p.motorcycleID == id { await deleteProject(p.id) }
        var g = garage
        g.motorcycles.removeAll { $0.id == id }
        if g.selectedMotorcycleID == id { g.selectedMotorcycleID = g.motorcycles.first?.id }
        await saveGarage(g)
    }

    private func saveGarage(_ g: UserGarage) async {
        do {
            try await store.saveGarage(g)
            garage = g
        } catch {
            report(error, "Le garage n'a pas pu être enregistré.")
        }
    }

    // MARK: Projects

    func project(_ id: CustomizationProject.ID) -> CustomizationProject? {
        projects.first { $0.id == id }
    }

    @discardableResult
    func createProject(for bike: OwnedMotorcycle, name: String? = nil) async -> CustomizationProject? {
        let count = projects.filter { $0.motorcycleID == bike.id }.count
        let project = CustomizationProject(
            name: name ?? "Projet \(displayName(of: bike.variantID)) \(count + 1)",
            motorcycleID: bike.id,
            configuration: ProjectConfiguration(vehicleVariantID: bike.variantID, originalColorwayID: bike.originalColorwayID)
        )
        await save(project)
        return self.project(project.id)
    }

    /// Autosave entry point for every project change.
    func save(_ project: CustomizationProject) async {
        do {
            try await store.save(project)
            let saved = try await store.project(project.id)
            if let i = projects.firstIndex(where: { $0.id == saved.id }) { projects[i] = saved } else { projects.insert(saved, at: 0) }
            projects.sort { $0.updatedAt > $1.updatedAt }
        } catch {
            report(error, "Le projet n'a pas pu être enregistré.")
        }
    }

    func rename(_ id: CustomizationProject.ID, to name: String) async {
        guard var p = project(id) else { return }
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        p.name = trimmed
        await save(p)
    }

    func duplicate(_ id: CustomizationProject.ID) async {
        guard let p = project(id) else { return }
        await save(p.duplicated())
    }

    func toggleFavorite(project id: CustomizationProject.ID) async {
        guard var p = project(id) else { return }
        p.isFavorite.toggle()
        await save(p)
    }

    func deleteProject(_ id: CustomizationProject.ID) async {
        do {
            try await store.delete(id)
            projects.removeAll { $0.id == id }
        } catch {
            report(error, "Le projet n'a pas pu être supprimé.")
        }
    }

    /// Fits an accessory in a project and adds it to the shopping list.
    func addAccessory(_ accessory: Accessory, variant: AccessoryVariant, to projectID: CustomizationProject.ID) async throws {
        guard var p = project(projectID), let vehicle = self.variant3D(p.configuration.vehicleVariantID) else { return }
        var editor = try ConfigurationEditor(vehicle: vehicle, configuration: p.configuration)
        try editor.fit(accessory, variant: variant)
        p.configuration = editor.configuration
        p.shoppingList = BudgetCalculator.syncShoppingList(p.shoppingList, configuration: p.configuration,
                                                           accessories: { self.accessoryVariant($0) },
                                                           currency: p.budget.currency)
        await save(p)
    }

    // MARK: Favorites

    func isFavorite(_ id: Accessory.ID) -> Bool { favorites.accessoryIDs.contains(id) }

    func toggleFavorite(accessory id: Accessory.ID) async {
        var f = favorites
        if let i = f.accessoryIDs.firstIndex(of: id) { f.accessoryIDs.remove(at: i) } else { f.accessoryIDs.append(id) }
        await saveFavorites(f)
    }

    func updateFavorites(_ change: (inout UserFavorites) -> Void) async {
        var f = favorites
        change(&f)
        await saveFavorites(f)
    }

    private func saveFavorites(_ f: UserFavorites) async {
        do {
            try await store.saveFavorites(f)
            favorites = f
        } catch {
            report(error, "Les favoris n'ont pas pu être enregistrés.")
        }
    }

    private func report(_ error: Error, _ message: String) {
        log.error("\(message) \(String(describing: error))")
        errorMessage = message
    }
}
