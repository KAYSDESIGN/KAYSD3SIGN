import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Détail produit — mockup screen 4, completed with the mandatory product sheet fields (§10).
/// Customer ratings from the mockup are intentionally absent: no review source exists.
struct ProductDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @Environment(\.openURL) private var openURL
    let accessoryID: Accessory.ID
    @State private var photoPage = 0
    @State private var variantIndex = 0
    @State private var added = 0

    private let country = "FR"

    var body: some View {
        if let accessory = model.accessory(accessoryID), !accessory.variants.isEmpty {
            content(accessory)
        } else {
            ContentUnavailableView("Produit introuvable", systemImage: "shippingbox",
                                   description: Text("Cette référence n'est plus dans le catalogue vérifié."))
        }
    }

    private func content(_ accessory: Accessory) -> some View {
        let variant = accessory.variants[min(variantIndex, accessory.variants.count - 1)]
        let bike = model.selectedMotorcycle
        let offer = OfferSelector.bestOffer(for: variant, currency: "EUR")
        let compat = bike.flatMap { CompatibilityChecker.compatibility(of: variant, with: $0.variantID) }
        let homologation = bike.map { HomologationResolver.resolve(variant, country: country, vehicle: $0.variantID) }

        return ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.m) {
                gallery(accessory)
                VStack(alignment: .leading, spacing: MFSpacing.xs) {
                    Text(accessory.commercialName).font(MFTypography.title).foregroundStyle(MFColor.textPrimary)
                    Text(compatibilityLine(accessory, variant))
                        .font(MFTypography.callout)
                        .foregroundStyle(MFColor.textSecondary)
                    HStack(alignment: .firstTextBaseline) {
                        Text(offer.map { Format.money($0.price) } ?? "Prix non vérifié")
                            .font(.system(.title2).weight(.bold))
                            .foregroundStyle(offer == nil ? MFColor.textSecondary : MFColor.accent)
                        if let offer {
                            MFBadge(offer.priceKind == .verified ? .verified : .estimate)
                            if let date = offer.verification.verifiedAt {
                                Text("au \(date.formatted(date: .abbreviated, time: .omitted))")
                                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                            }
                        }
                    }
                }

                if accessory.variants.count > 1 {
                    Picker("Coloris", selection: $variantIndex) {
                        ForEach(Array(accessory.variants.enumerated()), id: \.offset) { i, v in Text(v.colorway).tag(i) }
                    }
                    .pickerStyle(.segmented)
                }

                features(accessory, variant)
                homologationCard(homologation)
                fitmentCard(compat)
                merchantsCard(variant)
                sourcesCard(accessory, variant, compat)
            }
            .padding(.horizontal, MFSpacing.screen)
            .padding(.bottom, MFSpacing.l)
        }
        .safeAreaInset(edge: .bottom) {
            MFWideButton("Ajouter au projet", systemImage: "cart.badge.plus") { add(accessory, variant) }
                .padding(.horizontal, MFSpacing.screen)
                .padding(.bottom, 72)
        }
        .navigationTitle("Détail produit")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { Task { await model.toggleFavorite(accessory: accessory.id) } } label: {
                    Image(systemName: model.isFavorite(accessory.id) ? "heart.fill" : "heart")
                }
                .accessibilityLabel(model.isFavorite(accessory.id) ? "Retirer des favoris" : "Ajouter aux favoris")
            }
        }
        .sensoryFeedback(.success, trigger: added)
    }

    // MARK: Sections

    private func gallery(_ accessory: Accessory) -> some View {
        VStack(spacing: MFSpacing.xs) {
            ZStack(alignment: .bottomTrailing) {
                TabView(selection: $photoPage) {
                    if accessory.photos.isEmpty {
                        BikeVisual(assetName: nil, placeholderSymbol: accessory.category.systemImage, placeholderText: "Photo à venir").tag(0)
                    }
                    ForEach(Array(accessory.photos.enumerated()), id: \.offset) { i, name in
                        BikeVisual(assetName: name, placeholderSymbol: accessory.category.systemImage).scaledToFit().tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 220)
                Button { tryOnBike(accessory) } label: {
                    Label("Essayer sur ma moto", systemImage: "sparkles")
                }
                .buttonStyle(.mfGlass)
                .padding(MFSpacing.xs)
            }
            MFPageDots(count: max(accessory.photos.count, 1), index: photoPage)
        }
    }

    private func features(_ accessory: Accessory, _ variant: AccessoryVariant) -> some View {
        MFCard {
            VStack(alignment: .leading, spacing: MFSpacing.s) {
                row("building.2", "Fabricant", accessory.manufacturer)
                row("number", "Référence", variant.reference)
                if !accessory.materials.isEmpty { row("circle.hexagongrid", "Matériaux", accessory.materials.joined(separator: " / ")) }
                row("paintpalette", "Coloris", accessory.variants.map(\.colorway).joined(separator: ", "))
                if !accessory.description.isEmpty {
                    Text(accessory.description).font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
                }
            }
        }
    }

    private func homologationCard(_ resolution: HomologationResolver.Resolution?) -> some View {
        MFCard {
            VStack(alignment: .leading, spacing: MFSpacing.xs) {
                MFSectionHeader("Homologation (France)")
                MFBadge(.homologation(resolution?.status ?? .notVerified))
                if let record = resolution?.record {
                    ForEach(record.approvalNumbers, id: \.self) { Text("N° \($0)").font(MFTypography.caption) }
                    ForEach(record.conditions, id: \.self) { Label($0, systemImage: "exclamationmark.triangle").font(MFTypography.caption) }
                } else {
                    Text("Aucune source ne confirme l'homologation de cette pièce pour votre moto et cette configuration de montage.")
                        .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                }
            }
        }
    }

    private func fitmentCard(_ compat: AccessoryCompatibility?) -> some View {
        MFCard {
            VStack(alignment: .leading, spacing: MFSpacing.xs) {
                MFSectionHeader("Compatibilité")
                if let compat {
                    Label("Compatibilité vérifiée", systemImage: "checkmark.seal").font(MFTypography.callout)
                    if compat.requiredAdapters.isEmpty {
                        Text("Aucun adaptateur requis selon le fabricant.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                    } else {
                        Text("Adaptateurs nécessaires : " + compat.requiredAdapters.joined(separator: ", ")).font(MFTypography.caption)
                    }
                    if let notes = compat.notes { Text(notes).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary) }
                } else {
                    MFBadge(.unverified)
                }
            }
        }
    }

    private func merchantsCard(_ variant: AccessoryVariant) -> some View {
        MFCard {
            VStack(alignment: .leading, spacing: MFSpacing.s) {
                MFSectionHeader("Vendeurs")
                if variant.offers.isEmpty {
                    Text("Aucun vendeur référencé.").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                }
                ForEach(variant.offers, id: \.url) { offer in
                    Button { openURL(offer.url) } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(offer.merchantName).font(MFTypography.callout.weight(.semibold))
                                Text(offer.priceKind == .verified ? "Prix vérifié" : "Prix non vérifié").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                            }
                            Spacer()
                            Text(Format.money(offer.price)).font(MFTypography.callout.weight(.semibold))
                            Image(systemName: "arrow.up.right.square")
                        }
                        .foregroundStyle(MFColor.textPrimary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Consulter le vendeur")
                }
            }
        }
    }

    private func sourcesCard(_ accessory: Accessory, _ variant: AccessoryVariant, _ compat: AccessoryCompatibility?) -> some View {
        MFCard {
            VStack(alignment: .leading, spacing: MFSpacing.xs) {
                MFSectionHeader("Sources")
                source("Fiche produit", accessory.verification)
                if let compat { source("Compatibilité", compat.verification) }
                if let url = accessory.manufacturerURL {
                    Button("Site du fabricant") { openURL(url) }.buttonStyle(.mfSecondary)
                }
            }
        }
    }

    private func source(_ title: String, _ v: Verification) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(MFTypography.caption.weight(.semibold))
            Text([v.source, v.verifiedAt.map { "vérifié le \($0.formatted(date: .abbreviated, time: .omitted))" }].compactMap { $0 }.joined(separator: " · "))
                .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
        }
    }

    private func row(_ symbol: String, _ label: String, _ value: String) -> some View {
        HStack(spacing: MFSpacing.s) {
            Image(systemName: symbol).frame(width: 20).foregroundStyle(MFColor.textPrimary)
            Text(label).font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
            Spacer()
            Text(value).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary).multilineTextAlignment(.trailing)
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: Logic

    private func compatibilityLine(_ accessory: Accessory, _ variant: AccessoryVariant) -> String {
        let names = variant.compatibilities.filter { $0.verification.isTrustworthy }.flatMap(\.vehicleVariantIDs)
            .map { "\(model.displayName(of: $0)) (\(model.generationCode(of: $0) ?? "?"))" }
        return names.isEmpty ? "Compatibilité non vérifiée" : "Compatible " + Array(Set(names)).sorted().joined(separator: " / ")
    }

    private func targetProject() async -> CustomizationProject? {
        guard let bike = model.selectedMotorcycle else { router.isAddingMotorcycle = true; return nil }
        if let p = model.projects.first(where: { $0.motorcycleID == bike.id }) { return p }
        return await model.createProject(for: bike)
    }

    private func add(_ accessory: Accessory, _ variant: AccessoryVariant) {
        Task {
            guard let p = await targetProject() else { return }
            do {
                try await model.addAccessory(accessory, variant: variant, to: p.id)
                added += 1
            } catch {
                model.errorMessage = "Cette pièce n'est pas vérifiée comme compatible avec votre moto."
            }
        }
    }

    private func tryOnBike(_ accessory: Accessory) {
        Task {
            guard let p = await targetProject() else { return }
            do {
                try await model.addAccessory(accessory, variant: accessory.variants[min(variantIndex, accessory.variants.count - 1)], to: p.id)
                router.open(.workshop(p.id))
            } catch {
                model.errorMessage = "Cette pièce n'est pas vérifiée comme compatible avec votre moto."
            }
        }
    }
}
