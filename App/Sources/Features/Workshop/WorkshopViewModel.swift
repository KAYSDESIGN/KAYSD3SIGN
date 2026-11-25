import SwiftUI
import Observation
import OSLog
import MFDomain
import MFEngine
import MFRendering

/// Atelier state. The `ConfigurationEditor` holds the single source of truth; the view only
/// renders `RenderPlan`s derived from it, so changing angle never alters modifications.
@MainActor
@Observable
final class WorkshopViewModel {
    enum Phase: Equatable { case loading, ready, failed(String) }

    private(set) var phase: Phase = .loading
    private(set) var editor: ConfigurationEditor?
    private(set) var project: CustomizationProject?
    private(set) var image: CGImage?
    private(set) var originalImage: CGImage?
    private(set) var renderNotice: String?

    var angle: ViewAngle = .rightProfile { didSet { scheduleRender() } }
    var selectedComponentID: MotorcycleComponent.ID?
    var showsOriginal = false { didSet { scheduleRender() } }
    /// Live preview of a style being edited in a studio (not recorded in history until applied).
    private(set) var previewStyle: (id: MotorcycleComponent.ID, style: ComponentStyle)?

    private let projectID: CustomizationProject.ID
    @ObservationIgnored
    private var model: AppModel?
    @ObservationIgnored
    private var compositor: BikeCompositor?
    @ObservationIgnored
    private var saveTask: Task<Void, Never>?
    @ObservationIgnored
    private var renderTask: Task<Void, Never>?
    @ObservationIgnored
    private let log = Logger(subsystem: "app.motoforge", category: "workshop")

    init(projectID: CustomizationProject.ID) {
        self.projectID = projectID
    }

    // MARK: Lifecycle

    func start(model: AppModel, compositor: BikeCompositor) {
        guard editor == nil else { return }
        self.model = model
        self.compositor = compositor
        guard let project = model.project(projectID) else { phase = .failed("Projet introuvable."); return }
        guard let vehicle = model.variant(project.configuration.vehicleVariantID) else {
            phase = .failed("Cette moto n'est plus dans le catalogue."); return
        }
        do {
            editor = try ConfigurationEditor(vehicle: vehicle, configuration: project.configuration)
            self.project = project
            selectedComponentID = vehicle.components.first { $0.kind == .tank }?.id ?? vehicle.components.first?.id
            if let first = vehicle.availableAngles.first, vehicle.view(for: angle) == nil { angle = first }
            phase = .ready
            scheduleRender()
        } catch {
            phase = .failed("Configuration incompatible avec cette moto.")
        }
    }

    // MARK: Read

    var vehicle: MotorcycleVariant? { editor?.vehicle }
    var components: [MotorcycleComponent] { vehicle?.components ?? [] }
    var selectedComponent: MotorcycleComponent? { selectedComponentID.flatMap { vehicle?.component($0) } }
    var hasVisuals: Bool { !(vehicle?.views.isEmpty ?? true) }
    var canUndo: Bool { editor?.history.canUndo ?? false }
    var canRedo: Bool { editor?.history.canRedo ?? false }
    var changeLog: [String] { editor?.history.changeLog ?? [] }

    /// Current material of the selected component (override, original colorway, or nil).
    var selectedMaterial: MFDomain.Material? {
        guard let id = selectedComponentID, case .paint(let m)? = editor?.effectiveStyle(of: id) else { return nil }
        return m
    }

    func isModified(_ id: MotorcycleComponent.ID) -> Bool { editor?.isModified(id) ?? false }

    /// Current wrap of the selected component, if any.
    var selectedWrap: WrapDesign? {
        guard let id = selectedComponentID, case .wrap(let w)? = editor?.effectiveStyle(of: id) else { return nil }
        return w
    }

    func preview(_ style: ComponentStyle?) {
        if let style, let id = selectedComponentID { previewStyle = (id, style) } else { previewStyle = nil }
        scheduleRender()
    }

    func apply(wrap: WrapDesign) {
        guard let id = selectedComponentID else { return }
        previewStyle = nil
        mutate { try $0.setWrap(wrap, on: id) }
    }

    // MARK: Intents

    func apply(color: PaintColor) {
        var material = selectedMaterial ?? MFDomain.Material(baseColor: color)
        material.baseColor = color
        apply(material)
        Task { await model?.updateFavorites { ColorMemory.pushRecent(color.rgb, into: &$0) } }
    }

