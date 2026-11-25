import Foundation

/// Curated starting configurations shown in the home « Inspirations » gallery.
/// Pure paint combinations (no parts), applicable to any CB125R JC91 version.
public struct Inspiration: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let summary: String
    /// Component slug (e.g. "tank") → material.
    public let styles: [String: Material]

    /// Configuration for a vehicle whose component IDs are `<generationID>.<slug>`.
    public func configuration(for variant: MotorcycleVariant) -> ProjectConfiguration {
        var map: [MotorcycleComponent.ID: ComponentStyle] = [:]
        for component in variant.components {
            let slug = component.id.rawValue.split(separator: ".").last.map(String.init) ?? ""
            if let m = styles[slug] { map[component.id] = .paint(m) }
        }
        return ProjectConfiguration(vehicleVariantID: variant.id, componentStyles: map)
    }
}

public enum InspirationPresets {
    static func color(_ id: String, _ name: String, _ hex: Int) -> PaintColor {
        PaintColor(id: Identifier("inspiration.\(id)"), name: name,
                   rgb: RGBColor(red8: (hex >> 16) & 0xFF, green8: (hex >> 8) & 0xFF, blue8: hex & 0xFF))
    }

    public static let all: [Inspiration] = {
        let violet = color("violet", "Violet MOTOFORGE", 0x7938F5)
        let gold = color("gold", "Or", 0xC99A2E)
        let black = color("black", "Noir profond", 0x1A1A1E)
        let red = color("red", "Rouge candy", 0xB3121B)
        let green = color("green", "Vert anglais", 0x1F5C3A)
        let white = color("white", "Blanc nacré", 0xEDEDEA)
        let blue = color("blue", "Bleu racing", 0x1C4FB8)
        let orange = color("orange", "Orange", 0xF26A1B)
        return [
            Inspiration(id: "violet-gold", name: "Violet & or", summary: "Carrosserie violet candy, jantes et fourche or",
                        styles: ["tank": Material(baseColor: violet, effect: .candy), "tank-shrouds": Material(baseColor: violet, effect: .candy),
                                 "tail-section": Material(baseColor: violet, effect: .candy), "front-fender": Material(baseColor: violet, effect: .candy),
                                 "front-wheel": Material(baseColor: gold, effect: .metallic), "rear-wheel": Material(baseColor: gold, effect: .metallic),
                                 "fork": Material(baseColor: gold, effect: .metallic)]),
            Inspiration(id: "stealth", name: "Stealth", summary: "Tout noir mat, cadre satiné",
                        styles: ["tank": Material(baseColor: black, effect: .matte), "tank-shrouds": Material(baseColor: black, effect: .matte),
                                 "tail-section": Material(baseColor: black, effect: .matte), "front-fender": Material(baseColor: black, effect: .matte),
                                 "frame": Material(baseColor: black, effect: .satin), "swingarm": Material(baseColor: black, effect: .satin)]),
            Inspiration(id: "british-green", name: "British green", summary: "Vert anglais brillant, cadre or",
                        styles: ["tank": Material(baseColor: green, effect: .gloss), "tank-shrouds": Material(baseColor: green, effect: .gloss),
                                 "tail-section": Material(baseColor: green, effect: .gloss), "front-fender": Material(baseColor: green, effect: .gloss),
                                 "frame": Material(baseColor: gold, effect: .metallic)]),
            Inspiration(id: "racing-red", name: "Rouge racing", summary: "Rouge candy, écopes blanc nacré",
                        styles: ["tank": Material(baseColor: red, effect: .candy), "tank-shrouds": Material(baseColor: white, effect: .pearl),
                                 "tail-section": Material(baseColor: red, effect: .candy), "front-fender": Material(baseColor: white, effect: .pearl)]),
            Inspiration(id: "blue-white", name: "Bleu & blanc", summary: "Bicolore bleu racing et blanc nacré",
                        styles: ["tank": Material(baseColor: blue, effect: .gloss), "tank-shrouds": Material(baseColor: white, effect: .pearl),
                                 "tail-section": Material(baseColor: blue, effect: .gloss), "front-wheel": Material(baseColor: white, effect: .gloss),
                                 "rear-wheel": Material(baseColor: white, effect: .gloss)]),
            Inspiration(id: "orange-graphite", name: "Orange graphite", summary: "Orange satiné, cadre et bras gris graphite",
                        styles: ["tank": Material(baseColor: orange, effect: .satin), "tank-shrouds": Material(baseColor: orange, effect: .satin),
                                 "tail-section": Material(baseColor: orange, effect: .satin),
                                 "frame": Material(baseColor: color("graphite", "Graphite", 0x3A3B3F), effect: .metallic),
                                 "swingarm": Material(baseColor: color("graphite2", "Graphite", 0x3A3B3F), effect: .metallic)])
        ]
    }()
}
