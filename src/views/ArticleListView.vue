<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  deleteArticle,
  fetchAdminArticlePage,
  fetchArticleStats,
  updateArticleStatus,
} from '@/api/article'
import { fetchCategories } from '@/api/category'
import { fetchTags } from '@/api/tag'
import { useRefreshSignal } from '@/composables/useRefresh'
import { useUserStore } from '@/stores/user'
import type { Article, ArticleStats, Category, Tag } from '@/types/api'

/** 文章状态筛选：全部 / 已发布 / 待审核 / 草稿 */
type FilterKey = 'all' | 'published' | 'pending' | 'draft'

const router = useRouter()
const { state, isLoggedIn, isAdmin } = useUserStore()
const refreshTick = useRefreshSignal()

const loading = ref(false)
const articles = ref<Article[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const total = ref(0)
const activeFilter = ref<FilterKey>('all')
const stats = ref<ArticleStats>({
  allCount: 0,
  publishedCount: 0,
  pendingCount: 0,
  draftCount: 0,
})
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  categoryId: undefined as number | undefined,
  tagId: undefined as number | undefined,
})

const filterTabs = computed(() => [
  { key: 'all' as FilterKey, label: '全部', count: stats.value.allCount },
  { key: 'published' as FilterKey, label: '已发布', count: stats.value.publishedCount },
  { key: 'pending' as FilterKey, label: '待审核', count: stats.value.pendingCount },
  { key: 'draft' as FilterKey, label: '草稿', count: stats.value.draftCount },
])

/** 当前筛选对应的文章状态值 */
const statusOfFilter = computed(() => {
  switch (activeFilter.value) {
    case 'published':
      return 2
    case 'pending':
      return 1
    case 'draft':
      return 0
    default:
      return undefined
  }
})

