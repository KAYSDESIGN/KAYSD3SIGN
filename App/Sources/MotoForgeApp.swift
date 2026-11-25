import SwiftUI
import MFDesignSystem

@main
struct MotoForgeApp: App {
    @State private var environment = AppEnvironment.live()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(environment)
                .tint(MFColor.accent)
        }
    }
}
