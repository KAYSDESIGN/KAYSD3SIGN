import SwiftUI
import Observation
import MFDomain

enum AppTab: String, CaseIterable, Identifiable {
    case home, garage, catalog, projects, menu
    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Accueil"
        case .garage: "Garage"
        case .catalog: "Catalogue"
        case .projects: "Projets et favoris"
        case .menu: "Menu"
        }
    }

    /// Icons from the mockup's floating bar.
    var systemImage: String {
        switch self {
        case .home: "house.fill"
        case .garage: "motorcycle"
        case .catalog: "magnifyingglass"
        case .projects: "heart"
        case .menu: "square.grid.2x2"
        }
    }
}

/// Destinations pushed inside a tab.
enum Route: Hashable {
    case workshop(CustomizationProject.ID)
    case product(Accessory.ID)
    case budget(CustomizationProject.ID)
    case shoppingList(CustomizationProject.ID)
}

/// Navigation state: selected tab, one stack per tab, cross-tab intents.
@MainActor
@Observable
final class AppRouter {
    var tab: AppTab = .home
    var paths: [AppTab: [Route]] = [:]
    /// Category preselected when opening the catalog from elsewhere.
    var catalogCategory: AccessoryCategory?
    var isAddingMotorcycle = false

    func path(for tab: AppTab) -> Binding<[Route]> {
        Binding(get: { self.paths[tab] ?? [] }, set: { self.paths[tab] = $0 })
    }

    func open(_ route: Route, in tab: AppTab? = nil) {
        let target = tab ?? self.tab
        self.tab = target
        paths[target, default: []].append(route)
    }

    func openCatalog(category: AccessoryCategory? = nil) {
        catalogCategory = category
        tab = .catalog
    }
}
