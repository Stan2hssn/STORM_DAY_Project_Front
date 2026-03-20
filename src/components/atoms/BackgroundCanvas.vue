<template>
  <!-- z-0: above the html background, below app content (z-10); fades in then signals the parent -->
  <div
    ref="canvasWrapperRef"
    class="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
    style="opacity: 0"
    aria-hidden="true"
  >
    <canvas ref="canvasRef" class="block h-full w-full" />
  </div>
</template>

<script setup lang="ts">
import { createIntroController } from '@/components/atoms/background-canvas/intro';
import { useGsap } from '@/composables/useGsap';
import fragmentShader from '@/shaders/background.frag';
import vertexShader from '@/shaders/background.vert';
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  type Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const emit = defineEmits<{
  /** Emitted after the canvas CSS fade-in completes (app content can then appear). */
  canvasIntroComplete: []
}>()

const canvasWrapperRef = ref<HTMLDivElement | null>(null)
const gsap = useGsap()

let introScheduled = false

/** Target: shader end ≈ 1.5 s (canvas + shader overlap; app fades in parallel). */
const CANVAS_OPACITY_DURATION = 1
/** Shader duration after start (s). End ≈ 0.35×duration + overlap ≈ 1.43 s */
const INTRO_SHADER_DURATION_S = 1.25
/** Shader starts when canvas opacity reaches ~35% */
const SHADER_START_AT_CANVAS_PROGRESS = 0.35
/** App content fades in at ~50% of the shader intro */
const EMIT_AT_SHADER_PROGRESS = 0.5

const intro = createIntroController(gsap, () => emit('canvasIntroComplete'))

// ── Palette presets ──
const palettes = {
  light: {
    a: new Vector3(0.82, 0.45, 0.35),
    b: new Vector3(0.2, 0.25, 0.2),
    c: new Vector3(0.6, 0.5, 0.3),
    d: new Vector3(0, 0.08, 0.3),
    bg: new Vector3(0.93, 0.91, 0.9),
    // ramp: rose → coral → peach → gold → pale
    ramp: [
      new Vector3(0.85, 0.3, 0.35),
      new Vector3(0.92, 0.45, 0.3),
      new Vector3(0.95, 0.65, 0.4),
      new Vector3(0.97, 0.82, 0.55),
      new Vector3(0.98, 0.94, 0.9),
    ],
  },
  dark: {
    a: new Vector3(0.35, 0.41, 0.25),
    b: new Vector3(0.1, 0.1, 0.08),
    c: new Vector3(0.5, 0.4, 0.3),
    d: new Vector3(0, 0.1, 0.15),
    bg: new Vector3(0.05, 0.08, 0.06),
    // ramp: sage → light olive → pale green → mint → near-white
    ramp: [
      new Vector3(0.35, 0.41, 0.25),  // #5A6841 olive
      new Vector3(0.5, 0.55, 0.38),  // medium sage
      new Vector3(0.65, 0.68, 0.55),  // light sage
      new Vector3(0.8, 0.82, 0.72),  // pale green
      new Vector3(0.92, 0.93, 0.88),  // near-white green
    ],
  },
} as const

const canvasRef = ref<HTMLCanvasElement | null>(null)

let renderer: WebGLRenderer | null = null
let rafId = 0
let material: ShaderMaterial | null = null

function isDark() {
  return document.documentElement.classList.contains('dark')
}

function getPalette() {
  return isDark() ? palettes.dark : palettes.light
}

function loadGrainTextureAsync(): Promise<Texture> {
  const loader = new TextureLoader()
  return loader.loadAsync('/textures/noise_1.png').then((tex) => {
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    return tex
  })
}

