#if canImport(SwiftUI)
import SwiftUI

// Components reproduced from the validated mockups (docs/mockups/00-planche-v1.png).

// MARK: - Brand

/// « MOTOFORGE » wordmark + slogan (mockup Accueil).
public struct MFWordmark: View {
    public init() {}
    public var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("MOTOFORGE")
                .font(.system(.title, design: .default).weight(.black).italic())
                .foregroundStyle(MFColor.accent)
            Text("Imagine. Personnalise. Roule.")
                .font(MFTypography.caption)
                .foregroundStyle(MFColor.textSecondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("MOTOFORGE. Imagine. Personnalise. Roule.")
    }
}

// MARK: - Segmented control (pill)

/// Pill segmented control: purple selected capsule on a light track (« Mes motos | Historique »).
public struct MFSegmentedControl<Value: Hashable>: View {
    let options: [(Value, String)]
    @Binding var selection: Value
    @Namespace private var ns

    public init(_ options: [(Value, String)], selection: Binding<Value>) {
        self.options = options
        self._selection = selection
    }

    public var body: some View {
        HStack(spacing: 0) {
            ForEach(options, id: \.0) { value, title in
                Button {
                    withAnimation(.snappy(duration: 0.25)) { selection = value }
                } label: {
                    Text(title)
                        .font(MFTypography.callout.weight(.semibold))
                        .foregroundStyle(selection == value ? Color.white : MFColor.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, MFSpacing.xs)
                        .background {
                            if selection == value {
                                Capsule().fill(MFColor.accent).matchedGeometryEffect(id: "pill", in: ns)
                            }
                        }
                        .contentShape(Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selection == value ? .isSelected : [])
            }
        }
        .padding(3)
        .background(MFColor.surface, in: Capsule())
        .sensoryFeedback(.selection, trigger: selection)
    }
}

// MARK: - Chips

/// Filter chip (« Toutes », « Échappement »…).
public struct MFChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    public init(_ title: String, isSelected: Bool, action: @escaping () -> Void) {
        self.title = title
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(MFTypography.caption.weight(.semibold))
                .foregroundStyle(isSelected ? Color.white : MFColor.textPrimary)
                .padding(.horizontal, MFSpacing.s)
                .padding(.vertical, MFSpacing.xs)
                .background(isSelected ? MFColor.accent : MFColor.surface, in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Round icon button

/// Circular icon button (bell, filters, « ••• », cart).
public struct MFIconButton: View {
    public enum Kind { case plain, graphite, accent, glass }
    let systemImage: String
    let label: String
    let kind: Kind
    let size: CGFloat
    let action: () -> Void

    public init(_ systemImage: String, label: String, kind: Kind = .plain, size: CGFloat = 36, action: @escaping () -> Void) {
        self.systemImage = systemImage
        self.label = label
        self.kind = kind
        self.size = size
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: size * 0.42, weight: .semibold))
                .foregroundStyle(foreground)
                .frame(width: size, height: size)
                .background { background }
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }

    private var foreground: Color {
        switch kind {
        case .plain, .glass: MFColor.textPrimary
        case .graphite, .accent: .white
        }
    }

    @ViewBuilder private var background: some View {
        switch kind {
        case .plain: Circle().fill(MFColor.surface)
        case .graphite: Circle().fill(MFColor.graphite)
        case .accent: RoundedRectangle(cornerRadius: MFRadius.small, style: .continuous).fill(MFColor.accent)
        case .glass: Color.clear.mfGlass(in: Circle(), interactive: true)
        }
    }
}

// MARK: - Search field

public struct MFSearchField: View {
    let prompt: String
    @Binding var text: String

    public init(_ prompt: String, text: Binding<String>) {
        self.prompt = prompt
        self._text = text
    }

