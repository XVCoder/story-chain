# 故事接龙游戏 (Story Chain)

一个基于 Vue 3 + Express 的全栈故事接龙游戏平台。

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite + Element Plus + Vue Router 4
- **后端**: Express.js + TypeScript + SQL.js (SQLite)
- **测试**: Jest + Supertest
- **文档**: Swagger (OpenAPI 3.0)
- **包管理**: pnpm

## 功能特性

### 核心玩法

- 📝 **故事创作**: 发起人拟定故事概要和开头
- 🔗 **故事接龙**: 参与者可在任意节点后添加接龙分支
- 🌲 **树形分支**: 每个节点支持多人在此基础上接龙，形成故事树
- 🪙 **投币系统**: 读者通过投币选出最佳节点版本
- 📖 **主线拼接**: 自动按投币数(多→少)和提交时间(早→晚)选出最佳内容，拼接为完整主线故事
- 🔄 **动态刷新**: 每次添加内容或投币变化时，主线自动重新计算并实时展示
- 🏆 **节点选择**: 发起人可在达到最大节点数后发布故事

### 互动功能

- ❤️ **点赞**: 支持对故事点赞
- ⭐ **收藏**: 支持收藏故事
- 🪙 **投币**: 支持对故事节点投币支持（**每人每天每节点最多5币**）
- 👁️ **阅读量统计**: 自动记录故事阅读量
- 👤 **节点作者信息**: 每个故事节点展示接龙者用户名和提交时间
- 📖 **已发布故事阅读页**: 已发布故事以小说阅读风格展示，支持公开访问
- 🔗 **分享功能**: 一键复制已发布故事的阅读链接，支持未登录用户登录后自动回跳

### 积分与道具系统

- 基于阅读量和投币占比计算积分
- 积分可兑换道具（AI润色、提示、跳过等）
- AI润色功能：对选中节点进行AI优化
- 📅 **每日签到**: 签到获得10个硬币

### 组队与竞赛

- 团队创建与管理
- 竞赛创建与参与
- 团队排行榜

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装

```bash
# 克隆项目
cd story-chain

# 安装依赖
pnpm install
```

### 启动开发服务器

**启动后端服务器：**

```powershell
cd server
npx tsc
node dist/index.js
```

后端运行在 <http://localhost:8080>

**启动前端开发服务器：**

```powershell
# 在项目根目录
npx vite --host 127.0.0.1 --port 3000
```

前端运行在 132155<http://127.0.0.1:3000>

### 访问文档

- **Swagger API文档**: <http://localhost:8080/api-docs>
- **API JSON规范**: <http://localhost:8080/api-docs.json>

## 项目结构

```
story-chain/
├── index.html              # 入口HTML
├── vite.config.ts          # Vite构建配置
├── .env                    # 环境变量配置
├── TDD_PLAN.md             # TDD开发计划
├── package.json            # 依赖与脚本
│
├── server/                 # 后端
│   ├── index.ts            # Express入口
│   ├── swagger.ts          # Swagger文档配置
│   ├── tsconfig.json       # TypeScript配置
│   ├── db/
│   │   └── database.ts     # 数据库初始化 + 查询辅助函数
│   ├── middleware/
│   │   └── auth.ts         # JWT认证中间件
│   ├── routes/
│   │   └── index.ts        # API路由定义（26个端点）
│   ├── controllers/        # 控制器
│   │   ├── userController.ts      # 用户注册/登录/资料
│   │   ├── storyController.ts     # 故事CRUD
│   │   ├── nodeController.ts      # 故事节点管理
│   │   ├── interactionController.ts # 点赞/收藏/投币
│   │   ├── inventoryController.ts  # 积分兑换/背包/道具
│   │   └── teamController.ts       # 组队/竞赛
│   └── types/
│       └── index.ts        # 后端类型定义
│
├── src/                    # 前端
│   ├── main.ts             # Vue入口
│   ├── App.vue             # 根组件
│   ├── api/index.ts        # Axios API客户端
│   ├── router/index.ts     # Vue Router配置
│   ├── store/index.ts      # 响应式状态管理
│   ├── types/index.ts      # 前端类型定义
│   └── components/         # 组件
│       ├── Header.vue            # 导航栏（仅在登录后显示）
│       ├── LoginPage.vue         # 登录/注册页面
│       ├── StoryList.vue         # 故事列表
│       ├── StoryCard.vue         # 故事卡片
│       ├── StoryDetail.vue       # 故事详情与接龙
│       ├── CreateStoryModal.vue  # 创建故事弹窗
│       ├── TeamPage.vue          # 团队管理
│       ├── CompetitionPage.vue   # 竞赛与排行榜
│       ├── MyStories.vue         # 我的故事
│       ├── PublishedStory.vue    # 已发布故事阅读页
│       └── ProfilePage.vue       # 个人中心
│
└── tests/                  # 测试
    ├── user.test.ts        # 用户API测试
    └── story.test.ts       # 故事API测试
```

