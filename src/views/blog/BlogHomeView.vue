<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { fetchArticlePage } from '@/api/article'
import { fetchBlogSidebar } from '@/api/blog'
import { useSiteStore } from '@/stores/site'
import BlogArticleList from '@/views/blog/BlogArticleList.vue'
import type { Article, BlogSidebar } from '@/types/api'

const router = useRouter()
const { state: site } = useSiteStore()

const sidebar = ref<BlogSidebar | null>(null)
const articles = ref<Article[]>([])
const loading = ref(false)
const total = ref(0)
const searchOpen = ref(false)
const keyword = ref('')
const query = reactive({ page: 1, pageSize: 5 })

/** 公告栏：按行拆分展示 */
const noticeLines = computed(() =>
  site.noticeBoard
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0),
)

/** 用户信息模块固定展示博主（站点主题设置中的博主名称与头像） */
const ownerName = computed(() => sidebar.value?.authorName || site.authorName || '博主')
const ownerAvatar = computed(() => sidebar.value?.authorAvatar || site.authorAvatar || '')

async function loadSidebar(): Promise<void> {
  try {
    sidebar.value = await fetchBlogSidebar()
  } catch {
    sidebar.value = null
  }
}

async function loadArticles(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchArticlePage({ page: query.page, pageSize: query.pageSize })
    articles.value = data.records
    total.value = data.total
  } catch {
    articles.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number): void {
  query.page = page
  void loadArticles()
}

function openArticle(id: number): void {
  void router.push({ name: 'blog-article-detail', params: { id } })
}

function handleSearch(): void {
  const value = keyword.value.trim()
  if (!value) {
    return
  }
  void router.push({ name: 'blog-articles', query: { keyword: value } })
}

function goCategory(id: number): void {
  void router.push({ name: 'blog-articles', query: { categoryId: String(id) } })
}

function goTag(id: number): void {
  void router.push({ name: 'blog-articles', query: { tagId: String(id) } })
}

/** 点击用户信息模块中的"文章"跳转到博主页面 */
function goAuthorPage(): void {
  void router.push({ name: 'blog-author' })
}

onMounted(() => {
  void loadSidebar()
  void loadArticles()
})
</script>

<template>
  <div class="blog-home">
    <!-- 封面：占满整个页面 -->
    <section class="blog-cover">
      <div class="blog-cover__inner">
        <h1 class="blog-cover__title">{{ site.coverTitle || '博客' }}</h1>
        <p class="blog-cover__subtitle">{{ site.coverSubtitle || '我的博客' }}</p>
        <div class="blog-cover__scroll">向下滚动查看内容</div>
      </div>
    </section>

    <!-- 内容页面 -->
    <section class="blog-content">
      <aside class="blog-sidebar">
        <!-- 模块一：公告 -->
        <div class="blog-card blog-panel">
          <h3 class="blog-panel__title">公告</h3>
          <p class="blog-panel__text">{{ site.notice || '暂无公告' }}</p>
        </div>

        <!-- 模块二：公告栏（下方带搜索按钮） -->
        <div class="blog-card blog-panel">
          <h3 class="blog-panel__title">公告栏</h3>
          <ul v-if="noticeLines.length" class="blog-notice-board">
            <li v-for="(line, index) in noticeLines" :key="index">{{ line }}</li>
          </ul>
          <p v-else class="blog-panel__text">暂无内容</p>

          <!-- 搜索按钮不受主题主色调影响：默认白底黑字 -->
          <el-button class="blog-panel__search-btn" @click="searchOpen = !searchOpen">
            搜索
          </el-button>
          <div v-if="searchOpen" class="blog-search">
            <el-input v-model="keyword" placeholder="输入关键字搜索文章" @keyup.enter="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </div>

        <!-- 模块三：作者信息（头像、名字、发布的文章 / 分类 / 标签） -->
        <div class="blog-card blog-panel blog-author">
          <el-avatar :size="56" :src="ownerAvatar || undefined" class="blog-author__avatar">
            {{ ownerName.charAt(0) }}
          </el-avatar>
          <div class="blog-author__name">{{ ownerName }}</div>

          <div class="blog-author__stats">
            <span class="blog-author__stat--link" title="查看博主页面" @click="goAuthorPage">
              <b>{{ sidebar?.articleCount ?? 0 }}</b>文章
            </span>
            <span><b>{{ sidebar?.categoryCount ?? 0 }}</b>分类</span>
            <span><b>{{ sidebar?.tagCount ?? 0 }}</b>标签</span>
          </div>

          <div class="blog-author__group">
            <div class="blog-author__label">分类</div>
            <div>
              <span
                v-for="item in sidebar?.categories ?? []"
                :key="item.id"
                class="blog-chip"
                @click="goCategory(item.id)"
              >
                {{ item.name }}
              </span>
              <span v-if="!(sidebar?.categories ?? []).length" class="blog-author__empty">暂无分类</span>
            </div>
          </div>

          <div class="blog-author__group">
            <div class="blog-author__label">标签</div>
            <div>
              <span
                v-for="item in sidebar?.tags ?? []"
                :key="item.id"
                class="blog-chip blog-chip--tag"
                @click="goTag(item.id)"
              >
                #{{ item.name }}
              </span>
              <span v-if="!(sidebar?.tags ?? []).length" class="blog-author__empty">暂无标签</span>
            </div>
          </div>
        </div>
      </aside>

      <main class="blog-main">
        <h2 class="blog-section-title">已发布的文章</h2>
        <BlogArticleList
          :articles="articles"
          :loading="loading"
          empty-text="还没有发布的文章"
          @open="openArticle"
        />
        <div class="blog-pagination">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="total"
            :current-page="query.page"
            :page-size="query.pageSize"
            @current-change="handlePageChange"
          />
        </div>
      </main>
    </section>
  </div>
