<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useUserStore } from '@/stores/user'
import { canEnterAdmin } from '@/utils/role'

const props = defineProps<{
  /** 是否处于封面位置（封面处导航栏背景透明，滚动后渐进显示） */
  transparentAtTop?: boolean
  /** 是否夜间模式（夜间导航栏背景为半透明黑色） */
  night?: boolean
}>()

const route = useRoute()
const router = useRouter()
const { state: account, isLoggedIn, logout, ensureUserLoaded } = useUserStore()

/** 博客导航栏标题 */
const navTitle = '御园千绫的博客'

/** 0 = 完全透明，1 = 完整背景（80% 透明度） */
const progress = ref(1)
const searchOpen = ref(false)
const keyword = ref('')

/** 当前登录用户展示信息 */
const displayName = computed(() => account.user?.nickname || account.user?.username || '用户')
const avatar = computed(() => account.user?.avatar ?? '')
const initial = computed(() => displayName.value.charAt(0))
/** 可进入管理系统的角色才显示"个人资料"入口 */
const showProfile = computed(() => canEnterAdmin(account.user?.role ?? null))

const navStyle = computed(() => ({
  backgroundColor: props.night
    ? `rgba(18, 18, 18, ${(0.8 * progress.value).toFixed(3)})`
    : `rgba(255, 255, 255, ${(0.8 * progress.value).toFixed(3)})`,
  backdropFilter: progress.value > 0.05 ? 'blur(8px)' : 'none',
  boxShadow: progress.value > 0.05 ? '0 1px 6px rgba(0, 0, 0, 0.06)' : 'none',
}))

/** 根据滚动位置计算导航栏背景的渐进程度 */
function updateProgress(): void {
  if (!props.transparentAtTop) {
    progress.value = 1
    return
  }
  const coverHeight = window.innerHeight || 1
  const ratio = window.scrollY / (coverHeight * 0.6)
  progress.value = Math.min(Math.max(ratio, 0), 1)
}

function go(name: string): void {
  searchOpen.value = false
  void router.push({ name })
}

function isActive(...names: string[]): boolean {
  return names.includes(String(route.name))
}

function handleSearch(): void {
  const value = keyword.value.trim()
  if (!value) {
    return
  }
  searchOpen.value = false
  void router.push({ name: 'blog-articles', query: { keyword: value } })
}

/** 登录 / 注册：登录后回到博客当前页面 */
function goLogin(): void {
  searchOpen.value = false
  void router.push({ name: 'login', query: { redirect: route.fullPath } })
}

/** 账号菜单：个人资料 / 退出账号 */
function handleCommand(command: string): void {
  if (command === 'profile') {
    void router.push({ name: 'profile' })
    return
  }
  if (command === 'logout') {
    logout()
    ElMessage.success('已退出账号')
  }
}

onMounted(() => {
  void ensureUserLoaded()
  updateProgress()
  window.addEventListener('scroll', updateProgress, { passive: true })
  window.addEventListener('resize', updateProgress)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateProgress)
  window.removeEventListener('resize', updateProgress)
})
</script>

<template>
  <header class="blog-nav" :style="navStyle">
    <div class="blog-nav__inner">
      <nav class="blog-nav__menu">
        <button type="button" class="blog-nav__brand" @click="go('blog-home')">
          {{ navTitle }}
        </button>
        <button
          type="button"
          class="blog-nav__link"
          :class="{ 'blog-nav__link--active': isActive('blog-articles', 'blog-article-detail') }"
          @click="go('blog-articles')"
        >
          文章
        </button>
        <button
          type="button"
          class="blog-nav__link"
          :class="{ 'blog-nav__link--active': isActive('blog-guestbook') }"
          @click="go('blog-guestbook')"
        >
          留言板
        </button>
        <button
          type="button"
          class="blog-nav__link"
          :class="{ 'blog-nav__link--active': isActive('blog-moments') }"
          @click="go('blog-moments')"
        >
          说说
        </button>
      </nav>

      <div class="blog-nav__right">
        <input
          v-if="searchOpen"
          v-model="keyword"
          class="blog-nav__search"
          placeholder="搜索文章…"
          @keyup.enter="handleSearch"
        />
        <button
          type="button"
          class="blog-nav__icon"
          title="搜索"
          @click="searchOpen ? handleSearch() : (searchOpen = true)"
        >
          <svg viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              fill="currentColor"
              d="M448 128a320 320 0 1 0 190.4 579.2l168 168 45.2-45.2-168-168A320 320 0 0 0 448 128zm0 64a256 256 0 1 1 0 512 256 256 0 0 1 0-512z"
            />
          </svg>
        </button>

        <!-- 登录 / 注册，或已登录账号（含退出账号） -->
        <el-dropdown v-if="isLoggedIn" trigger="click" placement="bottom-end" @command="handleCommand">
          <span class="blog-nav__user">
            <el-avatar :size="26" :src="avatar || undefined" class="blog-nav__avatar">
              {{ initial }}
            </el-avatar>
            <span class="blog-nav__nickname">{{ displayName }}</span>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-if="showProfile" command="profile">个人资料</el-dropdown-item>
              <el-dropdown-item command="logout" :divided="showProfile">退出账号</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button v-else text class="blog-nav__login" @click="goLogin">登录 / 注册</el-button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.blog-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.blog-nav__inner {
  max-width: 1120px;
  margin: 0 auto;
  height: 60px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.blog-nav__menu {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.blog-nav__brand,
.blog-nav__link {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 2px;
  color: #303133;
}

.blog-nav__brand {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.blog-nav__brand:hover {
  color: var(--blog-primary-color, #409eff);
}

.blog-nav__link {
  font-size: 15px;
  color: #4c4d4f;
}

.blog-nav__link:hover,
.blog-nav__link--active {
  color: var(--blog-primary-color, #409eff);
  font-weight: 600;
}

.blog-nav__right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.blog-nav__search {
  width: 200px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 16px;
  outline: none;
  background-color: rgba(255, 255, 255, 0.9);
  font-family: inherit;
  font-size: 13px;
}

.blog-nav__search:focus {
  border-color: var(--blog-primary-color, #409eff);
}

.blog-nav__icon {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #4c4d4f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.blog-nav__icon:hover {
  color: var(--blog-primary-color, #409eff);
}

.blog-nav__icon svg {
  width: 18px;
  height: 18px;
}

.blog-nav__login {
  padding: 4px 6px;
  color: #303133;
  font-size: 15px;
}

.blog-nav__login:hover {
  color: var(--blog-primary-color, #409eff);
}

.blog-nav__user {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #303133;
  outline: none;
}

.blog-nav__avatar {
  background-color: var(--blog-primary-color, #409eff);
  color: #ffffff;
  font-size: 13px;
}

.blog-nav__nickname {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
</style>