## API 列表

| 类别     | 端点                                                  | 说明                 |
| ------ | --------------------------------------------------- | ------------------ |
| **认证** | POST `/api/users/register`                          | 用户注册               |
| <br /> | POST `/api/users/login`                             | 用户登录               |
| <br /> | GET `/api/users/profile`                            | 获取用户资料             |
| <br /> | PUT `/api/users/profile`                            | 更新用户资料             |
| <br /> | POST `/api/users/check-in`                          | 每日签到（+10币）         |
| <br /> | GET `/api/users/stats`                             | 获取用户统计数据            |
| **故事** | GET `/api/stories`                                  | 获取故事列表（支持分页/筛选/排序） |
| <br /> | GET `/api/stories/search`                           | 搜索故事（按标题/摘要）       |
| <br /> | GET `/api/stories/my`                               | 获取我的故事列表           |
| <br /> | GET `/api/stories/:id`                              | 获取故事详情（含作者名和参与者列表） |
| <br /> | GET `/api/published/:id`                            | 获取已发布故事详情（无需登录）    |
| <br /> | GET `/api/stories/:story_id/timeline`               | 获取主线故事拼接结果         |
| <br /> | POST `/api/stories`                                 | 创建故事               |
| <br /> | PUT `/api/stories/:id`                              | 更新故事               |
| <br /> | DELETE `/api/stories/:id`                           | 删除故事               |
| **节点** | GET `/api/nodes/:story_id`                          | 获取故事节点             |
| <br /> | POST `/api/nodes`                                   | 添加接龙节点             |
| <br /> | PUT `/api/nodes/:node_id/select`                    | 选择节点               |
| <br /> | PUT `/api/nodes/:node_id/unselect`                  | 取消手动选择节点           |
| <br /> | POST `/api/nodes/:story_id/auto-select`             | 自动计算主线             |
| **互动** | POST `/api/stories/:story_id/like`                  | 点赞/取消点赞            |
| <br /> | POST `/api/stories/:story_id/favorite`              | 收藏/取消收藏            |
| <br /> | POST `/api/nodes/:node_id/coin`                     | 投币支持节点（含每日上限校验）   |
| <br /> | GET `/api/favorites`                                | 获取收藏列表             |
| **道具** | POST `/api/inventory/exchange`                      | 积分兑换道具             |
| <br /> | GET `/api/inventory`                                | 获取背包               |
| <br /> | POST `/api/inventory/use`                           | 使用道具               |
| **组队** | GET `/api/teams`                                    | 获取团队列表             |
| <br /> | POST `/api/teams`                                   | 创建团队               |
| <br /> | POST `/api/teams/:team_id/join`                     | 加入团队               |
| <br /> | POST `/api/teams/:team_id/leave`                    | 退出团队               |
| <br /> | GET `/api/teams/:team_id/members`                   | 获取团队成员             |
| <br /> | GET `/api/teams/user`                               | 获取用户团队             |
| **竞赛** | GET `/api/competitions`                             | 获取竞赛列表             |
| <br /> | POST `/api/competitions`                            | 创建竞赛               |
| <br /> | POST `/api/competitions/join`                       | 加入竞赛               |
| <br /> | GET `/api/competitions/:competition_id/leaderboard` | 获取竞赛排行榜            |

## TDD 开发流程

本项目严格按照 TDD (Test-Driven Development) 流程执行：

