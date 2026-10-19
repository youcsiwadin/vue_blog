<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { deleteMoment, fetchMomentPage } from '@/api/moment'
import { useRefreshSignal } from '@/composables/useRefresh'
import { useUserStore } from '@/stores/user'
import type { Moment } from '@/types/api'

const router = useRouter()
const { state: account } = useUserStore()
const refreshTick = useRefreshSignal()

const loading = ref(false)
const moments = ref<Moment[]>([])
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 10,
})

async function loadMoments(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchMomentPage({ page: query.page, pageSize: query.pageSize })
    moments.value = data.records
    total.value = data.total
  } catch {
    moments.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function canDelete(moment: Moment): boolean {
  return account.user?.id === moment.userId
}

function handlePageChange(page: number): void {
  query.page = page
  void loadMoments()
}

function handleSizeChange(size: number): void {
  query.pageSize = size
  query.page = 1
  void loadMoments()
}

function goCreate(): void {
  void router.push({ name: 'moment-create' })
}

async function handleDelete(moment: Moment): Promise<void> {
  try {
    await ElMessageBox.confirm('确定要删除这条说说吗？', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteMoment(moment.id)
    ElMessage.success('说说已删除')
    await loadMoments()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

onMounted(() => {
  void loadMoments()
})

watch(refreshTick, () => {
  void loadMoments()
})
</script>

<template>
  <section class="page-card">
    <div class="toolbar">
      <h2 class="page-title">说说</h2>
      <el-button type="primary" @click="goCreate">发表说说</el-button>
    </div>

    <div v-loading="loading" class="moment-list">
      <el-empty v-if="!moments.length && !loading" description="还没有说说，点击「发表说说」记录一条吧" />
      <div v-for="moment in moments" :key="moment.id" class="moment-item">
        <div class="moment-item__header">
          <span class="moment-item__author">{{ moment.authorName || '匿名用户' }}</span>
          <span class="moment-item__time">{{ (moment.createTime || '').replace('T', ' ') }}</span>
        </div>
        <div class="moment-item__content">{{ moment.content }}</div>
        <div v-if="canDelete(moment)" class="moment-item__actions">
          <el-button link type="danger" @click="handleDelete(moment)">删除</el-button>
        </div>
      </div>
    </div>

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
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.moment-list {
  min-height: 60px;
}

.moment-item {
  padding: 14px 0;
  border-bottom: 1px solid #ebeef5;
}

.moment-item:last-child {
  border-bottom: none;
}

.moment-item__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.moment-item__author {
  font-weight: 600;
}

.moment-item__time {
  color: #909399;
  font-size: 12px;
}

.moment-item__content {
  margin-top: 8px;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.moment-item__actions {
  margin-top: 6px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
