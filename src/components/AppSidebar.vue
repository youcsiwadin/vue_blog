<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useUserStore } from '@/stores/user'

const route = useRoute()
const { isAdmin, isAuthor, canUseAdmin } = useUserStore()

/** 当前高亮菜单项 */
const activeMenu = computed(() => route.path)
</script>

<template>
  <!-- 游客（角色 4）不显示后台菜单 -->
  <aside v-if="canUseAdmin" class="app-sidebar">
    <el-menu :default-active="activeMenu" router unique-opened class="app-sidebar__menu">
      <el-menu-item v-if="isAdmin" index="/">首页</el-menu-item>

      <!-- 文章：管理员全部；作者仅"所有文章 / 写文章" -->
      <el-sub-menu v-if="isAuthor" index="article">
        <template #title>文章</template>
        <el-menu-item index="/articles">{{ isAdmin ? '所有文章' : '我的文章' }}</el-menu-item>
        <el-menu-item v-if="isAdmin" index="/categories">分类目录</el-menu-item>
        <el-menu-item index="/articles/new">写文章</el-menu-item>
        <el-menu-item v-if="isAdmin" index="/tags">标签</el-menu-item>
      </el-sub-menu>

      <el-sub-menu v-if="isAdmin" index="page">
        <template #title>页面</template>
        <el-menu-item index="/pages">所有页面</el-menu-item>
        <el-menu-item index="/pages/new">添加页面</el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/comments">评论</el-menu-item>

      <el-menu-item v-if="isAdmin" index="/media">媒体</el-menu-item>

      <el-sub-menu v-if="isAdmin" index="moment">
        <template #title>说说</template>
        <el-menu-item index="/moments">说说</el-menu-item>
        <el-menu-item index="/moments/new">发表说说</el-menu-item>
      </el-sub-menu>

      <!-- 用户：管理员可管理用户；作者 / 订阅者仅个人资料 -->
      <el-sub-menu index="user">
        <template #title>用户</template>
        <el-menu-item v-if="isAdmin" index="/users">所有用户</el-menu-item>
        <el-menu-item v-if="isAdmin" index="/users/new">添加用户</el-menu-item>
        <el-menu-item index="/profile">个人资料</el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/settings">站点内容设置</el-menu-item>
    </el-menu>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 210px;
  flex: 0 0 210px;
  background-color: #ffffff;
  border-right: 1px solid #e4e7ed;
}

.app-sidebar__menu {
  border-right: none;
}

.app-sidebar :deep(.el-menu-item),
.app-sidebar :deep(.el-sub-menu__title) {
  height: 46px;
  line-height: 46px;
}
</style>
