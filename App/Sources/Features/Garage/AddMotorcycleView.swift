import SwiftUI
import MFDomain
import MFDesignSystem

/// Add a bike: brand → model → generation → version → year → original colorway (§6).
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
        let variants = catalog?.variants.filter { $0.generationID == generationID } ?? []
        let variant = variants.first { $0.id == variantID }

        NavigationStack {
            Form {
                Section {
                    Picker("Marque", selection: Binding(get: { brandID }, set: { brandID = $0; modelID = nil; generationID = nil; variantID = nil; colorwayID = nil })) {
                        Text("Choisir").tag(MotorcycleBrand.ID?.none)
                        ForEach(catalog?.brands ?? []) { Text($0.name).tag(Optional($0.id)) }
                    }
                    Picker("Modèle", selection: Binding(get: { modelID }, set: { modelID = $0; generationID = nil; variantID = nil; colorwayID = nil })) {
                        Text("Choisir").tag(MotorcycleModel.ID?.none)
                        ForEach(models) { Text($0.name).tag(Optional($0.id)) }
                    }
                    .disabled(brandID == nil)
                    Picker("Génération", selection: Binding(get: { generationID }, set: { generationID = $0; variantID = nil; colorwayID = nil })) {
                        Text("Choisir").tag(MotorcycleGeneration.ID?.none)
                        ForEach(generations) { Text($0.code).tag(Optional($0.id)) }
                    }
                    .disabled(modelID == nil)
                    Picker("Version", selection: Binding(get: { variantID }, set: { variantID = $0; colorwayID = nil })) {
                        Text("Choisir").tag(MotorcycleVariant.ID?.none)
                        ForEach(variants) { Text($0.versionName).tag(Optional($0.id)) }
                    }
                    .disabled(generationID == nil)
                } footer: {
                    Text("MOTOFORGE prend en charge la Honda CB125R JC91 dans cette version. D'autres motos suivront.")
                }

                Section {
                    YearField(year: $year)
                    if let variant, !variant.colorways.isEmpty {
                        Picker("Coloris d'origine", selection: $colorwayID) {
                            Text("Je ne sais pas").tag(OriginalColorway.ID?.none)
                            ForEach(variant.colorways) { Text($0.name).tag(Optional($0.id)) }
                        }
                    } else {
                        LabeledContent("Coloris d'origine") {
                            MFBadge(.unverified)
                        }
                    }
                    TextField("Kilométrage (facultatif)", text: $mileage).keyboardType(.numberPad)
                } footer: {
                    if variant != nil && (variant?.colorways.isEmpty ?? true) {
                        Text("Les coloris d'origine de cette version ne sont pas encore documentés à partir d'une source Honda.")
                    }
                }
            }
            .navigationTitle("Ajouter une moto")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear(perform: preselectSingleChoices)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ajouter") { save() }.disabled(variantID == nil || isSaving)
                }
            }
        }
    }

    /// With a single-bike catalog, preselect the only path to save taps.
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
