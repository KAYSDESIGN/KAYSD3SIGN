import Foundation

/// Quick-pick swatches of the workshop (mockup « Couleur du réservoir », 2 × 6).
///
/// These are free custom colors, NOT manufacturer or RAL references.
public enum PaintPresets {
    public static let quickColors: [PaintColor] = [
        ("white", "Blanc", 0xF2F2F2), ("silver", "Argent", 0xB9BBC0), ("grey", "Gris", 0x8A8D93),
        ("black", "Noir", 0x2A2A2E), ("blue", "Bleu", 0x1F4FD8), ("cyan", "Cyan", 0x29B6E8),
        ("violet", "Violet", 0x7938F5), ("pink", "Rose", 0xF06BA8), ("red", "Rouge", 0xE02424),
        ("orange", "Orange", 0xF5821F), ("gold", "Or", 0xE8B53A), ("green", "Vert", 0x7CC22E)
    ].map { slug, name, hex in
        PaintColor(
            id: Identifier("preset.\(slug)"),
            name: name,
            rgb: RGBColor(red8: (hex >> 16) & 0xFF, green8: (hex >> 8) & 0xFF, blue8: hex & 0xFF),
            source: .custom
        )
    }

    /// Finishes shown as quick picks in the workshop (mockup « Finition »).
    public static let quickEffects: [PaintEffect] = [.gloss, .satin, .matte, .metallic]
}
