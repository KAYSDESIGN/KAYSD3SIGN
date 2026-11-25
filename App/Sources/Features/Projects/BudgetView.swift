import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Budget projet — mockup screen 7. Verified prices and estimates are distinguished.
struct BudgetView: View {
    @Environment(AppModel.self) private var model
    @Environment(AppRouter.self) private var router
    let projectID: CustomizationProject.ID
    @State private var editing = false

    var body: some View {
        if let project = model.project(projectID) {
            content(project)
        } else {
            ContentUnavailableView("Projet introuvable", systemImage: "questionmark.folder")
        }
    }

    private func content(_ project: CustomizationProject) -> some View {
        let summary = BudgetCalculator.summarize(budget: project.budget, shoppingList: project.shoppingList)
        let currency = summary.currency
        let accessoryCount = project.shoppingList.filter { if case .accessory = $0.kind { true } else { false } }.count
        let rows = summary.rows(itemCount: accessoryCount)

        return ScrollView {
            VStack(spacing: MFSpacing.l) {
                MFCard {
                    HStack(spacing: MFSpacing.s) {
                        BikeVisual(assetName: model.variant(project.configuration.vehicleVariantID)?.view(for: .rightProfile)?.baseImageAsset,
                                   placeholderText: "")
                            .frame(width: 72, height: 48)
                            .clipShape(RoundedRectangle(cornerRadius: MFRadius.small))
                        Text(project.name).font(MFTypography.headline).foregroundStyle(MFColor.textPrimary)
                        Spacer()
                    }
                }

                MFRing(summary.maximumUsage ?? 0) {
                    VStack(spacing: MFSpacing.xxs) {
                        Text("Total estimé").font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
                        Text(Format.money(summary.total, currency)).font(.system(.title).weight(.bold)).foregroundStyle(MFColor.textPrimary)
                            .minimumScaleFactor(0.6).lineLimit(1)
                        if let max = summary.maximum {
                            Text("sur \(Format.money(max, currency))").font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                        } else {
                            Button("Définir un budget maximal") { editing = true }.font(MFTypography.caption.weight(.semibold))
                        }
                    }
                    .padding(MFSpacing.l)
                }
                .frame(width: 220, height: 220)
                .accessibilityElement(children: .combine)

                VStack(spacing: MFSpacing.s) {
                    ForEach(Array(rows.enumerated()), id: \.element.id) { i, row in
                        HStack(spacing: MFSpacing.s) {
                            RoundedRectangle(cornerRadius: 3).fill(MFColor.chart[i % MFColor.chart.count]).frame(width: 12, height: 12)
                            Text(row.category.localizedName + (row.itemCount.map { " (\($0))" } ?? ""))
                                .font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                            if !row.isVerified && row.amount > 0 { MFBadge(.estimate) }
                            Spacer()
                            Text(Format.money(row.amount, currency)).font(MFTypography.callout.weight(.semibold)).foregroundStyle(MFColor.textPrimary)
                        }
                        .accessibilityElement(children: .combine)
                    }
                }

                VStack(spacing: MFSpacing.xxs) {
                    if let margin = summary.marginToMaximum {
                        Text(margin >= 0 ? "Reste à financer" : "Dépassement du budget")
                            .font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
                        Text(Format.money(abs(margin), currency)).font(.system(.title2).weight(.bold))
                            .foregroundStyle(margin >= 0 ? MFColor.textPrimary : MFColor.negative)
                    } else {
                        Text("Reste à payer").font(MFTypography.callout).foregroundStyle(MFColor.textSecondary)
                        Text(Format.money(summary.remainingToSpend, currency)).font(.system(.title2).weight(.bold))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(MFSpacing.m)
                .background(MFColor.track, in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))

                HStack {
                    LabeledContent("Déjà dépensé", value: Format.money(summary.spent, currency))
                }
                .font(MFTypography.callout)

                Text("Part du total basée sur des prix vérifiés : \(Int((summary.verifiedShare * 100).rounded())) %")
                    .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                if !summary.excludedItems.isEmpty {
                    Text("\(summary.excludedItems.count) ligne(s) dans une autre devise ne sont pas comptées.")
                        .font(MFTypography.caption).foregroundStyle(MFColor.textSecondary)
                }

                Button("Voir la liste d'achat") { router.open(.shoppingList(projectID)) }.buttonStyle(.mfSecondary)
            }
            .padding(.horizontal, MFSpacing.screen)
        }
        .navigationTitle("Budget projet")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { Button("Modifier") { editing = true } }
        .floatingBarInset()
        .sheet(isPresented: $editing) { BudgetEditor(project: project) }
    }
}

/// Edit maximum, estimates, labor and shipping (all user-provided, labelled as such).
private struct BudgetEditor: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let project: CustomizationProject
    @State private var maximum = ""
    @State private var paint = ""
    @State private var wrap = ""
    @State private var labor = ""
    @State private var shipping = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Budget maximal") { field("Montant", $maximum) }
                Section {
                    field("Peinture (estimation)", $paint)
                    field("Covering (estimation)", $wrap)
                    field("Main-d'œuvre", $labor)
                    field("Frais de livraison supplémentaires", $shipping)
                } footer: {
                    Text("Montants saisis par vous, affichés comme estimations. Les prix des pièces proviennent des offres vendeurs.")
                }
            }
            .navigationTitle("Budget")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear(perform: load)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Enregistrer", action: save) }
            }
        }
    }

    private func field(_ title: String, _ text: Binding<String>) -> some View {
        HStack {
            Text(title)
            TextField("0,00", text: text).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
            Text("€").foregroundStyle(MFColor.textSecondary)
        }
    }

    private func string(_ m: Money?) -> String {
        guard let m else { return "" }
        return NSDecimalNumber(decimal: m.amount).stringValue.replacingOccurrences(of: ".", with: ",")
    }

    private func money(_ s: String) -> Money? {
        let normalized = s.replacingOccurrences(of: " ", with: "").replacingOccurrences(of: ",", with: ".")
        guard !normalized.isEmpty, let d = Decimal(string: normalized), d >= 0 else { return nil }
        return Money(d, project.budget.currency)
    }

    private func load() {
        let b = project.budget
        maximum = string(b.maximum); paint = string(b.paintEstimate); wrap = string(b.wrapEstimate)
        labor = string(b.labor); shipping = string(b.extraShipping)
    }

    private func save() {
        var p = project
        p.budget.maximum = money(maximum)
        p.budget.paintEstimate = money(paint)
        p.budget.wrapEstimate = money(wrap)
        p.budget.labor = money(labor)
        p.budget.extraShipping = money(shipping)
        Task { await model.save(p); dismiss() }
    }
}
