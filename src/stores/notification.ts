import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getUnreadCount,
  getUnreadLikeCount,
  getUnreadLikeDetails,
  markAllRead,
} from '@/api/notification'
import type {
  LikeAggregatedItem,
  LikeNotificationDetailVO,
  WsMessage,
} from '@/types/notification'

function timeValue(value: string): number {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function detailKey(detail: LikeNotificationDetailVO): string {
  if (detail.notificationId > 0) {
    return `id:${detail.notificationId}`
  }
  return `${detail.senderId}:${detail.articleId}:${detail.createTime}`
}

/** 合并未读明细与页面已展示过的快照，避免清空未读后列表消失。 */
function mergeDetails(
  current: LikeNotificationDetailVO[],
  incoming: LikeNotificationDetailVO[],
): LikeNotificationDetailVO[] {
  const map = new Map<string, LikeNotificationDetailVO>()
  for (const item of current) {
    map.set(detailKey(item), item)
  }
  for (const item of incoming) {
    map.set(detailKey(item), item)
  }
  return Array.from(map.values()).sort(
    (a, b) => timeValue(b.createTime) - timeValue(a.createTime),
  )
}

export const useNotificationStore = defineStore('notification', () => {
  /** 当前用户全部未读通知数（顶部铃铛角标） */
  const unreadNoticeCount = ref(0)

  /** 作者收到的未读点赞数（消息页左侧「收到的赞」角标） */
  const unreadLikeCount = ref(0)

  /** 推送与未读接口返回的点赞明细；标记已读后仍保留页面快照 */
  const details = ref<LikeNotificationDetailVO[]>([])

  /** 按文章聚合后的点赞列表 */
  const aggregated = computed<LikeAggregatedItem[]>(() => {
    const map = new Map<number, LikeNotificationDetailVO[]>()
    for (const detail of details.value) {
      if (!map.has(detail.articleId)) {
        map.set(detail.articleId, [])
      }
      map.get(detail.articleId)!.push(detail)
    }

    const list: LikeAggregatedItem[] = []
    map.forEach((items, articleId) => {
      const sorted = [...items].sort(
        (a, b) => timeValue(b.createTime) - timeValue(a.createTime),
      )
      const latest = sorted[0]
      if (!latest) {
        return
      }
      const articleLikeCount = latest.articleLikeCount ?? 0
      list.push({
        articleId,
        articleTitle: latest.articleTitle || '某文章',
        latestSenderName: latest.senderName || '某用户',
        latestSenderAvatar: latest.senderAvatar,
        articleLikeCount,
        totalCount: Math.max(articleLikeCount, sorted.length),
        latestTime: latest.createTime,
        details: sorted,
      })
    })

    return list.sort((a, b) => timeValue(b.latestTime) - timeValue(a.latestTime))
  })

  /** 同时刷新铃铛总未读数与点赞未读数 */
  async function fetchUnreadCounts(): Promise<void> {
    const [noticeCount, likeCount] = await Promise.all([
      getUnreadCount(),
      getUnreadLikeCount(),
    ])
    unreadNoticeCount.value = noticeCount ?? 0
    unreadLikeCount.value = likeCount ?? 0
  }

  /** 拉取未读点赞明细，并与页面已有快照合并 */
  async function fetchDetails(): Promise<LikeNotificationDetailVO[]> {
    const incoming = await getUnreadLikeDetails()
    details.value = mergeDetails(details.value, incoming)
    return incoming
  }

  /**
   * 进入点赞列表后清除当前作者的全部未读。
   * 明细快照保留在内存中，因此右侧列表不会因清零而立刻变空。
   */
  async function markLikesRead(): Promise<void> {
    await markAllRead()
    unreadLikeCount.value = 0
    // read-all 会清除全部未读通知，因此铃铛也同步归零。
    unreadNoticeCount.value = 0
  }

  /** 处理 WebSocket 实时推送 */
  function onWsMessage(msg: WsMessage): void {
    if (msg.type === 'LIKE') {
      if (typeof msg.unreadNoticeCount === 'number') {
        unreadNoticeCount.value = msg.unreadNoticeCount
      } else {
        unreadNoticeCount.value += 1
      }

      if (typeof msg.unreadCount === 'number') {
        unreadLikeCount.value = msg.unreadCount
      } else {
        unreadLikeCount.value += 1
      }

      if (
        typeof msg.articleId === 'number' &&
        typeof msg.senderName === 'string'
      ) {
        const detail: LikeNotificationDetailVO = {
          notificationId: msg.notificationId ?? 0,
          senderId: msg.senderId ?? 0,
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar ?? null,
          articleId: msg.articleId,
          articleTitle: msg.articleTitle ?? '某文章',
          articleLikeCount: msg.articleLikeCount ?? null,
          createTime: new Date(msg.timestamp || Date.now()).toISOString(),
          isRead: 0,
        }
        details.value = mergeDetails(details.value, [detail])
      }
      return
    }

    if (msg.type === 'UNREAD_COUNT') {
      if (typeof msg.unreadNoticeCount === 'number') {
        unreadNoticeCount.value = msg.unreadNoticeCount
      }
      if (typeof msg.unreadCount === 'number') {
        unreadLikeCount.value = msg.unreadCount
      }
    }
  }

  /** 登出时重置本地通知状态 */
  function reset(): void {
    unreadNoticeCount.value = 0
    unreadLikeCount.value = 0
    details.value = []
  }

  return {
    unreadNoticeCount,
    unreadLikeCount,
    details,
    aggregated,
    fetchUnreadCounts,
    fetchDetails,
    markLikesRead,
    onWsMessage,
    reset,
  }
})