async function loadStats(): Promise<void> {
  try {
    stats.value = await fetchArticleStats()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 加载文章列表（含草稿 / 待审核） */
async function loadArticles(): Promise<void> {
  loading.value = true
  try {
    const keyword = query.keyword.trim()
    const params: {
      page: number
      pageSize: number
      keyword?: string
      status?: number
      categoryId?: number
      tagId?: number
    } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    if (keyword) {
      params.keyword = keyword
    }
    if (statusOfFilter.value !== undefined) {
      params.status = statusOfFilter.value
    }
    if (query.categoryId) {
      params.categoryId = query.categoryId
    }
    if (query.tagId) {
      params.tagId = query.tagId
    }
    const data = await fetchAdminArticlePage(params)
    articles.value = data.records
    total.value = data.total
  } catch {
    articles.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 加载分类与标签，用于筛选下拉框 */
async function loadOptions(): Promise<void> {
  try {
    categories.value = await fetchCategories()
  } catch {
    categories.value = []
  }
  try {
    tags.value = await fetchTags()
  } catch {
    tags.value = []
  }
}

function isOwnArticle(article: Article): boolean {
  return isLoggedIn.value && state.user?.id === article.userId
}

function handleFilterChange(key: FilterKey): void {
  activeFilter.value = key
  query.page = 1
  void loadArticles()
}

function handleSearch(): void {
  query.page = 1
  void loadArticles()
}

function handleReset(): void {
  query.keyword = ''
  query.categoryId = undefined
  query.tagId = undefined
  query.page = 1
  activeFilter.value = 'all'
  void loadArticles()
}

function handlePageChange(page: number): void {
  query.page = page
  void loadArticles()
}

function handleSizeChange(size: number): void {
  query.pageSize = size
  query.page = 1
  void loadArticles()
}

function goCreate(): void {
  void router.push({ name: 'article-create' })
}

function goDetail(article: Article): void {
  void router.push({ name: 'article-detail', params: { id: article.id } })
}

function goEdit(article: Article): void {
  void router.push({ name: 'article-edit', params: { id: article.id } })
}

async function handleDelete(article: Article): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除文章《${article.title}》吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteArticle(article.id)
    ElMessage.success('文章已删除')
    if (articles.value.length === 1 && query.page > 1) {
      query.page -= 1
    }
    await loadStats()
    await loadArticles()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 管理员：审核通过（发布到博客） */
async function handleApprove(article: Article): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要通过《${article.title}》的审核并发布到博客吗？`, '审核确认', {
      confirmButtonText: '通过审核',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await updateArticleStatus(article.id, 2)
    ElMessage.success('审核通过，文章已发布到博客')
    await loadStats()
    await loadArticles()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 管理员：退回为草稿 */
async function handleReject(article: Article): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要把《${article.title}》退回为草稿吗？`, '退回确认', {
      confirmButtonText: '退回草稿',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await updateArticleStatus(article.id, 0)
    ElMessage.success('已退回为草稿')
    await loadStats()
    await loadArticles()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

onMounted(() => {
  void loadOptions()
  void loadStats()
  void loadArticles()
})

watch(refreshTick, () => {
  void loadOptions()
  void loadStats()
  void loadArticles()
})
</script>

<template>
  <section class="page-card">
    <div class="article-list__toolbar">
      <!-- 管理员：全部作者的文章；其他账号：仅本人文章 -->
      <h2 class="page-title">{{ isAdmin ? '所有文章' : '我的文章' }}</h2>
      <el-button type="primary" @click="goCreate">写文章</el-button>
    </div>

    <div class="article-list__filters">
      <el-input
        v-model="query.keyword"
        placeholder="搜索标题或摘要"
        clearable
        style="width: 220px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="query.categoryId" placeholder="全部分类" clearable style="width: 150px">
        <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="query.tagId" placeholder="全部标签" clearable style="width: 150px">
        <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <!-- 点击筛选：全部 / 已发布 / 待审核 / 草稿（含数量） -->
    <div class="article-filters">
      <button
        v-for="item in filterTabs"
        :key="item.key"
        type="button"
        class="article-filters__item"
        :class="{ 'article-filters__item--active': activeFilter === item.key }"
        @click="handleFilterChange(item.key)"
      >
        <span>{{ item.label }}</span>
        <span class="article-filters__count" :class="{ 'article-filters__count--zero': !item.count }">
          ({{ item.count }})
        </span>
      </button>
    </div>

    <el-table
      v-loading="loading"
      :data="articles"
      :empty-text="loading ? '加载中…' : '暂无文章'"
      style="width: 100%"
    >
      <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" underline="never" @click="goDetail(row as Article)">
            {{ row.title }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="85" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status === 2" type="success" size="small">已发布</el-tag>
          <el-tag v-else-if="row.status === 1" type="warning" size="small">待审核</el-tag>
          <el-tag v-else type="info" size="small">草稿</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分类" width="100" show-overflow-tooltip>
        <template #default="{ row }">{{ row.categoryName || '未分类' }}</template>
      </el-table-column>
      <el-table-column label="标签" width="110">
        <template #default="{ row }">
          <el-tag v-for="tag in row.tags" :key="tag.id" size="small" class="article-list__tag">
            {{ tag.name }}
          </el-tag>
          <span v-if="!(row.tags ?? []).length">—</span>
        </template>
      </el-table-column>
      <!-- 非管理员只看得到自己的文章，作者列没有意义，直接隐藏 -->
      <el-table-column v-if="isAdmin" prop="authorName" label="作者" width="90" show-overflow-tooltip>
        <template #default="{ row }">{{ row.authorName || '匿名用户' }}</template>
      </el-table-column>
      <el-table-column prop="viewCount" label="浏览量" width="70" align="center" />
      <el-table-column prop="createTime" label="发布时间" width="140" align="center">
        <template #default="{ row }">
          <span class="article-list__time">{{ (row.createTime || '').replace('T', ' ') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" align="right" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row as Article)">查看</el-button>
          <template v-if="isAdmin && row.status === 1">
            <el-button link type="success" @click="handleApprove(row as Article)">通过审核</el-button>
            <el-button link type="warning" @click="handleReject(row as Article)">退回</el-button>
          </template>
          <template v-if="isOwnArticle(row as Article)">
            <el-button link type="primary" @click="goEdit(row as Article)">编辑</el-button>
          </template>
          <!-- 管理员可删除所有文章；作者只能删除自己的文章 -->
          <el-button
            v-if="isAdmin || isOwnArticle(row as Article)"
            link
            type="danger"
            @click="handleDelete(row as Article)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="article-list__pagination">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="query.page"
        :page-size="query.pageSize"
        :page-sizes="[10, 20, 50]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </section>
</template>

<style scoped>
.article-list__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.article-list__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

/* 点击筛选标签 */
.article-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: #f7f9fc;
}

.article-filters__item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background-color: transparent;
  color: #606266;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
}

.article-filters__item:hover {
  color: var(--el-color-primary);
  background-color: rgba(64, 158, 255, 0.1);
}

.article-filters__item--active {
  color: #ffffff;
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.article-filters__item--active:hover {
  color: #ffffff;
  background-color: var(--el-color-primary);
}

.article-filters__count {
  font-size: 12px;
}

.article-filters__item--active .article-filters__count {
  color: rgba(255, 255, 255, 0.9);
}

.article-filters__count--zero {
  opacity: 0.6;
}

.article-list__tag {
  margin-right: 4px;
}

.article-list__time {
  color: #606266;
  font-size: 12px;
}

.article-list__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
