import {
  DEFAULT_TAIL_KEY_IDS,
  KuroCatEngine,
  type KeyboardOrientation,
  type TailKeyMode,
} from './catEngine';
import { BUILTIN_WEB_CATS } from '../website/src/builtinCats';
import { catAudio } from './audio';
import {
  getKeyboardLayout,
  resolveKeyByVk,
  type KeyboardLayoutId,
} from './keyboardLayout';

interface AndroidSettingsPayload {
  catBreed?: string;
  keyboardLayout?: KeyboardLayoutId;
  keyboardOrientation?: KeyboardOrientation;
  opacity?: number;
  showKeyBubbles?: boolean;
  soundEnabled?: boolean;
  typingSoundEnabled?: boolean;
  privacyMode?: boolean;
  headphones?: boolean;
  tailKeyMode?: TailKeyMode;
  fpsCap?: number;
}

const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
const engine = new KuroCatEngine(canvas, { embedded: true });
engine.setRenderScale(1.0);
engine.start();

// Natural alternating left/right home-row + occasional space/enter/backspace VKs
// used when Android Accessibility reports IME text-change deltas without physical keycodes.
const LEFT_HAND_VKS = [0x41, 0x53, 0x44, 0x46, 0x47, 0x51, 0x57, 0x45, 0x52, 0x54, 0x5A, 0x58, 0x43, 0x56];
const RIGHT_HAND_VKS = [0x48, 0x4A, 0x4B, 0x4C, 0x59, 0x55, 0x49, 0x4F, 0x50, 0x42, 0x4E, 0x4D];
const TAIL_TAILSLAP_VKS = [0x0D, 0x08, 0x20]; // Enter / Backspace / Space -> triggers BigFish whale tail slap!

let burstStep = 0;
let petResetTimer: number | null = null;
let petAnimRaf: number | null = null;
let lastBreedId: string | null = null;
let lastLayout: KeyboardLayoutId | null = null;
let lastOrient: KeyboardOrientation | null = null;
let lastTailKeyMode: TailKeyMode | null = null;
let currentTailKeyMode: TailKeyMode = 'smart';
let currentHeadphones = false;

function computeKeySoundPan(vk: number): number {
  const kbLayout: KeyboardLayoutId = engine.keyboardLayout === '108' ? '108' : '65';
  const spec = resolveKeyByVk(vk, kbLayout);
  if (!spec) return 0;
  const layout = getKeyboardLayout(kbLayout);
  const centerU = spec.uStart + spec.uWidth * 0.5;
  const normX = Math.max(0, Math.min(1, centerU / layout.totalUnits));
  return (normX * 2 - 1) * 0.35;
}

function tapVk(vk: number, delayMs: number, holdMs = 82): void {
  window.setTimeout(() => {
    if (!engine.privacyMode) {
      catAudio.playKeyDown(vk, computeKeySoundPan(vk));
    }
    engine.onKeyDown(vk, false);
    window.setTimeout(() => {
      if (!engine.privacyMode) {
        catAudio.playKeyUp(vk, computeKeySoundPan(vk));
      }
      engine.onKeyUp(vk);
    }, holdMs);
  }, delayMs);
}

