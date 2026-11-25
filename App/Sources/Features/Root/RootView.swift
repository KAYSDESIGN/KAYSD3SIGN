import SwiftUI
import MFDesignSystem

/// The five main destinations.
enum AppTab: String, CaseIterable, Identifiable {
    case home, garage, catalog, projects, menu
    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Accueil"
        case .garage: "Garage"
        case .catalog: "Catalogue"
        case .projects: "Projets"
        case .menu: "Menu"
        }
    }

    var systemImage: String {
        switch self {
        case .home: "house"
        case .garage: "motorcycle"
        case .catalog: "square.grid.2x2"
        case .projects: "heart.text.square"
        case .menu: "line.3.horizontal"
        }
    }
}

/// Root navigation. The system `TabView` provides the floating, native Liquid Glass tab bar on iOS 26+.
///
/// Screen contents are intentionally NOT designed yet: they must follow the validated mockups
/// (docs/mockups/), which have not been provided. Each tab states this honestly.
struct RootView: View {
    @State private var selection: AppTab = .home

    var body: some View {
        TabView(selection: $selection) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    PendingMockupScreen(tab: tab)
                        .navigationTitle(tab.title)
                }
                .tabItem { Label(tab.title, systemImage: tab.systemImage) }
                .tag(tab)
            }
        }
        .sensoryFeedback(.selection, trigger: selection)
    }
}

private struct PendingMockupScreen: View {
    let tab: AppTab

    var body: some View {
        MFUnavailableView(
            tab.title,
            systemImage: tab.systemImage,
            message: "Cet écran sera construit à l'identique de la maquette validée dès sa réception."
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(MFColor.background)
    }
}

#Preview {
    RootView()
}
