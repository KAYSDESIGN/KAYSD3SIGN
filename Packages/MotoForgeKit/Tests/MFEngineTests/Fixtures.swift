import Foundation
import MFDomain

/// Synthetic test fixtures. NOT catalog data: names and references are deliberately fake.
enum Fixtures {
    static let vehicleID: MotorcycleVariant.ID = "test.bike.v1"
    static let otherVehicleID: MotorcycleVariant.ID = "test.bike.v2"
    static let tank: MotorcycleComponent.ID = "test.bike.v1.tank"
    static let frame: MotorcycleComponent.ID = "test.bike.v1.frame"
    static let mirror: MotorcycleComponent.ID = "test.bike.v1.mirror"
    static let seat: MotorcycleComponent.ID = "test.bike.v1.seat"

    static let verified = Verification(status: .verified, source: "Test source", verifiedAt: Date(timeIntervalSince1970: 1_700_000_000))

    static let red = PaintColor(id: "test.red", name: "Rouge", rgb: RGBColor(red: 1, green: 0, blue: 0))
    static let blue = PaintColor(id: "test.blue", name: "Bleu", rgb: RGBColor(red: 0, green: 0, blue: 1))
    static let black = PaintColor(id: "test.black", name: "Noir", rgb: .black)

    static func view(_ angle: ViewAngle, masks: [ComponentMask]) -> MotorcycleView {
        MotorcycleView(id: Identifier("test.view.\(angle.rawValue)"), angle: angle, baseImageAsset: "base-\(angle.rawValue)",
                       pixelWidth: 2000, pixelHeight: 1500, masks: masks, license: verified)
    }

    static let vehicle = MotorcycleVariant(
        id: vehicleID,
        generationID: "test.bike",
        versionName: "Test",
        colorways: [OriginalColorway(id: "test.colorway.black", name: "Noir", componentMaterials: [frame: Material(baseColor: black)])],
        components: [
            MotorcycleComponent(id: tank, kind: .tank),
            MotorcycleComponent(id: frame, kind: .frame),
            MotorcycleComponent(id: mirror, kind: .other("Rétroviseur d'origine"), supportedModes: []),
            MotorcycleComponent(id: seat, kind: .seat, supportedModes: [.paint])
        ],
        views: [
            view(.leftProfile, masks: [
                ComponentMask(componentID: frame, maskAsset: "lp-frame", bounds: NormalizedRect(x: 0.2, y: 0.3, width: 0.6, height: 0.4), zIndex: 1),
                ComponentMask(componentID: tank, maskAsset: "lp-tank", bounds: NormalizedRect(x: 0.35, y: 0.25, width: 0.25, height: 0.2), zIndex: 5),
                ComponentMask(componentID: mirror, maskAsset: "lp-mirror", bounds: NormalizedRect(x: 0.6, y: 0.05, width: 0.1, height: 0.1), zIndex: 6)
            ]),
            view(.front, masks: [
                ComponentMask(componentID: mirror, maskAsset: "f-mirror", bounds: NormalizedRect(x: 0.1, y: 0.05, width: 0.8, height: 0.1), zIndex: 6),
                ComponentMask(componentID: frame, maskAsset: "f-frame", bounds: NormalizedRect(x: 0.3, y: 0.3, width: 0.4, height: 0.4), zIndex: 1)
            ])
        ]
    )

    static func mirrorAccessory(compatibility: Verification = verified, vehicles: [MotorcycleVariant.ID] = [vehicleID],
                                withFrontVisual: Bool = false) -> (Accessory, AccessoryVariant) {
        var assets = [AccessoryVisualAsset(angle: .leftProfile, assetName: "acc-mirror-lp",
                                           placement: Placement(position: NormalizedPoint(x: 0.65, y: 0.1)),
                                           hidesComponents: [mirror], zIndex: 3, occludedBy: [tank])]
        if withFrontVisual {
            assets.append(AccessoryVisualAsset(angle: .front, assetName: "acc-mirror-f", placement: .identity, hidesComponents: [mirror], zIndex: 6))
        }
        let variant = AccessoryVariant(
            id: "test.acc.mirror.black", accessoryID: "test.acc.mirror", reference: "TEST-000", colorway: "Noir",
            compatibilities: [AccessoryCompatibility(vehicleVariantIDs: vehicles, verification: compatibility)],
            offers: [
                MerchantOffer(merchantName: "Shop A", url: URL(string: "https://example.com/a")!, price: Money(Decimal(string: "89.90")!, "EUR"),
                              shippingCost: Money(Decimal(string: "6.50")!, "EUR"), verification: verified),
                MerchantOffer(merchantName: "Shop B", url: URL(string: "https://example.com/b")!, price: Money(70, "EUR"), verification: .unverified)
            ],
            visualAssets: assets)
        let accessory = Accessory(id: "test.acc.mirror", category: .mirrors, commercialName: "Mirror Test", manufacturer: "TestCo",
                                  description: "Test", variants: [variant], verification: verified)
        return (accessory, variant)
    }
}