function applySettings(payload: AndroidSettingsPayload): void {
  if (!payload || typeof payload !== 'object') return;
  const breedId = payload.catBreed || lastBreedId || 'black';
  const skin = BUILTIN_WEB_CATS.find((c) => c.id === breedId) ?? BUILTIN_WEB_CATS[0];
  let needsResize = false;

  if (skin.id !== lastBreedId) {
    engine.setCatAppearance(skin.id, skin);
    lastBreedId = skin.id;
    needsResize = true;
  }

  const layout: KeyboardLayoutId =
    payload.keyboardLayout === '108'
      ? '108'
      : payload.keyboardLayout === '65'
        ? '65'
        : (lastLayout ?? '65');
  const orient: KeyboardOrientation =
    payload.keyboardOrientation === 'viewer'
      ? 'viewer'
      : payload.keyboardOrientation === 'cat'
        ? 'cat'
        : (lastOrient ?? 'cat');
  if (layout !== lastLayout || orient !== lastOrient) {
      engine.setKeyboardConfig(layout, orient);
      lastLayout = layout;
      lastOrient = orient;
      needsResize = true;
    }

  if (typeof payload.opacity === 'number' && Number.isFinite(payload.opacity)) {
    const clampedOpacity = Math.max(0.2, Math.min(1.0, payload.opacity));
    canvas.style.opacity = clampedOpacity >= 0.999 ? '' : String(clampedOpacity);
  }
  if (typeof payload.showKeyBubbles === 'boolean') {
    engine.showKeyBubbles = payload.showKeyBubbles;
  }
  if (typeof payload.soundEnabled === 'boolean') {
    catAudio.setEnabled(payload.soundEnabled);
  }
  if (typeof payload.typingSoundEnabled === 'boolean') {
    catAudio.setTypingSoundEnabled(payload.typingSoundEnabled);
  }
  if (typeof payload.privacyMode === 'boolean' && payload.privacyMode !== engine.privacyMode) {
    engine.setPrivacyMode(payload.privacyMode);
  }
  if (typeof payload.headphones === 'boolean') {
    currentHeadphones = payload.headphones;
  }
  engine.setHeadphones(currentHeadphones && skin.id !== 'dafeiyu');

  if (payload.tailKeyMode !== undefined) {
    const mode: TailKeyMode =
      payload.tailKeyMode === 'custom' ||
      payload.tailKeyMode === 'edge' ||
      payload.tailKeyMode === 'off'
        ? payload.tailKeyMode
        : 'smart';
    currentTailKeyMode = mode;
    if (mode !== lastTailKeyMode) {
      engine.setTailKeyConfig(mode, DEFAULT_TAIL_KEY_IDS);
      lastTailKeyMode = mode;
    }
  } else if (lastTailKeyMode === null) {
    engine.setTailKeyConfig(currentTailKeyMode, DEFAULT_TAIL_KEY_IDS);
    lastTailKeyMode = currentTailKeyMode;
  }

  if (payload.fpsCap !== undefined) {
    engine.setFpsCap(payload.fpsCap === 30 ? 30 : 0);
  }

  if (needsResize) {
    engine.resize();
  }
}

function cancelPetBurst(): void {
  const hadActive = petAnimRaf !== null || petResetTimer !== null;
  if (petAnimRaf !== null) {
    cancelAnimationFrame(petAnimRaf);
    petAnimRaf = null;
  }
  if (petResetTimer !== null) {
    window.clearTimeout(petResetTimer);
    petResetTimer = null;
  }
  if (hadActive) {
    engine.onWindowCursor(-1, -1, false, 'touch');
  }
}

function triggerPetBurst(): void {
  // Smooth synthetic back-and-forth rub across cat forehead so tapping the pet's head
  // immediately triggers blissful squinting eyes + gentle Web Audio purr!
  if (petAnimRaf !== null) {
    cancelAnimationFrame(petAnimRaf);
    petAnimRaf = null;
  }
  if (petResetTimer !== null) {
    window.clearTimeout(petResetTimer);
    petResetTimer = null;
  }
  const start = performance.now();
  const duration = 680;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const wave = Math.sin(t * Math.PI * 4.0) * 0.14;
    engine.onWindowCursor(0.48 + wave, 0.36, true, 'touch');
    if (t < 1) {
      petAnimRaf = requestAnimationFrame(step);
    } else {
      petAnimRaf = null;
      petResetTimer = window.setTimeout(() => {
        petResetTimer = null;
        engine.onWindowCursor(-1, -1, false, 'touch');
      }, 320);
    }
  };
  petAnimRaf = requestAnimationFrame(step);
}

