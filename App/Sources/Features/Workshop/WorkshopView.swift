import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Atelier — mockup screen 5. The motorcycle occupies most of the screen.
struct WorkshopView: View {
    enum Segment: Hashable { case customize, configure }
    enum Mode: Hashable { case color, finish, parts }

    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @Environment(\.compositor) private var compositor
    @State private var vm: WorkshopViewModel
    @State private var segment: Segment = .customize
    @State private var mode: Mode = .color
    @State private var showStudio = false
    @State private var showCovering = false

    init(projectID: CustomizationProject.ID) {
        _vm = State(initialValue: WorkshopViewModel(projectID: projectID))
    }

    var body: some View {
        Group {
            switch vm.phase {
            case .loading:
                ProgressView("Préparation de l'atelier…").frame(maxWidth: .infinity, maxHeight: .infinity)
            case .failed(let message):
                ContentUnavailableView("Atelier indisponible", systemImage: "wrench.and.screwdriver", description: Text(message))
            case .ready:
                ready
            }
        }
        .navigationTitle("Atelier")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbar }
        .task { vm.start(model: model, compositor: compositor) }
        .onDisappear { Task { await vm.saveNow() } }
        .sheet(isPresented: $showStudio) { PaintStudioView(vm: vm) }
        .sheet(isPresented: $showCovering) { CoveringStudioView(vm: vm) }
    }

    private var ready: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.l) {
                MFSegmentedControl([(Segment.customize, "Personnaliser"), (.configure, "Configurer")], selection: $segment)
                switch segment {
                case .customize:
                    stage
                    switch mode {
                    case .color:
                        colorPanel
                        finishPanel
                    case .finish:
                        finishPanel
                        advancedEntry
                    case .parts:
                        partsPanel
                    }
                case .configure:
                    ConfigurePanel(vm: vm, openStudio: { showStudio = true }, openCovering: { showCovering = true })
                }
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .floatingBarInset()
    }

    @ToolbarContentBuilder private var toolbar: some ToolbarContent {
        ToolbarItemGroup(placement: .topBarTrailing) {
            Button { vm.undo() } label: { Image(systemName: "arrow.uturn.backward") }
                .disabled(!vm.canUndo).accessibilityLabel("Annuler")
            Button { vm.redo() } label: { Image(systemName: "arrow.uturn.forward") }
                .disabled(!vm.canRedo).accessibilityLabel("Rétablir")
        }
    }

    // MARK: Stage

    private var stage: some View {
        ZStack {
            WorkshopStage(vm: vm)
            VStack {
                HStack {
                    anglePicker
                    Spacer()
                    Toggle(isOn: $vm.showsOriginal) { Text("Avant") }
                        .toggleStyle(.button)
                        .buttonStyle(.mfGlass)
                        .accessibilityLabel("Comparer avec la configuration d'origine")
                        .disabled(!vm.hasVisuals)
                }
                Spacer()
                HStack(spacing: MFSpacing.xs) {
                    MFStageModeButton("Couleur", systemImage: "drop", isSelected: mode == .color) { mode = .color }
                    MFStageModeButton("Finition", systemImage: "square.3.layers.3d", isSelected: mode == .finish) { mode = .finish }
                    MFStageModeButton("Pièces", systemImage: "cube", isSelected: mode == .parts) { mode = .parts }
                }
                .sensoryFeedback(.selection, trigger: mode)
            }
            .padding(MFSpacing.s)
        }
        .frame(height: 360)
        .clipShape(RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
    }

    /// Six fixed angles. No 360° rotation is offered (no real rotation engine yet).
    private var anglePicker: some View {
        Menu {
            Picker("Angle de vue", selection: $vm.angle) {
                ForEach(ViewAngle.allCases, id: \.self) { a in
                    Text(a.localizedName).tag(a)
                }
            }
        } label: {
            Label(vm.angle.localizedName, systemImage: "camera.viewfinder")
                .font(MFTypography.caption.weight(.semibold))
        }
        .buttonStyle(.mfGlass)
        .accessibilityLabel("Angle de vue : \(vm.angle.localizedName)")
    }

    // MARK: Panels

    private var componentTitle: some View {
        Menu {
            ForEach(vm.components) { c in
                Button { vm.selectedComponentID = c.id } label: {
                    if vm.isModified(c.id) { Label(c.displayName, systemImage: "paintbrush.fill") } else { Text(c.displayName) }
                }
            }
        } label: {
            HStack(spacing: MFSpacing.xxs) {
                Text("Couleur \(articled(vm.selectedComponent?.displayName ?? "l'élément"))")
                    .font(MFTypography.headline)
                Image(systemName: "chevron.down").font(.caption.weight(.bold))
            }
            .foregroundStyle(MFColor.textPrimary)
        }
        .accessibilityLabel("Élément personnalisé : \(vm.selectedComponent?.displayName ?? "aucun")")
    }

    private var colorPanel: some View {
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            HStack {
                componentTitle
                Spacer()
                Button("Plus de couleurs") { showStudio = true }
                    .font(MFTypography.caption.weight(.semibold))
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: MFSpacing.xs), count: 6), spacing: MFSpacing.s) {
                ForEach(PaintPresets.quickColors) { c in
                    MFColorSwatch(color: c.rgb.swiftUIColor, name: c.name,
                                  isSelected: vm.selectedMaterial?.baseColor.rgb.hexString == c.rgb.hexString) {
                        vm.apply(color: c)
                    }
                }
            }
            .sensoryFeedback(.selection, trigger: vm.selectedMaterial?.baseColor.rgb.hexString)
        }
    }

    private var finishPanel: some View {
        let color = (vm.selectedMaterial?.baseColor.rgb ?? PaintPresets.quickColors[6].rgb).swiftUIColor
        return VStack(alignment: .leading, spacing: MFSpacing.s) {
            HStack {
                MFSectionHeader("Finition")
                if let effect = vm.selectedMaterial?.effect, effect.isLightingSimulation { MFBadge(.simulation) }
            }
            HStack(spacing: MFSpacing.xs) {
                ForEach(PaintPresets.quickEffects, id: \.self) { e in
                    MFFinishCard(effect: e, color: color, isSelected: vm.selectedMaterial?.effect == e) { vm.apply(effect: e) }
                }
            }
        }
    }

    private var advancedEntry: some View {
        HStack(spacing: MFSpacing.s) {
            Button { showStudio = true } label: {
                Label("Peinture avancée", systemImage: "slider.horizontal.below.square.filled.and.square")
            }
            .buttonStyle(.mfSecondary)
            Button { showCovering = true } label: {
                Label("Covering", systemImage: "square.on.square.dashed")
            }
            .buttonStyle(.mfSecondary)
        }
    }

    private var partsPanel: some View {
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            MFSectionHeader("Pièces installées")
            let fitted = vm.editor?.configuration.accessories ?? []
            if fitted.isEmpty {
                Text("Aucune pièce. Ajoutez des pièces compatibles depuis le catalogue.")
                    .font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
            }
            ForEach(fitted, id: \.variantID) { selection in
                let item = model.accessoryVariant(selection.variantID)
                MFCard {
                    HStack {
                        Label(item.map { "\($0.0.manufacturer) \($0.0.commercialName)" } ?? selection.variantID.rawValue,
                              systemImage: selection.category.systemImage)
                            .font(MFTypography.callout)
                        Spacer()
                        Button(role: .destructive) { vm.removeAccessory(selection.variantID) } label: {
                            Image(systemName: "minus.circle")
                        }
                        .accessibilityLabel("Retirer de la configuration")
                    }
                }
            }
            Button("Parcourir le catalogue") { router.openCatalog() }.buttonStyle(.mfPrimary)
        }
    }

    /// « Couleur du réservoir », « Couleur de la selle », « Couleur des leviers »…
    private func articled(_ name: String) -> String {
        let lower = name.lowercased()
        let firstWord = lower.split(separator: " ").first.map(String.init) ?? lower
        let plural = firstWord.hasSuffix("s") || firstWord.hasSuffix("x")
        if plural { return "des \(lower)" }
        let feminine = ["selle", "fourche", "jante", "coque", "protection"].contains { lower.hasPrefix($0) }
        if let first = lower.first, "aeiouéèêh".contains(first) { return "de l'\(lower)" }
        return feminine ? "de la \(lower)" : "du \(lower)"
    }
}

