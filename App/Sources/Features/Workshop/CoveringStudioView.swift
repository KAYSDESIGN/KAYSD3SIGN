import SwiftUI
import PhotosUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Studio covering (§9): full or partial wrap built from stacked layers — films, gradients, stripes,
/// geometric patterns, stickers, imported logos and textures — each movable, rotatable and scalable.
/// Changes preview live on the bike and are recorded in history only when applied.
struct CoveringStudioView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Bindable var vm: WorkshopViewModel

    @State private var wrap = WrapDesign()
    @State private var selectedLayerID: WrapLayer.ID?
    @State private var photoItem: PhotosPickerItem?
    @State private var importAsTexture = false
    @State private var showStickers = false

    private var selectedIndex: Int? { wrap.layers.firstIndex { $0.id == selectedLayerID } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: MFSpacing.m) {
                    WorkshopStage(vm: vm)
                        .frame(height: 250)
                        .clipShape(RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
                    MFSegmentedControl([(WrapDesign.Coverage.full, "Covering intégral"), (.partial, "Covering partiel")],
                                       selection: $wrap.coverage)
                    layersPanel
                    if let i = selectedIndex { LayerEditor(layer: $wrap.layers[i], partial: wrap.coverage == .partial) }
                    HStack(spacing: MFSpacing.xs) {
                        Image(systemName: "shippingbox").foregroundStyle(MFColor.textSecondary)
                        Text("Références de films de fabricants (3M, Avery…)").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                        Spacer()
                        MFBadge(.comingSoon)
                    }
                    .padding(.horizontal, MFSpacing.xs)
                }
                .padding(.horizontal, MFSpacing.screen)
                .padding(.bottom, 90)
            }
            .background(MFColor.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                MFWideButton("Appliquer le covering", systemImage: "checkmark") {
                    vm.apply(wrap: wrap)
                    dismiss()
                }
                .disabled(wrap.layers.isEmpty)
                .opacity(wrap.layers.isEmpty ? 0.5 : 1)
                .padding(.horizontal, MFSpacing.screen)
                .padding(.bottom, MFSpacing.s)
            }
            .navigationTitle("Covering · \(vm.selectedComponent?.displayName ?? "")")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annuler") { vm.preview(nil); dismiss() }
                }
            }
            .onAppear {
                if let existing = vm.selectedWrap { wrap = existing; selectedLayerID = existing.layers.last?.id }
            }
            .onChange(of: wrap) { vm.preview(wrap.layers.isEmpty ? nil : .wrap(wrap)) }
            .onChange(of: photoItem) { importPhoto() }
            .sheet(isPresented: $showStickers) { stickerPicker }
        }
    }

    // MARK: Layers

    private var layersPanel: some View {
        MFPanel("Calques", trailing: AnyView(addMenu)) {
            if wrap.layers.isEmpty {
                Text("Ajoutez un film, un dégradé, des bandes, un motif, un sticker ou votre logo.")
                    .font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: MFSpacing.xs) {
                        ForEach(wrap.layers.reversed()) { layer in
                            MFChip(Self.title(of: layer), isSelected: layer.id == selectedLayerID) { selectedLayerID = layer.id }
                                .contextMenu {
                                    Button { move(layer.id, by: 1) } label: { Label("Monter", systemImage: "arrow.up") }
                                    Button { move(layer.id, by: -1) } label: { Label("Descendre", systemImage: "arrow.down") }
                                    Button(role: .destructive) { remove(layer.id) } label: { Label("Supprimer", systemImage: "trash") }
                                }
                        }
                    }
                }
                if let id = selectedLayerID {
                    HStack(spacing: MFSpacing.xs) {
                        Button { move(id, by: 1) } label: { Label("Monter", systemImage: "arrow.up") }.buttonStyle(.mfSecondary)
                        Button { move(id, by: -1) } label: { Label("Descendre", systemImage: "arrow.down") }.buttonStyle(.mfSecondary)
                        Spacer()
                        MFIconButton("trash", label: "Supprimer le calque") { remove(id) }
                    }
                    .font(MFTypography.caption)
                }
            }
        }
    }

    private var addMenu: some View {
        Menu {
            Button { add(.film(material: MFDomain.Material(baseColor: PaintPresets.quickColors[3], effect: .matte), product: nil)) } label: {
                Label("Film uni", systemImage: "square.fill")
            }
            Button { add(.gradient(stops: [GradientStop(position: 0, color: PaintPresets.quickColors[6].rgb),
                                           GradientStop(position: 1, color: PaintPresets.quickColors[4].rgb)], angleDegrees: 0)) } label: {
                Label("Dégradé", systemImage: "circle.lefthalf.filled")
            }
            Button { add(.stripe(color: .white, widthRatio: 0.08, count: 2, spacingRatio: 0.05)) } label: {
                Label("Bandes décoratives", systemImage: "line.3.horizontal")
            }
            Button { add(.geometricPattern(name: "checker", primary: .black, secondary: .white)) } label: {
                Label("Motif géométrique", systemImage: "checkerboard.rectangle")
            }
            Button { showStickers = true } label: { Label("Sticker", systemImage: "star.square") }
            PhotosPicker(selection: Binding(get: { photoItem }, set: { importAsTexture = false; photoItem = $0 }), matching: .images) {
                Label("Importer un logo", systemImage: "photo.badge.plus")
            }
            PhotosPicker(selection: Binding(get: { photoItem }, set: { importAsTexture = true; photoItem = $0 }), matching: .images) {
                Label("Importer une texture", systemImage: "photo.stack")
            }
        } label: {
            Label("Ajouter", systemImage: "plus")
                .font(MFTypography.caption.weight(.semibold))
        }
        .buttonStyle(.mfPrimary)
    }

    private var stickerPicker: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: MFSpacing.s), count: 3), spacing: MFSpacing.s) {
                    ForEach(WrapPresets.stickers) { sticker in
                        Button {
                            add(.sticker(assetName: sticker.assetName), scale: 0.3)
                            showStickers = false
                        } label: {
                            VStack(spacing: MFSpacing.xxs) {
                                Image(sticker.assetName).resizable().scaledToFit().frame(height: 64)
                                    .padding(MFSpacing.s)
                                    .frame(maxWidth: .infinity)
                                    .background(MFColor.graphite, in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
                                Text(sticker.name).font(MFTypography.caption).foregroundStyle(MFColor.textPrimary)
                            }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(sticker.name)
                    }
                }
                .padding(MFSpacing.screen)
            }
            .background(MFColor.background)
            .navigationTitle("Stickers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { showStickers = false } }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: Logic

    private func add(_ content: WrapLayer.Content, scale: Double = 1) {
        let center = componentCenter()
        let layer = WrapLayer(content: content, placement: Placement(position: center, scale: scale))
        wrap.layers.append(layer)
        selectedLayerID = layer.id
    }

    /// Default placement: centre of the selected component in the current view.
    private func componentCenter() -> NormalizedPoint {
        guard let id = vm.selectedComponentID, let mask = vm.vehicle?.view(for: vm.angle)?.mask(for: id) else { return .center }
        return NormalizedPoint(x: mask.bounds.x + mask.bounds.width / 2, y: mask.bounds.y + mask.bounds.height / 2)
    }

    private func move(_ id: WrapLayer.ID, by delta: Int) {
        guard let i = wrap.layers.firstIndex(where: { $0.id == id }) else { return }
        let j = i + delta
        guard wrap.layers.indices.contains(j) else { return }
        wrap.layers.swapAt(i, j)
    }

    private func remove(_ id: WrapLayer.ID) {
        wrap.layers.removeAll { $0.id == id }
        selectedLayerID = wrap.layers.last?.id
    }

    private func importPhoto() {
        guard let item = photoItem else { return }
        let texture = importAsTexture
        Task {
            guard let data = try? await item.loadTransferable(type: Data.self),
                  let name = try? UserWrapImages.store(data) else {
                model.errorMessage = "Cette image n'a pas pu être importée."
                return
            }
            add(.userImage(localFileName: name, isTexture: texture), scale: texture ? 0.25 : 0.35)
            photoItem = nil
        }
    }

    static func title(of layer: WrapLayer) -> String {
        switch layer.content {
        case .film: "Film"
        case .gradient: "Dégradé"
        case .stripe: "Bandes"
        case .geometricPattern: "Motif"
        case .sticker(let name): WrapPresets.stickers.first { $0.assetName == name }?.name ?? "Sticker"
        case .userImage(_, let texture): texture ? "Texture" : "Logo"
        }
    }
}

/// Editor of one layer: content settings + transform (position, size, rotation, opacity) + partial zone.
private struct LayerEditor: View {
    @Binding var layer: WrapLayer
    let partial: Bool

    var body: some View {
        VStack(spacing: MFSpacing.m) {
            MFPanel(CoveringStudioView.title(of: layer)) { contentControls }
            MFPanel("Position et taille") {
                MFSliderRow("Horizontal", value: $layer.placement.position.x, in: 0...1, format: MFSliderRow.percent)
                MFSliderRow("Vertical", value: $layer.placement.position.y, in: 0...1, format: MFSliderRow.percent)
                MFSliderRow("Taille", value: $layer.placement.scale, in: 0.05...3, format: MFSliderRow.percent)
                MFSliderRow("Rotation", value: $layer.placement.rotationDegrees, in: -180...180, format: MFSliderRow.degrees)
                MFSliderRow("Opacité", value: Binding(get: { layer.opacity }, set: { layer.opacity = $0 }), in: 0.1...1, format: MFSliderRow.percent)
            }
            if partial {
                MFPanel("Zone couverte") {
                    MFSliderRow("Début horizontal", value: $layer.region.x, in: 0...0.95, format: MFSliderRow.percent)
                    MFSliderRow("Largeur", value: $layer.region.width, in: 0.05...1, format: MFSliderRow.percent)
                    MFSliderRow("Début vertical", value: $layer.region.y, in: 0...0.95, format: MFSliderRow.percent)
                    MFSliderRow("Hauteur", value: $layer.region.height, in: 0.05...1, format: MFSliderRow.percent)
                }
            }
        }
    }

    @ViewBuilder private var contentControls: some View {
        switch layer.content {
        case .film(let material, let product):
            colorRow("Couleur du film", material.baseColor.rgb) { layer.content = .film(material: MFDomain.Material(baseColor: .custom($0), effect: material.effect), product: product) }
            HStack(spacing: MFSpacing.xs) {
                ForEach(PaintPresets.quickEffects, id: \.self) { e in
                    MFFinishCard(effect: e, color: material.baseColor.rgb.swiftUIColor, isSelected: material.effect == e) {
                        layer.content = .film(material: MFDomain.Material(baseColor: material.baseColor, effect: e), product: product)
                    }
                }
            }
        case .gradient(let stops, let angle):
            colorRow("Couleur de départ", stops.first?.color ?? .white) { c in
                layer.content = .gradient(stops: [GradientStop(position: 0, color: c), stops.last ?? GradientStop(position: 1, color: .black)], angleDegrees: angle)
            }
            colorRow("Couleur d'arrivée", stops.last?.color ?? .black) { c in
                layer.content = .gradient(stops: [stops.first ?? GradientStop(position: 0, color: .white), GradientStop(position: 1, color: c)], angleDegrees: angle)
            }
            MFSliderRow("Angle du dégradé", value: Binding(get: { angle }, set: { layer.content = .gradient(stops: stops, angleDegrees: $0) }),
                        in: 0...359, format: MFSliderRow.degrees)
        case .stripe(let color, let width, let count, let spacing):
            colorRow("Couleur des bandes", color) { layer.content = .stripe(color: $0, widthRatio: width, count: count, spacingRatio: spacing) }
            Stepper("Nombre de bandes : \(count)", value: Binding(get: { count }, set: { layer.content = .stripe(color: color, widthRatio: width, count: $0, spacingRatio: spacing) }), in: 1...6)
                .font(MFTypography.callout)
            MFSliderRow("Épaisseur", value: Binding(get: { width }, set: { layer.content = .stripe(color: color, widthRatio: $0, count: count, spacingRatio: spacing) }),
                        in: 0.01...0.4, format: MFSliderRow.percent)
            MFSliderRow("Espacement", value: Binding(get: { spacing }, set: { layer.content = .stripe(color: color, widthRatio: width, count: count, spacingRatio: $0) }),
                        in: 0...0.3, format: MFSliderRow.percent)
        case .geometricPattern(let name, let primary, let secondary):
            HStack(spacing: MFSpacing.xs) {
                ForEach(WrapPresets.patterns, id: \.id) { p in
                    MFChip(p.name, isSelected: p.id == name) { layer.content = .geometricPattern(name: p.id, primary: primary, secondary: secondary) }
                }
            }
            colorRow("Couleur 1", primary) { layer.content = .geometricPattern(name: name, primary: $0, secondary: secondary) }
            colorRow("Couleur 2", secondary) { layer.content = .geometricPattern(name: name, primary: primary, secondary: $0) }
        case .sticker, .userImage:
            Text("Déplacez, tournez et redimensionnez avec les réglages ci-dessous.")
                .font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
        }
    }

    private func colorRow(_ title: String, _ color: RGBColor, set: @escaping (RGBColor) -> Void) -> some View {
        VStack(alignment: .leading, spacing: MFSpacing.xs) {
            HStack {
                Text(title).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                Spacer()
                ColorPicker(title, selection: Binding(get: { color.swiftUIColor }, set: { set($0.rgbColor) }), supportsOpacity: false)
                    .labelsHidden()
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: MFSpacing.xxs) {
                    ForEach(PaintPresets.quickColors) { c in
                        MFColorSwatch(color: c.rgb.swiftUIColor, name: c.name, isSelected: c.rgb.hexString == color.hexString) { set(c.rgb) }
                            .scaleEffect(0.8)
                    }
                }
            }
        }
    }
}

/// Stores images imported for coverings (logos, textures) in Application Support, offline.
enum UserWrapImages {
    static var directory: URL {
        let dir = URL.applicationSupportDirectory.appending(path: "Wraps", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// Re-encodes as PNG (keeps transparency, drops metadata) and returns the file name.
    static func store(_ data: Data) throws -> String {
        guard let image = UIImage(data: data), let png = image.pngData() else { throw CocoaError(.fileReadCorruptFile) }
        let name = UUID().uuidString.lowercased() + ".png"
        try png.write(to: directory.appending(path: name), options: .atomic)
        return name
    }

    static func url(_ name: String) -> URL { directory.appending(path: name) }
}
