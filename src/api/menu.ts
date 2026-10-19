import { requestData } from '@/api/request'
import type { MenuItem } from '@/types/api'

/** 博客前台导航菜单（公开） GET /api/menu */
export function fetchMenu(): Promise<MenuItem[]> {
  return requestData<MenuItem[]>({
    url: '/menu',
    method: 'get',
  })
}

/** 菜单管理列表（管理员，含草稿页面） GET /api/admin/menu */
export function fetchAdminMenu(): Promise<MenuItem[]> {
  return requestData<MenuItem[]>({
    url: '/admin/menu',
    method: 'get',
  })
}

/** 添加菜单项 POST /api/admin/menu */
export function addMenuItem(targetType: string, targetId: number): Promise<MenuItem> {
  return requestData<MenuItem>({
    url: '/admin/menu',
    method: 'post',
    data: { targetType, targetId },
  })
}

/** 移除菜单项 DELETE /api/admin/menu/{id} */
export function removeMenuItem(id: number): Promise<null> {
  return requestData<null>({
    url: `/admin/menu/${id}`,
    method: 'delete',
  })
}

/** 上移 / 下移菜单项 PUT /api/admin/menu/{id}/move */
export function moveMenuItem(id: number, direction: 'up' | 'down'): Promise<null> {
  return requestData<null>({
    url: `/admin/menu/${id}/move`,
    method: 'put',
    data: { direction },
  })
}
