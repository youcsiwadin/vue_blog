import { requestData } from '@/api/request'
import type { DashboardSummary } from '@/types/api'

/** 查询首页统计数据 GET /api/dashboard/summary */
export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return requestData<DashboardSummary>({
    url: '/dashboard/summary',
    method: 'get',
  })
}
