import Foundation
import Testing
import MFDomain
@testable import MFCatalog

@Suite("Catalogue")
struct CatalogTests {
    @Test func bundledCatalogLoadsAndHasNoErrors() async throws {
        let repo = try BundledCatalogRepository()
        let snapshot = try await repo.snapshot()
        #expect(snapshot.brands.map(\.id) == ["honda"])
        let generations = try await repo.generations(of: "honda.cb125r")
        #expect(generations.map(\.code) == ["JC91"])
        let errors = CatalogValidator.validate(snapshot).filter { $0.severity == .error }
        #expect(errors.isEmpty, "\(errors)")
    }

    @Test func bundledCatalogIsFullySourced() async throws {
        let snapshot = try await BundledCatalogRepository().snapshot()
        #expect(snapshot.generations.allSatisfy { $0.verification.isTrustworthy })
        #expect(snapshot.generations.first?.firstYear == 2021)
        #expect(snapshot.variants.allSatisfy { v in v.colorways.allSatisfy { $0.verification.isTrustworthy } })
        let references = snapshot.accessories.flatMap(\.variants)
        #expect(references.count >= 30)
        // Every reference has a verified fitment for a JC91 variant; no unsourced homologation or price.
        let jc91 = Set(snapshot.variants.map(\.id))
        for r in references {
            #expect(r.compatibilities.contains { $0.verification.isTrustworthy && !jc91.isDisjoint(with: $0.vehicleVariantIDs) }, "\(r.id)")
            #expect(r.homologations.allSatisfy { $0.verification.isTrustworthy }, "\(r.id)")
            #expect(r.offers.allSatisfy { $0.verification.verifiedAt != nil && $0.price.amount > 0 }, "\(r.id)")
        }
    }

    @Test func decimalPricesAreExact() async throws {
        let snapshot = try await BundledCatalogRepository().snapshot()
        let arrow = snapshot.accessories.flatMap(\.variants).first { $0.reference == "51519XKIW" }
        #expect(arrow?.offers.first?.price.amount == Decimal(string: "450.18")!)
    }

    @Test func validatorRejectsUnsourcedData() {
        let variant = AccessoryVariant(
            id: "x.v", accessoryID: "x", reference: "", colorway: "Noir",
            compatibilities: [AccessoryCompatibility(vehicleVariantIDs: ["ghost"], verification: .unverified)],
            homologations: [HomologationRecord(countryCode: "FR", vehicleVariantID: "ghost", status: .approved, verification: .unverified)],
            offers: [MerchantOffer(merchantName: "S", url: URL(string: "https://example.com")!, price: Money(0, "EUR"), verification: .unverified)])
        let accessory = Accessory(id: "x", category: .mirrors, commercialName: "X", manufacturer: "", description: "",
                                  variants: [variant], verification: .unverified)
        let snapshot = CatalogSnapshot(revision: 1, generatedAt: Date(), brands: [], models: [], generations: [], variants: [],
                                       accessories: [accessory], referenceColors: [])
        let messages = CatalogValidator.validate(snapshot).filter { $0.severity == .error }.map(\.message)
        #expect(messages.contains("fabricant manquant"))
        #expect(messages.contains("fiche produit sans source ni date de vérification"))
        #expect(messages.contains("référence fabricant manquante"))
        #expect(messages.contains("aucune compatibilité vérifiée"))
        #expect(messages.contains { $0.contains("sans source vérifiée") })
        #expect(messages.contains { $0.contains("prix invalide") })
        #expect(messages.contains { $0.contains("sans date de vérification") })
    }

    @Test func compatibleAccessoriesFilter() async throws {
        let verified = Verification(status: .verified, source: "s", verifiedAt: Date())
        let ok = AccessoryVariant(id: "a.ok", accessoryID: "a", reference: "R1", colorway: "Noir",
                                  compatibilities: [AccessoryCompatibility(vehicleVariantIDs: ["v1"], verification: verified)])
        let ko = AccessoryVariant(id: "a.ko", accessoryID: "a", reference: "R2", colorway: "Noir",
                                  compatibilities: [AccessoryCompatibility(vehicleVariantIDs: ["v1"], verification: .unverified)])
        let acc = Accessory(id: "a", category: .grips, commercialName: "A", manufacturer: "M", description: "",
                            variants: [ok, ko], verification: verified)
        let snapshot = CatalogSnapshot(revision: 1, generatedAt: Date(), brands: [], models: [], generations: [], variants: [],
                                       accessories: [acc], referenceColors: [])
        let repo = BundledCatalogRepository(data: try CatalogSnapshot.encoder().encode(snapshot))
        let result = try await repo.compatibleAccessories(for: "v1")
        #expect(result.first?.variants.map(\.id) == ["a.ok"])
        #expect(try await repo.compatibleAccessories(for: "v2").isEmpty)
        #expect(try await repo.compatibleAccessories(for: "v1", category: .mirrors).isEmpty)
    }
}