const params = {
  grainIntensity: 0.1,
  noiseScale: 1.5,
  noiseSpeed: 0.3,
  timeScale: 0.05,
  blobRadius1: 0.76,
  blobRadius2: 0.91,
  blobWarp1: 0.1,
  blobWarp2: 0.12,
  paletteA: { x: 0.82, y: 0.45, z: 0.35 },
  paletteB: { x: 0.2, y: 0.25, z: 0.2 },
  paletteC: { x: 0.6, y: 0.5, z: 0.3 },
  paletteD: { x: 0, y: 0.08, z: 0.3 },
  bgColor: { x: 0.93, y: 0.91, z: 0.9 },
  grainScale: 2,
  fadeMix: 0.6,
  fadeColor: { x: 1, y: 1, z: 1 },
  ramp0: { x: 0.85, y: 0.3, z: 0.35 },
  ramp1: { x: 0.92, y: 0.45, z: 0.3 },
  ramp2: { x: 0.95, y: 0.65, z: 0.4 },
  ramp3: { x: 0.97, y: 0.82, z: 0.55 },
  ramp4: { x: 0.98, y: 0.94, z: 0.9 },
  debug: 0,
}

// ── Palette transition ──
type Vec3Obj = { x: number; y: number; z: number }
const TRANSITION_SPEED = 3 // units per second — higher = faster

const target = {
  paletteA: { x: 0, y: 0, z: 0 },
  paletteB: { x: 0, y: 0, z: 0 },
  paletteC: { x: 0, y: 0, z: 0 },
  paletteD: { x: 0, y: 0, z: 0 },
  bgColor: { x: 0, y: 0, z: 0 },
  fadeColor: { x: 0, y: 0, z: 0 },
  ramp0: { x: 0, y: 0, z: 0 },
  ramp1: { x: 0, y: 0, z: 0 },
  ramp2: { x: 0, y: 0, z: 0 },
  ramp3: { x: 0, y: 0, z: 0 },
  ramp4: { x: 0, y: 0, z: 0 },
}

function lerpVec3(current: Vec3Obj, dest: Vec3Obj, t: number) {
  current.x += (dest.x - current.x) * t
  current.y += (dest.y - current.y) * t
  current.z += (dest.z - current.z) * t
}

function v3toObj(v: Vector3) { return { x: v.x, y: v.y, z: v.z } }

function setTargetFromPalette() {
  const p = getPalette()
  target.paletteA = v3toObj(p.a)
  target.paletteB = v3toObj(p.b)
  target.paletteC = v3toObj(p.c)
  target.paletteD = v3toObj(p.d)
  target.bgColor = v3toObj(p.bg)
  target.ramp0 = v3toObj(p.ramp[0])
  target.ramp1 = v3toObj(p.ramp[1])
  target.ramp2 = v3toObj(p.ramp[2])
  target.ramp3 = v3toObj(p.ramp[3])
  target.ramp4 = v3toObj(p.ramp[4])

  if (isDark()) {
    target.fadeColor = v3toObj(p.bg)
  } else {
    target.fadeColor = { x: 1, y: 1, z: 1 }
  }
}

function syncParamsFromPalette() {
  const p = getPalette()
  params.paletteA = v3toObj(p.a)
  params.paletteB = v3toObj(p.b)
  params.paletteC = v3toObj(p.c)
  params.paletteD = v3toObj(p.d)
  params.bgColor = v3toObj(p.bg)
  params.ramp0 = v3toObj(p.ramp[0])
  params.ramp1 = v3toObj(p.ramp[1])
  params.ramp2 = v3toObj(p.ramp[2])
  params.ramp3 = v3toObj(p.ramp[3])
  params.ramp4 = v3toObj(p.ramp[4])

  if (isDark()) {
    params.fadeColor = v3toObj(p.bg)
  } else {
    params.fadeColor = { x: 1, y: 1, z: 1 }
  }

  setTargetFromPalette()
}

function lerpParamsToTarget(dt: number) {
  const t = Math.min(1, TRANSITION_SPEED * dt)
  lerpVec3(params.paletteA, target.paletteA, t)
  lerpVec3(params.paletteB, target.paletteB, t)
  lerpVec3(params.paletteC, target.paletteC, t)
  lerpVec3(params.paletteD, target.paletteD, t)
  lerpVec3(params.bgColor, target.bgColor, t)
  lerpVec3(params.fadeColor, target.fadeColor, t)
  lerpVec3(params.ramp0, target.ramp0, t)
  lerpVec3(params.ramp1, target.ramp1, t)
  lerpVec3(params.ramp2, target.ramp2, t)
  lerpVec3(params.ramp3, target.ramp3, t)
  lerpVec3(params.ramp4, target.ramp4, t)
}