1. 每阶段开始前编写测试
2. 实现功能使测试通过
3. 重构优化代码
4. 更新 TDD\_PLAN.md 进度
5. 更新 README.md 文档
6. 使用 git 提交代码

详细开发计划请查看 [TDD\_PLAN.md](./TDD_PLAN.md)。

## 开发阶段状态

| 阶段                     | 状态    | 日期         |
| ---------------------- | ----- | ---------- |
| Phase 1: 安全修复与基础架构     | ✅ 已完成 | 2026-04-29 |
| Phase 2: 测试先行 - 后端测试补充 | ✅ 已完成 | 2026-04-29 |
| Phase 3: 游戏模式差异化逻辑     | ✅ 已完成 | 2026-04-29 |
| Phase 4: 前端功能完善        | ✅ 已完成 | 2026-04-29 |
| Phase 5: 积分与体验优化       | ✅ 已完成 | 2026-04-29 |
| Phase 6: 集成测试与验收       | ✅ 已完成 | 2026-04-29 |
| Round 2: 中文化 + 自定义节点数 | ✅ 已完成 | 2026-05-10 |
| Round 3: 手机版页面适配       | ✅ 已完成 | 2026-05-10 |

## 项目完成状态

**所有 6 个阶段已全部完成！**

## 测试

### 运行测试

```powershell
# 在项目根目录
npx jest
```

### 测试覆盖

| 测试文件                      | 覆盖范围                      | 测试数 |
| ------------------------- | ------------------------- | --- |
| tests/integration.test.ts | 全链路流程 + 边界情况 + 未测试端点覆盖 + 每日投币上限 + 每日签到 | 50  |
| tests/user.test.ts        | 用户注册/登录/资料/签到/统计/密码校验            | 10  |
| tests/story.test.ts       | 故事CRUD/节点添加/点赞/收藏         | 6   |
| tests/interaction.test.ts | 投币/点赞/收藏/收藏列表/金额校验       | 9   |
| tests/node.test.ts        | 节点添加/获取/选择/最大节点限制/权限      | 8   |
| tests/inventory.test.ts   | 积分兑换/背包/道具使用/权限           | 5   |
| tests/mode.test.ts        | 游戏模式差异化逻辑（Solo/自由/团队/排行榜） | 12  |
| tests/team.test.ts        | 团队创建/加入/查询/竞赛创建/加入        | 13  |

**总计：124 个测试，8 个测试套件，全部通过**

## 前端页面路由

| 路由              | 页面    | 说明                | 权限  |
| --------------- | ----- | ----------------- | --- |
| `/login`        | 登录/注册 | 登录前唯一可访问页面        | 公开  |
| `/home`         | 故事列表  | 已发布/接龙中、搜索、排序     | 需登录 |
| `/story/:id`    | 故事详情  | 查看接龙、树形分支、投币、AI润色 | 需登录 |
| `/profile`      | 个人中心  | 资料、背包、道具兑换        | 需登录 |
| `/teams`        | 团队管理  | 创建/加入/查看成员/退出团队   | 需登录 |
| `/competitions` | 竞赛列表  | 创建/参赛/排行榜         | 需登录 |
| `/my-stories`   | 我的故事  | 用户创建的故事列表         | 需登录 |
| `/read/:id`     | 已发布阅读 | 小说阅读风格、点赞/收藏/分享  | 公开  |

## 登录流程

未登录用户访问需认证页面时，会自动跳转到 `/login` 登录页面，同时将目标路径保存到 localStorage。登录/注册成功后自动跳转到保存的路径（若无则跳转到 `/home`）。已发布故事的阅读页（`/read/:id`）无需登录即可访问。

## 新需求实现要点

### 1. 主线自动拼接与动态刷新

**需求**: 接龙页面顶部区域展示当前接龙的结果。

