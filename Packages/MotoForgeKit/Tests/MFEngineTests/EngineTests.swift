import Foundation
import Testing
import MFDomain
@testable import MFEngine

@Suite("Couleurs")
struct ColorTests {
    @Test func hexRoundTrip() throws {
        let c = try #require(RGBColor(hex: "#7938F5"))
        #expect(c.hexString == "#7938F5")
        #expect(RGBColor(hex: "7938f5")?.hexString == "#7938F5")
        #expect(RGBColor(hex: "#FFF")?.hexString == "#FFFFFF")
        #expect(RGBColor(hex: "#12345") == nil)
        #expect(RGBColor(hex: "zzzzzz") == nil)
    }

    @Test(arguments: ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#7938F5", "#202124", "#F5F5F7", "#FF00FF"])
    func hsbRoundTrip(hex: String) throws {
        let c = try #require(RGBColor(hex: hex))
        #expect(RGBColor(hsb: c.hsb).hexString == hex)
    }

    @Test func hueShiftWraps() {
        let red = RGBColor(red: 1, green: 0, blue: 0)
        var p = MaterialParameters()
        p.hueShiftDegrees = 120
        #expect(red.adjusted(by: p).hexString == "#00FF00")
        p.hueShiftDegrees = -120
        #expect(red.adjusted(by: p).hexString == "#0000FF")
    }

    @Test func samplerIgnoresHighlightsAndShadows() throws {
        // 2 paint pixels, 1 specular highlight, 1 deep shadow, 1 transparent.
        let rgba: [UInt8] = [200, 0, 0, 255, 180, 0, 0, 255, 255, 255, 255, 255, 2, 2, 2, 255, 0, 255, 0, 0]
        let c = try #require(ColorSampler.representativeColor(rgba: rgba))
        #expect(c.rgb8 == (190, 0, 0))
    }

    @Test func materialClampsParameters() {
        var p = MaterialParameters()
        p.gloss = 4
        p.saturation = -1
        p.hueShiftDegrees = 500
        let m = Material(baseColor: Fixtures.red, effect: .gloss, parameters: p)
        #expect(m.parameters.gloss == 1)
        #expect(m.parameters.saturation == 0)
        #expect(m.parameters.hueShiftDegrees == 180)
    }
}

@Suite("Historique")
struct HistoryTests {
    @Test func undoRedo() {
        var h = History(0)
        h.record(1, label: "a")
        h.record(2, label: "b")
        #expect(h.changeLog == ["a", "b"])
        #expect(h.undoLabel == "b")
        h.undo()
        #expect(h.present == 1)
        #expect(h.redoLabel == "b")
        h.redo()
        #expect(h.present == 2)
        h.undo(); h.undo()
        #expect(h.present == 0)
        #expect(!h.canUndo)
        h.record(5, label: "c")
        #expect(!h.canRedo)
        #expect(h.changeLog == ["c"])
    }

    @Test func identicalStateIsNotRecorded() {
        var h = History(1)
        h.record(1, label: "noop")
        #expect(!h.canUndo)
    }

    @Test func limitDropsOldest() {
        var h = History(0, limit: 2)
        for i in 1...5 { h.record(i, label: "\(i)") }
        #expect(h.changeLog == ["4", "5"])
        h.undo(); h.undo()
        #expect(h.present == 3)
        #expect(!h.canUndo)
    }
}

@Suite("Éditeur de configuration")
struct ConfigurationEditorTests {
    func makeEditor() throws -> ConfigurationEditor {
        try ConfigurationEditor(vehicle: Fixtures.vehicle,
                                configuration: ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID, originalColorwayID: "test.colorway.black"))
    }

