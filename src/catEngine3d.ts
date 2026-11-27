import * as THREE from 'three';
import {
  resolveCatContour,
  type CatContourResolved,
  type CatEarShape,
  type CatSkinConfig,
} from './catSkins';
import type { KeyboardLayoutId } from './keyboardLayout';
import type { CatHitZone, KeyboardOrientation, PeekEdge, TailKeyMode } from './catEngine';
import { DEFAULT_TAIL_KEY_IDS } from './catEngine';
import { catAudio } from './audio';
import {
  FurShaderSystem,
  resolveFurPalette3D,
  type FurPalette3D,
  type RenderStyle3D,
} from './furShader3d';
import {
  KeyboardAndMouse3D,
  Spring1D,
  Spring3D,
  TaperTube3D,
  approach,
  clamp,
  mergeStaticGeometries,
  mix,
  smoothstep,
} from './keyboard3d';
import { getKeyLabel, getKeyBubble, type KeyboardLang } from './keyboardLayout';

export type CollarColorId = 'none' | 'red' | 'blue' | 'pink' | 'green';

const COLLAR_COLORS: Record<Exclude<CollarColorId, 'none'>, string> = {
  red: '#d9483b',
  blue: '#3d7cc9',
  pink: '#e57b98',
  green: '#4fa368',
};

const EYE_MAX_RX = 0.175;
const EYE_MAX_RY = 0.160;
const Z_SCALE = 0.82;
const BODY_H = 1.98;
const HEAD_CY = 1.56;

interface PawTrack3D {
  side: -1 | 1;
  pos: THREE.Vector3;
  from: THREE.Vector3;
  last: THREE.Vector3;
  spring: Spring3D;
  keyId: string | null;
  t0: number;
  dur: number;
  down: boolean;
  lastActive: number;
  tuckWeight: number;
}

interface Popup3D {
  keyId: string;
  sprite: THREE.Sprite;
  baseW: number;
  baseH: number;
  t0: number;
  upAt: number | null;
  side: -1 | 1;
}

interface Fx3D {
  sprite: THREE.Sprite;
  kind: 'bang' | 'dust' | 'z' | 'heart' | 'sparkle' | 'sneeze';
  vel: THREE.Vector3;
  t0: number;
  dur: number;
  size: number;
  baseX: number;
}

interface IdleAct3D {
  kind: 'tilt' | 'ear' | 'slowBlink' | 'look' | 'tail' | 'doze' | 'yawn' | 'stretch' | 'groom' | 'knead';
  t0: number;
  dur: number;
  side: -1 | 1;
}

interface SimpleLimb3D {
  fill: TaperTube3D;
  caps: THREE.Mesh[];
  update(point: (t: number, out: THREE.Vector3) => void, radius: (t: number) => number): void;
}

/**
 * Limb end caps are plain spheres, so they carry no `along` attribute and the fur shader reads
 * them as along=0 (limb root). Bake the correct value per instance so tail/arm tips keep their
 * tip colour while still allowing clean per-instance GPU disposal.
 */
function createCapGeometry(along: number): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const count = geo.attributes.position.count;
  geo.setAttribute('along', new THREE.BufferAttribute(new Float32Array(count).fill(along), 1));
  return geo;
}

function createCleanLimb(
  parent: THREE.Object3D,
  opts: {
    segments: number;
    radial: number;
    fill: THREE.Material;
    capGeoStart: THREE.BufferGeometry;
    capGeoEnd: THREE.BufferGeometry;
    order?: number;
    capStart?: boolean;
    capEnd?: boolean;
  },
): SimpleLimb3D {
  const order = opts.order ?? 0;
  const fill = new TaperTube3D(opts.segments, opts.radial, opts.fill, order);
  parent.add(fill.mesh);

  const caps: THREE.Mesh[] = [];
  const capTs: number[] = [];
  if (opts.capStart !== false) capTs.push(0);
  if (opts.capEnd !== false) capTs.push(1);
  for (let i = 0; i < capTs.length; i++) {
    const cap = new THREE.Mesh(capTs[i] >= 1 ? opts.capGeoEnd : opts.capGeoStart, opts.fill);
    cap.renderOrder = order;
    parent.add(cap);
    caps.push(cap);
  }
  const tmp = new THREE.Vector3();

  return {
    fill,
    caps,
    update(point, radius) {
      fill.update(point, radius);
      capTs.forEach((t, idx) => {
        point(t, tmp);
        const r = Math.max(0.002, radius(t));
        caps[idx].position.copy(tmp);
        caps[idx].scale.setScalar(r);
      });
    },
  };
}

function withTowardEye(mat: THREE.Material, lift: number): THREE.Material {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      mvPosition.xyz -= normalize(mvPosition.xyz) * ${lift.toFixed(4)};
      gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  return mat;
}

const spriteTexCache = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>();
const MAX_POPUP_TEX_CACHE = 48;

function disposeSpriteTexCache(): void {
  for (const entry of spriteTexCache.values()) {
    entry.tex.dispose();
  }
  spriteTexCache.clear();
}

function getPopupTexture(text: string): { tex: THREE.CanvasTexture; aspect: number } {
  const key = `pop:${text}`;
  const hit = spriteTexCache.get(key);
  if (hit) return hit;

  if (spriteTexCache.size >= MAX_POPUP_TEX_CACHE) {
    for (const [oldKey, oldEntry] of spriteTexCache) {
      if (oldKey.startsWith('pop:')) {
        oldEntry.tex.dispose();
        spriteTexCache.delete(oldKey);
        break;
      }
    }
  }

  const h = 110;
  const font = '700 48px "Segoe UI", system-ui, sans-serif';
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = font;
  const w = Math.max(114, Math.ceil(probe.measureText(text).width) + 52);

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const r = 24;
  g.fillStyle = '#fbfaf3';
  g.strokeStyle = '#24262e';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(r + 4, 5);
  g.lineTo(w - r - 4, 5);
  g.quadraticCurveTo(w - 4, 5, w - 4, r + 5);
  g.lineTo(w - 4, h - r - 5);
  g.quadraticCurveTo(w - 4, h - 5, w - r - 4, h - 5);
  g.lineTo(r + 4, h - 5);
  g.quadraticCurveTo(4, h - 5, 4, h - r - 5);
  g.lineTo(4, r + 5);
  g.quadraticCurveTo(4, 5, r + 4, 5);
  g.closePath();
  g.fill();
  g.stroke();

  g.fillStyle = '#181a20';
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const entry = { tex, aspect: w / h };
  spriteTexCache.set(key, entry);
  return entry;
}

function getFxTexture(kind: 'z' | 'anger' | 'bang' | 'dust' | 'heart' | 'sparkle' | 'sneeze'): THREE.CanvasTexture {
  const key = `fx:${kind}`;
  const hit = spriteTexCache.get(key);
  if (hit) return hit.tex;

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d')!;
  if (kind === 'z') {
    g.font = '800 84px "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 14;
    g.strokeStyle = '#15161c';
    g.strokeText('Z', 64, 68);
    g.fillStyle = '#f8f8f2';
    g.fillText('Z', 64, 68);
  } else if (kind === 'anger') {
    g.lineCap = 'round';
    const drawArcs = () => {
      for (const [cx, cy, a0, a1] of [
        [24, 24, 0.1, 1.45],
        [104, 24, 1.7, 3.05],
        [104, 104, 3.25, 4.6],
        [24, 104, 4.82, 6.18],
      ]) {
        g.beginPath();
        g.arc(cx, cy, 31, a0, a1);
        g.stroke();
      }
    };
    g.strokeStyle = '#14151a';
    g.lineWidth = 28;
    drawArcs();
    g.stroke();
    g.strokeStyle = '#e5483d';
    g.lineWidth = 14;
    drawArcs();
    g.stroke();
  } else if (kind === 'bang') {
    g.beginPath();
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      const r = i % 2 ? 26 : 58;
      if (i === 0) g.moveTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      else g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#fbfaf3';
    g.fill();
    g.strokeStyle = '#1d1d1b';
    g.lineWidth = 7;
    g.stroke();
  } else if (kind === 'heart') {
    g.beginPath();
    g.moveTo(64, 108);
    g.bezierCurveTo(6, 62, 16, 12, 64, 42);
    g.bezierCurveTo(112, 12, 122, 62, 64, 108);
    g.closePath();
    g.fillStyle = '#ffcb52';
    g.fill();
    g.strokeStyle = '#241f1c';
    g.lineWidth = 9;
    g.lineJoin = 'round';
    g.stroke();
  } else if (kind === 'sparkle') {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 54 : 15;
      if (i === 0) g.moveTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      else g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#fff5b8';
    g.fill();
    g.strokeStyle = '#332e22';
    g.lineWidth = 6;
    g.lineJoin = 'round';
    g.stroke();
  } else if (kind === 'sneeze') {
    g.beginPath();
    g.arc(64, 64, 38, 0, Math.PI * 2);
    g.fillStyle = '#e7f5ff';
    g.fill();
    g.strokeStyle = '#fbfaf3';
    g.lineWidth = 10;
    g.stroke();
  } else {
    g.beginPath();
    g.arc(64, 64, 44, 0, Math.PI * 2);
    g.fillStyle = '#f4f1e6';
    g.fill();
    g.strokeStyle = '#b9b4a4';
    g.lineWidth = 8;
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  spriteTexCache.set(key, { tex, aspect: 1 });
  return tex;
}

function makeSoftShadowTex(): THREE.CanvasTexture {
  const key = 'shadow:cat';
  const hit = spriteTexCache.get(key);
  if (hit) return hit.tex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 28, 128, 128, 122);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.50)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  spriteTexCache.set(key, { tex, aspect: 1 });
  return tex;
}

function makeBlushTexture(): THREE.CanvasTexture {
  const key = 'blush:soft';
  const hit = spriteTexCache.get(key);
  if (hit) return hit.tex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.52)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  spriteTexCache.set(key, { tex, aspect: 1 });
  return tex;
}

/**
 * Analytical anti-aliased GLSL eye shader reproducing original KuroCat's signature eyes:
 * - Luminous lemon-chartreuse almond-oval with subtle cheeky outward tilt (±0.10 rad)
 * - Clean calm Black Cat stare (no distracting permanent dots), popping starlight catchlights in Curious mode
 * - Zero-seam slanted grumpy upper eyelid clip revealing real 3D shaded fur/mask underneath
 * - Strict inside-iris pupil clipping & real 3D depthTest occlusion when orbiting behind the cat
 */
function createEyeShaderMaterial(side: -1 | 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSide: { value: side },
      uScale: { value: new THREE.Vector2(0.156 / EYE_MAX_RX, 0.136 / EYE_MAX_RY) },
      uTilt: { value: side * -0.09 },
      uEyeTop: { value: new THREE.Color('#d7f346') },
      uEyeBottom: { value: new THREE.Color('#bde62c') },
      uPupilCol: { value: new THREE.Color('#0c0d0f') },
      uLashCol: { value: new THREE.Color('#0b0c10') },
      uPupilCenter: { value: new THREE.Vector2(0, 0) },
      uPupilRad: { value: new THREE.Vector2(0.43, 0.67) },
      uPupilShape: { value: 0 },
      uCross: { value: 0 },
      uRestSquint: { value: 0 },
      uCurious: { value: 0 },
      uShineAmt: { value: 0 },
      uIs3D: { value: 1 },
      uLimbalAmt: { value: 0.28 },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.FrontSide,
    vertexShader: `
      varying vec2 vEye;
      void main() {
        vEye = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uSide;
      uniform vec2 uScale;
      uniform float uTilt;
      uniform vec3 uEyeTop;
      uniform vec3 uEyeBottom;
      uniform vec3 uPupilCol;
      uniform vec3 uLashCol;
      uniform vec2 uPupilCenter;
      uniform vec2 uPupilRad;
      uniform float uPupilShape;
      uniform float uCross;
      uniform float uRestSquint;
      uniform float uCurious;
      uniform float uShineAmt;
      uniform float uIs3D;
      uniform float uLimbalAmt;
      varying vec2 vEye;

      void main() {
        // Apply KuroCat's subtle cheeky outward eye tilt
        float ct = cos(uTilt);
        float st = sin(uTilt);
        vec2 rotEye = vec2(vEye.x * ct - vEye.y * st, vEye.x * st + vEye.y * ct);
        vec2 p = rotEye / max(uScale, vec2(0.05));

        float r = length(p);
        float aa = max(fwidth(r), 0.016);
        float outerMask = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, r);
        if (outerMask < 0.004) discard;

        // Zero-seam upper eyelid (grumpy angled brow + optional Tibetan-fox resting half-lidded squint)
        float lidAlpha = 1.0;
        float lashMask = 0.0;
        float lidShadow = 0.0;
        if (uCross > 0.01 || uRestSquint > 0.01) {
          float crossY = uCross > 0.01 ? (mix(1.18, 0.22, uCross) + uSide * p.x * 0.34 * uCross) : 2.0;
          float restY = uRestSquint > 0.01 ? mix(1.06, -0.08, uRestSquint) : 2.0;
          float lidY = min(crossY, restY);
          float lidAmt = max(uCross, uRestSquint);
          float lashH = 0.105 * smoothstep(0.05, 0.32, lidAmt);
          float lidDist = p.y - lidY;
          if (lidDist > lashH + aa) discard;
          lidAlpha = 1.0 - smoothstep(lashH - aa, lashH + aa, lidDist);
          lashMask = smoothstep(-aa, aa, lidDist);
          lidShadow = smoothstep(-0.24, 0.0, lidDist) * 0.22 * lidAmt;
        }

        // Luminous glass-cabochon iris gradient
        float ty = clamp(0.5 - p.y * 0.5, 0.0, 1.0);
        vec3 col = mix(uEyeTop, uEyeBottom, ty);
        if (uIs3D > 0.5) {
          col *= mix(1.0, 0.88, smoothstep(0.26, 0.94, p.y));
          float crescent = smoothstep(0.08, 0.85, -p.y) * (1.0 - smoothstep(0.68, 0.94, r));
          col = mix(col, min(col * 1.18 + vec3(0.04), vec3(1.0)), crescent * 0.36);
        }
        float limbal = smoothstep(0.84, 0.98, r);
        col = mix(col, col * 0.50 + vec3(0.01), limbal * uLimbalAmt);

        // Crisp analytical pupil strictly clipped inside iris boundary (oval / round / sharp cat slit / dot / star)
        vec2 pd = (p - uPupilCenter) / max(uPupilRad, vec2(0.05));
        float pr;
        if (uPupilShape > 1.5 && uPupilShape < 2.5) {
          // Sharp vertical feline slit
          float pinch = max(0.24, 1.0 - 0.66 * clamp(pd.y * pd.y, 0.0, 1.0));
          pr = length(vec2(pd.x / pinch, pd.y));
        } else {
          pr = length(pd);
        }
        float paa = max(fwidth(pr), 0.032);
        float pupilMask = (1.0 - smoothstep(1.0 - paa, 1.0 + paa, pr)) * (1.0 - smoothstep(0.90, 0.96, r));
        col = mix(col, uPupilCol, pupilMask);

        if (uPupilShape > 3.5) {
          // Sparkling 4-point star highlight inside pupil
          vec2 sp = abs(pd) * 1.18;
          float starR = pow(pow(sp.x, 0.52) + pow(sp.y, 0.52), 1.92);
          float starMask = (1.0 - smoothstep(0.68, 0.84, starR)) * pupilMask;
          col = mix(col, vec3(1.0), starMask * 0.92);
        }

        col *= (1.0 - lidShadow);

        // Specular catchlights (off on calm Black Cat for iconic KuroCat gaze; sparkles in Curious & light breeds!)
        if (uShineAmt > 0.02) {
          float sAmt = clamp(uShineAmt, 0.0, 1.35);
          vec2 d1 = p - (uPupilCenter * 0.42 + vec2(-0.28, 0.32));
          float r1 = 0.205 * sAmt;
          float h1 = 1.0 - smoothstep(r1 - 0.026, r1 + 0.020, length(d1));

          vec2 d2 = p - (uPupilCenter * 0.34 + vec2(0.29, -0.30));
          float r2 = 0.10 * sAmt;
          float h2 = 1.0 - smoothstep(r2 - 0.022, r2 + 0.018, length(d2));

          float h3 = 0.0;
          if (uCurious > 0.15) {
            vec2 d3 = p - (uPupilCenter * 0.30 + vec2(-0.36, -0.17));
            float r3 = 0.085 * uCurious;
            h3 = 1.0 - smoothstep(r3 - 0.020, r3 + 0.016, length(d3));
          }
          float hi = clamp(max(h1, max(h2, h3)), 0.0, 1.0) * (1.0 - smoothstep(0.90, 0.97, r));
          col = mix(col, vec3(1.0), hi * min(1.0, uShineAmt * 1.15));
        }

        col = mix(col, uLashCol, lashMask);

        float alpha = outerMask * lidAlpha;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Lightweight studio-lit plastic / plush / brushed-metal shader for 3D gaming headphones.
 * Matches KuroCat's volumetric fur key light in `3d` mode and switches cleanly to flat cel colors in `3d-flat`.
 */
function createHeadsetMaterial(
  hexColor: string,
  specStrength = 0.22,
  rimStrength = 0.24,
  rimHex = '#8ea2c4',
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color(hexColor) },
      uRim: { value: new THREE.Color(rimHex) },
      uSpec: { value: specStrength },
      uRimAmt: { value: rimStrength },
      uIs3D: { value: 1 },
    },
    vertexShader: `
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uBase;
      uniform vec3 uRim;
      uniform float uSpec;
      uniform float uRimAmt;
      uniform float uIs3D;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        vec3 col = uBase;
        if (uIs3D > 0.5) {
          vec3 N = normalize(vNormalV);
          vec3 V = normalize(vViewPos);
          vec3 L = normalize(vec3(-0.35, 0.72, 0.60));
          float ndl = dot(N, L);
          float wrap = clamp(ndl * 0.52 + 0.58, 0.22, 1.15);
          col = uBase * mix(0.62, 1.18, wrap);
          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 26.0) * uSpec;
          float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4) * uRimAmt;
          col += vec3(spec) + uRim * fres;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Original KuroCat 3D Engine:
 * Sculpted directly from KuroCat's iconic continuous BODY_SLICES mochi-pear silhouette
 * (NO KeyCat white sticker rim, NO bobblehead neck seam, NO tall KeyCat ears, NO wired mouse).
 */
export class KuroCatEngine3D {
  public showKeyBubbles = true;
  public privacyMode = false;

  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly desk: KeyboardAndMouse3D;
    private keyboardLang: KeyboardLang = 'en';
    private readonly furSystem = new FurShaderSystem();

