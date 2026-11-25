import SwiftUI
import PhotosUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Advanced paint studio (§8): full chromatic picker, HEX/RGB/HSB, references, favorites, history,
/// photo sampling, all finishes with honest availability, advanced parameters, bi-color.
struct PaintStudioView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let vm: WorkshopViewModel

    @State private var color: RGBColor = .white
    @State private var effect: PaintEffect = .gloss
    @State private var params = MaterialParameters()
    @State private var hex = ""
    @State private var isBicolor = false
    @State private var secondColor: RGBColor = .black
    @State private var photoItem: PhotosPickerItem?
    @State private var photo: UIImage?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: MFSpacing.m) {
                    stage
                    colorPanel
                    channelsPanel
                    memoryPanel
                    referencesPanel
                    photoPanel
                    effectPanel
                    parametersPanel
                    multicolorPanel
                }
                .padding(.horizontal, MFSpacing.screen)
                .padding(.bottom, 90)
            }
            .background(MFColor.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                MFWideButton("Appliquer la peinture", systemImage: "paintbrush.fill") { apply() }
                    .padding(.horizontal, MFSpacing.screen)
                    .padding(.bottom, MFSpacing.s)
            }
            .navigationTitle(vm.selectedComponent?.displayName ?? "Peinture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { vm.preview(nil); dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await model.updateFavorites { ColorMemory.toggleFavorite(color, in: &$0) } }
                    } label: {
                        Image(systemName: ColorMemory.isFavorite(color, in: model.favorites) ? "star.fill" : "star")
                    }
                    .accessibilityLabel(ColorMemory.isFavorite(color, in: model.favorites) ? "Retirer des couleurs favorites" : "Ajouter aux couleurs favorites")
                }
            }
            .onAppear(perform: loadCurrent)
            .onChange(of: photoItem) { loadPhoto() }
            .onChange(of: draft) { vm.preview(.paint(draft)) }
        }
    }

    /// Material being edited (live preview on the bike).
    private var draft: MFDomain.Material {
        var p = params
        p.gradientStops = isBicolor ? [GradientStop(position: 0, color: color), GradientStop(position: 1, color: secondColor)] : []
        let existing = vm.selectedMaterial?.baseColor
        let paint = existing?.rgb.hexString == color.hexString ? existing! : PaintColor(id: Identifier("custom.\(color.hexString)"), name: color.hexString, rgb: color)
        return MFDomain.Material(baseColor: paint, effect: effect, parameters: p)
    }

    // MARK: Panels

    private var stage: some View {
        ZStack(alignment: .bottomLeading) {
            WorkshopStage(vm: vm)
                .frame(height: 230)
                .clipShape(RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
            HStack(spacing: MFSpacing.xs) {
                MFFinishSample(effect: effect, color: color.adjusted(by: params).swiftUIColor, secondary: params.secondaryColor?.swiftUIColor)
                    .frame(width: 44, height: 30)
                VStack(alignment: .leading, spacing: 0) {
                    Text(color.hexString).font(MFTypography.captionEmphasized.monospaced())
                    Text(effect.localizedName).font(MFTypography.caption)
                }
                if effect.isLightingSimulation { MFBadge(.simulation) }
            }
            .padding(MFSpacing.xs)
            .mfGlass(in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
            .padding(MFSpacing.s)
        }
    }

    private var colorPanel: some View {
        MFPanel("Couleur", trailing: AnyView(
            ColorPicker("Sélecteur chromatique", selection: Binding(get: { color.swiftUIColor }, set: { set($0.rgbColor) }), supportsOpacity: false)
                .labelsHidden()
        )) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: MFSpacing.xs), count: 6), spacing: MFSpacing.s) {
                ForEach(PaintPresets.quickColors) { c in
                    MFColorSwatch(color: c.rgb.swiftUIColor, name: c.name, isSelected: c.rgb.hexString == color.hexString) { set(c.rgb) }
                }
            }
            HStack(spacing: MFSpacing.xs) {
                Text("HEX").font(MFTypography.captionEmphasized).foregroundStyle(MFColor.textSecondary)
                TextField("#RRGGBB", text: $hex)
                    .font(MFTypography.body.monospaced())
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .onSubmit { if let c = RGBColor(hex: hex) { set(c) } else { hex = color.hexString } }
                    .padding(.horizontal, MFSpacing.s)
                    .padding(.vertical, MFSpacing.xs)
                    .background(MFColor.background, in: Capsule())
            }
        }
    }

    private var channelsPanel: some View {
        let hsb = color.hsb
        return MFPanel("RGB · HSB") {
            channel("Rouge", value: Binding(get: { color.red }, set: { set(RGBColor(red: $0, green: color.green, blue: color.blue)) }))
            channel("Vert", value: Binding(get: { color.green }, set: { set(RGBColor(red: color.red, green: $0, blue: color.blue)) }))
            channel("Bleu", value: Binding(get: { color.blue }, set: { set(RGBColor(red: color.red, green: color.green, blue: $0)) }))
            Divider()
            MFSliderRow("Teinte", value: Binding(get: { hsb.hue }, set: { set(RGBColor(hsb: HSBColor(hue: $0, saturation: hsb.saturation, brightness: hsb.brightness))) }),
                        in: 0...359, format: MFSliderRow.degrees)
            MFSliderRow("Saturation", value: Binding(get: { hsb.saturation }, set: { set(RGBColor(hsb: HSBColor(hue: hsb.hue, saturation: $0, brightness: hsb.brightness))) }),
                        in: 0...1, format: MFSliderRow.percent)
            MFSliderRow("Luminosité", value: Binding(get: { hsb.brightness }, set: { set(RGBColor(hsb: HSBColor(hue: hsb.hue, saturation: hsb.saturation, brightness: $0))) }),
                        in: 0...1, format: MFSliderRow.percent)
        }
    }

    private var memoryPanel: some View {
        MFPanel("Mes couleurs") {
            Text("Favorites").font(MFTypography.captionEmphasized).foregroundStyle(MFColor.textSecondary)
            if model.favorites.colors.isEmpty {
                Text("Touchez l'étoile en haut pour enregistrer une couleur.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            } else { swatchRow(model.favorites.colors) }
            Text("Historique").font(MFTypography.captionEmphasized).foregroundStyle(MFColor.textSecondary)
            if model.favorites.recentColors.isEmpty {
                Text("Les couleurs appliquées apparaîtront ici.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            } else { swatchRow(model.favorites.recentColors) }
        }
    }

    @ViewBuilder private var referencesPanel: some View {
        let refs = (model.catalog?.referenceColors ?? []).filter(\.isVerifiedReference)
        let originals = vm.vehicle?.colorways ?? []
        MFPanel("Références") {
            if !originals.isEmpty {
                Text("Coloris d'origine Honda").font(MFTypography.captionEmphasized).foregroundStyle(MFColor.textSecondary)
                ForEach(originals) { c in
                    HStack {
                        Text(c.name).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                        Spacer()
                        MFBadge(.verified)
                    }
                }
                Text("Honda ne publie pas de valeur numérique pour ces teintes : utilisez l'import photo pour en approcher une.")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            }
            if refs.isEmpty {
                HStack {
                    Text("Nuancier RAL").font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                    Spacer()
                    MFBadge(.comingSoon)
                }
                Text("Les valeurs RAL sont sous licence RAL gGmbH : elles seront affichées dès qu'une source autorisée sera intégrée.")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            } else {
                ForEach(refs) { ref in
                    Button { set(ref.rgb) } label: {
                        HStack {
                            Circle().fill(ref.rgb.swiftUIColor).frame(width: 22, height: 22)
                            Text(ref.name).foregroundStyle(MFColor.textPrimary)
                            Spacer()
                            MFBadge(.verified)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var photoPanel: some View {
        MFPanel("Couleur depuis une photo", trailing: AnyView(
            PhotosPicker(selection: $photoItem, matching: .images) {
                Label("Importer", systemImage: "eyedropper").font(MFTypography.caption.weight(.semibold))
            }
            .buttonStyle(.mfPrimary)
        )) {
            if let photo {
                PhotoSampler(image: photo) { set($0) }
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
                Text("Touchez la zone peinte. Reflets et ombres sont écartés autant que possible : le résultat reste une approximation.")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            } else {
                Text("Prenez la couleur d'une moto, d'un objet ou d'un nuancier photographié.")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            }
        }
    }

    private var effectPanel: some View {
        MFPanel("Finitions et effets") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: MFSpacing.xs), count: 4), spacing: MFSpacing.s) {
                ForEach(PaintEffect.allCases, id: \.self) { e in
                    VStack(spacing: 2) {
                        MFFinishCard(effect: e, color: color.swiftUIColor, isSelected: e == effect) {
                            effect = e
                            params = .defaults(for: e)
                        }
                        .disabled(e.renderAvailability == .planned)
                        .opacity(e.renderAvailability == .planned ? 0.45 : 1)
                        if e.renderAvailability == .planned {
                            Text("Bientôt").font(.system(.caption2)).foregroundStyle(MFColor.textSecondary)
                        } else if e.isLightingSimulation {
                            Text("Simulation").font(.system(.caption2)).foregroundStyle(MFColor.accent)
                        }
                    }
                }
            }
        }
    }

    private var parametersPanel: some View {
        MFPanel("Réglages avancés") {
            MFSliderRow("Teinte", value: $params.hueShiftDegrees, in: -180...180, format: MFSliderRow.degrees)
            MFSliderRow("Saturation", value: $params.saturation, in: 0...2, format: MFSliderRow.percent)
            MFSliderRow("Luminosité", value: $params.brightness, in: -1...1, format: MFSliderRow.percent)
            MFSliderRow("Brillance", value: $params.gloss, in: 0...1, format: MFSliderRow.percent)
            MFSliderRow("Rugosité", value: $params.roughness, in: 0...1, format: MFSliderRow.percent)
            if effect != .gloss && effect != .matte && effect != .satin {
                MFSliderRow("Intensité de l'effet", value: $params.effectIntensity, in: 0...1, format: MFSliderRow.percent)
            }
            if effect == .pearl {
                MFSliderRow("Intensité du nacrage", value: $params.pearlIntensity, in: 0...1, format: MFSliderRow.percent)
                HStack {
                    Text("Couleur secondaire").font(MFTypography.callout)
                    Spacer()
                    ColorPicker("Couleur secondaire", selection: Binding(get: { (params.secondaryColor ?? .white).swiftUIColor },
                                                                        set: { params.secondaryColor = $0.rgbColor }), supportsOpacity: false)
                        .labelsHidden()
                }
            }
            if effect.usesFlakes {
                MFSliderRow("Taille des paillettes", value: $params.flakeSize, in: 0...1, format: MFSliderRow.percent)
                MFSliderRow("Densité des paillettes", value: $params.flakeDensity, in: 0...1, format: MFSliderRow.percent)
            }
        }
    }

    private var multicolorPanel: some View {
        MFPanel("Bicolore", trailing: AnyView(Toggle("Bicolore", isOn: $isBicolor).labelsHidden().tint(MFColor.accent))) {
            if isBicolor {
                HStack {
                    Text("Seconde couleur").font(MFTypography.callout)
                    Spacer()
                    ColorPicker("Seconde couleur", selection: Binding(get: { secondColor.swiftUIColor }, set: { secondColor = $0.rgbColor }), supportsOpacity: false)
                        .labelsHidden()
                }
                MFSliderRow("Angle du dégradé", value: $params.gradientAngleDegrees, in: 0...359, format: MFSliderRow.degrees)
            } else {
                Text("Transition entre deux couleurs sur l'élément.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            }
        }
    }

    // MARK: Building blocks

    private func channel(_ label: String, value: Binding<Double>) -> some View {
        MFSliderRow(label, value: value, in: 0...1, format: { "\(Int(($0 * 255).rounded()))" })
    }

    private func swatchRow(_ colors: [RGBColor]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: MFSpacing.xs) {
                ForEach(colors, id: \.hexString) { c in
                    MFColorSwatch(color: c.swiftUIColor, name: c.hexString, isSelected: c.hexString == color.hexString) { set(c) }
                }
            }
        }
    }

    // MARK: Logic

    private func set(_ c: RGBColor) {
        color = c
        hex = c.hexString
    }

    private func loadCurrent() {
        guard let m = vm.selectedMaterial else { set(PaintPresets.quickColors[6].rgb); return }
        set(m.baseColor.rgb)
        effect = m.effect
        params = m.parameters
        if m.parameters.gradientStops.count >= 2, let last = m.parameters.gradientStops.last {
            isBicolor = true
            secondColor = last.color
        }
    }

    private func loadPhoto() {
        guard let photoItem else { return }
        Task {
            if let data = try? await photoItem.loadTransferable(type: Data.self), let image = UIImage(data: data) {
                photo = image
            } else {
                model.errorMessage = "Cette photo n'a pas pu être ouverte."
            }
        }
    }

    private func apply() {
        let material = draft
        vm.apply(material)
        Task { await model.updateFavorites { ColorMemory.pushRecent(material.baseColor.rgb, into: &$0) } }
        dismiss()
    }
}

/// Displays a photo; tapping samples a small area and returns a representative color.
private struct PhotoSampler: View {
    let image: UIImage
    let onPick: (RGBColor) -> Void
    @State private var marker: CGPoint?

    var body: some View {
        GeometryReader { geo in
            let fitted = fittedRect(image.size, in: geo.size)
            ZStack(alignment: .topLeading) {
                Image(uiImage: image).resizable().scaledToFit().frame(width: geo.size.width, height: geo.size.height)
                if let marker {
                    Circle().stroke(.white, lineWidth: 2).frame(width: 22, height: 22).position(marker).shadow(radius: 2)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture(coordinateSpace: .local) { p in
                guard fitted.contains(p) else { return }
                marker = p
                let nx = (p.x - fitted.minX) / fitted.width, ny = (p.y - fitted.minY) / fitted.height
                if let c = sample(at: CGPoint(x: nx, y: ny)) { onPick(c) }
            }
        }
        .accessibilityLabel("Photo importée. Touchez une zone pour en extraire la couleur.")
    }

    private func fittedRect(_ size: CGSize, in box: CGSize) -> CGRect {
        let s = min(box.width / size.width, box.height / size.height)
        let w = size.width * s, h = size.height * s
        return CGRect(x: (box.width - w) / 2, y: (box.height - h) / 2, width: w, height: h)
    }

    /// Samples a 15 × 15 px patch around the normalized point.
    private func sample(at p: CGPoint) -> RGBColor? {
        guard let cg = normalizedCGImage() else { return nil }
        let side = 15
        let cx = Int(p.x * CGFloat(cg.width)), cy = Int(p.y * CGFloat(cg.height))
        let rect = CGRect(x: max(cx - side / 2, 0), y: max(cy - side / 2, 0), width: side, height: side)
            .intersection(CGRect(x: 0, y: 0, width: cg.width, height: cg.height))
        guard let crop = cg.cropping(to: rect) else { return nil }
        var pixels = [UInt8](repeating: 0, count: crop.width * crop.height * 4)
        let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let ctx = CGContext(data: buffer.baseAddress, width: crop.width, height: crop.height, bitsPerComponent: 8,
                                      bytesPerRow: crop.width * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.draw(crop, in: CGRect(x: 0, y: 0, width: crop.width, height: crop.height))
            return true
        }
        return drawn ? ColorSampler.representativeColor(rgba: pixels) : nil
    }

    /// Applies EXIF orientation so pixel coordinates match what is displayed.
    private func normalizedCGImage() -> CGImage? {
        if image.imageOrientation == .up { return image.cgImage }
        let renderer = UIGraphicsImageRenderer(size: image.size)
        return renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: image.size)) }.cgImage
    }
}
