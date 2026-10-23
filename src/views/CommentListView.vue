<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  deleteComment,
  fetchCommentAutoApprove,
  fetchCommentPage,
  fetchCommentStats,
  purgeComment,
  restoreComment,
  updateCommentAutoApprove,
  updateCommentStatus,
} from '@/api/comment'
import { useRefreshSignal } from '@/composables/useRefresh'
import { useUserStore } from '@/stores/user'
import type { Comment, CommentStats } from '@/types/api'

/** 筛选标签：全部 / 我的 / 待审 / 已批准 / 回收站 */
type FilterKey = 'all' | 'mine' | 'pending' | 'approved' | 'trash'

const router = useRouter()
const refreshTick = useRefreshSignal()
const { isAdmin } = useUserStore()

const loading = ref(false)
const comments = ref<Comment[]>([])
const total = ref(0)
const activeFilter = ref<FilterKey>('all')
/** 倒计时用的当前时间与列表加载时间 */
const nowTick = ref(Date.now())
const fetchedAt = ref(Date.now())
let tickTimer: number | undefined
const stats = ref<CommentStats>({
  allCount: 0,
  mineCount: 0,
  pendingCount: 0,
  approvedCount: 0,
  trashCount: 0,
})
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: undefined as number | undefined,
})

/** 「评论自动过审」开关（仅管理员可用）：开启后新评论直接通过，无需人工审核 */
const autoApprove = ref(false)
const autoApproveLoading = ref(false)