**实现**:
- `autoSelectMainLineInternal(story_id)`: 从根节点开始，逐层选出最优子节点（按投币数 DESC，提交时间 ASC），标记为 `is_selected = TRUE`
- `getTimeline`: 纯查询接口，返回所有选中节点的内容和拼接后的 `full_text`（节点内容直接连接，无换行无标点）
- 动态触发时机：
  - `addNode` 创建新节点后 → 自动调用 `autoSelectMainLineInternal`
  - `coinNode` 投币后 → 自动调用 `autoSelectMainLineInternal`
  - 前端在 `handleAddNode`、`handleSelectNode`、`handleCoin` 后调用 `fetchTimeline()` 刷新
- 前端 StoryDetail.vue 顶部 `timeline-card` 展示完整拼接结果

### 2. 每日投币上限

**需求**: 每个人每天给同一个接龙节点最多投出5个硬币。

**实现**:
- 数据库新增 `daily_coins` 表: `(user_id, node_id, coin_date, daily_amount)`, UNIQUE(user_id, node_id, coin_date)
- `coinNode` 校验流程:
  1. 验证 amount 为正整数且 ≤ 5
  2. 查询今日该用户对该节点的已投币数
  3. 若 `daily_amount + amount > 5`，返回 400 "Daily coin limit reached for this node (max 5)"
  4. 否则记录到 `daily_coins` 并完成投币
- 每个节点的每日上限独立计算，不同用户互不影响

### 3. 每日签到

**需求**: 每天签到可以获得10个硬币。

**实现**:
- 数据库新增 `check_ins` 表: `(user_id, check_date, points_awarded)`, UNIQUE(user_id, check_date)
- `POST /api/users/check-in`:
  1. 检查今日是否已签到 → 返回 "Already checked in today"
  2. 插入签到记录 + 10积分
- 前端: Header 下拉菜单中的「📅 签到」按钮

### 4. 节点作者信息展示

**需求**: 在每个故事节点展示接龙者的信息以及节点的提交时间。

**实现**:
- 后端所有涉及 `story_nodes` 的查询均改为 `LEFT JOIN users u ON n.author_id = u.id`，返回 `u.username AS author_name`
- 涉及接口：`getNodesByStory`、`getStoryById`、`getTimeline`、`getStories`、`getMyStories`、`searchStories`、`getUserFavorites`
- 前端 `StoryNode` 类型新增 `author_name?: string` 和 `is_manual_selected?: boolean` 字段
- `TreeNode.vue` 的 `NodeData` 接口增加 `author_name`、`author_id`、`created_at`，模板中显示作者名（绿色）和提交时间

### 5. 已发布故事阅读页

**需求**: 已发布的故事详情页类似小说阅读页面，展示最终主线故事、发起人、参与人、时间、收藏/点赞/分享按钮。

**实现**:
- 新增 `GET /api/published/:id` 公开路由（无需认证），复用 `getStoryById` 控制器
- `getStoryById` 增加 `participants` 查询：`SELECT DISTINCT u.id, u.username FROM story_nodes n INNER JOIN users u ON n.author_id = u.id WHERE n.story_id = ?`
- 前端新增 `/read/:id` 路由（无需认证），对应 `PublishedStory.vue` 组件
- `PublishedStory.vue` 设计为小说阅读风格：
  - 仿纸张背景（`#f5f0e8` 底色 + `#fffef9` 内容区）
  - 衬线字体（Noto Serif SC / STSong / SimSun）
  - 段落首行缩进 2em，行高 2.2
  - 元信息区展示发起人、参与人、发起时间、发布时间、参与段落数
  - 分割线装饰（✦ 和 — 全文完 —）
  - 底部操作栏：点赞（👍）、收藏（⭐）、分享（🔗）按钮
- `StoryCard.vue` 已发布故事点击跳转到 `/read/:id`，按钮文案改为「阅读」
- `StoryDetail.vue` 已发布故事增加「🔗 分享」按钮

### 6. 分享与未登录回跳

**需求**: 分享已发布故事的详情页地址，未登录用户登录后自动回跳到分享页面。

**实现**:
- 分享按钮调用 `navigator.clipboard.writeText(url)` 复制 `/read/:id` 链接到剪贴板
- 路由守卫：访问需认证页面时，将目标路径保存到 `localStorage('redirectAfterLogin')`
- `LoginPage.vue` 登录/注册成功后检查 `redirectAfterLogin`，存在则跳转到该路径并清除存储
- `PublishedStory.vue` 中点赞/收藏操作在未登录时，将 `/read/:id` 保存到 `redirectAfterLogin` 并跳转登录页

