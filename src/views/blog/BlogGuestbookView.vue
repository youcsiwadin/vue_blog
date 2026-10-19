<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createGuestMessage, fetchGuestMessages } from '@/api/blog'
import type { GuestMessage } from '@/types/api'

const formRef = ref<FormInstance>()
const submitting = ref(false)
const loading = ref(false)
const messages = ref<GuestMessage[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 10 })

const form = reactive({
  nickname: '',
  email: '',
  content: '',
})

const rules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 50, message: '昵称不能超过 50 个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入留言内容', trigger: 'blur' },
    { max: 1000, message: '留言内容不能超过 1000 个字符', trigger: 'blur' },
  ],
}

async function loadMessages(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchGuestMessages({ page: query.page, pageSize: query.pageSize })
    messages.value = data.records
    total.value = data.total
  } catch {
    messages.value = []
    total.value = 0
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
    await createGuestMessage({ ...form })
    ElMessage.success('留言成功，感谢你的留言！')
    form.content = ''
    formRef.value?.clearValidate()
    query.page = 1
    await loadMessages()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

function handlePageChange(page: number): void {
  query.page = page
  void loadMessages()
}

onMounted(() => {
  void loadMessages()
})
</script>

<template>
  <div class="blog-page">
    <div class="blog-page__head">
      <h1 class="blog-page__title">留言板</h1>
      <p class="blog-page__subtitle">欢迎留下你的想法，共 {{ total }} 条留言</p>
    </div>

    <div class="blog-card blog-guestbook__form">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" maxlength="50" placeholder="你的昵称" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="邮箱（选填）" prop="email">
              <el-input v-model="form.email" maxlength="100" placeholder="不会公开显示" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="留言内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="写下你想说的话…"
          />
        </el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交留言</el-button>
      </el-form>
    </div>

    <div v-loading="loading" class="blog-guestbook__list">
      <el-empty v-if="!messages.length && !loading" description="还没有留言，来抢占第一楼吧" />
      <div v-for="item in messages" :key="item.id" class="blog-card blog-message">
        <div class="blog-message__head">
          <el-avatar :size="32" class="blog-message__avatar">{{ item.nickname.charAt(0) }}</el-avatar>
          <div>
            <div class="blog-message__name">{{ item.nickname }}</div>
            <div class="blog-message__time">{{ (item.createTime || '').replace('T', ' ') }}</div>
          </div>
        </div>
        <p class="blog-message__content">{{ item.content }}</p>
      </div>
    </div>

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
  max-width: 900px;
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

.blog-guestbook__form {
  padding: 20px 22px 12px;
  margin-bottom: 20px;
}

.blog-guestbook__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 60px;
}

.blog-message {
  padding: 16px 20px;
}

.blog-message__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.blog-message__avatar {
  background-color: var(--el-color-primary);
  color: #ffffff;
}

.blog-message__name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.blog-message__time {
  color: #909399;
  font-size: 12px;
}

.blog-message__content {
  margin: 10px 0 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.blog-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
