import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Liste d'achat — mockup screen 8.
///
/// Checkboxes select lines; « Commander » opens the merchants of the selection. The status of each
/// line (à acheter / commandé / installé) is tracked separately and feeds the budget and progress.
struct ShoppingListView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    let projectID: CustomizationProject.ID
    @State private var selection: Set<ShoppingListItem.ID> = []
    @State private var showMerchants = false
    @State private var addingCustom = false

    var body: some View {
        if let project = model.project(projectID) {
            content(project)
        } else {
            ContentUnavailableView("Projet introuvable", systemImage: "questionmark.folder")
        }
    }

    private func content(_ project: CustomizationProject) -> some View {
        let selected = project.shoppingList.filter { selection.contains($0.id) }
        let total = selected.reduce(Decimal(0)) { sum, item in
            guard let price = item.unitPrice, price.money.currency == project.budget.currency else { return sum }
            return sum + price.money.amount * Decimal(item.quantity) + (item.shipping?.money.amount ?? 0)
        }

        return ScrollView {
            VStack(alignment: .leading, spacing: MFSpacing.m) {
                Text("Projet : \(project.name)").font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                if project.shoppingList.isEmpty {
                    ContentUnavailableView("Liste vide", systemImage: "checklist",
                                           description: Text("Les pièces ajoutées au projet apparaissent ici automatiquement."))
                } else {
                    MFCard(padding: 0) {
                        VStack(spacing: 0) {
                            ForEach(project.shoppingList) { item in
                                row(item, project: project)
                                if item.id != project.shoppingList.last?.id { Divider().padding(.leading, 56) }
                            }
                        }
                    }
                }
                Button { addingCustom = true } label: { Label("Ajouter une ligne", systemImage: "plus") }
                    .buttonStyle(.mfSecondary)
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: MFSpacing.s) {
                HStack {
                    Text("Total sélectionné").font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                    Spacer()
                    Text(Format.money(total, project.budget.currency)).font(MFTypography.headline).foregroundStyle(MFColor.accent)
                }
                MFWideButton("Commander chez les vendeurs (\(selected.count))") { showMerchants = true }
                    .disabled(selected.isEmpty)
                    .opacity(selected.isEmpty ? 0.5 : 1)
            }
            .padding(.horizontal, MFSpacing.screen)
            .padding(.top, MFSpacing.s)
            .padding(.bottom, 72)
            .background(MFColor.background)
        }
        .navigationTitle("Liste d'achat")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showMerchants) { merchants(selected) }
        .sheet(isPresented: $addingCustom) { CustomLineEditor(project: project) }
    }

    private func row(_ item: ShoppingListItem, project: CustomizationProject) -> some View {
        let isSelected = selection.contains(item.id)
        return HStack(spacing: MFSpacing.s) {
            Button {
                if isSelected { selection.remove(item.id) } else { selection.insert(item.id) }
            } label: {
                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundStyle(isSelected ? MFColor.accent : MFColor.textSecondary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isSelected ? "Désélectionner" : "Sélectionner")
            .sensoryFeedback(.selection, trigger: isSelected)

            thumbnail(item).frame(width: 44, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.label).font(MFTypography.caption.weight(.semibold)).foregroundStyle(MFColor.textPrimary).lineLimit(2)
                HStack(spacing: MFSpacing.xxs) {
                    Text(item.unitPrice.map { Format.money($0.money.multiplied(by: item.quantity)) } ?? "Prix non renseigné")
                        .font(MFTypography.callout.weight(.bold))
                        .foregroundStyle(item.unitPrice == nil ? MFColor.textSecondary : MFColor.accent)
                    if let p = item.unitPrice, p.kind != .verified { MFBadge(.estimate) }
                }
                if item.status != .toBuy {
                    Text(item.status.localizedName).font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                }
            }
            Spacer()
            Menu {
                Picker("Statut", selection: Binding(get: { item.status }, set: { status in mutate(item.id, in: project) { $0.status = status } })) {
                    ForEach(ShoppingListItem.Status.allCases, id: \.self) { Text($0.localizedName).tag($0) }
                }
                Stepper("Quantité : \(item.quantity)", value: Binding(get: { item.quantity },
                                                                    set: { q in mutate(item.id, in: project) { $0.quantity = max(1, q) } }), in: 1...20)
                if let url = item.merchantURL {
                    Button { openURL(url) } label: { Label("Consulter le vendeur", systemImage: "arrow.up.right.square") }
                }
                Button(role: .destructive) { remove(item, from: project) } label: { Label("Retirer", systemImage: "trash") }
            } label: {
                Image(systemName: "ellipsis").font(.system(size: 14, weight: .bold)).foregroundStyle(MFColor.textPrimary)
                    .frame(width: 32, height: 32)
            }
            .accessibilityLabel("Actions pour \(item.label)")
        }
        .padding(.horizontal, MFSpacing.m)
        .padding(.vertical, MFSpacing.s)
    }

    @ViewBuilder private func thumbnail(_ item: ShoppingListItem) -> some View {
        if case .accessory(let id) = item.kind, let (accessory, _) = model.accessoryVariant(id) {
            BikeVisual(assetName: accessory.photos.first, placeholderSymbol: accessory.category.systemImage, placeholderText: "")
                .clipShape(RoundedRectangle(cornerRadius: 6))
        } else {
            Image(systemName: "tag").foregroundStyle(MFColor.textSecondary)
        }
    }

    private func merchants(_ items: [ShoppingListItem]) -> some View {
        NavigationStack {
            List(items) { item in
                if let url = item.merchantURL {
                    Button { openURL(url) } label: {
                        LabeledContent(item.label) { Image(systemName: "arrow.up.right.square") }
                    }
                } else {
                    LabeledContent(item.label, value: "Aucun vendeur référencé")
                }
            }
            .navigationTitle("Vendeurs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Fermer") { showMerchants = false } }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: Mutations (autosaved)

    private func mutate(_ id: ShoppingListItem.ID, in project: CustomizationProject, _ change: (inout ShoppingListItem) -> Void) {
        var p = project
        guard let i = p.shoppingList.firstIndex(where: { $0.id == id }) else { return }
        change(&p.shoppingList[i])
        Task { await model.save(p) }
    }

    private func remove(_ item: ShoppingListItem, from project: CustomizationProject) {
        var p = project
        p.shoppingList.removeAll { $0.id == item.id }
        // Removing a fitted accessory line also removes it from the configuration.
        if case .accessory(let vid) = item.kind { p.configuration.accessories.removeAll { $0.variantID == vid } }
        selection.remove(item.id)
        Task { await model.save(p) }
    }
}

