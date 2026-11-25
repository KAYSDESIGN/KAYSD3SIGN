import SwiftUI
import MFDesignSystem

/// Root: five destinations, one navigation stack each, and the floating bar from the mockup.
struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router
        @Bindable var model = model

        TabView(selection: $router.tab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack(path: router.path(for: tab)) {
                    LoadGate { screen(for: tab) }
                        .background(MFColor.background.ignoresSafeArea())
                        .navigationDestination(for: Route.self) { destination($0) }
                }
                .toolbar(.hidden, for: .tabBar)
                .tag(tab)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            MFFloatingTabBar(
                items: AppTab.allCases.map { MFTabItem($0, title: $0.title, systemImage: $0.systemImage) },
                selection: $router.tab
            )
            .padding(.horizontal, MFSpacing.l)
            .padding(.bottom, MFSpacing.xxs)
        }
        .sheet(isPresented: $router.isAddingMotorcycle) {
            AddMotorcycleView()
        }
        .alert("Erreur", isPresented: Binding(get: { model.errorMessage != nil }, set: { if !$0 { model.errorMessage = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.errorMessage ?? "")
        }
    }

    @ViewBuilder
    private func screen(for tab: AppTab) -> some View {
        switch tab {
        case .home: HomeView()
        case .garage: GarageView()
        case .catalog: CatalogView()
        case .projects: ProjectsView()
        case .menu: MenuView()
        }
    }

    @ViewBuilder
    private func destination(_ route: Route) -> some View {
        switch route {
        case .workshop(let id): WorkshopView(projectID: id)
        case .product(let id): ProductDetailView(accessoryID: id)
        case .budget(let id): BudgetView(projectID: id)
        case .shoppingList(let id): ShoppingListView(projectID: id)
        }
    }
}
