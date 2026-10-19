<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { fetchArticlePage } from '@/api/article'
import { fetchBlogAuthor, fetchBlogSidebar } from '@/api/blog'
import { useSiteStore } from '@/stores/site'
import BlogArticleList from '@/views/blog/BlogArticleList.vue'
import type { Article, BlogAuthor, BlogSidebar } from '@/types/api'

const route = useRoute()
const router = useRouter()
const { state: site } = useSiteStore()

const sidebar = ref<BlogSidebar | null>(null)
const author = ref<BlogAuthor | null>(null)
const articles = ref<Article[]>([])
const loading = ref(false)
const total = ref(0)
const query = reactive({ page: 1, pageSize: 6 })

/** 有 id 表示查看指定作者，无 id 表示博主页面 */
const authorId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
})

const authorName = computed(
  () => author.value?.name || sidebar.value?.authorName || site.authorName || '博主',
)
const authorAvatar = computed(
  () => author.value?.avatar || sidebar.value?.authorAvatar || site.authorAvatar || '',
)
const authorArticleCount = computed(
  () => author.value?.articleCount ?? sidebar.value?.articleCount ?? 0,
)

async function loadAuthor(): Promise<void> {
  if (authorId.value !== null) {
    try {
      author.value = await fetchBlogAuthor(authorId.value)
    } catch {
      author.value = null
    }
    return
  }
  author.value = null
  try {
    sidebar.value = await fetchBlogSidebar()
  } catch {
    sidebar.value = null
  }
}

async function loadArticles(): Promise<void> {
  loading.value = true
  try {
    const params: { page: number; pageSize: number; authorId?: number } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    if (authorId.value !== null) {
      params.authorId = authorId.value
    }
    const data = await fetchArticlePage(params)
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

async function loadAll(): Promise<void> {
  query.page = 1
  await loadAuthor()
  await loadArticles()
}

onMounted(() => {
  void loadAll()
})

watch(authorId, () => {
  void loadAll()
})
</script>

<template>
  <div class="blog-page">
    <!-- 页面上方：作者头像与名字 -->
    <div class="blog-card author-head">
      <el-avatar :size="80" :src="authorAvatar || undefined" class="author-head__avatar">
        {{ authorName.charAt(0) }}
      </el-avatar>
      <h1 class="author-head__name">{{ authorName }}</h1>
      <p v-if="site.siteDescription && authorId === null" class="author-head__desc">
        {{ site.siteDescription }}
      </p>
      <div class="author-head__stats">
        <span><b>{{ authorArticleCount }}</b> 篇文章</span>
        <template v-if="authorId === null">
          <span><b>{{ sidebar?.categoryCount ?? 0 }}</b> 个分类</span>
          <span><b>{{ sidebar?.tagCount ?? 0 }}</b> 个标签</span>
        </template>
      </div>
    </div>

    <!-- 下方：该作者发布的文章 -->
    <h2 class="blog-section-title">{{ authorName }} 发布的文章</h2>
    <BlogArticleList
      :articles="articles"
      :loading="loading"
      empty-text="还没有发布的文章"
      @open="openArticle"
    />

    <div class="blog-pagination">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="total"
        :current-page="query.page"
        :page-size="query.pageSize"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.blog-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 88px 16px 0;
}

.author-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px;
  margin-bottom: 24px;
}

.author-head__avatar {
  background-color: var(--blog-primary-color, #409eff);
  color: #ffffff;
  font-size: 26px;
}

.author-head__name {
  margin: 14px 0 0;
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.author-head__desc {
  margin: 8px 0 0;
  color: #909399;
  font-size: 13px;
}

.author-head__stats {
  display: flex;
  gap: 22px;
  margin-top: 16px;
  color: #909399;
  font-size: 13px;
}

.author-head__stats b {
  color: var(--blog-primary-color, #409eff);
  font-size: 16px;
  margin-right: 4px;
}

.blog-section-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  padding-left: 10px;
  border-left: 4px solid var(--blog-primary-color, #409eff);
}

.blog-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
