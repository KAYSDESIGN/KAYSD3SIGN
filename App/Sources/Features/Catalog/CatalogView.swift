import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Catalogue — mockup screen 3. Only references with a verified compatibility are listed.
struct CatalogView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @State private var category: AccessoryCategory?

    private var bike: OwnedMotorcycle? { model.selectedMotorcycle }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.m) {
                HStack {
                    Text("Accessoires & pièces compatibles")
                        .font(MFTypography.callout)
                        .foregroundStyle(MFColor.textSecondary)
                    Spacer()
                }
                HStack {
                    Spacer()
                    vehiclePicker
                }
                chips
                content
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .navigationTitle("Catalogue")
        .navigationBarTitleDisplayMode(.inline)
        .floatingBarInset()
        .onAppear(perform: consumeRouterCategory)
        .onChange(of: router.catalogCategory) { consumeRouterCategory() }
    }

    private func consumeRouterCategory() {
        if let c = router.catalogCategory { category = c; router.catalogCategory = nil }
    }

    private var vehiclePicker: some View {
        Menu {
            ForEach(model.garage.motorcycles) { b in
                Button(model.displayName(of: b.variantID) + (b.year.map { " · \($0)" } ?? "")) {
                    Task { await model.selectMotorcycle(b.id) }
                }
            }
            Divider()
            Button { router.isAddingMotorcycle = true } label: { Label("Ajouter une moto", systemImage: "plus") }
        } label: {
            HStack(spacing: MFSpacing.xs) {
                Text(bike.map { model.displayName(of: $0.variantID) } ?? "Choisir une moto")
                    .font(MFTypography.callout.weight(.semibold))
                Image(systemName: "chevron.down").font(.caption.weight(.bold))
            }
            .foregroundStyle(MFColor.textPrimary)
            .padding(.horizontal, MFSpacing.m)
            .padding(.vertical, MFSpacing.xs)
            .background(MFColor.surface, in: Capsule())
        }
        .accessibilityLabel("Moto sélectionnée")
    }

    private var chips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: MFSpacing.xs) {
                MFChip("Toutes", isSelected: category == nil) { category = nil }
                ForEach(AccessoryCategory.allCases, id: \.self) { c in
                    MFChip(c.localizedName, isSelected: category == c) { category = c }
                }
            }
        }
        .scrollClipDisabled()
    }

    @ViewBuilder private var content: some View {
        if let bike {
            let items = model.compatibleAccessories(for: bike.variantID).filter { category == nil || $0.category == category }
            if items.isEmpty {
                ContentUnavailableView {
                    Label("Aucune pièce vérifiée", systemImage: "checkmark.seal")
                } description: {
                    Text("Seules les pièces dont la compatibilité avec votre \(model.displayName(of: bike.variantID)) est vérifiée sont affichées. Le catalogue vérifié est en cours de constitution.")
                }
                .padding(.top, MFSpacing.xl)
            } else {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: MFSpacing.s), GridItem(.flexible(), spacing: MFSpacing.s)], spacing: MFSpacing.s) {
                    ForEach(items) { ProductCard(accessory: $0, bike: bike) }
                }
            }
        } else {
            ContentUnavailableView {
                Label("Aucune moto sélectionnée", systemImage: "motorcycle")
            } description: {
                Text("Le catalogue n'affiche que les pièces compatibles avec votre moto.")
            } actions: {
                Button("Ajouter ma moto") { router.isAddingMotorcycle = true }.buttonStyle(.mfPrimary)
            }
            .padding(.top, MFSpacing.xl)
        }
    }
}

/// Product grid card (mockup): photo, favorite, name, price, add button.
private struct ProductCard: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    let accessory: Accessory
    let bike: OwnedMotorcycle
    @State private var added = 0

    var body: some View {
        let variant = accessory.variants[0]
        let offer = OfferSelector.displayOffer(for: variant, preferredCurrency: "EUR")
        VStack(alignment: .leading, spacing: MFSpacing.xs) {
            ZStack(alignment: .topTrailing) {
                BikeVisual(assetName: accessory.photos.first, placeholderSymbol: accessory.category.systemImage, placeholderText: "")
                    .frame(height: 90)
                    .frame(maxWidth: .infinity)
                    .clipped()
                Button { Task { await model.toggleFavorite(accessory: accessory.id) } } label: {
                    Image(systemName: model.isFavorite(accessory.id) ? "heart.fill" : "heart")
                        .foregroundStyle(model.isFavorite(accessory.id) ? MFColor.accent : MFColor.textPrimary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(model.isFavorite(accessory.id) ? "Retirer des favoris" : "Ajouter aux favoris")
            }
            Text(accessory.commercialName)
                .font(MFTypography.caption.weight(.semibold))
                .foregroundStyle(MFColor.textPrimary)
                .lineLimit(2, reservesSpace: true)
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(offer.map { Format.money($0.price) } ?? "Prix non communiqué")
                        .font(MFTypography.callout.weight(.bold))
                        .foregroundStyle(offer == nil ? MFColor.textSecondary : MFColor.accent)
                    if let offer {
                        if offer.priceKind != .verified { MFBadge(.estimate) }
                        else if let tax = offer.taxNote, tax.count <= 4 { Text(tax).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary) }
                    } else if accessory.variants.count > 1 {
                        Text("\(accessory.variants.count) finitions").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                    }
                }
                Spacer()
                MFIconButton("cart.badge.plus", label: "Ajouter au projet", kind: .accent, size: 32) { add(variant) }
            }
        }
        .padding(MFSpacing.s)
        .background(MFColor.surface, in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
        .contentShape(Rectangle())
        .onTapGesture { router.open(.product(accessory.id)) }
        .accessibilityAction(named: "Ouvrir la fiche") { router.open(.product(accessory.id)) }
        .sensoryFeedback(.success, trigger: added)
    }

    private func add(_ variant: AccessoryVariant) {
        Task {
            var project = model.projects.first { $0.motorcycleID == bike.id }
            if project == nil { project = await model.createProject(for: bike) }
            guard let project else { return }
            do {
                try await model.addAccessory(accessory, variant: variant, to: project.id)
                added += 1
            } catch {
                model.errorMessage = "Cette pièce n'a pas pu être ajoutée au projet."
            }
        }
    }
}
