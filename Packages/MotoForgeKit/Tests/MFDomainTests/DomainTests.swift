import Foundation
import Testing
@testable import MFDomain

@Suite("Domaine")
struct DomainTests {
    @Test func identifierEncodesAsPlainString() throws {
        let id: MotorcycleVariant.ID = "honda.cb125r.jc91"
        let data = try JSONEncoder().encode([id])
        #expect(String(decoding: data, as: UTF8.self) == #"["honda.cb125r.jc91"]"#)
        #expect(id.appending("tank", as: MotorcycleComponent.self).rawValue == "honda.cb125r.jc91.tank")
    }

    @Test func dictionariesKeyedByIdentifierEncodeAsObjects() throws {
        let styles: [MotorcycleComponent.ID: Int] = ["a.tank": 1]
        let json = String(decoding: try JSONEncoder().encode(styles), as: UTF8.self)
        #expect(json == #"{"a.tank":1}"#)
        let angles: [ViewAngle: Int] = [.front: 1]
        #expect(String(decoding: try JSONEncoder().encode(angles), as: UTF8.self) == #"{"front":1}"#)
    }

    @Test func projectRoundTrips() throws {
        var config = ProjectConfiguration(vehicleVariantID: "v")
        config.componentStyles["v.tank"] = .paint(Material(baseColor: PaintColor(id: "c", name: "C", rgb: .white), effect: .pearl))
        config.componentStyles["v.frame"] = .wrap(WrapDesign(coverage: .partial, layers: [
            WrapLayer(id: "l1", content: .stripe(color: .black, widthRatio: 0.1, count: 2, spacingRatio: 0.05))
        ]))
        let project = CustomizationProject(name: "Test", motorcycleID: "m", configuration: config,
                                           budget: ProjectBudget(maximum: Money(Decimal(string: "1234.56")!, "EUR")),
                                           createdAt: Date(timeIntervalSince1970: 0))
        let enc = JSONEncoder(); enc.dateEncodingStrategy = .iso8601
        let dec = JSONDecoder(); dec.dateDecodingStrategy = .iso8601
        #expect(try dec.decode(CustomizationProject.self, from: enc.encode(project)) == project)
    }

    @Test func duplicateGetsNewIdentity() {
        let p = CustomizationProject(name: "A", motorcycleID: "m", configuration: ProjectConfiguration(vehicleVariantID: "v"),
                                     shoppingList: [ShoppingListItem(kind: .custom, label: "x", unitPrice: nil)], isFavorite: true)
        let d = p.duplicated()
        #expect(d.id != p.id)
        #expect(d.name == "A (copie)")
        #expect(d.configuration == p.configuration)
        #expect(d.shoppingList[0].id != p.shoppingList[0].id)
        #expect(!d.isFavorite)
    }

    @Test func verificationRequiresSourceAndDate() {
        #expect(!Verification(status: .verified).isTrustworthy)
        #expect(!Verification(status: .verified, source: "x").isTrustworthy)
        #expect(Verification(status: .verified, source: "x", verifiedAt: Date()).isTrustworthy)
        #expect(!Verification(status: .unverified, source: "x", verifiedAt: Date()).isTrustworthy)
    }

    @Test func unverifiedReferenceColorIsNotAReference() {
        let ral = PaintColor(id: "ral.3020", name: "RAL 3020", rgb: .white, source: .ral(code: "3020"))
        #expect(!ral.isVerifiedReference)
    }

    @Test func moneyRefusesCurrencyMix() throws {
        #expect(throws: MoneyError.currencyMismatch("EUR", "USD")) { _ = try Money(1, "EUR").adding(Money(1, "usd")) }
        let sum = try Money(Decimal(string: "0.1")!, "EUR").adding(Money(Decimal(string: "0.2")!, "EUR"))
        #expect(sum.amount == Decimal(string: "0.3")!)
    }

    @Test func effectsHonestyFlags() {
        #expect(PaintEffect.allCases.count == 23)
        #expect(PaintEffect.holographic.isLightingSimulation)
        #expect(PaintEffect.holographic.renderAvailability == .planned)
        #expect(!PaintEffect.matte.isLightingSimulation)
        #expect(ViewAngle.allCases.count == 6)
        #expect(AccessoryCategory.allCases.count == 19)
    }
}

@Suite("Préréglages atelier")
struct PresetTests {
    @Test func quickPicksMatchMockupAndAreNotReferences() {
        #expect(PaintPresets.quickColors.count == 12)
        #expect(Set(PaintPresets.quickColors.map(\.id)).count == 12)
        #expect(PaintPresets.quickColors.allSatisfy { $0.source == .custom && !$0.isVerifiedReference })
        #expect(PaintPresets.quickEffects == [.gloss, .satin, .matte, .metallic])
        #expect(PaintPresets.quickEffects.allSatisfy { $0.renderAvailability == .available })
    }

    @Test func legacyGarageWithoutYearDecodes() throws {
        let json = #"{"motorcycles":[{"id":"a","variantID":"v","addedAt":"2026-01-01T00:00:00Z"}]}"#
        let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601
        let g = try d.decode(UserGarage.self, from: Data(json.utf8))
        #expect(g.motorcycles.first?.year == nil)
        #expect(g.motorcycles.first?.mileageKm == nil)
    }
}

@Suite("Inspirations")
struct InspirationTests {
    @Test func presetsMapOntoVariantComponents() {
        let variant = MotorcycleVariant(id: "honda.cb125r.jc91.eu", generationID: "honda.cb125r.jc91", versionName: "EU",
                                        components: [MotorcycleComponent(id: "honda.cb125r.jc91.tank", kind: .tank),
                                                     MotorcycleComponent(id: "honda.cb125r.jc91.fork", kind: .fork)])
        let preset = InspirationPresets.all[0]
        let config = preset.configuration(for: variant)
        #expect(config.vehicleVariantID == variant.id)
        #expect(config.componentStyles.count == 2)
        #expect(InspirationPresets.all.count >= 6)
        #expect(Set(InspirationPresets.all.map(\.id)).count == InspirationPresets.all.count)
        // Only finishes the engine actually renders.
        #expect(InspirationPresets.all.allSatisfy { $0.styles.values.allSatisfy { $0.effect.renderAvailability == .available } })
    }
}
