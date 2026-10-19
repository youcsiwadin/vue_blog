import { requestData } from '@/api/request'
import type { BlogAuthor, BlogSidebar, GuestMessage, GuestMessagePayload, PageResult } from '@/types/api'

/** 博客站点左侧栏数据 GET /api/blog/sidebar */
export function fetchBlogSidebar(): Promise<BlogSidebar> {
  return requestData<BlogSidebar>({
    url: '/blog/sidebar',
    method: 'get',
  })
}

/** 查询指定作者信息 GET /api/blog/authors/{id} */
export function fetchBlogAuthor(id: number): Promise<BlogAuthor> {
  return requestData<BlogAuthor>({
    url: `/blog/authors/${id}`,
    method: 'get',
  })
}

/** 分页查询留言 GET /api/guest-messages */
export function fetchGuestMessages(params: {
  page: number
  pageSize: number
}): Promise<PageResult<GuestMessage>> {
  return requestData<PageResult<GuestMessage>>({
    url: '/guest-messages',
    method: 'get',
    params,
  })
}

/** 提交留言 POST /api/guest-messages */
export function createGuestMessage(payload: GuestMessagePayload): Promise<number> {
  return requestData<number>({
    url: '/guest-messages',
    method: 'post',
    data: payload,
  })
}
