import { requestData } from '@/api/request'
import type {
  LoginData,
  LoginPayload,
  PageResult,
  PasswordPayload,
  ProfilePayload,
  RegisterPayload,
  UserCreatePayload,
  UserInfo,
} from '@/types/api'

/** 用户注册 POST /api/users/register */
export function register(payload: RegisterPayload): Promise<UserInfo> {
  return requestData<UserInfo>({
    url: '/users/register',
    method: 'post',
    data: payload,
  })
}

/** 用户登录 POST /api/users/login */
export function login(payload: LoginPayload): Promise<LoginData> {
  return requestData<LoginData>({
    url: '/users/login',
    method: 'post',
    data: payload,
  })
}

/** 查询当前登录用户 GET /api/users/me */
export function getCurrentUser(): Promise<UserInfo> {
  return requestData<UserInfo>({
    url: '/users/me',
    method: 'get',
  })
}

/** 分页查询用户列表 GET /api/users */
export function fetchUserPage(params: {
  page: number
  pageSize: number
  keyword?: string
}): Promise<PageResult<UserInfo>> {
  return requestData<PageResult<UserInfo>>({
    url: '/users',
    method: 'get',
    params,
  })
}

/** 后台添加用户 POST /api/users */
export function createUser(payload: UserCreatePayload): Promise<UserInfo> {
  return requestData<UserInfo>({
    url: '/users',
    method: 'post',
    data: payload,
  })
}

/** 启用 / 禁用用户 PATCH /api/users/{id}/status */
export function updateUserStatus(id: number, status: number): Promise<null> {
  return requestData<null>({
    url: `/users/${id}/status`,
    method: 'patch',
    data: { status },
  })
}

/** 修改用户角色 PUT /api/users/{id}/role */
export function updateUserRole(id: number, role: number): Promise<null> {
  return requestData<null>({
    url: `/users/${id}/role`,
    method: 'put',
    data: { role },
  })
}

/** 删除用户账号（逻辑删除） DELETE /api/users/{id} */
export function deleteUser(id: number): Promise<null> {
  return requestData<null>({
    url: `/users/${id}`,
    method: 'delete',
  })
}

/** 修改个人资料 PUT /api/users/me */
export function updateProfile(payload: ProfilePayload): Promise<UserInfo> {
  return requestData<UserInfo>({
    url: '/users/me',
    method: 'put',
    data: payload,
  })
}

/** 修改密码 PUT /api/users/me/password */
export function changePassword(payload: PasswordPayload): Promise<null> {
  return requestData<null>({
    url: '/users/me/password',
    method: 'put',
    data: payload,
  })
}

/** 保存博主信息（博主名字 / 头像） PUT /api/users/me/blogger */
export function updateBloggerInfo(payload: {
  bloggerName: string
  bloggerAvatar: string
}): Promise<UserInfo> {
  return requestData<UserInfo>({
    url: '/users/me/blogger',
    method: 'put',
    data: payload,
  })
}
