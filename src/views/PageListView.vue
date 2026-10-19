<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { deletePage, fetchPageList } from '@/api/page'
import { useRefreshSignal } from '@/composables/useRefresh'
import type { PageItem } from '@/types/api'

const router = useRouter()
const refreshTick = useRefreshSignal()

const loading = ref(false)
const pages = ref<PageItem[]>([])
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: undefined as number | undefined,
})

async function loadPages(): Promise<void> {
  loading.value = true
  try {
    const keyword = query.keyword.trim()
    const params: { page: number; pageSize: number; keyword?: string; status?: number } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    if (keyword) {
      params.keyword = keyword
    }
    if (query.status !== undefined) {
      params.status = query.status
    }
    const data = await fetchPageList(params)
    pages.value = data.records
    total.value = data.total
  } catch {
    pages.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  query.page = 1
  void loadPages()
}

function handleReset(): void {
  query.keyword = ''
  query.status = undefined
  query.page = 1
  void loadPages()
}

function handlePageChange(page: number): void {
  query.page = page
  void loadPages()
}

function handleSizeChange(size: number): void {
  query.pageSize = size
  query.page = 1
  void loadPages()
}

function goCreate(): void {
  void router.push({ name: 'page-create' })
}

function goEdit(row: PageItem): void {
  void router.push({ name: 'page-edit', params: { id: row.id } })
}

async function handleDelete(row: PageItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除页面「${row.title}」吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deletePage(row.id)
    ElMessage.success('页面已删除')
    await loadPages()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

onMounted(() => {
  void loadPages()
})

watch(refreshTick, () => {
  void loadPages()
})
</script>

<template>
  <section class="page-card">
    <div class="toolbar">
      <h2 class="page-title">所有页面</h2>
      <el-button type="primary" @click="goCreate">添加页面</el-button>
    </div>

    <div class="filters">
      <el-input
        v-model="query.keyword"
        placeholder="搜索页面标题或别名"
        clearable
        style="width: 220px"
        @keyup.enter="handleSearch"
      />
      <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
        <el-option label="已发布" :value="1" />
        <el-option label="草稿" :value="0" />
      </el-select>
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="pages"
      :empty-text="loading ? '加载中…' : '暂无页面'"
      style="width: 100%"
    >
      <el-table-column prop="title" label="标题" min-width="220" />
      <el-table-column label="别名" width="180">
        <template #default="{ row }">{{ row.slug || '—' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.status === 1" type="success" size="small">已发布</el-tag>
          <el-tag v-else type="info" size="small">草稿</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180">
        <template #default="{ row }">{{ (row.createTime || '').replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row as PageItem)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row as PageItem)">删除</el-button>
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
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
