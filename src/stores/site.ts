import { reactive } from 'vue'

import { fetchSiteSetting } from '@/api/setting'
import type { SiteSetting } from '@/types/api'

const state = reactive<SiteSetting>({
  siteName: 'JAVA博客网站',
  siteDescription: '',
  footerText: '',
  primaryColor: '#409eff',
  themeStyle: 'light',
  logoUrl: '',
  coverTitle: '博客',
  coverSubtitle: '我的博客',
  coverImage: '',
  nightCoverImage: '',
  nightModeSwitch: 'day',
  notice: '',
  noticeBoard: '',
  authorName: '御园千绫',
  authorAvatar: '',
})

/**
 * 应用主题：
 * 站点主色调只作用于博客系统（通过 --blog-primary-color 变量），
 * 博客管理系统固定使用默认主色 #409eff，不受该设置影响。
 * 夜间模式同样只作用于博客系统（由博客根节点的 blog-night 类控制），
 * 博客管理系统始终使用白色/浅色主题。
 */
function applyTheme(): void {
  const root = document.documentElement
  root.style.setProperty('--blog-primary-color', state.primaryColor || '#409eff')
}

/** 加载站点设置（公开接口，未登录也可用） */
async function loadSettings(): Promise<void> {
  try {
    Object.assign(state, await fetchSiteSetting())
  } catch {
    // 后端不可用时使用默认设置
  } finally {
    applyTheme()
  }
}

/** 保存设置后同步更新站点主题 */
function setSettings(settings: SiteSetting): void {
  Object.assign(state, settings)
  applyTheme()
}

export function useSiteStore() {
  return { state, loadSettings, setSettings, applyTheme }
}
