import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Mon garage — mockup screen 2.
struct GarageView: View {
    enum Segment: Hashable { case bikes, history }

    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @State private var segment: Segment = .bikes
    @State private var editing: OwnedMotorcycle?
    @State private var deleting: OwnedMotorcycle?

    var body: some View {
        ScrollView {
            VStack(spacing: MFSpacing.m) {
                MFSegmentedControl([(Segment.bikes, "Mes motos"), (.history, "Historique")], selection: $segment)
                switch segment {
                case .bikes: bikes
                case .history: history
                }
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .navigationTitle("Mon garage")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { router.isAddingMotorcycle = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("Ajouter une moto")
            }
        }
        .floatingBarInset()
        .sheet(item: $editing) { bike in EditMotorcycleView(bike: bike) }
        .confirmationDialog("Supprimer cette moto et ses projets ?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                            titleVisibility: .visible) {
            Button("Supprimer", role: .destructive) {
                if let bike = deleting { Task { await model.deleteMotorcycle(bike.id) } }
            }
        }
    }

    @ViewBuilder private var bikes: some View {
        if model.garage.motorcycles.isEmpty {
            ContentUnavailableView {
                Label("Aucune moto", systemImage: "motorcycle")
            } description: {
                Text("Ajoutez votre moto pour créer vos projets de personnalisation.")
            } actions: {
                Button("Ajouter une moto") { router.isAddingMotorcycle = true }.buttonStyle(.mfPrimary)
            }
        } else {
            ForEach(model.garage.motorcycles) { bike in
                GarageBikeCard(bike: bike, edit: { editing = bike }, delete: { deleting = bike })
            }
        }
    }

    /// Modification history: projects of the garage, most recently updated first.
    @ViewBuilder private var history: some View {
        if model.projects.isEmpty {
            ContentUnavailableView("Aucun historique", systemImage: "clock",
                                   description: Text("Vos projets et leurs dernières modifications apparaîtront ici."))
        } else {
            VStack(spacing: MFSpacing.s) {
                ForEach(model.projects) { project in
                    Button { router.open(.workshop(project.id)) } label: {
                        MFCard {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name).font(MFTypography.callout.weight(.semibold))
                                    Text(Format.updated(project.updatedAt)).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right").foregroundStyle(MFColor.textSecondary)
                            }
                            .foregroundStyle(MFColor.textPrimary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

/// Bike card: name, year · code, menu, photo, stats row (mockup).
private struct GarageBikeCard: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    let bike: OwnedMotorcycle
    let edit: () -> Void
    let delete: () -> Void

    var body: some View {
        let code = model.generationCode(of: bike.variantID)
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: MFSpacing.xs) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(bike.nickname ?? model.displayName(of: bike.variantID))
                            .font(MFTypography.headline)
                        Text([bike.year.map(String.init), code].compactMap { $0 }.joined(separator: " · "))
                            .font(MFTypography.caption)
                            .foregroundStyle(MFColor.textSecondary)
                    }
                    Spacer()
                    Menu {
                        Button { openWorkshop() } label: { Label("Ouvrir l'atelier", systemImage: "wrench.and.screwdriver") }
                        Button { Task { await model.createProject(for: bike) } } label: { Label("Nouveau projet", systemImage: "plus") }
                        Button { Task { await model.selectMotorcycle(bike.id) } } label: { Label("Définir comme moto principale", systemImage: "star") }
                        Button(action: edit) { Label("Modifier", systemImage: "pencil") }
                        Button(role: .destructive, action: delete) { Label("Supprimer", systemImage: "trash") }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MFColor.textPrimary)
                            .frame(width: 32, height: 32)
                            .background(Circle().fill(MFColor.surface))
                    }
                    .accessibilityLabel("Actions pour la moto")
                }
                BikeVisual(assetName: model.variant(bike.variantID)?.view(for: .rightProfile)?.baseImageAsset)
                    .frame(height: 170)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
            }
            .padding(MFSpacing.m)
            .background(MFColor.neutralStage)

            HStack {
                stat("gauge.with.dots.needle.33percent", bike.mileageKm.map(Format.kilometers) ?? "— km", "Kilométrage")
                stat("calendar", bike.year.map(String.init) ?? "—", "Année")
                stat("wrench.adjustable", code ?? "—", "Génération")
            }
            .padding(.vertical, MFSpacing.m)
            .background(MFColor.surface)
        }
        .clipShape(RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
        .shadow(color: MFShadow.card.color, radius: MFShadow.card.radius, y: MFShadow.card.y)
    }

    private func stat(_ symbol: String, _ value: String, _ label: String) -> some View {
        VStack(spacing: MFSpacing.xxs) {
            Image(systemName: symbol).foregroundStyle(MFColor.textPrimary)
            Text(value).font(MFTypography.caption).foregroundStyle(MFColor.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label) : \(value)")
    }

    private func openWorkshop() {
        if let p = model.projects.first(where: { $0.motorcycleID == bike.id }) {
            router.open(.workshop(p.id))
        } else {
            Task { if let p = await model.createProject(for: bike) { router.open(.workshop(p.id)) } }
        }
    }
}

/// Edit user-owned data (nickname, year, mileage).
private struct EditMotorcycleView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var bike: OwnedMotorcycle
    @State private var mileage = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("Surnom (facultatif)", text: Binding(get: { bike.nickname ?? "" }, set: { bike.nickname = $0.isEmpty ? nil : $0 }))
                YearField(year: $bike.year)
                TextField("Kilométrage", text: $mileage).keyboardType(.numberPad)
            }
            .navigationTitle("Modifier la moto")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { mileage = bike.mileageKm.map(String.init) ?? "" }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") {
                        bike.mileageKm = Int(mileage.filter(\.isNumber))
                        Task { await model.updateMotorcycle(bike); dismiss() }
                    }
                }
            }
        }
    }
}

/// Year entry. Verified generation years are not documented yet, so the user enters their own.
struct YearField: View {
    @Binding var year: Int?
    private let current = Calendar.current.component(.year, from: Date())

    var body: some View {
        Picker("Année", selection: Binding(get: { year ?? 0 }, set: { year = $0 == 0 ? nil : $0 })) {
            Text("Non renseignée").tag(0)
            ForEach((2010...current).reversed(), id: \.self) { Text(String($0)).tag($0) }
        }
    }
}
