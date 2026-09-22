# Verification

## Scope

验证聚焦当前提交快照是否可以独立安装、构建和运行，以及核心业务状态是否具备可复现的前端联动：

- 本地依赖安装与生产构建；
- TypeScript 类型检查与严格 lint；
- 主要路由和核心实现文件完整；
- Zustand + LocalStorage 持久化与 Reset Demo；
- Case / Issue、Version / Build、Test Activity / Test Run 与资源记录之间的数据一致性；
- 用例和检查模板的历史快照；
- 资源预约冲突拦截；
- 模拟 AI 与真实业务事实的边界。

## Automated Checks

| Check | Command | Result |
| --- | --- | --- |
| Install | `bun install --frozen-lockfile` | Pass |
| TypeScript | `bun run typecheck` | Pass |
| Lint | `bun run lint:strict` | Pass |
| Production build | `bun run build` | Pass |

以上命令在本提交目录中使用 Bun 1.4.2 实际执行。生产构建使用 Next.js 16.3.5，编译、TypeScript 检查和页面数据收集均成功，生成 15 个静态页面。

## Functional Verification

稳定的人工验证清单：

- 打开 `/dashboard` 及四个模块的主要路由，确认导航、列表和详情入口可用。
- 修改 Case、Issue、检查项、测试结果或资源状态，刷新页面后确认本地状态保留。
- 执行 `Reset Demo`，确认 Seed Data 恢复，且其他站点存储不受影响。
- 创建或关联 Case 与 Issue，确认关联证据、Issue 活跃度和报告统计使用同一业务状态。
- 编辑源测试用例后，确认既有 Test Run 仍显示创建时的用例快照。
- 编辑源检查模板后，确认既有检查实例仍显示创建时的模板快照。
- 完成或跳过检查项，确认跳过原因必填，已处理状态不被表达为版本准入结论。
- 对同一资源创建重叠预约，确认冲突被拦截；借出、归还和超期状态保持一致。
- 检查报告中的数量、状态和通过率可追溯到业务记录，未执行项不记为通过。

## Scope Limitations

- 无真实后端、数据库、身份认证或多人实时同步。
- 无真实外部渠道采集、AI API、Git / CI 集成或自动化执行器。
- AI 能力是本地确定性模拟，不能代表生产模型效果。
- 测试失败转 Issue、失败项重跑比较和生产级发布 Gate 不在当前可运行闭环内。
- 完整生产级安全、性能与无障碍审计不属于本 Demo 的验证范围。
