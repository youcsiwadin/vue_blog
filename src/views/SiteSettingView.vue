<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { fetchSiteSetting, saveSiteSetting } from '@/api/setting'
import { uploadImage } from '@/api/file'
import { updateBloggerInfo } from '@/api/user'
import { useSiteStore } from '@/stores/site'
import { useUserStore } from '@/stores/user'
import type { SiteSetting } from '@/types/api'

const { setSettings } = useSiteStore()
const { state: account, isAdmin, ensureUserLoaded, setUser } = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)

const form = reactive<SiteSetting>({
  siteName: 'JAVA博客网站',
  siteDescription: '',
  footerText: '',
  primaryColor: '#409eff',
  themeStyle: 'light',
  logoUrl: '',
  coverTitle: '博客',
  coverSubtitle: '我的博客',
  coverImage: '',
  nightCoverImage: '',
  nightModeSwitch: 'day',
  notice: '',
  noticeBoard: '',
  authorName: '御园千绫',
  authorAvatar: '',
})

/** 图片上传（封面 / 头像） */
const coverInput = ref<HTMLInputElement | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const nightCoverInput = ref<HTMLInputElement | null>(null)
const uploadingCover = ref(false)
const uploadingNightCover = ref(false)
const uploadingAvatar = ref(false)

/** 博主信息（管理员与作者均可设置自己的博主名字与头像） */
const bloggerForm = reactive({ bloggerName: '', bloggerAvatar: '' })
const bloggerInput = ref<HTMLInputElement | null>(null)
const uploadingBloggerAvatar = ref(false)
const savingBlogger = ref(false)

async function loadBloggerInfo(): Promise<void> {
  await ensureUserLoaded()
  // 管理员未单独设置过博主信息时，默认显示站点当前的博主名字与头像
  const fallbackName = isAdmin.value ? form.authorName : ''
  const fallbackAvatar = isAdmin.value ? form.authorAvatar : ''
  bloggerForm.bloggerName = account.user?.bloggerName || fallbackName || account.user?.nickname || ''
  bloggerForm.bloggerAvatar = account.user?.bloggerAvatar || fallbackAvatar || account.user?.avatar || ''
}

async function handleBloggerAvatarChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  uploadingBloggerAvatar.value = true
  try {
    bloggerForm.bloggerAvatar = await uploadImage(file)
    ElMessage.success('博主头像上传成功')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    uploadingBloggerAvatar.value = false
    input.value = ''
  }
}

async function handleSaveBlogger(): Promise<void> {
  if (!bloggerForm.bloggerName.trim()) {
    ElMessage.warning('请输入博主名字')
    return
  }
  savingBlogger.value = true
  try {
    const user = await updateBloggerInfo({
      bloggerName: bloggerForm.bloggerName.trim(),
      bloggerAvatar: bloggerForm.bloggerAvatar,
    })
    setUser(user)
    // 管理员保存后会同步站点级博主信息，这里刷新站点设置表单
    await loadSettings()
    ElMessage.success('博主信息已保存')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    savingBlogger.value = false
  }
}

async function handleImageChange(
  event: Event,
  target: 'cover' | 'nightCover' | 'avatar',
): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  const uploading =
    target === 'cover' ? uploadingCover : target === 'nightCover' ? uploadingNightCover : uploadingAvatar
  uploading.value = true
  try {
    const url = await uploadImage(file)
    if (target === 'cover') {
      form.coverImage = url
      ElMessage.success('封面图片上传成功')
    } else if (target === 'nightCover') {
      form.nightCoverImage = url
      ElMessage.success('夜间封面图片上传成功')
    } else {
      form.authorAvatar = url
      ElMessage.success('头像上传成功')
    }
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    uploading.value = false
    input.value = ''
  }
}

/** 夜间模式（白天/黑夜）与切换规则保持同步 */
function handleThemeStyleChange(value: string | number | boolean | undefined): void {
  form.nightModeSwitch = value === 'dark' ? 'night' : 'day'
}

/** 根据切换规则刷新"白天/黑夜"当前值（根据时间时按 22:00~7:00 计算） */
function syncThemeStyle(): void {
  if (form.nightModeSwitch === 'time') {
    const hour = new Date().getHours()
    form.themeStyle = hour >= 22 || hour < 7 ? 'dark' : 'light'
  } else {
    form.themeStyle = form.nightModeSwitch === 'night' ? 'dark' : 'light'
  }
}

