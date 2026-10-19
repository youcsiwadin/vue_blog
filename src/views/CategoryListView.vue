<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createCategory, deleteCategory, fetchCategories, updateCategory } from '@/api/category'
import { useRefreshSignal } from '@/composables/useRefresh'
import type { Category, CategoryPayload } from '@/types/api'

const refreshTick = useRefreshSignal()

const loading = ref(false)
const submitting = ref(false)
const categories = ref<Category[]>([])

const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const form = reactive<CategoryPayload>({
  name: '',
  slug: '',
  description: '',
  sortOrder: 0,
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 50, message: '分类名称不能超过 50 个字符', trigger: 'blur' },
  ],
}

async function loadCategories(): Promise<void> {
  loading.value = true
  try {
    categories.value = await fetchCategories()
  } catch {
    categories.value = []
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editingId.value = null
  form.name = ''
  form.slug = ''
  form.description = ''
  form.sortOrder = 0
  dialogVisible.value = true
}

function openEdit(row: Category): void {
  editingId.value = row.id
  form.name = row.name
  form.slug = row.slug ?? ''
  form.description = row.description ?? ''
  form.sortOrder = row.sortOrder ?? 0
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
      await createCategory({ ...form })
      ElMessage.success('分类创建成功')
    } else {
      await updateCategory(editingId.value, { ...form })
      ElMessage.success('分类更新成功')
    }
    dialogVisible.value = false
    await loadCategories()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: Category): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除分类「${row.name}」吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteCategory(row.id)
    ElMessage.success('分类已删除')
    await loadCategories()
  } catch {
    // 分类下仍存在文章时后端会返回提示
  }
}

onMounted(() => {
  void loadCategories()
})

watch(refreshTick, () => {
  void loadCategories()
})
</script>

<template>
  <section class="page-card">
    <div class="toolbar">
      <h2 class="page-title">分类目录</h2>
      <el-button type="primary" @click="openCreate">新增分类</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="categories"
      :empty-text="loading ? '加载中…' : '暂无分类'"
      style="width: 100%"
    >
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="slug" label="别名" width="160">
        <template #default="{ row }">{{ row.slug || '—' }}</template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="200">
        <template #default="{ row }">{{ row.description || '—' }}</template>
      </el-table-column>
      <el-table-column prop="articleCount" label="文章数" width="90" />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row as Category)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row as Category)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId === null ? '新增分类' : '编辑分类'"
      width="480px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="50" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="别名" prop="slug">
          <el-input v-model="form.slug" maxlength="100" placeholder="选填，用于地址栏" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="255" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :max="9999" />
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
