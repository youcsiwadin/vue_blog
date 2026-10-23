import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { ElMessage } from 'element-plus'

import { TOKEN_STORAGE_KEY } from '@/api/request'
import { ROLE_ADMIN, ROLE_AUTHOR, ROLE_SUBSCRIBER, getStoredRole, homeRouteOf } from '@/utils/role'

/** 仅管理员可访问 */
const ADMIN_ONLY = [ROLE_ADMIN]

/** 可写文章：管理员与作者 */
const ARTICLE_ROLES = [ROLE_ADMIN, ROLE_AUTHOR]

/** 可进入管理系统（评论 / 个人资料）：管理员、作者、订阅者 */
const SYSTEM_ROLES = [ROLE_ADMIN, ROLE_AUTHOR, ROLE_SUBSCRIBER]

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/articles',
    name: 'article-list',
    component: () => import('@/views/ArticleListView.vue'),
    meta: { title: '所有文章', requiresAuth: true, roles: ARTICLE_ROLES },
  },
  {
    path: '/articles/new',
    name: 'article-create',
    component: () => import('@/views/ArticleEditView.vue'),
    meta: { title: '写文章', requiresAuth: true, roles: ARTICLE_ROLES },
  },
  {
    path: '/articles/:id',
    name: 'article-detail',
    component: () => import('@/views/ArticleDetailView.vue'),
    meta: { title: '文章详情' },
  },
  {
    path: '/articles/:id/edit',
    name: 'article-edit',
    component: () => import('@/views/ArticleEditView.vue'),
    meta: { title: '编辑文章', requiresAuth: true, roles: ARTICLE_ROLES },
  },
  {
    path: '/categories',
    name: 'category-list',
    component: () => import('@/views/CategoryListView.vue'),
    meta: { title: '分类目录', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/tags',
    name: 'tag-list',
    component: () => import('@/views/TagListView.vue'),
    meta: { title: '标签', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/pages',
    name: 'page-list',
    component: () => import('@/views/PageListView.vue'),
    meta: { title: '所有页面', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/pages/new',
    name: 'page-create',
    component: () => import('@/views/PageEditView.vue'),
    meta: { title: '添加页面', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/pages/:id/edit',
    name: 'page-edit',
    component: () => import('@/views/PageEditView.vue'),
    meta: { title: '编辑页面', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/comments',
    name: 'comment-list',
    component: () => import('@/views/CommentListView.vue'),
    meta: { title: '评论', requiresAuth: true, roles: SYSTEM_ROLES },
  },
  {
    path: '/media',
    name: 'media-list',
    component: () => import('@/views/MediaView.vue'),
    meta: { title: '媒体库', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/moments',
    name: 'moment-list',
    component: () => import('@/views/MomentListView.vue'),
    meta: { title: '说说', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/moments/new',
    name: 'moment-create',
    component: () => import('@/views/MomentCreateView.vue'),
    meta: { title: '发表说说', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/users',
    name: 'user-list',
    component: () => import('@/views/UserListView.vue'),
    meta: { title: '所有用户', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/users/new',
    name: 'user-create',
    component: () => import('@/views/UserCreateView.vue'),
    meta: { title: '添加用户', requiresAuth: true, roles: ADMIN_ONLY },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { title: '个人资料', requiresAuth: true, roles: SYSTEM_ROLES },
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('@/views/MessageView.vue'),
    meta: { title: '消息通知', requiresAuth: true, roles: SYSTEM_ROLES, hideSidebar: true },
  },
  {
    path: '/settings',
    name: 'site-setting',
    component: () => import('@/views/SiteSettingView.vue'),
    // 作者可进入本站点设置页，但只能编辑「博主信息」模块
    meta: { title: '站点内容设置', requiresAuth: true, roles: ARTICLE_ROLES },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录 / 注册', layout: 'plain' },
  },
  {
    path: '/register-admin',
    name: 'admin-register',
    component: () => import('@/views/AdminRegisterView.vue'),
    meta: { title: '注册成为管理员', layout: 'plain' },
  },
  {
    // 博客站点（前端展示页面）
    path: '/blog',
    component: () => import('@/views/blog/BlogLayout.vue'),
    meta: { layout: 'blog' },
    children: [
      {
        path: '',
        name: 'blog-home',
        component: () => import('@/views/blog/BlogHomeView.vue'),
        meta: { title: '博客主页' },
      },
      {
        path: 'articles',
        name: 'blog-articles',
        component: () => import('@/views/blog/BlogArticlesView.vue'),
        meta: { title: '文章' },
      },
      {
        path: 'articles/:id',
        name: 'blog-article-detail',
        component: () => import('@/views/blog/BlogArticleDetailView.vue'),
        meta: { title: '文章详情' },
      },
      {
        path: 'author',
        name: 'blog-author',
        component: () => import('@/views/blog/BlogAuthorView.vue'),
        meta: { title: '博主主页' },
      },
      {
        path: 'author/:id',
        name: 'blog-author-detail',
        component: () => import('@/views/blog/BlogAuthorView.vue'),
        meta: { title: '作者主页' },
      },
      {
        path: 'guestbook',
        name: 'blog-guestbook',
        component: () => import('@/views/blog/BlogGuestbookView.vue'),
        meta: { title: '留言板' },
      },
      {
        path: 'moments',
        name: 'blog-moments',
        component: () => import('@/views/blog/BlogMomentsView.vue'),
        meta: { title: '说说' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'blog-home' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? `${title} - JAVA博客网站` : 'JAVA博客网站'

  if (to.meta.requiresAuth) {
    // 需要登录的页面：未登录时跳转到登录页，并记录返回地址
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
      ElMessage.warning('请先登录后再继续操作')
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    // 角色权限校验：无权限时跳转到该角色可用页面
    const allowed = to.meta.roles as number[] | undefined
    const role = getStoredRole()
    if (allowed && (role === null || !allowed.includes(role))) {
      ElMessage.warning('当前账号没有访问该页面的权限')
      return { name: homeRouteOf(role) }
    }
  }
  return true
})

export default router
