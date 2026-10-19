import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

import type { ApiResult } from '@/types/api'

/** Token 在 localStorage 中的存储键 */
export const TOKEN_STORAGE_KEY = 'java_blog_token'

/** 全局唯一的 Axios 实例 */
const instance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/** 请求拦截：自动携带登录 Token */
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/** 响应拦截：统一处理 HTTP 异常 */
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResult<unknown>>) => response,
  (error: AxiosError<ApiResult<unknown>>) => {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      ElMessage.error(message ?? '登录状态已失效，请重新登录')
    } else if (status === 403) {
      ElMessage.error(message ?? '没有操作权限')
    } else if (status === 404) {
      ElMessage.error(message ?? '请求的数据不存在')
    } else if (status === 400) {
      ElMessage.error(message ?? '请求参数不正确')
    } else if (status && status >= 500) {
      ElMessage.error(message ?? '服务器异常，请稍后重试')
    } else {
      ElMessage.error('网络异常，请检查后端服务是否已启动')
    }
    return Promise.reject(error)
  },
)

/**
 * 发起请求并返回后端统一响应结构。
 */
async function requestApi<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  const response = await instance.request<ApiResult<T>>(config)
  return response.data
}

/**
 * 发起请求并直接返回业务数据 data。
 */
export async function requestData<T>(config: AxiosRequestConfig): Promise<T> {
  const result = await requestApi<T>(config)
  return result.data
}

/**
 * 发起请求并返回后端完整响应（含 message）。
 *
 * 用于需要直接展示后端提示文案的场景，例如评论提交后展示
 * 「已自动通过审核 / 等待审核」这类由服务端决定的业务提示。
 */
export async function requestResult<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
  return requestApi<T>(config)
}

/**
 * 发起请求并返回二进制内容（用于文件下载）。
 */
export async function requestBlob(config: AxiosRequestConfig): Promise<Blob> {
  const response = await instance.request<Blob>({ ...config, responseType: 'blob' })
  return response.data
}