/// The rendered bike with zoom, pan and direct component selection.
struct WorkshopStage: View {
    @Bindable var vm: WorkshopViewModel
    @State private var scale: CGFloat = 1
    @State private var baseScale: CGFloat = 1
    @State private var offset: CGSize = .zero
    @State private var baseOffset: CGSize = .zero

    var body: some View {
        ZStack {
            MFColor.neutralStage
            if let cg = vm.showsOriginal ? vm.originalImage : vm.image {
                Image(decorative: cg, scale: 1)
                    .resizable()
                    .scaledToFit()
                    .overlay {
                        GeometryReader { geo in
                            Color.clear.contentShape(Rectangle())
                                .onTapGesture(coordinateSpace: .local) { p in
                                    vm.select(at: NormalizedPoint(x: p.x / geo.size.width, y: p.y / geo.size.height))
                                }
                        }
                    }
                    .scaleEffect(scale)
                    .offset(offset)
                    .gesture(zoomAndPan)
                    .onTapGesture(count: 2) { withAnimation(.smooth) { scale = 1; baseScale = 1; offset = .zero; baseOffset = .zero } }
                    .accessibilityLabel(vm.showsOriginal ? "Moto, configuration d'origine" : "Moto personnalisée")
            } else {
                MissingVisualsView(vm: vm)
            }
            if let notice = vm.renderNotice {
                Text(notice)
                    .font(MFTypography.caption)
                    .padding(MFSpacing.xs)
                    .mfGlass(in: Capsule())
                    .frame(maxHeight: .infinity, alignment: .top)
                    .padding(.top, 52)
            }
        }
    }

