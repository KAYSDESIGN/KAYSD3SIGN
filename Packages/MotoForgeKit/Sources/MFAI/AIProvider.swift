import Foundation
import MFDomain

/// What an AI backend can do. The app asks for capabilities, never for a vendor.
public enum AICapability: String, CaseIterable, Hashable, Sendable, Codable {
    /// Suggest aesthetic combinations (text/structured output → configuration proposals).
    case styleSuggestions
    /// Assist component segmentation to produce masks for new reference visuals.
    case segmentation
    /// Photorealistic render of a configuration (illustrative preview).
    case photorealisticRender
    /// Localized inpainting (e.g. replace one part) while preserving everything else.
    case localizedEdit
}

/// Constraints every generative request must carry so the model, proportions and existing choices are preserved.
public struct AIPreservationConstraints: Hashable, Sendable, Codable {
    public var vehicleVariantID: MotorcycleVariant.ID
    public var angle: ViewAngle
    /// Current configuration — the source of truth the AI must respect.
    public var configuration: ProjectConfiguration
    /// Region the AI may modify (nil = whole image, only for suggestions/renders).
    public var editableRegion: NormalizedRect?

    public init(vehicleVariantID: MotorcycleVariant.ID, angle: ViewAngle, configuration: ProjectConfiguration, editableRegion: NormalizedRect? = nil) {
        self.vehicleVariantID = vehicleVariantID
        self.angle = angle
        self.configuration = configuration
        self.editableRegion = editableRegion
    }
}

public struct AIImageRequest: Hashable, Sendable {
    public var capability: AICapability
    public var constraints: AIPreservationConstraints
    /// Locally composited image the AI starts from (PNG).
    public var sourceImagePNG: Data
    public var prompt: String

    public init(capability: AICapability, constraints: AIPreservationConstraints, sourceImagePNG: Data, prompt: String) {
        self.capability = capability
        self.constraints = constraints
        self.sourceImagePNG = sourceImagePNG
        self.prompt = prompt
    }
}

public struct AIImageResult: Hashable, Sendable {
    public var imagePNG: Data
    public var providerName: String
    /// Always true for generative output until a human or an automated check validates it.
    /// The UI must then label the image « Aperçu illustratif ».
    public var isIllustrative: Bool

    public init(imagePNG: Data, providerName: String, isIllustrative: Bool = true) {
        self.imagePNG = imagePNG
        self.providerName = providerName
        self.isIllustrative = isIllustrative
    }
}

public struct AIStyleSuggestion: Hashable, Sendable, Codable {
    public var title: String
    public var rationale: String
    public var componentStyles: [MotorcycleComponent.ID: ComponentStyle]

    public init(title: String, rationale: String, componentStyles: [MotorcycleComponent.ID: ComponentStyle]) {
        self.title = title
        self.rationale = rationale
        self.componentStyles = componentStyles
    }
}

public enum AIError: Error, Equatable, Sendable {
    /// No provider configured / feature planned. The UI shows « Bientôt disponible ».
    case unavailable
    case capabilityNotSupported(AICapability)
    case quotaExceeded
    case network(String)
    case rejected(String)
}

/// Vendor-agnostic AI provider.
///
/// Concrete providers call **our backend** (e.g. a Supabase Edge Function) which holds the vendor keys.
/// No vendor key ever ships in the app. Swapping vendors = changing the backend, not the app.
public protocol AIProvider: Sendable {
    var name: String { get }
    var capabilities: Set<AICapability> { get }
    func suggestStyles(for constraints: AIPreservationConstraints, brief: String) async throws -> [AIStyleSuggestion]
    func generateImage(_ request: AIImageRequest) async throws -> AIImageResult
}

/// Default provider for v1: honestly reports that AI features are not available yet.
public struct UnavailableAIProvider: AIProvider {
    public init() {}
    public var name: String { "Indisponible" }
    public var capabilities: Set<AICapability> { [] }
    public func suggestStyles(for constraints: AIPreservationConstraints, brief: String) async throws -> [AIStyleSuggestion] {
        throw AIError.unavailable
    }
    public func generateImage(_ request: AIImageRequest) async throws -> AIImageResult {
        throw AIError.unavailable
    }
}