    @Test func rejectsConfigurationOfAnotherVehicle() {
        #expect(throws: ConfigurationError.variantMismatch) {
            try ConfigurationEditor(vehicle: Fixtures.vehicle, configuration: ProjectConfiguration(vehicleVariantID: Fixtures.otherVehicleID))
        }
    }

    @Test func componentsAreIndependent() throws {
        var e = try makeEditor()
        try e.setPaint(Material(baseColor: Fixtures.red), on: Fixtures.tank)
        try e.setPaint(Material(baseColor: Fixtures.blue, effect: .matte), on: Fixtures.frame)
        guard case .paint(let tank)? = e.effectiveStyle(of: Fixtures.tank),
              case .paint(let frame)? = e.effectiveStyle(of: Fixtures.frame) else { Issue.record("missing styles"); return }
        #expect(tank.baseColor == Fixtures.red)
        #expect(frame.baseColor == Fixtures.blue)
        #expect(frame.effect == .matte)
    }

    @Test func originalColorwayIsDefault() throws {
        let e = try makeEditor()
        guard case .paint(let frame)? = e.effectiveStyle(of: Fixtures.frame) else { Issue.record("no original"); return }
        #expect(frame.baseColor == Fixtures.black)
        #expect(e.effectiveStyle(of: Fixtures.tank) == nil)
        #expect(!e.isModified(Fixtures.frame))
    }

    @Test func validatesComponentAndMode() throws {
        var e = try makeEditor()
        #expect(throws: ConfigurationError.unknownComponent("nope")) {
            try e.setPaint(Material(baseColor: Fixtures.red), on: "nope")
        }
        #expect(throws: ConfigurationError.modeNotSupported(Fixtures.seat, .wrap)) {
            try e.setWrap(WrapDesign(), on: Fixtures.seat)
        }
    }

    @Test func undoRestoresPreviousConfiguration() throws {
        var e = try makeEditor()
        let initial = e.configuration
        try e.setPaint(Material(baseColor: Fixtures.red), on: Fixtures.tank)
        try e.resetComponent(Fixtures.tank)
        #expect(e.configuration == initial)
        e.undo()
        #expect(e.isModified(Fixtures.tank))
        e.undo()
        #expect(e.configuration == initial)
        e.redo()
        #expect(e.isModified(Fixtures.tank))
    }

    @Test func multiSelectionPaintIsOneUndoStep() throws {
        var e = try makeEditor()
        try e.setPaint(Material(baseColor: Fixtures.red), on: [Fixtures.tank, Fixtures.frame])
        #expect(e.history.changeLog.count == 1)
        e.undo()
        #expect(e.configuration.componentStyles.isEmpty)
    }

    @Test func fitOnlyVerifiedCompatibleAccessories() throws {
        var e = try makeEditor()
        let (unverifiedAcc, unverifiedVar) = Fixtures.mirrorAccessory(compatibility: .unverified)
        #expect(throws: ConfigurationError.accessoryNotCompatible(unverifiedVar.id)) { try e.fit(unverifiedAcc, variant: unverifiedVar) }

        let (otherAcc, otherVar) = Fixtures.mirrorAccessory(vehicles: [Fixtures.otherVehicleID])
        #expect(throws: ConfigurationError.accessoryNotCompatible(otherVar.id)) { try e.fit(otherAcc, variant: otherVar) }

        let (acc, variant) = Fixtures.mirrorAccessory()
        try e.fit(acc, variant: variant)
        try e.fit(acc, variant: variant) // re-fitting does not duplicate
        #expect(e.configuration.accessories.count == 1)
        try e.remove(accessoryVariant: variant.id)
        #expect(e.configuration.accessories.isEmpty)
    }
}

@Suite("Plan de rendu & synchronisation des angles")
struct RenderPlanTests {
    func builder() -> RenderPlanBuilder {
        let (_, variant) = Fixtures.mirrorAccessory()
        return RenderPlanBuilder(vehicle: Fixtures.vehicle) { $0 == variant.id ? variant : nil }
    }

