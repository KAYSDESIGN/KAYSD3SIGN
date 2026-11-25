import SwiftUI
import MFDomain
import MFEngine
import MFDesignSystem

/// Mode « Détails » : the small parts (levers, calipers, handlebar, covers, fork, guard) with quick
/// colour and finish choices, applied one part at a time with live rendering.
struct DetailsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var vm: WorkshopViewModel

    private static let detailKinds: [ComponentKind] = [.levers, .brakeCalipers, .handlebar, .engineCovers, .fork, .protections]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: MFSpacing.m) {
                    WorkshopStage(vm: vm)
                        .frame(height: 230)
                        .clipShape(RoundedRectangle(cornerRadius: MFRadius.card, style: .continuous))
                    ForEach(vm.components.filter { Self.detailKinds.contains($0.kind) }) { component in
                        MFPanel(component.displayName, trailing: AnyView(resetButton(component))) {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: MFSpacing.xs) {
                                    ForEach(PaintPresets.quickColors) { c in
                                        MFColorSwatch(color: c.rgb.swiftUIColor, name: c.name, isSelected: current(component)?.baseColor.rgb.hexString == c.rgb.hexString) {
                                            vm.selectedComponentID = component.id
                                            vm.apply(MFDomain.Material(baseColor: c, effect: current(component)?.effect ?? .metallic))
                                        }
                                    }
                                }
                            }
                            HStack(spacing: MFSpacing.xs) {
                                ForEach(PaintPresets.quickEffects, id: \.self) { e in
                                    MFChip(e.localizedName, isSelected: current(component)?.effect == e) {
                                        vm.selectedComponentID = component.id
                                        let color = current(component)?.baseColor ?? PaintPresets.quickColors[3]
                                        vm.apply(MFDomain.Material(baseColor: color, effect: e))
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, MFSpacing.screen)
                .padding(.bottom, MFSpacing.l)
            }
            .background(MFColor.background.ignoresSafeArea())
            .navigationTitle("Détails")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Terminé") { dismiss() } }
        }
    }

    private func current(_ c: MotorcycleComponent) -> MFDomain.Material? {
        if case .paint(let m)? = vm.editor?.effectiveStyle(of: c.id) { return m }
        return nil
    }

    private func resetButton(_ c: MotorcycleComponent) -> some View {
        Button("Origine") {
            vm.selectedComponentID = c.id
            vm.resetSelected()
        }
        .font(MFTypography.caption.weight(.semibold))
        .disabled(!vm.isModified(c.id))
    }
}