const rules: FormRules = {
  siteName: [
    { required: true, message: '请输入站点名称', trigger: 'blur' },
    { max: 50, message: '站点名称不能超过 50 个字符', trigger: 'blur' },
  ],
  primaryColor: [
    { required: true, message: '请选择主题主色调', trigger: 'change' },
    { pattern: /^#[0-9a-fA-F]{6}$/, message: '主色调格式应为 #RRGGBB', trigger: 'change' },
  ],
}

/** 预选颜色（圆点选择） */
const presetColors = [
  { label: '粉', value: '#fa7298' },
  { label: '水鸭青', value: '#009688' },
  { label: '蓝灰', value: '#607d8b' },
  { label: '天蓝', value: '#2196f3' },
  { label: '靛蓝', value: '#3f51b5' },
  { label: '橙', value: '#ff9700' },
  { label: '紫', value: '#673bb7' },
]

async function loadSettings(): Promise<void> {
  loading.value = true
  try {
    const settings = await fetchSiteSetting()
    Object.assign(form, settings)
    setSettings(settings)
    syncThemeStyle()
  } catch {
    // 使用默认设置
  } finally {
    loading.value = false
  }
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  submitting.value = true
  try {
    const settings = await saveSiteSetting({ ...form })
    syncThemeStyle()
    setSettings(settings)
      ElMessage.success('站点内容设置已保存')
  } catch {
    // 错误提示已在响应拦截器中统一处理
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await loadSettings()
  await loadBloggerInfo()
})
</script>

<template>
  <section v-loading="loading" class="page-card">
    <h2 class="page-title">站点内容设置</h2>

    <!-- 博主信息：管理员与作者都可以设置自己的博主名字与头像 -->
    <el-card shadow="never" class="setting-block">
      <template #header>博主信息</template>

      <el-form label-width="110px">
        <el-form-item label="博主名字">
          <el-input
            v-model="bloggerForm.bloggerName"
            maxlength="50"
            placeholder="展示在博客的文章作者信息与用户信息模块"
          />
        </el-form-item>

        <el-form-item label="博主头像">
          <div class="setting-form__upload">
            <el-avatar v-if="bloggerForm.bloggerAvatar" :size="64" :src="bloggerForm.bloggerAvatar" />
            <el-avatar v-else :size="64" class="setting-form__avatar-empty">博</el-avatar>
            <div class="setting-form__upload-actions">
              <el-button :loading="uploadingBloggerAvatar" @click="bloggerInput?.click()">上传头像</el-button>
              <el-button v-if="bloggerForm.bloggerAvatar" @click="bloggerForm.bloggerAvatar = ''">移除</el-button>
            </div>
            <input
              ref="bloggerInput"
              type="file"
              accept="image/*"
              class="setting-form__file"
              @change="handleBloggerAvatarChange"
            />
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="savingBlogger" @click="handleSaveBlogger">保存博主信息</el-button>
        </el-form-item>
      </el-form>

    </el-card>

    <el-form
      v-if="isAdmin"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="110px"
      class="setting-form"
      @submit.prevent
    >
      <el-form-item label="站点名称" prop="siteName">
        <el-input v-model="form.siteName" maxlength="50" />
      </el-form-item>

      <el-form-item label="站点副标题" prop="siteDescription">
        <el-input v-model="form.siteDescription" maxlength="200" />
      </el-form-item>

      <el-form-item label="Logo 地址" prop="logoUrl">
        <el-input v-model="form.logoUrl" placeholder="选填，图片地址" />
      </el-form-item>

      <el-form-item label="页脚文字" prop="footerText">
        <el-input v-model="form.footerText" maxlength="200" placeholder="显示在页面底部" />
      </el-form-item>

      <el-form-item label="主题主色调" prop="primaryColor">
        <div class="setting-form__color">
          <el-color-picker v-model="form.primaryColor" />
          <span class="setting-form__color-text">{{ form.primaryColor }}</span>
          <el-button link type="primary" @click="form.primaryColor = '#409eff'">恢复默认</el-button>
        </div>

        <!-- 预选颜色：圆形色块 -->
        <div class="setting-form__presets">
          <button
            v-for="item in presetColors"
            :key="item.value"
            type="button"
            class="setting-form__preset"
            :class="{ 'setting-form__preset--active': form.primaryColor.toLowerCase() === item.value }"
            :style="{ backgroundColor: item.value }"
            :title="`${item.label} ${item.value}`"
            @click="form.primaryColor = item.value"
          ></button>
        </div>
      </el-form-item>

      <el-form-item label="夜间模式" prop="themeStyle">
        <el-radio-group v-model="form.themeStyle" @change="handleThemeStyleChange">
          <el-radio value="light">白天</el-radio>
          <el-radio value="dark">黑夜</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="夜间模式切换" prop="nightModeSwitch">
        <el-radio-group v-model="form.nightModeSwitch" class="setting-form__night-switch" @change="syncThemeStyle">
          <el-radio value="time">根据时间切换（22:00~7:00）</el-radio>
          <el-radio value="night">保持夜间模式</el-radio>
          <el-radio value="day">保持白天模式</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-divider content-position="left">博客封面</el-divider>

      <el-form-item label="封面标题" prop="coverTitle">
        <el-input v-model="form.coverTitle" maxlength="50" placeholder="默认：博客" />
      </el-form-item>

      <el-form-item label="封面副标题" prop="coverSubtitle">
        <el-input v-model="form.coverSubtitle" maxlength="100" placeholder="默认：我的博客" />
      </el-form-item>

      <el-form-item label="封面图片" prop="coverImage">
        <div class="setting-form__upload">
          <img v-if="form.coverImage" :src="form.coverImage" class="setting-form__preview" alt="封面预览" />
          <div v-else class="setting-form__preview setting-form__preview--empty"></div>
          <div class="setting-form__upload-actions">
            <el-button :loading="uploadingCover" @click="coverInput?.click()">上传白天封面</el-button>
            <el-button v-if="form.coverImage" @click="form.coverImage = ''">移除</el-button>
          </div>
          <input
            ref="coverInput"
            type="file"
            accept="image/*"
            class="setting-form__file"
            @change="handleImageChange($event, 'cover')"
          />
        </div>
      </el-form-item>

      <el-form-item label="夜间封面" prop="nightCoverImage">
        <div class="setting-form__upload">
          <img
            v-if="form.nightCoverImage"
            :src="form.nightCoverImage"
            class="setting-form__preview"
            alt="夜间封面预览"
          />
          <div v-else class="setting-form__preview setting-form__preview--empty"></div>
          <div class="setting-form__upload-actions">
            <el-button :loading="uploadingNightCover" @click="nightCoverInput?.click()">
              上传夜间封面
            </el-button>
            <el-button v-if="form.nightCoverImage" @click="form.nightCoverImage = ''">移除</el-button>
          </div>
          <input
            ref="nightCoverInput"
            type="file"
            accept="image/*"
            class="setting-form__file"
            @change="handleImageChange($event, 'nightCover')"
          />
        </div>
      </el-form-item>

      <el-divider content-position="left">公告</el-divider>

      <el-form-item label="公告" prop="notice">
        <el-input
          v-model="form.notice"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="显示在博客首页左侧的「公告」模块"
        />
      </el-form-item>

      <el-form-item label="公告栏" prop="noticeBoard">
        <el-input
          v-model="form.noticeBoard"
          type="textarea"
          :rows="4"
          maxlength="1000"
          show-word-limit
          placeholder="每行一条公告，显示在博客首页左侧的「公告栏」模块"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存设置</el-button>
      </el-form-item>
    </el-form>

  </section>
</template>

<style scoped>
.setting-form {
  max-width: 620px;
}

.setting-form__color {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-form__color-text {
  color: #606266;
  font-size: 13px;
}

/* 预选颜色：圆形色块 */
.setting-form__presets {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.setting-form__preset {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #dcdfe6;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.setting-form__preset:hover {
  transform: scale(1.12);
  box-shadow: 0 0 0 1px #909399;
}

.setting-form__preset--active {
  box-shadow: 0 0 0 2px #409eff;
  transform: scale(1.12);
}

.setting-form__upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 博主信息模块与站点设置表单之间的间距 */
.setting-block {
  margin-bottom: 20px;
}

.setting-form__night-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}

.setting-form__preview {
  width: 220px;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.setting-form__preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  background-color: #ffffff;
}

.setting-form__upload-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.setting-form__file {
  display: none;
}

.setting-form__avatar-empty {
  background-color: var(--el-color-primary);
  color: #ffffff;
}
</style>