function syncUniforms() {
  if (!material) return
  const u = material.uniforms
  u.uGrainIntensity!.value = params.grainIntensity
  u.uNoiseScale!.value = params.noiseScale
  u.uNoiseSpeed!.value = params.noiseSpeed
  u.uBlobRadius1!.value = params.blobRadius1
  u.uBlobRadius2!.value = params.blobRadius2
  u.uBlobWarp1!.value = params.blobWarp1
  u.uBlobWarp2!.value = params.blobWarp2
  u.uPaletteA!.value.set(params.paletteA.x, params.paletteA.y, params.paletteA.z)
  u.uPaletteB!.value.set(params.paletteB.x, params.paletteB.y, params.paletteB.z)
  u.uPaletteC!.value.set(params.paletteC.x, params.paletteC.y, params.paletteC.z)
  u.uPaletteD!.value.set(params.paletteD.x, params.paletteD.y, params.paletteD.z)
  u.uBgColor!.value.set(params.bgColor.x, params.bgColor.y, params.bgColor.z)
  u.uGrainScale!.value = params.grainScale
  u.uTimeScale!.value = params.timeScale
  u.uFadeMix!.value = params.fadeMix
  u.uFadeColor!.value.set(params.fadeColor.x, params.fadeColor.y, params.fadeColor.z)
  u.uRamp0!.value.set(params.ramp0.x, params.ramp0.y, params.ramp0.z)
  u.uRamp1!.value.set(params.ramp1.x, params.ramp1.y, params.ramp1.z)
  u.uRamp2!.value.set(params.ramp2.x, params.ramp2.y, params.ramp2.z)
  u.uRamp3!.value.set(params.ramp3.x, params.ramp3.y, params.ramp3.z)
  u.uRamp4!.value.set(params.ramp4.x, params.ramp4.y, params.ramp4.z)
  u.uDebug!.value = params.debug
  u.uIntroReveal!.value = intro.getReveal()
}