    @Test func switchingAnglesNeverChangesConfiguration() throws {
        var e = try ConfigurationEditor(vehicle: Fixtures.vehicle, configuration: ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID))
        try e.setPaint(Material(baseColor: Fixtures.red), on: Fixtures.frame)
        let before = e.configuration
        let b = builder()
        let lp = try e.renderPlan(angle: .leftProfile, using: b)
        let front = try e.renderPlan(angle: .front, using: b)
        let lpAgain = try e.renderPlan(angle: .leftProfile, using: b)
        #expect(e.configuration == before)
        #expect(lp == lpAgain)
        let redFrame = ComponentStyle.paint(Material(baseColor: Fixtures.red))
        #expect(lp.layers.contains(.component(id: Fixtures.frame, maskAsset: "lp-frame", style: redFrame)))
        #expect(front.layers.contains(.component(id: Fixtures.frame, maskAsset: "f-frame", style: redFrame)))
    }

    @Test func unavailableAngleThrows() throws {
        let e = try ConfigurationEditor(vehicle: Fixtures.vehicle, configuration: ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID))
        #expect(throws: RenderPlanError.angleUnavailable(.rear)) { try e.renderPlan(angle: .rear, using: builder()) }
        #expect(Fixtures.vehicle.availableAngles == [.front, .leftProfile])
    }

    @Test func accessoryHidesOriginalPartAndRespectsOcclusion() throws {
        var e = try ConfigurationEditor(vehicle: Fixtures.vehicle, configuration: ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID))
        try e.setPaint(Material(baseColor: Fixtures.blue), on: Fixtures.tank)
        let (acc, variant) = Fixtures.mirrorAccessory()
        try e.fit(acc, variant: variant)

        let plan = try e.renderPlan(angle: .leftProfile, using: builder())
        let blueTank = ComponentStyle.paint(Material(baseColor: Fixtures.blue))
        #expect(plan.layers.first == .base(asset: "base-leftProfile"))
        #expect(plan.layers.contains(.erase(maskAsset: "lp-mirror")))
        let accessoryIndex = try #require(plan.layers.firstIndex { if case .accessory = $0 { true } else { false } })
        let occluderIndex = try #require(plan.layers.firstIndex(of: .occluder(id: Fixtures.tank, maskAsset: "lp-tank", style: blueTank)))
        #expect(occluderIndex > accessoryIndex)

        // No front visual for this accessory → reported, not silently dropped.
        let front = try e.renderPlan(angle: .front, using: builder())
        #expect(front.accessoriesWithoutVisual == [variant.id])
    }

    @Test func userPlacementAdjustmentIsPerAngle() throws {
        var e = try ConfigurationEditor(vehicle: Fixtures.vehicle, configuration: ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID))
        let (acc, variant) = Fixtures.mirrorAccessory()
        try e.fit(acc, variant: variant)
        let custom = Placement(position: NormalizedPoint(x: 0.7, y: 0.12), scale: 1.1, rotationDegrees: 3)
        try e.adjustPlacement(of: variant.id, angle: .leftProfile, to: custom)
        let plan = try e.renderPlan(angle: .leftProfile, using: builder())
        #expect(plan.layers.contains(.accessory(variantID: variant.id, asset: "acc-mirror-lp", anchor: .center, placement: custom)))
    }

    @Test func hitTestPicksTopMostComponent() throws {
        let view = try #require(Fixtures.vehicle.view(for: .leftProfile))
        #expect(ComponentHitTester.component(at: NormalizedPoint(x: 0.4, y: 0.35), in: view) == Fixtures.tank)
        #expect(ComponentHitTester.component(at: NormalizedPoint(x: 0.25, y: 0.6), in: view) == Fixtures.frame)
        #expect(ComponentHitTester.component(at: NormalizedPoint(x: 0.01, y: 0.01), in: view) == nil)
        // Pixel-accurate refinement can reject a bounding-box hit.
        #expect(ComponentHitTester.component(at: NormalizedPoint(x: 0.4, y: 0.35), in: view,
                                             maskCoverage: { mask, _ in mask.componentID != Fixtures.tank }) == Fixtures.frame)
    }
}

@Suite("Homologation & compatibilité")
struct HomologationTests {
    func variant(records: [HomologationRecord]) -> AccessoryVariant {
        var v = Fixtures.mirrorAccessory().1
        v.homologations = records
        return v
    }

    @Test func noRecordMeansNotVerified() {
        let r = HomologationResolver.resolve(variant(records: []), country: "FR", vehicle: Fixtures.vehicleID)
        #expect(r.status == .notVerified)
    }

    @Test func unsourcedRecordIsIgnored() {
        let rec = HomologationRecord(countryCode: "FR", vehicleVariantID: Fixtures.vehicleID, status: .approved, verification: .unverified)
        #expect(HomologationResolver.resolve(variant(records: [rec]), country: "FR", vehicle: Fixtures.vehicleID).status == .notVerified)
    }

