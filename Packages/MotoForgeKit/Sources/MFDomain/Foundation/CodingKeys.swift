import Foundation

// Dictionaries keyed by these types encode as JSON objects (readable, diff-friendly)
// instead of flat key/value arrays.

extension Identifier: CodingKeyRepresentable {
    public var codingKey: CodingKey { AnyKey(stringValue: rawValue) }
    public init?<T: CodingKey>(codingKey: T) { self.init(codingKey.stringValue) }
}

extension ViewAngle: CodingKeyRepresentable {}

struct AnyKey: CodingKey {
    var stringValue: String
    var intValue: Int? { nil }
    init(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { nil }
}
