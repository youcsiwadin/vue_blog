<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { deleteMedia, fetchMediaPage, uploadMedia } from '@/api/media'
import { useRefreshSignal } from '@/composables/useRefresh'
import type { Media } from '@/types/api'

const refreshTick = useRefreshSignal()

const loading = ref(false)
const uploading = ref(false)
const list = ref<Media[]>([])
const total = ref(0)
const fileInput = ref<HTMLInputElement | null>(null)
const query = reactive({ page: 1, pageSize: 12 })

/** 单张图片最大 40MB */
const MAX_UPLOAD_SIZE = 40 * 1024 * 1024

async function loadMedia(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchMediaPage({ page: query.page, pageSize: query.pageSize })
    list.value = data.records
    total.value = data.total
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
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
    query.page = 1
    await loadMedia()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function handleCopy(item: Media): Promise<void> {
  try {
    await navigator.clipboard.writeText(item.url)
    ElMessage.success('图片地址已复制')
  } catch {
    ElMessage.warning(`复制失败，图片地址：${item.url}`)
  }
}

async function handleDelete(item: Media): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${item.fileName}」吗？删除后图片文件也会一并移除，且不可恢复。`,
      '删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteMedia(item.id)
    ElMessage.success('图片已删除')
    if (list.value.length === 1 && query.page > 1) {
      query.page -= 1
    }
    await loadMedia()
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

function formatSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }
  return `${Math.max(Math.round(size / 1024), 1)} KB`
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

/** 是否为图片资源（附加内容附件会存入媒体库，可能是文档等非图片文件） */
function isImage(item: Media): boolean {
  if (item.mimeType?.startsWith('image/')) {
    return true
  }
  const extension = item.fileName.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(extension)
}

/** 非图片资源展示的扩展名标签 */
function fileExt(item: Media): string {
  const extension = item.fileName.split('.').pop()?.toLowerCase() ?? ''
  return extension ? extension.toUpperCase() : '文件'
}

function handlePageChange(page: number): void {
  query.page = page
  void loadMedia()
}

onMounted(() => {
  void loadMedia()
})

// 顶部导航栏「刷新页面」按钮触发的刷新
watch(refreshTick, () => {
  void loadMedia()
})
</script>

<template>
  <section class="page-card">
    <div class="toolbar">
      <h2 class="page-title">媒体库</h2>
      <div class="toolbar__right">
        <span class="toolbar__hint">支持 png / jpg / jpeg / gif / webp / bmp，单张最大 40MB</span>
        <el-button type="primary" :loading="uploading" @click="fileInput?.click()">上传图片</el-button>
        <input ref="fileInput" type="file" accept="image/*" class="upload-input" @change="handleFileChange" />
      </div>
    </div>

    <div v-loading="loading" class="media-grid">
      <el-empty v-if="!list.length && !loading" description="媒体库还是空的，点击右上角上传图片" />

      <div v-for="item in list" :key="item.id" class="media-item">
        <div class="media-item__thumb">
          <img v-if="isImage(item)" :src="item.url" :alt="item.fileName" />
          <div v-else class="media-item__thumb-file">
            <span class="media-item__thumb-ext">{{ fileExt(item) }}</span>
            <span class="media-item__thumb-hint">文件</span>
          </div>
        </div>
        <div class="media-item__name" :title="item.fileName">{{ item.fileName }}</div>
        <div class="media-item__meta">
          <span>{{ formatSize(item.size) }}</span>
          <span>{{ (item.createTime || '').replace('T', ' ') }}</span>
        </div>
        <div class="media-item__actions">
          <el-button link type="primary" @click="handleCopy(item)">复制地址</el-button>
          <el-button link type="danger" @click="handleDelete(item)">删除</el-button>
        </div>
      </div>
    </div>

    <div class="pagination">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :current-page="query.page"
        :page-size="query.pageSize"
        :page-sizes="[12, 24, 48]"
        @current-change="handlePageChange"
        @size-change="(size: number) => { query.pageSize = size; query.page = 1; loadMedia() }"
      />
    </div>
  </section>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar__hint {
  color: #909399;
  font-size: 12px;
}

.upload-input {
  display: none;
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  min-height: 80px;
  margin-top: 16px;
}

.media-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px;
  background-color: #ffffff;
}

.media-item__thumb {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 6px;
  background-color: #f7f9fc;
}

.media-item__thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.media-item__thumb-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #909399;
}

.media-item__thumb-ext {
  padding: 4px 10px;
  border-radius: 4px;
  background-color: #ecf5ff;
  color: #409eff;
  font-size: 12px;
  font-weight: 600;
}

.media-item__thumb-hint {
  font-size: 12px;
}

.media-item__name {
  margin-top: 8px;
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.media-item__meta {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.media-item__actions {
  margin-top: 6px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
