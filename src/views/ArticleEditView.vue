<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { createArticle, fetchArticleDetail, updateArticle } from '@/api/article'
import { fetchCategories } from '@/api/category'
import { uploadMediaFile } from '@/api/media'
import { fetchTags } from '@/api/tag'
import MediaPickerDialog from '@/components/MediaPickerDialog.vue'
import { useUserStore } from '@/stores/user'
import { DEFAULT_EXTRA_VIEW_LEVEL, EXTRA_VIEW_LEVELS } from '@/utils/role'
import type { ArticlePayload, Category, ExtraFile, Tag } from '@/types/api'

const route = useRoute()
const router = useRouter()
const { state, isAdmin } = useUserStore()

const isEdit = computed(() => route.name === 'article-edit')
const articleId = computed(() => Number(route.params.id))
const pageTitle = computed(() => (isEdit.value ? '编辑文章' : '写文章'))

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])

/** 媒体库选择与摘要编辑弹窗 */
const mediaPickerVisible = ref(false)
const summaryDialogVisible = ref(false)
const summaryDraft = ref('')

/** 附加内容附件：上传到媒体库后记录，保存文章时提交 mediaId 列表 */
const extraFiles = ref<ExtraFile[]>([])
const extraFileUploading = ref(false)
const extraFileInput = ref<HTMLInputElement | null>(null)
const MAX_UPLOAD_SIZE = 40 * 1024 * 1024

const form = reactive<ArticlePayload>({
  categoryId: null,
  tagIds: [],
  coverImage: '',
  status: 2,
  allowComment: true,
  title: '',
  summary: '',
  content: '',
  extraContent: '',
  extraViewLevel: DEFAULT_EXTRA_VIEW_LEVEL,
  extraFileIds: [],
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { max: 200, message: '标题不能超过 200 个字符', trigger: 'blur' },
  ],
  content: [{ required: true, message: '请输入文章正文', trigger: 'blur' }],
  summary: [{ max: 500, message: '摘要不能超过 500 个字符', trigger: 'blur' }],
}

/**
 * 状态设置：
 * 管理员可设置 草稿 / 待审核 / 已发布；
 * 作者只能选择 草稿 或 发布（发布后进入待审核，需管理员审核通过才会显示在博客）。
 */
const statusOptions = computed(() =>
  isAdmin.value
    ? [
        { value: 0, label: '草稿', tip: '仅在后台「文章管理」中可见，不显示在博客' },
        { value: 1, label: '待审核', tip: '暂不显示在博客，等待审核' },
        { value: 2, label: '已发布', tip: '可以在博客中看到' },
      ]
    : [
        { value: 0, label: '草稿', tip: '仅在后台「文章管理」中可见，不显示在博客' },
        { value: 2, label: '发布', tip: '提交后需管理员审核通过，才会显示在博客中' },
      ],
)

const currentStatusTip = computed(
  () => statusOptions.value.find((item) => item.value === form.status)?.tip ?? '',
)

/** 编辑模式：加载文章详情并校验作者身份 */
async function loadArticle(): Promise<void> {
  if (!isEdit.value) {
    return
  }
  loading.value = true
  try {
    const article = await fetchArticleDetail(articleId.value)
    if (state.user && article.userId !== state.user.id) {
      ElMessage.error('只能编辑自己发布的文章')
      await router.replace({ name: 'article-list' })
      return
    }
    form.categoryId = article.categoryId ?? null
    form.tagIds = (article.tags ?? []).map((tag) => tag.id)
    form.coverImage = article.coverImage ?? ''
    // 作者：待审核(1)与已发布(2)在编辑器里都对应"发布"选项
    form.status = isAdmin.value ? (article.status ?? 2) : article.status === 0 ? 0 : 2
    form.allowComment = article.allowComment !== 0
    form.title = article.title
    form.summary = article.summary ?? ''
    form.content = article.content ?? ''
    form.extraContent = article.extraContent ?? ''
    form.extraViewLevel = article.extraViewLevel ?? DEFAULT_EXTRA_VIEW_LEVEL
    extraFiles.value = article.extraFiles ?? []
    form.extraFileIds = extraFiles.value.map((file) => file.mediaId)
  } catch {
    await router.replace({ name: 'article-list' })
  } finally {
    loading.value = false
  }
}

/** 加载分类与标签下拉数据 */
async function loadOptions(): Promise<void> {
  try {
    categories.value = await fetchCategories()
  } catch {
    categories.value = []
  }
  try {
    tags.value = await fetchTags()
  } catch {
    tags.value = []
  }
}

