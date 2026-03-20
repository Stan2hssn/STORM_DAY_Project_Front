import type gsap from 'gsap'

type EmitIntroComplete = () => void

export type IntroController = ReturnType<typeof createIntroController>

export function createIntroController(
  animation: typeof gsap,
  onIntroHalfway: EmitIntroComplete,
) {
  let introAnimating = false
  let introReveal = 0
  let introCompleteEmitted = false
  let canvasOpacityTween: gsap.core.Tween | null = null
  let shaderIntroTween: gsap.core.Tween | null = null

  function startShaderIntroTween(durationS: number, emitAtProgress: number) {
    introAnimating = true
    shaderIntroTween = animation.to({ reveal: introReveal }, {
      reveal: 1,
      duration: durationS,
      ease: 'power2.out',
      onUpdate: function () {
        introReveal = this.targets()[0].reveal as number
        if (this.progress() >= emitAtProgress && !introCompleteEmitted) {
          introCompleteEmitted = true
          onIntroHalfway()
        }
      },
      onComplete: () => {
        introAnimating = false
        introReveal = 1
      },
    })
  }

  function startCanvasOpacityTween(
    wrapperEl: HTMLDivElement,
    durationS: number,
    startShaderAtProgress: number,
    shaderDurationS: number,
    emitAtShaderProgress: number,
  ) {
    canvasOpacityTween = animation.to(wrapperEl, {
      opacity: 1,
      duration: durationS,
      ease: 'power2.out',
      onUpdate: function (this: gsap.core.Tween) {
        if (this.progress() >= startShaderAtProgress && !introAnimating) {
          startShaderIntroTween(shaderDurationS, emitAtShaderProgress)
        }
      },
    })
  }

  function reset() {
    introAnimating = false
    introReveal = 0
    canvasOpacityTween?.kill()
    shaderIntroTween?.kill()
    canvasOpacityTween = null
    shaderIntroTween = null
  }

  function forceEmitIntroComplete() {
    if (introCompleteEmitted) return
    introCompleteEmitted = true
    onIntroHalfway()
  }

  function destroy() {
    canvasOpacityTween?.kill()
    shaderIntroTween?.kill()
    canvasOpacityTween = null
    shaderIntroTween = null
  }

  function getReveal() {
    return introReveal
  }

  function hasEmitted() {
    return introCompleteEmitted
  }

  return {
    startCanvasOpacityTween,
    reset,
    destroy,
    getReveal,
    hasEmitted,
    forceEmitIntroComplete,
  }
}

