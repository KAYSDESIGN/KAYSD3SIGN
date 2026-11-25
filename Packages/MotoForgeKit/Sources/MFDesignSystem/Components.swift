#if canImport(SwiftUI)
import SwiftUI
import MFDomain

// MARK: - Liquid Glass

extension View {
    /// Native Liquid Glass on iOS 26+, Apple system material below.
    ///
    /// Reserved for navigation and relevant floating controls (CLAUDE.md §2). Never used on content cards.
    @ViewBuilder
    public func mfGlass<S: Shape>(in shape: S, interactive: Bool = false) -> some View {
        #if compiler(>=6.2)
        if #available(iOS 26.0, macOS 26.0, *) {
            self.glassEffect(interactive ? .regular.interactive() : .regular, in: shape)
        } else {
            self.background(.regularMaterial, in: shape)
        }
        #else
        self.background(.regularMaterial, in: shape)
        #endif
    }
}

// MARK: - Buttons (compact)

public struct MFCompactButtonStyle: ButtonStyle {
    public enum Kind { case primary, secondary, glass }
    let kind: Kind

    public init(_ kind: Kind = .primary) { self.kind = kind }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(MFTypography.callout.weight(.semibold))
            .padding(.horizontal, MFSpacing.m)
            .padding(.vertical, MFSpacing.xs + 2)
            .foregroundStyle(foreground)
            .background { background }
            .contentShape(Capsule())
            .opacity(configuration.isPressed ? 0.75 : 1)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.snappy(duration: 0.18), value: configuration.isPressed)
    }

    private var foreground: Color {
        switch kind {
        case .primary: .white
        case .secondary, .glass: MFColor.textPrimary
        }
    }

    @ViewBuilder private var background: some View {
        switch kind {
        case .primary: Capsule().fill(MFColor.accent)
        case .secondary: Capsule().fill(MFColor.surface).overlay(Capsule().stroke(MFColor.separator))
        case .glass: Color.clear.mfGlass(in: Capsule(), interactive: true)
        }
    }
}

extension ButtonStyle where Self == MFCompactButtonStyle {
    public static var mfPrimary: MFCompactButtonStyle { .init(.primary) }
    public static var mfSecondary: MFCompactButtonStyle { .init(.secondary) }
    public static var mfGlass: MFCompactButtonStyle { .init(.glass) }
}

// MARK: - Card

public struct MFCard<Content: View>: View {
    private let content: Content
    private let padding: CGFloat

    public init(padding: CGFloat = MFSpacing.m, @ViewBuilder content: () -> Content) {
        self.content = content()
        self.padding = padding
    }

    public var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MFColor.surface, in: RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
            .shadow(color: MFShadow.card.color, radius: MFShadow.card.radius, y: MFShadow.card.y)
    }
}

// MARK: - Badges (honesty labels)

/// Small label used to make data provenance and feature status explicit.
public struct MFBadge: View {
    public enum Kind: Hashable {
        case verified
        case unverified
        case estimate
        case simulation
        case illustrative
        case comingSoon
        case homologation(HomologationStatus)
    }

    let kind: Kind

    public init(_ kind: Kind) { self.kind = kind }

    public var body: some View {
        Label(title, systemImage: symbol)
            .font(MFTypography.captionEmphasized)
            .labelStyle(.titleAndIcon)
            .padding(.horizontal, MFSpacing.xs)
            .padding(.vertical, MFSpacing.xxs)
            .foregroundStyle(MFColor.textPrimary)
            .background(MFColor.background, in: Capsule())
            .overlay(Capsule().stroke(MFColor.separator))
            .accessibilityElement(children: .combine)
    }

    private var title: String {
        switch kind {
        case .verified: "Vérifié"
        case .unverified: "Non vérifié"
        case .estimate: "Estimation"
        case .simulation: "Simulation"
        case .illustrative: "Aperçu illustratif"
        case .comingSoon: "Bientôt disponible"
        case .homologation(let s): s.localizedName
        }
    }

    private var symbol: String {
        switch kind {
        case .verified: "checkmark.seal"
        case .unverified: "questionmark.circle"
        case .estimate: "plusminus"
        case .simulation: "wand.and.stars"
        case .illustrative: "photo.artframe"
        case .comingSoon: "clock"
        case .homologation(let s): s.systemImage
        }
    }
}

// MARK: - Empty / planned states

/// Honest placeholder for a feature or screen that is not available yet.
public struct MFUnavailableView: View {
    let title: String
    let systemImage: String
    let message: String

    public init(_ title: String, systemImage: String, message: String) {
        self.title = title
        self.systemImage = systemImage
        self.message = message
    }

    public var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(message)
        } actions: {
            MFBadge(.comingSoon)
        }
        .foregroundStyle(MFColor.textPrimary)
    }
}

// MARK: - Section header

public struct MFSectionHeader: View {
    let title: String
    public init(_ title: String) { self.title = title }
    public var body: some View {
        Text(title)
            .font(MFTypography.headline)
            .foregroundStyle(MFColor.textPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityAddTraits(.isHeader)
    }
}
#endif
