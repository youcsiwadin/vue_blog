import { requestData } from '@/api/request'

/**
 * 上传图片，返回可直接访问的图片地址。
 * POST /api/files/upload
 */
export function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  return requestData<string>({
    url: '/files/upload',
    method: 'post',
    data: formData,
    // 覆盖实例默认的 application/json，交由浏览器设置 multipart 边界
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
