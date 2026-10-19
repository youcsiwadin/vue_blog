import { requestData } from '@/api/request'
import type { Moment, PageResult } from '@/types/api'

/** 分页查询说说 GET /api/moments */
export function fetchMomentPage(params: {
  page: number
  pageSize: number
}): Promise<PageResult<Moment>> {
  return requestData<PageResult<Moment>>({
    url: '/moments',
    method: 'get',
    params,
  })
}

/** 发表说说 POST /api/moments */
export function createMoment(content: string): Promise<number> {
  return requestData<number>({
    url: '/moments',
    method: 'post',
    data: { content },
  })
}

/** 删除说说 DELETE /api/moments/{id} */
export function deleteMoment(id: number): Promise<null> {
  return requestData<null>({
    url: `/moments/${id}`,
    method: 'delete',
  })
}
