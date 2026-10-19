<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createArticle } from '@/api/article'
import { fetchDashboardSummary } from '@/api/dashboard'
import { useRefreshSignal } from '@/composables/useRefresh'
import { useUserStore } from '@/stores/user'
import type { DashboardSummary } from '@/types/api'

const router = useRouter()
const { state: account } = useUserStore()
const refreshTick = useRefreshSignal()

const loading = ref(false)
const summary = ref<DashboardSummary | null>(null)

/**
 * 左上角统计模块：文章数量排在最前（即左上角第一个），
 * 其余分类、标签、页面、评论、待审核评论、说说、用户依次排列。
 */
const statCards = computed(() => [
  { label: '文章', value: summary.value?.articleCount ?? 0, name: 'article-list' },
  { label: '分类', value: summary.value?.categoryCount ?? 0, name: 'category-list' },
  { label: '标签', value: summary.value?.tagCount ?? 0, name: 'tag-list' },
  { label: '页面', value: summary.value?.pageCount ?? 0, name: 'page-list' },
  { label: '评论', value: summary.value?.commentCount ?? 0, name: 'comment-list' },
  { label: '待审核评论', value: summary.value?.pendingCommentCount ?? 0, name: 'comment-list' },
  { label: '说说', value: summary.value?.momentCount ?? 0, name: 'moment-list' },
  { label: '用户', value: summary.value?.userCount ?? 0, name: 'user-list' },
])

/** 快速草稿表单：仅包含标题与内容 */
const draftFormRef = ref<FormInstance>()
const savingDraft = ref(false)
const draft = reactive({
  title: '',
  content: '',
})

const draftRules: FormRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { max: 200, message: '标题不能超过 200 个字符', trigger: 'blur' },
  ],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
}

/** 加载首页统计数据 */
async function loadSummary(): Promise<void> {
  loading.value = true
  try {
    summary.value = await fetchDashboardSummary()
  } catch {
    summary.value = null
  } finally {
    loading.value = false
  }
}

/** 保存快速草稿：作为一篇文章写入文章列表 */
async function handleSaveDraft(): Promise<void> {
  const valid = await draftFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  savingDraft.value = true
  try {
    await createArticle({
      title: draft.title.trim(),
      summary: '',
      content: draft.content.trim(),
      categoryId: null,
      tagIds: [],
      coverImage: '',
      status: 2,
      allowComment: true,
    })
    ElMessage.success('保存成功，已添加到「所有文章」')
    draft.title = ''
    draft.content = ''
    draftFormRef.value?.clearValidate()
    // 重新加载首页统计，最新文章中会立即出现这篇内容
    await loadSummary()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    savingDraft.value = false
  }
}

function goDetail(id: number): void {
  void router.push({ name: 'article-detail', params: { id } })
}

function goArticleList(): void {
  void router.push({ name: 'article-list' })
}

function goComments(): void {
  void router.push({ name: 'comment-list' })
}

onMounted(() => {
  void loadSummary()
})

// 顶部导航栏「刷新页面」按钮触发的刷新
watch(refreshTick, () => {
  void loadSummary()
})
</script>

