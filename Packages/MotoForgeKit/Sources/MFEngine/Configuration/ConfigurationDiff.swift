import Foundation
import MFDomain

/// Differences between two configurations (project comparison, before/after).
public struct ConfigurationDiff: Hashable, Sendable {
    public enum ComponentChange: Hashable, Sendable {
        case added(ComponentStyle)
        case removed(ComponentStyle)
        case changed(from: ComponentStyle, to: ComponentStyle)
    }

    public let components: [MotorcycleComponent.ID: ComponentChange]
    public let accessoriesAdded: [AccessoryVariant.ID]
    public let accessoriesRemoved: [AccessoryVariant.ID]

    public var isEmpty: Bool { components.isEmpty && accessoriesAdded.isEmpty && accessoriesRemoved.isEmpty }

    public init(from a: ProjectConfiguration, to b: ProjectConfiguration) {
        var changes: [MotorcycleComponent.ID: ComponentChange] = [:]
        for id in Set(a.componentStyles.keys).union(b.componentStyles.keys) {
            switch (a.componentStyles[id], b.componentStyles[id]) {
            case (nil, let new?): changes[id] = .added(new)
            case (let old?, nil): changes[id] = .removed(old)
            case (let old?, let new?) where old != new: changes[id] = .changed(from: old, to: new)
            default: break
            }
        }
        components = changes
        let aIDs = Set(a.accessories.map(\.variantID)), bIDs = Set(b.accessories.map(\.variantID))
        accessoriesAdded = bIDs.subtracting(aIDs).sorted()
        accessoriesRemoved = aIDs.subtracting(bIDs).sorted()
    }
}
