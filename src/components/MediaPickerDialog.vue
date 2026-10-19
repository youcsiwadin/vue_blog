<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import { fetchMediaPage, uploadMedia } from '@/api/media'
import type { Media } from '@/types/api'

const props = defineProps<{
  modelValue: boolean
  /** 当前已选中的图片地址，用于高亮 */
  selected?: string | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'select', url: string): void
}>()

const MAX_UPLOAD_SIZE = 40 * 1024 * 1024

const loading = ref(false)
const uploading = ref(false)
const list = ref<Media[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(12)
const fileInput = ref<HTMLInputElement | null>(null)

async function loadMedia(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchMediaPage({ page: page.value, pageSize: pageSize.value })
    list.value = data.records
    total.value = data.total
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function close(): void {
  emit('update:modelValue', false)
}

function choose(item: Media): void {
  emit('select', item.url)
  close()
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    ElMessage.error('图片大小不能超过 40MB')
    input.value = ''
    return
  }
  uploading.value = true
  try {
    await uploadMedia(file)
    ElMessage.success('图片上传成功')
    page.value = 1
    await loadMedia()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    uploading.value = false
    input.value = ''
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      page.value = 1
      void loadMedia()
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="从媒体库选择图片"
    width="760px"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="picker__header">
      <span class="picker__hint">支持 png / jpg / jpeg / gif / webp / bmp，单张最大 40MB</span>
      <el-button type="primary" size="small" :loading="uploading" @click="fileInput?.click()">
        上传新图片
      </el-button>
      <input ref="fileInput" type="file" accept="image/*" class="picker__file" @change="handleFileChange" />
    </div>

    <div v-loading="loading" class="picker__grid">
      <el-empty v-if="!list.length && !loading" description="媒体库为空，先上传一张图片" />
      <button
        v-for="item in list"
        :key="item.id"
        type="button"
        class="picker__item"
        :class="{ 'picker__item--active': selected === item.url }"
        @click="choose(item)"
      >
        <img :src="item.url" :alt="item.fileName" />
        <span class="picker__name" :title="item.fileName">{{ item.fileName }}</span>
      </button>
    </div>

    <div v-if="total > pageSize" class="picker__pagination">
      <el-pagination
        background
        layout="prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(value: number) => { page = value; loadMedia() }"
      />
    </div>
  </el-dialog>
</template>

<style scoped>
.picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.picker__hint {
  color: #909399;
  font-size: 12px;
}

.picker__file {
  display: none;
}

.picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  min-height: 60px;
  max-height: 380px;
  overflow-y: auto;
}

.picker__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  background-color: #ffffff;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.picker__item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 10px rgba(64, 158, 255, 0.15);
}

.picker__item--active {
  border-color: var(--el-color-primary);
}

.picker__item img {
  width: 100%;
  height: 96px;
  object-fit: contain;
  background-color: #f7f9fc;
  border-radius: 4px;
}

.picker__name {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
