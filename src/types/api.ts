/** 后端统一响应结构：{ code, message, data } */
export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

/** 分页响应结构 */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  pageSize: number
}

/** 用户信息（不含密码） */
export interface UserInfo {
  id: number
  username: string
  nickname: string
  email: string | null
  avatar: string | null
  status: number
  /** 角色：1管理员，2作者，3订阅者，4游客 */
  role: number
  /** 博主名字（博客展示用，可空） */
  bloggerName: string | null
  /** 博主头像（博客展示用，可空） */
  bloggerAvatar: string | null
}

/** 登录响应数据 */
export interface LoginData {
  token: string
  user: UserInfo
}

/** 登录请求参数 */
export interface LoginPayload {
  username: string
  password: string
}

/** 注册请求参数 */
export interface RegisterPayload {
  username: string
  password: string
  nickname?: string
  email?: string
}

/** 文章数据 */
export interface Article {
  id: number
  userId: number
  categoryId: number | null
  categoryName: string | null
  tags: TagBrief[]
  title: string
  summary: string
  content?: string | null
  /** 附加内容（仅订阅者及以上权限用户可见，游客与未登录用户为 null） */
  extraContent?: string | null
  /** 附加内容查看权限：1仅管理员，2作者及以上，3订阅者及以上，4游客及以上 */
  extraViewLevel?: number
  /** 该文章存在附加内容但当前用户权限不足（为 true 时标题可见、内容不可见） */
  extraLocked?: boolean
  /** 附加内容附件（仅有权限时返回） */
  extraFiles?: ExtraFile[]
  coverImage: string | null
  /** 文章状态：0草稿，1待审核，2已发布 */
  status: number
  allowComment: number
  viewCount: number
  /** 点赞数 */
  likeCount: number
  /** 当前登录用户是否已点赞（未登录恒为 false） */
  liked?: boolean
  wordCount: number
  createTime: string
  updateTime: string
  authorName: string | null
  authorAvatar: string | null
  authorArticleCount: number | null
}

/** 文章点赞结果 */
export interface ArticleLikeResult {
  articleId: number
  likeCount: number
  liked: boolean
}

/** 标签简要信息 */
export interface TagBrief {
  id: number
  name: string
}

/** 附加内容附件（来自媒体库） */
export interface ExtraFile {
  /** 媒体库文件ID */
  mediaId: number
  fileName: string
  url: string
  size: number
  mimeType: string
}

/** 文章列表查询参数 */
export interface ArticleQuery {
  page: number
  pageSize: number
  keyword?: string
  categoryId?: number
  tagId?: number
  authorId?: number
}

/** 文章新建 / 编辑请求参数 */
export interface ArticlePayload {
  categoryId: number | null
  tagIds: number[]
  coverImage: string
  status: number
  allowComment: boolean
  title: string
  summary: string
  content: string
  /** 附加内容（选填，仅订阅者及以上权限用户可在文章页面看到；快速草稿等场景可不传） */
  extraContent?: string
  /** 附加内容查看权限：1仅管理员，2作者及以上，3订阅者及以上，4游客及以上 */
  extraViewLevel?: number
  /** 附加内容附件对应的媒体库文件ID列表 */
  extraFileIds?: number[]
}

/** 文章管理筛选标签数量统计 */
export interface ArticleStats {
  allCount: number
  publishedCount: number
  pendingCount: number
  draftCount: number
}

/** 媒体库图片 */
export interface Media {
  id: number
  fileName: string
  url: string
  size: number
  mimeType: string
  uploaderId: number | null
  createTime: string
}

/** 分类目录 */
export interface Category {
  id: number
  name: string
  slug: string
  description: string
  sortOrder: number
  articleCount: number
  createTime: string
  updateTime: string
}

/** 分类新建 / 编辑请求参数 */
export interface CategoryPayload {
  name: string
  slug: string
  description: string
  sortOrder: number
}

/** 标签 */
export interface Tag {
  id: number
  name: string
  articleCount: number
  createTime: string
  updateTime: string
}

/** 标签新建 / 编辑请求参数 */
export interface TagPayload {
  name: string
}

/** 独立页面 */
export interface PageItem {
  id: number
  title: string
  slug: string | null
  content?: string | null
  status: number
  createTime: string
  updateTime: string
}

/** 页面新建 / 编辑请求参数 */
export interface PagePayload {
  title: string
  slug: string
  content: string
  status: number
}

/** 评论 */
export interface Comment {
  id: number
  articleId: number
  articleTitle: string | null
  userId: number | null
  userName: string | null
  nickname: string
  email: string | null
  content: string
  status: number
  createTime: string
  /** 移入回收站的时间（未删除时为 null） */
  deleteTime: string | null
  /** 距离自动彻底删除的剩余秒数（仅回收站中的评论有值） */
  remainingSeconds: number | null
}

/** 评论提交请求参数 */
export interface CommentPayload {
  articleId: number
  nickname: string
  email: string
  content: string
}

/** 评论管理筛选标签数量统计 */
export interface CommentStats {
  allCount: number
  mineCount: number
  pendingCount: number
  approvedCount: number
  trashCount: number
}

/** 说说 */
export interface Moment {
  id: number
  userId: number
  authorName: string | null
  content: string
  createTime: string
}

/** 站点主题设置 */
export interface SiteSetting {
  siteName: string
  siteDescription: string
  footerText: string
  primaryColor: string
  themeStyle: string
  logoUrl: string
  coverTitle: string
  coverSubtitle: string
  coverImage: string
  nightCoverImage: string
  nightModeSwitch: string
  notice: string
  noticeBoard: string
  authorName: string
  authorAvatar: string
}

/** 博客站点左侧栏数据 */
export interface BlogSidebar {
  authorName: string
  authorAvatar: string
  articleCount: number
  categoryCount: number
  tagCount: number
  categories: TagBrief[]
  tags: TagBrief[]
}

/** 博客作者信息（文章作者 / 博主） */
export interface BlogAuthor {
  id: number
  name: string
  avatar: string | null
  articleCount: number
}

/** 留言板留言 */
export interface GuestMessage {
  id: number
  nickname: string
  email: string | null
  content: string
  createTime: string
}

/** 留言提交请求参数 */
export interface GuestMessagePayload {
  nickname: string
  email: string
  content: string
}

/** 后台添加用户请求参数 */
export interface UserCreatePayload {
  username: string
  password: string
  nickname: string
  email: string
  status: number
}

/** 个人资料修改请求参数 */
export interface ProfilePayload {
  nickname: string
  email: string
  avatar: string
}

/** 修改密码请求参数 */
export interface PasswordPayload {
  oldPassword: string
  newPassword: string
}

/** 首页仪表盘统计 */
export interface DashboardSummary {
  articleCount: number
  categoryCount: number
  tagCount: number
  pageCount: number
  commentCount: number
  pendingCommentCount: number
  momentCount: number
  userCount: number
  recentArticles: Article[]
  recentComments: Comment[]
}

/** 博客导航菜单项（对应 api/menu.ts） */
export interface MenuItem {
  id: number
  targetType: string
  targetId: number
  title?: string
  url?: string
  sortOrder?: number
  createTime?: string
}
