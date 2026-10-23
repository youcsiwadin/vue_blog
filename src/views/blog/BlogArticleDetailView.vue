<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { downloadArticleExtraFile, fetchArticleDetail, likeArticle, unlikeArticle } from '@/api/article'
import { fetchBlogSidebar } from '@/api/blog'
import { createComment, fetchArticleComments } from '@/api/comment'
import { useSiteStore } from '@/stores/site'
import { useUserStore } from '@/stores/user'
import { ROLE_ADMIN, ROLE_AUTHOR } from '@/utils/role'
import type { Article, BlogSidebar, Comment, ExtraFile } from '@/types/api'

const route = useRoute()
const router = useRouter()
const { state: account, isLoggedIn, ensureUserLoaded } = useUserStore()
const { state: site } = useSiteStore()

/** 博主信息（文章右侧模块） */
const sidebar = ref<BlogSidebar | null>(null)
const ownerName = computed(() => sidebar.value?.authorName || site.authorName || '博主')
const ownerAvatar = computed(() => sidebar.value?.authorAvatar || site.authorAvatar || '')

/** 文章作者信息（右侧模块显示的是发布该文章的作者） */
const articleAuthorName = computed(() => article.value?.authorName || '匿名用户')
const articleAuthorAvatar = computed(() => article.value?.authorAvatar ?? '')
const articleAuthorCount = computed(() => article.value?.authorArticleCount ?? 0)

/**
 * 评论者名称：已登录用户由权限决定，不能在评论中自行修改——
 * 管理员 / 作者 使用博主名字，订阅者使用本人昵称。
 */
const commenterName = computed(() => {
  if (!isLoggedIn.value) {
    return commentForm.nickname
  }
  const role = account.user?.role
  if (role === ROLE_ADMIN || role === ROLE_AUTHOR) {
    return ownerName.value
  }
  return account.user?.nickname || account.user?.username || ''
})

/**
 * 附加内容模块：文章存在附加内容（正文或附件）时，标题对所有用户可见；
 * 权限不足时后端不会下发内容，仅返回 extraLocked，此时点击提示「当前权限不足」。
 */
const showExtraModule = computed(() => {
  const data = article.value
  if (!data) {
    return false
  }
  if (data.extraLocked) {
    return true
  }
  return !!(data.extraContent ?? '').trim() || (data.extraFiles ?? []).length > 0
})

/** 附加内容可见（有权限）时的附件列表 */
const extraFiles = computed(() => article.value?.extraFiles ?? [])

function handleLockedClick(): void {
  ElMessage.error('当前权限不足')
}

const downloadingFile = ref<number | null>(null)

/** 下载附加内容附件：通过带登录态的接口获取文件并触发保存 */
async function handleDownloadFile(file: ExtraFile): Promise<void> {
  if (!article.value) {
    return
  }
  downloadingFile.value = file.mediaId
  try {
    const blob = await downloadArticleExtraFile(article.value.id, file.mediaId)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    downloadingFile.value = null
  }
}

function formatFileSize(size: number): string {
  if (!size) {
    return '0 KB'
  }
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }
  return `${Math.max(Math.round(size / 1024), 1)} KB`
}

async function loadSidebar(): Promise<void> {
  try {
    sidebar.value = await fetchBlogSidebar()
  } catch {
    sidebar.value = null
  }
}

function goAuthorPage(): void {
  const authorId = article.value?.userId
  if (authorId) {
    void router.push({ name: 'blog-author-detail', params: { id: authorId } })
  }
}

const loading = ref(false)
const article = ref<Article | null>(null)

/** 评论区 */
const comments = ref<Comment[]>([])
const commentTotal = ref(0)
const commentLoading = ref(false)
const commentQuery = reactive({ page: 1, pageSize: 10 })
const commentFormRef = ref<FormInstance>()
const submittingComment = ref(false)
const commentForm = reactive({
  nickname: '',
  email: '',
  content: '',
})