    public var body: some View {
        HStack(spacing: MFSpacing.xs) {
            Image(systemName: "magnifyingglass").foregroundStyle(MFColor.textPrimary)
            TextField(prompt, text: $text)
                .font(MFTypography.callout)
                #if os(iOS)
                .textInputAutocapitalization(.never)
                #endif
                .autocorrectionDisabled()
                .submitLabel(.search)
            if !text.isEmpty {
                Button { text = "" } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(MFColor.textSecondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Effacer la recherche")
            }
        }
        .padding(.horizontal, MFSpacing.s)
        .padding(.vertical, MFSpacing.s - 2)
        .background(MFColor.surface, in: Capsule())
    }
}

// MARK: - Quick access tile

/// Square tile (« Mon garage », « Atelier »…). Highlighted tile uses the soft accent tint.
public struct MFQuickTile: View {
    let title: String
    let systemImage: String
    let isHighlighted: Bool
    let action: () -> Void

    public init(_ title: String, systemImage: String, isHighlighted: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.isHighlighted = isHighlighted
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: MFSpacing.xs) {
                Image(systemName: systemImage)
                    .font(.system(size: 22, weight: .regular))
                    .foregroundStyle(isHighlighted ? MFColor.accent : MFColor.textPrimary)
                Text(title)
                    .font(.system(.caption2).weight(.medium))
                    .foregroundStyle(MFColor.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 72)
            .background(isHighlighted ? MFColor.accentSoft : MFColor.surface,
                        in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }
}

// MARK: - Wide primary button (mockup bottom CTA)

/// Full-width purple capsule, used once per screen as in the mockups (« Ajouter au projet »).
public struct MFWideButton: View {
    let title: String
    let systemImage: String?
    let action: () -> Void
    @State private var taps = 0

    public init(_ title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    public var body: some View {
        Button {
            taps += 1
            action()
        } label: {
            HStack(spacing: MFSpacing.xs) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title)
            }
            .font(MFTypography.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, MFSpacing.s + 2)
            .background(MFColor.accent, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.impact(weight: .light), trigger: taps)
    }
}

// MARK: - Progress

public struct MFProgressBar: View {
    let value: Double
    public init(_ value: Double) { self.value = min(max(value, 0), 1) }
    public var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(MFColor.track)
                Capsule().fill(MFColor.accent).frame(width: geo.size.width * value)
            }
        }
        .frame(height: 6)
        .accessibilityElement()
        .accessibilityValue("\(Int((value * 100).rounded())) %")
    }
}

/// Budget ring (mockup « Budget projet »).
public struct MFRing<Center: View>: View {
    let value: Double
    let center: Center
    public init(_ value: Double, @ViewBuilder center: () -> Center) {
        self.value = min(max(value, 0), 1)
        self.center = center()
    }
    public var body: some View {
        ZStack {
            Circle().stroke(MFColor.accentSoft, lineWidth: 14)
            Circle()
                .trim(from: 0, to: value)
                .stroke(MFColor.accent, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.smooth, value: value)
            center
        }
    }
}

/// Carousel page indicator.
public struct MFPageDots: View {
    let count: Int
    let index: Int
    public init(count: Int, index: Int) { self.count = count; self.index = index }
    public var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<count, id: \.self) { i in
                Circle()
                    .fill(i == index ? MFColor.accent : MFColor.textSecondary.opacity(0.3))
                    .frame(width: 6, height: 6)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Page \(index + 1) sur \(count)")
    }
}

// MARK: - Swatches

/// Round paint swatch with selection ring (mockup « Couleur du réservoir »).
public struct MFColorSwatch: View {
    let color: Color
    let name: String
    let isSelected: Bool
    let action: () -> Void

