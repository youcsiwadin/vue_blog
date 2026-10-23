<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { fetchAdminExists } from '@/api/user'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const { registerAdmin } = useUserStore()

const checking = ref(true)
const adminAvailable = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 4, max: 50, message: '用户名长度必须为 4-50 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] },
    { max: 100, message: '邮箱不能超过 100 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度必须为 6-50 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback: (error?: Error) => void) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!adminAvailable.value) {
    ElMessage.error('管理员用户已存在，无法重复注册')
    return
  }
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    const user = await registerAdmin({
      username: form.username,
      nickname: form.nickname,
      email: form.email.trim(),
      password: form.password,
    })
    ElMessage.success(`管理员注册成功，欢迎你，${user.nickname || user.username}`)
    await router.replace({ name: 'dashboard' })
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

function goLogin(): void {
  void router.replace({ name: 'login' })
}

onMounted(async () => {
  try {
    adminAvailable.value = !(await fetchAdminExists())
  } catch {
    adminAvailable.value = false
  } finally {
    checking.value = false
  }
})
</script>

<template>
  <section class="admin-register-page">
    <el-card v-loading="checking" shadow="never" class="admin-register-card">
      <h2 class="admin-register-card__title">注册成为管理员</h2>
      <p class="admin-register-card__subtitle">仅在系统还没有启用管理员时开放</p>

      <el-alert
        v-if="!checking && !adminAvailable"
        title="管理员用户已存在，无法重复注册"
        type="warning"
        :closable="false"
        show-icon
      />

      <el-form
        v-else-if="!checking"
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="4-50 个字符" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="选填，默认与用户名相同" />
        </el-form-item>
        <el-form-item label="邮箱（必填）" prop="email">
          <el-input v-model="form.email" type="email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="6-50 个字符"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入密码"
          />
        </el-form-item>
        <el-button
          class="admin-register-card__submit"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          注册成为管理员
        </el-button>
      </el-form>

      <el-button class="admin-register-card__back" link type="primary" @click="goLogin">
        返回登录
      </el-button>
    </el-card>
  </section>
</template>

<style scoped>
.admin-register-page {
  display: flex;
  justify-content: center;
  padding-top: 24px;
}

.admin-register-card {
  width: 100%;
  max-width: 460px;
  border-radius: 8px;
}

.admin-register-card__title {
  margin: 0 0 4px;
  text-align: center;
  color: #409eff;
}

.admin-register-card__subtitle {
  margin: 0 0 20px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.admin-register-card__submit {
  width: 100%;
}

.admin-register-card__back {
  width: 100%;
  margin-top: 10px;
}
</style>
