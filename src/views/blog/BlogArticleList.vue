<script setup lang="ts">
import type { Article } from '@/types/api'

defineProps<{
  articles: Article[]
  loading?: boolean
  emptyText?: string
}>()

const emit = defineEmits<{
  (event: 'open', id: number): void
}>()

function formatTime(value: string): string {
  return (value || '').replace('T', ' ')
}
</script>

<template>
  <div v-loading="loading" class="blog-article-list">
    <p v-if="!articles.length && !loading" class="blog-article-list__empty">
      {{ emptyText || '暂无文章' }}
    </p>

    <article
      v-for="item in articles"
      :key="item.id"
      class="blog-card blog-article-item"
      :class="{ 'blog-article-item--with-cover': !!item.coverImage }"
      @click="emit('open', item.id)"
    >
      <!-- 有封面：标题等文字直接叠在封面之中，不额外占用区域 -->
      <div v-if="item.coverImage" class="blog-article-item__cover">
        <img class="blog-article-item__cover-img" :src="item.coverImage" :alt="item.title" />
        <div class="blog-article-item__overlay">
          <h3 class="blog-article-item__title">{{ item.title }}</h3>
          <div class="blog-article-item__meta">
            <span>{{ formatTime(item.createTime) }}</span>
            <span>浏览 {{ item.viewCount }}</span>
            <span>点赞 {{ item.likeCount }}</span>
            <span>字数 {{ item.wordCount ?? 0 }}</span>
          </div>
          <p v-if="item.summary" class="blog-article-item__summary">{{ item.summary }}</p>
          <div v-if="(item.tags ?? []).length" class="blog-article-item__tags">
            <span v-for="tag in item.tags" :key="tag.id" class="blog-chip blog-chip--tag">#{{ tag.name }}</span>
          </div>
        </div>
      </div>

      <!-- 无封面：保留原有文字排版 -->
      <template v-else>
        <h3 class="blog-article-item__title">{{ item.title }}</h3>
        <div class="blog-article-item__meta">
          <span>{{ formatTime(item.createTime) }}</span>
          <span>浏览 {{ item.viewCount }}</span>
          <span>点赞 {{ item.likeCount }}</span>
          <span>字数 {{ item.wordCount ?? 0 }}</span>
        </div>
        <p v-if="item.summary" class="blog-article-item__summary">{{ item.summary }}</p>
        <div v-if="(item.tags ?? []).length" class="blog-article-item__tags">
          <span v-for="tag in item.tags" :key="tag.id" class="blog-chip blog-chip--tag">#{{ tag.name }}</span>
        </div>
      </template>
    </article>
  </div>
</template>

<style scoped>
.blog-article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 80px;
}

.blog-article-list__empty {
  margin: 0;
  padding: 40px 0;
  text-align: center;
  color: #909399;
}

.blog-article-item {
  padding: 18px 20px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

/* 有封面时由封面铺满整个模块，不再额外留出文字区域 */
.blog-article-item--with-cover {
  padding: 0;
  overflow: hidden;
}

/* 封面：填满模块，图片居中裁切并降到 60% 透明度 */
.blog-article-item__cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 220px;
  overflow: hidden;
  background-color: #f7f9fc;
}

.blog-article-item__cover-img {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.5;
}

.blog-article-item__overlay {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 16px 22px;
  text-align: center;
}

.blog-article-item__overlay .blog-article-item__meta {
  justify-content: center;
  color: #606266;
}

.blog-article-item__overlay .blog-article-item__summary {
  max-height: 44px;
  overflow: hidden;
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.8);
}

.blog-article-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
}

.blog-article-item__title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  text-shadow: 0 1px 8px rgba(255, 255, 255, 0.85);
}

.blog-article-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #909399;
  font-size: 13px;
}

.blog-article-item__summary {
  margin: 10px 0 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}

.blog-article-item__tags {
  margin-top: 10px;
}

@media (max-width: 900px) {
  .blog-article-item__cover {
    height: 180px;
  }
}
</style>