    @Test func dependsOnCountryVehicleAndMounting() {
        let generic = HomologationRecord(countryCode: "FR", vehicleVariantID: Fixtures.vehicleID, status: .approved, verification: Fixtures.verified)
        let withKit = HomologationRecord(countryCode: "fr", vehicleVariantID: Fixtures.vehicleID, mountingConfiguration: "kit-x",
                                         status: .approvedWithConditions, conditions: ["Kit X obligatoire"], verification: Fixtures.verified)
        let v = variant(records: [generic, withKit])
        #expect(HomologationResolver.resolve(v, country: "FR", vehicle: Fixtures.vehicleID).status == .approved)
        #expect(HomologationResolver.resolve(v, country: "FR", vehicle: Fixtures.vehicleID, mountingConfiguration: "kit-x").status == .approvedWithConditions)
        #expect(HomologationResolver.resolve(v, country: "DE", vehicle: Fixtures.vehicleID).status == .notVerified)
        #expect(HomologationResolver.resolve(v, country: "FR", vehicle: Fixtures.otherVehicleID).status == .notVerified)
    }

    @Test func catalogFilterKeepsOnlyVerifiedCompatible() {
        let ok = Fixtures.mirrorAccessory().0
        var bad = Fixtures.mirrorAccessory(compatibility: .unverified).0
        bad.id = "test.acc.bad"
        let filtered = CompatibilityChecker.filter([ok, bad], for: Fixtures.vehicleID)
        #expect(filtered.map(\.id) == [ok.id])
        #expect(CompatibilityChecker.filter([ok], for: Fixtures.otherVehicleID).isEmpty)
    }

    @Test func bestOfferPrefersVerified() {
        let v = Fixtures.mirrorAccessory().1
        let offer = OfferSelector.bestOffer(for: v, currency: "eur")
        #expect(offer?.merchantName == "Shop A") // cheaper Shop B is unverified
        #expect(OfferSelector.bestOffer(for: v, currency: "USD") == nil)
    }
}

@Suite("Budget")
struct BudgetTests {
    @Test func summarySeparatesVerifiedAndEstimates() {
        let (acc, variant) = Fixtures.mirrorAccessory()
        let config = ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID,
                                          accessories: [AccessorySelection(accessoryID: acc.id, variantID: variant.id, category: .mirrors)])
        var list = BudgetCalculator.syncShoppingList([], configuration: config, accessories: { $0 == variant.id ? (acc, variant) : nil }, currency: "EUR")
        #expect(list.count == 1)
        #expect(list[0].unitPrice?.kind == .verified)
        list[0].quantity = 2
        list[0].status = .ordered
        list.append(ShoppingListItem(kind: .custom, label: "Visserie", unitPrice: PricedAmount(Money(12, "EUR"), kind: .estimate)))
        list.append(ShoppingListItem(kind: .custom, label: "Import US", unitPrice: PricedAmount(Money(30, "USD"), kind: .estimate)))

        let budget = ProjectBudget(currency: "EUR", maximum: Money(300, "EUR"), paintEstimate: Money(150, "EUR"), labor: Money(40, "EUR"))
        let s = BudgetCalculator.summarize(budget: budget, shoppingList: list)
        #expect(s.accessoriesVerified == Decimal(string: "179.80")!)
        #expect(s.accessoriesEstimated == 12)
        #expect(s.paintEstimate == 150)
        #expect(s.labor == 40)
        #expect(s.shipping == Decimal(string: "6.50")!)
        #expect(s.total == Decimal(string: "388.30")!)
        #expect(s.spent == Decimal(string: "186.30")!)
        #expect(s.remainingToSpend == 202)
        #expect(s.isOverBudget)
        #expect(s.excludedItems.count == 1)
    }

    @Test func syncRemovesUnfittedUnboughtAccessories() {
        let (acc, variant) = Fixtures.mirrorAccessory()
        let fitted = ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID,
                                          accessories: [AccessorySelection(accessoryID: acc.id, variantID: variant.id, category: .mirrors)])
        let lookup: (AccessoryVariant.ID) -> (Accessory, AccessoryVariant)? = { $0 == variant.id ? (acc, variant) : nil }
        let list = BudgetCalculator.syncShoppingList([], configuration: fitted, accessories: lookup, currency: "EUR")
        let empty = ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID)
        #expect(BudgetCalculator.syncShoppingList(list, configuration: empty, accessories: lookup, currency: "EUR").isEmpty)
        var bought = list
        bought[0].status = .installed
        #expect(BudgetCalculator.syncShoppingList(bought, configuration: empty, accessories: lookup, currency: "EUR").count == 1)
    }
}

