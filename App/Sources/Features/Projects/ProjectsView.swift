import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Mes projets et favoris — mockup screen 6.
struct ProjectsView: View {
    enum Filter: Hashable { case all, inProgress, completed, favorites }

    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @State private var filter: Filter = .all
    @State private var renaming: CustomizationProject?
    @State private var newName = ""
    @State private var deleting: CustomizationProject?
    @State private var comparing = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.m) {
                HStack(spacing: MFSpacing.xs) {
                    MFChip("Tous", isSelected: filter == .all) { filter = .all }
                    MFChip("En cours", isSelected: filter == .inProgress) { filter = .inProgress }
                    MFChip("Terminés", isSelected: filter == .completed) { filter = .completed }
                    MFChip("Favoris", isSelected: filter == .favorites) { filter = .favorites }
                }
                if filter == .favorites {
                    FavoritesSection()
                } else {
                    projectList
                }
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .navigationTitle("Mes projets")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Comparer") { comparing = true }.disabled(model.projects.count < 2)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: create) { Image(systemName: "plus") }.accessibilityLabel("Nouveau projet")
            }
        }
        .floatingBarInset()
        .sheet(isPresented: $comparing) { CompareProjectsView() }
        .alert("Renommer le projet", isPresented: Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })) {
            TextField("Nom", text: $newName)
            Button("Annuler", role: .cancel) {}
            Button("Renommer") { if let p = renaming { Task { await model.rename(p.id, to: newName) } } }
        }
        .confirmationDialog("Supprimer ce projet ?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                            titleVisibility: .visible) {
            Button("Supprimer", role: .destructive) { if let p = deleting { Task { await model.deleteProject(p.id) } } }
        } message: {
            Text("Cette action est définitive.")
        }
    }

    private var filtered: [CustomizationProject] {
        model.projects.filter {
            switch filter {
            case .all, .favorites: true
            case .inProgress: !ProjectProgress.isCompleted($0)
            case .completed: ProjectProgress.isCompleted($0)
            }
        }
    }

    @ViewBuilder private var projectList: some View {
        if filtered.isEmpty {
            ContentUnavailableView {
                Label(filter == .completed ? "Aucun projet terminé" : "Aucun projet", systemImage: "heart.text.square")
            } description: {
                Text(filter == .completed ? "Un projet est terminé quand toutes ses pièces sont installées." : "Créez un projet pour personnaliser votre moto.")
            } actions: {
                if filter != .completed { Button("Nouveau projet", action: create).buttonStyle(.mfPrimary) }
            }
            .padding(.top, MFSpacing.xl)
        } else {
            ForEach(filtered) { project in
                ProjectCard(project: project,
                            rename: { newName = project.name; renaming = project },
                            delete: { deleting = project })
            }
        }
    }

    private func create() {
        guard let bike = model.selectedMotorcycle else { router.isAddingMotorcycle = true; return }
        Task { if let p = await model.createProject(for: bike) { router.open(.workshop(p.id)) } }
    }
}

/// Project card (mockup): photo, name, updated date, menu, progress.
private struct ProjectCard: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    let project: CustomizationProject
    let rename: () -> Void
    let delete: () -> Void

    var body: some View {
        let percent = ProjectProgress.percent(of: project)
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            Button { router.open(.workshop(project.id)) } label: {
                ConfigurationRender(configuration: project.configuration, angle: .rightProfile)
                    .frame(height: 150)
                    .frame(maxWidth: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Ouvrir \(project.name) dans l'atelier")

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: MFSpacing.xxs) {
                        Text(project.name).font(MFTypography.callout.weight(.semibold))
                        if project.isFavorite { Image(systemName: "heart.fill").font(.caption).foregroundStyle(MFColor.accent) }
                    }
                    Text(Format.updated(project.updatedAt)).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                }
                .foregroundStyle(MFColor.textPrimary)
                Spacer()
                Menu {
                    Button { router.open(.workshop(project.id)) } label: { Label("Ouvrir l'atelier", systemImage: "wrench.and.screwdriver") }
                    Button { router.open(.budget(project.id)) } label: { Label("Budget", systemImage: "chart.pie") }
                    Button { router.open(.shoppingList(project.id)) } label: { Label("Liste d'achat", systemImage: "checklist") }
                    Button { Task { await model.toggleFavorite(project: project.id) } } label: {
                        Label(project.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris", systemImage: "heart")
                    }
                    Button(action: rename) { Label("Renommer", systemImage: "pencil") }
                    Button { Task { await model.duplicate(project.id) } } label: { Label("Dupliquer", systemImage: "plus.square.on.square") }
                    ShareLink(item: ProjectShare.summary(project, model: model)) { Label("Partager", systemImage: "square.and.arrow.up") }
                    Button(role: .destructive, action: delete) { Label("Supprimer", systemImage: "trash") }
                } label: {
                    Image(systemName: "ellipsis").font(.system(size: 14, weight: .bold)).foregroundStyle(MFColor.textPrimary)
                        .frame(width: 32, height: 32)
                }
                .accessibilityLabel("Actions du projet")
            }
            HStack(spacing: MFSpacing.s) {
                MFProgressBar(Double(percent) / 100)
                Text("\(percent) %").font(MFTypography.caption.weight(.semibold)).foregroundStyle(MFColor.textPrimary)
            }
        }
        .padding(MFSpacing.s)
        .background(MFColor.surface, in: RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
        .shadow(color: MFShadow.card.color, radius: MFShadow.card.radius, y: MFShadow.card.y)
    }
}

