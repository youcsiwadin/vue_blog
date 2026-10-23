<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { fetchPendingCommentCount } from '@/api/comment'
import { useUserStore } from '@/stores/user'
import { canEnterAdmin, canWriteArticle, isAdminRole } from '@/utils/role'

const router = useRouter()
const route = useRoute()
const { state: account, ensureUserLoaded } = useUserStore()

const open = ref(false)
const pendingCount = ref(0)

const role = computed(() => account.user?.role ?? null)

/** 左弹窗仅对可进入管理系统的角色显示（管理员 / 作者 / 订阅者） */
const visible = computed(() => canEnterAdmin(role.value))

/** 写文章按钮：仅管理员与作者（订阅者不显示） */
const showWriteArticle = computed(() => canWriteArticle(role.value))

/** 待审核评论数量：仅管理员可查看 */
const showCommentCount = computed(() => isAdminRole(role.value))

/** 待审核评论数量 */
async function loadPendingCount(): Promise<void> {
  if (!showCommentCount.value) {
    pendingCount.value = 0
    return
  }
  try {
    pendingCount.value = await fetchPendingCommentCount()
  } catch {
    pendingCount.value = 0
  }
}

function toggle(): void {
  open.value = !open.value
  if (open.value) {
    void loadPendingCount()
  }
}

function go(name: string): void {
  open.value = false
  void router.push({ name })
}

onMounted(async () => {
  await ensureUserLoaded()
  await loadPendingCount()
})

watch(
  () => account.user?.role,
  () => {
    void loadPendingCount()
  },
)

// 页面切换（例如刚审核完评论）后刷新待审核数量
watch(
  () => route.fullPath,
  () => {
    if (showCommentCount.value) {
      void loadPendingCount()
    }
  },
)
</script>

<template>
  <div v-if="visible" class="admin-panel">
    <!-- 左侧触发按钮 -->
    <button
      type="button"
      class="admin-panel__trigger"
      :class="{ 'admin-panel__trigger--open': open }"
      title="快捷管理"
      @click="toggle"
    >
      <svg viewBox="0 0 1024 1024" aria-hidden="true">
        <path
          fill="currentColor"
          d="M512 64 96 320v448h128V384h576v384h128V320L512 64zM384 832h256v-256H384v256z"
        />
      </svg>
      <span>管理</span>
    </button>

    <!-- 左弹窗面板 -->
    <transition name="admin-panel-fade">
      <nav v-if="open" class="admin-panel__drawer">
        <div class="admin-panel__header">
          <span>快捷管理</span>
          <button type="button" class="admin-panel__close" title="收起" @click="open = false">×</button>
        </div>

        <!-- ① 返回博客管理系统 -->
        <button type="button" class="admin-panel__item" @click="go('dashboard')">
          <svg class="admin-panel__icon" viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              fill="currentColor"
              d="M512 64 96 320v448h128V384h576v384h128V320L512 64zM384 832h256v-256H384v256z"
            />
          </svg>
          <span class="admin-panel__text">JAVA博客网站</span>
        </button>

        <!-- ② 评论：气泡图标 + 未审核通过数量 -->
        <button type="button" class="admin-panel__item" @click="go('comment-list')">
          <svg class="admin-panel__icon" viewBox="0 0 1024 1024" aria-hidden="true">
            <path
              fill="currentColor"
              d="M512 96C273 96 80 254 80 448c0 112 57 212 148 280v152l136-76c47 13 97 20 148 20 239 0 432-158 432-352S751 96 512 96zm0 64c204 0 368 129 368 288S716 736 512 736c-46 0-91-7-132-19l-24-8-88 49v-98l-27-20C165 575 144 517 144 448c0-159 164-288 368-288z"
            />
          </svg>
          <span class="admin-panel__text">评论</span>
          <span
            v-if="showCommentCount"
            class="admin-panel__count"
            :class="{ 'admin-panel__count--zero': pendingCount === 0 }"
          >
            {{ pendingCount }}
          </span>
        </button>

        <!-- ③ 写文章：加号图标（订阅者不显示） -->
        <button v-if="showWriteArticle" type="button" class="admin-panel__item" @click="go('article-create')">
          <svg class="admin-panel__icon" viewBox="0 0 1024 1024" aria-hidden="true">
            <path fill="currentColor" d="M474 128h76v346h346v76H550v346h-76V550H128v-76h346z" />
          </svg>
          <span class="admin-panel__text">写文章</span>
        </button>
      </nav>
    </transition>
  </div>
</template>

<style scoped>
.admin-panel__trigger {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 110;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 1px solid rgba(228, 231, 237, 0.9);
  border-left: none;
  border-radius: 0 10px 10px 0;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  color: #606266;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.admin-panel__trigger:hover,
.admin-panel__trigger--open {
  color: var(--blog-primary-color, #409eff);
  background-color: rgba(255, 255, 255, 0.95);
}

.admin-panel__trigger svg {
  width: 18px;
  height: 18px;
}

.admin-panel__trigger span {
  writing-mode: vertical-rl;
  letter-spacing: 2px;
}

.admin-panel__drawer {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 111;
  width: 232px;
  padding: 12px;
  border: 1px solid rgba(228, 231, 237, 0.9);
  border-left: none;
  border-radius: 0 12px 12px 0;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.admin-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px 10px;
  color: #909399;
  font-size: 12px;
}

.admin-panel__close {
  border: none;
  background: transparent;
  color: #909399;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.admin-panel__close:hover {
  color: var(--blog-primary-color, #409eff);
}

.admin-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 6px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  color: #303133;
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.admin-panel__item:last-child {
  margin-bottom: 0;
}

.admin-panel__item:hover {
  background-color: color-mix(in srgb, var(--blog-primary-color, #409eff) 12%, transparent);
  color: var(--blog-primary-color, #409eff);
}

.admin-panel__icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  color: var(--blog-primary-color, #409eff);
}

.admin-panel__text {
  flex: 1;
  min-width: 0;
}

.admin-panel__count {
  min-width: 22px;
  padding: 0 6px;
  border-radius: 10px;
  background-color: #f56c6c;
  color: #ffffff;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

.admin-panel__count--zero {
  background-color: #dcdfe6;
  color: #909399;
}

.admin-panel-fade-enter-active,
.admin-panel-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.admin-panel-fade-enter-from,
.admin-panel-fade-leave-to {
  opacity: 0;
  transform: translate(-12px, -50%);
}
</style>
