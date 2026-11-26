// Deploys web/dist as a single Cloudflare Worker (free plan, workers.dev).
// Every built file is embedded as a binary module, so no asset-upload token is needed:
// only the standard Workers Scripts API (authenticated by CLOUDFLARE_API_TOKEN or the session proxy).
// Usage: CLOUDFLARE_ACCOUNT_ID=… [CLOUDFLARE_API_TOKEN=…] node scripts/deploy-worker.mjs [script-name]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID
const TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? 'proxy-injected'
const NAME = process.argv[2] ?? 'motoforge'
if (!ACCOUNT) throw new Error('CLOUDFLARE_ACCOUNT_ID is required')

const DIST = new URL('../dist/', import.meta.url).pathname
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
}

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? walk(p) : [p]
})
const files = walk(DIST).filter((p) => !p.endsWith('wrangler.json'))
if (!files.some((p) => p.endsWith('index.html'))) throw new Error('dist/index.html missing: run npm run build first')

const entries = files.map((p, i) => ({ route: '/' + relative(DIST, p), module: `f${i}.bin`, type: TYPES[extname(p)] ?? 'application/octet-stream', path: p }))

const worker = `${entries.map((e, i) => `import f${i} from './${e.module}'`).join('\n')}
const FILES = {${entries.map((e, i) => `${JSON.stringify(e.route)}: [f${i}, ${JSON.stringify(e.type)}]`).join(',\n')}}
export default {
  fetch(request) {
    const url = new URL(request.url)
    let path = decodeURIComponent(url.pathname)
    if (path.endsWith('/')) path += 'index.html'
    let hit = FILES[path]
    if (!hit && !/\\.[a-z0-9]+$/i.test(path)) hit = FILES['/index.html']
    if (!hit) return new Response('Not found', { status: 404 })
    const immutable = path.startsWith('/assets/')
    const noCache = path === '/sw.js' || path.endsWith('.html') || path === '/manifest.webmanifest' || path === '/registerSW.js'
    return new Response(hit[0], { headers: {
      'content-type': hit[1],
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : noCache ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
    } })
  },
}
`

const form = new FormData()
form.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: '2025-01-01' })], { type: 'application/json' }))
form.append('worker.js', new Blob([worker], { type: 'application/javascript+module' }), 'worker.js')
for (const e of entries) form.append(e.module, new Blob([readFileSync(e.path)], { type: 'application/octet-stream' }), e.module)

const api = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${NAME}`
const headers = { Authorization: `Bearer ${TOKEN}` }
const up = await fetch(api, { method: 'PUT', headers, body: form }).then((r) => r.json())
if (!up.success) { console.error(JSON.stringify(up.errors)); process.exit(1) }
const sub = await fetch(`${api}/subdomain`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) }).then((r) => r.json())
if (!sub.success) { console.error(JSON.stringify(sub.errors)); process.exit(1) }
const acct = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/subdomain`, { headers }).then((r) => r.json())
console.log(`Deployed ${entries.length} files → https://${NAME}.${acct.result.subdomain}.workers.dev`)
