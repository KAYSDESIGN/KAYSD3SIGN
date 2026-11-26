import * as THREE from 'three'
import type { PaintMaterial, Wrap } from '../domain/types'

/** Pattern kinds evaluated in the fragment shader from world position (meshes have no UVs). */
const KIND = { film: 0, gradient: 1, stripes: 2, checker: 3, carbon: 4, forged: 5, marble: 6 } as const
const MAX = 4

interface PatternLayer { kind: number; c1: string; c2: string; angle: number; scale: number; x: number; y: number; opacity: number; count: number }

const vec3 = (hex: string) => new THREE.Color(hex)

const GLSL = /* glsl */ `
uniform vec3 uBoxMin; uniform vec3 uBoxSize; uniform int uCount; uniform vec2 uRegion;
uniform int uKind[${MAX}]; uniform vec3 uC1[${MAX}]; uniform vec3 uC2[${MAX}]; uniform vec4 uP[${MAX}]; uniform vec2 uQ[${MAX}];
varying vec3 vWorld;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.; a*=.5; } return v; }
vec3 patternColor(int k, vec3 c1, vec3 c2, vec4 P, float count, vec2 uv, out float m){
  float a = P.x; vec2 q = uv - vec2(.5 + P.z, .5 + P.w); q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
  float s = max(P.y, .05); m = 1.;
  if (k == 1) return mix(c1, c2, clamp(q.x / s + .5, 0., 1.));
  if (k == 2) { float w = .06 * s; float gap = .04 * s; float n = max(count, 1.); float total = n * w + (n - 1.) * gap;
    float y = q.y + total * .5; float cell = mod(y, w + gap); m = (y > 0. && y < total && cell < w) ? 1. : 0.; return c1; }
  if (k == 3) { vec2 g = floor(q / (.06 * s)); m = 1.; return mod(g.x + g.y, 2.) < 1. ? c1 : c2; }
  if (k == 4) { vec2 g = q / (.012 * s); float tw = mod(floor(g.x) + floor(g.y), 2.); float sh = .5 + .5 * sin(g.x * 3.1416);
    return mix(vec3(.04), vec3(.16), tw * .6 + sh * .25); }
  if (k == 5) { float n = fbm(q * 18. / s); return mix(vec3(.03), vec3(.2), smoothstep(.35, .75, n)); }
  if (k == 6) { float v = abs(sin((q.x + fbm(q * 6. / s) * 1.6) * 12.)); return mix(c2, c1, smoothstep(.0, .9, v)); }
  return c1;
}
`