/// Favorite accessories (only still-listed references are shown).
private struct FavoritesSection: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router

    var body: some View {
        let favorites = model.favorites.accessoryIDs.compactMap { model.accessory($0) }
        if favorites.isEmpty {
            ContentUnavailableView("Aucun favori", systemImage: "heart",
                                   description: Text("Touchez le cœur d'une pièce du catalogue pour la retrouver ici."))
                .padding(.top, MFSpacing.xl)
        } else {
            ForEach(favorites) { a in
                Button { router.open(.product(a.id)) } label: {
                    MFCard {
                        HStack {
                            Label("\(a.manufacturer) \(a.commercialName)", systemImage: a.category.systemImage)
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

/// Text summary shared with ShareLink (image export arrives with the reference visuals).
enum ProjectShare {
    @MainActor
    static func summary(_ p: CustomizationProject, model: AppModel) -> String {
        var lines = ["\(p.name) — \(model.displayName(of: p.configuration.vehicleVariantID))"]
        let vehicle = model.variant(p.configuration.vehicleVariantID)
        for (id, style) in p.configuration.componentStyles.sorted(by: { $0.key < $1.key }) {
            let name = vehicle?.component(id)?.displayName ?? id.rawValue
            if case .paint(let m) = style { lines.append("• \(name) : \(m.baseColor.rgb.hexString) \(m.effect.localizedName)") }
            else { lines.append("• \(name) : covering") }
        }
        for a in p.configuration.accessories {
            if let (acc, v) = model.accessoryVariant(a.variantID) { lines.append("• \(acc.manufacturer) \(acc.commercialName) — réf. \(v.reference)") }
        }
        lines.append("Créé avec MOTOFORGE")
        return lines.joined(separator: "\n")
    }
}

/// Side-by-side comparison of two configurations.
private struct CompareProjectsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var leftID: CustomizationProject.ID?
    @State private var rightID: CustomizationProject.ID?

    var body: some View {
        NavigationStack {
            Form {
                Picker("Projet A", selection: $leftID) {
                    ForEach(model.projects) { Text($0.name).tag(Optional($0.id)) }
                }
                Picker("Projet B", selection: $rightID) {
                    ForEach(model.projects) { Text($0.name).tag(Optional($0.id)) }
                }
                if let a = leftID.flatMap({ model.project($0) }), let b = rightID.flatMap({ model.project($0) }) {
                    differences(a, b)
                }
            }
            .navigationTitle("Comparer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { dismiss() } }
            .onAppear {
                leftID = model.projects.first?.id
                rightID = model.projects.dropFirst().first?.id
            }
        }
    }

    @ViewBuilder private func differences(_ a: CustomizationProject, _ b: CustomizationProject) -> some View {
        let diff = ConfigurationDiff(from: a.configuration, to: b.configuration)
        let vehicle = model.variant(b.configuration.vehicleVariantID)
        Section("Différences") {
            if diff.isEmpty { Text("Configurations identiques.") }
            ForEach(diff.components.keys.sorted(), id: \.self) { id in
                LabeledContent(vehicle?.component(id)?.displayName ?? id.rawValue) {
                    HStack(spacing: MFSpacing.xs) {
                        swatch(a.configuration.componentStyles[id])
                        Image(systemName: "arrow.right").font(.caption)
                        swatch(b.configuration.componentStyles[id])
                    }
                }
            }
            ForEach(diff.accessoriesAdded, id: \.self) { id in
                Label(model.accessoryVariant(id).map { $0.0.commercialName } ?? id.rawValue, systemImage: "plus.circle")
            }
            ForEach(diff.accessoriesRemoved, id: \.self) { id in
                Label(model.accessoryVariant(id).map { $0.0.commercialName } ?? id.rawValue, systemImage: "minus.circle")
            }
        }
        Section("Budget") {
            LabeledContent(a.name, value: Format.money(BudgetCalculator.summarize(budget: a.budget, shoppingList: a.shoppingList).total, a.budget.currency))
            LabeledContent(b.name, value: Format.money(BudgetCalculator.summarize(budget: b.budget, shoppingList: b.shoppingList).total, b.budget.currency))
        }
    }

    @ViewBuilder private func swatch(_ style: ComponentStyle?) -> some View {
        if case .paint(let m)? = style {
            MFFinishSample(effect: m.effect, color: m.baseColor.rgb.swiftUIColor).frame(width: 28, height: 18)
        } else if style != nil {
            Text("Covering").font(MFTypography.caption)
        } else {
            Text("Origine").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
        }
    }
}
