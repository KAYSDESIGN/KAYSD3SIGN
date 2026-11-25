import Foundation

/// Platform-independent point in normalized image space (0…1 on both axes, origin top-left).
public struct NormalizedPoint: Hashable, Sendable, Codable {
    public var x: Double
    public var y: Double
    public init(x: Double, y: Double) { self.x = x; self.y = y }
    public static let center = NormalizedPoint(x: 0.5, y: 0.5)
}

/// Platform-independent rectangle in normalized image space.
public struct NormalizedRect: Hashable, Sendable, Codable {
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double
    public init(x: Double, y: Double, width: Double, height: Double) {
        self.x = x; self.y = y; self.width = width; self.height = height
    }
    public static let full = NormalizedRect(x: 0, y: 0, width: 1, height: 1)

    public func contains(_ p: NormalizedPoint) -> Bool {
        p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height
    }
}

/// 2D affine placement used for accessories and wrap layers.
public struct Placement: Hashable, Sendable, Codable {
    /// Where the asset's anchor lands in the base image.
    public var position: NormalizedPoint
    /// Uniform scale relative to the asset's reference size for this view.
    public var scale: Double
    /// Rotation in degrees, clockwise.
    public var rotationDegrees: Double

    public init(position: NormalizedPoint = .center, scale: Double = 1, rotationDegrees: Double = 0) {
        self.position = position
        self.scale = scale
        self.rotationDegrees = rotationDegrees
    }

    public static let identity = Placement()
}
