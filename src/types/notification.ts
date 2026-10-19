
/** 点赞通知明细（后端 LikeNotificationDetailVO） */
export interface LikeNotificationDetailVO {
  notificationId: number
  senderId: number
  senderName: string
  senderAvatar: string | null
  articleId: number
  articleTitle: string
  /** 该文章的总点赞数 */
  articleLikeCount: number | null
  createTime: string
  isRead: number
}

/** 点赞聚合项  */
export interface LikeAggregatedItem {
  articleId: number
  articleTitle: string
  latestSenderName: string
  latestSenderAvatar: string | null
  /** 该文章的总点赞数（优先取后端 article.like_count） */
  articleLikeCount: number
  totalCount: number
  latestTime: string
  details: LikeNotificationDetailVO[]
}

/** WebSocket 推送消息体 */
export interface WsMessage {
  type: 'LIKE' | 'UNREAD_COUNT' | 'PONG'
  authorId: number
  /** 作者未读点赞数 */
  unreadCount: number
  /** 当前用户全部未读通知数 */
  unreadNoticeCount?: number
  notificationId?: number
  articleId?: number
  senderId?: number
  senderName?: string
  senderAvatar?: string | null
  articleTitle?: string
  articleLikeCount?: number | null
  timestamp: number
}