    private var zoomAndPan: some Gesture {
        SimultaneousGesture(
            MagnifyGesture()
                .onChanged { scale = min(max(baseScale * $0.magnification, 1), 4) }
                .onEnded { _ in baseScale = scale },
            DragGesture()
                .onChanged { v in
                    guard scale > 1 else { return }
                    offset = CGSize(width: baseOffset.width + v.translation.width, height: baseOffset.height + v.translation.height)
                }
                .onEnded { _ in baseOffset = offset }
        )
    }
}

/// Shown until the licensed CB125R reference visuals and masks are integrated.
struct MissingVisualsView: View {
    let vm: WorkshopViewModel
    var body: some View {
        VStack(spacing: MFSpacing.s) {
            if let m = vm.selectedMaterial {
                MFFinishSample(effect: m.effect, color: m.baseColor.rgb.swiftUIColor, secondary: m.parameters.secondaryColor?.swiftUIColor)
                    .frame(width: 120, height: 80)
                Text("\(vm.selectedComponent?.displayName ?? "") · \(m.baseColor.name) · \(m.effect.localizedName)")
                    .font(MFTypography.caption.weight(.semibold))
                    .foregroundStyle(MFColor.textPrimary)
            } else {
                Image(systemName: "motorcycle").font(.system(size: 48, weight: .light)).foregroundStyle(MFColor.textSecondary)
            }
            Text("Visuels de référence de la CB125R en cours d'intégration.\nVos choix sont enregistrés et s'afficheront sur la moto.")
                .font(MFTypography.caption)
                .multilineTextAlignment(.center)
                .foregroundStyle(MFColor.textSecondary)
        }
        .padding(.horizontal, MFSpacing.l)
        .padding(.bottom, 80)
    }
}