const commentRules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { max: 50, message: '昵称不能超过 50 个字符', trigger: 'blur' },
  ],
  email: [{ max: 100, message: '邮箱不能超过 100 个字符', trigger: 'blur' }],
  content: [
    { required: true, message: '请输入评论内容', trigger: 'blur' },
    { max: 1000, message: '评论内容不能超过 1000 个字符', trigger: 'blur' },
  ],
}

const articleId = computed(() => Number(route.params.id))
const commentEnabled = computed(() => article.value?.allowComment !== 0)

function formatTime(value: string): string {
  return (value || '').replace('T', ' ')
}

async function loadArticle(): Promise<void> {
  loading.value = true
  try {
    article.value = await fetchArticleDetail(articleId.value)
    if (commentEnabled.value) {
      await loadComments()
    }
  } catch {
    article.value = null
  } finally {
    loading.value = false
  }
}

async function loadComments(): Promise<void> {
  commentLoading.value = true
  try {
    const data = await fetchArticleComments(articleId.value, {
      page: commentQuery.page,
      pageSize: commentQuery.pageSize,
    })
    comments.value = data.records
    commentTotal.value = data.total
  } catch {
    comments.value = []
    commentTotal.value = 0
  } finally {
    commentLoading.value = false
  }
}

async function handleSubmitComment(): Promise<void> {
  if (!isLoggedIn.value) {
    goLoginForComment()
    return
  }
  const valid = await commentFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submittingComment.value = true
  try {
    const result = await createComment({
      articleId: articleId.value,
      nickname: commentForm.nickname.trim(),
      email: commentForm.email.trim(),
      content: commentForm.content.trim(),
    })
    // 提示文案由后端决定：开启自动过审时为「已自动通过审核」，否则为「等待审核」
    ElMessage.success(result.message || '评论提交成功')
    commentForm.content = ''
    commentFormRef.value?.clearValidate()
    commentQuery.page = 1
    await loadComments()
  } catch {
    // 错误提示已在响应拦截器中统一处理（例如文章已关闭评论）
  } finally {
    submittingComment.value = false
  }
}

function handleCommentPageChange(page: number): void {
  commentQuery.page = page
  void loadComments()
}

function goBack(): void {
  void router.push({ name: 'blog-articles' })
}

/** 未登录时点击评论区域的「登录」进入登录页，并在登录后回到当前文章 */
function goLoginForComment(): void {
  void router.push({ name: 'login', query: { redirect: route.fullPath } })
}

/** 点赞：未登录时引导登录，已登录时按当前状态调用点赞 / 取消点赞接口 */
const liking = ref(false)

async function handleToggleLike(): Promise<void> {
  if (!article.value) {
    return
  }
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  const target = !article.value.liked
  liking.value = true
  try {
    const result = target ? await likeArticle(articleId.value) : await unlikeArticle(articleId.value)
    if (article.value) {
      article.value.liked = result.liked
      article.value.likeCount = result.likeCount
    }
    ElMessage.success(target ? '点赞成功' : '已取消点赞')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    liking.value = false
  }
}

onMounted(async () => {
  await ensureUserLoaded()
  await loadSidebar()
  // 已登录用户：评论者名称按权限自动填充且不可修改；邮箱可自由填写
  if (isLoggedIn.value) {
    commentForm.nickname = commenterName.value
    commentForm.email = account.user?.email ?? ''
  }
  await loadArticle()
})

watch(articleId, () => {
  commentQuery.page = 1
  void loadArticle()
})
</script>

