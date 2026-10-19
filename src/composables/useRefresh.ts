import { ref } from 'vue'

/**
 * 全局刷新信号：顶部导航栏的「刷新页面」按钮触发，
 * 当前页面监听该信号后重新请求数据。
 */
const refreshTick = ref(0)

/** 获取刷新信号（响应式） */
export function useRefreshSignal() {
  return refreshTick
}

/** 触发一次页面数据刷新 */
export function triggerRefresh(): void {
  refreshTick.value += 1
}