</template>

<style scoped>
.blog-cover {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.blog-cover__inner {
  text-align: center;
  padding: 0 24px;
}

.blog-cover__title {
  margin: 0;
  font-size: 56px;
  letter-spacing: 6px;
  color: #303133;
  text-shadow: 0 2px 12px rgba(255, 255, 255, 0.6);
}

.blog-cover__subtitle {
  margin: 16px 0 0;
  font-size: 18px;
  letter-spacing: 3px;
  color: #606266;
}

.blog-cover__scroll {
  margin-top: 56px;
  font-size: 13px;
  color: #c0c4cc;
  animation: blog-bounce 1.8s infinite;
}

@keyframes blog-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}

.blog-content {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 16px 0;
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.blog-sidebar {
  width: 300px;
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.blog-panel {
  padding: 16px 18px;
}

.blog-panel__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--blog-primary-color, #409eff);
  padding-left: 8px;
  border-left: 3px solid var(--blog-primary-color, #409eff);
}

.blog-panel__text {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.blog-notice-board {
  margin: 0;
  padding-left: 18px;
  color: #606266;
  font-size: 13px;
  line-height: 1.9;
}

.blog-panel__search-btn {
  width: 100%;
  margin-top: 12px;
  background-color: #ffffff;
  border-color: #dcdfe6;
  color: #303133;
}

.blog-search {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.blog-author {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.blog-author__avatar {
  background-color: var(--el-color-primary);
  color: #ffffff;
  font-size: 20px;
}

.blog-author__name {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.blog-author__stats {
  display: flex;
  gap: 18px;
  margin: 12px 0 4px;
  color: #909399;
  font-size: 12px;
}

.blog-author__stats b {
  color: var(--el-color-primary);
  font-size: 15px;
  margin-right: 3px;
}

.blog-author__stat--link {
  cursor: pointer;
}

.blog-author__stat--link:hover,
.blog-author__stat--link:hover b {
  color: var(--blog-primary-color, #409eff);
}

.blog-author__group {
  width: 100%;
  margin-top: 12px;
}

.blog-author__label {
  margin-bottom: 6px;
  color: #909399;
  font-size: 12px;
}

.blog-author__empty {
  color: #c0c4cc;
  font-size: 12px;
}

.blog-main {
  flex: 1;
  min-width: 0;
}

.blog-section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  padding-left: 10px;
  border-left: 4px solid var(--el-color-primary);
}

.blog-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .blog-content {
    flex-direction: column;
  }

  .blog-sidebar {
    width: 100%;
    flex: 1 1 auto;
  }
}
</style>
