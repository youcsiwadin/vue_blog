import { requestData } from '@/api/request'
import type { SiteSetting } from '@/types/api'

/** 查询站点主题设置 GET /api/settings */
export function fetchSiteSetting(): Promise<SiteSetting> {
  return requestData<SiteSetting>({
    url: '/settings',
    method: 'get',
  })
}

/** 保存站点主题设置 PUT /api/settings */
export function saveSiteSetting(payload: SiteSetting): Promise<SiteSetting> {
  return requestData<SiteSetting>({
    url: '/settings',
    method: 'put',
    data: payload,
  })
}
