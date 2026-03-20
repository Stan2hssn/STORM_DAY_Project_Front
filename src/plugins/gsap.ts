import gsap from 'gsap'
import type { App, InjectionKey } from 'vue'

export const GSAP_KEY: InjectionKey<typeof gsap> = Symbol('GSAP')

export const gsapPlugin = {
  install(app: App) {
    app.provide(GSAP_KEY, gsap)
  },
}

