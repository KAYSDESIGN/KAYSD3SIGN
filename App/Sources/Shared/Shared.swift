import SwiftUI
import CoreImage
import UIKit
import MFDomain
import MFEngine
import MFDesignSystem
import MFRendering

// MARK: - Assets

enum BundleAssets {
    /// Loads an image from the asset catalog (or a file in the bundle) as a Core Image image.
    static func ciImage(named name: String) -> CIImage? {
        if name.hasPrefix("photo:") {
            return PrivatePhotoSet.url(String(name.dropFirst(6))).flatMap { CIImage(contentsOf: $0) }
        }
        if name.hasPrefix("file:") {
            let url = UserWrapImages.url(String(name.dropFirst(5)))
            return CIImage(contentsOf: url)
        }
        guard let ui = UIImage(named: name), let cg = ui.cgImage else { return nil }
        return CIImage(cgImage: cg)
    }

    static func exists(_ name: String) -> Bool { UIImage(named: name) != nil }
}

/// Personal photo set bundled from App/PrivatePhotos (git-ignored; absent in CI builds).
enum PrivatePhotoSet {
    static let folder = "PrivatePhotos"

    static func url(_ name: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: "png", subdirectory: folder)
    }

    static func load() -> [MotorcycleView] {
        guard let url = Bundle.main.url(forResource: "photo_views", withExtension: "json", subdirectory: folder),
              let data = try? Data(contentsOf: url) else { return [] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([MotorcycleView].self, from: data)) ?? []
    }
}

private struct CompositorKey: EnvironmentKey {
    static let defaultValue = BikeCompositor(loadAsset: { _ in nil })
}

extension EnvironmentValues {
    var compositor: BikeCompositor {
        get { self[CompositorKey.self] }
        set { self[CompositorKey.self] = newValue }
    }
}

// MARK: - Visuals

/// A motorcycle or product photo. When the licensed visual is not available yet, shows a neutral,
/// clearly labelled placeholder instead of a fake image.
struct BikeVisual: View {
    let assetName: String?
    var placeholderSymbol = "motorcycle"
    var placeholderText = "Visuel à venir"
    var dark = false

    var body: some View {
        if let assetName, let ui = UIImage(named: assetName) {
            Image(uiImage: ui)
                .resizable()
                .scaledToFill()
                .accessibilityHidden(true)
        } else {
            ZStack {
                (dark ? MFColor.graphite : MFColor.neutralStage)
                VStack(spacing: MFSpacing.xs) {
                    Image(systemName: placeholderSymbol)
                        .font(.system(size: 40, weight: .light))
                    Text(placeholderText)
                        .font(MFTypography.caption)
                }
                .foregroundStyle(dark ? Color.white.opacity(0.7) : MFColor.textSecondary)
            }
            .accessibilityElement(children: .combine)
        }
    }
}

// MARK: - Formatting

enum Format {
    static func money(_ amount: Decimal, _ currency: String) -> String { MoneyFormatting.string(amount, currency: currency) }
    static func money(_ money: Money) -> String { MoneyFormatting.string(money) }

    /// « Mis à jour le 23 nov. 2026 »
    static func updated(_ date: Date) -> String {
        "Mis à jour le " + date.formatted(.dateTime.day().month(.abbreviated).year().locale(Locale(identifier: "fr_FR")))
    }

    static func kilometers(_ km: Int) -> String {
        km.formatted(.number.locale(Locale(identifier: "fr_FR"))) + " km"
    }
}

extension RGBColor {
    var swiftUIColor: Color { Color(.sRGB, red: red, green: green, blue: blue) }
}

extension Color {
    /// sRGB components of a SwiftUI color (system color picker → domain color).
    var rgbColor: RGBColor {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return RGBColor(red: Double(r), green: Double(g), blue: Double(b))
    }
}

// MARK: - States

/// Standard error state with retry.
struct ErrorStateView: View {
    let message: String
    let retry: () -> Void
    var body: some View {
        ContentUnavailableView {
            Label("Une erreur est survenue", systemImage: "exclamationmark.triangle")
        } description: {
            Text(message)
        } actions: {
            Button("Réessayer", action: retry).buttonStyle(.mfPrimary)
        }
    }
}

/// Wraps content with the app's loading / error states.
struct LoadGate<Content: View>: View {
    @Environment(AppModel.self) private var model
    @ViewBuilder let content: () -> Content

    var body: some View {
        switch model.state {
        case .idle, .loading:
            ProgressView("Chargement…").frame(maxWidth: .infinity, maxHeight: .infinity)
        case .failed(let message):
            ErrorStateView(message: message) { Task { await model.load() } }
        case .loaded:
            content()
        }
    }
}

/// Space reserved under scroll content for the floating tab bar.
extension View {
    func floatingBarInset() -> some View {
        safeAreaInset(edge: .bottom) { Color.clear.frame(height: 72) }
    }
}
