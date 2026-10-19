import { requestData } from '@/api/request'
import type { Category, CategoryPayload } from '@/types/api'

/** 查询全部分类 GET /api/categories */
export function fetchCategories(): Promise<Category[]> {
  return requestData<Category[]>({
    url: '/categories',
    method: 'get',
  })
}

/** 新建分类 POST /api/categories */
export function createCategory(payload: CategoryPayload): Promise<Category> {
  return requestData<Category>({
    url: '/categories',
    method: 'post',
    data: payload,
  })
}

/** 编辑分类 PUT /api/categories/{id} */
export function updateCategory(id: number, payload: CategoryPayload): Promise<Category> {
  return requestData<Category>({
    url: `/categories/${id}`,
    method: 'put',
    data: payload,
  })
}

/** 删除分类 DELETE /api/categories/{id} */
export function deleteCategory(id: number): Promise<null> {
  return requestData<null>({
    url: `/categories/${id}`,
    method: 'delete',
  })
}
