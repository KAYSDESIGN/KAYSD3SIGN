import SwiftUI
import MFDomain
import MFDesignSystem

/// Menu et paramètres. No mockup was provided for this screen: native grouped list, design system tokens only.
struct MenuView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router

    var body: some View {
        List {
            Section("Ma moto") {
                if let bike = model.selectedMotorcycle {
                    Button { router.tab = .garage } label: {
                        LabeledContent(model.displayName(of: bike.variantID), value: model.generationCode(of: bike.variantID) ?? "")
                    }
                } else {
                    Button("Ajouter ma moto") { router.isAddingMotorcycle = true }
                }
            }
            Section {
                LabeledContent("Pays d'homologation", value: "France")
                LabeledContent("Devise", value: "Euro (€)")
            } header: {
                Text("Préférences")
            } footer: {
                Text("Les statuts d'homologation dépendent du pays, du véhicule et de la configuration de montage. Autres pays : bientôt disponible.")
            }
            Section {
                LabeledContent("Révision du catalogue", value: model.catalog.map { "\($0.revision)" } ?? "—")
                LabeledContent("Références vérifiées", value: "\(model.catalog?.accessories.count ?? 0)")
                NavigationLink("Comment nous vérifions les données") { DataPolicyView() }
            } header: {
                Text("Données")
            }
            Section("Bientôt disponible") {
                ForEach(["Covering avancé", "Assistant IA de personnalisation", "Synchronisation iCloud / compte", "Export des visuels", "Autres motos"], id: \.self) { item in
                    HStack { Text(item); Spacer(); MFBadge(.comingSoon) }
                }
            }
            Section("À propos") {
                LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—")
                Text("MOTOFORGE — Imagine. Personnalise. Roule.").foregroundStyle(MFColor.textSecondary)
            }
        }
        .foregroundStyle(MFColor.textPrimary)
        .scrollContentBackground(.hidden)
        .navigationTitle("Menu")
        .floatingBarInset()
    }
}

private struct DataPolicyView: View {
    var body: some View {
        List {
            Section {
                Label("Chaque référence, prix, compatibilité et homologation est accompagné de sa source et de sa date de vérification.", systemImage: "checkmark.seal")
                Label("Le catalogue n'affiche que les pièces dont la compatibilité avec votre moto est vérifiée.", systemImage: "motorcycle")
                Label("Une homologation n'est jamais déduite du nom d'un produit. Sans source : « Non vérifié ».", systemImage: "questionmark.circle")
                Label("Les estimations (peinture, covering, main-d'œuvre) sont toujours signalées.", systemImage: "plusminus")
                Label("Les effets dépendant de la lumière sont des simulations et sont signalés comme tels.", systemImage: "wand.and.stars")
                Label("Aucun avis client n'est affiché sans source vérifiable.", systemImage: "star.slash")
            }
        }
        .navigationTitle("Vérification des données")
        .navigationBarTitleDisplayMode(.inline)
    }
}
