<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createPage, fetchPageDetail, updatePage } from '@/api/page'
import type { PagePayload } from '@/types/api'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => route.name === 'page-edit')
const pageId = computed(() => Number(route.params.id))
const pageTitle = computed(() => (isEdit.value ? '编辑页面' : '添加页面'))

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)
const form = reactive<PagePayload>({
  title: '',
  slug: '',
  content: '',
  status: 1,
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入页面标题', trigger: 'blur' },
    { max: 200, message: '页面标题不能超过 200 个字符', trigger: 'blur' },
  ],
  slug: [{ max: 100, message: '页面别名不能超过 100 个字符', trigger: 'blur' }],
  content: [{ required: true, message: '请输入页面内容', trigger: 'blur' }],
}

async function loadPage(): Promise<void> {
  if (!isEdit.value) {
    return
  }
  loading.value = true
  try {
    const detail = await fetchPageDetail(pageId.value)
    form.title = detail.title
    form.slug = detail.slug ?? ''
    form.content = detail.content ?? ''
    form.status = detail.status
  } catch {
    await router.replace({ name: 'page-list' })
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updatePage(pageId.value, { ...form })
      ElMessage.success('页面更新成功')
    } else {
      await createPage({ ...form })
      ElMessage.success('页面创建成功')
    }
    await router.push({ name: 'page-list' })
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  void router.push({ name: 'page-list' })
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <section v-loading="loading" class="page-card">
    <h2 class="page-title">{{ pageTitle }}</h2>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="页面标题" prop="title">
        <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入页面标题" />
      </el-form-item>

      <el-form-item label="页面别名" prop="slug">
        <el-input v-model="form.slug" maxlength="100" placeholder="选填，例如 about" />
      </el-form-item>

      <el-form-item label="页面状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">发布</el-radio>
          <el-radio :value="0">草稿</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="页面内容" prop="content">
        <el-input v-model="form.content" type="textarea" :rows="14" placeholder="请输入页面内容" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存修改' : '发布页面' }}
        </el-button>
        <el-button :disabled="submitting" @click="handleCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>