<template>
  <div class="blog-page blog-page--detail">
    <div v-loading="loading" class="blog-detail__main">
      <template v-if="article">
        <!-- 文章方框：标题 + 正文放在同一个方框内 -->
        <article class="blog-card blog-article-box">
          <!-- 有封面：标题直接放在封面图片中，不额外新增标题区域 -->
          <div v-if="article.coverImage" class="blog-article-box__cover">
            <img class="blog-article-box__cover-img" :src="article.coverImage" :alt="article.title" />
            <h1 class="blog-article-box__cover-title">{{ article.title }}</h1>
          </div>
          <h1 v-else class="blog-article-box__title">{{ article.title }}</h1>

          <div class="blog-article-box__meta">
            <span>{{ formatTime(article.createTime) }}</span>
            <span>浏览 {{ article.viewCount }}</span>
            <span>点赞 {{ article.likeCount }}</span>
            <span>字数 {{ article.wordCount ?? 0 }}</span>
            <span>分类 {{ article.categoryName || '未分类' }}</span>
          </div>

          <div v-if="(article.tags ?? []).length" class="blog-article-box__tags">
            <span v-for="tag in article.tags" :key="tag.id" class="blog-chip blog-chip--tag">#{{ tag.name }}</span>
          </div>

          <el-divider class="blog-article-box__divider" />

          <pre class="blog-article-box__content">{{ article.content }}</pre>

          <!-- 附加内容：正文下方，标题对所有用户可见，内容按文章权限控制 -->
          <template v-if="showExtraModule">
            <el-divider class="blog-article-box__divider" />
            <section class="blog-article-box__extra">
              <h3 class="blog-article-box__extra-title">附加内容</h3>

              <!-- 权限不足：标题可见，内容不可见，点击提示 -->
              <div v-if="article.extraLocked" class="blog-article-box__extra-locked" @click="handleLockedClick">
                <span class="blog-article-box__extra-locked-icon">🔒</span>
                <span class="blog-article-box__extra-locked-text">当前权限不足，无法查看附加内容</span>
                <el-button size="small" type="primary" plain @click.stop="handleLockedClick">查看</el-button>
              </div>

              <!-- 有权限：附加内容正文 -->
              <template v-else>
                <pre v-if="(article.extraContent ?? '').trim()" class="blog-article-box__extra-content">{{ article.extraContent }}</pre>

                <!-- 附加内容文件：支持下载 -->
                <div v-if="extraFiles.length" class="blog-article-box__extra-files">
                  <div class="blog-article-box__extra-files-title">附件下载</div>
                  <ul class="blog-article-box__extra-files-list">
                    <li v-for="file in extraFiles" :key="file.mediaId" class="blog-article-box__extra-file">
                      <span class="blog-article-box__extra-file-icon">📎</span>
                      <span class="blog-article-box__extra-file-name" :title="file.fileName">{{ file.fileName }}</span>
                      <span class="blog-article-box__extra-file-size">{{ formatFileSize(file.size) }}</span>
                      <el-button
                        link
                        type="primary"
                        size="small"
                        :loading="downloadingFile === file.mediaId"
                        @click="handleDownloadFile(file)"
                      >
                        下载
                      </el-button>
                    </li>
                  </ul>
                </div>
              </template>
            </section>
          </template>
        </article>

        <div class="blog-detail__actions">
          <el-button @click="goBack">返回文章列表</el-button>
          <el-button
            class="blog-detail__like"
            :class="{ 'is-liked': article.liked }"
            :loading="liking"
            @click="handleToggleLike"
          >
            {{ article.liked ? '👍 已点赞' : '👍 点赞' }} {{ article.likeCount }}
          </el-button>
        </div>

        <!-- 评论模块 -->
        <section class="blog-card blog-comments">
          <h3 class="blog-comments__title">
            评论
            <span v-if="commentEnabled" class="blog-comments__count">{{ commentTotal }}</span>
          </h3>

          <template v-if="commentEnabled">
            <el-form
              v-if="isLoggedIn"
              ref="commentFormRef"
              :model="commentForm"
              :rules="commentRules"
              label-position="top"
              class="blog-comments__form"
              @submit.prevent
            >
              <el-row :gutter="16">
                <el-col :xs="24" :sm="12">
                  <el-form-item label="昵称" prop="nickname">
                    <el-input
                      v-model="commentForm.nickname"
                      maxlength="50"
                      :readonly="isLoggedIn"
                      placeholder="必填"
                    />
                    <div v-if="isLoggedIn" class="blog-comments__lock-tip">
                      评论者名称由账号权限决定，无法修改
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                  <el-form-item label="邮箱（选填）" prop="email">
                    <el-input v-model="commentForm.email" maxlength="100" placeholder="选填，不会公开显示" />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="评论内容" prop="content">
                <el-input
                  v-model="commentForm.content"
                  type="textarea"
                  :rows="4"
                  maxlength="1000"
                  show-word-limit
                  placeholder="写下你的看法…"
                />
              </el-form-item>
              <el-button
                class="blog-comments__submit"
                type="primary"
                :loading="submittingComment"
                @click="handleSubmitComment"
              >
                发表评论
              </el-button>
            </el-form>

            <div v-else class="blog-comments__login-tip">
              请<button type="button" class="blog-comments__login-link" @click="goLoginForComment">登录</button>后再进行评论
            </div>
          </template>

          <el-alert v-else title="该文章已关闭评论" type="info" :closable="false" show-icon />

          <div v-loading="commentLoading" class="blog-comments__list">
            <el-empty v-if="!comments.length && !commentLoading" description="还没有评论，来抢沙发吧" />
            <div v-for="item in comments" :key="item.id" class="blog-comment">
              <el-avatar :size="34" class="blog-comment__avatar">{{ item.nickname.charAt(0) }}</el-avatar>
              <div class="blog-comment__body">
                <div class="blog-comment__head">
                  <span class="blog-comment__name">{{ item.nickname }}</span>
                  <el-tag v-if="item.userId" size="small" type="success">已登录</el-tag>
                  <span class="blog-comment__time">{{ formatTime(item.createTime) }}</span>
                </div>
                <p class="blog-comment__content">{{ item.content }}</p>
              </div>
            </div>
          </div>

          <div v-if="commentTotal > commentQuery.pageSize" class="blog-comments__pagination">
            <el-pagination
              background
              layout="prev, pager, next"
              :total="commentTotal"
              :current-page="commentQuery.page"
              :page-size="commentQuery.pageSize"
              @current-change="handleCommentPageChange"
            />
          </div>
        </section>
      </template>

      <div v-else-if="!loading" class="blog-card blog-detail__empty">
        <el-empty description="文章不存在或已被删除">
          <el-button type="primary" @click="goBack">返回文章列表</el-button>
        </el-empty>
      </div>
    </div>

    <!-- 右侧：写作者（博主）信息模块 -->
    <aside class="blog-detail__side">
      <div class="blog-card blog-author-card">
        <el-avatar :size="64" :src="articleAuthorAvatar || undefined" class="blog-author-card__avatar">
          {{ articleAuthorName.charAt(0) }}
        </el-avatar>
        <div class="blog-author-card__name">{{ articleAuthorName }}</div>
        <div class="blog-author-card__count">
          <b>{{ articleAuthorCount }}</b> 篇文章
        </div>
        <el-button link type="primary" @click="goAuthorPage">查看TA的文章</el-button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.blog-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 88px 16px 0;
}

