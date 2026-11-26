import Foundation
import MFDomain

public enum ConfigurationError: Error, Equatable, Sendable {
    case unknownComponent(MotorcycleComponent.ID)
    case modeNotSupported(MotorcycleComponent.ID, CustomizationMode)
    case accessoryNotCompatible(AccessoryVariant.ID)
    case accessoryNotInConfiguration(AccessoryVariant.ID)
    case variantMismatch
}

/// Applies changes to a `ProjectConfiguration` with validation and undo/redo.
///
/// The editor is the only way the workshop mutates a configuration, which guarantees that every
/// change is validated against the vehicle, recorded in history, and independent of the view angle.
public struct ConfigurationEditor: Sendable {
    public private(set) var vehicle: MotorcycleVariant
    public private(set) var history: History<ProjectConfiguration>

    public var configuration: ProjectConfiguration { history.present }

    public init(vehicle: MotorcycleVariant, configuration: ProjectConfiguration, historyLimit: Int = 100) throws {
        guard configuration.vehicleVariantID == vehicle.id else { throw ConfigurationError.variantMismatch }
        self.vehicle = vehicle
        self.history = History(configuration, limit: historyLimit)
    }

    /// Same vehicle with another visual set (e.g. personal photos vs 3D renders). History is kept.
    public func replacingVehicleVisuals(with variant: MotorcycleVariant) throws -> ConfigurationEditor {
        guard variant.id == vehicle.id else { throw ConfigurationError.variantMismatch }
        var copy = self
        copy.vehicle = variant
        return copy
    }

    // MARK: Read

    /// Style actually shown for a component: user override, else the original colorway, else nil (base image).
    public func effectiveStyle(of componentID: MotorcycleComponent.ID) -> ComponentStyle? {
        if let style = configuration.componentStyles[componentID] { return style }
        guard let colorwayID = configuration.originalColorwayID,
              let colorway = vehicle.colorways.first(where: { $0.id == colorwayID }),
              let material = colorway.componentMaterials[componentID] else { return nil }
        return .paint(material)
    }

    public func isModified(_ componentID: MotorcycleComponent.ID) -> Bool {
        configuration.componentStyles[componentID] != nil
    }

    // MARK: Components

    public mutating func setPaint(_ material: Material, on componentID: MotorcycleComponent.ID) throws {
        let component = try validate(componentID, mode: .paint)
        var next = configuration
        next.componentStyles[componentID] = .paint(material)
        history.record(next, label: "Peinture · \(component.displayName)")
    }

    /// Applies the same material to several components at once (single undo step).
    public mutating func setPaint(_ material: Material, on componentIDs: [MotorcycleComponent.ID]) throws {
        for id in componentIDs { _ = try validate(id, mode: .paint) }
        var next = configuration
        for id in componentIDs { next.componentStyles[id] = .paint(material) }
        history.record(next, label: "Peinture · \(componentIDs.count) éléments")
    }

    public mutating func setWrap(_ wrap: WrapDesign, on componentID: MotorcycleComponent.ID) throws {
        let component = try validate(componentID, mode: .wrap)
        var next = configuration
        next.componentStyles[componentID] = .wrap(wrap)
        history.record(next, label: "Covering · \(component.displayName)")
    }

    public mutating func resetComponent(_ componentID: MotorcycleComponent.ID) throws {
        guard let component = vehicle.component(componentID) else { throw ConfigurationError.unknownComponent(componentID) }
        var next = configuration
        next.componentStyles[componentID] = nil
        history.record(next, label: "Origine · \(component.displayName)")
    }

    public mutating func resetToOriginal() {
        var next = configuration
        next.componentStyles = [:]
        next.accessories = []
        history.record(next, label: "Retour à l'origine")
    }

    // MARK: Accessories

    /// Fits an accessory. Only references with a verified compatibility for this vehicle are accepted.
    /// An accessory replaces any other accessory of the same category (except `.other`).
    public mutating func fit(_ accessory: Accessory, variant: AccessoryVariant) throws {
        guard CompatibilityChecker.isVerifiedCompatible(variant, with: vehicle.id) else {
            throw ConfigurationError.accessoryNotCompatible(variant.id)
        }
        var next = configuration
        if accessory.category != .other {
            next.accessories.removeAll { $0.category == accessory.category }
        }
        next.accessories.removeAll { $0.variantID == variant.id }
        next.accessories.append(AccessorySelection(accessoryID: accessory.id, variantID: variant.id, category: accessory.category))
        history.record(next, label: "Accessoire · \(accessory.commercialName)")
    }

    public mutating func remove(accessoryVariant variantID: AccessoryVariant.ID) throws {
        guard configuration.accessories.contains(where: { $0.variantID == variantID }) else {
            throw ConfigurationError.accessoryNotInConfiguration(variantID)
        }
        var next = configuration
        next.accessories.removeAll { $0.variantID == variantID }
        history.record(next, label: "Retrait d'accessoire")
    }

    public mutating func adjustPlacement(of variantID: AccessoryVariant.ID, angle: ViewAngle, to placement: Placement) throws {
        guard let index = configuration.accessories.firstIndex(where: { $0.variantID == variantID }) else {
            throw ConfigurationError.accessoryNotInConfiguration(variantID)
        }
        var next = configuration
        next.accessories[index].placementAdjustments[angle] = placement
        history.record(next, label: "Ajustement d'accessoire")
    }

    // MARK: History

    public mutating func undo() { history.undo() }
    public mutating func redo() { history.redo() }

    // MARK: Private

    private func validate(_ id: MotorcycleComponent.ID, mode: CustomizationMode) throws -> MotorcycleComponent {
        guard let component = vehicle.component(id) else { throw ConfigurationError.unknownComponent(id) }
        guard component.supportedModes.contains(mode) else { throw ConfigurationError.modeNotSupported(id, mode) }
        return component
    }
}
