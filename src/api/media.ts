import { requestData } from '@/api/request'
import type { Media, PageResult } from '@/types/api'

/** 上传图片到媒体库（最大 40MB） POST /api/media/upload */
export function uploadMedia(file: File): Promise<Media> {
  const formData = new FormData()
  formData.append('file', file)
  return requestData<Media>({
    url: '/media/upload',
    method: 'post',
    data: formData,
    // 覆盖实例默认的 application/json，交由浏览器设置 multipart 边界
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 上传附加内容附件到媒体库（最大 40MB） POST /api/media/files */
export function uploadMediaFile(file: File): Promise<Media> {
  const formData = new FormData()
  formData.append('file', file)
  return requestData<Media>({
    url: '/media/files',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 分页查询媒体库 GET /api/media */
export function fetchMediaPage(params: {
  page: number
  pageSize: number
}): Promise<PageResult<Media>> {
  return requestData<PageResult<Media>>({
    url: '/media',
    method: 'get',
    params,
  })
}

/** 删除媒体（同时删除文件） DELETE /api/media/{id} */
export function deleteMedia(id: number): Promise<null> {
  return requestData<null>({
    url: `/media/${id}`,
    method: 'delete',
  })
}
