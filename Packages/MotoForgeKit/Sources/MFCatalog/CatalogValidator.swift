import Foundation
import MFDomain

/// Strict quality gate for catalog data. Run in tests and before publishing a catalog revision.
///
/// Errors block publication; warnings are allowed but surface as « non vérifié » in the UI.
public enum CatalogValidator {
    public struct Issue: Hashable, Sendable, CustomStringConvertible {
        public enum Severity: String, Sendable { case error, warning }
        public let severity: Severity
        public let path: String
        public let message: String
        public var description: String { "[\(severity.rawValue)] \(path): \(message)" }
    }

    public static func validate(_ s: CatalogSnapshot) -> [Issue] {
        var issues: [Issue] = []
        func error(_ path: String, _ msg: String) { issues.append(Issue(severity: .error, path: path, message: msg)) }
        func warn(_ path: String, _ msg: String) { issues.append(Issue(severity: .warning, path: path, message: msg)) }

        // Unique, stable identifiers.
        func checkUnique<T>(_ ids: [Identifier<T>], _ kind: String) {
            var seen = Set<Identifier<T>>()
            for id in ids where !seen.insert(id).inserted { error("\(kind).\(id)", "identifiant dupliqué") }
        }
        checkUnique(s.brands.map(\.id), "brand")
        checkUnique(s.models.map(\.id), "model")
        checkUnique(s.generations.map(\.id), "generation")
        checkUnique(s.variants.map(\.id), "variant")
        checkUnique(s.accessories.map(\.id), "accessory")
        checkUnique(s.accessories.flatMap(\.variants).map(\.id), "accessoryVariant")

        // Referential integrity.
        let brandIDs = Set(s.brands.map(\.id)), modelIDs = Set(s.models.map(\.id))
        let generationIDs = Set(s.generations.map(\.id)), variantIDs = Set(s.variants.map(\.id))
        for m in s.models where !brandIDs.contains(m.brandID) { error("model.\(m.id)", "marque inconnue \(m.brandID)") }
        for g in s.generations where !modelIDs.contains(g.modelID) { error("generation.\(g.id)", "modèle inconnu \(g.modelID)") }
        for g in s.generations where !g.verification.isTrustworthy { warn("generation.\(g.id)", "années / génération non vérifiées") }

        for v in s.variants {
            let path = "variant.\(v.id)"
            if !generationIDs.contains(v.generationID) { error(path, "génération inconnue \(v.generationID)") }
            if !v.verification.isTrustworthy { warn(path, "version non vérifiée") }
            let componentIDs = Set(v.components.map(\.id))
            for c in v.colorways {
                if !c.verification.isTrustworthy { warn("\(path).colorway.\(c.id)", "coloris non vérifié") }
                for key in c.componentMaterials.keys where !componentIDs.contains(key) {
                    error("\(path).colorway.\(c.id)", "composant inconnu \(key)")
                }
            }
            if v.views.isEmpty { warn(path, "aucun visuel de référence") }
            for view in v.views {
                if !view.license.isTrustworthy { error("\(path).view.\(view.angle.rawValue)", "licence du visuel non vérifiée") }
                for mask in view.masks where !componentIDs.contains(mask.componentID) {
                    error("\(path).view.\(view.angle.rawValue)", "masque d'un composant inconnu \(mask.componentID)")
                }
            }
        }

        // Accessories: no invented data.
        for a in s.accessories {
            let path = "accessory.\(a.id)"
            if a.manufacturer.trimmingCharacters(in: .whitespaces).isEmpty { error(path, "fabricant manquant") }
            if !a.verification.isTrustworthy { error(path, "fiche produit sans source ni date de vérification") }
            if a.variants.isEmpty { error(path, "aucune référence") }
            for variant in a.variants {
                let vp = "\(path).\(variant.id)"
                if variant.accessoryID != a.id { error(vp, "référence rattachée à un autre produit") }
                if variant.reference.trimmingCharacters(in: .whitespaces).isEmpty { error(vp, "référence fabricant manquante") }
                if !variant.compatibilities.contains(where: { $0.verification.isTrustworthy }) {
                    error(vp, "aucune compatibilité vérifiée")
                }
                for c in variant.compatibilities {
                    for id in c.vehicleVariantIDs where !variantIDs.contains(id) { error(vp, "véhicule inconnu \(id)") }
                }
                for h in variant.homologations {
                    if h.status != .notVerified && !h.verification.isTrustworthy {
                        error(vp, "statut d'homologation « \(h.status.rawValue) » sans source vérifiée")
                    }
                    if h.status == .approvedWithConditions && h.conditions.isEmpty {
                        error(vp, "homologation sous conditions sans conditions renseignées")
                    }
                    if !variantIDs.contains(h.vehicleVariantID) { error(vp, "homologation pour un véhicule inconnu") }
                    if h.countryCode.count != 2 { error(vp, "code pays invalide \(h.countryCode)") }
                }
                for o in variant.offers {
                    if o.price.amount <= 0 { error(vp, "prix invalide chez \(o.merchantName)") }
                    if o.price.currency.count != 3 { error(vp, "devise invalide \(o.price.currency)") }
                    if o.verification.verifiedAt == nil { error(vp, "prix sans date de vérification (\(o.merchantName))") }
                }
            }
        }

        for c in s.referenceColors {
            switch c.source {
            case .ral, .manufacturer, .commercialProduct:
                if !c.verification.isTrustworthy { warn("color.\(c.id)", "couleur de référence non vérifiée") }
            case .custom, .photoSample:
                error("color.\(c.id)", "une couleur personnalisée n'a rien à faire dans le catalogue")
            }
        }
        return issues
    }
}
