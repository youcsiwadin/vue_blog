<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useUserStore } from '@/stores/user'
import { triggerRefresh } from '@/composables/useRefresh'
import { useSiteStore } from '@/stores/site'
import { useNotificationStore } from '@/stores/notification'
import { notificationWs } from '@/utils/websocket'
import { TOKEN_STORAGE_KEY } from '@/api/request'

const router = useRouter()
const notificationStore = useNotificationStore()
const { state, isLoggedIn, logout, ensureUserLoaded } = useUserStore()
const { state: site } = useSiteStore()

const unreadNoticeCount = computed(() => notificationStore.unreadNoticeCount)

let offWs: (() => void) | null = null

function connectNotifications(): void {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!token) {
    notificationWs.close()
    notificationStore.reset()
    return
  }
  if (!offWs) {
    offWs = notificationWs.onMessage((msg) => notificationStore.onWsMessage(msg))
  }
  notificationWs.connect(token)
  void notificationStore.fetchUnreadCounts().catch(() => {
    // 登录失效等错误由请求拦截器统一提示
  })
}

function disconnectNotifications(): void {
  offWs?.()
  offWs = null
  notificationWs.close()
  notificationStore.reset()
}

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    connectNotifications()
  } else {
    disconnectNotifications()
  }
})

onMounted(async () => {
  // 刷新浏览器后，使用本地 Token 恢复登录状态
  await ensureUserLoaded()
  if (isLoggedIn.value) {
    connectNotifications()
  }
})

onUnmounted(() => {
  offWs?.()
  offWs = null
  notificationWs.close()
})

/** 点击站点名称：跳转到博客网站页面 */
function handleHome(): void {
  void router.push({ name: 'blog-home' })
}

/** 刷新页面按钮：重新请求当前页面数据 */
function handleRefresh(): void {
  triggerRefresh()
  ElMessage.success('页面数据已刷新')
}

/** 快速新建文章按钮 */
function handleCreate(): void {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再新建文章')
    void router.push({ name: 'login', query: { redirect: '/articles/new' } })
    return
  }
  void router.push({ name: 'article-create' })
}

/** 进入消息通知页面 */
function inMessage(): void{
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再查看通知')
    void router.push({ name: 'login', query: { redirect: '/messages' } })
    return
  }
  void router.push({ name: 'messages' })
}
/** 登录 / 注册按钮 */
function handleLogin(): void {
  void router.push({ name: 'login' })
}

/** 退出登录 */
function handleLogout(): void {
  logout()
  ElMessage.success('已退出登录')
  void router.push({ name: 'article-list' })
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <!-- 左：站点名称（可点击） -->
      <div class="app-header__left">
        <button type="button" class="app-header__brand" title="前往博客网站" @click="handleHome">
          <img v-if="site.logoUrl" :src="site.logoUrl" alt="logo" class="app-header__logo" />
          {{ site.siteName }}
        </button>

        <!-- 刷新页面 -->
        <el-button class="app-header__action" text :icon="undefined" @click="handleRefresh">
          <svg class="app-header__icon" viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              fill="currentColor"
              d="M512 128a384 384 0 1 0 363.5 261.2l-74.6 22.6A304 304 0 1 1 512 208c84 0 159.8 34 215.3 89.4L640 384h320V64l-96.7 96.7A382.9 382.9 0 0 0 512 128z"
            />
          </svg>
          刷新页面
        </el-button>

        <!-- 快速新建文章 -->
        <el-button class="app-header__action" type="primary" @click="handleCreate">
          <svg class="app-header__icon" viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              fill="currentColor"
              d="M832 64H192a64 64 0 0 0-64 64v768a64 64 0 0 0 64 64h468.6L896 725.6V128a64 64 0 0 0-64-64zM256 256h512v64H256v-64zm0 160h512v64H256v-64zm0 160h288v64H256v-64zm336 224v-144h144l-144 144z"
            />
          </svg>
          快速新建文章
        </el-button>
      </div>

      <!-- 右：登录 / 注册 -->
      <div class="app-header__right">
        <el-button v-if="!isLoggedIn" type="primary" plain @click="handleLogin">
          登录 / 注册
        </el-button>

        <el-dropdown v-else trigger="click" placement="bottom-end" @command="handleLogout">
          <span class="app-header__user">
            <el-avatar :size="28" class="app-header__avatar">
              {{ (state.user?.nickname || state.user?.username || 'B').charAt(0) }}
            </el-avatar>
            <span class="app-header__nickname">{{ state.user?.nickname || state.user?.username }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 消息通知：头像右侧，角标为当前登录用户全部未读通知数 -->
        <el-badge
          v-if="isLoggedIn"
          class="app-header__badge"
          :value="unreadNoticeCount"
          :max="99"
          :hidden="unreadNoticeCount === 0"
        >
          <el-button
            class="app-header__notify"
            circle
            :title="unreadNoticeCount > 0 ? `消息通知（${unreadNoticeCount} 条未读）` : '消息通知'"
            aria-label="消息通知"
            @click="inMessage"
          >
            <svg class="app-header__bell" viewBox="0 0 1024 1024" aria-hidden="true">
              <path
                fill="currentColor"
                d="M512 64a320 320 0 0 0-320 320v192L64 768v64h896v-64l-128-192V384A320 320 0 0 0 512 64zm0 896a128 128 0 0 0 128-128H384a128 128 0 0 0 128 128z"
              />
            </svg>
          </el-button>
        </el-badge>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.app-header__inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  padding: 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
  cursor: pointer;
  letter-spacing: 0.5px;
}

.app-header__brand:hover {
  color: #337ecc;
  text-decoration: underline;
}

.app-header__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.app-header__icon {
  width: 14px;
  height: 14px;
}

.app-header__logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-header__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #303133;
  outline: none;
}

.app-header__avatar {
  background-color: #409eff;
  color: #ffffff;
}

.app-header__nickname {
  font-size: 14px;
}

.app-header__badge {
  display: inline-flex;
}

.app-header__notify {
  width: 34px;
  height: 34px;
  padding: 0;
  color: #606266;
}

.app-header__notify:hover {
  color: #409eff;
}

.app-header__bell {
  width: 18px;
  height: 18px;
}

.app-header__badge :deep(.el-badge__content) {
  border: 2px solid #ffffff;
}
</style>
