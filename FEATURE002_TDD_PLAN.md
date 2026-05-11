# FEATURE 002: 手机版页面适配

## 需求描述
将故事接龙游戏的所有前端页面适配手机端浏览，确保在 320px~768px 宽度的移动设备上具有良好的用户体验。

## 技术方案
- 断点体系：480px（手机小屏）/ 768px（平板/手机横屏）
- 使用 CSS 媒体查询 + Element Plus 响应式能力
- Header 改为汉堡菜单折叠导航
- ElDialog 改为移动端友好的宽度（90vw/95vw）
- 操作按钮支持 flex-wrap 自动换行
- 全局 overflow-x: hidden 防止横向滚动

## 任务清单

### 阶段一：全局基础与导航
- [x] 1.1 优化 index.html viewport 设置（添加 maximum-scale=1.0, user-scalable=no）
- [x] 1.2 style.css 添加全局响应式样式（ElDialog 90vw、ElTable 字号、body overflow-x: hidden）
- [x] 1.3 Header.vue 汉堡菜单折叠导航（<768px 时折叠，含 slide-down 动画过渡）
- [x] 1.4 App.vue 移动端 padding 调整（767px 以下 padding: 12px）

### 阶段二：核心页面适配
- [x] 2.1 StoryList.vue：列表头纵向排列、网格单列、Dialog 95vw、FAB 按钮缩小
- [x] 2.2 StoryCard.vue：标题/摘要/统计字号缩小
- [x] 2.3 StoryDetail.vue：标题字号缩小、操作按钮 flex-wrap、树根内边距减少
- [x] 2.4 TreeNode.vue：头部 flex-wrap、缩进减少 24px→16px、按钮缩小

### 阶段三：阅读与用户页面
- [x] 3.1 PublishedStory.vue：增加 480px 断点（meta 信息纵向排列、书页内边距减少、操作按钮缩小）
- [x] 3.2 LoginPage.vue：品牌标题缩小、登录卡片内边距减少
- [x] 3.3 ProfilePage.vue：头像/用户名/积分换行、统计字号缩小、道具网格缩小
- [x] 3.4 MyStories.vue：网格单列、标题/摘要字号缩小

### 阶段四：团队与竞赛页面
- [x] 4.1 TeamPage.vue：网格单列、团队卡片纵向排列、Dialog 95vw
- [x] 4.2 CompetitionPage.vue：网格单列、竞赛卡片字号缩小、Dialog 95vw

### 阶段五：验证与提交
- [x] 5.1 运行全部测试（124 个）— 全部通过
- [x] 5.2 vue-tsc 类型检查 — 通过
- [x] 5.3 vite build 前端构建 — 成功
- [x] 5.4 server:build 后端编译 — 成功
- [x] 5.5 Git 提交 — 51aaa50
- [x] 5.6 更新 README.md — 已追加第10节手机适配实现要点