/* 文章详情：左侧正文 + 右侧写作者（博主）信息模块 */
.blog-page--detail {
  max-width: 1180px;
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.blog-detail__main {
  flex: 1;
  min-width: 0;
}

.blog-detail__side {
  position: sticky;
  top: 84px;
  width: 260px;
  flex: 0 0 260px;
}

.blog-author-card {
  padding: 20px;
  text-align: center;
}

.blog-author-card__avatar {
  background-color: var(--blog-primary-color, #409eff);
  color: #ffffff;
  font-size: 22px;
}

.blog-author-card__name {
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.blog-author-card__count {
  margin-top: 8px;
  color: #909399;
  font-size: 13px;
}

.blog-author-card__count b {
  color: var(--blog-primary-color, #409eff);
  font-size: 16px;
}

.blog-comments__lock-tip {
  margin-top: 4px;
  color: #c0c4cc;
  font-size: 12px;
  line-height: 1.5;
}

/* 未登录评论提示：仅替换填写区域，不隐藏已有评论 */
.blog-comments__login-tip {
  margin-bottom: 20px;
  padding: 18px 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.6);
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  text-align: center;
}

.blog-comments__login-link {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--blog-primary-color, #409eff);
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 900px) {
  .blog-page--detail {
    flex-direction: column;
  }

  .blog-detail__side {
    position: static;
    width: 100%;
    flex: 1 1 auto;
  }
}

/* 文章方框：标题与正文同处一个方框 */
.blog-article-box {
  padding: 32px 36px 36px;
  border: 1px solid #e4e7ed;
}

/* 封面：标题叠在图片之中，图片居中裁切并降到 60% 透明度 */
.blog-article-box__cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 300px;
  margin-bottom: 20px;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f7f9fc;
}

.blog-article-box__cover-img {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.5;
}

.blog-article-box__cover-title {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0 24px;
  text-align: center;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.5;
  color: #303133;
  text-shadow: 0 2px 12px rgba(255, 255, 255, 0.9);
  word-break: break-word;
}

.blog-article-box__title {
  margin: 0;
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.5;
  color: #303133;
  word-break: break-word;
}

.blog-article-box__meta {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 14px;
  color: #909399;
  font-size: 13px;
}

.blog-article-box__tags {
  margin-top: 12px;
  text-align: center;
}

.blog-article-box__divider {
  margin: 22px 0;
}

.blog-article-box__content {
  margin: 0;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.95;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 附加内容：正文下方的受限模块（仅订阅者及以上可见） */
.blog-article-box__extra-title {
  margin: 0 0 12px;
  padding-left: 10px;
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid var(--blog-primary-color, #409eff);
}

.blog-article-box__extra-content {
  margin: 0;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.95;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 权限不足：标题可见，内容锁定 */
.blog-article-box__extra-locked {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.blog-article-box__extra-locked:hover {
  border-color: var(--blog-primary-color, #409eff);
}

.blog-article-box__extra-locked-icon {
  font-size: 18px;
}

.blog-article-box__extra-locked-text {
  flex: 1;
  min-width: 0;
  color: #909399;
  font-size: 14px;
}

/* 附加内容文件下载 */
.blog-article-box__extra-files {
  margin-top: 18px;
}

.blog-article-box__extra-files-title {
  margin-bottom: 8px;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
}

.blog-article-box__extra-files-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.blog-article-box__extra-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.blog-article-box__extra-file:last-child {
  margin-bottom: 0;
}

.blog-article-box__extra-file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #303133;
}

.blog-article-box__extra-file-size {
  color: #909399;
  font-size: 12px;
}

.blog-detail__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

/* 点赞按钮：未点赞沿用默认样式，已点赞跟随站点主色调 */
.blog-detail__like.is-liked {
  background-color: var(--blog-primary-color, #409eff);
  border-color: var(--blog-primary-color, #409eff);
  color: #ffffff;
}

.blog-detail__like.is-liked:hover {
  filter: brightness(0.92);
}

.blog-detail__empty {
  padding: 40px 0;
}

.blog-comments {
  margin-top: 20px;
  padding: 20px 24px 24px;
}

.blog-comments__title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  padding-left: 10px;
  border-left: 4px solid var(--el-color-primary);
}

.blog-comments__count {
  margin-left: 6px;
  color: #909399;
  font-size: 13px;
  font-weight: normal;
}

.blog-comments__form {
  padding: 16px 18px 8px;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid #ebeef5;
}

/* 评论发送按钮跟随站点主色调 */
.blog-comments__submit {
  background-color: var(--blog-primary-color, #409eff);
  border-color: var(--blog-primary-color, #409eff);
  color: #ffffff;
}

.blog-comments__submit:hover {
  filter: brightness(0.92);
}

.blog-comments__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 20px;
  min-height: 40px;
}

.blog-comment {
  display: flex;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px dashed #ebeef5;
}

.blog-comment:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.blog-comment__avatar {
  flex: 0 0 auto;
  background-color: var(--el-color-primary);
  color: #ffffff;
}

.blog-comment__body {
  flex: 1;
  min-width: 0;
}

.blog-comment__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.blog-comment__name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.blog-comment__time {
  color: #909399;
  font-size: 12px;
}

.blog-comment__content {
  margin: 8px 0 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.blog-comments__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
