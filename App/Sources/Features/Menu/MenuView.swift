import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Menu et paramètres — designed in the language of the validated mockups (white cards, accent icon tiles).
struct MenuView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    @State private var showPolicy = false
    @State private var showSources = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.m) {
                profileCard
                MFPanel("Ma moto") {
                    if let bike = model.selectedMotorcycle {
                        Button { router.tab = .garage } label: {
                            MFRow(model.displayName(of: bike.variantID), systemImage: "motorcycle") {
                                Text([bike.year.map(String.init), model.generationCode(of: bike.variantID)].compactMap { $0 }.joined(separator: " · "))
                                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(MFColor.textSecondary)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    Button { router.isAddingMotorcycle = true } label: {
                        MFRow("Ajouter une moto", systemImage: "plus") { EmptyView() }
                    }
                    .buttonStyle(.plain)
                }
                MFPanel("Préférences") {
                    MFRow("Pays d'homologation", systemImage: "checkmark.seal") { value("France") }
                    MFRow("Devise", systemImage: "eurosign") { value("Euro (€)") }
                    MFRow("Stockage", systemImage: "iphone") { value("Sur cet iPhone, hors ligne") }
                    if model.hasPhotoSet {
                        MFRow("Visuels de la moto", systemImage: "photo") {
                            Picker("Visuels", selection: Binding(get: { model.visualMode }, set: { model.visualMode = $0 })) {
                                Text("Photos").tag(VisualMode.photo)
                                Text("3D").tag(VisualMode.render3D)
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 140)
                        }
                    }
                }
                MFPanel("Données") {
                    MFRow("Catalogue vérifié", systemImage: "shippingbox") {
                        value("\(model.catalog?.accessories.flatMap(\.variants).count ?? 0) références")
                    }
                    Button { showSources = true } label: {
                        MFRow("Sources et dates de vérification", systemImage: "link") {
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(MFColor.textSecondary)
                        }
                    }
                    .buttonStyle(.plain)
                    Button { showPolicy = true } label: {
                        MFRow("Comment nous vérifions les données", systemImage: "info.circle") {
                            Image(systemName: "chevron.right").font(.caption).foregroundStyle(MFColor.textSecondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
                MFPanel("À venir") {
                    ForEach([("Assistant IA de personnalisation", "sparkles"), ("Synchronisation entre appareils", "icloud"),
                             ("Autres motos (CB125R JC95, MT-125…)", "motorcycle"), ("Rotation 360° et 3D", "rotate.3d")], id: \.0) { item in
                        MFRow(item.0, systemImage: item.1) { MFBadge(.comingSoon) }
                    }
                }
                Text("MOTOFORGE \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "") · Imagine. Personnalise. Roule.")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                    .frame(maxWidth: .infinity)
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .navigationTitle("Menu")
        .navigationBarTitleDisplayMode(.inline)
        .floatingBarInset()
        .sheet(isPresented: $showPolicy) { DataPolicyView() }
        .sheet(isPresented: $showSources) { SourcesView() }
    }

    private var profileCard: some View {
        HStack(spacing: MFSpacing.m) {
            Image(systemName: "person.crop.circle.fill").font(.system(size: 52)).foregroundStyle(MFColor.textSecondary)
            VStack(alignment: .leading, spacing: 2) {
                MFWordmark()
                Text("\(model.garage.motorcycles.count) moto(s) · \(model.projects.count) projet(s)")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
            }
            Spacer()
        }
        .padding(MFSpacing.m)
        .background(MFColor.surface, in: RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
    }

    private func value(_ text: String) -> some View {
        Text(text).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary).multilineTextAlignment(.trailing)
    }
}

/// Every source used by the catalog, with its verification date.
private struct SourcesView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: MFSpacing.s) {
                    ForEach(sources, id: \.0) { title, verification in
                        MFPanel {
                            Text(title).font(MFTypography.callout.weight(.semibold)).foregroundStyle(MFColor.textPrimary)
                            Text([verification.source, verification.verifiedAt.map { "vérifié le \($0.formatted(date: .abbreviated, time: .omitted))" }]
                                    .compactMap { $0 }.joined(separator: " · "))
                                .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                            if let url = verification.sourceURL {
                                Button("Ouvrir la source") { openURL(url) }.buttonStyle(.mfSecondary).font(MFTypography.caption)
                            }
                        }
                    }
                }
                .padding(MFSpacing.screen)
            }
            .background(MFColor.background)
            .navigationTitle("Sources")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { dismiss() } }
        }
    }

    private var sources: [(String, Verification)] {
        guard let c = model.catalog else { return [] }
        var out: [(String, Verification)] = c.generations.map { ("Génération \($0.code)", $0.verification) }
        out += c.variants.map { ("Version \($0.versionName)", $0.verification) }
        out += c.accessories.map { ("\($0.manufacturer) \($0.commercialName)", $0.verification) }
        return out
    }
}

private struct DataPolicyView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                MFPanel {
                    ForEach([
                        ("checkmark.seal", "Chaque référence, prix, compatibilité et homologation est accompagné de sa source et de sa date de vérification."),
                        ("motorcycle", "Le catalogue n'affiche que les pièces dont la compatibilité avec votre moto est vérifiée."),
                        ("questionmark.circle", "Une homologation n'est jamais déduite du nom d'un produit. Sans source : « Non vérifié »."),
                        ("eurosign", "Les prix sont affichés dans leur devise et avec la mention HT/TTC de la source, sans conversion."),
                        ("wand.and.stars", "Les effets dépendant de la lumière sont des simulations et sont signalés comme tels."),
                        ("cube", "Les visuels de la moto sont un modèle 3D simplifié construit aux cotes officielles Honda, pas des photographies."),
                        ("star.slash", "Aucun avis client n'est affiché sans source vérifiable.")
                    ], id: \.1) { icon, text in
                        MFRow(text, systemImage: icon) { EmptyView() }
                    }
                }
                .padding(MFSpacing.screen)
            }
            .background(MFColor.background)
            .navigationTitle("Vérification des données")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { dismiss() } }
        }
    }
}
