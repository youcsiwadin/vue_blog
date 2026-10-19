<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { deleteUser, fetchUserPage, updateUserRole, updateUserStatus } from '@/api/user'
import { useRefreshSignal } from '@/composables/useRefresh'
import { useUserStore } from '@/stores/user'
import { ROLE_ADMIN, ROLE_AUTHOR, ROLE_GUEST, ROLE_SUBSCRIBER, roleLabel } from '@/utils/role'
import type { UserInfo } from '@/types/api'

const router = useRouter()
const { state: account } = useUserStore()
const refreshTick = useRefreshSignal()

const loading = ref(false)
const users = ref<UserInfo[]>([])
const total = ref(0)
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
})

/** 四个用户角色 */
const roleOptions = [
  { value: ROLE_ADMIN, label: '管理员', tip: '最高权限，可使用所有功能，包括删除其他用户账号' },
  { value: ROLE_AUTHOR, label: '作者', tip: '文章（所有文章 / 写文章）、我的评论、个人资料' },
  { value: ROLE_SUBSCRIBER, label: '订阅者', tip: '我的评论、个人资料' },
  { value: ROLE_GUEST, label: '游客', tip: '仅可访问博客并发表评论' },
]

async function loadUsers(): Promise<void> {
  loading.value = true
  try {
    const keyword = query.keyword.trim()
    const params: { page: number; pageSize: number; keyword?: string } = {
      page: query.page,
      pageSize: query.pageSize,
    }
    if (keyword) {
      params.keyword = keyword
    }
    const data = await fetchUserPage(params)
    users.value = data.records
    total.value = data.total
  } catch {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  query.page = 1
  void loadUsers()
}

function handleReset(): void {
  query.keyword = ''
  query.page = 1
  void loadUsers()
}

function handlePageChange(page: number): void {
  query.page = page
  void loadUsers()
}

function handleSizeChange(size: number): void {
  query.pageSize = size
  query.page = 1
  void loadUsers()
}

function goCreate(): void {
  void router.push({ name: 'user-create' })
}

/** 修改用户权限（角色） */
async function handleRoleChange(row: UserInfo, role: number): Promise<void> {
  if (role === row.role) {
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要把用户「${row.username}」的权限改为「${roleLabel(role)}」吗？`,
      '权限修改确认',
      { confirmButtonText: '确定修改', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await updateUserRole(row.id, role)
    ElMessage.success('用户权限已更新')
    await loadUsers()
  } catch {
    // 错误提示已在响应拦截器中统一处理
    await loadUsers()
  }
}

/** 启用 / 禁用账号 */
async function handleStatus(row: UserInfo): Promise<void> {
  const targetStatus = row.status === 1 ? 0 : 1
  const actionText = targetStatus === 1 ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${actionText}用户「${row.username}」吗？`, '操作确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await updateUserStatus(row.id, targetStatus)
    ElMessage.success(`已${actionText}该用户`)
    await loadUsers()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

/** 删除用户账号（仅管理员，且不能删除自己） */
async function handleDelete(row: UserInfo): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${row.username}」的账号吗？删除后该账号将无法登录。`,
      '删除账号确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteUser(row.id)
    ElMessage.success('用户账号已删除')
    if (users.value.length === 1 && query.page > 1) {
      query.page -= 1
    }
    await loadUsers()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

onMounted(() => {
  void loadUsers()
})

watch(refreshTick, () => {
  void loadUsers()
})
</script>

<template>
  <section class="page-card">
    <div class="toolbar">
      <h2 class="page-title">所有用户</h2>
      <el-button type="primary" @click="goCreate">添加用户</el-button>
    </div>

    <div class="filters">
      <el-input
        v-model="query.keyword"
        placeholder="搜索用户名或昵称"
        clearable
        style="width: 220px"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="users"
      :empty-text="loading ? '加载中…' : '暂无用户'"
      style="width: 100%"
    >
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="username" label="用户名" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.username }}
          <el-tag v-if="row.id === account.user?.id" size="small" type="primary">我</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" min-width="110" show-overflow-tooltip />
      <el-table-column label="邮箱" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.email || '—' }}</template>
      </el-table-column>
      <el-table-column label="权限" width="140">
        <template #default="{ row }">
          <el-select
            :model-value="row.role"
            size="small"
            :disabled="row.id === account.user?.id"
            @change="(value: number) => handleRoleChange(row as UserInfo, value)"
          >
            <el-option
              v-for="item in roleOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              :title="item.tip"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="账号状态" width="95" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.status === 1" type="success" size="small">正常</el-tag>
          <el-tag v-else type="danger" size="small">已禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" align="right" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.id === account.user?.id"
            link
            type="primary"
            @click="router.push({ name: 'profile' })"
          >
            我的资料
          </el-button>
          <template v-else>
            <el-button link type="primary" @click="handleStatus(row as UserInfo)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row as UserInfo)">删除账号</el-button>
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
