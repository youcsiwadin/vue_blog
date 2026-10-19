/** 角色定义：1管理员，2作者，3订阅者，4游客 */
export const ROLE_ADMIN = 1
export const ROLE_AUTHOR = 2
export const ROLE_SUBSCRIBER = 3
export const ROLE_GUEST = 4

/** 角色存放在 localStorage 的键（供路由守卫同步读取） */
export const ROLE_STORAGE_KEY = 'java_blog_role'

const ROLE_LABELS: Record<number, string> = {
  [ROLE_ADMIN]: '管理员',
  [ROLE_AUTHOR]: '作者',
  [ROLE_SUBSCRIBER]: '订阅者',
  [ROLE_GUEST]: '游客',
}

export function roleLabel(role?: number | null): string {
  if (role === null || role === undefined) {
    return '未登录'
  }
  return ROLE_LABELS[role] ?? '未知'
}

export function saveStoredRole(role: number | null | undefined): void {
  if (role === null || role === undefined) {
    localStorage.removeItem(ROLE_STORAGE_KEY)
    return
  }
  localStorage.setItem(ROLE_STORAGE_KEY, String(role))
}

export function getStoredRole(): number | null {
  const raw = localStorage.getItem(ROLE_STORAGE_KEY)
  if (!raw) {
    return null
  }
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** 管理员：拥有全部功能 */
export function isAdminRole(role?: number | null): boolean {
  return role === ROLE_ADMIN
}

/** 可写文章：管理员与作者 */
export function canWriteArticle(role?: number | null): boolean {
  return role === ROLE_ADMIN || role === ROLE_AUTHOR
}

/** 可进入博客管理系统：管理员、作者、订阅者（游客仅能访问博客） */
export function canEnterAdmin(role?: number | null): boolean {
  return role === ROLE_ADMIN || role === ROLE_AUTHOR || role === ROLE_SUBSCRIBER
}

/**
 * 附加内容查看权限等级：与用户角色数值一致（越小权限越高），
 * 文章可设置为「该等级及以上」的用户可查看附加内容。
 */
export const EXTRA_VIEW_LEVELS = [
  { value: ROLE_GUEST, label: '游客及以上可查看' },
  { value: ROLE_SUBSCRIBER, label: '订阅者及以上可查看' },
  { value: ROLE_AUTHOR, label: '作者及以上可查看' },
  { value: ROLE_ADMIN, label: '仅管理员可查看' },
] as const

/** 默认附加内容查看权限：订阅者及以上 */
export const DEFAULT_EXTRA_VIEW_LEVEL = ROLE_SUBSCRIBER

/** 各角色的默认落地页 */
export function homeRouteOf(role?: number | null): string {
  switch (role) {
    case ROLE_ADMIN:
      return 'dashboard'
    case ROLE_AUTHOR:
      return 'article-list'
    case ROLE_SUBSCRIBER:
      return 'comment-list'
    default:
      return 'blog-home'
  }
}
