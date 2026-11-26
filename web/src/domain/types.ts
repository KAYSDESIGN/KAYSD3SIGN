// Domain types. Catalog types mirror the JSON shared with the iOS package (MFDomain Codable encoding).

export type ISODate = string

export interface Verification {
  status: 'verified' | 'unverified'
  source?: string
  sourceURL?: string
  verifiedAt?: ISODate
  notes?: string
}

export interface Money { amount: number; currency: string }

export type ViewAngle = 'front' | 'rear' | 'leftProfile' | 'rightProfile' | 'frontThreeQuarter' | 'rearThreeQuarter'

export interface CatalogComponent { id: string; kind: Record<string, unknown>; displayName: string; supportedModes: string[] }
export interface Colorway { id: string; name: string; manufacturerCodes: string[]; verification: Verification }
export interface Variant {
  id: string; generationID: string; year?: number; versionName: string
  colorways: Colorway[]; components: CatalogComponent[]; verification: Verification
}
export interface Generation { id: string; modelID: string; code: string; firstYear?: number; lastYear?: number; verification: Verification }

export type HomologationStatus = 'approved' | 'approvedWithConditions' | 'notApproved' | 'notVerified'
export interface HomologationRecord {
  countryCode: string; vehicleVariantID: string; mountingConfiguration?: string
  status: HomologationStatus; approvalNumbers: string[]; conditions: string[]; verification: Verification
}
export interface Compatibility { vehicleVariantIDs: string[]; requiredAdapters: string[]; notes?: string; verification: Verification }
export interface Offer { merchantName: string; url: string; price: Money; shippingCost?: Money; taxNote?: string; verification: Verification }
export interface AccessoryVariant {
  id: string; accessoryID: string; reference: string; colorway: string
  compatibilities: Compatibility[]; homologations: HomologationRecord[]; offers: Offer[]
  visualAssets: { angle: ViewAngle }[]
}
export type AccessoryCategory =
  | 'mirrors' | 'exhausts' | 'levers' | 'shifters' | 'footpegs' | 'handlebars' | 'barEnds' | 'grips'
  | 'licensePlateHolders' | 'indicators' | 'lighting' | 'seats' | 'windscreens' | 'engineProtection'
  | 'frameProtection' | 'fairings' | 'fenders' | 'wheels' | 'other'
export interface Accessory {
  id: string; category: AccessoryCategory; commercialName: string; manufacturer: string; manufacturerURL?: string
  description: string; materials: string[]; photos: string[]; variants: AccessoryVariant[]; verification: Verification
}
export interface Catalog {
  schemaVersion: number; revision: number; generatedAt: ISODate
  brands: { id: string; name: string }[]
  models: { id: string; brandID: string; name: string }[]
  generations: Generation[]; variants: Variant[]; accessories: Accessory[]
}

// ---------------------------------------------------------------- materials & customization

export type Finish =
  | 'gloss' | 'matte' | 'satin' | 'metallic' | 'pearl' | 'candy' | 'chameleon' | 'iridescent' | 'holographic'
  | 'chrome' | 'coloredChrome' | 'brushedMetal' | 'anodized' | 'glitter' | 'carbon' | 'forgedCarbon'
  | 'fluorescent' | 'uvReactive' | 'phosphorescent' | 'thermochromic' | 'photochromic' | 'simulatedGlow' | 'marble'

export interface PaintMaterial {
  color: string            // #RRGGBB
  finish: Finish
  secondary?: string       // pearl / chameleon / bi-colour
  gloss: number            // 0…1
  roughness: number        // 0…1
  reflectivity: number     // 0…1
  saturation: number       // 0…2 (1 = unchanged)
  effect: number           // 0…1 (pearl/flake/glow intensity)
  gradient?: { to: string; angle: number }
}

export type WrapLayerKind = 'film' | 'gradient' | 'stripes' | 'checker' | 'sticker' | 'logo' | 'texture'
export interface WrapLayer {
  id: string; kind: WrapLayerKind
  color: string; color2: string
  sticker?: string; image?: string      // sticker asset or data URL (user import)
  x: number; y: number; scale: number; rotation: number; opacity: number
  count?: number
}
export interface Wrap { coverage: 'full' | 'partial'; layers: WrapLayer[]; region?: { from: number; to: number } }

export type ComponentStyle = { type: 'paint'; paint: PaintMaterial } | { type: 'wrap'; wrap: Wrap; base: PaintMaterial }

export interface FittedPart { accessoryID: string; variantID: string; category: AccessoryCategory }

export interface Configuration {
  vehicleVariantID: string
  colorwayID?: string
  styles: Record<string, ComponentStyle>   // key: component slug (tank, fork…)
  parts: FittedPart[]
}

export type LineStatus = 'toBuy' | 'ordered' | 'installed'
export interface ShoppingLine {
  id: string; label: string; kind: 'part' | 'paint' | 'wrap' | 'labor' | 'other'
  variantID?: string; quantity: number
  unit?: Money & { verified: boolean; taxNote?: string }
  shipping?: Money
  status: LineStatus; url?: string
}

export interface Budget { currency: string; maximum?: number; paint?: number; wrap?: number; labor?: number; shipping?: number }

export interface Project {
  id: string; name: string; bikeID: string; configuration: Configuration
  budget: Budget; lines: ShoppingLine[]; favorite: boolean
  history: string[]                 // human-readable change log
  createdAt: ISODate; updatedAt: ISODate
}

export interface Bike { id: string; variantID: string; colorwayID?: string; year?: number; mileageKm?: number; nickname?: string; addedAt: ISODate }