function createScene(canvas: HTMLCanvasElement, grainTex: Texture) {
  intro.reset()
  introScheduled = false

  renderer = new WebGLRenderer({ canvas, alpha: false, antialias: false })
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2))
  renderer.setSize(globalThis.innerWidth, globalThis.innerHeight)

  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  syncParamsFromPalette()

  material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new Vector2(globalThis.innerWidth, globalThis.innerHeight) },
      uPaletteA: { value: new Vector3(params.paletteA.x, params.paletteA.y, params.paletteA.z) },
      uPaletteB: { value: new Vector3(params.paletteB.x, params.paletteB.y, params.paletteB.z) },
      uPaletteC: { value: new Vector3(params.paletteC.x, params.paletteC.y, params.paletteC.z) },
      uPaletteD: { value: new Vector3(params.paletteD.x, params.paletteD.y, params.paletteD.z) },
      uBgColor: { value: new Vector3(params.bgColor.x, params.bgColor.y, params.bgColor.z) },
      uGrainTex: { value: grainTex },
      uGrainIntensity: { value: params.grainIntensity },
      uNoiseScale: { value: params.noiseScale },
      uNoiseSpeed: { value: params.noiseSpeed },
      uBlobRadius1: { value: params.blobRadius1 },
      uBlobRadius2: { value: params.blobRadius2 },
      uBlobWarp1: { value: params.blobWarp1 },
      uBlobWarp2: { value: params.blobWarp2 },
      uGrainScale: { value: params.grainScale },
      uTimeScale: { value: params.timeScale },
      uFadeMix: { value: params.fadeMix },
      uFadeColor: { value: new Vector3(params.fadeColor.x, params.fadeColor.y, params.fadeColor.z) },
      uRamp0: { value: new Vector3(params.ramp0.x, params.ramp0.y, params.ramp0.z) },
      uRamp1: { value: new Vector3(params.ramp1.x, params.ramp1.y, params.ramp1.z) },
      uRamp2: { value: new Vector3(params.ramp2.x, params.ramp2.y, params.ramp2.z) },
      uRamp3: { value: new Vector3(params.ramp3.x, params.ramp3.y, params.ramp3.z) },
      uRamp4: { value: new Vector3(params.ramp4.x, params.ramp4.y, params.ramp4.z) },
      uDebug: { value: params.debug },
      uIntroReveal: { value: 0 },
    },
  })

  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  scene.add(mesh)

  renderer.compile(scene, camera)

  const startTime = performance.now()
  let lastFrame = performance.now()

  function tick() {
    if (!renderer || !material) return
    const now = performance.now()
    const dt = (now - lastFrame) * 0.001 // seconds
    lastFrame = now

    lerpParamsToTarget(dt)
    syncUniforms()

    material.uniforms.uTime!.value = (now - startTime) * 0.008
    renderer.render(scene, camera)

    if (!introScheduled) {
      introScheduled = true
      requestAnimationFrame(() => {
        const wrapperEl = canvasWrapperRef.value
        if (!wrapperEl) return
        intro.startCanvasOpacityTween(
          wrapperEl,
          CANVAS_OPACITY_DURATION,
          SHADER_START_AT_CANVAS_PROGRESS,
          INTRO_SHADER_DURATION_S,
          EMIT_AT_SHADER_PROGRESS,
        )
      })
    }

    rafId = requestAnimationFrame(tick)
  }

  tick()
}

function onResize() {
  if (!renderer || !material) return
  renderer.setSize(globalThis.innerWidth, globalThis.innerHeight)
  material.uniforms.uResolution!.value.set(globalThis.innerWidth, globalThis.innerHeight)
}

function updatePalette() {
  // Only update targets — the tick loop will lerp smoothly
  setTargetFromPalette()
}

let themeObserver: MutationObserver | null = null
let activeGrainTexture: Texture | null = null
let introFallbackTimer: ReturnType<typeof globalThis.setTimeout> | null = null

function forceEmitIntroComplete(reason: string) {
  if (intro.hasEmitted()) return
  if (reason) {
    console.warn('[BackgroundCanvas] intro fallback:', reason)
  }
  intro.forceEmitIntroComplete()
}

onMounted(() => {
  if (!canvasRef.value) return

  introFallbackTimer = globalThis.setTimeout(() => {
    introFallbackTimer = null
    if (!intro.hasEmitted()) {
      forceEmitIntroComplete('timeout')
    }
  }, 300)

  void (async () => {
    const el = canvasRef.value
    if (!el) return
    try {
      const grainTex = await loadGrainTextureAsync()
      if (introFallbackTimer) {
        globalThis.clearTimeout(introFallbackTimer)
        introFallbackTimer = null
      }
      activeGrainTexture = grainTex
      createScene(el, grainTex)
    } catch (e) {
      if (introFallbackTimer) {
        globalThis.clearTimeout(introFallbackTimer)
        introFallbackTimer = null
      }
      console.error('[BackgroundCanvas]', e)
      forceEmitIntroComplete('texture-or-scene')
    }
  })()

  globalThis.addEventListener('resize', onResize)

  themeObserver = new MutationObserver(updatePalette)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

onBeforeUnmount(() => {
  intro.destroy()
  if (introFallbackTimer) {
    globalThis.clearTimeout(introFallbackTimer)
    introFallbackTimer = null
  }
  cancelAnimationFrame(rafId)
  globalThis.removeEventListener('resize', onResize)
  themeObserver?.disconnect()
  renderer?.dispose()
  material?.dispose()
  activeGrainTexture?.dispose()
  activeGrainTexture = null
  renderer = null
  material = null
})
</script>
