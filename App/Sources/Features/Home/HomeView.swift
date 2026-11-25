import SwiftUI
import MFDomain
import MFDesignSystem

/// Accueil — mockup screen 1.
struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @State private var query = ""
    @State private var projectPage = 0
    @State private var showNotifications = false
    @State private var showFilters = false
    @State private var showAllInspirations = false

    private var recentProjects: [CustomizationProject] { Array(model.projects.prefix(4)) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.l) {
                header
                searchRow
                if query.isEmpty {
                    projectSection
                    quickAccess
                    inspirations
                } else {
                    SearchResultsView(query: query)
                }
            }
            .padding(.horizontal, MFSpacing.screen)
            .padding(.top, MFSpacing.xs)
        }
        .scrollDismissesKeyboard(.interactively)
        .toolbar(.hidden, for: .navigationBar)
        .floatingBarInset()
        .sheet(isPresented: $showNotifications) { NotificationsView() }
        .sheet(isPresented: $showFilters) {
            CategoryPickerSheet { category in
                showFilters = false
                router.openCatalog(category: category)
            }
            .presentationDetents([.medium, .large])
        }
    }

    // MARK: Sections

    private var header: some View {
        HStack(alignment: .top) {
            MFWordmark()
            Spacer()
            MFIconButton("bell", label: "Notifications") { showNotifications = true }
            Button { router.tab = .menu } label: {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 34))
                    .foregroundStyle(MFColor.textSecondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Profil et paramètres")
        }
    }

    private var searchRow: some View {
        HStack(spacing: MFSpacing.xs) {
            MFSearchField("Rechercher une moto, une pièce…", text: $query)
            MFIconButton("slider.horizontal.3", label: "Filtrer le catalogue", kind: .graphite, size: 40) { showFilters = true }
        }
    }

    private var projectSection: some View {
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            MFSectionHeader("Mon projet")
            if recentProjects.isEmpty {
                EmptyProjectCard()
            } else {
                TabView(selection: $projectPage) {
                    ForEach(Array(recentProjects.enumerated()), id: \.element.id) { index, project in
                        ProjectHeroCard(project: project) { router.open(.workshop(project.id)) }
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 170)
                if recentProjects.count > 1 {
                    MFPageDots(count: recentProjects.count, index: projectPage).frame(maxWidth: .infinity)
                }
            }
        }
    }

    private var quickAccess: some View {
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            MFSectionHeader("Accès rapide")
            HStack(spacing: MFSpacing.s) {
                MFQuickTile("Mon garage", systemImage: "house") { router.tab = .garage }
                MFQuickTile("Atelier", systemImage: "wrench.and.screwdriver", isHighlighted: true) { openWorkshop() }
                MFQuickTile("Catalogue", systemImage: "square.stack.3d.up") { router.openCatalog() }
                MFQuickTile("Mes projets", systemImage: "bookmark") { router.tab = .projects }
            }
        }
    }

    private var inspirations: some View {
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            HStack {
                MFSectionHeader("Inspirations")
                Button { showAllInspirations = true } label: {
                    HStack(spacing: 2) { Text("Voir tout"); Image(systemName: "chevron.right") }
                        .font(MFTypography.caption.weight(.semibold))
                }
                .foregroundStyle(MFColor.accent)
            }
            if let variant = model.selectedMotorcycle.flatMap({ model.variant($0.variantID) }) ?? model.catalog?.variants.first {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: MFSpacing.s) {
                        ForEach(InspirationPresets.all) { inspiration in
                            InspirationCard(inspiration: inspiration, variant: variant) { start(inspiration) }
                        }
                    }
                }
                .scrollClipDisabled()
            }
        }
        .sheet(isPresented: $showAllInspirations) { InspirationsGallery { inspiration in showAllInspirations = false; start(inspiration) } }
    }

    /// Creates a project from an inspiration on the user's bike (adds the bike first if needed).
    private func start(_ inspiration: Inspiration) {
        guard let bike = model.selectedMotorcycle, let variant = model.variant(bike.variantID) else {
            router.isAddingMotorcycle = true
            return
        }
        Task {
            guard var project = await model.createProject(for: bike, name: inspiration.name) else { return }
            var config = inspiration.configuration(for: variant)
            config.originalColorwayID = bike.originalColorwayID
            project.configuration = config
            await model.save(project)
            router.open(.workshop(project.id))
        }
    }

    /// Atelier quick access: latest project, else create one, else add a bike first.
    private func openWorkshop() {
        if let project = model.projects.first {
            router.open(.workshop(project.id))
        } else if let bike = model.selectedMotorcycle {
            Task {
                if let p = await model.createProject(for: bike) { router.open(.workshop(p.id)) }
            }
        } else {
            router.isAddingMotorcycle = true
        }
    }
}

/// Large dark project card (mockup « Mon projet »).
private struct ProjectHeroCard: View {
    @Environment(AppModel.self) private var model
    let project: CustomizationProject
    let open: () -> Void

