// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MotoForgeKit",
    defaultLocalization: "fr",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "MFDomain", targets: ["MFDomain"]),
        .library(name: "MFEngine", targets: ["MFEngine"]),
        .library(name: "MFCatalog", targets: ["MFCatalog"]),
        .library(name: "MFAI", targets: ["MFAI"]),
        .library(name: "MFPersistence", targets: ["MFPersistence"]),
        .library(name: "MFDesignSystem", targets: ["MFDesignSystem"]),
        .library(name: "MFRendering", targets: ["MFRendering"])
    ],
    targets: [
        // Pure domain models. No UI, no persistence framework.
        .target(name: "MFDomain"),

        // Pure business logic: configuration, history, render plan, color, budget, homologation.
        .target(name: "MFEngine", dependencies: ["MFDomain"]),

        // Catalog repositories (bundled JSON now, remote later) + strict data validation.
        .target(
            name: "MFCatalog",
            dependencies: ["MFDomain"],
            resources: [.process("Resources")]
        ),

        // AI provider abstraction. No provider SDK, no keys.
        .target(name: "MFAI", dependencies: ["MFDomain"]),

        // Project storage: SwiftData on Apple platforms, in-memory everywhere.
        .target(name: "MFPersistence", dependencies: ["MFDomain"]),

        // Design tokens and reusable SwiftUI components (Apple platforms only).
        .target(name: "MFDesignSystem", dependencies: ["MFDomain"]),

        // Core Image compositor for render plans (Apple platforms only).
        .target(name: "MFRendering", dependencies: ["MFDomain", "MFEngine"]),

        .testTarget(name: "MFDomainTests", dependencies: ["MFDomain"]),
        .testTarget(name: "MFEngineTests", dependencies: ["MFEngine", "MFDomain"]),
        .testTarget(name: "MFCatalogTests", dependencies: ["MFCatalog", "MFDomain", "MFEngine"]),
        .testTarget(name: "MFPersistenceTests", dependencies: ["MFPersistence", "MFDomain"])
    ]
)
