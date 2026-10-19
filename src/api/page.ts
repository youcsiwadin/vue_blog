import { requestData } from '@/api/request'
import type { PageItem, PagePayload, PageResult } from '@/types/api'

/** 分页查询页面 GET /api/pages */
export function fetchPageList(params: {
  page: number
  pageSize: number
  keyword?: string
  status?: number
}): Promise<PageResult<PageItem>> {
  return requestData<PageResult<PageItem>>({
    url: '/pages',
    method: 'get',
    params,
  })
}

/** 页面详情 GET /api/pages/{id} */
export function fetchPageDetail(id: number): Promise<PageItem> {
  return requestData<PageItem>({
    url: `/pages/${id}`,
    method: 'get',
  })
}

/** 新建页面 POST /api/pages */
export function createPage(payload: PagePayload): Promise<PageItem> {
  return requestData<PageItem>({
    url: '/pages',
    method: 'post',
    data: payload,
  })
}

/** 编辑页面 PUT /api/pages/{id} */
export function updatePage(id: number, payload: PagePayload): Promise<PageItem> {
  return requestData<PageItem>({
    url: `/pages/${id}`,
    method: 'put',
    data: payload,
  })
}

/** 删除页面 DELETE /api/pages/{id} */
export function deletePage(id: number): Promise<null> {
  return requestData<null>({
    url: `/pages/${id}`,
    method: 'delete',
  })
}
