import { requestData } from '@/api/request'
import type { Tag, TagPayload } from '@/types/api'

/** 查询全部标签 GET /api/tags */
export function fetchTags(): Promise<Tag[]> {
  return requestData<Tag[]>({
    url: '/tags',
    method: 'get',
  })
}

/** 新建标签 POST /api/tags */
export function createTag(payload: TagPayload): Promise<Tag> {
  return requestData<Tag>({
    url: '/tags',
    method: 'post',
    data: payload,
  })
}

/** 编辑标签 PUT /api/tags/{id} */
export function updateTag(id: number, payload: TagPayload): Promise<Tag> {
  return requestData<Tag>({
    url: `/tags/${id}`,
    method: 'put',
    data: payload,
  })
}

/** 删除标签 DELETE /api/tags/{id} */
export function deleteTag(id: number): Promise<null> {
  return requestData<null>({
    url: `/tags/${id}`,
    method: 'delete',
  })
}
