import { ref } from 'vue'
import type { WsMessage } from '@/types/notification'

type MessageHandler = (msg: WsMessage) => void

class NotificationWebSocket {
  private ws: WebSocket | null = null
  private handlers: Set<MessageHandler> = new Set()
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnect = 5
  private manualClose = false

  public connected = ref(false)

  connect(token: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    this.manualClose = false

    // 后端 WebSocket 端点，token 走 query（浏览器 WS 不支持自定义 header）
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${location.host}/ws/notification?token=${encodeURIComponent(token)}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[WS] connected')
      this.connected.value = true
      this.reconnectAttempts = 0
      this.startHeartbeat()
    }

    this.ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data)
        if (msg.type === 'PONG') return
        this.handlers.forEach(fn => fn(msg))
      } catch (e) {
        console.warn('[WS] parse error', e)
      }
    }

    this.ws.onclose = () => {
      console.log('[WS] closed')
      this.connected.value = false
      this.stopHeartbeat()
      if (!this.manualClose) this.scheduleReconnect(token)
    }

    this.ws.onerror = (e) => {
      console.error('[WS] error', e)
    }
  }

  private scheduleReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnect) {
      console.warn('[WS] 达到最大重连次数，停止重连')
      return
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts++
    console.log(`[WS] ${delay}ms 后第 ${this.reconnectAttempts} 次重连`)
    this.reconnectTimer = window.setTimeout(() => this.connect(token), delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }))
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  close() {
    this.manualClose = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.connected.value = false
  }
}

export const notificationWs = new NotificationWebSocket()