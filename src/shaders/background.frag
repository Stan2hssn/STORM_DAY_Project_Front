precision highp float;

#include "noise.glsl"

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;

uniform vec3 uPaletteA;
uniform vec3 uPaletteB;
uniform vec3 uPaletteC;
uniform vec3 uPaletteD;

uniform sampler2D uGrainTex;

uniform float uGrainIntensity;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform vec3 uBgColor;
uniform float uBlobRadius1;
uniform float uBlobRadius2;
uniform float uBlobWarp1;
uniform float uBlobWarp2;
uniform int uDebug;
uniform float uGrainScale;
uniform float uTimeScale;
uniform float uFadeMix;       // how much to fade blobs for readability
uniform vec3 uFadeColor;      // fade target: white (light) or dark bg (dark)
uniform float uIntroReveal;   // 0..1 intro : warp / blobs / grain (ease appliqué côté JS)

// Ramp colors as uniforms (transitioned between themes)
uniform vec3 uRamp0;  // strongest (center)
uniform vec3 uRamp1;
uniform vec3 uRamp2;
uniform vec3 uRamp3;
uniform vec3 uRamp4;  // weakest (edge)

vec3 palette(float t) {
  return uPaletteA + uPaletteB * cos(6.28318 * (uPaletteC * t + uPaletteD));
}

vec3 blobColor(float intensity, float hueShift) {
  float t = clamp(intensity + hueShift, 0.0, 1.0);

  vec3 col;
  if(t > 0.75) {
    col = mix(uRamp1, uRamp0, (t - 0.75) * 4.0);
  } else if(t > 0.5) {
    col = mix(uRamp2, uRamp1, (t - 0.5) * 4.0);
  } else if(t > 0.25) {
    col = mix(uRamp3, uRamp2, (t - 0.25) * 4.0);
  } else {
    col = mix(uRamp4, uRamp3, t * 4.0);
  }

  col = mix(col, uFadeColor, uFadeMix);
  return col;
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = vUv;
  vec2 pos = vec2(uv.x * aspect, uv.y);

  float ir = uIntroReveal;
  // Même easing out cubic que le JS (1 - (1-t)³) pour une entrée fluide

  float t = uTime * uTimeScale;
  float tSlow = uTime * uNoiseSpeed;

  // ── Warp UVs (organic blob shape) — renforcé progressivement ──
  vec2 warp = vec2(snoise(vec3(pos * uNoiseScale, t * 0.8)) * uBlobWarp1, snoise(vec3(pos * uNoiseScale + 5.0, t * 0.6)) * uBlobWarp2) * ir;
  vec2 warpedPos = pos + warp;

  // ── Blob centers ──
  vec2 c1 = vec2((0.82 + sin(tSlow * 0.5) * 0.03) * aspect, 0.82 + cos(tSlow * 0.4) * 0.03);
  vec2 c2 = vec2((0.15 + cos(tSlow * 0.6) * 0.03) * aspect, 0.18 + sin(tSlow * 0.5) * 0.03);

  // ── Blobs ──
  float d1 = length(warpedPos - c1);
  float d2 = length(warpedPos - c2);

  float b1 = (1.0 - smoothstep(0.0 * ir, uBlobRadius1, d1));
  float b2 = (1.0 - smoothstep(0.0 * ir, uBlobRadius2, d2));

  // ── Hue variation within blobs via noise ──
  float hue1 = snoise(vec3(pos * 0.6, tSlow * 0.2)) * 0.15;
  float hue2 = snoise(vec3(pos * 0.5 + 5.0, tSlow * 0.18)) * 0.15;

  // ── Color from ramp based on blob intensity ──
  vec3 col1 = blobColor(b1, hue1);
  vec3 col2 = blobColor(b2, hue2);

  // ── Composite ──
  vec3 col = uBgColor;
  col = mix(col, col1, b1);
  col = mix(col, col2, b2);

  // ── Grain with contrast ──
  float g1 = texture2D(uGrainTex, fract(uv * uGrainScale)).r;
  float g2 = texture2D(uGrainTex, fract(uv * uGrainScale * 2.0 + 0.37)).r;
  float g3 = texture2D(uGrainTex, fract(uv * uGrainScale * 4.0 + 0.71)).r;
  float grain = g1 * 0.5 + g2 * 0.3 + g3 * 0.2;
  // Boost contrast: push away from 0.5
  grain = (grain - 0.5) * 2.0;
  grain = sign(grain) * pow(abs(grain), 0.7) * 0.5 + 0.5;
  col += (1. - grain) * uGrainIntensity * ir;

  // ── Debug ──
  if(uDebug == 1) {
    gl_FragColor = vec4(vec3(b1), 1.0);
    return;
  }
  if(uDebug == 2) {
    gl_FragColor = vec4(vec3(b2), 1.0);
    return;
  }
  if(uDebug == 3) {
    gl_FragColor = vec4(b1, b2, 0.0, 1.0);
    return;
  }
  if(uDebug == 4) {
    vec2 wd = warpedPos - pos;
    gl_FragColor = vec4(wd * 5.0 + 0.5, 0.5, 1.0);
    return;
  }
  if(uDebug == 5) {
    gl_FragColor = vec4(vec3(grain), 1.0);
    return;
  }

  gl_FragColor = vec4(col, 1.0);
}
