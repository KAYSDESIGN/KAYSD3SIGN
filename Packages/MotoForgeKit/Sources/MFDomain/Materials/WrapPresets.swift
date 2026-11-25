import Foundation

/// Built-in sticker library of the covering studio (artwork generated for MOTOFORGE, tools/stickers).
public enum WrapPresets {
    public struct Sticker: Hashable, Sendable, Identifiable {
        public let assetName: String
        public let name: String
        public var id: String { assetName }
    }

    public static let stickers: [Sticker] = [
        .init(assetName: "sticker_lightning", name: "Éclair"),
        .init(assetName: "sticker_star", name: "Étoile"),
        .init(assetName: "sticker_chevrons", name: "Chevrons"),
        .init(assetName: "sticker_number", name: "Numéro 77"),
        .init(assetName: "sticker_checker", name: "Damier"),
        .init(assetName: "sticker_tristripe", name: "Trois bandes"),
        .init(assetName: "sticker_circle", name: "Cible"),
        .init(assetName: "sticker_wordmark", name: "MOTOFORGE")
    ]

    /// Geometric pattern names understood by the compositor.
    public static let patterns: [(id: String, name: String)] = [("checker", "Damier"), ("stripes", "Rayures")]
}
