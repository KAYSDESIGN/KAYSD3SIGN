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
            Form {
                previewSection
                colorSection
                rgbSection
                hsbSection
                memorySection
                referencesSection
                photoSection
                effectSection
                parametersSection
                multicolorSection
            }
            .navigationTitle(vm.selectedComponent?.displayName ?? "Peinture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Appliquer") { apply() } }
            }
            .onAppear(perform: loadCurrent)
            .onChange(of: photoItem) { loadPhoto() }
        }
    }

    // MARK: Sections

    private var previewSection: some View {
        Section {
            HStack(spacing: MFSpacing.m) {
                MFFinishSample(effect: effect, color: color.adjusted(by: params).swiftUIColor, secondary: params.secondaryColor?.swiftUIColor)
                    .frame(width: 96, height: 64)
                VStack(alignment: .leading, spacing: MFSpacing.xxs) {
                    Text(color.hexString).font(MFTypography.headline.monospaced())
                    Text(effect.localizedName).font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
                    if effect.isLightingSimulation { MFBadge(.simulation) }
                }
                Spacer()
                Button {
                    Task { await model.updateFavorites { ColorMemory.toggleFavorite(color, in: &$0) } }
                } label: {
                    Image(systemName: ColorMemory.isFavorite(color, in: model.favorites) ? "star.fill" : "star")
                }
                .buttonStyle(.plain)
                .foregroundStyle(MFColor.accent)
                .accessibilityLabel(ColorMemory.isFavorite(color, in: model.favorites) ? "Retirer des couleurs favorites" : "Ajouter aux couleurs favorites")
            }
        } footer: {
            Text("Échantillon illustratif. Le rendu sur la moto conserve les ombres et reflets de la photo.")
        }
    }

    private var colorSection: some View {
        Section("Couleur") {
            ColorPicker("Sélecteur chromatique", selection: Binding(get: { color.swiftUIColor }, set: { set($0.rgbColor) }), supportsOpacity: false)
            HStack {
                Text("HEX")
                TextField("#RRGGBB", text: $hex)
                    .font(MFTypography.body.monospaced())
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .multilineTextAlignment(.trailing)
                    .onSubmit { if let c = RGBColor(hex: hex) { set(c) } else { hex = color.hexString } }
            }
        }
    }

    private var rgbSection: some View {
        Section("RGB") {
            channel("Rouge", value: Binding(get: { color.red }, set: { set(RGBColor(red: $0, green: color.green, blue: color.blue)) }))
            channel("Vert", value: Binding(get: { color.green }, set: { set(RGBColor(red: color.red, green: $0, blue: color.blue)) }))
            channel("Bleu", value: Binding(get: { color.blue }, set: { set(RGBColor(red: color.red, green: color.green, blue: $0)) }))
        }
    }

    private var hsbSection: some View {
        let hsb = color.hsb
        return Section("HSB") {
            slider("Teinte", value: Binding(get: { hsb.hue }, set: { set(RGBColor(hsb: HSBColor(hue: $0, saturation: hsb.saturation, brightness: hsb.brightness))) }),
                   range: 0...359, format: { "\(Int($0))°" })
            slider("Saturation", value: Binding(get: { hsb.saturation }, set: { set(RGBColor(hsb: HSBColor(hue: hsb.hue, saturation: $0, brightness: hsb.brightness))) }),
                   range: 0...1, format: percent)
            slider("Luminosité", value: Binding(get: { hsb.brightness }, set: { set(RGBColor(hsb: HSBColor(hue: hsb.hue, saturation: hsb.saturation, brightness: $0))) }),
                   range: 0...1, format: percent)
        }
    }

    @ViewBuilder private var memorySection: some View {
        Section("Favorites") {
            if model.favorites.colors.isEmpty {
                Text("Touchez l'étoile pour enregistrer une couleur.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            } else {
                swatchRow(model.favorites.colors)
            }
        }
        Section("Historique") {
            if model.favorites.recentColors.isEmpty {
                Text("Les couleurs appliquées apparaîtront ici.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            } else {
                swatchRow(model.favorites.recentColors)
            }
        }
    }

    @ViewBuilder private var referencesSection: some View {
        let refs = (model.catalog?.referenceColors ?? []).filter(\.isVerifiedReference)
        Section {
            if refs.isEmpty {
                HStack {
                    Text("RAL et couleurs constructeur")
                    Spacer()
                    MFBadge(.comingSoon)
                }
            } else {
                ForEach(refs) { ref in
                    Button { set(ref.rgb) } label: {
                        HStack {
                            Circle().fill(ref.rgb.swiftUIColor).frame(width: 22, height: 22)
                            Text(ref.name)
                            Spacer()
                            MFBadge(.verified)
                        }
                    }
                    .foregroundStyle(MFColor.textPrimary)
                }
            }
        } header: {
            Text("Références")
        } footer: {
            if refs.isEmpty { Text("Les teintes de référence ne seront affichées qu'avec une source autorisée et vérifiée.") }
        }
    }

    private var photoSection: some View {
        Section {
            PhotosPicker(selection: $photoItem, matching: .images) {
                Label("Importer une couleur depuis une photo", systemImage: "eyedropper")
            }
            if let photo {
                PhotoSampler(image: photo) { set($0) }
                    .frame(height: 200)
            }
        } footer: {
            if photo != nil { Text("Touchez la zone peinte. Les reflets et ombres sont ignorés autant que possible : la couleur obtenue reste une approximation.") }
        }
    }

    private var effectSection: some View {
        Section("Finitions et effets") {
            ForEach(PaintEffect.allCases, id: \.self) { e in
                Button {
                    effect = e
                    params = .defaults(for: e)
                } label: {
                    HStack {
                        MFFinishSample(effect: e, color: color.swiftUIColor).frame(width: 36, height: 24)
                        Text(e.localizedName).foregroundStyle(MFColor.textPrimary)
                        Spacer()
                        if e.renderAvailability == .planned {
                            MFBadge(.comingSoon)
                        } else if e.isLightingSimulation {
                            MFBadge(.simulation)
                        }
                        if e == effect { Image(systemName: "checkmark").foregroundStyle(MFColor.accent) }
                    }
                }
                .disabled(e.renderAvailability == .planned)
                .accessibilityAddTraits(e == effect ? .isSelected : [])
            }
        }
    }

    private var parametersSection: some View {
        Section("Réglages avancés") {
            slider("Teinte", value: $params.hueShiftDegrees, range: -180...180, format: { "\(Int($0))°" })
            slider("Saturation", value: $params.saturation, range: 0...2, format: percent)
            slider("Luminosité", value: $params.brightness, range: -1...1, format: percent)
            slider("Brillance", value: $params.gloss, range: 0...1, format: percent)
            slider("Rugosité", value: $params.roughness, range: 0...1, format: percent)
            if effect != .gloss && effect != .matte && effect != .satin {
                slider("Intensité de l'effet", value: $params.effectIntensity, range: 0...1, format: percent)
            }
            if effect == .pearl {
                slider("Intensité du nacrage", value: $params.pearlIntensity, range: 0...1, format: percent)
                ColorPicker("Couleur secondaire", selection: Binding(get: { (params.secondaryColor ?? .white).swiftUIColor },
                                                                    set: { params.secondaryColor = $0.rgbColor }), supportsOpacity: false)
            }
            if effect.usesFlakes {
                slider("Taille des paillettes", value: $params.flakeSize, range: 0...1, format: percent)
                slider("Densité des paillettes", value: $params.flakeDensity, range: 0...1, format: percent)
            }
        }
    }

    private var multicolorSection: some View {
        Section {
            Toggle("Peinture bicolore", isOn: $isBicolor)
            if isBicolor {
                ColorPicker("Seconde couleur", selection: Binding(get: { secondColor.swiftUIColor }, set: { secondColor = $0.rgbColor }), supportsOpacity: false)
                slider("Angle du dégradé", value: $params.gradientAngleDegrees, range: 0...359, format: { "\(Int($0))°" })
            }
        } header: {
            Text("Multicolore")
        } footer: {
            Text("Transition entre deux couleurs sur l'élément. Plus de deux teintes : bientôt disponible.")
        }
    }

    // MARK: Building blocks

    private func channel(_ label: String, value: Binding<Double>) -> some View {
        slider(label, value: value, range: 0...1, format: { "\(Int(($0 * 255).rounded()))" })
    }

    private func slider(_ label: String, value: Binding<Double>, range: ClosedRange<Double>, format: @escaping (Double) -> String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(label)
                Spacer()
                Text(format(value.wrappedValue)).font(MFTypography.callout.monospacedDigit()).foregroundStyle(MFColor.textSecondary)
            }
            Slider(value: value, in: range).accessibilityLabel(label).accessibilityValue(format(value.wrappedValue))
        }
    }

    private let percent: (Double) -> String = { "\(Int(($0 * 100).rounded())) %" }

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
        var p = params
        p.gradientStops = isBicolor ? [GradientStop(position: 0, color: color), GradientStop(position: 1, color: secondColor)] : []
        let existing = vm.selectedMaterial?.baseColor
        let paint = existing?.rgb.hexString == color.hexString ? existing! : PaintColor.custom(color)
        vm.apply(MFDomain.Material(baseColor: paint, effect: effect, parameters: p))
        Task { await model.updateFavorites { ColorMemory.pushRecent(color, into: &$0) } }
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
