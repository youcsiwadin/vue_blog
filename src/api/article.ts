import { requestBlob, requestData } from '@/api/request'
import type {
  Article,
  ArticleLikeResult,
  ArticlePayload,
  ArticleQuery,
  ArticleStats,
  PageResult,
} from '@/types/api'

/** 分页查询文章列表 GET /api/articles */
export function fetchArticlePage(query: ArticleQuery): Promise<PageResult<Article>> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: query.pageSize,
  }
  if (query.keyword) {
    params.keyword = query.keyword
  }
  if (query.categoryId) {
    params.categoryId = query.categoryId
  }
  if (query.tagId) {
    params.tagId = query.tagId
  }
  if (query.authorId) {
    params.authorId = query.authorId
  }
  return requestData<PageResult<Article>>({
    url: '/articles',
    method: 'get',
    params,
  })
}

/** 查询文章详情 GET /api/articles/{id} */
export function fetchArticleDetail(id: number): Promise<Article> {
  return requestData<Article>({
    url: `/articles/${id}`,
    method: 'get',
  })
}

/** 文章管理列表（含草稿 / 待审核） GET /api/admin/articles */
export function fetchAdminArticlePage(params: {
  page: number
  pageSize: number
  keyword?: string
  status?: number
  categoryId?: number
  tagId?: number
}): Promise<PageResult<Article>> {
  return requestData<PageResult<Article>>({
    url: '/admin/articles',
    method: 'get',
    params,
  })
}

/** 文章管理筛选标签数量统计 GET /api/admin/articles/stats */
export function fetchArticleStats(): Promise<ArticleStats> {
  return requestData<ArticleStats>({
    url: '/admin/articles/stats',
    method: 'get',
  })
}

/** 审核 / 修改文章状态（仅管理员） PUT /api/admin/articles/{id}/status */
export function updateArticleStatus(id: number, status: number): Promise<null> {
  return requestData<null>({
    url: `/admin/articles/${id}/status`,
    method: 'put',
    data: { status },
  })
}

/** 新建文章 POST /api/articles */
export function createArticle(payload: ArticlePayload): Promise<number> {
  return requestData<number>({
    url: '/articles',
    method: 'post',
    data: payload,
  })
}

/** 编辑文章 PUT /api/articles/{id} */
export function updateArticle(id: number, payload: ArticlePayload): Promise<null> {
  return requestData<null>({
    url: `/articles/${id}`,
    method: 'put',
    data: payload,
  })
}

/** 删除文章 DELETE /api/articles/{id} */
export function deleteArticle(id: number): Promise<null> {
  return requestData<null>({
    url: `/articles/${id}`,
    method: 'delete',
  })
}

/**
 * 下载附加内容附件（需达到文章设置的查看权限）
 * GET /api/articles/{id}/extra-files/{mediaId}/download
 */
export function downloadArticleExtraFile(articleId: number, mediaId: number): Promise<Blob> {
  return requestBlob({
    url: `/articles/${articleId}/extra-files/${mediaId}/download`,
    method: 'get',
  })
}

/** 点赞文章（需登录） POST /api/articles/{id}/like */
export function likeArticle(id: number): Promise<ArticleLikeResult> {
  return requestData<ArticleLikeResult>({
    url: `/articles/${id}/like`,
    method: 'post',
  })
}

/** 取消点赞（需登录） DELETE /api/articles/{id}/like */
export function unlikeArticle(id: number): Promise<ArticleLikeResult> {
  return requestData<ArticleLikeResult>({
    url: `/articles/${id}/like`,
    method: 'delete',
  })
}