<template>
  <section v-loading="loading">
    <h2 class="page-title">
      你好，{{ account.user?.nickname || account.user?.username || '管理员' }}，欢迎回来！
    </h2>

    <!-- 顶部区域：左上角统计模块组 + 右上角快速草稿 -->
    <el-row :gutter="16" class="dashboard-top">
      <el-col :xs="24" :sm="24" :md="10" class="dashboard-top__col">
        <el-row :gutter="16">
          <el-col v-for="item in statCards" :key="item.label" :xs="12" :sm="8" :md="12">
            <el-card
              shadow="hover"
              class="stat-card stat-card--compact"
              @click="router.push({ name: item.name })"
            >
              <div class="stat-card__value">{{ item.value }}</div>
              <div class="stat-card__label">{{ item.label }}</div>
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <el-col :xs="24" :sm="24" :md="14" class="dashboard-top__col">
        <el-card shadow="never" class="draft-card">
          <template #header>
            <div class="panel-card__header">
              <span>快速草稿</span>
              <span class="draft-card__tip">只需标题与内容，保存后即成为一篇文章</span>
            </div>
          </template>

          <el-form
            ref="draftFormRef"
            :model="draft"
            :rules="draftRules"
            label-position="top"
            @submit.prevent
          >
            <el-form-item label="标题" prop="title">
              <el-input
                v-model="draft.title"
                maxlength="200"
                show-word-limit
                placeholder="请输入标题"
              />
            </el-form-item>
            <el-form-item
              label="内容"
              prop="content"
              class="draft-card__field draft-card__field--content"
            >
              <el-input v-model="draft.content" type="textarea" :rows="4" placeholder="请输入内容" />
            </el-form-item>
            <el-form-item class="draft-card__actions">
              <el-button type="primary" :loading="savingDraft" @click="handleSaveDraft">保存</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-card__header">
          <span>最新文章</span>
          <el-button link type="primary" @click="goArticleList">查看全部</el-button>
        </div>
      </template>
      <el-table
        :data="summary?.recentArticles ?? []"
        :empty-text="loading ? '加载中…' : '还没有文章，试试右上角的「快速草稿」吧'"
        style="width: 100%"
      >
        <el-table-column prop="title" label="标题" min-width="220">
          <template #default="{ row }">
            <el-link type="primary" underline="never" @click="goDetail(row.id)">{{ row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="categoryName" label="分类" width="140">
          <template #default="{ row }">{{ row.categoryName || '未分类' }}</template>
        </el-table-column>
        <el-table-column prop="authorName" label="作者" width="140">
          <template #default="{ row }">{{ row.authorName || '匿名用户' }}</template>
        </el-table-column>
        <el-table-column prop="createTime" label="发布时间" width="180">
          <template #default="{ row }">{{ (row.createTime || '').replace('T', ' ') }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-card__header">
          <span>最新评论</span>
          <el-button link type="primary" @click="goComments">查看全部</el-button>
        </div>
      </template>
      <el-empty v-if="!(summary?.recentComments ?? []).length" description="暂无评论" />
      <ul v-else class="comment-list">
        <li v-for="item in summary?.recentComments ?? []" :key="item.id" class="comment-list__item">
          <div class="comment-list__meta">
            <strong>{{ item.nickname }}</strong>
            <el-tag v-if="item.status === 0" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="item.status === 1" type="success" size="small">已通过</el-tag>
            <el-tag v-else type="info" size="small">已驳回</el-tag>
            <span class="comment-list__time">{{ (item.createTime || '').replace('T', ' ') }}</span>
          </div>
          <div class="comment-list__content">{{ item.content }}</div>
          <div class="comment-list__article">评论文章：{{ item.articleTitle || '（文章已删除）' }}</div>
        </li>
      </ul>
    </el-card>
  </section>
</template>

<style scoped>
.dashboard-top {
  margin-bottom: 16px;
  /* 窄屏下统计模块组与快速草稿上下堆叠时保留间距 */
  row-gap: 16px;
}

/* 统计模块之间用行间距分隔，避免最后一行留下多余空白 */
.dashboard-top :deep(.el-row) {
  row-gap: 16px;
}

/* 左右两列拉满同一行高度，使快速草稿与左侧统计模块组长度一致 */
.dashboard-top__col {
  display: flex;
  flex-direction: column;
}

/* 左侧统计模块组随列高拉伸 */
.dashboard-top__col > :deep(.el-row) {
  flex: 1;
}

.stat-card {
  cursor: pointer;
}

/* 左上角统计模块：数值与标题紧凑排列，高度随统计模块组自动拉伸 */
.stat-card--compact {
  height: 100%;
  min-height: 76px;
}

.stat-card--compact :deep(.el-card__body) {
  height: 100%;
  padding: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-primary);
  line-height: 1.2;
}

.stat-card__label {
  margin-top: 4px;
  color: #909399;
  font-size: 13px;
}

.draft-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.draft-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.draft-card :deep(.el-form) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 「内容」输入框占据剩余空间，卡片高度由左侧统计模块组决定 */
.draft-card__field--content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.draft-card__field--content :deep(.el-form-item__content) {
  flex: 1;
}

.draft-card__field--content :deep(.el-textarea),
.draft-card__field--content :deep(.el-textarea__inner) {
  height: 100%;
}

.draft-card__field--content :deep(.el-textarea__inner) {
  resize: none;
}

.draft-card__tip {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
}

.draft-card__actions {
  margin-bottom: 0;
}

.draft-card :deep(.el-form-item) {
  margin-bottom: 14px;
}

.panel-card {
  margin-top: 0;
}

.panel-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comment-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment-list__item {
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.comment-list__item:last-child {
  border-bottom: none;
}

.comment-list__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.comment-list__time {
  color: #909399;
  font-size: 12px;
}

.comment-list__content {
  margin: 6px 0;
  color: #606266;
}

.comment-list__article {
  color: #909399;
  font-size: 12px;
}
</style>
