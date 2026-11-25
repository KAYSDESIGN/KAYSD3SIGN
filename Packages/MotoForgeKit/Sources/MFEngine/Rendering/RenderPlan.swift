import Foundation
import MFDomain

/// One drawing instruction for the 2D compositor (Core Image / Metal on device).
public enum RenderLayer: Hashable, Sendable {
    /// Layer 1 — reference photo of the angle.
    case base(asset: String)
    /// Removes an original part (stock mirror…) before an accessory is drawn. The compositor
    /// fills the masked area with the plate's background / clean plate.
    case erase(maskAsset: String)
    /// Layers 2+3 — a component's mask filled with its material, preserving the base shading.
    case component(id: MotorcycleComponent.ID, maskAsset: String, style: ComponentStyle)
    /// Layer 4 — an accessory asset.
    case accessory(variantID: AccessoryVariant.ID, asset: String, anchor: NormalizedPoint, placement: Placement)
    /// Re-draws a component (base + style) over an accessory it occludes in this angle.
    case occluder(id: MotorcycleComponent.ID, maskAsset: String, style: ComponentStyle?)
}

public struct RenderPlan: Hashable, Sendable {
    public let angle: ViewAngle
    public let layers: [RenderLayer]
    /// Fitted accessories that have no visual for this angle (shown to the user, never silently dropped).
    public let accessoriesWithoutVisual: [AccessoryVariant.ID]
    /// Overridden components with no mask in this angle (normally: not visible from here).
    public let componentsNotVisible: [MotorcycleComponent.ID]
}

public enum RenderPlanError: Error, Equatable, Sendable {
    case angleUnavailable(ViewAngle)
}

/// Builds the per-angle drawing plan from the single, angle-independent configuration.
///
/// Because every angle is derived from the same `ProjectConfiguration`, changing angle can never
/// reset or diverge modifications.
public struct RenderPlanBuilder: Sendable {
    public let vehicle: MotorcycleVariant
    /// Looks up an accessory reference by ID (catalog).
    public let accessoryVariant: @Sendable (AccessoryVariant.ID) -> AccessoryVariant?

    public init(vehicle: MotorcycleVariant, accessoryVariant: @escaping @Sendable (AccessoryVariant.ID) -> AccessoryVariant?) {
        self.vehicle = vehicle
        self.accessoryVariant = accessoryVariant
    }

    public func plan(for configuration: ProjectConfiguration, angle: ViewAngle, effectiveStyle: (MotorcycleComponent.ID) -> ComponentStyle?) throws -> RenderPlan {
        guard let view = vehicle.view(for: angle) else { throw RenderPlanError.angleUnavailable(angle) }

        // Resolve accessories visible in this angle.
        struct Fitted { let selection: AccessorySelection; let asset: AccessoryVisualAsset }
        var fitted: [Fitted] = []
        var withoutVisual: [AccessoryVariant.ID] = []
        for selection in configuration.accessories {
            if let variant = accessoryVariant(selection.variantID), let asset = variant.visualAsset(for: angle) {
                fitted.append(Fitted(selection: selection, asset: asset))
            } else {
                withoutVisual.append(selection.variantID)
            }
        }
        let hidden = Set(fitted.flatMap(\.asset.hidesComponents))

        // Drawable items sorted by z-index: components (unless hidden) and accessories.
        enum Item { case component(ComponentMask), accessory(Fitted) }
        var items: [(z: Int, order: Int, item: Item)] = []
        for (i, mask) in view.masks.enumerated() where !hidden.contains(mask.componentID) {
            if effectiveStyle(mask.componentID) != nil {
                items.append((mask.zIndex, i, .component(mask)))
            }
        }
        for (i, f) in fitted.enumerated() {
            items.append((f.asset.zIndex, view.masks.count + i, .accessory(f)))
        }
        items.sort { ($0.z, $0.order) < ($1.z, $1.order) }

        var layers: [RenderLayer] = [.base(asset: view.baseImageAsset)]
        for componentID in hidden.sorted() {
            if let mask = view.mask(for: componentID) { layers.append(.erase(maskAsset: mask.maskAsset)) }
        }
        for asset in fitted.flatMap(\.asset.eraseMaskAssets) {
            layers.append(.erase(maskAsset: asset))
        }
        for entry in items {
            switch entry.item {
            case .component(let mask):
                if let style = effectiveStyle(mask.componentID) {
                    layers.append(.component(id: mask.componentID, maskAsset: mask.maskAsset, style: style))
                }
            case .accessory(let f):
                let placement = f.selection.placementAdjustments[angle] ?? f.asset.placement
                layers.append(.accessory(variantID: f.selection.variantID, asset: f.asset.assetName,
                                         anchor: f.asset.assetAnchor, placement: placement))
                for occluderID in f.asset.occludedBy where !hidden.contains(occluderID) {
                    if let mask = view.mask(for: occluderID) {
                        layers.append(.occluder(id: occluderID, maskAsset: mask.maskAsset, style: effectiveStyle(occluderID)))
                    }
                }
            }
        }

        let notVisible = configuration.componentStyles.keys.filter { view.mask(for: $0) == nil }.sorted()
        return RenderPlan(angle: angle, layers: layers, accessoriesWithoutVisual: withoutVisual, componentsNotVisible: notVisible)
    }
}

extension ConfigurationEditor {
    /// Convenience: render plan for the editor's current configuration.
    public func renderPlan(angle: ViewAngle, using builder: RenderPlanBuilder) throws -> RenderPlan {
        try builder.plan(for: configuration, angle: angle, effectiveStyle: { effectiveStyle(of: $0) })
    }
}

/// Hit-testing for direct selection on the visual.
public enum ComponentHitTester {
    /// Returns the top-most component whose mask bounds contain the point.
    /// `maskCoverage` refines the test with the actual mask pixel (alpha > 0.5) when masks are loaded.
    public static func component(
        at point: NormalizedPoint,
        in view: MotorcycleView,
        maskCoverage: ((ComponentMask, NormalizedPoint) -> Bool)? = nil
    ) -> MotorcycleComponent.ID? {
        view.masks
            .filter { $0.bounds.contains(point) && (maskCoverage?($0, point) ?? true) }
            .max { $0.zIndex < $1.zIndex }?
            .componentID
    }
}
