<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createMoment } from '@/api/moment'

const router = useRouter()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({ content: '' })

const rules: FormRules = {
  content: [
    { required: true, message: '请输入说说内容', trigger: 'blur' },
    { max: 1000, message: '说说内容不能超过 1000 个字符', trigger: 'blur' },
  ],
}

const remaining = computed(() => 1000 - form.content.length)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    await createMoment(form.content)
    ElMessage.success('说说发表成功')
    form.content = ''
    await router.push({ name: 'moment-list' })
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  void router.push({ name: 'moment-list' })
}
</script>

<template>
  <section class="page-card">
    <h2 class="page-title">发表说说</h2>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="说说内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="8"
          maxlength="1000"
          show-word-limit
          placeholder="记录此刻的想法…"
        />
      </el-form-item>
      <div class="hint">还可输入 {{ remaining }} 个字符</div>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">发表</el-button>
        <el-button :disabled="submitting" @click="handleCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<style scoped>
.hint {
  margin: -8px 0 12px;
  color: #909399;
  font-size: 12px;
}
</style>