function handleCoverSelect(url: string): void {
  form.coverImage = url
  ElMessage.success('已设置文章封面')
}

function removeCover(): void {
  form.coverImage = ''
}

/** 上传附加内容附件：文件保存到媒体库后加入附件列表 */
async function handleExtraFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    ElMessage.error('文件大小不能超过 40MB')
    input.value = ''
    return
  }
  extraFileUploading.value = true
  try {
    const media = await uploadMediaFile(file)
    extraFiles.value.push({
      mediaId: media.id,
      fileName: media.fileName,
      url: media.url,
      size: media.size,
      mimeType: media.mimeType,
    })
    form.extraFileIds = extraFiles.value.map((item) => item.mediaId)
    ElMessage.success('文件已上传到媒体库')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    extraFileUploading.value = false
    input.value = ''
  }
}

function removeExtraFile(mediaId: number): void {
  extraFiles.value = extraFiles.value.filter((item) => item.mediaId !== mediaId)
  form.extraFileIds = extraFiles.value.map((item) => item.mediaId)
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

function openSummaryDialog(): void {
  summaryDraft.value = form.summary
  summaryDialogVisible.value = true
}

function saveSummary(): void {
  form.summary = summaryDraft.value.trim()
  summaryDialogVisible.value = false
}

/** 提交表单：新建或更新文章 */
async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    if (isEdit.value) {
      await updateArticle(articleId.value, { ...form })
      ElMessage.success(form.status === 0 ? '草稿已保存' : isAdmin.value ? '文章更新成功' : '已提交，等待管理员审核')
      await router.push({ name: 'article-list' })
    } else {
      await createArticle({ ...form })
      ElMessage.success(form.status === 0 ? '草稿已保存' : isAdmin.value ? '文章已发布' : '已提交，等待管理员审核')
      await router.push({ name: 'article-list' })
    }
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  void router.push({ name: 'article-list' })
}

onMounted(() => {
  void loadOptions()
  void loadArticle()
})
</script>

