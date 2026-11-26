import type { Accessory, AccessoryVariant, Catalog, HomologationStatus, Offer, Verification } from './types'

export const isTrustworthy = (v?: Verification) => !!v && v.status === 'verified' && !!v.source && !!v.verifiedAt

export const isVerifiedCompatible = (v: AccessoryVariant, vehicleID: string) =>
  v.compatibilities.some((c) => isTrustworthy(c.verification) && c.vehicleVariantIDs.includes(vehicleID))

/** Only references with a sourced fitment for this vehicle are ever shown. */
export function compatibleAccessories(catalog: Catalog, vehicleID: string): Accessory[] {
  return catalog.accessories
    .map((a) => ({ ...a, variants: a.variants.filter((v) => isVerifiedCompatible(v, vehicleID)) }))
    .filter((a) => a.variants.length > 0)
}

/** Never inferred from a product name: only sourced records for this country + vehicle (+ mounting) count. */
export function homologation(v: AccessoryVariant, country: string, vehicleID: string, mounting?: string) {
  const records = v.homologations.filter((h) => isTrustworthy(h.verification) && h.countryCode === country.toUpperCase() && h.vehicleVariantID === vehicleID)
  const match = records.find((h) => h.mountingConfiguration && h.mountingConfiguration === mounting) ?? records.find((h) => !h.mountingConfiguration)
  return { status: (match?.status ?? 'notVerified') as HomologationStatus, record: match }
}

export const HOMOLOGATION_LABEL: Record<HomologationStatus, string> = {
  approved: 'Homologué', approvedWithConditions: 'Homologué sous conditions', notApproved: 'Non homologué', notVerified: 'Non vérifié',
}

/** Cheapest verified offer in the preferred currency, else cheapest verified offer in its own currency (never converted). */
export function displayOffer(v: AccessoryVariant, currency = 'EUR'): Offer | undefined {
  const verified = v.offers.filter((o) => isTrustworthy(o.verification))
  const pool = verified.length ? verified : v.offers
  const inCur = pool.filter((o) => o.price.currency === currency)
  return [...(inCur.length ? inCur : pool)].sort((a, b) => a.price.amount - b.price.amount)[0]
}

export function findVariant(catalog: Catalog, variantID: string): { accessory: Accessory; variant: AccessoryVariant } | undefined {
  for (const accessory of catalog.accessories) {
    const variant = accessory.variants.find((v) => v.id === variantID)
    if (variant) return { accessory, variant }
  }
}

export const CATEGORY_LABEL: Record<string, string> = {
  mirrors: 'Rétroviseurs', exhausts: 'Échappements', levers: 'Leviers', shifters: 'Sélecteurs', footpegs: 'Repose-pieds',
  handlebars: 'Guidons', barEnds: 'Embouts', grips: 'Poignées', licensePlateHolders: 'Supports de plaque', indicators: 'Clignotants',
  lighting: 'Éclairage', seats: 'Selles', windscreens: 'Bulles', engineProtection: 'Protections moteur', frameProtection: 'Protections cadre',
  fairings: 'Carénages', fenders: 'Garde-boue', wheels: 'Jantes', other: 'Autres',
}
