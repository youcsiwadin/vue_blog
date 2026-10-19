<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const { login, register } = useUserStore()

const activeTab = ref<'login' | 'register'>('login')
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const submitting = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

const loginRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 4, max: 50, message: '用户名长度必须为 4-50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度必须为 6-50 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback: (error?: Error) => void) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

/** 登录成功后跳转：优先回到来源页面 */
async function redirectAfterLogin(): Promise<void> {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.length > 0) {
    await router.replace(redirect)
    return
  }
  await router.replace({ name: 'dashboard' })
}

async function handleLogin(): Promise<void> {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    const user = await login({ ...loginForm })
    ElMessage.success(`欢迎回来，${user.nickname || user.username}`)
    await redirectAfterLogin()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

async function handleRegister(): Promise<void> {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    const user = await register({
      username: registerForm.username,
      password: registerForm.password,
      nickname: registerForm.nickname,
    })
    ElMessage.success(`注册成功，欢迎你，${user.nickname || user.username}`)
    await redirectAfterLogin()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <el-card shadow="never" class="login-card">
      <h2 class="login-card__title">JAVA博客网站</h2>
      <p class="login-card__subtitle">登录后即可发布、编辑与管理自己的文章</p>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            @submit.prevent="handleLogin"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                show-password
                placeholder="请输入密码"
              />
            </el-form-item>
            <el-button
              class="login-card__submit"
              type="primary"
              :loading="submitting"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register">
          <el-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            @submit.prevent="handleRegister"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="registerForm.username" placeholder="4-50 个字符" />
            </el-form-item>
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="registerForm.nickname" placeholder="选填，默认与用户名相同" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                show-password
                placeholder="6-50 个字符"
              />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="registerForm.confirmPassword"
                type="password"
                show-password
                placeholder="请再次输入密码"
              />
            </el-form-item>
            <el-button
              class="login-card__submit"
              type="primary"
              :loading="submitting"
              @click="handleRegister"
            >
              注册并登录
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </section>
</template>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  padding-top: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  border-radius: 8px;
}

.login-card__title {
  margin: 0 0 4px;
  text-align: center;
  color: #409eff;
}

.login-card__subtitle {
  margin: 0 0 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.login-card__submit {
  width: 100%;
}
</style>
