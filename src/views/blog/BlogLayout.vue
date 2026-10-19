<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

import BlogNavbar from '@/components/BlogNavbar.vue'
import BlogAdminPanel from '@/components/BlogAdminPanel.vue'
import { useSiteStore } from '@/stores/site'
import { useUserStore } from '@/stores/user'
import { useNightMode } from '@/composables/useNightMode'
import { isAdminRole } from '@/utils/role'
import { saveSiteSetting } from '@/api/setting'

const route = useRoute()
const { state: site, loadSettings, setSettings } = useSiteStore()
const { state: account } = useUserStore()
const { isNight, activeCoverImage } = useNightMode()

/** 仅博客主页存在整屏封面，其余页面导航栏直接显示背景 */
const isHome = computed(() => route.name === 'blog-home')

/**
 * 站点整体背景与封面保持一致：设置了封面图片则整站使用同一张图
 * （固定定位，不随滚动移动，透明度 40%），未设置封面图片时为白色背景。
 */
const backgroundStyle = computed(() =>
  activeCoverImage.value ? { backgroundImage: `url(${activeCoverImage.value})` } : {},
)

/**
 * 博客系统的主题色：把站点主色调写入博客根节点，
 * 博客内所有模块（含 Element Plus 组件）统一跟随主题色。
 */
const themeStyle = computed(() => ({
  '--el-color-primary': site.primaryColor || '#409eff',
  '--blog-primary-color': site.primaryColor || '#409eff',
}))

/** 右下角切换按钮：仅管理员可见 */
const canToggleNight = computed(() => isAdminRole(account.user?.role ?? null))
const switching = ref(false)

async function toggleNightMode(): Promise<void> {
  const targetNight = !isNight.value
  switching.value = true
  try {
    const settings = await saveSiteSetting({
      ...site,
      nightModeSwitch: targetNight ? 'night' : 'day',
      themeStyle: targetNight ? 'dark' : 'light',
    })
    setSettings(settings)
    ElMessage.success(targetNight ? '已切换为夜间模式' : '已切换为白天模式')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    switching.value = false
  }
}

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <div class="blog-shell" :class="{ 'blog-night': isNight }" :style="themeStyle">
    <!-- 站点背景图（40% 透明度，不遮挡内容与交互） -->
    <div v-if="activeCoverImage" class="blog-shell__bg" :style="backgroundStyle"></div>

    <BlogNavbar :transparent-at-top="isHome" :night="isNight" />

    <!-- 左侧快捷管理弹窗（仅管理员权限账号可见） -->
    <BlogAdminPanel />

    <main class="blog-shell__content">
      <RouterView />
    </main>

    <footer class="blog-footer">{{ site.footerText || site.siteName }}</footer>

    <!-- 右下角：管理员可切换白天 / 夜间模式 -->
    <button
      v-if="canToggleNight"
      type="button"
      class="blog-theme-toggle"
      :title="isNight ? '切换为白天模式' : '切换为夜间模式'"
      :disabled="switching"
      @click="toggleNightMode"
    >
      <svg v-if="isNight" viewBox="0 0 1024 1024" aria-hidden="true">
        <path
          fill="currentColor"
          d="M512 256a256 256 0 1 0 0 512 256 256 0 0 0 0-512zm0-192 32 96h-64l32-96zm0 896 32 96h-64l32-96zM64 512l96-32v64l-96-32zm896 0-96 32v-64l96 32zM188 188l92 44-46 46-46-90zm648 648-92-44 46-46 46 90zM188 836l46-90 46 46-92 44zm648-648-46 90-46-46 92-44z"
        />
      </svg>
      <svg v-else viewBox="0 0 1024 1024" aria-hidden="true">
        <path
          fill="currentColor"
          d="M512 64a448 448 0 0 0 0 896c-40-96-40-224 0-320s120-160 224-192A448 448 0 0 0 512 64z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.blog-shell {
  position: relative;
  min-height: 100vh;
  background-color: #ffffff;
}

/* 背景层：铺满视口、固定不滚动、40% 透明度 */
.blog-shell__bg {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0.4;
  pointer-events: none;
}

/* 内容层置于背景之上 */
.blog-shell__content,
.blog-footer {
  position: relative;
  z-index: 1;
}

/* 右下角主题切换按钮 */
.blog-theme-toggle {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 120;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(228, 231, 237, 0.9);
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  color: var(--blog-primary-color, #409eff);
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.blog-theme-toggle:hover {
  transform: scale(1.08);
}

.blog-theme-toggle svg {
  width: 22px;
  height: 22px;
}

.blog-night .blog-theme-toggle {
  background-color: rgba(30, 30, 30, 0.85);
  border-color: rgba(255, 255, 255, 0.15);
}

.blog-footer {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 40px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
