import SwiftUI
import MFDesignSystem

@main
struct MotoForgeApp: App {
    @State private var environment = AppEnvironment.live()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(environment.model)
                .environment(environment.router)
                .environment(\.compositor, environment.compositor)
                .tint(MFColor.accent)
                .task { await environment.model.load() }
        }
    }
}
