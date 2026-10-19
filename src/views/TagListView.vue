<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createTag, deleteTag, fetchTags, updateTag } from '@/api/tag'
import { useRefreshSignal } from '@/composables/useRefresh'
import type { Tag, TagPayload } from '@/types/api'

const refreshTick = useRefreshSignal()

const loading = ref(false)
const submitting = ref(false)
const tags = ref<Tag[]>([])

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive<TagPayload>({ name: '' })

const rules: FormRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { max: 50, message: '标签名称不能超过 50 个字符', trigger: 'blur' },
  ],
}

async function loadTags(): Promise<void> {
  loading.value = true
  try {
    tags.value = await fetchTags()
  } catch {
    tags.value = []
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editingId.value = null
  form.name = ''
  dialogVisible.value = true
}

function openEdit(row: Tag): void {
  editingId.value = row.id
  form.name = row.name
  dialogVisible.value = true
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (editingId.value === null) {
      await createTag({ ...form })
      ElMessage.success('标签创建成功')
    } else {
      await updateTag(editingId.value, { ...form })
      ElMessage.success('标签更新成功')
    }
    dialogVisible.value = false
    await loadTags()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: Tag): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除标签「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteTag(row.id)
    ElMessage.success('标签已删除')
    await loadTags()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

onMounted(() => {
  void loadTags()
})

watch(refreshTick, () => {
  void loadTags()
})
</script>

<template>
  <section class="page-card">
    <div class="toolbar">
      <h2 class="page-title">标签</h2>
      <el-button type="primary" @click="openCreate">新增标签</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tags"
      :empty-text="loading ? '加载中…' : '暂无标签'"
      style="width: 100%"
    >
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column prop="articleCount" label="文章数" width="100" />
      <el-table-column prop="createTime" label="创建时间" width="200">
        <template #default="{ row }">{{ (row.createTime || '').replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row as Tag)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row as Tag)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId === null ? '新增标签' : '编辑标签'" width="420px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="50" placeholder="请输入标签名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
