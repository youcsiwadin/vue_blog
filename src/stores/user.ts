import { computed, reactive } from 'vue'

import { getCurrentUser, login as loginApi, register as registerApi } from '@/api/user'
import { TOKEN_STORAGE_KEY } from '@/api/request'
import { canEnterAdmin, canWriteArticle, isAdminRole, saveStoredRole } from '@/utils/role'
import type { LoginPayload, RegisterPayload, UserInfo } from '@/types/api'

const state = reactive({
  token: localStorage.getItem(TOKEN_STORAGE_KEY) ?? '',
  user: null as UserInfo | null,
  loaded: false,
})

const isLoggedIn = computed(() => state.token.length > 0)

function setToken(token: string): void {
  state.token = token
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

/** 当前用户角色（未登录为 null） */
const role = computed(() => state.user?.role ?? null)

const isAdmin = computed(() => isAdminRole(role.value))

const isAuthor = computed(() => canWriteArticle(role.value))

const canUseAdmin = computed(() => canEnterAdmin(role.value))

/** 退出登录：清除本地 Token 与用户信息 */
function logout(): void {
  state.token = ''
  state.user = null
  state.loaded = true
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  saveStoredRole(null)
}

/** 登录并保存 Token */
async function login(payload: LoginPayload): Promise<UserInfo> {
  const data = await loginApi(payload)
  setToken(data.token)
  state.user = data.user
  state.loaded = true
  saveStoredRole(data.user.role)
  return data.user
}

/** 注册并自动登录 */
async function register(payload: RegisterPayload): Promise<UserInfo> {
  const user = await registerApi(payload)
  await login({ username: payload.username, password: payload.password })
  return user
}

/** 拉取当前登录用户信息（用于刷新页面后恢复登录态） */
async function ensureUserLoaded(): Promise<void> {
  if (!state.token || state.loaded) {
    return
  }
  try {
    state.user = await getCurrentUser()
    saveStoredRole(state.user.role)
  } catch {
    logout()
  } finally {
    state.loaded = true
  }
}

/** 更新本地保存的当前用户信息（个人资料修改后调用） */
function setUser(user: UserInfo): void {
  state.user = user
  state.loaded = true
  saveStoredRole(user.role)
}

export function useUserStore() {
  return {
    state,
    isLoggedIn,
    role,
    isAdmin,
    isAuthor,
    canUseAdmin,
    login,
    register,
    logout,
    ensureUserLoaded,
    setUser,
  }
}
