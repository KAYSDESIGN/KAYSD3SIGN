import SwiftUI
import MFDomain
import MFDesignSystem

/// Ajout de moto (§6): marque → modèle → génération → version → année → coloris d'origine.
/// Designed with the mockups' pills, chips and white cards.
struct AddMotorcycleView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    @State private var brandID: MotorcycleBrand.ID?
    @State private var modelID: MotorcycleModel.ID?
    @State private var generationID: MotorcycleGeneration.ID?
    @State private var variantID: MotorcycleVariant.ID?
    @State private var colorwayID: OriginalColorway.ID?
    @State private var year: Int?
    @State private var mileage = ""
    @State private var isSaving = false

    var body: some View {
        let catalog = model.catalog
        let models = catalog?.models.filter { $0.brandID == brandID } ?? []
        let generations = catalog?.generations.filter { $0.modelID == modelID } ?? []
        let generation = generations.first { $0.id == generationID }
        let variants = catalog?.variants.filter { $0.generationID == generationID } ?? []
        let variant = variants.first { $0.id == variantID }

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: MFSpacing.m) {
                    step(1, "Marque") {
                        chips(catalog?.brands ?? [], selected: brandID, title: \.name) { brandID = $0.id; modelID = nil; generationID = nil; variantID = nil; colorwayID = nil }
                    }
                    if brandID != nil {
                        step(2, "Modèle") {
                            chips(models, selected: modelID, title: \.name) { modelID = $0.id; generationID = nil; variantID = nil; colorwayID = nil }
                        }
                    }
                    if modelID != nil {
                        step(3, "Génération") {
                            ForEach(generations) { g in
                                selectCard(isSelected: g.id == generationID, title: g.code,
                                           subtitle: years(g), verified: g.verification.isTrustworthy) {
                                    generationID = g.id; variantID = nil; colorwayID = nil
                                    if let y = year, !g.covers(year: y) { year = nil }
                                }
                            }
                        }
                    }
                    if generationID != nil {
                        step(4, "Version") {
                            ForEach(variants) { v in
                                selectCard(isSelected: v.id == variantID, title: v.versionName,
                                           subtitle: v.verification.source, verified: v.verification.isTrustworthy) {
                                    variantID = v.id; colorwayID = nil
                                }
                            }
                        }
                    }
                    if let variant {
                        step(5, "Année") {
                            let range = (generation?.firstYear ?? 2021)...(generation?.lastYear ?? Calendar.current.component(.year, from: Date()))
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: MFSpacing.xs) {
                                    ForEach(Array(range), id: \.self) { y in MFChip(String(y), isSelected: year == y) { year = y } }
                                    MFChip("Je ne sais pas", isSelected: year == nil) { year = nil }
                                }
                            }
                        }
                        step(6, "Coloris d'origine") {
                            ForEach(variant.colorways) { c in
                                selectCard(isSelected: c.id == colorwayID, title: c.name, subtitle: nil, verified: c.verification.isTrustworthy) {
                                    colorwayID = c.id
                                }
                            }
                            selectCard(isSelected: colorwayID == nil, title: "Je ne sais pas", subtitle: nil, verified: false) { colorwayID = nil }
                        }
                        step(7, "Kilométrage") {
                            HStack {
                                Image(systemName: "gauge.with.dots.needle.33percent").foregroundStyle(MFColor.textSecondary)
                                TextField("Facultatif", text: $mileage).keyboardType(.numberPad)
                                Text("km").foregroundStyle(MFColor.textSecondary)
                            }
                            .padding(.horizontal, MFSpacing.m)
                            .padding(.vertical, MFSpacing.s)
                            .background(MFColor.background, in: Capsule())
                        }
                    }
                }
                .padding(.horizontal, MFSpacing.screen)
                .padding(.bottom, 90)
            }
            .background(MFColor.background.ignoresSafeArea())
            .safeAreaInset(edge: .bottom) {
                MFWideButton("Ajouter au garage", systemImage: "plus") { save() }
                    .disabled(variantID == nil || isSaving)
                    .opacity(variantID == nil ? 0.5 : 1)
                    .padding(.horizontal, MFSpacing.screen)
                    .padding(.bottom, MFSpacing.s)
                    .accessibilityIdentifier("addMotorcycle.confirm")
            }
            .navigationTitle("Ajouter une moto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } } }
            .onAppear(perform: preselectSingleChoices)
        }
    }

    // MARK: Building blocks

    private func step<Content: View>(_ n: Int, _ title: String, @ViewBuilder content: () -> Content) -> some View {
        MFPanel {
            HStack(spacing: MFSpacing.xs) {
                Text("\(n)").font(MFTypography.captionEmphasized).foregroundStyle(.white)
                    .frame(width: 22, height: 22).background(MFColor.accent, in: Circle())
                MFSectionHeader(title)
            }
            content()
        }
    }

    private func chips<T: Identifiable>(_ items: [T], selected: T.ID?, title: KeyPath<T, String>, pick: @escaping (T) -> Void) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: MFSpacing.xs) {
                ForEach(items) { item in MFChip(item[keyPath: title], isSelected: item.id == selected) { pick(item) } }
            }
        }
    }

    private func selectCard(isSelected: Bool, title: String, subtitle: String?, verified: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: MFSpacing.s) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3).foregroundStyle(isSelected ? MFColor.accent : MFColor.textSecondary)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(MFTypography.callout.weight(.semibold)).foregroundStyle(MFColor.textPrimary)
                    if let subtitle { Text(subtitle).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary).lineLimit(2) }
                }
                Spacer(minLength: 0)
                if verified { Image(systemName: "checkmark.seal").foregroundStyle(MFColor.accent).accessibilityLabel("Vérifié") }
            }
            .padding(MFSpacing.s)
            .background(isSelected ? MFColor.accentSoft : MFColor.background, in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    private func years(_ g: MotorcycleGeneration) -> String {
        guard let first = g.firstYear else { return "Années non documentées" }
        return "\(first) – \(g.lastYear.map(String.init) ?? "aujourd'hui")"
    }

    // MARK: Logic

    private func preselectSingleChoices() {
        guard let c = model.catalog, c.brands.count == 1, c.models.count == 1, c.generations.count == 1, let first = c.variants.first else { return }
        brandID = c.brands[0].id
        modelID = c.models[0].id
        generationID = c.generations[0].id
        variantID = first.id
    }

    private func save() {
        guard let variantID else { return }
        isSaving = true
        let bike = OwnedMotorcycle(variantID: variantID, originalColorwayID: colorwayID, year: year,
                                   mileageKm: Int(mileage.filter(\.isNumber)))
        Task {
            await model.addMotorcycle(bike)
            dismiss()
        }
    }
}
