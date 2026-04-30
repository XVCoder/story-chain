# 故事接龙游戏 - TDD 开发计划

## 总体进度

| 阶段 | 状态 | 提交信息 |
|------|------|----------|
| Phase 1: 安全修复与基础架构 | ✅ 已完成 | `Phase 1: Security fixes, Vue Router integration, and architecture improvements` |
| Phase 2: 测试先行 - 后端测试补充 | ✅ 已完成 | `Phase 2: Complete backend API test coverage with 45 passing tests` |
| Phase 3: 游戏模式差异化逻辑 | ✅ 已完成 | `Phase 3: Game mode differentiation logic with 57 passing tests` |
| Phase 4: 前端功能完善 | 📅 待开始 | - |
| Phase 5: 积分与体验优化 | 📅 待开始 | - |
| Phase 6: 集成测试与验收 | 📅 待开始 | - |

---

## 阶段划分

### Phase 1: 安全修复与基础架构 ✅ 已完成

- [x] 1.1 修复所有SQL注入问题（使用参数化查询）
  - 创建 `queryAll`、`queryOne`、`execute` 三个数据库辅助函数
  - 所有6个控制器（user/story/node/interaction/inventory/team）改为参数化查询
- [x] 1.2 修复前端组件错误（ElModal -> ElDialog）
  - 修复5个前端组件中错误的组件引用
- [x] 1.3 修复Vite代理配置（3001 -> 8080）
- [x] 1.4 修复App.vue点赞/收藏调用（调用正确的 interactionAPI）
- [x] 1.5 集成Vue Router 4
  - 支持路由：`/`（故事列表）、`/story/:id`（详情页）、`/profile`（个人中心）
  - 所有组件适配路由方式
- [x] 1.6 清理HelloWorld.vue + 更新页面标题为中文
- [x] 1.7 添加环境变量配置(.env)
- [x] **阶段完成：git commit**

### Phase 2: 测试先行 - 后端测试补充 ✅ 已完成

- [x] 2.1 编写投币API测试（投币成功/无认证/积分不足/累计投币）
- [x] 2.2 编写节点选择API测试（作者选择/非作者禁止/最大节点状态变化）
- [x] 2.3 编写积分兑换/道具使用测试（无效道具/积分不足/空背包/无道具时使用）
- [x] 2.4 编写团队/竞赛API测试（创建/加入/查询/竞赛创建/加入/权限）
- [x] **测试结果：45 tests passed, 6 test suites**
- [x] **阶段完成：git commit**

### Phase 3: 游戏模式差异化逻辑 ✅ 已完成

- [x] 3.0 数据库结构更新：添加 `team_id`/`competition_id` 字段 + `mode` CHECK 约束
- [x] 3.1 自由模式逻辑：支持 `max_nodes=0` 无限制接龙
- [x] 3.2 精选模式逻辑：积分规则 1.5x 加成
- [x] 3.3 Solo模式逻辑：`max_nodes` 固定为 1，禁止添加节点和选择节点
- [x] 3.4 组队竞赛模式逻辑：仅团队队长可创建，仅团队成员可接龙，仅队长可选择节点
- [x] 3.5 竞赛排行榜 API：`GET /competitions/:id/leaderboard`
- [x] 3.6 积分规则按模式差异化：Solo 双倍积分、精选 1.5x、团队积分计入竞赛排行榜
- [x] 创建后禁止修改 mode
- [x] `execute()` 安全处理：自动转换 `undefined` 为 `null`
- [x] **测试结果：57 tests passed, 7 test suites**
- [x] **阶段完成：git commit**

### Phase 4: 前端功能完善

- [ ] 4.1 组队管理系统UI（创建/加入/查看/退出团队）
- [ ] 4.2 竞赛系统UI + 排行榜展示
- [ ] 4.3 节点树形分支展示
- [ ] 4.4 我的故事页面
- [ ] 4.5 搜索功能
- [ ] **阶段完成：git commit**

### Phase 5: 积分与体验优化

- [ ] 5.1 积分获取提示UI
- [ ] 5.2 注册初始积分奖励
- [ ] 5.3 Loading/空状态/错误状态统一处理
- [ ] 5.4 积分实时刷新
- [ ] 5.5 道具使用完整入口
- [ ] **阶段完成：git commit**

### Phase 6: 集成测试与验收

- [ ] 6.1 全链路集成测试
- [ ] 6.2 前端组件测试
- [ ] 6.3 验收文档
- [ ] **阶段完成：git commit**