  private readonly catRoot = new THREE.Group();
  private readonly homePos = new THREE.Vector3(0.02, 0, -0.02);
  private readonly capGeoStart = createCapGeometry(0);
  private readonly capGeoEnd = createCapGeometry(1);
  private bodyGeo: THREE.LatheGeometry;
  private earGeo: THREE.BufferGeometry;
  private disposed = false;
  private readonly bodyMesh: THREE.Mesh;
  private outlineSamplePts: THREE.Vector3[];
  private currentContour: CatContourResolved = resolveCatContour(null);
  private lastContourKey = '';
  private tailFluffy = false;
  private earMountX = 0.295;
  private earMountY = 0.255;
  private earBaseTilt = 0.06;
  private earBaseScale = 1.0;
  private eyePatchRx = EYE_MAX_RX;
  private eyePatchRy = EYE_MAX_RY;
  private noseBaseY = -0.042;
  private mouthEnabled = true;
  private whiskerMesh!: THREE.Mesh;
  private eyebrowMesh!: THREE.Mesh;
  private noseMesh!: THREE.Mesh;
  private mouthTube!: TaperTube3D;
  private blepMesh!: THREE.Mesh;
  private readonly eyebrowMat = new THREE.MeshBasicMaterial({
    color: '#4a3d35',
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private readonly blepMat = new THREE.MeshBasicMaterial({
    color: '#f489a0',
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  private readonly yawnGroup = new THREE.Group();
  private readonly lickTongueMesh!: THREE.Mesh;
  private readonly catShadow!: THREE.Mesh;
  private readonly hindPaws: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number }> = [];
  private readonly tailHitMeshes: THREE.Object3D[] = [];

  // Head mount tracks exact head pivot inside the continuous one-piece body mesh
  private readonly headMount = new THREE.Group();
  private readonly headsetGroup = new THREE.Group();
  private readonly headsetShaderMats: THREE.ShaderMaterial[] = [];
  private readonly headsetLedMat = new THREE.MeshBasicMaterial({ color: '#d4f53d' });
  private readonly headsetMicLedMat = new THREE.MeshBasicMaterial({ color: '#52f7d4' });
  private readonly sHeadset = new Spring1D(0, 5.4, 0.70);
  private headsetOn = false;
  private readonly collarGroup = new THREE.Group();
  private readonly collarMat: THREE.MeshBasicMaterial;
  private readonly bellGroup = new THREE.Group();
  private readonly collarY = 1.32;
  private readonly collarR: number;

  private readonly ears: Array<{ group: THREE.Group; mesh: THREE.Mesh; s: -1 | 1; tilt: number }> = [];
  private readonly eyes: Array<{
    s: -1 | 1;
    mesh: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    closedArc: THREE.Mesh;
    closedArcTube: TaperTube3D;
    squintSlit: THREE.Mesh;
    squintSlitTube: TaperTube3D;
    happyArc: THREE.Mesh;
    happyArcTube: TaperTube3D;
    blush: THREE.Mesh;
  }> = [];
  private readonly faceGroup = new THREE.Group();

  // Shared materials updated on skin switch
  private readonly pawMat: THREE.ShaderMaterial;
  private readonly toeMat = new THREE.MeshBasicMaterial({ color: '#343640', depthTest: true });
  private readonly lidArcMat = new THREE.MeshBasicMaterial({
    color: '#d4f044',
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private readonly squintMat = new THREE.MeshBasicMaterial({
    color: '#d4f044',
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private readonly whiskerMat = new THREE.MeshBasicMaterial({
    color: '#d4d8e0',
    transparent: true,
    opacity: 0.62,
    depthTest: true,
    depthWrite: false,
  });
  private readonly noseMat = new THREE.MeshBasicMaterial({
    color: '#ee8e9e',
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private readonly mouthMat = new THREE.MeshBasicMaterial({
    color: '#5c524c',
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  private readonly blushMat = new THREE.MeshBasicMaterial({
    color: '#f4889e',
    map: makeBlushTexture(),
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  private readonly tuckLineMat = new THREE.MeshBasicMaterial({
    color: '#aeb4c0',
    transparent: true,
    opacity: 0.36,
    depthTest: true,
    depthWrite: false,
  });

  // Articulated sleek arms & graceful tail
  private readonly arms: Array<{
    s: -1 | 1;
    limb: SimpleLimb3D;
    paw: THREE.Mesh;
    tuckArc: THREE.Mesh;
    shoulderLocal: THREE.Vector3;
    shoulder: THREE.Vector3;
    c1: THREE.Vector3;
    c2: THREE.Vector3;
    hand: THREE.Vector3;
  }> = [];
  private readonly tailLimb: SimpleLimb3D;
  private readonly tailCurve: THREE.CatmullRomCurve3;
  // Sleek graceful KuroCat tail curving smoothly out to the right & gently curling up at tip
  private readonly tailRestPts = [
    new THREE.Vector3(0.56, 0.24, -0.14),
    new THREE.Vector3(0.84, 0.16, -0.18),
    new THREE.Vector3(1.10, 0.24, -0.20),
    new THREE.Vector3(1.26, 0.42, -0.18),
    new THREE.Vector3(1.36, 0.56, -0.16),
    new THREE.Vector3(1.48, 0.62, -0.14),
  ];
  private readonly tailSleepPts = [
    new THREE.Vector3(0.56, 0.12, -0.14),
    new THREE.Vector3(0.96, 0.10, 0.02),
    new THREE.Vector3(1.14, 0.10, 0.30),
    new THREE.Vector3(1.04, 0.10, 0.58),
    new THREE.Vector3(0.82, 0.10, 0.72),
    new THREE.Vector3(0.56, 0.10, 0.76),
  ];
  private readonly tailThumpPts = [
    new THREE.Vector3(0.56, 0.24, -0.14),
    new THREE.Vector3(0.84, 0.12, -0.12),
    new THREE.Vector3(1.08, 0.06, -0.02),
    new THREE.Vector3(1.26, 0.05, 0.10),
    new THREE.Vector3(1.42, 0.05, 0.18),
    new THREE.Vector3(1.56, 0.06, 0.22),
  ];
  private readonly tailStretchPts = [
    new THREE.Vector3(0.54, 0.28, -0.16),
    new THREE.Vector3(0.76, 0.56, -0.24),
    new THREE.Vector3(0.92, 0.92, -0.28),
    new THREE.Vector3(0.98, 1.24, -0.26),
    new THREE.Vector3(0.90, 1.46, -0.20),
    new THREE.Vector3(0.76, 1.54, -0.14),
  ];
  private readonly tailScruffPts = [
    new THREE.Vector3(0.50, 0.14, -0.16),
    new THREE.Vector3(0.68, -0.06, -0.18),
    new THREE.Vector3(0.78, -0.26, -0.16),
    new THREE.Vector3(0.82, -0.44, -0.12),
    new THREE.Vector3(0.76, -0.56, -0.06),
    new THREE.Vector3(0.66, -0.62, 0.0),
  ];
  private readonly tailRecoilPts = [
    new THREE.Vector3(0.52, 0.16, -0.12),
    new THREE.Vector3(0.68, 0.12, 0.04),
    new THREE.Vector3(0.72, 0.10, 0.22),
    new THREE.Vector3(0.62, 0.10, 0.36),
    new THREE.Vector3(0.46, 0.10, 0.42),
    new THREE.Vector3(0.32, 0.10, 0.42),
  ];

  private readonly angerSprite: THREE.Sprite;
  private readonly popups: Popup3D[] = [];
  private readonly fxList: Fx3D[] = [];
  private readonly petMeshes: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();

  // 240Hz Springs
  private readonly sShift = new Spring1D(0, 1.85, 0.72);
  private readonly sHunch = new Spring1D(0, 1.75, 0.78);
  private readonly sSquash = new Spring1D(0, 2.3, 0.54);
  private readonly sYaw = new Spring1D(0, 2.8, 0.72);
  private readonly sPitch = new Spring1D(-0.04, 2.6, 0.70);
  private readonly sRoll = new Spring1D(0, 2.4, 0.62);
  private readonly sGazeX = new Spring1D(0, 9.2, 0.94);
  private readonly sGazeY = new Spring1D(0, 9.2, 0.94);
  private readonly sEars = new Spring1D(0, 5.2, 0.36);
  private readonly sCross = new Spring1D(0, 1.8, 0.88);
  private readonly sCurious = new Spring1D(0, 3.6, 0.74);
  private readonly sDeskHop = new Spring1D(0, 9.2, 0.34);
  private readonly sScruff = new Spring1D(0, 5.0, 0.72);
  private readonly sScruffSwing = new Spring1D(0, 2.9, 0.24);
  private readonly sTailRecoil = new Spring1D(0, 7.6, 0.42);
  private readonly sPeek = new Spring1D(0, 4.4, 0.72);
  private readonly sPeekHover = new Spring1D(0, 5.8, 0.74);

  // Turntable 360° orbit camera springs (0 = iconic KuroCat elevated front angle)
  private orbitAzimuthTarget = 0;
  private orbitElevTarget = 24.5;
  private readonly sOrbitAz = new Spring1D(0, 4.2, 0.86);
  private readonly sOrbitEl = new Spring1D(24.5, 4.2, 0.86);
  private readonly camAnchor = new THREE.Vector3(0.06, 0.82, 0.36);

  // State machine
    private currentSkin: CatSkinConfig | null = null;
    private currentPalette: FurPalette3D | null = null;
    private renderStyle: RenderStyle3D = '3d';
      private collarId: CollarColorId = 'none';
      private chromaKeyBg: string | null = null;
      private embedded = false;
      private renderScale = 1.0;
      private tailKeyMode: TailKeyMode = 'smart';
      private tailKeyIdSet = new Set<string>(DEFAULT_TAIL_KEY_IDS);
      private bend = { x: 0, z: 0, squash: 0, bellySwell: 0 };
    private headRot = { pitch: -0.04, yaw: 0, roll: 0 };

  private paws: { L: PawTrack3D; R: PawTrack3D };
  private tailTap = {
    keyId: null as string | null,
    t0: -100,
    dur: 0.17,
    from: 0,
    down: false,
    landAt: -100,
    reach: 0,
    hover: 0.12,
    tip: new THREE.Vector3(),
  };

  private rafId: number | null = null;
  private idleTimer: number | null = null;
  private isIdlePacing = false;
  private lastFrameMs = 0;
  private directRafPrevMs = 0;
  private vsyncMs = 16.67;
  private vsyncSamples = 0;
  private gameActive = false;
  private lastCamKey = '';
  private elapsed = 0;
  private lastInput = 0;
  private lastKey = -100;
  private lastMouse = -100;
  private lastMouseNX = 0.5;
  private lastMouseNY = 0.5;
  private lastCursorRelX = 0.5;
  private lastCursorRelY = 0.5;
  private leftMouseDown = false;
  private rightMouseDown = false;
  private cursorNdc = new THREE.Vector2(0, 0);
  private cursorActiveAt = -100;
  private pointerSamples: Array<{ t: number; dist: number }> = [];
  private lastSampleX: number | null = null;
  private lastSampleY: number | null = null;
  private lastSampleT = -100;

  private petting = false;
  private petUntil = -100;
  private petX = 0;
  private rub = 0;
  private squintAmt = 0;
  private asleep = false;
  private sleepAmt = 0;
  private wakeAt = -100;
  private nextBlink = 2.8;
  private nextZ = 0;
  private privacyClose = 0;

  private strokes: number[] = [];
  private excite = 0;
  private tailPhase = 0;
  private annoy = 0;
  private lastPoke = -100;
  private isCross = false;
  private crossSince = -100;
  private crossHuffDir: -1 | 1 = -1;
  private thumpPhase = 0;
  private thumpLift = 0;
  private thumpLash = 0;
  private lastSlam = -100;
  private curiousUntil = -100;
  private idleAct: IdleAct3D | null = null;
  private nextIdleAct = 4.5;

  // Rich idle vignettes + interactive states (3D parity with 2D!)
  private dozeLidClose = 0;
  private dozeNod = 0;
  private dozeJoltFired = false;
  private yawnAmt = 0;
  private stretchAmt = 0;
  private groomAmt = 0;
  private groomLickAmt = 0;
  private groomEarPressL = 0;
  private groomEarPressR = 0;
  private groomSparkleFired = false;
  private kneadAmt = 0;
  private kneadPhase = 0;
  private hadHeartyPet = false;
  private petEndedAt = -100;
  private yawnDoneThisIdle = false;
  private dozeDoneThisIdle = false;

  private isDragging = false;
  private scruffDemoUntil = -100;
  private scruffAmt = 0;
  private scruffSwing = 0;
  private scruffDragVelX = 0;
  private boopStartAt = -100;
  private boopUntil = -100;
  private boopAmt = 0;
  private boopCrossEye = 0;
  private boopSneezeFired = false;
  private boopShake = 0;
  private chinUntil = -100;
  private chinAmt = 0;
  private nextHeartAt = 0;
  private tailRecoil = 0;
  private tailGlanceUntil = -100;
  private tailGlanceAmt = 0;
  private tailPokeTimes: number[] = [];

  // Screen-edge peek mode (cat hides desk & lower torso off-edge, peeking ONLY its head & gripping paws!)
  private peekEdge: PeekEdge = 'none';
  private peekPreviewEdge: PeekEdge = 'none';
  private peekVisualEdge: 'left' | 'right' = 'left';
  private peekAmt = 0;
  private peekHover = 0;
  private peekHoveredNow = false;

  private readonly tmpV1 = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly tmpV3 = new THREE.Vector3();
  private readonly tmpTailAttached = new THREE.Vector3();
  private readonly tmpTailLoose = new THREE.Vector3();
  private readonly tmpTailScratch = new THREE.Vector3();
  private readonly tmpTailPath = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];
  private readonly tmpPawLocal = new THREE.Vector3();
  private readonly tmpArmOff = new THREE.Vector3();
  private readonly tmpFxPos = new THREE.Vector3();
  private readonly tmpMat4 = new THREE.Matrix4();
  private readonly tmpPeekC1 = new THREE.Vector3();
  private readonly tmpPeekC2 = new THREE.Vector3();
  private fpsCap = 0;
  private sleepTrimSent = false;
  public onDeepSleep: (() => void) | null = null;
  private readonly handleContextRestored = (): void => {
    this.applyChromaKeyState();
    this.wakeRendering();
  };

  constructor(canvas: HTMLCanvasElement, options?: { embedded?: boolean }) {
    this.canvas = canvas;
    this.embedded = Boolean(options?.embedded);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(22, 1.35, 0.1, 100);
    this.desk = new KeyboardAndMouse3D(this.scene);
    this.pawMat = this.furSystem.createMaterial('PAW');

    // 1) Original KuroCat Continuous One-Piece Mochi-Pear Silhouette (exact BODY_SLICES proportions!)
    this.catRoot.position.copy(this.homePos);
    this.catRoot.scale.setScalar(0.90);
    this.scene.add(this.catRoot);

    // Soft studio contact shadow underneath the plush sitting body
    this.catShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.15, 1.75),
      new THREE.MeshBasicMaterial({
        map: makeSoftShadowTex(),
        transparent: true,
        depthWrite: false,
        opacity: 0.78,
      }),
    );
    this.catShadow.rotation.x = -Math.PI / 2;
    this.catShadow.position.set(0, 0.003, 0.02);
    this.catRoot.add(this.catShadow);

    // Exact measured KuroCat BODY_SLICES (forehead 49 -> cheeks 60 -> plush neck 52 -> chest 62 -> belly 70 -> thighs 73 -> base 46)
    const bodyCurve = new THREE.CatmullRomCurve3(
      [
        [0.0, 0.0],
        [0.46, 0.006],
        [0.60, 0.06],
        [0.74, 0.19],
        [0.80, 0.43], // widest soft thighs!
        [0.76, 0.67], // plump belly
        [0.68, 0.91], // mid chest
        [0.60, 1.12], // upper chest
        [0.57, 1.32], // gentle plush neck (NO skinny KeyCat neck!)
        [0.65, 1.50], // chubby cheeks widest
        [0.61, 1.69], // eye line
        [0.52, 1.87], // forehead
        [0.34, 1.948], // crown shoulder
        [0.0, BODY_H], // smooth rounded crown peak
      ].map(([r, y]) => new THREE.Vector3(r, y, 0)),
      false,
      'centripetal',
    );
    this.outlineSamplePts = bodyCurve.getSpacedPoints(360);
    const profile = bodyCurve
      .getSpacedPoints(48)
      .map((q) => new THREE.Vector2(Math.max(0, q.x), q.y));
    profile[0].x = 0;
    profile[profile.length - 1].x = 0;

    this.bodyGeo = new THREE.LatheGeometry(profile, 56);
    // Bake Z_SCALE directly into geometry so 3D head-tilt vertex rotation has ZERO ellipse distortion!
    const bPos = this.bodyGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      bPos.setZ(i, bPos.getZ(i) * Z_SCALE);
    }
    this.bodyGeo.computeVertexNormals();
    this.bodyGeo.setAttribute('rest', this.bodyGeo.attributes.position.clone());

    this.bodyMesh = new THREE.Mesh(this.bodyGeo, this.furSystem.createMaterial('CAT_BODY'));
    this.bodyMesh.frustumCulled = false;
    this.catRoot.add(this.bodyMesh);
    this.petMeshes.push(this.bodyMesh);

    // 2) Subtle Grounded Side Hind Paws tucked cleanly beside lower thighs (dangle softly when scruffed!)
    const pawGeo = this.makePlushPawGeo();
    for (const s of [-1, 1] as const) {
      const hp = new THREE.Mesh(pawGeo, this.pawMat);
      hp.scale.set(0.185, 0.11, 0.165);
      const bx = s * 0.56;
      const by = 0.065;
      const bz = 0.34;
      hp.position.set(bx, by, bz);
      hp.rotation.y = s * 0.24;
      this.catRoot.add(hp);
      this.hindPaws.push({ mesh: hp, baseX: bx, baseY: by, baseZ: bz });
    }

    // 3) Optional 3D Collar + Swinging Gold Bell (off by default to stay 100% pure original KuroCat!)
    this.collarR = this.radiusAtY(this.collarY);
    const COLLAR_LIFT = 0.055;
    this.collarMat = withTowardEye(
      new THREE.MeshBasicMaterial({ color: '#d9483b' }),
      COLLAR_LIFT,
    ) as THREE.MeshBasicMaterial;
    const bellMat = withTowardEye(new THREE.MeshBasicMaterial({ color: '#edb938' }), COLLAR_LIFT);
    const band = createCleanLimb(this.collarGroup, {
      segments: 38,
      radial: 8,
      fill: this.collarMat,
      capGeoStart: this.capGeoStart,
      capGeoEnd: this.capGeoEnd,
      order: 2,
    });
    band.update(
      (t, out) => {
        const a = mix(-1.35, 1.35, t);
        out.set(
          Math.sin(a) * (this.collarR + 0.012),
          0.012 * (1 - Math.cos(a)),
          Math.cos(a) * (this.collarR + 0.012) * Z_SCALE,
        );
      },
      (t) => 0.032 * (0.28 + 0.72 * smoothstep(0, 0.22, Math.min(t, 1 - t))),
    );
    {
      const RB = 0.068;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(RB, 20, 14), bellMat);
      const makeDecal = (color: string) =>
        withTowardEye(new THREE.MeshBasicMaterial({ color, depthTest: false }), COLLAR_LIFT + 0.01);
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.012), makeDecal('#1d1d1b'));
      slit.position.set(0, -0.020, Math.sqrt(RB * RB - 0.02 * 0.02) + 0.002);
      slit.rotation.x = -0.33;
      const glint = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), makeDecal('#fff6d8'));
      glint.position.set(-0.020, 0.022, Math.sqrt(RB * RB - 0.02 * 0.02 - 0.022 * 0.022) + 0.002);
      glint.rotation.set(-0.35, -0.35, 0);
      const loop = new THREE.Mesh(
        new THREE.TorusGeometry(0.019, 0.006, 8, 16),
        withTowardEye(new THREE.MeshBasicMaterial({ color: '#1d1d1b' }), COLLAR_LIFT),
      );
      loop.position.y = RB + 0.009;
      const hang = new THREE.Group();
      hang.position.y = -(RB + 0.016);
      hang.add(ball, slit, glint, loop);
      this.bellGroup.add(hang);
      this.bellGroup.position.set(0, -0.012, (this.collarR + 0.044) * Z_SCALE);
    }
    this.collarGroup.add(this.bellGroup);
    this.collarGroup.visible = false;
    this.catRoot.add(this.collarGroup);

    // 4) Head Mount (tracks exact head center y=HEAD_CY inside continuous body mesh!)
    this.headMount.position.set(0, HEAD_CY, 0);
    this.catRoot.add(this.headMount);

    // 5) Compact Rounded KuroCat 3D Ears (snug, slightly upright triangular cat tips; dynamically reshaped per earShape!)
    this.earGeo = this.buildEarGeometry('cat');
    for (const s of [-1, 1] as const) {
      const g = new THREE.Group();
      g.position.set(s * 0.295, 0.255, -0.015);
      g.rotation.set(-0.06, 0, -s * 0.06);
      g.scale.set(1.0, 1.04, 1.0);
      const mesh = new THREE.Mesh(this.earGeo, this.furSystem.createMaterial('EAR', s));
      mesh.scale.set(1, 1, 0.56);
      g.add(mesh);
      this.headMount.add(g);
      this.ears.push({ group: g, mesh, s, tilt: 0.06 });
      this.petMeshes.push(mesh);
    }

    // 6) Curved Surface-Conforming KuroCat Eyes + Petting Lazy Slits + Closed Sleep Arcs + Soft Blush
    for (const s of [-1, 1] as const) {
      const lx = s * 0.232;
      const ly = 0.105; // headMount local -> world y = 1.665 (exact KuroCat eye line!)

      const eyeGeo = this.makeCurvedFacePatchGeo(lx, ly, EYE_MAX_RX, EYE_MAX_RY, 0.024, 20);
      const eyeMat = createEyeShaderMaterial(s);
      const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
      eyeMesh.renderOrder = 10;

      // Gentle U-shaped closed arc for sleep / password privacy / blink
      const closedArc = new TaperTube3D(18, 6, this.lidArcMat, 14);
      closedArc.update(
        (t, out) => {
          const x = lx + mix(-0.132, 0.132, t);
          const y = ly - 0.042 * Math.sin(t * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.028);
        },
        (t) => 0.012 + 0.005 * Math.sin(t * Math.PI),
      );
      closedArc.mesh.visible = false;

      // Original KuroCat sleek thin lazy-slanted horizontal squint slits when petting!
      const squintSlit = new TaperTube3D(18, 6, this.squintMat, 14);
      squintSlit.update(
        (t, out) => {
          const x = lx + mix(-0.132, 0.132, t);
          const y = ly - 0.012 * Math.sin(t * Math.PI) - s * (t - 0.5) * 0.016;
          out.set(x, y, this.surfaceZ(x, y) + 0.028);
        },
        (t) => 0.011 + 0.004 * Math.sin(t * Math.PI),
      );
      squintSlit.mesh.visible = false;

      // Cozy upturned happy curved arc (◠) for yawn, stretch & chin-scratch bliss!
      const happyArc = new TaperTube3D(18, 6, this.lidArcMat, 14);
      happyArc.update(
        (t, out) => {
          const x = lx + mix(-0.128, 0.128, t);
          const y = ly - 0.014 + 0.050 * Math.sin(t * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.028);
        },
        (t) => 0.012 + 0.005 * Math.sin(t * Math.PI),
      );
      happyArc.mesh.visible = false;

      const blushGeo = this.makeCurvedFacePatchGeo(lx + s * 0.06, ly - 0.155, 0.10, 0.056, 0.016, 8);
      const blush = new THREE.Mesh(blushGeo, this.blushMat);
      blush.renderOrder = 9;
      blush.visible = false;

      this.headMount.add(blush, eyeMesh, closedArc.mesh, squintSlit.mesh, happyArc.mesh);
      this.eyes.push({
        s,
        mesh: eyeMesh,
        mat: eyeMat,
        closedArc: closedArc.mesh,
        closedArcTube: closedArc,
        squintSlit: squintSlit.mesh,
        squintSlitTube: squintSlit,
        happyArc: happyArc.mesh,
        happyArcTube: happyArc,
        blush,
      });
    }

    // 7) Dainty Short KuroCat Cheek Whiskers + Optional Sculpted Eyebrows (1 static draw call each!)
    this.whiskerMesh = new THREE.Mesh(this.buildWhiskersGeometry(), this.whiskerMat);
    this.whiskerMesh.renderOrder = 12;
    this.eyebrowMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.eyebrowMat);
    this.eyebrowMesh.renderOrder = 13;
    this.eyebrowMesh.visible = false;
    this.headMount.add(this.whiskerMesh, this.eyebrowMesh);

    // 8) Delicate 3D Nose, Sculpted Mouth & Optional Blep Tongue
    {
      const NY = -0.042;
      this.noseMesh = new THREE.Mesh(this.buildNoseGeometry('cat', 1.0), this.noseMat);
      this.noseMesh.position.set(0, NY, this.surfaceZ(0, NY) + 0.024);
      this.noseMesh.renderOrder = 12;

      this.mouthTube = new TaperTube3D(24, 4, this.mouthMat, 12);
      this.updateMouthTube('w', 1.0, NY, 0.0);

      const blepShape = new THREE.Shape();
      blepShape.moveTo(-0.024, 0.0);
      blepShape.bezierCurveTo(-0.028, -0.052, 0.028, -0.052, 0.024, 0.0);
      blepShape.closePath();
      this.blepMesh = new THREE.Mesh(new THREE.ShapeGeometry(blepShape, 10), this.blepMat);
      this.blepMesh.position.set(0, NY - 0.036, this.surfaceZ(0, NY - 0.046) + 0.022);
      this.blepMesh.renderOrder = 11;
      this.blepMesh.visible = false;

      this.faceGroup.add(this.noseMesh, this.mouthTube.mesh, this.blepMesh);
      this.headMount.add(this.faceGroup);

      // 8a) Expressive 3D Yawn Mouth (cat "ω" upper lip anchored strictly BELOW nose + soft rounded jaw & nested pink tongue!)
      const yawnY = -0.092;
      const yawnZ = Math.max(this.surfaceZ(0, yawnY), this.surfaceZ(0, yawnY - 0.06)) + 0.030;
      const yawnShape = new THREE.Shape();
      yawnShape.moveTo(0, -0.008);
      yawnShape.quadraticCurveTo(0.036, 0.005, 0.068, -0.014);
      yawnShape.bezierCurveTo(0.082, -0.048, 0.058, -0.104, 0, -0.104);
      yawnShape.bezierCurveTo(-0.058, -0.104, -0.082, -0.048, -0.068, -0.014);
      yawnShape.quadraticCurveTo(-0.036, 0.005, 0, -0.008);
      const yawnOuter = new THREE.Mesh(
        new THREE.ShapeGeometry(yawnShape, 18),
        new THREE.MeshBasicMaterial({
          color: '#6d2c3e',
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        }),
      );
      yawnOuter.renderOrder = 15;

      const tongueShape = new THREE.Shape();
      tongueShape.moveTo(-0.046, -0.064);
      tongueShape.quadraticCurveTo(0, -0.045, 0.046, -0.064);
      tongueShape.bezierCurveTo(0.042, -0.097, -0.042, -0.097, -0.046, -0.064);
      const yawnTongue = new THREE.Mesh(
        new THREE.ShapeGeometry(tongueShape, 14),
        new THREE.MeshBasicMaterial({
          color: '#ff9bb3',
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        }),
      );
      yawnTongue.position.set(0, 0, 0.004);
      yawnTongue.renderOrder = 16;
      this.yawnGroup.add(yawnOuter, yawnTongue);
      this.yawnGroup.position.set(0, yawnY, yawnZ);
      this.yawnGroup.rotation.x = 0.14;
      this.yawnGroup.visible = false;
      this.headMount.add(this.yawnGroup);

      this.lickTongueMesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.040, 16),
        new THREE.MeshBasicMaterial({
          color: '#ff9bb3',
          depthTest: true,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        }),
      );
      this.lickTongueMesh.scale.set(0.88, 1.08, 1);
      this.lickTongueMesh.position.set(0, -0.112, this.surfaceZ(0, -0.112) + 0.032);
      this.lickTongueMesh.renderOrder = 16;
      this.lickTongueMesh.visible = false;
      this.headMount.add(this.lickTongueMesh);
    }

    // 8b) Sculpted 3D Gaming Headset (auto-equipped on PC game detection or manual toggle!)
    this.buildGamingHeadset();

    // 9) Graceful Tapered 3D KuroCat Tail (ZERO white border!)
    this.tailCurve = new THREE.CatmullRomCurve3(
      this.tailRestPts.map((q) => q.clone()),
      false,
      'catmullrom',
      0.5,
    );
    this.tailLimb = createCleanLimb(this.scene, {
      segments: 22,
      radial: 10,
      fill: this.furSystem.createMaterial('TAIL'),
      capGeoStart: this.capGeoStart,
      capGeoEnd: this.capGeoEnd,
      capStart: false,
    });
    this.tailHitMeshes.push(this.tailLimb.fill.mesh, ...this.tailLimb.caps);

    // 10) Sleek Unified KuroCat Arms + Soft Sculpted Plush Paws (tuck neatly onto front belly when idle!)
    const singleToeGeo = new THREE.PlaneGeometry(0.024, 0.28);
    singleToeGeo.rotateX(-Math.PI / 2);
    const mergedToesGeo = mergeStaticGeometries([
      { geo: singleToeGeo, matrix: new THREE.Matrix4().makeTranslation(-0.28, 0.68, 0.70) },
      { geo: singleToeGeo, matrix: new THREE.Matrix4().makeTranslation(0.28, 0.68, 0.70) },
    ]);
    singleToeGeo.dispose();

    for (const s of [-1, 1] as const) {
      const limb = createCleanLimb(this.scene, {
        segments: 16,
        radial: 10,
        fill: this.furSystem.createMaterial('ARM', s),
        capGeoStart: this.capGeoStart,
        capGeoEnd: this.capGeoEnd,
        order: 18,
      });
      const paw = new THREE.Mesh(pawGeo, this.pawMat);
      paw.renderOrder = 20;
      const toes = new THREE.Mesh(mergedToesGeo, this.toeMat);
      toes.renderOrder = 21;
      paw.add(toes);

      const tuckArc = new THREE.Mesh();
      tuckArc.visible = false;
      this.scene.add(paw);
      this.arms.push({
        s,
        limb,
        paw,
        tuckArc,
        // Cozy mid-lower plush flank shoulder (matches approved 2D 0.65/±43 proportions — shorter, cuter arms!)
        shoulderLocal: new THREE.Vector3(s * 0.54, 0.78, 0.22),
        shoulder: new THREE.Vector3(),
        c1: new THREE.Vector3(),
        c2: new THREE.Vector3(),
        hand: new THREE.Vector3(),
      });
    }

    const mkTrack = (side: -1 | 1): PawTrack3D => {
      const pos = new THREE.Vector3(side * 0.28, 0.34, 0.62);
      return {
        side,
        pos,
        from: pos.clone(),
        last: pos.clone(),
        spring: new Spring3D(pos, 3.6, 0.78),
        keyId: null,
        t0: -100,
        dur: 0.08,
        down: false,
        lastActive: -100,
        tuckWeight: 1,
      };
    };
    this.paws = { L: mkTrack(-1), R: mkTrack(1) };

    // 11) Comic anger mark 💢 sprite
    this.angerSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: getFxTexture('anger'), depthTest: false, transparent: true }),
    );
    this.angerSprite.renderOrder = 45;
    this.angerSprite.visible = false;
    this.scene.add(this.angerSprite);

    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
    this.applyChromaKeyState();
    this.resize();
  }

  /**
   * Builds sculpted over-ear gaming headphones on `headMount`:
   * - Arched padded headband curves cleanly behind the cat's ears (zero ear clipping!)
   * - Plush memory-foam cushions hug the chubby cheeks with brushed-titanium yokes
   * - Luminous KuroCat-lime / cyan-RGB breathing LED rings + curved boom microphone
   */
  private buildGamingHeadset(): void {
    const shellMat = createHeadsetMaterial('#242934', 0.28, 0.28, '#8da4c9');
    const padMat = createHeadsetMaterial('#384050', 0.12, 0.16, '#7f8da6');
    const metalMat = createHeadsetMaterial('#a2afc4', 0.58, 0.34, '#e6f0ff');
    const boomMat = createHeadsetMaterial('#202530', 0.20, 0.20, '#7889a6');
    this.headsetShaderMats.push(shellMat, padMat, metalMat, boomMat);

    // Collect static headset meshes by material and merge into 6 single draw calls (was 23 draw calls / 10.2k tris!)
    const shellParts: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }> = [];
    const padParts: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }> = [];
    const metalParts: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }> = [];
    const ledParts: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }> = [];
    const disposeLater: THREE.BufferGeometry[] = [];

    const makeLocalMat = (
      pos: [number, number, number],
      rot: [number, number, number],
      scl: [number, number, number],
    ) => {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
      m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...scl));
      return m;
    };

    // 1) Main outer headband arch curving smoothly behind the upright cat ears!
    const archCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.675, 0.09, -0.015),
        new THREE.Vector3(-0.635, 0.33, -0.068),
        new THREE.Vector3(-0.36, 0.495, -0.106),
        new THREE.Vector3(0.0, 0.535, -0.114),
        new THREE.Vector3(0.36, 0.495, -0.106),
        new THREE.Vector3(0.635, 0.33, -0.068),
        new THREE.Vector3(0.675, 0.09, -0.015),
      ],
      false,
      'centripetal',
    );
    const bandGeo = new THREE.TubeGeometry(archCurve, 28, 0.046, 10, false);
    const bPos = bandGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const z = bPos.getZ(i);
      const y = bPos.getY(i);
      const crownW = smoothstep(0.18, 0.52, y);
      bPos.setZ(i, z - crownW * 0.012);
    }
    bandGeo.computeVertexNormals();
    shellParts.push({ geo: bandGeo });
    disposeLater.push(bandGeo);

    // Soft plush inner headband cushion under the crown
    const padPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = mix(0.24, 0.76, i / 12);
      const p = archCurve.getPoint(u);
      padPts.push(new THREE.Vector3(p.x * 0.96, p.y - 0.036, p.z + 0.012));
    }
    const innerPadGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(padPts, false, 'centripetal'),
      16,
      0.032,
      8,
      false,
    );
    padParts.push({ geo: innerPadGeo });
    disposeLater.push(innerPadGeo);

    // Brushed-titanium headband slider arms
    for (const s of [-1, 1] as const) {
      const sliderPts = [
        archCurve.getPoint(s < 0 ? 0.02 : 0.98),
        archCurve.getPoint(s < 0 ? 0.09 : 0.91),
        archCurve.getPoint(s < 0 ? 0.16 : 0.84),
      ];
      const sliderGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(sliderPts),
        8,
        0.052,
        8,
        false,
      );
      metalParts.push({ geo: sliderGeo });
      disposeLater.push(sliderGeo);
    }

    // 2) Sculpted Over-Ear Plush Earcups (Left -1 & Right +1)
    const cushionGeo = new THREE.TorusGeometry(0.145, 0.058, 12, 20);
    cushionGeo.rotateY(Math.PI / 2);

    const shellGeo = new THREE.SphereGeometry(0.185, 16, 12);
    const rimGeo = new THREE.TorusGeometry(0.155, 0.022, 10, 20);
    rimGeo.rotateY(Math.PI / 2);

    const ledRingGeo = new THREE.TorusGeometry(0.112, 0.015, 8, 22);
    ledRingGeo.rotateY(Math.PI / 2);

    const centerCapGeo = new THREE.CylinderGeometry(0.068, 0.078, 0.032, 14);
    centerCapGeo.rotateZ(Math.PI / 2);

    const dotGeo = new THREE.SphereGeometry(0.024, 10, 8);
    const yokeGeo = new THREE.CylinderGeometry(0.036, 0.042, 0.09, 10);
    disposeLater.push(cushionGeo, shellGeo, rimGeo, ledRingGeo, centerCapGeo, dotGeo, yokeGeo);

    for (const s of [-1, 1] as const) {
      const cupMat = makeLocalMat([s * 0.652, 0.045, 0.012], [0, s * 0.08, -s * 0.10], [1, 1, 1]);
      const pushCup = (
        arr: Array<{ geo: THREE.BufferGeometry; matrix?: THREE.Matrix4 }>,
        geo: THREE.BufferGeometry,
        pos: [number, number, number],
        rot: [number, number, number],
        scl: [number, number, number],
      ) => {
        arr.push({ geo, matrix: cupMat.clone().multiply(makeLocalMat(pos, rot, scl)) });
      };

      pushCup(padParts, cushionGeo, [0, 0, 0], [0, 0, 0], [0.95, 1.18, 0.94]);
      pushCup(shellParts, shellGeo, [s * 0.048, 0, 0], [0, 0, 0], [0.56, 1.12, 0.90]);
      pushCup(metalParts, rimGeo, [s * 0.068, 0, 0], [0, 0, 0], [0.85, 1.12, 0.91]);
      pushCup(metalParts, centerCapGeo, [s * 0.132, 0, 0], [0, 0, 0], [1.0, 1.08, 0.92]);
      pushCup(ledParts, ledRingGeo, [s * 0.138, 0, 0], [0, 0, 0], [1.0, 1.10, 0.92]);
      pushCup(ledParts, dotGeo, [s * 0.150, 0, 0], [0, 0, 0], [0.45, 1.0, 1.0]);
      pushCup(metalParts, yokeGeo, [s * 0.032, 0.195, -0.025], [0, 0, s * 0.16], [1, 1, 1]);
    }

    // 3) Sleek Curved Gaming Boom Microphone extending from the left earcup (-X)
    const micCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.64, -0.065, 0.075),
      new THREE.Vector3(-0.585, -0.148, 0.31),
      new THREE.Vector3(-0.415, -0.168, 0.495),
      new THREE.Vector3(-0.235, -0.132, 0.562),
    ]);
    const micArm = new THREE.Mesh(new THREE.TubeGeometry(micCurve, 16, 0.017, 8, false), boomMat);
    this.headsetGroup.add(micArm);

    const micJointGeo = new THREE.SphereGeometry(0.032, 10, 8);
    metalParts.push({
      geo: micJointGeo,
      matrix: makeLocalMat([-0.645, -0.062, 0.072], [0, 0, 0], [1, 1, 1]),
    });
    disposeLater.push(micJointGeo);

    const micTipGeo = new THREE.SphereGeometry(0.044, 12, 10);
    padParts.push({
      geo: micTipGeo,
      matrix: makeLocalMat([-0.222, -0.128, 0.568], [0, -0.35, 0.22], [1.32, 0.88, 0.88]),
    });
    disposeLater.push(micTipGeo);

    this.headsetGroup.add(
      new THREE.Mesh(mergeStaticGeometries(shellParts), shellMat),
      new THREE.Mesh(mergeStaticGeometries(padParts), padMat),
      new THREE.Mesh(mergeStaticGeometries(metalParts), metalMat),
      new THREE.Mesh(mergeStaticGeometries(ledParts), this.headsetLedMat),
    );
    for (const g of disposeLater) g.dispose();

    const micLed = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), this.headsetMicLedMat);
    micLed.position.set(-0.172, -0.118, 0.588);
    this.headsetGroup.add(micLed);

    this.headsetGroup.visible = false;
    this.headMount.add(this.headsetGroup);
  }

  private makePlushPawGeo(): THREE.SphereGeometry {
    const g = new THREE.SphereGeometry(1, 18, 12);
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const x = q.getX(i);
      const y = q.getY(i);
      const z = q.getZ(i);
      q.setXYZ(i, x * (1 + 0.10 * z), y < 0 ? y * 0.48 : y, z);
    }
    g.computeVertexNormals();
    return g;
  }

  /** Exact piecewise-linear radius of our continuous KuroCat Lathe profile at body-local height y ∈ [0, BODY_H]. */
  private radiusAtY(y: number): number {
    const cy = clamp(y, 0, BODY_H);
    const pts = this.outlineSamplePts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if ((cy >= a.y && cy <= b.y) || (cy <= a.y && cy >= b.y)) {
        const span = b.y - a.y;
        const t = Math.abs(span) > 1e-6 ? clamp((cy - a.y) / span, 0, 1) : 0;
        return mix(a.x, b.x, t);
      }
    }
    return pts[pts.length - 1].x;
  }

  private buildNoseGeometry(shape: CatContourResolved['noseShape'], scale: number): THREE.BufferGeometry {
    const sc = Math.max(0.45, Math.min(1.9, scale));
    const s = new THREE.Shape();
    if (shape === 'round') {
      s.absellipse(0, 0, 0.042 * sc, 0.032 * sc, 0, Math.PI * 2, false, 0);
    } else if (shape === 'wide') {
      s.moveTo(-0.060 * sc, 0.014 * sc);
      s.quadraticCurveTo(0, 0.028 * sc, 0.060 * sc, 0.014 * sc);
      s.quadraticCurveTo(0.054 * sc, -0.022 * sc, 0, -0.030 * sc);
      s.quadraticCurveTo(-0.054 * sc, -0.022 * sc, -0.060 * sc, 0.014 * sc);
    } else if (shape === 'small') {
      s.absellipse(0, 0, 0.025 * sc, 0.019 * sc, 0, Math.PI * 2, false, 0);
    } else {
      s.moveTo(-0.040 * sc, 0.011 * sc);
      s.quadraticCurveTo(0, 0.023 * sc, 0.040 * sc, 0.011 * sc);
      s.quadraticCurveTo(0.044 * sc, 0.003 * sc, 0.011 * sc, -0.022 * sc);
      s.quadraticCurveTo(0, -0.028 * sc, -0.011 * sc, -0.022 * sc);
      s.quadraticCurveTo(-0.044 * sc, 0.003 * sc, -0.040 * sc, 0.011 * sc);
    }
    return new THREE.ShapeGeometry(s, 10);
  }

  private updateMouthTube(
    shape: CatContourResolved['mouthShape'],
    scale: number,
    noseY: number,
    offsetY: number,
  ): void {
    const sc = Math.max(0.5, Math.min(1.8, scale));
    const baseY = noseY - 0.032 - offsetY * 0.048;
    const halfW = 0.064 * sc;
    const thick = 0.0050 * Math.max(0.8, Math.sqrt(sc));
    if (shape === 'smile') {
      this.mouthTube.update(
        (t, out) => {
          const x = mix(-halfW * 1.05, halfW * 1.05, t);
          const y = baseY + 0.006 - 0.034 * sc * Math.sin(t * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.024);
        },
        () => thick,
      );
    } else if (shape === 'flat') {
      this.mouthTube.update(
        (t, out) => {
          const x = mix(-halfW * 0.95, halfW * 0.95, t);
          const y = baseY - 0.008 + 0.004 * Math.sin(t * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.024);
        },
        () => thick,
      );
    } else if (shape === 'open') {
      const rx = 0.030 * sc;
      const ry = 0.034 * sc;
      const cy = baseY - 0.018 * sc;
      this.mouthTube.update(
        (t, out) => {
          const a = t * Math.PI * 2;
          const x = Math.cos(a) * rx;
          const y = cy + Math.sin(a) * ry;
          out.set(x, y, this.surfaceZ(x, y) + 0.024);
        },
        () => thick * 1.05,
      );
    } else {
      this.mouthTube.update(
        (t, out) => {
          const x = mix(-halfW, halfW, t);
          const y = baseY - 0.020 * sc * Math.sin((Math.abs(x) / Math.max(0.01, halfW)) * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.024);
        },
        () => thick,
      );
    }
  }

  private buildEyebrowsGeometry(contour: CatContourResolved): THREE.BufferGeometry {
    if (contour.eyebrowStyle === 'none') return new THREE.BufferGeometry();
    const geos: Array<{ geo: THREE.BufferGeometry }> = [];
    const eScale = contour.eyeScale;
    const eAspect = contour.eyeAspect;
    const lyEye = 0.105 - contour.eyeOffsetY * 0.085;
    const browY = lyEye + 0.136 * eScale * eAspect + 0.056;
    const span = 0.095 * Math.max(0.75, eScale);
    for (const s of [-1, 1] as const) {
      const lx = s * 0.232 * contour.eyeSpacing;
      const tube = new TaperTube3D(12, 5, this.eyebrowMat, 13);
      if (contour.eyebrowStyle === 'thick') {
        // Shiba / Husky adorable oval dot brow
        tube.update(
          (t, out) => {
            const x = lx + s * mix(-0.040, 0.026, t) * eScale;
            const y = browY + 0.010 * Math.sin(t * Math.PI) + s * (t - 0.5) * 0.012;
            out.set(x, y, this.surfaceZ(x, y) + 0.028);
          },
          (t) => (0.014 + 0.015 * Math.sin(t * Math.PI)) * Math.max(0.75, eScale),
        );
      } else if (contour.eyebrowStyle === 'angry') {
        tube.update(
          (t, out) => {
            const x = lx + s * mix(-span, span, t);
            const y = browY + mix(-0.028, 0.032, t);
            out.set(x, y, this.surfaceZ(x, y) + 0.028);
          },
          (t) => 0.011 + 0.005 * Math.sin(t * Math.PI),
        );
      } else if (contour.eyebrowStyle === 'worried') {
        tube.update(
          (t, out) => {
            const x = lx + s * mix(-span, span, t);
            const y = browY + mix(0.028, -0.028, t) + 0.008 * Math.sin(t * Math.PI);
            out.set(x, y, this.surfaceZ(x, y) + 0.028);
          },
          (t) => 0.009 + 0.004 * Math.sin(t * Math.PI),
        );
      } else {
        tube.update(
          (t, out) => {
            const x = lx + s * mix(-span, span, t);
            const y = browY - 0.008 + 0.028 * Math.sin(t * Math.PI);
            out.set(x, y, this.surfaceZ(x, y) + 0.028);
          },
          (t) => 0.008 + 0.003 * Math.sin(t * Math.PI),
        );
      }
      geos.push({ geo: tube.mesh.geometry });
    }
    const merged = mergeStaticGeometries(geos);
    for (const item of geos) item.geo.dispose();
    return merged;
  }

  private buildEarGeometry(shape: CatEarShape): THREE.BufferGeometry {
    let earPts: Array<[number, number]>;
    switch (shape) {
      case 'round':
        // Semicircular tiger / panda / bear rounded ear
        earPts = [
          [0.16, -0.04],
          [0.21, 0.02],
          [0.22, 0.09],
          [0.20, 0.16],
          [0.155, 0.215],
          [0.09, 0.252],
          [0.032, 0.268],
          [0.0, 0.272],
        ];
        break;
      case 'tall':
        // Tall pointed fox / bunny / corgi ear
        earPts = [
          [0.19, -0.05],
          [0.18, 0.06],
          [0.155, 0.18],
          [0.12, 0.30],
          [0.072, 0.40],
          [0.032, 0.455],
          [0.010, 0.472],
          [0.0, 0.478],
        ];
        break;
      case 'small':
        // Compact perky Tibetan fox / sea otter ear
        earPts = [
          [0.18, -0.04],
          [0.165, 0.03],
          [0.14, 0.10],
          [0.105, 0.165],
          [0.062, 0.215],
          [0.026, 0.242],
          [0.0, 0.250],
        ];
        break;
      case 'wide':
        // Broad flared fennec / caracal ear
        earPts = [
          [0.28, -0.05],
          [0.26, 0.04],
          [0.22, 0.14],
          [0.165, 0.24],
          [0.098, 0.32],
          [0.040, 0.365],
          [0.012, 0.380],
          [0.0, 0.386],
        ];
        break;
      case 'folded':
        // Scottish Fold compact ear that bends smoothly forward & down at the tip
        earPts = [
          [0.21, -0.04],
          [0.20, 0.03],
          [0.18, 0.11],
          [0.145, 0.19],
          [0.098, 0.25],
          [0.045, 0.285],
          [0.0, 0.295],
        ];
        break;
      case 'floppy':
        // Plush hanging puppy / lop-bunny ear (droops downward along cheek!)
        earPts = [
          [0.14, 0.04],
          [0.175, -0.04],
          [0.195, -0.15],
          [0.190, -0.27],
          [0.155, -0.37],
          [0.095, -0.43],
          [0.036, -0.458],
          [0.0, -0.465],
        ];
        break;
      default:
        earPts = [
          [0.23, -0.05],
          [0.21, 0.03],
          [0.18, 0.12],
          [0.135, 0.21],
          [0.082, 0.28],
          [0.036, 0.322],
          [0.012, 0.336],
          [0.0, 0.340],
        ];
        break;
    }
    const earSplinePts = [
      new THREE.Vector2(0, earPts[0][1]),
      ...earPts.map(([r, y]) => new THREE.Vector2(r, y)),
    ];
    const geo = new THREE.LatheGeometry(new THREE.SplineCurve(earSplinePts).getSpacedPoints(20), 26);
    if (shape === 'folded') {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const foldU = smoothstep(0.06, 0.29, y);
        const ny = y - foldU * foldU * 0.14;
        const nz = z + foldU * 0.22;
        pos.setXYZ(i, x, ny, nz);
      }
      geo.computeVertexNormals();
    } else if (shape === 'floppy') {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const droopU = smoothstep(0.02, -0.45, y);
        pos.setXYZ(i, x, y, z + droopU * 0.075);
      }
      geo.computeVertexNormals();
    }
    geo.setAttribute('rest', geo.attributes.position.clone());
    return geo;
  }

  private buildWhiskersGeometry(): THREE.BufferGeometry {
    const hw = this.currentContour.headWidth;
    const wLen = this.currentContour.whiskerLength;
    if (wLen <= 0.01) return new THREE.BufferGeometry();
    const xBase = 0.38 * mix(1.0, hw, 0.55);
    const whiskerGeos: Array<{ geo: THREE.BufferGeometry }> = [];
    for (const s of [-1, 1] as const) {
      for (let i = 0; i < 3; i++) {
        const tube = new TaperTube3D(8, 4, this.whiskerMat, 12);
        const y0 = -0.085 - i * 0.048;
        const x0 = s * xBase;
        const z0 = this.surfaceZ(x0, y0) + 0.012;
        const a = new THREE.Vector3(x0, y0, z0);
        const c = new THREE.Vector3(s * (xBase + 0.10 * wLen), y0 - (0.008 + i * 0.006) * wLen, z0 - 0.03 * wLen);
        const b = new THREE.Vector3(s * (xBase + 0.20 * wLen), y0 - (0.022 + i * 0.016) * wLen, z0 - 0.09 * wLen);
        tube.update(
          (t, out) => {
            const u = 1 - t;
            out.set(
              u * u * a.x + 2 * u * t * c.x + t * t * b.x,
              u * u * a.y + 2 * u * t * c.y + t * t * b.y,
              u * u * a.z + 2 * u * t * c.z + t * t * b.z,
            );
          },
          (t) => 0.0042 * (1 - 0.35 * t),
        );
        whiskerGeos.push({ geo: tube.mesh.geometry });
      }
    }
    const merged = mergeStaticGeometries(whiskerGeos);
    for (const w of whiskerGeos) w.geo.dispose();
    return merged;
  }

  private applyContourGeometry(skin: CatSkinConfig): void {
    const contour = resolveCatContour(skin);
    this.currentContour = contour;
    this.tailFluffy = Boolean(skin.tailFluffy);

    const key = [
      contour.faceShape,
      contour.headWidth.toFixed(3),
      contour.jawSquareness.toFixed(3),
      contour.earShape,
      contour.earScale.toFixed(3),
      contour.earSpacing.toFixed(3),
      contour.earTilt.toFixed(3),
      contour.eyeScale.toFixed(3),
      contour.eyeAspect.toFixed(3),
      contour.eyeSpacing.toFixed(3),
      contour.eyeOffsetY.toFixed(3),
      contour.noseShape,
      contour.noseScale.toFixed(3),
      contour.noseOffsetY.toFixed(3),
      contour.mouthShape,
      contour.mouthScale.toFixed(3),
      contour.mouthOffsetY.toFixed(3),
      contour.whiskerLength.toFixed(3),
      contour.eyebrowStyle,
      contour.blushScale.toFixed(3),
      contour.bodyChubbiness.toFixed(3),
    ].join('|');
    if (key === this.lastContourKey) return;
    this.lastContourKey = key;

    const hw = contour.headWidth;
    const jawSq = contour.jawSquareness;
    const chubby = contour.bodyChubbiness;
    const isFox = contour.faceShape === 'fox';
    const isWide = contour.faceShape === 'wide';
    const isOval = contour.faceShape === 'oval';

    const ctrlPts: Array<[number, number]> = [
      [0.0, 0.0],
      [0.46 * mix(1, chubby, 0.65), 0.006],
      [0.60 * chubby, 0.06],
      [0.74 * chubby, 0.19],
      [0.80 * chubby, 0.43],
      [0.76 * chubby, 0.67],
      [0.68 * chubby, 0.91],
      [0.60 * mix(chubby, hw, 0.25), 1.12],
      [0.57 * mix(chubby, hw, 0.55) * (1 + jawSq * 0.06 - (isFox ? 0.08 : 0)), 1.32],
      [0.65 * hw * (isFox ? 0.90 : isWide ? 1.04 : 1.0) * (1 + jawSq * 0.05), 1.50],
      [0.61 * hw * (1 + jawSq * 0.08) * (isOval ? 0.96 : 1.0), 1.69],
      [0.52 * hw * (1 + jawSq * 0.18) * (isOval ? 0.95 : 1.0), 1.87],
      [0.34 * hw * (1 + jawSq * 0.38), 1.948 - jawSq * 0.018 + (isOval ? 0.025 : 0)],
      [0.0, BODY_H - jawSq * 0.022 + (isOval ? 0.04 : 0)],
    ];

    const bodyCurve = new THREE.CatmullRomCurve3(
      ctrlPts.map(([r, y]) => new THREE.Vector3(r, y, 0)),
      false,
      'centripetal',
    );
    this.outlineSamplePts = bodyCurve.getSpacedPoints(360);
    const profile = bodyCurve
      .getSpacedPoints(48)
      .map((q) => new THREE.Vector2(Math.max(0, q.x), q.y));
    profile[0].x = 0;
    profile[profile.length - 1].x = 0;

    const nextBodyGeo = new THREE.LatheGeometry(profile, 56);
    const bPos = nextBodyGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      let x = bPos.getX(i);
      const y = bPos.getY(i);
      let z = bPos.getZ(i);
      if (jawSq > 0.02) {
        const headMask = smoothstep(1.24, 1.46, y) * (1 - smoothstep(1.90, 1.97, y));
        const sq = jawSq * headMask;
        if (sq > 0.005) {
          const r = Math.hypot(x, z);
          if (r > 1e-5) {
            const cx = Math.abs(x / r);
            const cz = Math.abs(z / r);
            const n = mix(2.0, 4.4, sq);
            const k = 1 / Math.pow(Math.pow(cx, n) + Math.pow(cz, n), 1 / n);
            x *= mix(1.0, k, 0.85);
            z *= mix(1.0, k, 0.72);
          }
        }
      }
      bPos.setXYZ(i, x, y, z * Z_SCALE);
    }
    nextBodyGeo.computeVertexNormals();
    nextBodyGeo.setAttribute('rest', nextBodyGeo.attributes.position.clone());
    const oldBodyGeo = this.bodyGeo;
    this.bodyGeo = nextBodyGeo;
    this.bodyMesh.geometry = nextBodyGeo;
    oldBodyGeo.dispose();

    // Update 3D ear geometry & mount offsets so ears sit cleanly on flat/wide/square crowns or fold/droop naturally
    const nextEarGeo = this.buildEarGeometry(contour.earShape);
    const oldEarGeo = this.earGeo;
    this.earGeo = nextEarGeo;
    this.earMountX =
      (0.295 * mix(1.0, hw, 0.78) +
        jawSq * 0.075 +
        (contour.earShape === 'round'
          ? 0.05
          : contour.earShape === 'folded'
            ? 0.06
            : contour.earShape === 'floppy'
              ? 0.145
              : 0)) *
      contour.earSpacing;
    this.earMountY =
      0.255 +
      jawSq * 0.105 +
      (contour.earShape === 'round'
        ? 0.068
        : contour.earShape === 'small'
          ? 0.065
          : contour.earShape === 'folded'
            ? 0.025
            : contour.earShape === 'floppy'
              ? -0.075
              : 0) +
      (isOval ? 0.028 : 0);
    this.earBaseTilt =
      (contour.earShape === 'wide'
        ? 0.24
        : contour.earShape === 'round'
          ? 0.30
          : contour.earShape === 'small'
            ? 0.14
            : contour.earShape === 'folded'
              ? 0.44
              : contour.earShape === 'floppy'
                ? 0.16
                : 0.06) + contour.earTilt;
    this.earBaseScale = contour.earScale;
    for (const e of this.ears) {
      e.mesh.geometry = nextEarGeo;
      e.tilt = this.earBaseTilt;
      e.group.scale.set(this.earBaseScale, this.earBaseScale * 1.04, this.earBaseScale);
    }
    oldEarGeo.dispose();

    // Re-conform curved eyes, blush, closed arcs, squint slits, nose, mouth, blep, eyebrows & whiskers onto the new face surface
    const eScale = contour.eyeScale;
    const eAspect = contour.eyeAspect;
    this.eyePatchRx = EYE_MAX_RX * Math.max(1.0, eScale * 1.05);
    this.eyePatchRy = EYE_MAX_RY * Math.max(1.0, eScale * eAspect * 1.05);
    const lyEye = 0.105 - contour.eyeOffsetY * 0.085;
    const bScale = contour.blushScale;

    for (const e of this.eyes) {
      const lx = e.s * 0.232 * contour.eyeSpacing;
      const ly = lyEye;
      const oldEye = e.mesh.geometry;
      e.mesh.geometry = this.makeCurvedFacePatchGeo(lx, ly, this.eyePatchRx, this.eyePatchRy, 0.024, 20);
      oldEye.dispose();

      const oldBlush = e.blush.geometry;
      e.blush.geometry = this.makeCurvedFacePatchGeo(
        lx + e.s * (0.06 * hw),
        ly - 0.155,
        0.10 * bScale,
        0.056 * bScale,
        0.016,
        8,
      );
      oldBlush.dispose();

      const arcHalf = 0.132 * eScale;
      e.closedArcTube.update(
        (t, out) => {
          const x = lx + mix(-arcHalf, arcHalf, t);
          const y = ly - 0.042 * eScale * Math.sin(t * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.028);
        },
        (t) => 0.012 + 0.005 * Math.sin(t * Math.PI),
      );

      e.squintSlitTube.update(
        (t, out) => {
          const x = lx + mix(-arcHalf, arcHalf, t);
          const y = ly - 0.012 * eScale * Math.sin(t * Math.PI) - e.s * (t - 0.5) * 0.016 * eScale;
          out.set(x, y, this.surfaceZ(x, y) + 0.028);
        },
        (t) => 0.011 + 0.004 * Math.sin(t * Math.PI),
      );

      const happyHalf = 0.128 * eScale;
      e.happyArcTube.update(
        (t, out) => {
          const x = lx + mix(-happyHalf, happyHalf, t);
          const y = ly - 0.014 + 0.050 * eScale * Math.sin(t * Math.PI);
          out.set(x, y, this.surfaceZ(x, y) + 0.028);
        },
        (t) => 0.012 + 0.005 * Math.sin(t * Math.PI),
      );
    }

    const NY = -0.042 - contour.noseOffsetY * 0.055;
    this.noseBaseY = NY;
    const oldNoseGeo = this.noseMesh.geometry;
    this.noseMesh.geometry = this.buildNoseGeometry(contour.noseShape, contour.noseScale);
    oldNoseGeo.dispose();
    this.noseMesh.position.set(0, NY, this.surfaceZ(0, NY) + 0.024);

    const yawnZ = Math.max(this.surfaceZ(0, -0.092), this.surfaceZ(0, -0.152)) + 0.030;
    this.yawnGroup.position.set(0, -0.092, yawnZ);
    this.lickTongueMesh.position.set(0, -0.112, this.surfaceZ(0, -0.112) + 0.032);
    this.updateMouthTube(contour.mouthShape, contour.mouthScale, NY, contour.mouthOffsetY);

    const blepY = NY - 0.034 - contour.mouthOffsetY * 0.048;
    this.blepMesh.position.set(0, blepY, this.surfaceZ(0, blepY - 0.02) + 0.022);
    this.blepMesh.scale.setScalar(contour.mouthScale);

    const oldWhiskers = this.whiskerMesh.geometry;
    this.whiskerMesh.geometry = this.buildWhiskersGeometry();
    oldWhiskers.dispose();
    this.whiskerMesh.visible = contour.whiskerLength > 0.01;

    const oldBrows = this.eyebrowMesh.geometry;
    this.eyebrowMesh.geometry = this.buildEyebrowsGeometry(contour);
    oldBrows.dispose();
    this.eyebrowMesh.visible = contour.eyebrowStyle !== 'none';
  }

  /** Mathematically exact Z depth on the front face of our Lathe/squircle body at headMount-local (x, y). */
  private surfaceZ(x: number, y: number): number {
    const ly = HEAD_CY + y;
    const R = Math.max(0.05, this.radiusAtY(ly));
    const ux = clamp(x / R, -0.985, 0.985);
    const jawSq = this.currentContour.jawSquareness;
    if (jawSq > 0.02) {
      const headMask = smoothstep(1.24, 1.46, ly) * (1 - smoothstep(1.90, 1.97, ly));
      const sq = jawSq * headMask;
      if (sq > 0.005) {
        const n = mix(2.0, 4.4, sq);
        const uz = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ux), n)), 1 / n);
        return R * Z_SCALE * uz;
      }
    }
    return R * Z_SCALE * Math.sqrt(Math.max(0, 1 - ux * ux));
  }

  private makeCurvedFacePatchGeo(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    zOffset: number,
    segs = 16,
  ): THREE.PlaneGeometry {
    const geo = new THREE.PlaneGeometry(2, 2, segs, segs);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      const x = cx + u * rx;
      const y = cy + v * ry;
      pos.setXYZ(i, x, y, this.surfaceZ(x, y) + zOffset);
    }
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  private spineWeight(y: number): number {
    return smoothstep(0.14, 1.75, y) ** 1.45;
  }

  private sinkWeight(y: number): number {
    return smoothstep(0.18, BODY_H, y);
  }

  private attachLocal(local: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const w = this.spineWeight(local.y);
    const swell =
      1 +
      this.bend.bellySwell * smoothstep(1.30, 0.65, local.y) * smoothstep(0.0, 0.25, local.y);
    return out
      .set(
        local.x * swell + this.bend.x * w,
        local.y * (1 - this.bend.squash * this.sinkWeight(local.y)),
        local.z * swell + this.bend.z * w,
      )
      .applyMatrix4(this.catRoot.matrixWorld);
  }

  /**
   * Pushes spine bend + rigid head rotation to the GPU CAT_BODY vertex shader (zero CPU loop,
   * zero computeVertexNormals, zero per-frame PCIe vertex upload!).
   */
  private deformCatBody(): void {
    this.furSystem.setBodyDeform(
      this.bend.x,
      this.bend.z,
      this.bend.squash,
      this.bend.bellySwell,
      this.headRot.pitch,
      this.headRot.yaw,
      this.headRot.roll,
    );
  }

  private placeHeadAndCollar(): void {
    const wHead = this.spineWeight(HEAD_CY);
    const sHead = this.sinkWeight(HEAD_CY);
    this.headMount.position.set(
      this.bend.x * wHead,
      HEAD_CY * (1 - this.bend.squash * sHead),
      this.bend.z * wHead,
    );
    this.headMount.rotation.set(this.headRot.pitch, this.headRot.yaw, this.headRot.roll, 'YXZ');

    if (!this.collarGroup.visible) return;
    const y = this.collarY - 0.18 * clamp(this.headRot.pitch + 0.06, 0, 0.45);
    const s = this.radiusAtY(y) / Math.max(0.05, this.collarR);
    this.collarGroup.scale.set(s, 1, s);
    const w = this.spineWeight(y);
    const dw = (this.spineWeight(y + 0.01) - this.spineWeight(y - 0.01)) / 0.02;
    this.collarGroup.position.set(
      this.bend.x * w,
      y * (1 - this.bend.squash * this.sinkWeight(y)),
      this.bend.z * w,
    );
    const tx = clamp(Math.atan(this.bend.z * dw) * 0.45, -0.16, 0.16);
    const tz = clamp(-Math.atan(this.bend.x * dw) * 0.45, -0.16, 0.16);
    this.collarGroup.rotation.set(tx, 0, tz);
    this.bellGroup.rotation.set(-tx, 0, -tz);
  }

  // ---- Public API ----

  public resize(): void {
    const parent = this.canvas.parentElement;
    const w = Math.max(1, parent ? parent.clientWidth : this.canvas.clientWidth || 640);
    const h = Math.max(1, parent ? parent.clientHeight : this.canvas.clientHeight || 420);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.lastCamKey = '';
  }

  public start(): void {
    if (this.disposed || this.rafId !== null || this.idleTimer !== null) return;
    this.lastFrameMs = performance.now();
    this.directRafPrevMs = 0;
    this.isIdlePacing = false;
    this.rafId = requestAnimationFrame(this.renderFrame);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.isIdlePacing = false;
  }

  public setGameActive(active: boolean): void {
    this.gameActive = Boolean(active);
  }

  public setFpsCap(cap: number): void {
    this.fpsCap = cap === 30 ? 30 : cap === 60 ? 60 : 0;
  }

  public isContextLost(): boolean {
    if (this.disposed) return true;
    try {
      return this.renderer.getContext().isContextLost();
    } catch {
      return true;
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.stop();
    this.desk.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          const anyMat = m as unknown as { map?: THREE.Texture | null };
          anyMat.map?.dispose();
          m.dispose();
        }
      } else if (mat) {
        const anyMat = mat as unknown as { map?: THREE.Texture | null };
        anyMat.map?.dispose();
        mat.dispose();
      }
    });
    this.capGeoStart.dispose();
    this.capGeoEnd.dispose();
    disposeSpriteTexCache();
    this.renderer.dispose();
    try {
      this.renderer.forceContextLoss();
    } catch {
      // Ignore if context already lost
    }
  }

  private readonly renderFrame = (nowMs: number): void => {
    if (this.disposed) return;
    const frameId = this.rafId;
    const workStart = performance.now();

    // Auto-detect native display VSync period during the first few direct rAF frames
    if (this.directRafPrevMs > 0 && this.vsyncSamples < 8) {
      const gap = nowMs - this.directRafPrevMs;
      if (gap >= 3.2 && gap <= 25) {
        this.vsyncMs = this.vsyncSamples === 0 ? gap : Math.min(this.vsyncMs, gap);
        this.vsyncSamples += 1;
      }
    }

    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.rafId !== frameId) return;

    const headsetSettling =
      Math.abs(this.sHeadset.v) > 0.02 ||
      Math.abs(this.sHeadset.x - (this.headsetOn ? 1 : 0)) > 0.01;

    // Sleep particles continue drawing at the idle rate.
    const busy =
      this.elapsed - this.lastInput < 3.0 ||
      this.elapsed - this.cursorActiveAt < 2.4 ||
      this.isCross ||
      this.petting ||
      this.idleAct !== null ||
      this.scruffAmt > 0.02 ||
      (this.peekAmt > 0.01 && this.peekAmt < 0.99) ||
      Math.abs(this.sPeek.v) > 0.02 ||
      Math.abs(this.sPeekHover.v) > 0.02 ||
      this.boopAmt > 0.02 ||
      this.chinAmt > 0.02 ||
      this.tailGlanceAmt > 0.02 ||
      this.tailRecoil > 0.02 ||
      this.elapsed < this.curiousUntil ||
      this.popups.length > 0 ||
      this.fxList.some((fx) => fx.kind !== 'z') ||
      (this.sleepAmt > 0.02 && this.sleepAmt < 0.98) ||
      headsetSettling ||
      Math.abs(this.sOrbitAz.v) > 0.05 ||
      Math.abs(this.sOrbitEl.v) > 0.05;

    // Trigger one-time OS working-set trim once deeply asleep to keep idle RAM minimal
    if (this.sleepAmt > 0.96) {
      if (!this.sleepTrimSent) {
        this.sleepTrimSent = true;
        this.onDeepSleep?.();
      }
    } else if (this.sleepAmt < 0.2) {
      this.sleepTrimSent = false;
    }

    // Smart adaptive frame pacing:
    // - Calibrate VSync over first 8 active frames
    // - User Eco 30 FPS or Game Eco Mode: cap cleanly at 30 FPS (cuts GPU/CPU by 2x-8x!)
    // - On 60Hz monitors in normal mode: native direct rAF (0 timer jitter)
    // - On 120-240Hz monitors in normal mode: cap cleanly at 60 FPS (cuts 240Hz GPU/CPU by 4x!)
    // - Idle awake: ~18 FPS (55ms); Deep sleep: ~12 FPS (85ms)
    const eco30 = this.gameActive || this.fpsCap === 30;
    if (busy && (this.vsyncSamples < 8 || (!eco30 && this.vsyncMs >= 13.5))) {
      this.isIdlePacing = false;
      this.directRafPrevMs = nowMs;
      this.rafId = requestAnimationFrame(this.renderFrame);
      return;
    }

    this.directRafPrevMs = 0;
    const workMs = performance.now() - workStart;
    const targetMs = busy
      ? eco30
        ? 33.33
        : 16.67
      : this.sleepAmt > 0.95
        ? 85
        : 55;
    const sleepMs = Math.max(4, Math.round(targetMs - workMs - this.vsyncMs * 0.35));

    this.rafId = null;
    this.isIdlePacing = !busy;
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = null;
      this.isIdlePacing = false;
      this.rafId = requestAnimationFrame(this.renderFrame);
    }, sleepMs);
  };

  public setCatSkin(skin: CatSkinConfig): void {
    this.currentSkin = skin;
    this.applyContourGeometry(skin);
    const p = resolveFurPalette3D(skin, this.renderStyle);
    this.currentPalette = p;
    this.furSystem.applyPalette(p, skin.spots || []);
    this.desk.setAccentColors(p.accent, p.accentRight);
    this.desk.setStyle(this.renderStyle);

    this.toeMat.color.set(p.toe);
    this.whiskerMat.color.set(p.whisker);
    this.whiskerMat.opacity = p.whiskerOpacity;
    this.blushMat.color.set(p.blush || '#f4889e');
    this.lidArcMat.color.set(p.lid);
    this.squintMat.color.set(p.squintLine);
    this.tuckLineMat.color.set(p.isDarkFur ? '#b2b8c4' : '#7b6e64');
    this.tuckLineMat.opacity = p.isDarkFur ? 0.36 : 0.24;

    const showNose = Boolean(p.nose) && this.currentContour.noseShape !== 'none';
    this.mouthEnabled = Boolean(p.mouth) && this.currentContour.mouthShape !== 'none';
    this.faceGroup.visible = showNose || this.mouthEnabled;
    this.noseMesh.visible = showNose;
    this.mouthTube.mesh.visible = this.mouthEnabled;
    this.blepMesh.visible = this.mouthEnabled && this.currentContour.mouthShape === 'blep';
    if (p.nose) this.noseMat.color.set(p.nose);
    if (p.mouth) this.mouthMat.color.set(p.mouth);
    this.eyebrowMat.color.set(p.eyebrow || p.lid);

    const pupilShapeCode =
      this.currentContour.pupilShape === 'round'
        ? 1
        : this.currentContour.pupilShape === 'slit'
          ? 2
          : this.currentContour.pupilShape === 'dot'
            ? 3
            : this.currentContour.pupilShape === 'star'
              ? 4
              : 0;

    const lashCol = p.isDarkFur ? '#0b0c10' : p.lid;
    for (const e of this.eyes) {
      const topCol = e.s === 1 && p.rightEyeTop ? p.rightEyeTop : p.eyeTop;
      const botCol = e.s === 1 && p.rightEyeBottom ? p.rightEyeBottom : p.eyeBottom;
      (e.mat.uniforms.uEyeTop.value as THREE.Color).set(topCol);
      (e.mat.uniforms.uEyeBottom.value as THREE.Color).set(botCol);
      (e.mat.uniforms.uPupilCol.value as THREE.Color).set(p.pupil);
      (e.mat.uniforms.uLashCol.value as THREE.Color).set(lashCol);
      e.mat.uniforms.uRestSquint.value = this.currentContour.eyeSquint;
      e.mat.uniforms.uPupilShape.value = pupilShapeCode;
      e.mat.uniforms.uIs3D.value = this.renderStyle === '3d' ? 1.0 : 0.0;
      e.mat.uniforms.uLimbalAmt.value = p.isDarkFur ? 0.22 : 0.56;
    }
  }

  public setRenderStyle(style: RenderStyle3D): void {
    this.renderStyle = style;
    const is3d = style === '3d' ? 1 : 0;
    for (const m of this.headsetShaderMats) {
      m.uniforms.uIs3D.value = is3d;
    }
    if (this.currentSkin) {
      this.setCatSkin(this.currentSkin);
    }
  }

  public setCollar(id: CollarColorId): void {
    this.collarId = id;
    if (id === 'none') {
      this.collarGroup.visible = false;
    } else {
      this.collarGroup.visible = true;
      this.collarMat.color.set(COLLAR_COLORS[id]);
      this.placeHeadAndCollar();
    }
  }

  public setHeadphones(active: boolean): void {
    const next = Boolean(active);
    if (next !== this.headsetOn) {
      this.headsetOn = next;
      if (next) {
        this.sHeadset.kick(1.8);
      }
      this.wakeRendering();
    }
  }

  public setKeyboardConfig(layout: KeyboardLayoutId, orient: KeyboardOrientation, keyboardLang: KeyboardLang = 'en'): void {
         this.desk.rebuildBoard(layout, orient, keyboardLang);
         this.keyboardLang = keyboardLang;
          this.syncDeskFloorShadows();
          this.paws.L.keyId = null;
          this.paws.R.keyId = null;
      this.tailTap.keyId = null;
    }

  public setChromaKeyBg(hex: string | null): void {
    const normalized = typeof hex === 'string' && hex.trim() ? hex.trim() : null;
    this.chromaKeyBg = normalized;
    this.applyChromaKeyState();
    this.wakeRendering();
  }

  private applyChromaKeyState(): void {
    if (this.disposed) return;
    if (this.chromaKeyBg) {
      this.renderer.setClearColor(new THREE.Color(this.chromaKeyBg), 1);
      this.catShadow.visible = false;
    } else {
      this.renderer.setClearColor(0x000000, 0);
      this.catShadow.visible = clamp(this.peekAmt, 0, 1) < 0.35;
    }
    this.syncDeskFloorShadows();
  }

  private syncDeskFloorShadows(): void {
    const showFloorShadows = this.chromaKeyBg === null;
    this.desk.deskGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!(obj.geometry instanceof THREE.PlaneGeometry)) return;
      if (obj.renderOrder !== 0) return;
      if (Math.abs(obj.rotation.x + Math.PI / 2) > 0.01 || obj.position.y > 0.01) return;
      const mat = obj.material;
      if (
        mat instanceof THREE.MeshBasicMaterial &&
        mat.transparent &&
        !mat.depthWrite &&
        Boolean(mat.map)
      ) {
        obj.visible = showFloorShadows;
      }
    });
  }

  public setTailKeyConfig(mode: TailKeyMode, keyIds: readonly string[]): void {
    this.tailKeyMode =
      mode === 'custom' || mode === 'edge' || mode === 'off' ? mode : 'smart';
    this.tailKeyIdSet = new Set(
      (Array.isArray(keyIds) ? keyIds : []).map((id) => String(id).trim().toLowerCase()).filter(Boolean),
    );
    if (this.tailKeyMode === 'off') {
      this.tailTap.down = false;
      this.tailTap.keyId = null;
    }
  }

  public setRenderScale(scale: number): void {
    this.renderScale = clamp(scale, 0.2, 2.0);
  }

  public onPrivacyTyping(): void {
    if (this.privacyMode) {
      this.sSquash.kick(0.22);
      this.wakeRendering();
    }
  }

  public getSleepStatus(): { asleep: boolean; sleepAmt: number; idleSec: number; sleepAfterSec: number } {
    return {
      asleep: this.asleep,
      sleepAmt: this.sleepAmt,
      idleSec: Math.max(0, this.elapsed - this.lastInput),
      sleepAfterSec: this.embedded ? 18 : 28,
    };
  }

  public setPrivacyMode(active: boolean): void {
    this.privacyMode = active;
    if (active) {
      this.desk.releaseAllKeys();
      this.paws.L.down = false;
      this.paws.R.down = false;
      this.tailTap.down = false;
      this.isCross = false;
      this.curiousUntil = -100;
    }
  }

  public addOrbitDelta(dAzDeg: number, dElDeg: number): void {
    this.orbitAzimuthTarget = clamp(this.orbitAzimuthTarget + dAzDeg, -165, 165);
    this.orbitElevTarget = clamp(this.orbitElevTarget + dElDeg, 6, 58);
    this.wakeRendering();
  }

  public resetOrbit(): void {
    this.orbitAzimuthTarget = 0;
    this.orbitElevTarget = 24.5;
    this.wakeRendering();
  }

  public triggerCuriousDemo(durSec = 3.6): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.curiousUntil = this.elapsed + durSec;
    this.sCurious.kick(2.4);
    this.sEars.kick(2.2);
  }

  public triggerCrossDemo(): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.curiousUntil = -100;
    this.annoy = 0.96;
    this.lastPoke = this.elapsed;
    this.isCross = true;
    this.crossSince = this.elapsed;
    this.crossHuffDir = this.cursorNdc.x >= 0 ? -1 : 1;
    this.thumpPhase = 0;
  }

  public triggerSleepDemo(): void {
    this.isCross = false;
    this.annoy = 0;
    this.curiousUntil = -100;
    this.idleAct = null;
    this.asleep = true;
    this.lastInput = this.elapsed - 90;
    this.nextZ = this.elapsed + 0.45;
  }

  public triggerTailPatDemo(): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    const targetId = this.desk.getKeyById('enter') ? 'enter' : 'space';
    this.triggerTailKey(targetId, targetId === 'enter' ? 'Enter' : 'Space');
    window.setTimeout(() => {
      if (this.tailTap.keyId === targetId) this.tailTap.down = false;
    }, 180);
  }

  public triggerHappyDemo(durSec = 2.6): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.curiousUntil = -100;
    this.petting = true;
    this.petUntil = Math.max(this.petUntil, this.elapsed + durSec);
    this.sSquash.kick(0.32);
    this.wakeRendering();
  }

  public triggerWakeDemo(): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.wakeRendering();
  }

  private startIdleVignette(kind: IdleAct3D['kind'], durSec: number, side: -1 | 1 = Math.random() < 0.5 ? -1 : 1): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.curiousUntil = -100;
    this.boopUntil = -100;
    this.chinUntil = -100;
    this.dozeJoltFired = false;
    this.groomSparkleFired = false;
    this.kneadPhase = 0;
    this.idleAct = { kind, t0: this.elapsed, dur: durSec, side };
    this.nextIdleAct = this.elapsed + durSec + 3.6 + Math.random() * 4.0;
    this.wakeRendering();
  }

  public triggerDozeDemo(): void {
    this.startIdleVignette('doze', 3.5);
  }

  public triggerYawnDemo(): void {
    this.startIdleVignette('yawn', 2.5);
  }

  public triggerStretchDemo(): void {
    this.startIdleVignette('stretch', 2.7);
  }

  public triggerGroomDemo(): void {
    this.startIdleVignette('groom', 3.4);
  }

  public triggerKneadDemo(): void {
    this.startIdleVignette('knead', 4.0);
  }

  public setPeekEdge(edge: PeekEdge): void {
    const next: PeekEdge = edge === 'left' || edge === 'right' ? edge : 'none';
    const hadPreview = this.peekPreviewEdge !== 'none';
    this.peekPreviewEdge = 'none';
    if (next !== this.peekEdge) {
      this.peekEdge = next;
      if (next !== 'none') {
        this.peekVisualEdge = next;
        this.isCross = false;
        this.annoy = 0;
        this.idleAct = null;
        this.asleep = false;
        this.sPeek.kick(1.4);
      } else {
        this.sSquash.kick(0.95);
        catAudio.playSoftLand();
      }
      this.wakeRendering();
    } else if (hadPreview) {
      this.wakeRendering();
    }
  }

  /** Live drag preview: cat preemptively tucks desk & peeks its head while dragged into a screen edge (Option 2, no neon bar!). */
  public setPeekPreview(edge: PeekEdge): void {
    const next: PeekEdge = edge === 'left' || edge === 'right' ? edge : 'none';
    if (next !== this.peekPreviewEdge) {
      this.peekPreviewEdge = next;
      if (next !== 'none') {
        this.peekVisualEdge = next;
        this.sEars.kick(1.6);
      }
      this.wakeRendering();
    }
  }

  public getPeekEdge(): PeekEdge {
    return this.peekEdge;
  }

  public triggerScruffDemo(durSec = 2.6): void {
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.idleAct = null;
    this.curiousUntil = -100;
    this.scruffDemoUntil = this.elapsed + durSec;
    this.sScruff.kick(2.6);
    this.sScruffSwing.kick(4.2);
    this.wakeRendering();
  }

  public setDragging(dragging: boolean, velX = 0): void {
    const wasActive = this.isDragging || this.elapsed < this.scruffDemoUntil;
    this.isDragging = Boolean(dragging);
    if (dragging) {
      this.scruffDemoUntil = -100;
      this.wake('gentle');
      this.wakeAt = -100;
      this.isCross = false;
      this.annoy = 0;
      this.idleAct = null;
      this.curiousUntil = -100;
      this.scruffDragVelX = clamp(velX, -2.8, 2.8);
      if (!wasActive) {
        this.sScruff.kick(2.4);
        this.sScruffSwing.kick((Math.random() < 0.5 ? -1 : 1) * 1.9);
      }
      this.wakeRendering();
    } else {
      this.scruffDemoUntil = -100;
      this.scruffDragVelX = 0;
      if (wasActive && this.scruffAmt > 0.22) {
        this.onScruffLand();
      }
      this.wakeRendering();
    }
  }

  public updateDragVelocity(velX: number): void {
    if (!this.isDragging) return;
    const clamped = clamp(velX, -2.8, 2.8);
    this.scruffDragVelX = this.scruffDragVelX * 0.40 + clamped * 0.60;
    this.sScruffSwing.kick(-clamped * 2.1);
    this.wakeRendering();
  }

  private onScruffLand(): void {
    this.sSquash.kick(1.45);
    this.sDeskHop.kick(0.46);
    catAudio.playSoftLand();
    for (const side of [-1, 1] as const) {
      this.spawnFx(
        'dust',
        new THREE.Vector3(this.homePos.x + side * 0.52, 0.10, this.homePos.z + 0.22),
        new THREE.Vector3(side * 0.48, 0.26, 0.14),
        0.15,
        0.42,
      );
    }
  }

  public triggerBoopDemo(): void {
    if (this.privacyMode) return;
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.idleAct = null;
    this.curiousUntil = -100;
    this.boopStartAt = this.elapsed;
    this.boopUntil = this.elapsed + 1.15;
    this.boopSneezeFired = false;
    this.sSquash.kick(-0.55);
    this.sPitch.kick(-1.1);
    this.sRoll.kick((Math.random() < 0.5 ? -1 : 1) * 1.2);
    this.sEars.kick(1.8);
    catAudio.playBoopSneeze();
    this.wakeRendering();
  }

  public triggerChinScratchDemo(durSec = 2.8): void {
    if (this.privacyMode) return;
    this.wake('gentle');
    this.wakeAt = -100;
    this.isCross = false;
    this.annoy = 0;
    this.idleAct = null;
    this.curiousUntil = -100;
    this.chinUntil = Math.max(this.chinUntil, this.elapsed + durSec);
    this.nextHeartAt = Math.min(this.nextHeartAt, this.elapsed + 0.08);
    this.wakeRendering();
  }

  public triggerTailPokeDemo(): void {
    if (this.privacyMode) return;
    this.wake('gentle');
    this.wakeAt = -100;
    this.idleAct = null;
    this.curiousUntil = -100;
    this.tailPokeTimes = this.tailPokeTimes.filter((s) => this.elapsed - s < 6.0);
    this.tailPokeTimes.push(this.elapsed);
    this.sTailRecoil.kick(5.0);
    this.tailGlanceUntil = this.elapsed + 1.55;
    this.sSquash.kick(-0.35);
    this.sYaw.kick(1.2);
    const tip = this.tailCurve.points[this.tailCurve.points.length - 1];
    this.spawnFx(
      'sparkle',
      new THREE.Vector3(tip.x, tip.y + 0.14, tip.z + 0.05),
      new THREE.Vector3(0.14, 0.34, 0.04),
      0.22,
      0.44,
    );
    if (this.tailPokeTimes.length >= 3) {
      this.tailPokeTimes = [];
      catAudio.playTailFlick(true);
      this.triggerCrossDemo();
    } else {
      catAudio.playTailFlick(false);
    }
    this.wakeRendering();
  }

  public hitTestCatZoneAtClientPoint(clientX: number, clientY: number): CatHitZone {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return null;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);

    if (this.peekAmt < 0.50) {
      const tailHits = this.raycaster.intersectObjects(this.tailHitMeshes, false);
      if (tailHits.length > 0) return 'tail';
    }

    const bodyHits = this.raycaster.intersectObjects(this.petMeshes, false);
    if (bodyHits.length === 0) return null;

    this.headMount.updateMatrixWorld(true);
    const localPt = bodyHits[0].point.clone();
    this.headMount.worldToLocal(localPt);
    if (Math.abs(localPt.x) < 0.23 && localPt.y > -0.16 && localPt.y < 0.15 && localPt.z > 0.08) {
      return 'nose';
    }
    if (Math.abs(localPt.x) < 0.38 && localPt.y <= -0.16 && localPt.y > -0.54 && localPt.z > 0.04) {
      return 'chin';
    }
    if (localPt.y >= -0.05) {
      return 'head';
    }
    return 'body';
  }

  public onCatTapAtClientPoint(clientX: number, clientY: number): CatHitZone {
    const zone = this.hitTestCatZoneAtClientPoint(clientX, clientY);
    if (!zone || this.privacyMode) return zone;
    if (zone === 'nose') {
      this.triggerBoopDemo();
    } else if (zone === 'tail') {
      this.triggerTailPokeDemo();
    } else if (zone === 'chin') {
      this.triggerChinScratchDemo(1.8);
    } else if (zone === 'head') {
      this.triggerHappyDemo(1.1);
      this.sEars.kick(1.4);
    } else if (zone === 'body') {
      this.wake('gentle');
      this.sSquash.kick(0.55);
    }
    return zone;
  }

  public getHitZoneScreenMarkers(): Array<{ zone: CatHitZone; x: number; y: number }> {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return [];
    this.headMount.updateMatrixWorld(true);
    const proj = (world: THREE.Vector3) => {
      const p = world.clone().project(this.camera);
      return {
        x: (p.x * 0.5 + 0.5) * rect.width,
        y: (-p.y * 0.5 + 0.5) * rect.height,
      };
    };
    const noseW = new THREE.Vector3(0, -0.03, 0.50).applyMatrix4(this.headMount.matrixWorld);
    const chinW = new THREE.Vector3(0, -0.34, 0.44).applyMatrix4(this.headMount.matrixWorld);
    const headW = new THREE.Vector3(0, 0.28, 0.36).applyMatrix4(this.headMount.matrixWorld);
    const tailW = this.tailCurve.points[Math.min(4, this.tailCurve.points.length - 1)].clone();
    return [
      { zone: 'head', ...proj(headW) },
      { zone: 'nose', ...proj(noseW) },
      { zone: 'chin', ...proj(chinW) },
      { zone: 'tail', ...proj(tailW) },
    ];
  }

  public onKeyDown(vk: number, repeat = false): void {
    if (this.privacyMode) {
      if (!repeat) {
        this.sSquash.kick(0.25);
        this.wakeRendering();
      }
      return;
    }
    const k = this.desk.resolveKey(vk);
    if (!k) return;
    this.wake(repeat ? 'gentle' : 'abrupt');
    if (repeat) return;

    this.lastKey = this.elapsed;
    this.strokes.push(this.elapsed);
    const burst = this.strokes.filter((s) => this.elapsed - s < 0.18).length;
    if (burst >= 4) {
      this.pokeAnnoy(0.32);
    }

    const useTail =
      this.tailKeyMode === 'custom'
        ? this.tailKeyIdSet.has(k.spec.id)
        : !this.isCross &&
          this.tailKeyMode !== 'off' &&
          (this.desk.isRightEdgeTailKey(k.spec.id) ||
            (this.tailKeyMode === 'smart' && (k.spec.id === 'space' || k.spec.id === 'enter')));
    if (useTail) {
          this.triggerTailKey(k.spec.id, getKeyBubble(k.spec, this.keyboardLang));
          return;
        }

    const mousingNow = this.isMousing();
    const isLeftSideScreen = k.x < 0.05;
    const pawKey: 'L' | 'R' = mousingNow ? 'R' : isLeftSideScreen ? 'L' : 'R';
    const paw = this.paws[pawKey];
    paw.from.copy(paw.pos);
    paw.keyId = k.spec.id;
    paw.t0 = this.elapsed;
    paw.lastActive = this.elapsed;
    const keyWorld = this.desk.keyTopWorld(k.spec.id, this.tmpV1);
    paw.dur = clamp(paw.pos.distanceTo(keyWorld) * 0.085, 0.048, 0.095);
    paw.down = true;
    this.desk.setKeyDown(k.spec.id, true);

    this.sSquash.kick(0.32);
    this.sPitch.kick(0.75);
    if (this.showKeyBubbles) {
          this.spawnKeyPopup(k.spec.id, getKeyBubble(k.spec, this.keyboardLang), paw.side);
        }
  }

  public onKeyUp(vk: number): void {
    const k = this.desk.resolveKey(vk);
    if (!k) return;
    if (this.tailTap.keyId === k.spec.id) {
      this.tailTap.down = false;
    }
    this.desk.setKeyDown(k.spec.id, false);
    if (this.paws.L.keyId === k.spec.id) this.paws.L.down = false;
    if (this.paws.R.keyId === k.spec.id) this.paws.R.down = false;
    for (const p of this.popups) {
      if (p.keyId === k.spec.id && p.upAt === null) p.upAt = this.elapsed;
    }
  }

  public onGlobalMouseMove(nx: number, ny: number): void {
    const moveDelta = Math.hypot(nx - this.lastMouseNX, ny - this.lastMouseNY);
    // Ignore 0px synthetic repeats & tiny optical-sensor desk vibration so sleep countdown never falsely resets!
    const jitterThreshold = this.asleep || this.sleepAmt > 0.35 ? 0.006 : 0.0028;
    if (moveDelta < jitterThreshold) {
      return;
    }

    this.lastMouseNX = nx;
    this.lastMouseNY = ny;

    const typingNow = this.elapsed - this.lastKey < 0.5 || this.paws.L.down || this.paws.R.down;
    if (typingNow && moveDelta < 0.015) {
      return;
    }

    this.wake('abrupt');
    const gap = this.elapsed - this.lastSampleT;
    if (this.lastSampleX !== null && this.lastSampleY !== null && gap > 0 && gap <= 0.14) {
      const dist = Math.hypot(nx - this.lastSampleX, ny - this.lastSampleY);
      if (dist > 0.0015 && dist < 0.45) {
        this.pointerSamples.push({ t: this.elapsed, dist });
      }
    }
    this.lastSampleX = nx;
    this.lastSampleY = ny;
    this.lastSampleT = this.elapsed;

    this.desk.setMouseNormalized(clamp(nx, 0, 1), clamp(ny, 0, 1));
    this.lastMouse = this.elapsed;
    this.paws.L.lastActive = this.elapsed;
  }

  public onWindowCursor(relX: number, relY: number, overCat: boolean): void {
    const delta = Math.hypot(relX - this.lastCursorRelX, relY - this.lastCursorRelY);
    this.lastCursorRelX = relX;
    this.lastCursorRelY = relY;
    const nextPeekHover = this.peekEdge !== 'none' && overCat;
    if (nextPeekHover !== this.peekHoveredNow) {
      this.peekHoveredNow = nextPeekHover;
      this.wakeRendering();
    }
    if (delta > 0.0015) {
      this.cursorNdc.set(clamp(relX * 2 - 1, -1.6, 1.6), clamp(1 - relY * 2, -1.4, 1.4));
      this.cursorActiveAt = this.elapsed;
      this.wakeRendering();
    }
    if (overCat && !this.leftMouseDown && !this.rightMouseDown && delta > 0.006) {
      // Lower face / upper chest rub triggers warm chin scratch; upper head rub triggers classic head petting!
      const isChinZone = relY >= 0.44 && relY <= 0.62 && relX >= 0.36 && relX <= 0.64;
      if (isChinZone) {
        this.chinUntil = Math.max(this.chinUntil, this.elapsed + 0.52);
        this.nextHeartAt = Math.min(this.nextHeartAt, this.elapsed + 0.14);
      } else {
        this.petting = true;
        this.petUntil = this.elapsed + 0.36;
        this.petX = clamp(this.cursorNdc.x * 2.0, -1, 1);
        this.hadHeartyPet = true;
      }
      this.wake('gentle');
      this.wakeAt = -100;
      this.isCross = false;
      this.annoy = 0;
    }
  }

  public onMouseDown(btn: string): void {
    this.wake('abrupt');
    this.lastMouse = this.elapsed;
    this.paws.L.lastActive = this.elapsed;
    if (btn === 'left') this.leftMouseDown = true;
    if (btn === 'right') this.rightMouseDown = true;
    if (btn === 'middle') this.desk.pulseScrollWheel();
    this.sSquash.kick(0.24);
  }

  public onMouseUp(btn: string): void {
    if (btn === 'left') this.leftMouseDown = false;
    if (btn === 'right') this.rightMouseDown = false;
  }

  public onMouseWheel(): void {
    this.wake('abrupt');
    this.lastMouse = this.elapsed;
    this.paws.L.lastActive = this.elapsed;
    this.desk.pulseScrollWheel();
  }

  public onPointerMove(
    clientX: number,
    clientY: number,
    insideCanvas: boolean,
    allowPetting: boolean,
  ): boolean {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;

    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    this.cursorNdc.set(nx * 2 - 1, -(ny * 2 - 1));
    this.cursorActiveAt = this.elapsed;
    this.wakeRendering();

    const sx = clientX / 1440;
    const sy = clientY / 1440;
    const gap = this.elapsed - this.lastSampleT;
    if (this.lastSampleX !== null && this.lastSampleY !== null && gap > 0 && gap <= 0.14) {
      const dist = Math.hypot(sx - this.lastSampleX, sy - this.lastSampleY);
      if (dist > 0.0015 && dist < 0.45) {
        this.pointerSamples.push({ t: this.elapsed, dist });
      }
    }
    this.lastSampleX = sx;
    this.lastSampleY = sy;
    this.lastSampleT = this.elapsed;

    if (insideCanvas) {
      this.desk.setMouseNormalized(clamp(nx, 0, 1), clamp(ny, 0, 1));
      if (this.elapsed - this.lastKey > 0.45) {
        this.lastMouse = this.elapsed;
        this.paws.L.lastActive = this.elapsed;
      }
    }

    let overHead = false;
    this.peekHoveredNow = false;
    if (insideCanvas && allowPetting && !this.leftMouseDown && !this.rightMouseDown && !this.isDragging) {
      this.raycaster.setFromCamera(this.cursorNdc, this.camera);
      const hits = this.raycaster.intersectObjects(this.petMeshes, false);
      if (hits.length > 0 && (this.peekAmt > 0.35 || hits[0].point.y >= 0.92)) {
        this.headMount.updateMatrixWorld(true);
        const localPt = hits[0].point.clone();
        this.headMount.worldToLocal(localPt);
        if (this.peekAmt > 0.35) {
          this.peekHoveredNow = true;
        }
        const inChin = Math.abs(localPt.x) < 0.36 && localPt.y <= -0.16 && localPt.y > -0.52 && localPt.z > 0.04;
        if (inChin) {
          overHead = true;
          this.chinUntil = Math.max(this.chinUntil, this.elapsed + 0.45);
          this.nextHeartAt = Math.min(this.nextHeartAt, this.elapsed + 0.14);
          this.wake('gentle');
          this.wakeAt = -100;
          this.isCross = false;
          this.annoy = 0;
        } else if (this.peekAmt > 0.35 || hits[0].point.y >= 1.15) {
          overHead = true;
          this.petting = true;
          this.petUntil = this.elapsed + 0.30;
          this.petX = clamp(this.cursorNdc.x * 2.5, -1, 1);
          this.hadHeartyPet = true;
          this.wake('gentle');
          this.wakeAt = -100;
          this.isCross = false;
          this.annoy = 0;
        }
      }
    }
    return overHead;
  }

  public getStateSummary(): {
    mood: string;
    activeIdle: string | null;
    peekEdge: PeekEdge;
    orbitAz: number;
    orbitEl: number;
    collar: CollarColorId;
    style: RenderStyle3D;
  } {
    const previewActive = this.peekPreviewEdge !== 'none';
    const scruffActive = !previewActive && (this.isDragging || this.elapsed < this.scruffDemoUntil || this.scruffAmt > 0.35);
    const mood = this.privacyMode
      ? '隐私防偷窥 🙈'
      : previewActive
        ? this.peekVisualEdge === 'left'
          ? '松手贴左边偷看 👀'
          : '松手贴右边偷看 👀'
        : scruffActive
          ? '被拎起后颈皮 🫳'
          : this.peekAmt > 0.45
          ? this.peekVisualEdge === 'left'
            ? '左侧贴边偷看 👀'
            : '右侧贴边偷看 👀'
          : this.boopAmt > 0.15
            ? '戳鼻头斗鸡眼 🤧'
            : this.isCross
              ? '生气飞机耳 💢'
              : this.tailGlanceAmt > 0.25
                ? '被戳尾巴警惕 ⚡'
                : this.chinAmt > 0.25
                  ? '挠下巴超享受 💛'
                  : this.sleepAmt > 0.5
                    ? '打瞌睡 Zzz'
                    : this.idleAct?.kind === 'doze'
                      ? '点头钓鱼犯困 😵‍💫'
                      : this.idleAct?.kind === 'yawn'
                        ? '打哈欠 🥱'
                        : this.idleAct?.kind === 'stretch'
                          ? '伸大懒腰 🐱'
                          : this.idleAct?.kind === 'groom'
                            ? '舔爪洗脸 🐾'
                            : this.idleAct?.kind === 'knead'
                              ? '键盘踩奶 🍞'
                              : this.elapsed < this.curiousUntil
                                ? '好奇大圆瞳 ✨'
                                : this.petting
                                  ? '被摸头呼噜中 💛'
                                  : '平静待机 3D 🐾';
    return {
      mood,
      activeIdle: this.idleAct?.kind ?? null,
      peekEdge: this.peekEdge,
      orbitAz: Math.round(this.orbitAzimuthTarget),
      orbitEl: Math.round(this.orbitElevTarget),
      collar: this.collarId,
      style: this.renderStyle,
    };
  }

  // ---- Internal helpers ----

  private wakeRendering(): void {
    // Only interrupt idle/sleep timers so active 60 FPS / 30 FPS pacing is never defeated by high-Hz mouse storms!
    if (this.idleTimer === null || !this.isIdlePacing) return;
    window.clearTimeout(this.idleTimer);
    this.idleTimer = null;
    this.isIdlePacing = false;
    this.rafId = requestAnimationFrame(this.renderFrame);
  }

  private wake(mode: 'gentle' | 'abrupt' = 'gentle'): void {
    const t = this.elapsed;
    const wasAsleep = this.asleep;
    const recentlyWoken = wasAsleep || this.sleepAmt >= 0.45 || t - this.wakeAt < 1.2;
    this.lastInput = t;
    this.scruffDemoUntil = -100;
    this.yawnDoneThisIdle = false;
    this.dozeDoneThisIdle = false;
    this.wakeRendering();
    if (wasAsleep) {
      this.asleep = false;
      this.wakeAt = t;
      this.sSquash.kick(-1.1);
    }
    if (mode === 'abrupt' && recentlyWoken && !this.privacyMode && !this.petting && !this.isCross) {
      // Grumpy wake-up ("起床气"): ~3.2s airplane ears + 3-beat tail desk-thump when rudely jolted from sleep!
      this.isCross = true;
      this.crossSince = t;
      this.crossHuffDir = this.cursorNdc.x >= 0 ? -1 : 1;
      this.thumpPhase = 0;
      this.curiousUntil = -100;
      this.idleAct = null;
      this.annoy = Math.max(this.annoy, 0.44);
      this.lastPoke = t - 1.2;
      this.wakeAt = -100;
    }
  }

  private isMousing(): boolean {
    return (
      !this.privacyMode &&
      !this.asleep &&
      (this.leftMouseDown || this.rightMouseDown || this.elapsed - this.lastMouse < 1.35)
    );
  }

  private pokeAnnoy(amount: number): void {
    this.annoy = Math.min(1, this.annoy + amount);
    this.lastPoke = this.elapsed;
  }

  private triggerTailKey(keyId: string, bubbleLabel: string): void {
    this.tailTap.keyId = keyId;
    this.tailTap.from = this.tailTap.reach;
    this.tailTap.t0 = this.elapsed;
    this.tailTap.dur = 0.135;
    this.tailTap.down = true;
    this.tailTap.landAt = this.elapsed;
    this.desk.setKeyDown(keyId, true);
    this.sSquash.kick(0.24);
    if (this.showKeyBubbles) {
      this.spawnKeyPopup(keyId, bubbleLabel, 1);
    }
    window.setTimeout(() => {
      if (!this.tailTap.down) this.desk.setKeyDown(keyId, false);
    }, 170);
  }

  private spawnKeyPopup(keyId: string, label: string, side: -1 | 1): void {
    if (this.peekAmt > 0.35) return;
    const clean = label.length > 6 ? label.slice(0, 6) : label;
    const { tex, aspect } = getPopupTexture(clean);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    const baseH = 0.25;
    const baseW = baseH * aspect;
    sprite.scale.set(baseW, baseH, 1);
    sprite.renderOrder = 40;
    const kp = this.desk.keyTopWorld(keyId, this.tmpV2);
    sprite.position.set(kp.x, kp.y + 0.14, kp.z);
    this.scene.add(sprite);
    this.popups.push({
      keyId,
      sprite,
      baseW,
      baseH,
      t0: this.elapsed,
      upAt: null,
      side,
    });
    if (this.popups.length > 5) {
      const old = this.popups.shift()!;
      this.scene.remove(old.sprite);
      old.sprite.material.dispose();
    }
  }

  private spawnFx(
    kind: 'bang' | 'dust' | 'z' | 'heart' | 'sparkle' | 'sneeze',
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    size: number,
    dur: number,
  ): void {
    const mat = new THREE.SpriteMaterial({
      map: getFxTexture(kind),
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos);
    sprite.scale.set(size, size, 1);
    sprite.renderOrder = 44;
    this.scene.add(sprite);
    this.fxList.push({ sprite, kind, vel, t0: this.elapsed, dur, size, baseX: pos.x });
  }

  private spawnSlamFx(): void {
    this.lastSlam = this.elapsed;
    this.sDeskHop.kick(0.70);
    this.sSquash.kick(0.32);
    const impact = this.tailCurve.points[this.tailCurve.points.length - 1];
    this.spawnFx('bang', new THREE.Vector3(impact.x, impact.y + 0.08, impact.z + 0.04), new THREE.Vector3(0, 0.08, 0), 0.34, 0.22);
    for (const side of [-1, 1] as const) {
      this.spawnFx(
        'dust',
        new THREE.Vector3(impact.x + side * 0.07, impact.y + 0.05, impact.z + 0.06),
        new THREE.Vector3(side * 0.45, 0.36, 0.16),
        0.13,
        0.38,
      );
    }
  }

  /**
   * Solves the exact world-space X coordinate that projects to `targetNdcX` (-1 = left canvas
   * border, +1 = right canvas border) at any given `(worldY, worldZ)` under the live perspective
   * camera (accounts automatically for FOV, aspect, 24.5° elevation, renderScale, 65%/108% & orbit).
   */
  private frustumEdgeX(targetNdcX: number, worldY: number, worldZ: number): number {
    this.tmpMat4.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    const e = this.tmpMat4.elements;
    const denom = e[0] - targetNdcX * e[3];
    if (Math.abs(denom) < 1e-6) return this.camAnchor.x;
    const num =
      (targetNdcX * e[7] - e[4]) * worldY +
      (targetNdcX * e[11] - e[8]) * worldZ +
      (targetNdcX * e[15] - e[12]);
    return num / denom;
  }

  private update(dt: number): void {
    this.elapsed += dt;
    const t = this.elapsed;

    // 1) Camera smooth 360° turntable framing (gently faces straight front during Edge-Peek so paws stay flush!)
    const az = (this.sOrbitAz.step(this.orbitAzimuthTarget, dt) * Math.PI) / 180;
    const el = (this.sOrbitEl.step(this.orbitElevTarget, dt) * Math.PI) / 180;
    const effAz = az * (1 - clamp(this.peekAmt, 0, 1));
    const is108 = this.desk.getLayoutId() === '108';
    const camKey = `${effAz.toFixed(4)}|${el.toFixed(4)}|${is108 ? 1 : 0}|${this.camera.aspect.toFixed(4)}|${this.renderScale.toFixed(3)}`;
    if (camKey !== this.lastCamKey) {
      this.lastCamKey = camKey;
      const baseDist = is108 ? 9.7 : 8.1;
      const reqHalfW = is108 ? 1.98 : 1.56;
      const tanHalfFov = Math.tan((this.camera.fov * Math.PI) / 360);
      const aspectFitDist = reqHalfW / (tanHalfFov * Math.max(0.55, this.camera.aspect));
      const dist = Math.max(baseDist, aspectFitDist) / Math.max(0.25, this.renderScale);
      this.camera.position.set(
        this.camAnchor.x + Math.sin(effAz) * Math.cos(el) * dist,
        this.camAnchor.y + Math.sin(el) * dist,
        this.camAnchor.z + Math.cos(effAz) * Math.cos(el) * dist,
      );
      this.camera.lookAt(this.camAnchor);
    }

    // 2) Emotional state machine (including doze, yawn, stretch, groom, knead + scruff, boop, chin scratch, tail poke!)
    this.strokes = this.strokes.filter((s) => t - s < 1.0);
    const cps = this.strokes.length;
    this.excite += (Math.min(1, cps / 7.5) - this.excite) * approach(7.5, dt);

    const previewWanted = !this.privacyMode && this.peekPreviewEdge !== 'none';
    const scruffWanted = !this.privacyMode && !previewWanted && (this.isDragging || t < this.scruffDemoUntil);
    const peekWanted = !this.privacyMode && (previewWanted || (this.peekEdge !== 'none' && !scruffWanted));
    const peekGoal = previewWanted ? 0.90 : peekWanted ? 1.0 : 0.0;
    this.peekAmt = clamp(this.sPeek.step(peekGoal, dt), 0, 1.06);
    const peek = clamp(this.peekAmt, 0, 1);
    const peekHoverWanted = (peekWanted && (this.peekHoveredNow || this.petting || t < this.chinUntil)) || previewWanted ? 1 : 0;
    this.peekHover = clamp(this.sPeekHover.step(peekHoverWanted, dt), 0, 1);
    if (!this.isDragging && this.scruffDemoUntil > 0 && t >= this.scruffDemoUntil) {
      this.scruffDemoUntil = -100;
      if (this.scruffAmt > 0.25) {
        this.onScruffLand();
      }
    }
    this.scruffAmt = clamp(this.sScruff.step(scruffWanted ? 1 : 0, dt), 0, 1.12);
    const scruff = clamp(this.scruffAmt, 0, 1);
    const targetScruffSwing = scruffWanted
      ? clamp(-this.scruffDragVelX * 1.05 + Math.sin(t * 3.9) * (t < this.scruffDemoUntil ? 1.05 : 0.44), -2.0, 2.0)
      : 0;
    this.scruffSwing = clamp(this.sScruffSwing.step(targetScruffSwing, dt), -2.2, 2.2);
    this.scruffDragVelX *= Math.exp(-5.5 * dt);

    // Nose Boop cross-eyed recoil + tiny sneeze burst
    const boopActive = !this.privacyMode && !scruffWanted && t < this.boopUntil;
    const boopElapsed = boopActive ? t - this.boopStartAt : -1;
    this.boopAmt += ((boopActive ? 1 : 0) - this.boopAmt) * approach(boopActive ? 18 : 8, dt);
    if (this.boopAmt < 0.004 && !boopActive) this.boopAmt = 0;
    this.boopCrossEye =
      boopActive && boopElapsed >= 0 && boopElapsed < 0.78
        ? Math.sin(Math.min(1, boopElapsed / 0.12) * (Math.PI * 0.5)) * (1 - Math.max(0, (boopElapsed - 0.52) / 0.26))
        : 0;
    if (boopActive && boopElapsed >= 0.30 && !this.boopSneezeFired) {
      this.boopSneezeFired = true;
      this.sSquash.kick(0.85);
      this.sPitch.kick(1.2);
      this.headMount.updateMatrixWorld(false);
      for (const s of [-1, 0, 1] as const) {
        const spPos = this.tmpFxPos.set(s * 0.08, -0.05, 0.56).applyMatrix4(this.headMount.matrixWorld).clone();
        this.spawnFx(
          'sneeze',
          spPos,
          new THREE.Vector3(s * 0.45, -0.10 + Math.random() * 0.12, 0.42),
          0.16 - Math.abs(s) * 0.03,
          0.38,
        );
      }
    }
    this.boopShake =
      boopActive && boopElapsed >= 0.30 && boopElapsed < 0.72
        ? Math.sin((boopElapsed - 0.30) * 44) * 0.22 * (1 - (boopElapsed - 0.30) / 0.42)
        : 0;

    // Chin scratch bliss + rising warm hearts
    const chinActive = !this.privacyMode && !this.isCross && !scruffWanted && t < this.chinUntil;
    this.chinAmt += ((chinActive ? 1 : 0) - this.chinAmt) * approach(10, dt);
    if (this.chinAmt < 0.004 && !chinActive) this.chinAmt = 0;
    if (chinActive && this.chinAmt > 0.42 && t >= this.nextHeartAt) {
      this.nextHeartAt = t + 0.44 + Math.random() * 0.24;
      this.headMount.updateMatrixWorld(false);
      const side = Math.random() < 0.5 ? -1 : 1;
      const hPos = this.tmpFxPos
        .set(side * (0.42 + Math.random() * 0.14), 0.06 + Math.random() * 0.12, 0.26)
        .applyMatrix4(this.headMount.matrixWorld)
        .clone();
      this.spawnFx('heart', hPos, new THREE.Vector3(side * 0.08, 0.44, 0.02), 0.22, 1.45);
    }

    // Tail poke recoil + suspicious side glance
    this.tailRecoil = clamp(this.sTailRecoil.step(0, dt), 0, 1.2);
    const tailGlanceNow = !this.privacyMode && !this.isCross && !scruffWanted && t < this.tailGlanceUntil;
    this.tailGlanceAmt += ((tailGlanceNow ? 1 : 0) - this.tailGlanceAmt) * approach(12, dt);
    if (this.tailGlanceAmt < 0.004 && !tailGlanceNow) this.tailGlanceAmt = 0;

    const sleepAfterSec = this.embedded ? 20 : 28;
    const idleSec = t - this.lastInput;
    const blockingSleep =
      scruffWanted ||
      peekWanted ||
      boopActive ||
      chinActive ||
      this.petting ||
      (this.idleAct !== null && ['doze', 'yawn', 'stretch', 'groom', 'knead'].includes(this.idleAct.kind));
    if (!this.asleep && !this.privacyMode && !blockingSleep && idleSec > sleepAfterSec) {
      this.asleep = true;
      this.isCross = false;
      this.idleAct = null;
      this.nextZ = t + 0.9;
    }
    const wantSleep = this.asleep && !this.privacyMode && !scruffWanted ? 1 : 0;
    this.sleepAmt += (wantSleep - this.sleepAmt) * approach(wantSleep ? 1.5 : 6.5, dt);
    if (this.sleepAmt < 0.002 && !wantSleep) this.sleepAmt = 0;

    this.privacyClose += ((this.privacyMode ? 1 : 0) - this.privacyClose) * approach(14, dt);

    if (this.petting && t > this.petUntil) {
      this.petting = false;
      if (this.hadHeartyPet) {
        this.petEndedAt = t;
      }
    }
    const petActive = this.petting && !this.privacyMode && !this.isCross && !scruffWanted;

    // Curious trigger from swift cursor sweep
    this.pointerSamples = this.pointerSamples.filter((s) => t - s.t <= 0.22);
    const pointerSpeed = this.pointerSamples.reduce((a, s) => a + s.dist, 0) / 0.22;
    const canCurious =
      !this.asleep && !this.privacyMode && !this.isCross && !scruffWanted && !boopActive && !chinActive && t - this.lastKey > 0.9;
    if (canCurious && this.pointerSamples.length >= 4 && pointerSpeed > 0.92) {
      this.curiousUntil = Math.max(this.curiousUntil, t + 2.2);
    }
    const curiousNow =
      !this.asleep && !this.privacyMode && !this.isCross && !scruffWanted && !boopActive && t < this.curiousUntil;
    const curious = clamp(this.sCurious.step(curiousNow ? 1 : 0, dt), 0, 1);

    // Grumpy annoyance state
    if (!this.privacyMode && !this.asleep && !scruffWanted) {
      if (cps > 8.5) {
        this.pokeAnnoy((cps - 8.5) * 0.055 * dt);
      } else if (this.isCross && t - this.lastKey < 0.9 && cps >= 4) {
        this.lastPoke = t;
      }
      if (t - this.lastPoke > 2.2) {
        this.annoy = Math.max(0, this.annoy - 0.15 * dt);
      }
      if (!this.isCross && this.annoy >= 0.62) {
        this.isCross = true;
        this.crossSince = t;
        this.crossHuffDir = this.cursorNdc.x >= 0 ? -1 : 1;
        this.thumpPhase = 0;
        this.curiousUntil = -100;
        this.idleAct = null;
      } else if (this.isCross && this.annoy < 0.26 && t - this.crossSince > 3.2) {
        this.isCross = false;
      }
    } else {
      this.isCross = false;
      this.annoy = Math.max(0, this.annoy - 0.35 * dt);
    }
    const cross = clamp(this.sCross.step(this.isCross ? 1 : 0, dt), 0, 1);

    // Calm idle fidgets & feline life vignettes (doze, yawn, stretch, groom, knead!)
    if (this.idleAct && t > this.idleAct.t0 + this.idleAct.dur) this.idleAct = null;
    if (
      !this.idleAct &&
      !this.asleep &&
      !this.privacyMode &&
      !scruffWanted &&
      !peekWanted &&
      !boopActive &&
      !chinActive &&
      !petActive &&
      !this.isCross &&
      !curiousNow
    ) {
      const hour = new Date().getHours();
      const isLateNight = hour >= 23 || hour < 5;
      const dozeStartSec = this.embedded ? 13.5 : isLateNight ? 16.0 : 20.5;
      const yawnStartSec = this.embedded ? 10.0 : isLateNight ? 11.5 : 14.5;

      if (this.hadHeartyPet && t - this.petEndedAt > 1.2 && t - this.petEndedAt < 6.0) {
        this.hadHeartyPet = false;
        this.kneadPhase = 0;
        this.idleAct = { kind: 'knead', t0: t, dur: 3.8, side: 1 };
        this.nextIdleAct = t + 5.6;
      } else if (!this.dozeDoneThisIdle && idleSec > dozeStartSec && idleSec < sleepAfterSec - 1.5) {
        this.dozeDoneThisIdle = true;
        this.dozeJoltFired = false;
        this.idleAct = { kind: 'doze', t0: t, dur: 3.5, side: Math.random() < 0.5 ? -1 : 1 };
        this.nextIdleAct = t + 4.8;
      } else if (!this.yawnDoneThisIdle && idleSec > yawnStartSec && idleSec < dozeStartSec) {
        this.yawnDoneThisIdle = true;
        this.idleAct = { kind: 'yawn', t0: t, dur: 2.5, side: Math.random() < 0.5 ? -1 : 1 };
        this.nextIdleAct = t + 4.2;
      } else if (t >= this.nextIdleAct && idleSec > 2.6) {
        const pool: IdleAct3D['kind'][] =
          idleSec > 7.5
            ? ['tilt', 'ear', 'slowBlink', 'look', 'tail', 'groom', 'groom', 'stretch', 'knead', 'yawn']
            : ['tilt', 'tilt', 'ear', 'slowBlink', 'look', 'tail'];
        const kind = pool[Math.floor(Math.random() * pool.length)];
        const durMap: Record<IdleAct3D['kind'], number> = {
          tilt: 1.9,
          ear: 0.46,
          slowBlink: 1.45,
          look: 2.1,
          tail: 1.1,
          doze: 3.5,
          yawn: 2.5,
          stretch: 2.7,
          groom: 3.4,
          knead: 3.8,
        };
        this.dozeJoltFired = false;
        this.groomSparkleFired = false;
        this.kneadPhase = 0;
        this.idleAct = { kind, t0: t, dur: durMap[kind], side: Math.random() < 0.5 ? -1 : 1 };
        this.nextIdleAct = t + durMap[kind] + 3.2 + Math.random() * 4.2;
      }
    }
    const act = this.idleAct;
    const actU = act ? clamp((t - act.t0) / act.dur, 0, 1) : 0;
    const actEnv = act ? smoothstep(0, 0.25, actU) * (1 - smoothstep(0.7, 1, actU)) : 0;

    // Vignette continuous envelopes
    let targetDozeLid = 0;
    let targetDozeNod = 0;
    let targetYawn = 0;
    let targetStretch = 0;
    let targetGroom = 0;
    let targetGroomLick = 0;
    let targetEarPressL = 0;
    let targetEarPressR = 0;
    let targetKnead = 0;
    let groomPitch = 0;
    let groomRoll = 0;
    let dozeRoll = 0;

    if (act && act.kind === 'doze') {
      if (actU < 0.54) {
        const p = actU / 0.54;
        const dipWave = p < 0.42 ? Math.sin((p / 0.42) * Math.PI) * 0.45 : smoothstep(0.38, 1.0, p);
        targetDozeLid = Math.min(0.86, 0.25 + dipWave * 0.65);
        targetDozeNod = dipWave;
        dozeRoll = act.side * 0.14 * dipWave;
      } else {
        if (!this.dozeJoltFired) {
          this.dozeJoltFired = true;
          this.sSquash.kick(-0.62);
          this.sPitch.kick(-1.55);
          this.sEars.kick(2.4);
        }
        const post = (actU - 0.54) / 0.46;
        targetDozeLid = post > 0.72 ? Math.sin(((post - 0.72) / 0.28) * Math.PI) * 0.75 : 0;
        targetDozeNod = -0.18 * (1 - smoothstep(0, 0.35, post));
        dozeRoll = -act.side * 0.12 * Math.sin(Math.min(1, post / 0.55) * Math.PI);
      }
    } else if (act && act.kind === 'yawn') {
      targetYawn = smoothstep(0.06, 0.34, actU) * (1 - smoothstep(0.68, 0.94, actU));
      if (actU > 0.82 && actU < 0.96) {
        dozeRoll = Math.sin((actU - 0.82) * 58) * 0.09 * (1 - (actU - 0.82) / 0.14);
      }
    } else if (act && act.kind === 'stretch') {
      targetStretch = smoothstep(0.06, 0.28, actU) * (1 - smoothstep(0.74, 0.96, actU));
    } else if (act && act.kind === 'groom') {
      targetGroom = smoothstep(0.0, 0.14, actU) * (1 - smoothstep(0.86, 1.0, actU));
      if (actU >= 0.12 && actU < 0.44) {
        const lp = ((actU - 0.12) / 0.32) * 2;
        const beat = Math.sin((lp % 1) * Math.PI);
        targetGroomLick = beat;
        groomPitch = 0.16 * beat;
        groomRoll = act.side * 0.14;
      } else if (actU >= 0.44 && actU < 0.84) {
        const wp = ((actU - 0.44) / 0.40) * 2;
        const frac = wp % 1;
        const earContact = Math.sin(smoothstep(0.18, 0.78, frac) * Math.PI);
        if (act.side < 0) targetEarPressL = earContact;
        else targetEarPressR = earContact;
        groomRoll = act.side * (-0.12 + Math.sin(frac * Math.PI) * 0.18);
      } else if (actU >= 0.84 && !this.groomSparkleFired) {
        this.groomSparkleFired = true;
        this.headMount.updateMatrixWorld(false);
        for (const k of [0, 1]) {
          const sPos = this.tmpFxPos
            .set(act.side * (0.44 + k * 0.14), 0.16 - k * 0.16, 0.32)
            .applyMatrix4(this.headMount.matrixWorld)
            .clone();
          this.spawnFx('sparkle', sPos, new THREE.Vector3(act.side * 0.12, 0.26, 0.04), 0.22 - k * 0.04, 0.65);
        }
      }
    } else if (act && act.kind === 'knead') {
      targetKnead = smoothstep(0.0, 0.14, actU) * (1 - smoothstep(0.84, 1.0, actU));
      this.kneadPhase += dt * 4.4;
    }

    this.dozeLidClose += (targetDozeLid - this.dozeLidClose) * approach(12, dt);
    this.dozeNod += (targetDozeNod - this.dozeNod) * approach(9, dt);
    this.yawnAmt += (targetYawn - this.yawnAmt) * approach(12, dt);
    this.stretchAmt += (targetStretch - this.stretchAmt) * approach(8, dt);
    this.groomAmt += (targetGroom - this.groomAmt) * approach(12, dt);
    this.groomLickAmt += (targetGroomLick - this.groomLickAmt) * approach(18, dt);
    this.groomEarPressL += (targetEarPressL - this.groomEarPressL) * approach(16, dt);
    this.groomEarPressR += (targetEarPressR - this.groomEarPressR) * approach(16, dt);
    this.kneadAmt += (targetKnead - this.kneadAmt) * approach(9, dt);

    const anyCozySquint = (petActive || this.chinAmt > 0.25 || this.kneadAmt > 0.30) && !this.privacyMode && !this.isCross && !scruffWanted;
    this.squintAmt += ((anyCozySquint ? 1 : 0) - this.squintAmt) * approach(12, dt);

    // 3) Keyboard & cordless mouse update (smoothly slides away & hides in Edge Peek Mode!)
    const deskHopY = this.sDeskHop.step(0, dt);
    this.desk.update(dt, this.leftMouseDown, this.rightMouseDown, deskHopY, this.privacyClose);
    this.desk.deskGroup.position.y = -peek * 1.65;
    this.desk.deskGroup.visible = peek < 0.85;
    this.catShadow.visible = this.chromaKeyBg === null && peek < 0.35;

    // 4) Spine lean, hunch, squash & breathing on continuous one-piece body (+ scruff lift & pendulum!)
    const mousing = this.isMousing();
    const typingActive = t - this.lastKey < 0.65 || this.paws.L.down || this.paws.R.down;
    const striking =
      this.paws.L.down && (!this.paws.R.down || this.paws.L.t0 >= this.paws.R.t0)
        ? this.paws.L
        : this.paws.R.down
          ? this.paws.R
          : null;

    const peekCalm = 1 - peek;
    let targetShift = 0;
    if (scruff > 0.08) targetShift = -this.scruffSwing * 0.19 * scruff;
    else if (peekWanted) targetShift = 0;
    else if (mousing) targetShift = -0.24;
    else if (striking && striking.keyId) {
      const kt = this.desk.keyTopWorld(striking.keyId, this.tmpV1);
      targetShift = clamp((kt.x - 0.14) * 0.15, -0.22, 0.22);
    } else if (this.tailTap.reach > 0.1) {
      targetShift = 0.08 * this.tailTap.reach;
    } else if (this.kneadAmt > 0.05) {
      targetShift = Math.sin(this.kneadPhase) * 0.06 * this.kneadAmt;
    }

    const targetHunch = scruff > 0.1
      ? -0.04 * scruff
      : peekWanted
        ? 0
        : typingActive
          ? 0.09 + 0.08 * this.excite
          : curious * 0.07 + this.stretchAmt * 0.16 + this.kneadAmt * 0.06 + (petActive ? -0.05 : 0);
    const targetSquash =
      (this.sleepAmt * 0.20 +
        (petActive ? 0.06 : 0) +
        this.dozeNod * 0.07 -
        curious * 0.04 -
        this.yawnAmt * 0.06 -
        this.stretchAmt * 0.12 -
        scruff * 0.07) *
        peekCalm +
      (petActive ? 0.025 * peek : 0) +
      Math.sin(t * 2.0) * 0.014;

    // Suppress lateral spine-lean (e.g. mousing -0.24) during sideways ±1.28 rad Edge-Peek so it NEVER
    // rotates into an asymmetric ±29px vertical head shift that strands one paw and buries the other!
    this.bend.x = this.sShift.step(targetShift * peekCalm, dt) * peekCalm;
    this.bend.z = this.sHunch.step(targetHunch * peekCalm, dt) * peekCalm;
    this.bend.squash = this.sSquash.step(targetSquash, dt);
    this.bend.bellySwell =
      (this.sleepAmt * 0.095 + (typingActive ? 0.035 : 0) - scruff * 0.16 - this.stretchAmt * 0.05) * peekCalm;

    // Lift gently within top frustum headroom & true scruff-pivoted pendulum-swing when scruffed, OR dock head-only flush against screen edge when peeking!
    const baseRotZ = clamp(scruff * this.scruffSwing * 0.21, -0.38, 0.38);
    const baseRootX = this.homePos.x + Math.sin(baseRotZ) * 1.32;
    const baseRootY = this.homePos.y + scruff * 0.08 + (1 - Math.cos(baseRotZ)) * 0.55;
    const baseRootZ = this.homePos.z;

    const peekEdgeSign = this.peekVisualEdge === 'left' ? -1 : 1;
    const peekInwardDir = -peekEdgeSign;
    const peekHeadY = this.camAnchor.y + 0.08;
    const peekZPlane = this.homePos.z + 0.35;

    if (peek > 0.004) {
      this.camera.updateMatrixWorld(false);
      // Use true scaled head height (`HEAD_CY * catRoot.scale.y`) and exact perspective frustum edge X at `(peekHeadY, peekZPlane)`!
      const hWorld = HEAD_CY * this.catRoot.scale.y;
      const extraPop = this.peekHover * 0.12;
      const headBorderX = this.frustumEdgeX(peekEdgeSign, peekHeadY, peekZPlane);
      const goalRotZ = peekEdgeSign * 1.28;
      const wantHeadX = headBorderX + peekInwardDir * (0.34 + extraPop);

      const goalRootX = wantHeadX + Math.sin(goalRotZ) * hWorld;
      const goalRootY = peekHeadY - Math.cos(goalRotZ) * hWorld;
      this.catRoot.position.set(
        mix(baseRootX, goalRootX, peek),
        mix(baseRootY, goalRootY, peek),
        mix(baseRootZ, peekZPlane, peek),
      );
      this.catRoot.rotation.z = mix(baseRotZ, goalRotZ, peek);
      this.catRoot.updateMatrixWorld(true);
    } else {
      this.catRoot.position.set(baseRootX, baseRootY, baseRootZ);
      this.catRoot.rotation.z = baseRotZ;
    }
    const scruffSwingClamped = clamp(this.scruffSwing, -1.6, 1.6);
    for (const hp of this.hindPaws) {
      hp.mesh.visible = peek < 0.30;
      hp.mesh.position.set(
        hp.baseX * (1 - scruff * 0.28) + scruff * scruffSwingClamped * 0.04,
        hp.baseY - scruff * 0.10 + Math.abs(scruffSwingClamped) * scruff * 0.015,
        hp.baseZ + scruff * 0.05,
      );
      hp.mesh.rotation.x = scruff * 0.45;
      hp.mesh.rotation.z = scruff * scruffSwingClamped * 0.14;
    }

    // 5) Head pose & silky eye tracking
    const gx = Math.tanh(this.cursorNdc.x * 1.45);
    const gy = Math.tanh(this.cursorNdc.y * 1.35);
    const lookCursor = t - this.cursorActiveAt < 2.5;

    let targetYaw = 0;
    let targetPitch = -0.03;
    let targetRoll = 0;
    let targetGazeX = 0;
    let targetGazeY = 0;

    if (this.asleep || this.privacyMode) {
      targetPitch = 0.16;
      targetRoll = 0.08;
    } else if (scruff > 0.15) {
      targetPitch = -0.08;
      targetRoll = -this.scruffSwing * 0.10 * scruff;
      targetGazeX = clamp(this.scruffSwing * 0.45, -0.75, 0.75);
      targetGazeY = 0.15;
    } else if (this.chinAmt > 0.2) {
      this.rub += dt * 3.6;
      targetPitch = -0.22 * this.chinAmt;
      targetRoll = Math.sin(this.rub) * 0.11 * this.chinAmt;
    } else if (petActive) {
      this.rub += dt * 4.5;
      targetYaw = this.petX * 0.16;
      targetPitch = -0.10;
      targetRoll = Math.sin(this.rub) * 0.14;
    } else if (lookCursor && (curiousNow || t - this.lastKey > 0.65)) {
      targetYaw = gx * (0.20 + curious * 0.14);
      targetPitch = -0.04 - gy * 0.14;
      targetRoll = gx * (0.05 + curious * 0.13);
      targetGazeX = gx;
      targetGazeY = gy;
    } else if (striking && striking.keyId) {
      const kt = this.desk.keyTopWorld(striking.keyId, this.tmpV1);
      const bias = clamp((kt.x - 0.12) * 0.42, -1, 1);
      targetYaw = bias * 0.18;
      targetPitch = 0.04;
      targetRoll = bias * 0.07;
      targetGazeX = bias * 0.68;
      targetGazeY = -0.52;
    }

    if (act) {
      if (act.kind === 'tilt') targetRoll += act.side * 0.19 * actEnv;
      if (act.kind === 'look') {
        targetYaw += act.side * 0.22 * actEnv;
        targetGazeX = mix(targetGazeX, act.side * 0.85, actEnv);
      }
      if (act.kind === 'doze') {
        targetPitch += this.dozeNod * 0.30;
        targetRoll += dozeRoll;
        if (actU >= 0.54) {
          const post = (actU - 0.54) / 0.46;
          targetGazeX = Math.sin(Math.min(1, post / 0.65) * Math.PI * 2) * 0.78;
          targetGazeY = 0.12;
        }
      }
      if (act.kind === 'yawn') {
        targetPitch -= this.yawnAmt * 0.22;
        targetRoll += dozeRoll;
      }
      if (act.kind === 'stretch') {
        targetPitch -= this.stretchAmt * 0.16;
      }
      if (act.kind === 'groom') {
        targetPitch += groomPitch;
        targetRoll += groomRoll;
      }
      if (act.kind === 'knead') {
        targetPitch += 0.06 * this.kneadAmt;
        targetRoll += Math.sin(this.kneadPhase) * 0.08 * this.kneadAmt;
      }
    }
    if (this.tailGlanceAmt > 0.05) {
      targetYaw = mix(targetYaw, 0.30, this.tailGlanceAmt * 0.82);
      targetGazeX = mix(targetGazeX, 0.90, this.tailGlanceAmt * 0.85);
      targetGazeY = mix(targetGazeY, -0.32, this.tailGlanceAmt * 0.6);
    }
    if (cross > 0.05) {
      targetYaw = mix(targetYaw, this.crossHuffDir * 0.20, cross * 0.65);
      targetGazeX = mix(targetGazeX, this.crossHuffDir * 0.72, cross * 0.65);
    }

    const wakeEl = t - this.wakeAt;
    const wakeShake = wakeEl >= 0 && wakeEl < 0.55 ? Math.sin(wakeEl * 36) * 0.20 * (1 - wakeEl / 0.55) : 0;

    this.headRot.pitch = this.sPitch.step(targetPitch, dt);
    this.headRot.yaw = this.sYaw.step(targetYaw, dt);
    this.headRot.roll = this.sRoll.step(targetRoll, dt) + wakeShake + this.boopShake;

    // Deform one-piece body+head smoothly & sync headMount + optional collar!
    this.deformCatBody();
    this.placeHeadAndCollar();

    // Sync 3D yawn mouth (drops cleanly downward from upper lip strictly below nose!), groom lick tongue & nose scrunch!
    if (this.yawnAmt > 0.04) {
      this.yawnGroup.visible = true;
      const y = Math.min(1, this.yawnAmt);
      this.yawnGroup.scale.set(0.45 + 0.55 * y, 0.14 + 0.86 * y, 1);
      const showRestMouth = this.mouthEnabled && this.yawnAmt < 0.18;
      this.mouthTube.mesh.visible = showRestMouth;
      this.blepMesh.visible = showRestMouth && this.currentContour.mouthShape === 'blep';
    } else {
      this.yawnGroup.visible = false;
      this.mouthTube.mesh.visible = this.mouthEnabled;
      this.blepMesh.visible = this.mouthEnabled && this.currentContour.mouthShape === 'blep';
    }
    if (this.groomLickAmt > 0.08) {
      this.lickTongueMesh.visible = true;
      const ls = 0.4 + 0.65 * Math.min(1, this.groomLickAmt);
      this.lickTongueMesh.scale.set(0.88 * ls, 1.08 * ls, 1);
    } else {
      this.lickTongueMesh.visible = false;
    }
    if (this.noseMesh) {
      this.noseMesh.position.y = this.noseBaseY + this.boopCrossEye * 0.018 + this.yawnAmt * 0.014;
    }

    // 5b) Smooth drop-on gaming headset animation + reactive KuroCat-lime/cyan RGB earcup glow!
    const hsVal = clamp(this.sHeadset.step(this.headsetOn ? 1 : 0, dt), 0, 1.18);
    if (hsVal > 0.015) {
      this.headsetGroup.visible = true;
      const settled = Math.min(1, hsVal);
      const dropOffset = (1 - settled) * 0.42;
      const sc = mix(0.84, 1.0, settled) + Math.max(0, hsVal - 1) * 0.14;
      this.headsetGroup.position.set(0, dropOffset, 0);
      this.headsetGroup.scale.setScalar(sc);
      const rgbMix = 0.5 + 0.5 * Math.sin(t * 2.3 + this.excite * 2.0);
      // Smoothly breathe between KuroCat neon-lime (#d4f53d) and electric gaming cyan (#3df2e8)
      const pulse = 0.88 + 0.12 * Math.sin(t * 5.2) + this.excite * 0.16;
      const r = clamp(mix(0.83, 0.24, rgbMix * 0.58) * pulse, 0, 1);
      const g = clamp(mix(0.96, 0.95, rgbMix * 0.58) * pulse, 0, 1);
      const b = clamp(mix(0.24, 0.92, rgbMix * 0.58) * pulse, 0, 1);
      this.headsetLedMat.color.setRGB(r, g, b);
      const micPulse = 0.78 + 0.22 * Math.sin(t * 3.8);
      this.headsetMicLedMat.color.setRGB(0.22 * micPulse, 0.97 * micPulse, 0.82 * micPulse);
    } else {
      this.headsetGroup.visible = false;
    }

    const gazeX = this.sGazeX.step(targetGazeX, dt);
    const gazeY = this.sGazeY.step(targetGazeY, dt);

    // 6) Compact ears: perk when curious, fold flat sideways into airplane ears when cross, press down when grooming!
    const earTarget =
      0.12 * this.excite * (1 - cross) +
      0.16 * curious +
      0.14 * peek * (0.4 + 0.6 * this.peekHover) -
      (petActive ? 0.15 : 0) -
      0.56 * cross -
      0.22 * scruff -
      0.24 * this.yawnAmt -
      0.20 * this.stretchAmt -
      0.10 * this.sleepAmt;
    const earState = this.sEars.step(earTarget, dt);
    const earFlick = act && act.kind === 'ear' ? Math.sin(actU * Math.PI * 2) * 0.22 : 0;
    for (const e of this.ears) {
      const flick = act && act.kind === 'ear' && act.side === e.s ? earFlick : 0;
      const groomPress = e.s < 0 ? this.groomEarPressL : this.groomEarPressR;
      const airplaneFold = cross * 0.56 + scruff * 0.16 + groomPress * 0.52;
      e.group.rotation.z = -e.s * (e.tilt + airplaneFold - earState * 0.28 + flick);
      e.group.rotation.x = -0.06 - cross * 0.14 - this.yawnAmt * 0.16 + curious * 0.10;
      e.group.position.set(
        e.s * (this.earMountX + cross * 0.06 + scruff * 0.02),
        this.earMountY - cross * 0.045 - groomPress * 0.035,
        -0.015,
      );
    }

    // 7) Iconic KuroCat Eyes: open / curious / scruff wide / boop cross-eye / grumpy / happy arcs / petting lazy slits / sleep arcs
    if ((curiousNow || scruffWanted || boopActive) && t > this.nextBlink - 0.25) this.nextBlink = t + 0.65;
    let blinkClose = 0;
    if (t >= this.nextBlink) {
      const bt = t - this.nextBlink;
      if (bt < 0.14) blinkClose = Math.sin((bt / 0.14) * Math.PI);
      else this.nextBlink = t + 2.8 + Math.random() * 3.8;
    }
    if (act && act.kind === 'slowBlink') {
      blinkClose = Math.max(blinkClose, Math.sin(actU * Math.PI));
    }
    const dozeClose = this.dozeLidClose;
    const yawnClose = Math.min(1, this.yawnAmt * 1.45);
    const stretchClose = Math.min(1, this.stretchAmt * 1.25);
    const groomClose = Math.min(0.85, this.groomAmt * 0.95);

    const isSleepOrPrivacy = this.sleepAmt > 0.45 || this.privacyClose > 0.45;
    const isHappyArc = !isSleepOrPrivacy && (yawnClose > 0.48 || stretchClose > 0.52 || (this.chinAmt > 0.36 && blinkClose < 0.3));
    const isPetSquint = !isSleepOrPrivacy && !isHappyArc && (this.squintAmt > 0.38 || groomClose > 0.48) && blinkClose < 0.3;
    const isBlinkClosed = !isSleepOrPrivacy && !isHappyArc && !isPetSquint && blinkClose > 0.58;
    const showOpenEye = !isSleepOrPrivacy && !isHappyArc && !isPetSquint && !isBlinkClosed;

    const blushFloor = this.currentContour.blushAlways ? 0.38 : 0;
    const blushGoal = Math.max(
      blushFloor,
      this.chinAmt > 0.22 ? 0.58 : petActive ? 0.46 : this.kneadAmt > 0.25 ? 0.36 : 0,
    );
    this.blushMat.opacity += (blushGoal - this.blushMat.opacity) * approach(8, dt);
    if (this.blushMat.opacity < 0.004 && blushGoal === 0) this.blushMat.opacity = 0;
    const showBlush = this.blushMat.opacity > 0.004;

    if (!this.privacyMode && !scruffWanted) {
      if (this.chinAmt > 0.25) {
        catAudio.setPurrIntensity(this.chinAmt, 'chin');
      } else if (petActive) {
        catAudio.setPurrIntensity(0.85, 'normal');
      } else if (this.kneadAmt > 0.25) {
        catAudio.setPurrIntensity(this.kneadAmt * 0.72, 'knead');
      } else {
        catAudio.setPurrIntensity(0);
      }
    } else {
      catAudio.setPurrIntensity(0);
    }

    const pal = this.currentPalette;
    const sparkleBoost = Math.max(curious, scruff * 0.75, this.boopCrossEye * 0.65);
    const shineAmt = pal?.eyeCatchlight ? 1.0 + sparkleBoost * 0.20 : Math.min(1.16, sparkleBoost * 1.25);

    for (const e of this.eyes) {
      e.blush.visible = showBlush;
      e.mesh.visible = showOpenEye;
      e.closedArc.visible = isSleepOrPrivacy || isBlinkClosed;
      e.happyArc.visible = isHappyArc;
      e.squintSlit.visible = isPetSquint;

      if (showOpenEye) {
        const lidClose = Math.max(blinkClose * 0.8, dozeClose * 0.86);
        const eScale = this.currentContour.eyeScale;
        const eAspect = this.currentContour.eyeAspect;
        const irisRx = 0.156 * eScale * (1 + curious * 0.06 + scruff * 0.09);
        const irisRy = Math.max(0.018, 0.136 * eScale * eAspect * (1 + curious * 0.09 + scruff * 0.13) * (1 - lidClose));

        const boopShrink = 1 - this.boopCrossEye * 0.22;
        const pMul = this.currentContour.pupilScale * eScale;
        const pShape = this.currentContour.pupilShape;
        let pRx: number;
        let pRy: number;
        if (pShape === 'round') {
          const rP = (0.076 + curious * 0.036 + scruff * 0.030 + this.excite * 0.006) * pMul * (1 - cross * 0.24) * boopShrink;
          pRx = clamp(rP, 0.028, irisRx - 0.016);
          pRy = clamp(rP, 0.028, irisRy - 0.008);
        } else if (pShape === 'slit') {
          pRx = clamp(
            (0.030 + curious * 0.048 + scruff * 0.040 + this.excite * 0.004) * pMul * (1 - cross * 0.35) * boopShrink,
            0.016,
            irisRx - 0.018,
          );
          pRy = clamp(
            (0.104 + curious * 0.016 + scruff * 0.018) * pMul * eAspect * boopShrink,
            0.036,
            irisRy - 0.006,
          );
        } else if (pShape === 'dot') {
          const rDot = (0.040 + curious * 0.018 + scruff * 0.016) * pMul * boopShrink;
          pRx = clamp(rDot, 0.018, irisRx - 0.018);
          pRy = clamp(rDot, 0.018, irisRy - 0.008);
        } else {
          pRx = clamp(
            (0.064 + curious * 0.048 + scruff * 0.036 + this.excite * 0.008) * pMul * (1 - cross * 0.32) * boopShrink,
            0.026,
            irisRx - 0.018,
          );
          pRy = clamp(
            (0.094 + curious * 0.020 + scruff * 0.022) * pMul * eAspect * (1 - cross * 0.08) * boopShrink,
            0.034,
            irisRy - 0.008,
          );
        }

        const maxTx = Math.max(0.020, irisRx - pRx - 0.012);
        const maxTy = Math.max(0.014, irisRy - pRy - 0.008);
        // Cross-eyed convergence on nose boop: left eye (s=-1) pulls +X right, right eye (s=+1) pulls -X left!
        const gazeXEff = mix(gazeX, -e.s * 0.94, this.boopCrossEye);
        const gazeYEff = mix(gazeY, -0.45, this.boopCrossEye);
        const px = clamp(gazeXEff * maxTx, -maxTx, maxTx);
        const py = clamp(gazeYEff * maxTy, -maxTy, maxTy);

        (e.mat.uniforms.uScale.value as THREE.Vector2).set(irisRx / this.eyePatchRx, irisRy / this.eyePatchRy);
        e.mat.uniforms.uTilt.value =
          e.s * -((0.06 + 0.06 * (typingActive ? 1 : 0)) * (1 - scruff * 0.8) + this.currentContour.eyeTilt);
        (e.mat.uniforms.uPupilCenter.value as THREE.Vector2).set(px / irisRx, py / irisRy);
        (e.mat.uniforms.uPupilRad.value as THREE.Vector2).set(pRx / irisRx, pRy / irisRy);
        e.mat.uniforms.uCross.value = Math.max(cross, this.tailGlanceAmt * 0.42);
        e.mat.uniforms.uCurious.value = Math.max(curious, scruff * 0.55);
        e.mat.uniforms.uShineAmt.value = shineAmt;
      }
    }

    // 8) Graceful 3D KuroCat Tail (sway, sleep curl, stretch high curve, scruff dangle, tail poke recoil, tail key patting, 3-beat grumpy desk-thump)
    let targetThumpLift = 0;
    let targetThumpLash = 0;
    if (cross > 0.08 && this.tailTap.reach < 0.25) {
      const prev = this.thumpPhase;
      this.thumpPhase += dt * 2.55;
      const beat = Math.floor(this.thumpPhase);
      const u = this.thumpPhase - beat;
      const restBeat = beat % 4 === 3;
      if (!restBeat) {
        targetThumpLift = u < 0.58 ? smoothstep(0, 0.58, u) : u < 0.72 ? 1 - ((u - 0.58) / 0.14) ** 2 : 0;
      }
      targetThumpLash = Math.sin(this.thumpPhase * Math.PI * 0.5);
      const slamAt = beat + 0.72;
      if (!restBeat && this.isCross && prev < slamAt && this.thumpPhase >= slamAt) {
        this.spawnSlamFx();
      }
    }
    this.thumpLift += (targetThumpLift - this.thumpLift) * approach(38, dt);
    this.thumpLash += (targetThumpLash - this.thumpLash) * approach(18, dt);

    const swayRate = mix(1.0, 2.5, this.excite) * (1 - 0.75 * this.sleepAmt);
    this.tailPhase += dt * swayRate;
    const tailSway = (1 - 0.7 * this.sleepAmt) * (1 + 0.42 * curious) + (act && act.kind === 'tail' ? 1.35 * actEnv : 0);

    const attached = this.tmpTailAttached;
    const loose = this.tmpTailLoose;
    const tmpTail = this.tmpTailScratch;
    this.catRoot.updateMatrixWorld(false);
    for (let i = 0; i < this.tailRestPts.length; i++) {
      const w = i / (this.tailRestPts.length - 1);
      const pt = this.tailCurve.points[i].lerpVectors(this.tailRestPts[i], this.tailSleepPts[i], this.sleepAmt);
      if (this.stretchAmt > 0.01) {
        tmpTail.copy(this.tailStretchPts[i]);
        tmpTail.x += Math.sin(t * 18) * 0.05 * w * this.stretchAmt;
        pt.lerp(tmpTail, this.stretchAmt);
      }
      if (scruff > 0.01) {
        tmpTail.copy(this.tailScruffPts[i]);
        tmpTail.x += this.scruffSwing * 0.48 * w * scruff;
        pt.lerp(tmpTail, scruff);
      }
      if (this.tailRecoil > 0.01) {
        pt.lerp(this.tailRecoilPts[i], Math.min(1, this.tailRecoil));
      }
      if (cross > 0.01) {
        tmpTail.copy(this.tailThumpPts[i]);
        tmpTail.y += this.thumpLift * 1.02 * w ** 1.4;
        tmpTail.x -= this.thumpLift * 0.18 * w ** 2;
        tmpTail.z += this.thumpLash * 0.34 * w ** 1.5;
        pt.lerp(tmpTail, cross);
      }
      pt.x += Math.sin(this.tailPhase * 1.5 + i * 0.68) * 0.045 * w * tailSway;
      pt.y += Math.sin(this.tailPhase * 1.25 + i * 0.85) * 0.05 * w * w * tailSway;
      this.attachLocal(pt, attached);
      loose.copy(pt).add(this.catRoot.position);
      pt.lerpVectors(attached, loose, smoothstep(0.1, 0.7, w));
    }

    if (this.tailTap.reach > 0.01 && this.tailTap.keyId) {
      const tipWorld = this.desk.keyTopWorld(this.tailTap.keyId, this.tailTap.tip);
      tipWorld.y += this.tailTap.hover + 0.045;
      const root = this.tailCurve.points[0];
      this.tmpTailPath[0].set(root.x + 0.36, 0.28, root.z + 0.22);
      this.tmpTailPath[1].set(tipWorld.x + 0.36, 0.30, mix(root.z, tipWorld.z, 0.52));
      this.tmpTailPath[2].set(tipWorld.x + 0.26, 0.32, tipWorld.z - 0.06);
      this.tmpTailPath[3].set(tipWorld.x + 0.12, mix(0.32, tipWorld.y + 0.02, 0.5), tipWorld.z + 0.02);
      for (let i = 1; i < this.tailCurve.points.length; i++) {
        const dst = i - 1 < 4 ? this.tmpTailPath[i - 1] : tipWorld;
        this.tailCurve.points[i].lerp(dst, this.tailTap.reach);
      }
    }

    const tailActive = this.tailTap.down || t - this.tailTap.landAt < 0.28;
    this.tailTap.reach += ((tailActive ? 1 : 0) - this.tailTap.reach) * approach(tailActive ? 24 : 9, dt);
    const tailHoverTarget = this.tailTap.down ? 0 : 0.095;
    this.tailTap.hover += (tailHoverTarget - this.tailTap.hover) * approach(34, dt);

    const fluffyMul = this.tailFluffy ? 1.38 : 1.0;
    const showTail = peek < 0.50;
    this.tailLimb.fill.mesh.visible = showTail;
    for (const c of this.tailLimb.caps) c.visible = showTail;
    if (showTail) {
      this.tailLimb.update(
        (u, out) => this.tailCurve.getPoint(u, out),
        (u) => mix(0.068, 0.044, u) * fluffyMul * (1 - 0.12 * Math.sin(u * Math.PI)),
      );
    }

    // 9) Sleek Unified KuroCat Arms + Cozy Tucked Idle Belly Paws + Scruff / Edge-Peek Grip / Groom / Stretch / Knead!
    this.headMount.updateMatrixWorld(false);
    const updatePaw = (paw: PawTrack3D, isLeft: boolean) => {
      const activeForMouse = isLeft && mousing && scruff < 0.12 && peek < 0.25;
      const activeForKey =
        Boolean(paw.keyId && (paw.down || t - paw.t0 < 0.52)) &&
        !this.asleep &&
        !this.privacyMode &&
        scruff < 0.12 &&
        peek < 0.25;
      const activeForScruff = scruff > 0.14 && !this.privacyMode;
      const activeForPeek = !activeForScruff && peek > 0.22;
      const activeForGroom =
        !activeForScruff &&
        !activeForPeek &&
        !activeForKey &&
        act !== null &&
        act.kind === 'groom' &&
        ((act.side < 0 && isLeft) || (act.side > 0 && !isLeft)) &&
        this.groomAmt > 0.08;
      const activeForStretch = !activeForScruff && !activeForPeek && !activeForKey && !activeForMouse && this.stretchAmt > 0.10;
      const activeForKnead = !activeForScruff && !activeForPeek && !activeForKey && !activeForMouse && this.kneadAmt > 0.10;

      const wantTuck =
        !activeForMouse &&
        !activeForKey &&
        !activeForScruff &&
        !activeForPeek &&
        !activeForGroom &&
        !activeForStretch &&
        !activeForKnead
          ? 1
          : 0;
      paw.tuckWeight += (wantTuck - paw.tuckWeight) * approach(wantTuck ? 6.5 : 20, dt);

      this.tmpPawLocal.set(paw.side * 0.24, 0.16 - this.sleepAmt * 0.06, 0.54);
      const tuckHome = this.attachLocal(this.tmpPawLocal, this.tmpV3);

      if (activeForScruff) {
        // Keep front paws short, plush, and tucked naturally in front of the chest while scruffed
        // (body root already swings as a pendulum; clamped local sway prevents arms stretching like noodles!)
        const sway = scruffSwingClamped * 0.045 + Math.sin(t * 5.2 + paw.side * 0.7) * 0.020;
        const bobY = Math.abs(scruffSwingClamped) * 0.016 + Math.cos(t * 4.6 + paw.side) * 0.012;
        this.tmpPawLocal.set(paw.side * 0.31 + sway, 0.46 - scruff * 0.06 + bobY, 0.60);
        const dangleWorld = this.attachLocal(this.tmpPawLocal, this.tmpV1);
        paw.pos.copy(paw.spring.step(dangleWorld, dt));
        paw.last.copy(paw.pos);
        return;
      }

      if (activeForPeek) {
        // Two cute chubby paws gripping flush into EACH paw's exact perspective viewport border
        // (eliminating the 24.5° camera elevation Z-depth gap on both left & right edges across all scales/layouts!).
        const isUpper = this.peekVisualEdge === 'left' ? paw.side < 0 : paw.side > 0;
        const bob = Math.sin(t * 2.4 + (isUpper ? 0 : Math.PI)) * 0.008;
        const pawY = peekHeadY + (isUpper ? 0.64 : -0.55) + bob;
        const pawZ = peekZPlane + 0.34;
        const pawEdgeX = this.frustumEdgeX(peekEdgeSign, pawY, pawZ);
        // Paw back extends 0.142 * 0.48 = 0.068 outward (> 0.055 inset) AND horizontal wrist extends
        // 0.34 past the bezel so ZERO sliver of desktop wallpaper can ever show between paw and screen border.
        const pawInset = 0.055;
        this.tmpV1.set(pawEdgeX + peekInwardDir * pawInset, pawY, pawZ);
        paw.pos.copy(paw.spring.step(this.tmpV1, dt));
        paw.last.copy(paw.pos);
        return;
      }

      if (activeForGroom && act) {
        const s = paw.side;
        if (actU < 0.44) {
          const beat = actU > 0.12 ? Math.sin((((actU - 0.12) / 0.32) * 2 % 1) * Math.PI) : 0;
          this.tmpV1.set(s * 0.16, -0.11 + beat * 0.06, 0.56);
        } else {
          const wp = Math.min(1.999, ((actU - 0.44) / 0.40) * 2);
          const frac = wp % 1;
          if (frac < 0.35) {
            const u = frac / 0.35;
            this.tmpV1.set(s * mix(0.16, 0.44, u), mix(-0.10, 0.36, u), mix(0.56, 0.38, u));
          } else {
            const u = (frac - 0.35) / 0.65;
            this.tmpV1.set(s * mix(0.44, 0.24, u), mix(0.36, -0.06, u), mix(0.38, 0.56, u));
          }
        }
        this.tmpV1.applyMatrix4(this.headMount.matrixWorld);
        paw.pos.copy(paw.spring.step(this.tmpV1, dt));
        paw.last.copy(paw.pos);
        return;
      }

      if (activeForStretch) {
        const r = this.stretchAmt;
        this.tmpV1.set(
          this.homePos.x + paw.side * (0.28 + r * 0.26),
          0.18 + (1 - r) * 0.06,
          this.homePos.z + 0.54 + r * 0.62,
        );
        paw.pos.copy(paw.spring.step(this.tmpV1, dt));
        paw.last.copy(paw.pos);
        return;
      }

      if (activeForKnead) {
        const phase = this.kneadPhase + (isLeft ? 0 : Math.PI);
        const lift = Math.max(0, Math.sin(phase));
        const press = Math.max(0, -Math.sin(phase));
        this.tmpV1.set(
          this.homePos.x + paw.side * 0.30,
          0.19 + lift * 0.14 - press * 0.03,
          this.homePos.z + 0.86,
        );
        paw.pos.copy(paw.spring.step(this.tmpV1, dt));
        paw.last.copy(paw.pos);
        return;
      }

      if (activeForMouse) {
        const mt = this.desk.mouseTopWorld(this.tmpV1);
        paw.pos.copy(paw.spring.step(mt, dt));
        paw.last.copy(paw.pos);
        return;
      }
      if (activeForKey && paw.keyId) {
        const kt = this.desk.keyTopWorld(paw.keyId, this.tmpV1);
        if (paw.down) {
          const u = clamp((t - paw.t0) / paw.dur, 0, 1);
          paw.pos.lerpVectors(paw.from, kt, smoothstep(0, 1, u));
          paw.pos.y += Math.sin(u * Math.PI) * 0.22;
          paw.spring.x.copy(paw.pos);
          paw.spring.v.set(0, 0, 0);
        } else {
          const hover = this.tmpV2.set(kt.x, kt.y + 0.14, kt.z - 0.05);
          paw.pos.copy(paw.spring.step(hover, dt));
        }
        paw.last.copy(paw.pos);
        return;
      }

      // Smoothly tuck sleek paws onto front tummy above the keyboard when calm/idle!
      paw.pos.copy(paw.spring.step(tuckHome, dt));
      paw.last.copy(paw.pos);
    };
    updatePaw(this.paws.L, true);
    updatePaw(this.paws.R, false);

    const scruffBlend = scruff * peekCalm;
    for (const arm of this.arms) {
      const pawTrack = arm.s < 0 ? this.paws.L : this.paws.R;
      this.attachLocal(arm.shoulderLocal, arm.shoulder);
      arm.hand.copy(pawTrack.pos);

      const tuck = pawTrack.tuckWeight;
      const onMouse = arm.s < 0 && mousing;
      const reach = arm.shoulder.distanceTo(arm.hand);
      const flareScale = (1 - tuck * 0.85) * (1 - scruffBlend * 0.86);
      const lift =
        mix(0.24, 0.06, clamp((reach - 0.85) / 0.85, 0, 1)) *
        (1 - tuck * 0.65) *
        (1 - scruffBlend * 0.85) *
        peekCalm;

      this.tmpArmOff.set(
        arm.s * (onMouse ? 0.09 : 0.14 * flareScale) * peekCalm,
        (-0.06 - 0.05 * scruffBlend) * peekCalm + lift * 0.32,
        (mix(0.18, 0.02, tuck) * (1 - scruffBlend * 0.65) + 0.05 * scruffBlend) * peekCalm,
      );
      arm.c1.copy(arm.shoulder).lerp(arm.hand, 0.36).add(this.tmpArmOff);

      this.tmpArmOff.set(
        arm.s * (onMouse ? 0.05 : 0.05 * (1 - tuck) * (1 - scruffBlend * 0.85)) * peekCalm,
        lift * 0.85 - 0.02 * scruffBlend * peekCalm,
        (mix(0.12, 0.02, tuck) * (1 - scruffBlend * 0.65) + 0.03 * scruffBlend) * peekCalm,
      );
      arm.c2.copy(arm.shoulder).lerp(arm.hand, 0.72).add(this.tmpArmOff);

      if (peek > 0.004) {
        // Route the wrist horizontally straight from behind the monitor bezel into the paw so the bezel
        // cleanly slices the plump wrist at full thickness with zero diagonal notch or floating gap.
        const armEdgeX = this.frustumEdgeX(peekEdgeSign, arm.hand.y, arm.hand.z);
        this.tmpPeekC1.set(armEdgeX + peekEdgeSign * 0.34, arm.hand.y, arm.hand.z - 0.02);
        this.tmpPeekC2.set(armEdgeX + peekEdgeSign * 0.12, arm.hand.y, arm.hand.z);
        arm.c1.lerp(this.tmpPeekC1, peek);
        arm.c2.lerp(this.tmpPeekC2, peek);
      }

      arm.limb.update(
        (u, out) => {
          const m = 1 - u;
          const m2 = m * m;
          const u2 = u * u;
          out.set(
            m2 * m * arm.shoulder.x + 3 * m2 * u * arm.c1.x + 3 * m * u2 * arm.c2.x + u2 * u * arm.hand.x,
            m2 * m * arm.shoulder.y + 3 * m2 * u * arm.c1.y + 3 * m * u2 * arm.c2.y + u2 * u * arm.hand.y,
            m2 * m * arm.shoulder.z + 3 * m2 * u * arm.c1.z + 3 * m * u2 * arm.c2.z + u2 * u * arm.hand.z,
          );
        },
        // Cute chubby plush kitten arms (keep wrist plump & flush across bezel in Edge-Peek!)
        (u) =>
          mix(0.118, mix(0.082, 0.094, peek), smoothstep(0.0, 0.88, u)) *
          mix(1.0, 0.76, tuck * (1 - u * 0.4)) *
          mix(1.0, 0.88, scruffBlend * (1 - u * 0.35)) *
          mix(1.0, 0.96, peek),
      );

      // Soft sculpted plush paw resting cleanly right behind top edge of keyboard when calm,
      // drooping softly in front of chest when scruffed, or gripping screen border flush when peeking!
      const pawScale = mix(1.0, 0.94, tuck);
      arm.paw.position.set(arm.hand.x, arm.hand.y - 0.010 * peekCalm, arm.hand.z + 0.014 * peekCalm);
      arm.paw.scale.set(
        mix(mix(0.126, 0.114, scruffBlend), 0.102, peek) * pawScale,
        mix(mix(0.080, 0.094, scruffBlend), 0.142, peek) * pawScale,
        mix(0.118, 0.112, scruffBlend) * pawScale,
      );
      arm.paw.rotation.x = scruffBlend * 0.64;
      arm.paw.rotation.y =
        Math.atan2(arm.hand.x - arm.c2.x, Math.max(0.1, arm.hand.z - arm.c2.z)) *
        0.42 *
        peekCalm *
        (1 - scruffBlend * 0.65);
      arm.paw.rotation.z =
        peek > 0.01 ? peekEdgeSign * Math.PI * 0.5 * peek : baseRotZ * 0.72 * scruffBlend;
    }

    // 10) Floating Key Bubbles, Anger Mark 💢 & Sleep Zzz FX
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      const age = t - p.t0;
      const tailAge = p.upAt !== null ? t - p.upAt : 0;
      if (age > 1.2 || tailAge > 0.55) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.popups.splice(i, 1);
        continue;
      }
      const pop = smoothstep(0, 0.12, age);
      const fade = p.upAt !== null ? 1 - smoothstep(0.18, 0.55, tailAge) : 1;
      p.sprite.position.y += dt * 0.20;
      const s = 0.72 + 0.28 * pop;
      p.sprite.scale.set(p.baseW * s, p.baseH * s, 1);
      p.sprite.material.opacity = fade;
    }

    if (cross > 0.25) {
      this.angerSprite.visible = true;
      const pulse = 1 + 0.10 * Math.sin(t * 14) + (t - this.lastSlam < 0.22 ? 0.16 : 0);
      this.headMount.updateMatrixWorld(false);
      this.tmpFxPos.set(-0.52, 0.44, 0.18).applyMatrix4(this.headMount.matrixWorld);
      this.angerSprite.position.copy(this.tmpFxPos);
      this.angerSprite.scale.setScalar(0.30 * pulse * smoothstep(0.25, 0.65, cross));
    } else {
      this.angerSprite.visible = false;
    }

    if (this.sleepAmt > 0.65 && t >= this.nextZ) {
      this.nextZ = t + 1.35;
      this.headMount.updateMatrixWorld(false);
      const zPos = this.tmpFxPos.set(0.46, 0.42, 0.16).applyMatrix4(this.headMount.matrixWorld);
      this.spawnFx('z', zPos, new THREE.Vector3(0.08, 0.36, 0), 0.22, 2.3);
    }

    for (let i = this.fxList.length - 1; i >= 0; i--) {
      const fx = this.fxList[i];
      const u = (t - fx.t0) / fx.dur;
      if (u >= 1) {
        this.scene.remove(fx.sprite);
        fx.sprite.material.dispose();
        this.fxList.splice(i, 1);
        continue;
      }
      fx.sprite.position.addScaledVector(fx.vel, dt);
      if (fx.kind === 'z') {
        fx.sprite.position.x = fx.baseX + Math.sin(u * Math.PI * 2.2) * 0.08 + u * 0.14;
        const sc = fx.size * (0.65 + 0.65 * u);
        fx.sprite.scale.set(sc, sc, 1);
        fx.sprite.material.opacity = smoothstep(0, 0.18, u) * (1 - smoothstep(0.62, 1, u));
      } else if (fx.kind === 'heart') {
        fx.sprite.position.x = fx.baseX + Math.sin(u * Math.PI * 2.8) * 0.09;
        const pop = smoothstep(0, 0.18, u);
        const sc = fx.size * (0.65 + 0.45 * pop) * (1 - u * 0.15);
        fx.sprite.scale.set(sc, sc, 1);
        fx.sprite.material.opacity = pop * (1 - smoothstep(0.66, 1, u));
      } else if (fx.kind === 'sparkle') {
        const pop = Math.sin(u * Math.PI);
        const sc = fx.size * (0.45 + 0.75 * pop);
        fx.sprite.scale.set(sc, sc, 1);
        fx.sprite.material.opacity = pop;
      } else if (fx.kind === 'sneeze') {
        fx.vel.multiplyScalar(1 - approach(3.5, dt));
        const sc = fx.size * (0.6 + 0.8 * u);
        fx.sprite.scale.set(sc, sc, 1);
        fx.sprite.material.opacity = (1 - u) * 0.9;
      } else if (fx.kind === 'bang') {
        const sc = fx.size * (0.55 + 0.65 * smoothstep(0, 0.4, u));
        fx.sprite.scale.set(sc, sc, 1);
        fx.sprite.material.opacity = 1 - smoothstep(0.35, 1, u);
      } else {
        fx.vel.multiplyScalar(1 - approach(3.2, dt));
        const sc = fx.size * (0.8 + 0.9 * u);
        fx.sprite.scale.set(sc, sc, 1);
        fx.sprite.material.opacity = (1 - u) * 0.85;
      }
    }
  }
}
