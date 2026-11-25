import Foundation

/// Snapshot-based undo/redo history.
///
/// Configurations are small value types, so storing snapshots is simpler and more robust than
/// inverse commands, and guarantees undo restores exactly the previous state.
public struct History<State: Equatable & Sendable>: Sendable {
    /// A state paired with the label of the change that separates it from its neighbour.
    struct Entry: Sendable {
        let state: State
        let label: String
    }

    public private(set) var present: State
    private var past: [Entry] = []
    private var future: [Entry] = []
    public let limit: Int

    public init(_ initial: State, limit: Int = 100) {
        present = initial
        self.limit = max(1, limit)
    }

    public var canUndo: Bool { !past.isEmpty }
    public var canRedo: Bool { !future.isEmpty }
    /// Label of the change that `undo()` would revert.
    public var undoLabel: String? { past.last?.label }
    /// Label of the change that `redo()` would re-apply.
    public var redoLabel: String? { future.last?.label }
    /// Applied changes, oldest first (modification history).
    public var changeLog: [String] { past.map(\.label) }

    /// Records a new state. No-op when the state is unchanged.
    public mutating func record(_ newState: State, label: String) {
        guard newState != present else { return }
        past.append(Entry(state: present, label: label))
        if past.count > limit { past.removeFirst(past.count - limit) }
        future.removeAll()
        present = newState
    }

    @discardableResult
    public mutating func undo() -> Bool {
        guard let entry = past.popLast() else { return false }
        future.append(Entry(state: present, label: entry.label))
        present = entry.state
        return true
    }

    @discardableResult
    public mutating func redo() -> Bool {
        guard let entry = future.popLast() else { return false }
        past.append(Entry(state: present, label: entry.label))
        present = entry.state
        return true
    }
}