    var body: some View {
        let bike = model.motorcycle(project.motorcycleID)
        let variantID = project.configuration.vehicleVariantID
        Button(action: open) {
            ZStack(alignment: .bottomLeading) {
                ConfigurationRender(configuration: project.configuration, dark: true)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipped()
                VStack(alignment: .leading, spacing: 2) {
                    Text(model.displayName(of: variantID).components(separatedBy: " ").first ?? "")
                        .font(MFTypography.callout)
                    Text(model.displayName(of: variantID).components(separatedBy: " ").dropFirst().joined(separator: " "))
                        .font(.system(.title, design: .default).weight(.heavy).italic())
                    Text([bike?.year.map(String.init), model.generationCode(of: variantID)].compactMap { $0 }.joined(separator: " · "))
                        .font(MFTypography.caption)
                }
                .foregroundStyle(.white)
                .padding(MFSpacing.m)
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(MFColor.textPrimary)
                    .frame(width: 32, height: 32)
                    .background(Circle().fill(.white.opacity(0.85)))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .padding(MFSpacing.s)
            }
            .clipShape(RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(project.name), ouvrir dans l'atelier")
    }
}

private struct EmptyProjectCard: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router

    var body: some View {
        MFCard {
            VStack(alignment: .leading, spacing: MFSpacing.s) {
                Text(model.selectedMotorcycle == nil ? "Ajoutez votre moto pour commencer." : "Aucun projet pour l'instant.")
                    .font(MFTypography.callout)
                    .foregroundStyle(MFColor.textSecondary)
                if let bike = model.selectedMotorcycle {
                    Button("Créer un projet") {
                        Task { if let p = await model.createProject(for: bike) { router.open(.workshop(p.id)) } }
                    }
                    .buttonStyle(.mfPrimary)
                } else {
                    Button("Ajouter ma moto") { router.isAddingMotorcycle = true }.buttonStyle(.mfPrimary)
                }
            }
        }
    }
}

/// Search across bikes and verified-compatible accessories.
private struct SearchResultsView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    let query: String

    var body: some View {
        let q = query.lowercased()
        let bikes = (model.catalog?.variants ?? []).filter { model.displayName(of: $0.id).lowercased().contains(q) || $0.versionName.lowercased().contains(q) }
        let vehicle = model.selectedMotorcycle?.variantID
        let parts = vehicle.map { model.compatibleAccessories(for: $0) } ?? []
        let matches = parts.filter { "\($0.manufacturer) \($0.commercialName)".lowercased().contains(q) }

        VStack(alignment: .leading, spacing: MFSpacing.s) {
            if bikes.isEmpty && matches.isEmpty {
                ContentUnavailableView.search(text: query)
            }
            ForEach(bikes) { v in
                Button {
                    router.isAddingMotorcycle = true
                } label: {
                    MFCard {
                        Label("\(model.displayName(of: v.id)) · \(model.generationCode(of: v.id) ?? "")", systemImage: "motorcycle")
                            .foregroundStyle(MFColor.textPrimary)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityHint("Ajouter cette moto au garage")
            }
            ForEach(matches) { a in
                Button { router.open(.product(a.id)) } label: {
                    MFCard {
                        Label("\(a.manufacturer) \(a.commercialName)", systemImage: a.category.systemImage)
                            .foregroundStyle(MFColor.textPrimary)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Category picker opened by the filter button.
struct CategoryPickerSheet: View {
    let pick: (AccessoryCategory?) -> Void
    var body: some View {
        NavigationStack {
            List {
                Button("Toutes les catégories") { pick(nil) }
                ForEach(AccessoryCategory.allCases, id: \.self) { c in
                    Button { pick(c) } label: { Label(c.localizedName, systemImage: c.systemImage) }
                }
            }
            .foregroundStyle(MFColor.textPrimary)
            .navigationTitle("Filtrer")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ContentUnavailableView("Aucune notification", systemImage: "bell",
                                   description: Text("Les notifications ne sont pas encore disponibles."))
                .toolbar { Button("Fermer") { dismiss() } }
                .navigationTitle("Notifications")
                .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium])
    }
}

/// Inspiration thumbnail rendered live on the user's bike.
private struct InspirationCard: View {
    let inspiration: Inspiration
    let variant: MotorcycleVariant
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: MFSpacing.xxs) {
                ConfigurationRender(configuration: inspiration.configuration(for: variant))
                    .frame(width: 150, height: 104)
                    .clipShape(RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
                Text(inspiration.name).font(MFTypography.caption.weight(.semibold)).foregroundStyle(MFColor.textPrimary)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(inspiration.name). \(inspiration.summary). Créer un projet.")
    }
}

/// Full inspirations gallery.
private struct InspirationsGallery: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let pick: (Inspiration) -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                if let variant = model.selectedMotorcycle.flatMap({ model.variant($0.variantID) }) ?? model.catalog?.variants.first {
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: MFSpacing.s), GridItem(.flexible(), spacing: MFSpacing.s)], spacing: MFSpacing.m) {
                        ForEach(InspirationPresets.all) { i in
                            Button { pick(i) } label: {
                                VStack(alignment: .leading, spacing: MFSpacing.xxs) {
                                    ConfigurationRender(configuration: i.configuration(for: variant))
                                        .frame(height: 120)
                                        .clipShape(RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
                                    Text(i.name).font(MFTypography.callout.weight(.semibold)).foregroundStyle(MFColor.textPrimary)
                                    Text(i.summary).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary).lineLimit(2)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(MFSpacing.screen)
                }
            }
            .background(MFColor.background)
            .navigationTitle("Inspirations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { dismiss() } }
        }
    }
}
