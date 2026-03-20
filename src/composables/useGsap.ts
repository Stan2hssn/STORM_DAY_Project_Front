import { GSAP_KEY } from '@/plugins/gsap'
import gsap from 'gsap'
import { inject } from 'vue'

export function useGsap() {
  return inject(GSAP_KEY, gsap)
}

