#if canImport(SwiftUI)
import SwiftUI

/// MOTOFORGE color tokens. Never hard-code colors in views.
public enum MFColor {
    /// App background `#F5F5F7`.
    public static let background = Color(hex: 0xF5F5F7)
    /// Primary text `#17171C`.
    public static let textPrimary = Color(hex: 0x17171C)
    /// Secondary text `#777780`.
    public static let textSecondary = Color(hex: 0x777780)
    /// Accent `#7938F5` — controls and selection only, never behind the motorcycle.
    public static let accent = Color(hex: 0x7938F5)
    /// Graphite `#202124`.
    public static let graphite = Color(hex: 0x202124)
    /// Card surface.
    public static let surface = Color.white
    /// Hairlines and separators.
    public static let separator = Color(hex: 0x17171C).opacity(0.08)
    /// Neutral stage behind the motorcycle render: achromatic so UI never biases paint perception.
    public static let neutralStage = Color(hex: 0xF5F5F7)
    /// Over-budget / destructive information.
    public static let negative = Color(hex: 0xD92D20)
    /// Light accent tint for selected tiles and segmented tracks (mockup « Atelier » tile).
    public static let accentSoft = Color(hex: 0x7938F5, opacity: 0.14)
    /// Track of segmented controls and chips.
    public static let track = Color(hex: 0x17171C, opacity: 0.05)
    /// Budget legend colors (mockup « Budget projet »), in `BudgetRow.Category` order.
    public static let chart: [Color] = [
        Color(hex: 0x7938F5), Color(hex: 0x4FA8F0), Color(hex: 0xF5A54A), Color(hex: 0x3FBF8F), Color(hex: 0xC9C9D1)
    ]
}

public enum MFSpacing {
    public static let xxs: CGFloat = 4
    public static let xs: CGFloat = 8
    public static let s: CGFloat = 12
    public static let m: CGFloat = 16
    public static let l: CGFloat = 24
    public static let xl: CGFloat = 32
    public static let xxl: CGFloat = 48
    /// Horizontal screen margin.
    public static let screen: CGFloat = 20
}

public enum MFRadius {
    public static let small: CGFloat = 10
    public static let medium: CGFloat = 16
    public static let card: CGFloat = 22
    public static let large: CGFloat = 28
}

/// SF Pro via system fonts, Dynamic Type aware.
public enum MFTypography {
    public static let largeTitle = Font.system(.largeTitle, design: .default).weight(.bold)
    public static let title = Font.system(.title2, design: .default).weight(.bold)
    public static let headline = Font.system(.headline, design: .default)
    public static let body = Font.system(.body, design: .default)
    public static let callout = Font.system(.callout, design: .default)
    public static let caption = Font.system(.caption, design: .default)
    public static let captionEmphasized = Font.system(.caption, design: .default).weight(.semibold)
}

public struct MFShadow: Sendable {
    public let color: Color
    public let radius: CGFloat
    public let y: CGFloat

    /// Discreet card shadow.
    public static let card = MFShadow(color: .black.opacity(0.06), radius: 12, y: 4)
}

extension Color {
    /// `Color(hex: 0x7938F5)` in sRGB.
    public init(hex: UInt32, opacity: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: opacity
        )
    }
}
#endif
