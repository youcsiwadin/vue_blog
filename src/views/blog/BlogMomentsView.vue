<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import { fetchMomentPage } from '@/api/moment'
import type { Moment } from '@/types/api'

const loading = ref(false)
const moments = ref<Moment[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 10 })

async function loadMoments(): Promise<void> {
  loading.value = true
  try {
    const data = await fetchMomentPage({ page: query.page, pageSize: query.pageSize })
    moments.value = data.records
    total.value = data.total
  } catch {
    moments.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number): void {
  query.page = page
  void loadMoments()
}

onMounted(() => {
  void loadMoments()
})
</script>

<template>
  <div class="blog-page">
    <div class="blog-page__head">
      <h1 class="blog-page__title">说说</h1>
      <p class="blog-page__subtitle">记录生活中的点滴，共 {{ total }} 条</p>
    </div>

    <div v-loading="loading" class="blog-moments">
      <el-empty v-if="!moments.length && !loading" description="还没有说说" />
      <div v-for="item in moments" :key="item.id" class="blog-card blog-moment">
        <div class="blog-moment__head">
          <span class="blog-moment__author">{{ item.authorName || '博主' }}</span>
          <span class="blog-moment__time">{{ (item.createTime || '').replace('T', ' ') }}</span>
        </div>
        <p class="blog-moment__content">{{ item.content }}</p>
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

.blog-moments {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 60px;
}

.blog-moment {
  padding: 16px 20px;
}

.blog-moment__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.blog-moment__author {
  font-weight: 600;
  color: #303133;
}

.blog-moment__time {
  color: #909399;
  font-size: 12px;
}

.blog-moment__content {
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
