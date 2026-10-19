import { requestData, requestResult } from '@/api/request'
import type { ApiResult } from '@/types/api'
import type { LikeNotificationDetailVO } from '@/types/notification'

/**
 * 当前用户全部未读通知数（铃铛角标）
 * GET /api/notifications/unread-count
 */
export function getUnreadCount(): Promise<number> {
  return requestData<number>({
    url: '/notifications/unread-count',
    method: 'get',
  })
}

/**
 * 作者总未读点赞数
 * GET /api/notifications/unread-like-count
 * 返回 number
 */
export function getUnreadLikeCount(): Promise<number> {
  return requestData<number>({
    url: '/notifications/unread-like-count',
    method: 'get',
  })
}

/**
 * 作者未读点赞明细
 * GET /api/notifications/unread-like-details
 */
export function getUnreadLikeDetails(): Promise<LikeNotificationDetailVO[]> {
  return requestData<LikeNotificationDetailVO[]>({
    url: '/notifications/unread-like-details',
    method: 'get',
  })
}

/**
 * 全部标记已读（会清零 Redis 未读计数）
 * PUT /api/notifications/read-all
 */
export function markAllRead(): Promise<ApiResult<void>> {
  return requestResult<void>({
    url: '/notifications/read-all',
    method: 'put',
  })
}

/**
 * 标记单条已读
 * PUT /api/notifications/{id}/read
 */
export function markRead(id: number): Promise<ApiResult<void>> {
  return requestResult<void>({
    url: `/notifications/${id}/read`,
    method: 'put',
  })
}