async function loadAutoApprove(): Promise<void> {
  if (!isAdmin.value) {
    return
  }
  try {
    autoApprove.value = await fetchCommentAutoApprove()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

async function handleAutoApproveChange(value: boolean | string | number): Promise<void> {
  const enabled = value === true
  autoApproveLoading.value = true
  try {
    autoApprove.value = await updateCommentAutoApprove(enabled)
    ElMessage.success(enabled ? '已开启评论自动过审，新评论将直接展示' : '已关闭评论自动过审，新评论需人工审核')
  } catch {
    // 保存失败时回滚开关显示
    autoApprove.value = !enabled
  } finally {
    autoApproveLoading.value = false
  }
}

/** 回收站视图 */
const isTrash = computed(() => activeFilter.value === 'trash')

const filterTabs = computed(() => [
  // 非管理员（作者 / 订阅者）只能查看自己的评论
  ...(isAdmin.value
    ? [
        { key: 'all' as FilterKey, label: '全部', count: stats.value.allCount },
        { key: 'mine' as FilterKey, label: '我的', count: stats.value.mineCount },
        { key: 'pending' as FilterKey, label: '待审', count: stats.value.pendingCount },
        { key: 'approved' as FilterKey, label: '已批准', count: stats.value.approvedCount },
        { key: 'trash' as FilterKey, label: '回收站', count: stats.value.trashCount },
      ]
    : [{ key: 'mine' as FilterKey, label: '我的评论', count: stats.value.mineCount }]),
])

/** 加载筛选标签数量 */
async function loadStats(): Promise<void> {
  if (!isAdmin.value) {
    return
  }
  try {
    stats.value = await fetchCommentStats()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 加载评论列表（分页 + 搜索 + 筛选标签） */
async function loadComments(): Promise<void> {
  loading.value = true
  try {
    const params: {
      page: number
      pageSize: number
      status?: number
      keyword?: string
      deleted?: number
      mine?: boolean
    } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    const keyword = query.keyword.trim()
    if (keyword) {
      params.keyword = keyword
    }
    if (!isAdmin.value) {
      // 作者 / 订阅者：仅返回本人评论
      params.mine = true
    } else {
      switch (activeFilter.value) {
      case 'mine':
        params.mine = true
        break
      case 'pending':
        params.status = 0
        break
      case 'approved':
        params.status = 1
        break
      case 'trash':
        params.deleted = 1
        break
      default:
        // 全部：沿用状态下拉框（含已驳回）
        if (query.status !== undefined) {
          params.status = query.status
        }
        break
      }
    }
    const data = await fetchCommentPage(params)
    comments.value = data.records
    total.value = data.total
    fetchedAt.value = Date.now()
    if (!isAdmin.value) {
      // 非管理员不调用统计接口，直接用列表总数作为"我的评论"数量
      stats.value.mineCount = data.total
    }
  } catch {
    comments.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 切换筛选标签 */
function handleFilterChange(key: FilterKey): void {
  activeFilter.value = key
  query.status = undefined
  query.page = 1
  void loadComments()
}

function handleSearch(): void {
  // 使用状态下拉框搜索时回到「全部」标签
  activeFilter.value = 'all'
  query.page = 1
  void loadComments()
}

function handleReset(): void {
  query.keyword = ''
  query.status = undefined
  query.page = 1
  activeFilter.value = 'all'
  void loadComments()
}

function handlePageChange(page: number): void {
  query.page = page
  void loadComments()
}

function handleSizeChange(size: number): void {
  query.pageSize = size
  query.page = 1
  void loadComments()
}

async function handleStatus(row: Comment, status: number): Promise<void> {
  try {
    await updateCommentStatus(row.id, status)
    ElMessage.success(status === 1 ? '评论已通过' : '评论已驳回')
    await loadStats()
    await loadComments()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

async function handleDelete(row: Comment): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要删除该评论吗？删除后可在「回收站」中恢复。', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteComment(row.id)
    ElMessage.success('评论已移入回收站')
    await loadStats()
    await loadComments()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

async function handleRestore(row: Comment): Promise<void> {
  try {
    await restoreComment(row.id)
    ElMessage.success('评论已恢复（状态为待审核）')
    await loadStats()
    await loadComments()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 彻底删除：物理删除，不留记录 */
async function handlePurge(row: Comment): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定要彻底删除「${row.nickname}」的这条评论吗？彻底删除后无法恢复，也不会留下记录。`,
      '彻底删除确认',
      {
        confirmButtonText: '彻底删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }
  try {
    await purgeComment(row.id)
    ElMessage.success('评论已彻底删除')
    await loadStats()
    await loadComments()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 回收站倒计时：距离自动彻底删除的剩余时间 */
function remainingText(row: Comment): string {
  if (row.remainingSeconds === null || row.remainingSeconds === undefined) {
    return ''
  }
  const elapsed = Math.max(Math.floor((nowTick.value - fetchedAt.value) / 1000), 0)
  let seconds = Math.max(row.remainingSeconds - elapsed, 0)
  const hours = Math.floor(seconds / 3600)
  seconds -= hours * 3600
  const minutes = Math.floor(seconds / 60)
  seconds -= minutes * 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

function goArticle(articleId: number): void {
  void router.push({ name: 'article-detail', params: { id: articleId } })
}

onMounted(() => {
  // 每秒刷新回收站倒计时
  tickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  if (!isAdmin.value) {
    activeFilter.value = 'mine'
  }
  void loadStats()
  void loadComments()
  void loadAutoApprove()
})

onBeforeUnmount(() => {
  if (tickTimer) {
    window.clearInterval(tickTimer)
  }
})

watch(refreshTick, () => {
  void loadStats()
  void loadComments()
  void loadAutoApprove()
})
</script>

<template>
  <section class="page-card">
    <h2 class="page-title">{{ isAdmin ? '评论' : '我的评论' }}</h2>

    <div class="filters">
      <el-input
        v-model="query.keyword"
        placeholder="搜索评论内容、评论人或文章"
        clearable
        style="width: 260px"
        @keyup.enter="handleSearch"
      />
      <el-select v-if="isAdmin" v-model="query.status" placeholder="全部状态" clearable style="width: 150px">
        <el-option label="待审核" :value="0" />
        <el-option label="已通过" :value="1" />
        <el-option label="已驳回" :value="2" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>

      <!-- 自动过审开关：仅管理员可用，开启后新评论无需人工审核直接展示 -->
      <div v-if="isAdmin" class="comment-auto-approve">
        <el-tooltip
          content="开启后提交的评论无需人工审核，直接展示在博客文章下"
          placement="top"
        >
          <span class="comment-auto-approve__label">评论自动过审</span>
        </el-tooltip>
        <el-switch v-model="autoApprove" :loading="autoApproveLoading" @change="handleAutoApproveChange" />
        <el-tag :type="autoApprove ? 'success' : 'info'" size="small">
          {{ autoApprove ? '已开启' : '已关闭' }}
        </el-tag>
      </div>
    </div>

    <!-- 点击筛选：全部 / 我的 / 待审 / 已批准 / 回收站（含数量） -->
    <div class="comment-filters">
      <button
        v-for="item in filterTabs"
        :key="item.key"
        type="button"
        class="comment-filters__item"
        :class="{ 'comment-filters__item--active': activeFilter === item.key }"
        @click="handleFilterChange(item.key)"
      >
        <span>{{ item.label }}</span>
        <span class="comment-filters__count" :class="{ 'comment-filters__count--zero': !item.count }">
          ({{ item.count }})
        </span>
      </button>
    </div>

    <el-table
      class="comment-table"
      v-loading="loading"
      :data="comments"
      :empty-text="loading ? '加载中…' : isTrash ? '回收站是空的' : '暂无评论'"
      style="width: 100%"
    >
      <el-table-column prop="content" label="评论内容" min-width="140" show-overflow-tooltip />
      <el-table-column label="评论文章" min-width="100" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" underline="never" @click="goArticle(row.articleId)">
            {{ row.articleTitle || '（文章已删除）' }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="评论者昵称" width="100" show-overflow-tooltip />
      <el-table-column label="评论者邮箱" width="110" show-overflow-tooltip>
        <template #default="{ row }">{{ row.email || '—' }}</template>
      </el-table-column>
      <el-table-column label="登录状态" width="85" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.userId" type="success" size="small" :title="`已登录账号：${row.userName}`">
            已登录
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="评论时间" width="120" align="center">
        <template #default="{ row }">
          <span class="comment-table__time">{{ (row.createTime || '').replace('T', ' ') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="105" align="center">
        <template #default="{ row }">
          <template v-if="isTrash">
            <el-tag type="danger" size="small">已删除</el-tag>
            <div
              v-if="remainingText(row as Comment)"
              class="comment-table__countdown"
              title="回收站保留 1 天，倒计时结束后自动彻底删除"
            >
              剩 {{ remainingText(row as Comment) }}
            </div>
          </template>
          <el-tag v-else-if="row.status === 0" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="row.status === 1" type="success" size="small">已通过</el-tag>
          <el-tag v-else type="info" size="small">已驳回</el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="isAdmin" label="操作" width="140" align="right" fixed="right">
        <template #default="{ row }">
          <template v-if="isTrash">
            <el-button link type="primary" @click="handleRestore(row as Comment)">恢复</el-button>
            <el-button link type="danger" @click="handlePurge(row as Comment)">彻底删除</el-button>
          </template>
          <template v-else>
            <el-button v-if="row.status !== 1" link type="success" @click="handleStatus(row as Comment, 1)">
              通过
            </el-button>
            <el-button v-if="row.status !== 2" link type="warning" @click="handleStatus(row as Comment, 2)">
              驳回
            </el-button>
            <el-button link type="danger" @click="handleDelete(row as Comment)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
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
.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

/* 自动过审开关：靠右显示，与搜索条件区分开 */
.comment-auto-approve {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.comment-auto-approve__label {
  color: #606266;
  font-size: 14px;
  cursor: help;
}

/* 点击筛选标签 */
.comment-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background-color: #f7f9fc;
}

.comment-filters__item {
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

.comment-filters__item:hover {
  color: var(--el-color-primary);
  background-color: rgba(64, 158, 255, 0.1);
}

.comment-filters__item--active {
  color: #ffffff;
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.comment-filters__item--active:hover {
  color: #ffffff;
  background-color: var(--el-color-primary);
}

.comment-filters__count {
  font-size: 12px;
}

.comment-filters__item--active .comment-filters__count {
  color: rgba(255, 255, 255, 0.9);
}

.comment-filters__count--zero {
  opacity: 0.6;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 列已按容器宽度压缩；隐藏底部横向滚动条（仍可用触控板/Shift+滚轮横向滚动） */
.comment-table :deep(.el-scrollbar__bar.is-horizontal) {
  display: none;
}

.comment-table__time {
  color: #606266;
  font-size: 12px;
}

.comment-table__countdown {
  margin-top: 2px;
  color: #e6a23c;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}

/* 压缩操作按钮间距，保证「通过 / 驳回 / 删除」三个操作能完整显示 */
.comment-table :deep(.el-table__row .cell .el-button + .el-button) {
  margin-left: 6px;
}
</style>