/// « Configurer »: every element, modes, history, budget links.
private struct ConfigurePanel: View {
    @Environment(AppRouter.self) private var router
    @Bindable var vm: WorkshopViewModel
    let openStudio: () -> Void
    let openCovering: () -> Void
    @State private var confirmReset = false

    var body: some View {
        VStack(alignment: .leading, spacing: MFSpacing.l) {
            VStack(alignment: .leading, spacing: MFSpacing.s) {
                MFSectionHeader("Éléments")
                MFCard(padding: 0) {
                    VStack(spacing: 0) {
                        ForEach(vm.components) { c in
                            Button {
                                vm.selectedComponentID = c.id
                                openStudio()
                            } label: {
                                componentRow(c)
                            }
                            .buttonStyle(.plain)
                            if c.id != vm.components.last?.id { Divider().padding(.leading, MFSpacing.m) }
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: MFSpacing.s) {
                MFSectionHeader("Modes")
                modeRow("Peinture", "paintbrush", available: true) { openStudio() }
                modeRow("Covering", "square.on.square.dashed", available: true) { openCovering() }
                modeRow("Accessoires", "cube", available: true) { router.openCatalog() }
                modeRow("Détails", "sparkles", available: false) {}
            }

            if let id = vm.project?.id {
                HStack(spacing: MFSpacing.s) {
                    Button("Budget") { router.open(.budget(id)) }.buttonStyle(.mfSecondary)
                    Button("Liste d'achat") { router.open(.shoppingList(id)) }.buttonStyle(.mfSecondary)
                }
            }

            VStack(alignment: .leading, spacing: MFSpacing.s) {
                MFSectionHeader("Historique des modifications")
                if vm.changeLog.isEmpty {
                    Text("Aucune modification dans cette session.").font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
                } else {
                    ForEach(Array(vm.changeLog.enumerated().reversed()), id: \.offset) { _, label in
                        Label(label, systemImage: "clock.arrow.circlepath").font(MFTypography.callout)
                    }
                }
                Button("Revenir à l'origine", role: .destructive) { confirmReset = true }
                    .buttonStyle(.mfSecondary)
                    .confirmationDialog("Revenir à la configuration d'origine ?", isPresented: $confirmReset, titleVisibility: .visible) {
                        Button("Revenir à l'origine", role: .destructive) { vm.resetAll() }
                    } message: {
                        Text("Vous pourrez annuler avec le bouton Annuler.")
                    }
            }
        }
    }

    private func componentRow(_ c: MotorcycleComponent) -> some View {
        HStack(spacing: MFSpacing.s) {
            styleSwatch(c.id).frame(width: 28, height: 20)
            Text(c.displayName).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
            Spacer()
            if vm.isModified(c.id) {
                Text("Modifié").font(MFTypography.caption).foregroundStyle(MFColor.accent)
            } else {
                Text("Origine").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            }
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(MFColor.textSecondary)
        }
        .padding(.horizontal, MFSpacing.m)
        .padding(.vertical, MFSpacing.s)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private func styleSwatch(_ id: MotorcycleComponent.ID) -> some View {
        if case .paint(let m)? = vm.editor?.effectiveStyle(of: id) {
            MFFinishSample(effect: m.effect, color: m.baseColor.rgb.swiftUIColor)
        } else {
            RoundedRectangle(cornerRadius: 4).stroke(MFColor.separator, style: StrokeStyle(lineWidth: 1, dash: [3]))
        }
    }

    private func modeRow(_ title: String, _ symbol: String, available: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            MFCard {
                HStack {
                    Label(title, systemImage: symbol).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                    Spacer()
                    if available { Image(systemName: "chevron.right").foregroundStyle(MFColor.textSecondary) } else { MFBadge(.comingSoon) }
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!available)
    }
}
