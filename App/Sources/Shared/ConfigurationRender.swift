import SwiftUI
import MFDomain
import MFEngine
import MFRendering
import MFDesignSystem

/// Renders a configuration locally (Core Image) for thumbnails: project cards, inspirations, budget header.
struct ConfigurationRender: View {
    @Environment(AppModel.self) private var model
    @Environment(\.compositor) private var compositor
    let configuration: ProjectConfiguration
    var angle: ViewAngle = .frontThreeQuarter
    var dark = false
    /// Product visuals need the 3D set: accessory renders are aligned with it only.
    var force3D = false

    @State private var image: CGImage?

    var body: some View {
        ZStack {
            (dark ? MFColor.graphite : MFColor.neutralStage)
            if let image {
                Image(decorative: image, scale: 1).resizable().scaledToFit().padding(MFSpacing.xs)
                    .transition(.opacity)
            } else {
                ProgressView().tint(MFColor.textSecondary)
            }
        }
        .accessibilityLabel("Rendu de la configuration")
        .task(id: RenderCache.Key(configuration: configuration, angle: angle, photos: !force3D && model.usesPhotos)) { await render() }
    }

    private func render() async {
        let use3D = force3D || !model.usesPhotos
        guard let vehicle = use3D ? model.variant3D(configuration.vehicleVariantID) : model.variant(configuration.vehicleVariantID) else { return }
        let key = RenderCache.Key(configuration: configuration, angle: angle, photos: !use3D)
        if let cached = await RenderCache.shared.image(for: key) { image = cached; return }
        let fitted = Dictionary(configuration.accessories.filter { _ in use3D }.compactMap { s in model.accessoryVariant(s.variantID).map { (s.variantID, $0.1) } },
                                uniquingKeysWith: { a, _ in a })
        let builder = RenderPlanBuilder(vehicle: vehicle, accessoryVariant: { fitted[$0] })
        guard let editor = try? ConfigurationEditor(vehicle: vehicle, configuration: configuration),
              let plan = try? editor.renderPlan(angle: vehicle.view(for: angle) != nil ? angle : (vehicle.availableAngles.first ?? angle), using: builder)
        else { return }
        let compositor = self.compositor
        let rendered = await Task.detached(priority: .utility) { try? compositor.render(plan, scale: 0.4) }.value
        if let rendered {
            await RenderCache.shared.store(rendered, for: key)
            withAnimation(.easeOut(duration: 0.2)) { image = rendered }
        }
    }
}

/// Small in-memory cache of rendered thumbnails.
actor RenderCache {
    static let shared = RenderCache()
    struct Key: Hashable { let configuration: ProjectConfiguration; let angle: ViewAngle; let photos: Bool }
    private var storage: [Key: CGImage] = [:]
    private var order: [Key] = []

    func image(for key: Key) -> CGImage? { storage[key] }

    func store(_ image: CGImage, for key: Key) {
        storage[key] = image
        order.append(key)
        if order.count > 24 { storage[order.removeFirst()] = nil }
    }
}

/// Product visual: the part fitted on the bike when a 3D representation exists, otherwise a category
/// illustration with the manufacturer (official photos are linked on the product sheet, not copied).
struct ProductVisual: View {
    @Environment(AppModel.self) private var model
    let accessory: Accessory
    var variant: AccessoryVariant? = nil
    var compact = false

    var body: some View {
        let v = variant ?? accessory.variants.first
        let vehicle = model.selectedMotorcycle?.variantID ?? model.catalog?.variants.first?.id
        if let v, !v.visualAssets.isEmpty, let vehicle {
            ConfigurationRender(configuration: ProjectConfiguration(
                vehicleVariantID: vehicle,
                accessories: [AccessorySelection(accessoryID: accessory.id, variantID: v.id, category: accessory.category)]),
                angle: v.visualAssets.contains { $0.angle == .frontThreeQuarter } ? .frontThreeQuarter : v.visualAssets[0].angle,
                force3D: true)
        } else {
            ZStack {
                MFColor.neutralStage
                VStack(spacing: compact ? 2 : MFSpacing.xs) {
                    Image(systemName: accessory.category.systemImage)
                        .font(.system(size: compact ? 26 : 44, weight: .light))
                        .foregroundStyle(MFColor.accent)
                    if !compact {
                        Text(accessory.manufacturer.uppercased())
                            .font(MFTypography.captionEmphasized).tracking(1.5)
                            .foregroundStyle(MFColor.textPrimary)
                        Text(v?.reference ?? "").font(MFTypography.caption.monospaced()).foregroundStyle(MFColor.textSecondary)
                    }
                }
            }
            .accessibilityLabel("\(accessory.manufacturer) \(accessory.commercialName)")
        }
    }
}
