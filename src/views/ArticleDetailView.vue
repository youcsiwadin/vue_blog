<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { deleteArticle, fetchArticleDetail } from '@/api/article'
import { useRefreshSignal } from '@/composables/useRefresh'
import { useUserStore } from '@/stores/user'
import type { Article } from '@/types/api'

const route = useRoute()
const router = useRouter()
const { state, isLoggedIn } = useUserStore()
const refreshTick = useRefreshSignal()

const loading = ref(false)
const article = ref<Article | null>(null)
const notFound = ref(false)

const articleId = computed(() => Number(route.params.id))

const isOwnArticle = computed(
  () => isLoggedIn.value && !!article.value && state.user?.id === article.value.userId,
)

/** 加载文章详情 */
async function loadArticle(): Promise<void> {
  loading.value = true
  notFound.value = false
  try {
    article.value = await fetchArticleDetail(articleId.value)
  } catch {
    article.value = null
    notFound.value = true
  } finally {
    loading.value = false
  }
}

function goHome(): void {
  void router.push({ name: 'article-list' })
}

function goEdit(): void {
  if (!article.value) {
    return
  }
  void router.push({ name: 'article-edit', params: { id: article.value.id } })
}

async function handleDelete(): Promise<void> {
  if (!article.value) {
    return
  }
  try {
    await ElMessageBox.confirm(`确定要删除文章《${article.value.title}》吗？`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteArticle(article.value.id)
    ElMessage.success('文章已删除')
    await router.push({ name: 'article-list' })
  } catch {
    // 错误提示已在响应拦截器中统一处理
  }
}

onMounted(() => {
  void loadArticle()
})

watch(articleId, () => {
  void loadArticle()
})

// 顶部导航栏「刷新页面」按钮触发的刷新
watch(refreshTick, () => {
  void loadArticle()
})
</script>

<template>
  <section v-loading="loading" class="page-card">
    <template v-if="article">
      <h1 class="detail__title">{{ article.title }}</h1>

      <div class="detail__meta">
        <span>作者：{{ article.authorName || '匿名用户' }}</span>
        <el-divider direction="vertical" />
        <span>发布时间：{{ (article.createTime || '').replace('T', ' ') }}</span>
        <el-divider direction="vertical" />
        <span>浏览量：{{ article.viewCount }}</span>
        <el-divider direction="vertical" />
        <span>分类：{{ article.categoryName || '未分类' }}</span>
      </div>

      <div v-if="(article.tags ?? []).length" class="detail__tags">
        <el-tag v-for="tag in article.tags" :key="tag.id" size="small" class="detail__tag">
          {{ tag.name }}
        </el-tag>
      </div>

      <el-divider />

      <pre class="detail__content">{{ article.content }}</pre>

      <div class="detail__actions">
        <el-button @click="goHome">返回列表</el-button>
        <template v-if="isOwnArticle">
          <el-button type="primary" @click="goEdit">编辑文章</el-button>
          <el-button type="danger" plain @click="handleDelete">删除文章</el-button>
        </template>
      </div>
    </template>

    <el-empty v-else-if="notFound" description="文章不存在或已被删除">
      <el-button type="primary" @click="goHome">返回列表</el-button>
    </el-empty>
  </section>
</template>

<style scoped>
.detail__title {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.4;
}

.detail__meta {
  color: #909399;
  font-size: 13px;
}

.detail__tags {
  margin-top: 10px;
}

.detail__tag {
  margin-right: 6px;
}

.detail__content {
  margin: 0;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail__actions {
  display: flex;
  gap: 8px;
  margin-top: 32px;
}
</style>