/// Manual line (screws, paint shop quote, labor…), always an estimate.
private struct CustomLineEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let project: CustomizationProject
    @State private var label = ""
    @State private var amount = ""
    @State private var kind: ShoppingListItem.Kind = .custom

    var body: some View {
        NavigationStack {
            Form {
                TextField("Libellé", text: $label)
                Picker("Type", selection: $kind) {
                    Text("Autre").tag(ShoppingListItem.Kind.custom)
                    Text("Peinture").tag(ShoppingListItem.Kind.paint)
                    Text("Covering").tag(ShoppingListItem.Kind.wrap)
                    Text("Main-d'œuvre").tag(ShoppingListItem.Kind.labor)
                }
                HStack {
                    TextField("Montant estimé", text: $amount).keyboardType(.decimalPad)
                    Text("€").foregroundStyle(MFColor.textSecondary)
                }
            }
            .navigationTitle("Nouvelle ligne")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ajouter", action: save).disabled(label.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func save() {
        var p = project
        let value = Decimal(string: amount.replacingOccurrences(of: ",", with: ".").replacingOccurrences(of: " ", with: ""))
        p.shoppingList.append(ShoppingListItem(kind: kind, label: label,
                                               unitPrice: value.map { PricedAmount(Money($0, p.budget.currency), kind: .userProvided) }))
        Task { await model.save(p); dismiss() }
    }
}