    func apply(effect: PaintEffect) {
        guard let current = selectedMaterial ?? PaintPresets.quickColors.first.map({ MFDomain.Material(baseColor: $0) }) else { return }
        apply(MFDomain.Material(baseColor: current.baseColor, effect: effect, parameters: .defaults(for: effect)))
    }

    func apply(_ material: MFDomain.Material) {
        guard let id = selectedComponentID else { return }
        previewStyle = nil
        mutate { try $0.setPaint(material, on: id) }
    }

    func resetSelected() {
        guard let id = selectedComponentID else { return }
        mutate { try $0.resetComponent(id) }
    }

    func resetAll() { mutate { $0.resetToOriginal() } }
    func undo() { mutate { $0.undo() } }
    func redo() { mutate { $0.redo() } }

    func removeAccessory(_ id: AccessoryVariant.ID) {
        mutate { try $0.remove(accessoryVariant: id) }
    }

    /// Direct selection on the visual (normalized point in the rendered image).
    func select(at point: NormalizedPoint) {
        guard let view = vehicle?.view(for: angle),
              let id = ComponentHitTester.component(at: point, in: view) else { return }
        selectedComponentID = id
    }

    private func mutate(_ change: (inout ConfigurationEditor) throws -> Void) {
        guard var e = editor else { return }
        do {
            try change(&e)
            editor = e
            scheduleSave()
            scheduleRender()
        } catch {
            log.error("Modification refusée : \(String(describing: error))")
            model?.errorMessage = "Cette modification n'est pas possible sur cet élément."
        }
    }

    // MARK: Autosave (debounced)

    private func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(600))
            guard !Task.isCancelled else { return }
            await self?.saveNow()
        }
    }

    func saveNow() async {
        guard var p = project, let e = editor, let model else { return }
        p.configuration = e.configuration
        p.shoppingList = BudgetCalculator.syncShoppingList(p.shoppingList, configuration: p.configuration,
                                                           accessories: { model.accessoryVariant($0) }, currency: p.budget.currency)
        await model.save(p)
        project = model.project(p.id) ?? p
    }

    // MARK: Rendering (local, Core Image)

    private func scheduleRender() {
        renderTask?.cancel()
        guard let e = editor, let model, let compositor else { return }
        guard e.vehicle.view(for: angle) != nil else {
            image = nil
            originalImage = nil
            renderNotice = hasVisuals ? "Cet angle n'est pas encore disponible." : nil
            return
        }
        let fitted = Dictionary(e.configuration.accessories.compactMap { selection in
            model.accessoryVariant(selection.variantID).map { (selection.variantID, $0.1) }
        }, uniquingKeysWith: { first, _ in first })
        let builder = RenderPlanBuilder(vehicle: e.vehicle, accessoryVariant: { fitted[$0] })
        let angle = self.angle
        do {
            let preview = previewStyle
            let plan = try builder.plan(for: e.configuration, angle: angle) { id in
                if let preview, preview.id == id { return preview.style }
                return e.effectiveStyle(of: id)
            }
            let original = try builder.plan(for: ProjectConfiguration(vehicleVariantID: e.vehicle.id,
                                                                      originalColorwayID: e.configuration.originalColorwayID),
                                            angle: angle) { id in
                ConfigurationEditor.originalStyle(of: id, vehicle: e.vehicle, colorway: e.configuration.originalColorwayID)
            }
            var notices: [String] = []
            let missing = plan.accessoriesWithoutVisual.filter { !(model.accessoryVariant($0)?.1.visualAssets.isEmpty ?? true) }
            if !missing.isEmpty { notices.append("\(missing.count) pièce(s) non visible(s) sous cet angle.") }
            renderNotice = notices.isEmpty ? nil : notices.joined(separator: " ")
            renderTask = Task.detached(priority: .userInitiated) { [compositor] in
                let rendered = try? compositor.render(plan)
                let renderedOriginal = try? compositor.render(original)
                await MainActor.run { [weak self] in
                    guard !Task.isCancelled else { return }
                    self?.image = rendered
                    self?.originalImage = renderedOriginal
                }
            }
        } catch {
            renderNotice = "Rendu impossible pour cet angle."
        }
    }
}

extension ConfigurationEditor {
    /// Factory style of a component, used for before/after comparison.
    static func originalStyle(of id: MotorcycleComponent.ID, vehicle: MotorcycleVariant, colorway: OriginalColorway.ID?) -> ComponentStyle? {
        guard let colorway, let c = vehicle.colorways.first(where: { $0.id == colorway }), let m = c.componentMaterials[id] else { return nil }
        return .paint(m)
    }
}
