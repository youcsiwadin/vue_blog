<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { fetchArticlePage } from '@/api/article'
import { fetchBlogSidebar } from '@/api/blog'
import BlogArticleList from '@/views/blog/BlogArticleList.vue'
import type { Article, BlogSidebar } from '@/types/api'

const route = useRoute()
const router = useRouter()

const sidebar = ref<BlogSidebar | null>(null)
const articles = ref<Article[]>([])
const loading = ref(false)
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryId: undefined as number | undefined,
  tagId: undefined as number | undefined,
  categoryName: '',
  tagName: '',
})

/** 从地址栏参数同步查询条件（支持导航栏搜索、分类 / 标签跳转） */
function syncFromRoute(): void {
  query.keyword = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  const categoryId = Number(route.query.categoryId)
  const tagId = Number(route.query.tagId)
  query.categoryId = Number.isFinite(categoryId) && categoryId > 0 ? categoryId : undefined
  query.tagId = Number.isFinite(tagId) && tagId > 0 ? tagId : undefined
  query.page = 1
  query.categoryName = sidebar.value?.categories.find((item) => item.id === query.categoryId)?.name ?? ''
  query.tagName = sidebar.value?.tags.find((item) => item.id === query.tagId)?.name ?? ''
}

async function loadArticles(): Promise<void> {
  loading.value = true
  try {
    const params: {
      page: number
      pageSize: number
      keyword?: string
      categoryId?: number
      tagId?: number
    } = { page: query.page, pageSize: query.pageSize }
    if (query.keyword.trim()) {
      params.keyword = query.keyword.trim()
    }
    if (query.categoryId) {
      params.categoryId = query.categoryId
    }
    if (query.tagId) {
      params.tagId = query.tagId
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

async function loadSidebar(): Promise<void> {
  try {
    sidebar.value = await fetchBlogSidebar()
  } catch {
    sidebar.value = null
  }
}

function handleSearch(): void {
  const nextQuery: Record<string, string> = {}
  if (query.keyword.trim()) {
    nextQuery.keyword = query.keyword.trim()
  }
  if (query.categoryId) {
    nextQuery.categoryId = String(query.categoryId)
  }
  if (query.tagId) {
    nextQuery.tagId = String(query.tagId)
  }
  void router.push({ name: 'blog-articles', query: nextQuery })
}

function handleReset(): void {
  query.keyword = ''
  query.categoryId = undefined
  query.tagId = undefined
  void router.push({ name: 'blog-articles' })
}

function handlePageChange(page: number): void {
  query.page = page
  void loadArticles()
}

function openArticle(id: number): void {
  void router.push({ name: 'blog-article-detail', params: { id } })
}

onMounted(async () => {
  await loadSidebar()
  syncFromRoute()
  await loadArticles()
})

// 通过导航栏搜索或分类 / 标签跳转时，地址栏参数变化后重新查询
watch(
  () => route.query,
  () => {
    if (route.name !== 'blog-articles') {
      return
    }
    syncFromRoute()
    void loadArticles()
  },
)
</script>

<template>
  <div class="blog-page">
    <div class="blog-page__head">
      <h1 class="blog-page__title">文章</h1>
      <p class="blog-page__subtitle">
        共 {{ total }} 篇已发布文章
        <template v-if="query.categoryId">· 分类：{{ query.categoryName || query.categoryId }}</template>
        <template v-if="query.tagId">· 标签：{{ query.tagName || query.tagId }}</template>
      </p>
    </div>

    <div class="blog-card blog-filter">
      <el-input
        v-model="query.keyword"
        placeholder="搜索文章标题或摘要"
        clearable
        style="width: 240px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="query.categoryId" placeholder="全部分类" clearable style="width: 160px">
        <el-option v-for="item in sidebar?.categories ?? []" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="query.tagId" placeholder="全部标签" clearable style="width: 160px">
        <el-option v-for="item in sidebar?.tags ?? []" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <BlogArticleList :articles="articles" :loading="loading" @open="openArticle" />

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
  max-width: 1120px;
  margin: 0 auto;
  padding: 88px 16px 0;
}

.blog-page__head {
  margin-bottom: 20px;
}

.blog-page__title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #303133;
}

.blog-page__subtitle {
  margin: 8px 0 0;
  color: #909399;
  font-size: 13px;
}

.blog-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 16px 18px;
  margin-bottom: 20px;
}

.blog-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
