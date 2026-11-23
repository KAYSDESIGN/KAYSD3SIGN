// Sert la version web statique de HotCouple (fichiers embarqués dans le Worker).
import FILES from "./manifest.js";

const TYPES = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8",
  json: "application/json", png: "image/png", ico: "image/x-icon", ttf: "font/ttf", svg: "image/svg+xml", webp: "image/webp" };
const DYNAMIC = [["/daily/", "/daily/[id].html"], ["/quiz/", "/quiz/[id].html"], ["/game/", "/game/[id].html"]];

function resolve(path) {
  if (FILES[path]) return path;
  if (path === "/" && FILES["/index.html"]) return "/index.html";
  const p = path.replace(/\/$/, "");
  if (FILES[p + ".html"]) return p + ".html";
  if (FILES["/(tabs)" + p + ".html"]) return "/(tabs)" + p + ".html";
  for (const [prefix, file] of DYNAMIC) if (p.startsWith(prefix)) return file;
  return null;
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    let path; try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
    const hit = resolve(path);
    const file = hit ?? "/+not-found.html";
    const ext = file.split(".").pop();
    const headers = {
      "content-type": TYPES[ext] ?? "application/octet-stream",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "cache-control": file.startsWith("/_expo/static/") || file.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    };
    return new Response(FILES[file], { status: hit ? 200 : 404, headers });
  },
};