const bridge = {
  setSettings(payloadOrJson: AndroidSettingsPayload | string): void {
    try {
      const data =
        typeof payloadOrJson === 'string'
          ? (JSON.parse(payloadOrJson) as AndroidSettingsPayload)
          : payloadOrJson;
      applySettings(data);
    } catch (e) {
      console.error('KuroAndroid.setSettings error', e);
    }
  },

  onTypingBurst(count = 1, kind: 'char' | 'delete' | 'enter' | 'space' = 'char'): void {
    if (engine.privacyMode) {
      engine.onPrivacyTyping();
      return;
    }
    const taps = Math.max(1, Math.min(4, Math.round(count)));
    for (let i = 0; i < taps; i++) {
      let vk: number;
      if (kind === 'delete') {
        vk = 0x08;
      } else if (kind === 'enter') {
        vk = 0x0D;
      } else if (kind === 'space') {
        vk = 0x20;
      } else {
        burstStep++;
        // Every 7th stroke tap Enter/Space/Backspace so BigFish also splashes her whale tail naturally,
        // unless tail key-strikes are turned off.
        if (currentTailKeyMode !== 'off' && burstStep % 7 === 0) {
          vk = TAIL_TAILSLAP_VKS[burstStep % TAIL_TAILSLAP_VKS.length];
        } else if (burstStep % 2 === 0) {
          vk = LEFT_HAND_VKS[(burstStep * 3) % LEFT_HAND_VKS.length];
        } else {
          vk = RIGHT_HAND_VKS[(burstStep * 5) % RIGHT_HAND_VKS.length];
        }
      }
      tapVk(vk, i * 52, 78);
    }
  },

  onKeyDown(vk: number, repeat = false): void {
    const isRepeat = Boolean(repeat);
    if (engine.privacyMode) {
      if (!isRepeat) {
        engine.onPrivacyTyping();
      }
      return;
    }
    if (!isRepeat) {
      catAudio.playKeyDown(vk, computeKeySoundPan(vk));
    }
    engine.onKeyDown(vk, isRepeat);
  },

  onKeyUp(vk: number): void {
    if (!engine.privacyMode) {
      catAudio.playKeyUp(vk, computeKeySoundPan(vk));
    }
    engine.onKeyUp(vk);
  },

  onScreenTap(nx = 0.5, ny = 0.5, rightBtn = false): void {
    if (engine.privacyMode) {
      engine.onPrivacyTyping();
      return;
    }
    const clampedX = Number.isFinite(nx) ? Math.max(0, Math.min(1, nx)) : 0.5;
    const clampedY = Number.isFinite(ny) ? Math.max(0, Math.min(1, ny)) : 0.5;
    engine.onGlobalMouseMove(clampedX, clampedY);
    const btn = rightBtn ? 'right' : 'left';
    catAudio.playMouseDown(btn);
    engine.onMouseDown(btn);
    window.setTimeout(() => {
      if (!engine.privacyMode) {
        catAudio.playMouseUp(btn);
      }
      engine.onMouseUp(btn);
    }, 95);
  },

  setPrivacyMode(active: boolean): void {
    engine.setPrivacyMode(Boolean(active));
  },

  onPrivacyTyping(): void {
    engine.onPrivacyTyping();
  },

  tapAt(nx: number, ny: number): void {
    const clampedX = Number.isFinite(nx) ? Math.max(0, Math.min(1, nx)) : 0.5;
    const clampedY = Number.isFinite(ny) ? Math.max(0, Math.min(1, ny)) : 0.5;
    const rect = canvas.getBoundingClientRect();
    const clientX = rect.left + clampedX * (rect.width || canvas.clientWidth || 1);
    const clientY = rect.top + clampedY * (rect.height || canvas.clientHeight || 1);
    const zone = engine.onCatTapAtClientPoint(clientX, clientY);
    if (zone === 'head' || zone === null || engine.catBreed === 'dafeiyu') {
      triggerPetBurst();
    } else {
      cancelPetBurst();
    }
  },

  setDragging(dragging: boolean, velX = 0): void {
    const isDragging = Boolean(dragging);
    if (isDragging) {
      cancelPetBurst();
    }
    engine.setDragging(isDragging, Number.isFinite(velX) ? velX : 0);
  },

  updateDragVelocity(velX: number): void {
    engine.updateDragVelocity(Number.isFinite(velX) ? velX : 0);
  },

  petHead(): void {
    triggerPetBurst();
  },

  petMove(relX: number, relY: number, active: boolean): void {
    engine.onWindowCursor(relX, relY, Boolean(active), 'touch');
  },

  resize(): void {
    engine.resize();
  },
};

(window as unknown as { KuroAndroid: typeof bridge }).KuroAndroid = bridge;

// ResizeObserver ensures canvas pixel dimensions track Android WindowManager resize instantaneously
const ro = new ResizeObserver(() => engine.resize());
ro.observe(document.documentElement);
