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
| <br /> | GET `/api/stories/:id`                              | 获取故事详情             |
| <br /> | GET `/api/stories/:story_id/timeline`               | 获取主线故事拼接结果         |
| <br /> | POST `/api/stories`                                 | 创建故事               |
| <br /> | PUT `/api/stories/:id`                              | 更新故事               |
| <br /> | DELETE `/api/stories/:id`                           | 删除故事               |
| **节点** | GET `/api/nodes/:story_id`                          | 获取故事节点             |
| <br /> | POST `/api/nodes`                                   | 添加接龙节点             |
| <br /> | PUT `/api/nodes/:node_id/select`                    | 选择节点               |
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

**总计：113 个测试，8 个测试套件，全部通过**

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

## 登录流程

未登录用户访问任何功能页面时，会自动跳转到 `/login` 登录页面。登录页面同时支持登录和注册功能，登录成功后自动跳转到 `/home`。

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

## License

MIT
