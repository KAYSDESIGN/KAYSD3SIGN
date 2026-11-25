import Foundation

/// A stable, human-readable, type-safe identifier.
///
/// Identifiers are slugs such as `honda.cb125r.jc91` and never change once published,
/// so projects saved on device keep resolving after catalog updates.
public struct Identifier<Tag>: Hashable, Sendable, Codable, Comparable,
    ExpressibleByStringLiteral, CustomStringConvertible {
    public let rawValue: String

    public init(_ rawValue: String) {
        self.rawValue = rawValue
    }

    public init(stringLiteral value: String) {
        self.rawValue = value
    }

    public init(from decoder: Decoder) throws {
        rawValue = try decoder.singleValueContainer().decode(String.self)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }

    public var description: String { rawValue }

    public static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }

    /// Builds a child identifier, e.g. `honda.cb125r` + `jc91` → `honda.cb125r.jc91`.
    public func appending<Other>(_ component: String, as _: Other.Type = Other.self) -> Identifier<Other> {
        Identifier<Other>("\(rawValue).\(component)")
    }
}

extension Identifier where Tag == UUIDTag {
    /// Generates a new unique identifier for user-created content (projects, garage entries…).
    public static func generate() -> Self { Self(UUID().uuidString.lowercased()) }
}

/// Tag used for identifiers of user-generated content.
public enum UUIDTag {}