<template>
  <section v-loading="loading" class="page-card">
    <h2 class="page-title">{{ pageTitle }}</h2>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <div class="editor">
        <div class="editor__main">
          <el-form-item label="文章标题" prop="title">
            <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入文章标题" />
          </el-form-item>

          <el-form-item label="文章正文" prop="content">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="18"
              placeholder="请输入文章正文内容"
            />
          </el-form-item>

          <!-- 附加内容：仅订阅者及以上权限用户可在文章页面看到 -->
          <el-form-item label="附加内容" prop="extraContent">
            <el-input
              v-model="form.extraContent"
              type="textarea"
              :rows="8"
              placeholder="请输入附加内容（选填）"
            />
            <div class="editor__tip">
              附加内容显示在文章页面的正文下方，仅「下方编辑模块中设置的查看权限」用户可见，未登录用户不可见
            </div>

            <!-- 附加内容附件：上传后保存到媒体库，读者可在文章页面下载 -->
            <div class="editor__files">
              <div class="editor__files-head">
                <span class="editor__files-label">附加内容文件</span>
                <el-button size="small" type="primary" plain :loading="extraFileUploading" @click="extraFileInput?.click()">
                  上传文件
                </el-button>
                <input ref="extraFileInput" type="file" class="editor__files-input" @change="handleExtraFileChange" />
              </div>
              <div v-if="!extraFiles.length" class="editor__tip">暂未上传文件，上传的文件会保存到媒体库并允许读者下载</div>
              <ul v-else class="editor__files-list">
                <li v-for="file in extraFiles" :key="file.mediaId" class="editor__files-item">
                  <span class="editor__files-name" :title="file.fileName">{{ file.fileName }}</span>
                  <span class="editor__files-size">{{ formatFileSize(file.size) }}</span>
                  <el-button link type="danger" @click="removeExtraFile(file.mediaId)">移除</el-button>
                </li>
              </ul>
            </div>
          </el-form-item>
        </div>

        <!-- 编辑模块：状态设置、封面、摘要、分类标签与评论开关 -->
        <aside class="editor__side">
          <el-card shadow="never" class="editor__card">
            <template #header>编辑模块</template>

            <!-- 1. 状态设置 -->
            <el-form-item label="状态设置" prop="status">
              <el-radio-group v-model="form.status" class="editor__status">
                <el-radio v-for="item in statusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </el-radio>
              </el-radio-group>
              <div class="editor__tip">{{ currentStatusTip }}</div>
            </el-form-item>

            <!-- 2. 设置封面（从媒体库选择） -->
            <el-form-item label="设置封面" prop="coverImage">
              <div class="editor__cover">
                <img v-if="form.coverImage" :src="form.coverImage" alt="文章封面" class="editor__cover-img" />
                <div v-else class="editor__cover-img editor__cover-img--empty">未设置封面</div>
                <div class="editor__cover-actions">
                  <el-button size="small" type="primary" plain @click="mediaPickerVisible = true">
                    从媒体库选择
                  </el-button>
                  <el-button v-if="form.coverImage" size="small" @click="removeCover">移除</el-button>
                </div>
              </div>
            </el-form-item>

            <!-- 3. 添加摘要（点击编写） -->
            <el-form-item label="添加摘要" prop="summary">
              <el-button size="small" type="primary" plain @click="openSummaryDialog">编写摘要</el-button>
              <div class="editor__summary" :title="form.summary">
                {{ form.summary || '暂未编写摘要，未填写时自动截取正文前 100 字' }}
              </div>
            </el-form-item>

            <el-form-item label="所属分类" prop="categoryId">
              <el-select v-model="form.categoryId" placeholder="请选择分类（可选）" clearable style="width: 100%">
                <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="文章标签" prop="tagIds">
              <el-select v-model="form.tagIds" multiple filterable placeholder="请选择标签（可多选）" style="width: 100%">
                <el-option v-for="item in tags" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="允许评论" prop="allowComment">
              <div class="editor__switch">
                <el-switch v-model="form.allowComment" />
                <span class="editor__switch-text">{{ form.allowComment ? '允许评论' : '不允许评论' }}</span>
              </div>
              <div class="editor__tip">选择"不允许评论"后，该文章在前台不显示评论区，也无法提交评论</div>
            </el-form-item>

            <!-- 4. 附加内容查看权限 -->
            <el-form-item label="附加内容查看权限" prop="extraViewLevel">
              <el-select v-model="form.extraViewLevel" style="width: 100%">
                <el-option
                  v-for="item in EXTRA_VIEW_LEVELS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
              <div class="editor__tip">
                仅该权限及以上的用户可在文章页面查看附加内容（未登录用户不可查看）
              </div>
            </el-form-item>
          </el-card>

          <div class="editor__actions">
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              {{ form.status === 0 ? '保存草稿' : isAdmin ? (isEdit ? '保存修改' : '发布文章') : '发布' }}
            </el-button>
            <el-button :disabled="submitting" @click="handleCancel">取消</el-button>
          </div>
        </aside>
      </div>
    </el-form>

    <!-- 媒体库选择弹窗 -->
    <MediaPickerDialog v-model="mediaPickerVisible" :selected="form.coverImage" @select="handleCoverSelect" />

    <!-- 摘要编写弹窗 -->
    <el-dialog v-model="summaryDialogVisible" title="编写摘要" width="560px">
      <el-input
        v-model="summaryDraft"
        type="textarea"
        :rows="6"
        maxlength="500"
        show-word-limit
        placeholder="请输入文章摘要，将显示在文章列表与文章详情页"
      />
      <template #footer>
        <el-button @click="summaryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSummary">确定</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  align-items: flex-start;
  gap: 20px;
}

.editor__main {
  flex: 1;
  min-width: 0;
}

.editor__side {
  width: 340px;
  flex: 0 0 340px;
}

.editor__card :deep(.el-form-item) {
  margin-bottom: 16px;
}

.editor__status {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.editor__tip {
  margin-top: 6px;
  color: #c0c4cc;
  font-size: 12px;
  line-height: 1.6;
}

.editor__cover-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.editor__cover-img--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  background-color: #ffffff;
}

.editor__cover-actions {
  margin-top: 8px;
}

.editor__summary {
  margin-top: 8px;
  max-height: 72px;
  overflow: hidden;
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.editor__files {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e4e7ed;
}

.editor__files-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor__files-label {
  color: #606266;
  font-size: 13px;
}

.editor__files-input {
  display: none;
}

.editor__files-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.editor__files-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed #ebeef5;
  font-size: 13px;
}

.editor__files-item:last-child {
  border-bottom: none;
}

.editor__files-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: #303133;
}

.editor__files-size {
  color: #909399;
  font-size: 12px;
}

.editor__switch {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editor__switch-text {
  color: #606266;
  font-size: 13px;
}

.editor__actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .editor {
    flex-direction: column;
  }

  .editor__side {
    width: 100%;
    flex: 1 1 auto;
  }
}
</style>