/** Applies pattern layers on top of a physical material (wraps, carbon, marble). */
function withPatterns(mat: THREE.MeshPhysicalMaterial, layers: PatternLayer[], box: THREE.Box3, region: [number, number]) {
  if (!layers.length) return mat
  const size = box.getSize(new THREE.Vector3())
  const pad = <T,>(arr: T[], fill: T) => [...arr, ...Array(MAX).fill(fill)].slice(0, MAX)
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uBoxMin: { value: box.min.clone() }, uBoxSize: { value: size }, uCount: { value: Math.min(layers.length, MAX) },
      uRegion: { value: new THREE.Vector2(region[0], region[1]) },
      uKind: { value: pad(layers.map((l) => l.kind), 0) },
      uC1: { value: pad(layers.map((l) => vec3(l.c1)), new THREE.Color()) },
      uC2: { value: pad(layers.map((l) => vec3(l.c2)), new THREE.Color()) },
      uP: { value: pad(layers.map((l) => new THREE.Vector4(l.angle * Math.PI / 180, l.scale, l.x - 0.5, 0.5 - l.y)), new THREE.Vector4()) },
      uQ: { value: pad(layers.map((l) => new THREE.Vector2(l.opacity, l.count)), new THREE.Vector2()) },
    })
    shader.vertexShader = 'varying vec3 vWorld;\n' + shader.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = GLSL + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 pn = (vWorld - uBoxMin) / max(uBoxSize, vec3(1e-4));
      vec2 uvp = vec2(pn.x, pn.y);
      if (pn.x >= uRegion.x && pn.x <= uRegion.y) {
        for (int i = 0; i < ${MAX}; i++) { if (i >= uCount) break; float m;
          vec3 c = patternColor(uKind[i], uC1[i], uC2[i], uP[i], uQ[i].y, uvp, m);
          diffuseColor.rgb = mix(diffuseColor.rgb, c, clamp(uQ[i].x * m, 0., 1.)); }
      }`)
  }
  mat.customProgramCacheKey = () => JSON.stringify(layers.map((l) => l.kind)) + layers.length
  return mat
}

function adjusted(hex: string, saturation: number) {
  const c = new THREE.Color(hex); const hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl)
  return c.setHSL(hsl.h, Math.min(1, hsl.s * saturation), hsl.l)
}

/** PBR material for a paint (all 23 finishes). Effects marked « Simulation » in FINISHES are approximations. */
export function paintMaterial(p: PaintMaterial, box: THREE.Box3): THREE.MeshPhysicalMaterial {
  const color = adjusted(p.color, p.saturation)
  const sec = new THREE.Color(p.secondary ?? '#FFFFFF')
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: p.roughness, metalness: 0, clearcoat: p.gloss, clearcoatRoughness: Math.max(0.02, p.roughness * 0.5), envMapIntensity: 0.6 + p.reflectivity })
  const patterns: PatternLayer[] = []
  const e = p.effect
  switch (p.finish) {
    case 'metallic': m.metalness = 0.55; break
    case 'pearl': m.sheen = e; m.sheenColor = sec; m.sheenRoughness = 0.35; m.iridescence = 0.25 * e; break
    case 'candy': m.metalness = 0.35; m.roughness = 0.08; m.clearcoat = 1; break
    case 'chameleon': m.iridescence = e; m.iridescenceIOR = 1.8; m.iridescenceThicknessRange = [250, 900]; m.sheen = 0.6; m.sheenColor = sec; m.metalness = 0.4; break
    case 'iridescent': m.iridescence = e; m.iridescenceIOR = 1.3; m.iridescenceThicknessRange = [100, 600]; break
    case 'holographic': m.iridescence = 1; m.iridescenceIOR = 2.2; m.iridescenceThicknessRange = [100, 1400]; m.metalness = 0.85; m.roughness = 0.12; break
    case 'chrome': case 'coloredChrome': m.metalness = 1; m.roughness = Math.min(p.roughness, 0.08); m.clearcoat = 0; break
    case 'brushedMetal': m.metalness = 1; m.anisotropy = 0.9; m.clearcoat = 0; break
    case 'anodized': m.metalness = 0.9; m.clearcoat = 0.2; break
    case 'glitter': m.metalness = 0.6; m.sheen = e; m.sheenColor = new THREE.Color('#FFFFFF'); m.sheenRoughness = 0.15; break
    case 'carbon': patterns.push({ kind: KIND.carbon, c1: p.color, c2: p.color, angle: 45, scale: 1, x: 0.5, y: 0.5, opacity: 1, count: 1 }); break
    case 'forgedCarbon': patterns.push({ kind: KIND.forged, c1: p.color, c2: p.color, angle: 0, scale: 1, x: 0.5, y: 0.5, opacity: 1, count: 1 }); break
    case 'marble': patterns.push({ kind: KIND.marble, c1: p.color, c2: p.secondary ?? '#FFFFFF', angle: 20, scale: 1, x: 0.5, y: 0.5, opacity: 1, count: 1 }); break
    case 'fluorescent': m.emissive = color.clone(); m.emissiveIntensity = 0.45 * e; break
    case 'uvReactive': m.emissive = sec.clone(); m.emissiveIntensity = 0.6 * e; break
    case 'phosphorescent': m.emissive = new THREE.Color(p.secondary ?? '#9BFF7A'); m.emissiveIntensity = 0.8 * e; break
    case 'thermochromic': case 'photochromic': m.color.lerp(sec, e); break
    case 'simulatedGlow': m.emissive = color.clone(); m.emissiveIntensity = 1.6 * e; break
  }
  if (p.gradient) patterns.push({ kind: KIND.gradient, c1: p.color, c2: p.gradient.to, angle: p.gradient.angle, scale: 1, x: 0.5, y: 0.5, opacity: 1, count: 1 })
  return withPatterns(m, patterns, box, [0, 1])
}

/** Wrap: base film/paint + pattern layers (stickers, logos and textures are decals, see BikeModel). */
export function wrapMaterial(base: PaintMaterial, wrap: Wrap, box: THREE.Box3) {
  const m = paintMaterial(base, box)
  // Films and patterns are shader layers so a partial covering stays inside its region.
  const layers: PatternLayer[] = wrap.layers
    .filter((l) => l.kind === 'film' || l.kind === 'gradient' || l.kind === 'stripes' || l.kind === 'checker')
    .map((l) => ({ kind: KIND[l.kind as 'gradient'], c1: l.color, c2: l.color2, angle: l.rotation, scale: l.scale, x: l.x, y: l.y, opacity: l.opacity, count: l.count ?? 2 }))
  const region: [number, number] = wrap.coverage === 'partial' && wrap.region ? [wrap.region.from, wrap.region.to] : [0, 1]
  return withPatterns(m, layers, box, region)
}

/**
 * Repaint of a photo-textured (reconstructed) component: the chosen paint replaces the albedo, and the texture's
 * luminance, normalised by the component's mean luminance (lumMean, computed by tools/recon3d/assemble.py in linear
 * space), keeps the photographed shading and details. Chains any pattern shader already set on the material.
 */
export function withTextureShading(mat: THREE.MeshPhysicalMaterial, map: THREE.Texture, lumMean: number) {
  const prev = mat.onBeforeCompile
  const prevKey = mat.customProgramCacheKey.bind(mat)
  mat.map = map
  mat.onBeforeCompile = (shader, renderer) => {
    prev.call(mat, shader, renderer)
    shader.uniforms.uLumMean = { value: Math.max(lumMean, 0.005) }
    shader.fragmentShader = 'uniform float uLumMean;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', '')
      .replace('#include <alphamap_fragment>', `#ifdef USE_MAP
        float photoL = dot(texture2D(map, vMapUv).rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb *= clamp(photoL / uLumMean, 0.0, 2.2);
      #endif
      #include <alphamap_fragment>`)
  }
  mat.customProgramCacheKey = () => 'tex-shading|' + prevKey()
  return mat
}
