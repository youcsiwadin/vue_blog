import { requestData, requestResult } from '@/api/request'
import type { ApiResult, Comment, CommentPayload, CommentStats, PageResult } from '@/types/api'

/** 分页查询评论 GET /api/comments */
export function fetchCommentPage(params: {
  page: number
  pageSize: number
  status?: number
  keyword?: string
  /** 0 正常评论，1 回收站 */
  deleted?: number
  /** 只看我发表的评论 */
  mine?: boolean
}): Promise<PageResult<Comment>> {
  return requestData<PageResult<Comment>>({
    url: '/comments',
    method: 'get',
    params,
  })
}

/** 评论筛选标签数量统计 GET /api/comments/stats */
export function fetchCommentStats(): Promise<CommentStats> {
  return requestData<CommentStats>({
    url: '/comments/stats',
    method: 'get',
  })
}

/** 从回收站恢复评论 PUT /api/comments/{id}/restore */
export function restoreComment(id: number): Promise<null> {
  return requestData<null>({
    url: `/comments/${id}/restore`,
    method: 'put',
  })
}

/** 彻底删除回收站中的评论 DELETE /api/comments/{id}/purge */
export function purgeComment(id: number): Promise<null> {
  return requestData<null>({
    url: `/comments/${id}/purge`,
    method: 'delete',
  })
}

/** 查询文章已通过审核的评论 GET /api/articles/{id}/comments */
export function fetchArticleComments(
  articleId: number,
  params: { page: number; pageSize: number },
): Promise<PageResult<Comment>> {
  return requestData<PageResult<Comment>>({
    url: `/articles/${articleId}/comments`,
    method: 'get',
    params,
  })
}

/** 待审核评论数量（仅管理员） GET /api/comments/pending-count */
export function fetchPendingCommentCount(): Promise<number> {
  return requestData<number>({
    url: '/comments/pending-count',
    method: 'get',
  })
}

/** 查询「评论自动过审」开关（仅管理员） GET /api/comments/auto-approve */
export function fetchCommentAutoApprove(): Promise<boolean> {
  return requestData<boolean>({
    url: '/comments/auto-approve',
    method: 'get',
  })
}

/** 开启 / 关闭「评论自动过审」（仅管理员） PUT /api/comments/auto-approve */
export function updateCommentAutoApprove(enabled: boolean): Promise<boolean> {
  return requestData<boolean>({
    url: '/comments/auto-approve',
    method: 'put',
    data: { enabled },
  })
}

/**
 * 提交评论 POST /api/comments
 *
 * 返回后端完整响应：message 由服务端根据「自动过审」开关决定
 * （已自动通过审核 / 等待审核），页面直接展示该文案。
 */
export function createComment(payload: CommentPayload): Promise<ApiResult<number>> {
  return requestResult<number>({
    url: '/comments',
    method: 'post',
    data: payload,
  })
}

/** 审核评论 PUT /api/comments/{id}/status */
export function updateCommentStatus(id: number, status: number): Promise<null> {
  return requestData<null>({
    url: `/comments/${id}/status`,
    method: 'put',
    data: { status },
  })
}

/** 删除评论 DELETE /api/comments/{id} */
export function deleteComment(id: number): Promise<null> {
  return requestData<null>({
    url: `/comments/${id}`,
    method: 'delete',
  })
}