    public init(color: Color, name: String, isSelected: Bool, action: @escaping () -> Void) {
        self.color = color
        self.name = name
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Circle()
                .fill(color)
                // Subtle sphere shading so swatches read as paint, not flat UI.
                .overlay(Circle().fill(.radialGradient(colors: [.white.opacity(0.45), .clear],
                                                       center: .init(x: 0.3, y: 0.25), startRadius: 0, endRadius: 22)))
                .overlay(Circle().stroke(.black.opacity(0.08)))
                .frame(width: 38, height: 38)
                .padding(3)
                .overlay(Circle().stroke(isSelected ? MFColor.accent : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(name)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Floating tab bar

public struct MFTabItem<Value: Hashable>: Identifiable {
    public let value: Value
    public let title: String
    public let systemImage: String
    public var id: Value { value }
    public init(_ value: Value, title: String, systemImage: String) {
        self.value = value
        self.title = title
        self.systemImage = systemImage
    }
}

/// Floating navigation bar (mockup): icons only, purple capsule on the selected item,
/// native Liquid Glass background on iOS 26+.
public struct MFFloatingTabBar<Value: Hashable>: View {
    let items: [MFTabItem<Value>]
    @Binding var selection: Value
    @Namespace private var ns

    public init(items: [MFTabItem<Value>], selection: Binding<Value>) {
        self.items = items
        self._selection = selection
    }

    public var body: some View {
        HStack(spacing: 0) {
            ForEach(items) { item in
                Button {
                    withAnimation(.snappy(duration: 0.28)) { selection = item.value }
                } label: {
                    Image(systemName: item.systemImage)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(selection == item.value ? Color.white : MFColor.textPrimary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background {
                            if selection == item.value {
                                Capsule().fill(MFColor.accent).matchedGeometryEffect(id: "tab", in: ns)
                                    .padding(.horizontal, 4)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.title)
                .accessibilityIdentifier("tab.\(item.title)")
                .accessibilityAddTraits(selection == item.value ? [.isSelected, .isButton] : .isButton)
            }
        }
        .padding(6)
        .mfGlass(in: Capsule(), interactive: true)
        .shadow(color: .black.opacity(0.06), radius: 10, y: 4)
        .sensoryFeedback(.selection, trigger: selection)
    }
}
#endif

#if canImport(SwiftUI)
import MFDomain

/// Visual sample of a finish (mockup « Finition » cards). Illustrative swatch, not a physical render.
public struct MFFinishSample: View {
    let effect: PaintEffect
    let color: Color
    let secondary: Color?

    public init(effect: PaintEffect, color: Color, secondary: Color? = nil) {
        self.effect = effect
        self.color = color
        self.secondary = secondary
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: MFRadius.small, style: .continuous)
            .fill(color)
            .overlay {
                RoundedRectangle(cornerRadius: MFRadius.small, style: .continuous)
                    .fill(LinearGradient(stops: shine, startPoint: .topLeading, endPoint: .bottomTrailing))
            }
            .overlay {
                if effect.usesFlakes {
                    Canvas { ctx, size in
                        var rng = SeededRandom(seed: 7)
                        for _ in 0..<Int(size.width * size.height / 18) {
                            let p = CGPoint(x: rng.next() * size.width, y: rng.next() * size.height)
                            ctx.fill(Path(ellipseIn: CGRect(origin: p, size: CGSize(width: 1.2, height: 1.2))), with: .color(.white.opacity(0.5 * rng.next())))
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: MFRadius.small, style: .continuous))
                }
            }
            .overlay(RoundedRectangle(cornerRadius: MFRadius.small, style: .continuous).stroke(.black.opacity(0.08)))
            .accessibilityHidden(true)
    }

    private var shine: [Gradient.Stop] {
        let tint = secondary ?? .white
        switch effect {
        case .matte:
            return [.init(color: .white.opacity(0.04), location: 0), .init(color: .black.opacity(0.08), location: 1)]
        case .satin:
            return [.init(color: .white.opacity(0.22), location: 0), .init(color: .clear, location: 0.6), .init(color: .black.opacity(0.15), location: 1)]
        case .pearl, .chameleon, .iridescent:
            return [.init(color: tint.opacity(0.55), location: 0), .init(color: .clear, location: 0.5), .init(color: .black.opacity(0.25), location: 1)]
        default:
            return [.init(color: .white.opacity(0.6), location: 0), .init(color: .white.opacity(0.05), location: 0.35),
                    .init(color: .clear, location: 0.6), .init(color: .black.opacity(0.3), location: 1)]
        }
    }
}

/// Deterministic generator so swatches don't flicker between renders.
struct SeededRandom {
    private var state: UInt64
    init(seed: UInt64) { state = seed &* 0x9E3779B97F4A7C15 }
    mutating func next() -> CGFloat {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return CGFloat(state >> 33) / CGFloat(UInt32.max >> 1)
    }
}

/// Finish card with name (mockup: « Brillant », « Satiné », « Mat », « Métallisé »).
public struct MFFinishCard: View {
    let effect: PaintEffect
    let color: Color
    let isSelected: Bool
    let action: () -> Void

    public init(effect: PaintEffect, color: Color, isSelected: Bool, action: @escaping () -> Void) {
        self.effect = effect
        self.color = color
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: MFSpacing.xxs) {
                MFFinishSample(effect: effect, color: color).frame(height: 34)
                Text(effect.localizedName).font(.system(.caption2).weight(.medium)).foregroundStyle(MFColor.textPrimary)
            }
            .padding(4)
            .background(isSelected ? MFColor.accentSoft : .clear, in: RoundedRectangle(cornerRadius: MFRadius.small + 2, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: MFRadius.small + 2, style: .continuous).stroke(isSelected ? MFColor.accent : .clear, lineWidth: 1.5))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(effect.localizedName)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Glass mode button overlaid on the stage (mockup: Couleur · Finition · Pièces).
public struct MFStageModeButton: View {
    let title: String
    let systemImage: String
    let isSelected: Bool
    let action: () -> Void

    public init(_ title: String, systemImage: String, isSelected: Bool, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: MFSpacing.xxs) {
                Image(systemName: systemImage).font(.system(size: 18, weight: .medium))
                Text(title).font(.system(.caption).weight(.medium))
            }
            .foregroundStyle(isSelected ? Color.white : MFColor.textPrimary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, MFSpacing.s)
            .background {
                if isSelected {
                    RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous).fill(MFColor.accent)
                } else {
                    Color.clear.mfGlass(in: RoundedRectangle(cornerRadius: MFRadius.medium, style: .continuous), interactive: true)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(title)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
#endif

#if canImport(SwiftUI)
// MARK: - Studio building blocks (designed from the validated mockups' card language)

/// White rounded card with a section title, used by studios and settings.
public struct MFPanel<Content: View>: View {
    let title: String?
    let trailing: AnyView?
    let content: Content

    public init(_ title: String? = nil, trailing: AnyView? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.trailing = trailing
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: MFSpacing.s) {
            if title != nil || trailing != nil {
                HStack {
                    if let title { MFSectionHeader(title) }
                    Spacer(minLength: 0)
                    if let trailing { trailing }
                }
            }
            content
        }
        .padding(MFSpacing.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(MFColor.surface, in: RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
    }
}

/// Labelled slider with value readout, accent-tinted.
public struct MFSliderRow: View {
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let format: (Double) -> String

    public init(_ label: String, value: Binding<Double>, in range: ClosedRange<Double>, format: @escaping (Double) -> String) {
        self.label = label
        self._value = value
        self.range = range
        self.format = format
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(label).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
                Spacer()
                Text(format(value)).font(MFTypography.callout.monospacedDigit()).foregroundStyle(MFColor.textSecondary)
            }
            Slider(value: $value, in: range)
                .tint(MFColor.accent)
                .accessibilityLabel(label)
                .accessibilityValue(format(value))
        }
    }

    public static func percent(_ v: Double) -> String { "\(Int((v * 100).rounded())) %" }
    public static func degrees(_ v: Double) -> String { "\(Int(v.rounded()))°" }
}

/// Settings-style row inside an MFPanel: icon, title, trailing value/accessory.
public struct MFRow<Trailing: View>: View {
    let systemImage: String
    let title: String
    let trailing: Trailing

    public init(_ title: String, systemImage: String, @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.systemImage = systemImage
        self.trailing = trailing()
    }

    public var body: some View {
        HStack(spacing: MFSpacing.s) {
            Image(systemName: systemImage)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(MFColor.accent)
                .frame(width: 32, height: 32)
                .background(MFColor.accentSoft, in: RoundedRectangle(cornerRadius: MFRadius.small, style: .continuous))
            Text(title).font(MFTypography.callout).foregroundStyle(MFColor.textPrimary)
            Spacer(minLength: MFSpacing.xs)
            trailing
        }
        .padding(.vertical, MFSpacing.xxs)
        .accessibilityElement(children: .combine)
    }
}
#endif