@Suite("Comparaison")
struct DiffTests {
    @Test func diffDetectsChanges() {
        let a = ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID, componentStyles: [
            Fixtures.tank: .paint(Material(baseColor: Fixtures.red)),
            Fixtures.frame: .paint(Material(baseColor: Fixtures.black))
        ])
        var b = a
        b.componentStyles[Fixtures.tank] = .paint(Material(baseColor: Fixtures.blue))
        b.componentStyles[Fixtures.frame] = nil
        b.componentStyles[Fixtures.seat] = .paint(Material(baseColor: Fixtures.black, effect: .matte))
        let d = ConfigurationDiff(from: a, to: b)
        #expect(d.components.count == 3)
        if case .removed? = d.components[Fixtures.frame] {} else { Issue.record("frame should be removed") }
        if case .added? = d.components[Fixtures.seat] {} else { Issue.record("seat should be added") }
        #expect(ConfigurationDiff(from: a, to: a).isEmpty)
    }
}

@Suite("Projets : progression, couleurs, budget")
struct ProjectInsightsTests {
    func project(_ statuses: [ShoppingListItem.Status]) -> CustomizationProject {
        CustomizationProject(name: "P", motorcycleID: "m", configuration: ProjectConfiguration(vehicleVariantID: Fixtures.vehicleID),
                             shoppingList: statuses.map { ShoppingListItem(kind: .custom, label: "x", unitPrice: nil, status: $0) })
    }

    @Test func progress() {
        #expect(ProjectProgress.percent(of: project([])) == 0)
        #expect(ProjectProgress.percent(of: project([.installed, .ordered, .toBuy, .toBuy])) == 38)
        #expect(!ProjectProgress.isCompleted(project([])))
        #expect(!ProjectProgress.isCompleted(project([.installed, .ordered])))
        #expect(ProjectProgress.isCompleted(project([.installed, .installed])))
    }

    @Test func colorMemory() {
        var fav = UserFavorites()
        for i in 0..<15 { ColorMemory.pushRecent(RGBColor(red8: i, green8: 0, blue8: 0), into: &fav) }
        ColorMemory.pushRecent(RGBColor(red8: 10, green8: 0, blue8: 0), into: &fav)
        #expect(fav.recentColors.count == ColorMemory.recentLimit)
        #expect(fav.recentColors.first?.rgb8.0 == 10)
        #expect(fav.recentColors.filter { $0.rgb8.0 == 10 }.count == 1)
        let c = RGBColor(red8: 1, green8: 2, blue8: 3)
        ColorMemory.toggleFavorite(c, in: &fav)
        #expect(ColorMemory.isFavorite(c, in: fav))
        ColorMemory.toggleFavorite(c, in: &fav)
        #expect(!ColorMemory.isFavorite(c, in: fav))
    }

    @Test func budgetRowsAndRing() {
        let list = [ShoppingListItem(kind: .custom, label: "a", unitPrice: PricedAmount(Money(100, "EUR"), kind: .verified))]
        let s = BudgetCalculator.summarize(budget: ProjectBudget(maximum: Money(400, "EUR"), labor: Money(100, "EUR")), shoppingList: list)
        let rows = s.rows(itemCount: 1)
        #expect(rows.map(\.category) == BudgetRow.Category.allCases)
        #expect(rows[0].amount == 100 && rows[0].isVerified)
        #expect(rows[3].amount == 100)
        #expect(s.maximumUsage == 0.5)
        #expect(BudgetCalculator.summarize(budget: ProjectBudget(), shoppingList: []).maximumUsage == nil)
    }

    @Test func moneyFormatting() {
        let s = MoneyFormatting.string(Decimal(string: "2347.9")!, currency: "EUR")
        let normalized = s.replacingOccurrences(of: "\u{202F}", with: " ").replacingOccurrences(of: "\u{00A0}", with: " ")
        #expect(normalized == "2 347,90 €")
    }
}
