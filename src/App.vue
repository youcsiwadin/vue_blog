<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useSiteStore } from '@/stores/site'

const route = useRoute()
const { state: site, loadSettings } = useSiteStore()

/** 博客站点：使用独立的展示页面布局 */
const isBlog = computed(() => route.meta.layout === 'blog')

/** 登录页与博客站点不显示管理后台的顶部导航与左侧菜单 */
const showChrome = computed(() => route.meta.layout !== 'plain' && !isBlog.value)
/** 登录页与博客站点不显示管理后台的左侧菜单 */
const showSidebar = computed(() => showChrome.value && route.meta.hideSidebar !== true)

const showMsidebar = computed(() => route.meta.layout !== 'plain' && !isBlog.value )

onMounted(() => {
  void loadSettings()
})
</script>

<template>
  <div class="app-shell">
    <!-- 顶部导航栏 -->
    <AppHeader v-if="showChrome" />

    <div class="app-body">
      <!-- 左侧导航菜单 -->
      <AppSidebar v-if="showSidebar" />

      <main :class="isBlog ? 'app-main--blog' : 'app-main'">
        <RouterView />
        <footer v-if="showChrome && site.footerText" class="app-footer">
          {{ site.footerText }}
        </footer>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.app-body {
  flex: 1;
  display: flex;
  align-items: stretch;
  min-height: 0;
}

.app-main {
  flex: 1;
  min-width: 0;
  padding: 24px 16px 48px;
  box-sizing: border-box;
}

/* 博客站点内容区：由博客自身的布局控制间距 */
.app-main--blog {
  flex: 1;
  min-width: 0;
}

.app-footer {
  margin-top: 32px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
</style>
