// Copies the single source of truth for catalog data (shared with the iOS package) into the web app.
import { copyFileSync, mkdirSync } from 'node:fs'
const src = new URL('../../Packages/MotoForgeKit/Sources/MFCatalog/Resources/catalog.json', import.meta.url)
const dst = new URL('../src/data/catalog.json', import.meta.url)
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
copyFileSync(src, dst)
console.log('catalog synced')
