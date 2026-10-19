<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useNotificationStore } from '@/stores/notification'
import type { LikeAggregatedItem } from '@/types/notification'

type MessageSection = 'center' | 'likes'

const router = useRouter()
const notificationStore = useNotificationStore()

/** 进入页面默认停留在消息中心 */
const activeSection = ref<MessageSection>('center')
const likesLoading = ref(false)

const unreadLikeCount = computed(() => notificationStore.unreadLikeCount)
const likeItems = computed(() => notificationStore.aggregated)
const sectionTitle = computed(() =>
  activeSection.value === 'likes' ? '收到的赞' : '消息中心',
)

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value || ''
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function senderInitial(item: LikeAggregatedItem): string {
  return (item.latestSenderName || '某').charAt(0)
}

function openCenter(): void {
  activeSection.value = 'center'
}

/**
 * 进入点赞列表：
 * 1. 先取当前未读明细，保证列表有内容；
 * 2. 再清除当前作者全部未读点赞数；
 * 3. 明细快照保留在 store 中，右侧列表不会因为清零立刻变空。
 */
async function openLikes(): Promise<void> {
  activeSection.value = 'likes'
  likesLoading.value = true
  try {
    await notificationStore.fetchDetails()
    await notificationStore.markLikesRead()
  } catch {
    // 请求错误已由 Axios 拦截器统一提示
  } finally {
    likesLoading.value = false
  }
}

function openArticle(item: LikeAggregatedItem): void {
  void router.push({
    name: 'blog-article-detail',
    params: { id: item.articleId },
  })
}

onMounted(() => {
  void notificationStore.fetchUnreadCounts().catch(() => {
    // 请求错误已由 Axios 拦截器统一提示
  })
})
</script>

<template>
  <div class="message-page">
    <div class="message-layout">
      <!-- 左侧导航 -->
      <aside class="message-nav">
        <div class="message-nav__title">消息中心</div>
        <nav class="message-nav__list">
          <button
            type="button"
            class="message-nav__item"
            :class="{ 'is-active': activeSection === 'center' }"
            @click="openCenter"
          >
            <span class="message-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 1024 1024">
                <path
                  fill="currentColor"
                  d="M128 224h768v576H128V224zm64 64v64l320 224 320-224v-64H192zm0 138v310h640V426L512 582 192 426z"
                />
              </svg>
            </span>
            <span class="message-nav__label">消息中心</span>
          </button>

          <button
            type="button"
            class="message-nav__item"
            :class="{ 'is-active': activeSection === 'likes' }"
            @click="openLikes"
          >
            <span class="message-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 1024 1024">
                <path
                  fill="currentColor"
                  d="M512 896 192 608C64 480 64 288 192 192c96-80 224-64 320 48 96-112 224-128 320-48 128 96 128 288 0 416L512 896z"
                />
              </svg>
            </span>
            <span class="message-nav__label">收到的赞</span>
            <span v-if="unreadLikeCount > 0" class="message-nav__count">
              {{ unreadLikeCount > 99 ? '99+' : unreadLikeCount }}
            </span>
          </button>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <section class="message-content">
        <header class="message-content__title">
          <div>
            <h2>{{ sectionTitle }}</h2>
            <p v-if="activeSection === 'likes' && likeItems.length">
              共 {{ likeItems.length }} 篇文章收到了点赞
            </p>
          </div>
        </header>

        <div class="message-content__box">
          <!-- 消息中心：默认空白 -->
          <div v-if="activeSection === 'center'" class="message-blank" />

          <!-- 收到的赞：按文章聚合的点赞列表 -->
          <div v-else v-loading="likesLoading" class="like-list">
            <el-empty
              v-if="!likeItems.length && !likesLoading"
              description="暂无点赞通知"
            />

            <button
              v-for="item in likeItems"
              :key="item.articleId"
              type="button"
              class="like-item"
              @click="openArticle(item)"
            >
              <el-avatar
                :size="44"
                :src="item.latestSenderAvatar || undefined"
                class="like-item__avatar"
              >
                {{ senderInitial(item) }}
              </el-avatar>

              <span class="like-item__body">
                <span class="like-item__text">
                  <strong>{{ item.latestSenderName }}</strong>等共计<strong>{{ item.totalCount }}</strong>人点赞了我的<strong class="like-item__article">《{{ item.articleTitle }}》</strong>
                </span>
                <span class="like-item__time">{{ formatTime(item.latestTime) }}</span>
              </span>

              <span class="like-item__arrow" aria-hidden="true">›</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.message-page {
  min-height: calc(100vh - 60px);
  margin: -24px -16px -48px;
  padding: 28px 20px 48px;
  background:
    radial-gradient(circle at 12% 12%, rgba(64, 158, 255, 0.16), transparent 30%),
    radial-gradient(circle at 88% 8%, rgba(103, 194, 58, 0.1), transparent 28%),
    linear-gradient(135deg, #eef4ff 0%, #f8fafc 48%, #eef8f4 100%);
}

.message-layout {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  max-width: 1120px;
  min-height: calc(100vh - 136px);
  margin: 0 auto;
}

.message-nav {
  flex: 0 0 210px;
  width: 210px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 8px 28px rgba(31, 45, 61, 0.08);
  backdrop-filter: blur(10px);
}

.message-nav__title {
  padding: 8px 10px 16px;
  color: #303133;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.message-nav__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-nav__item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #606266;
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.message-nav__item:hover {
  background-color: #f2f6fc;
  color: #409eff;
}

.message-nav__item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}

.message-nav__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.message-nav__icon svg {
  width: 17px;
  height: 17px;
}

.message-nav__label {
  flex: 1;
  min-width: 0;
}

.message-nav__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background-color: #f56c6c;
  color: #ffffff;
  font-size: 11px;
  line-height: 1;
}

.message-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: calc(100vh - 136px);
}

.message-content__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 78px;
  padding: 16px 24px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 28px rgba(31, 45, 61, 0.07);
  backdrop-filter: blur(10px);
}

.message-content__title h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 700;
}

.message-content__title p {
  margin: 4px 0 0;
  color: #909399;
  font-size: 12px;
}

.message-content__box {
  flex: 1;
  min-height: 420px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 28px rgba(31, 45, 61, 0.07);
  backdrop-filter: blur(10px);
}

/* 消息中心默认空白显示 */
.message-blank {
  min-height: 380px;
}

.like-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 160px;
}

.like-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: 1px solid #ebeef5;
  border-radius: 11px;
  background-color: #ffffff;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.like-item:hover {
  border-color: #b3d8ff;
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

.like-item__avatar {
  flex: 0 0 auto;
  background: linear-gradient(135deg, #409eff, #79bbff);
  color: #ffffff;
  font-size: 15px;
}

.like-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.like-item__text {
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.like-item__text strong {
  color: #303133;
  font-weight: 600;
}

.like-item__article {
  color: #409eff;
}

.like-item__time {
  color: #a8abb2;
  font-size: 12px;
}

.like-item__arrow {
  flex: 0 0 auto;
  color: #c0c4cc;
  font-size: 26px;
  line-height: 1;
}

@media (max-width: 760px) {
  .message-page {
    padding: 16px 12px 32px;
  }

  .message-layout {
    flex-direction: column;
    min-height: auto;
  }

  .message-nav {
    width: 100%;
    flex: 0 0 auto;
  }

  .message-content {
    width: 100%;
    min-height: 480px;
  }
}
</style>