### 7. 全面中文化

**需求**: 由于故事接龙游戏目前仅面向中文用户，所有提示信息都需要用中文。

**实现**:
- 后端 8 个文件共 85+ 条消息全部翻译为中文：
  - `auth.ts`: 认证中间件提示（未提供认证令牌、无效的认证令牌）
  - `index.ts`: 服务器内部错误
  - `userController.ts`: 注册/登录/签到/资料更新等提示
  - `storyController.ts`: 故事CRUD相关提示
  - `nodeController.ts`: 节点添加/选择/最大节点数等提示
  - `interactionController.ts`: 点赞/收藏/投币等提示
  - `teamController.ts`: 团队创建/加入/竞赛等提示
  - `inventoryController.ts`: 道具购买/使用等提示
  - `swagger.ts`: API文档标题和描述
- 前端 Element Plus 消息提示全部使用中文
- 所有 124 个测试断言更新为中文消息匹配

### 8. 主线故事拼接无连接符

**需求**: 被选中的接龙节点在拼接成主线故事时，中间不要加任何字符连接。

**实现**:
- `nodeController.ts` 的 `getTimeline` 函数：`timelineNodes.map(n => n.content).join('')`
- `PublishedStory.vue` 已发布阅读页：直接显示 `timeline.full_text`，不再按换行符分割段落

### 9. 创建故事自定义节点数

**需求**: 创建故事时，最大节点数增加"自定义"选项，用户可以手动指定节点数，最少为3个节点。

**实现**:
- 前端 `StoryList.vue`：
  - 新增 `maxNodesMode`（'preset' | 'custom'）和 `customMaxNodes`（默认3）状态
  - 最大节点数选择器旁增加「自定义」按钮
  - 选择自定义模式后显示 `ElInputNumber`（min=3, max=9999）
  - 创建前校验：自定义值必须为 ≥ 3 的整数
- 后端 `storyController.ts`：
  - Solo 模式自动设置 `max_nodes = 1`
- 后端 `nodeController.ts`：
  - 添加节点达到 `max_nodes` 上限时，自动将故事状态设为 `completed`
  - 优化 `autoSelectMainLineInternal` 算法：使用"规范根节点"策略，正确处理根级兄弟节点遍历，避免无限循环

### 10. 手机版页面适配

**需求**: 将所有前端页面适配手机端浏览，确保在 320px~768px 宽度的移动设备上具有良好的用户体验。

**实现**:
- **断点体系**: 480px（手机小屏）/ 768px（平板/手机横屏）
- **全局基础**:
  - `index.html` viewport 添加 `maximum-scale=1.0, user-scalable=no` 防止双击缩放
  - `style.css` 全局 `overflow-x: hidden` 防止横向滚动，ElDialog 默认 90vw 宽度
- **Header.vue**: 768px 以下隐藏桌面导航，显示汉堡菜单按钮（三横线→X动画），点击展开移动端导航面板（slide-down 动画）
- **App.vue**: 移动端 padding 从 20px 减至 12px
- **StoryList.vue**: 列头纵向排列、故事网格单列、Dialog 95vw、FAB 按钮缩小
- **StoryCard.vue**: 标题/摘要/统计字号缩小
- **StoryDetail.vue**: 标题字号缩小、操作按钮 flex-wrap 自动换行、树根内边距减少
- **TreeNode.vue**: 头部 flex-wrap、缩进 24px→16px、按钮缩小
- **PublishedStory.vue**: 增加 480px 断点（meta 纵向排列、书页内边距减少、操作按钮缩小）
- **LoginPage.vue**: 品牌标题缩小、登录卡片内边距减少
- **ProfilePage.vue**: 头像/用户名/积分换行、统计字号缩小、道具网格缩小
- **MyStories.vue**: 网格单列、标题/摘要字号缩小
- **TeamPage.vue**: 网格单列、团队卡片纵向排列、Dialog 95vw
- **CompetitionPage.vue**: 网格单列、竞赛卡片字号缩小、Dialog 95vw

## License

MIT
