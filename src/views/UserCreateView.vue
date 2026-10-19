<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createUser } from '@/api/user'
import type { UserCreatePayload } from '@/types/api'

const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive<UserCreatePayload>({
  username: '',
  password: '',
  nickname: '',
  email: '',
  status: 1,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 4, max: 50, message: '用户名长度必须为 4-50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度必须为 6-50 个字符', trigger: 'blur' },
  ],
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    await createUser({ ...form })
    ElMessage.success('用户创建成功')
    await router.push({ name: 'user-list' })
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  void router.push({ name: 'user-list' })
}
</script>

<template>
  <section class="page-card">
    <h2 class="page-title">添加用户</h2>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" @submit.prevent>
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.username" placeholder="4-50 个字符" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" show-password placeholder="6-50 个字符" />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" placeholder="选填，默认与用户名相同" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="选填" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">正常</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
        <el-button :disabled="submitting" @click="handleCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>
