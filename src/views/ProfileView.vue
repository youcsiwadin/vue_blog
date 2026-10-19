<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { changePassword, updateProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { roleLabel } from '@/utils/role'

const { state, ensureUserLoaded, setUser } = useUserStore()

/** 当前账号角色说明 */
const roleText = computed(() => {
  const label = roleLabel(state.user?.role ?? null)
  return state.user?.role === 1 ? `${label}（最高权限）` : label
})

const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const savingProfile = ref(false)
const savingPassword = ref(false)

const profileForm = reactive({
  nickname: '',
  email: '',
  avatar: '',
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const profileRules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 50, message: '昵称不能超过 50 个字符', trigger: 'blur' },
  ],
}

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 50, message: '新密码长度必须为 6-50 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback: (error?: Error) => void) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的新密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

function fillProfile(): void {
  profileForm.nickname = state.user?.nickname ?? ''
  profileForm.email = state.user?.email ?? ''
  profileForm.avatar = state.user?.avatar ?? ''
}

async function handleSaveProfile(): Promise<void> {
  const valid = await profileFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  savingProfile.value = true
  try {
    const user = await updateProfile({ ...profileForm })
    setUser(user)
    ElMessage.success('个人资料已更新')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    savingProfile.value = false
  }
}

async function handleChangePassword(): Promise<void> {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  savingPassword.value = true
  try {
    await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码修改成功')
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    savingPassword.value = false
  }
}

onMounted(async () => {
  await ensureUserLoaded()
  fillProfile()
})
</script>

<template>
  <section class="profile">
    <el-card shadow="never" class="profile__card">
      <template #header>个人资料</template>

      <el-descriptions :column="1" border class="profile__desc">
        <el-descriptions-item label="用户名">{{ state.user?.username }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ state.user?.id }}</el-descriptions-item>
        <el-descriptions-item label="角色">{{ roleText }}</el-descriptions-item>
      </el-descriptions>

      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="90px"
        @submit.prevent
      >
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="profileForm.nickname" maxlength="50" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="profileForm.email" placeholder="选填" />
        </el-form-item>
        <el-form-item label="头像地址" prop="avatar">
          <el-input v-model="profileForm.avatar" placeholder="选填，图片地址" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingProfile" @click="handleSaveProfile">
            保存资料
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="profile__card">
      <template #header>修改密码</template>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="90px"
        @submit.prevent
      >
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingPassword" @click="handleChangePassword">
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </section>
</template>

<style scoped>
.profile {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile__desc {
  margin-bottom: 16px;
}
</style>
