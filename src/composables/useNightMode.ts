import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useSiteStore } from '@/stores/site'

/**
 * 夜间模式：
 * - 保持夜间模式（night）/ 保持白天模式（day）由站点设置决定；
 * - 根据时间切换（time）：22:00 ~ 次日 07:00 为夜间，其余为白天。
 */
const nowTick = ref(Date.now())
let timer: number | undefined

export function useNightMode() {
  const { state: site } = useSiteStore()

  const isNight = computed(() => {
    const mode = site.nightModeSwitch
    if (mode === 'night') {
      return true
    }
    if (mode === 'day') {
      return false
    }
    const hour = new Date(nowTick.value).getHours()
    return hour >= 22 || hour < 7
  })

  /** 博客背景与封面：夜间优先使用夜间封面背景 */
  const activeCoverImage = computed(() =>
    isNight.value ? site.nightCoverImage || site.coverImage : site.coverImage,
  )

  onMounted(() => {
    // 每分钟校准一次时间（用于"根据时间切换"）
    timer = window.setInterval(() => {
      nowTick.value = Date.now()
    }, 60_000)
  })

  onBeforeUnmount(() => {
    if (timer) {
      window.clearInterval(timer)
    }
  })

  return { isNight, activeCoverImage }
}
