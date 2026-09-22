# 设计文档

## 1. 信息架构

| 一级模块 | 页面／内容 |
| --- | --- |
| Issue Center | 首页趋势看板、反馈池、聚类工单及详情、日报／周报 |
| 版本管理 | Version Overview、平台 Build、需求与 Bug、提测检查、版本质量报告 |
| 测试中心 | 用例库、测试计划／轮次、任务列表、任务与执行详情、测试结果与报告 |
| 设备与资源 | 资源列表、设备／账号详情、借还与占用记录、超期清单 |

版本管理聚合多个游戏，每个游戏包含多个版本。

## 2. 首屏信息与主要操作

| 模块 | 首屏关注点 | 主要操作 |
| --- | --- | --- |
| Issue Center | 趋势、热门及高风险聚类、待确认工单 | 搜索筛选、查看证据、定级改派、转 Bug / Feature |
| 版本管理 | 游戏、平台版本、提测状态与发布阻塞 | 筛选 Version / Build、提测检查、查看缺陷与质量报告 |
| 测试中心 | 运行中任务、待分析失败、近期结果 | 发起测试、记录结果、查看证据与报告 |
| 设备与资源 | 可用、占用、离线资源与责任人 | 登记、借还、查看占用与超期 |

## 3. 已确认的交互原则

- Case 工单详情按问题摘要与趋势、原文证据、AI 初判及依据、人工处理、关联处理项组织信息。
- AI 初判与人工结论分别展示；同时关注热门问题与高风险低频问题。
- 日报、周报提供独立报告入口，可查看原文、跳转工单、编辑确认摘要并导出。
- 版本内呈现版本范围、合并准入、集成验证与质量报告。
- 发起测试明确项目、目标构建、范围、环境与设备、执行方式。
- 测试结果按结论、失败项和执行证据组织；测试失败转 Issue 与重跑比较不提供伪交互入口。
- 未处理检查项、跳过项、超期资源需要醒目提示；全部检查项已处理不等同于准入通过。
- 模拟消息、AI 结果、合并事件和执行结果需在适当层级明确标识，避免在每条业务记录中重复堆叠说明。
- 各模块通过关联记录跳转，避免人工重复搬运信息。

## 4. 关键跳转

Case 聚类工单 → 项目 Bug / Feature → 目标版本 → 测试任务与执行结果 → 版本质量报告。

测试失败项 → 结果报告与风险证据；缺陷联动和重跑比较属于 Demo 范围边界。

测试任务 ↔ 占用设备；日报／周报 → 关联聚类工单与原始反馈。

## 5. 页面布局与线框图

工作台使用统一 Starter 页面骨架：桌面端左侧为可折叠 Sidebar，右侧为 Header 和主内容区；窄屏使用 Sheet Sidebar。首页采用 Launcher，不承担业务分析与发布结论展示。

页面结构：

- `/dashboard`：Launcher 首页；提供 Case／Issue／Version／Test Activity／Resource 本地搜索、四模块导航与派生状态、最多四条“继续处理”及四个快速导航入口，保留 Reset Demo。
- `/dashboard/cases`：Issue 运营指挥台，包含 App / 时间筛选、流量与存量指标、状态分布、活跃 Issue 排序、Issue 右侧 Drawer、修复后回归提示、最新 Case 与 Markdown 导出。最新 Case 以 Cases 主表的五列精简只读结构展示，不显示 AI Classification。Overview 不直接修改 Case 的正式 Classification，Bug 操作使用 Bug Status / Assignee 语义。
- `/dashboard/cases/manage`：统一 Case 工作台，包含全部／我的 Case、Case Status 与 Tags 筛选、单条／批量粘贴／Excel 提报、图片附件、Case Drawer、标签确认、单／多 Case 归并、Issue 关联与标签管理。列表固定为 Case / 来源 / Tags / Case Status / Linked Issue；提交 Sheet 的“创建后处理”使用 ToggleGroup，关联候选只展示同 App Issue。
- `/dashboard/cases/issues`：统一 Issue 分诊工作台，默认 Bug 视图；提供 Classification 一级切换、统一“新建 Issue”入口、分类专属筛选、Bug 分诊指标与统计、Bug 专属列、包含人工分诊的 Issue Detail Drawer、状态 History、直接／Excel 提 Bug 与当日 Markdown 汇总。
- `/dashboard/cases/reports`：玩家反馈周报生成条件、等长上期对比、标签趋势与热点、核心问题、Issue 闭环、修复效果、跨周遗留、需要推进、可编辑模拟发现／建议，以及 Markdown 复制与下载。
- `/dashboard/projects`：版本总览；按游戏与 iOS / Android 联动筛选 Version、Build、Bug 和质量报告，并在每个 Version 内展示覆盖平台、范围及最新提测检查进度与入口。
- `/dashboard/projects/checklists`：检查实例与模板管理双视图。实例卡片展示版本、提测对象、场景、模板、创建与更新信息、已处理率、三类数量与检查状态；右侧 Sheet 按“基本信息 → 检查概览 → 模拟 AI 建议 → 正式检查项”组织，承载逐项完成／跳过、人工补充和导出。模板 Sheet 使用 Field 组合维护场景、分组、检查项和关键项属性；创建实例时保存带关键属性的模板快照。
- `/dashboard/tests`：用例库，提供三游戏与平台切换、搜索筛选、CRUD，以及需人工确认的模拟 AI 用例草稿。
- `/dashboard/tests/runs`：测试执行列表与四阶段流水线；发起测试时保存独立用例快照，逐“用例 × 平台”记录状态与备注，并即时更新总进度和平台进度。
- `/dashboard/tests/reports`：已完成测试列表与结果详情；第一屏展示固定执行指标，向下展示平台、模块、失败／阻塞／未执行项，并支持摘要复制与 Markdown／CSV 导出。
- `/dashboard/resources`：设备与测试账号的资源调度中心。顶部使用一级类型与快捷分类联式筛选，并提供不受筛选限制的全局搜索；主视图按“分段容量月历 → 选中日期状态与资源分组 → 具体资源 Drawer”逐层展开。下方展示不跟随分类筛选的“我的占用”、固定示例信用和可筛选的超期表格。预约、借出和资源登记使用右侧 Sheet，归还在个人占用行内完成。

## 6. 视觉风格与设计规范

- 采用 `Kiranism/next-shadcn-dashboard-starter` 作为工程与视觉底座。
- 固定 Claude Theme，默认 Claude Light，可切换 Claude Dark，不提供其他主题。
- 复用现有布局、侧栏、表格、表单、卡片、弹窗、抽屉、图表和反馈状态，以及字体、间距、圆角、阴影与主题 token。
- AI 分析卡、证据时间线、执行历史、质量风险等业务组件使用同一套 shadcn/ui 基础组件与主题 token 组合，不引入第二套 UI 体系。
- 在当前项目上下文中组织业务页面；设备与账号可跨项目共享。
- 页面横向间距使用移动端 `px-4`、桌面端 `md:px-6`；普通区域优先 `gap-4`，主要区域之间使用 `gap-6`。
- 页面标题使用 `text-3xl font-bold tracking-tight`；区块标题使用 `text-base font-medium`；正文默认 `text-sm font-normal`；控件、活动态和重要标签使用 `font-medium`。
- 不为局部页面修改 Claude Theme 的颜色、圆角与阴影 token。

## 7. 组件与交互细节

- 复用 Starter 的 Base Nova shadcn/ui `Button`、`Badge`、`Card`、`Progress` 与主题 token。
- App Shell 使用 Starter `Sidebar` 体系；页面使用 `PageContainer` 与 `Heading`，英文和数字使用 Geist。
- 图标由统一 registry 管理，业务页面列表、行内和标题图标统一为 16px，资源类别图标为 20px。
- Badge 只表达状态、优先级和少量上下文；普通数量、环境与模块名使用普通文本。
- Card 内列表使用 Row + Separator，避免嵌套 Card 和重复边框容器。
- 默认 Claude Light，可切换 Claude Dark，不提供其他主题。
- 页面状态直接订阅统一 Zustand Store；新增反馈后工作台指标、聚类判断和 Case 证据同步更新。
- Launcher 不保存独立首页状态；模块数字、搜索结果与“继续处理”均由现有 Store 确定性派生，点击只进入对应模块，不自动打开详情或创建面板。
- Issue Center 的 Overview / Cases / Issues / Reports 由侧栏二级菜单直接导航，页面内部不重复显示模块导航；一级分组在任一子页保持当前模块标识。
- 版本管理使用“Overview／提测检查”侧栏二级导航；提测检查内部使用 ToggleGroup 切换检查实例和模板管理，不新增另一套页面导航。
- 提测检查以 Progress 表达“已处理率”，未处理项用 Alert 提醒；关键项用轻量 Badge 标识，关键项被跳过时额外使用 Danger Alert；跳过原因在当前检查项内就地填写。AI 建议以模拟能力区呈现，只展示待确认建议，包含检查项和建议原因；可编辑、接受或忽略，接受后才成为正式检查项。
- 新建模板默认显示一个“基础检查”分组和空检查项；实例列表只显示“进行中／已完成”，详情保留更细检查状态。最后一个待处理项由人工完成或确认跳过后，Sheet 先显示最终状态，再延迟约 600ms 关闭。
- Bulk Action Bar 只在选中 Case 后出现；单个和多个 Case 共用 Issue 搜索／创建表单，明确表达 N Case → 1 Issue。
- Case Detail 按“原始反馈 → AI 分析（模拟）→ Tags → 人工处理 / Linked Issue”组织；Case Status 不提供任意下拉修改，只显示当前状态允许的业务动作。
- Bug 使用 Issue Classification 而非独立页面或编号体系。Bug 列表突出 Module、Severity、Priority、Assignee、Cases 活跃度、Activity 和 Status；其他分类列表同样展示 Cases 活跃度与 Activity。高增长和未分配沿用现有 Danger 语义，不新建颜色 token。
- 新建 Issue 在同一 Sheet 中完成基本字段和 Bug 专属字段；Issue Detail 使用 Classification、Priority、Owner 三项人工分诊，Bug 页面只展示 Assignee，不并列展示两套负责人。
- Bug Detail 按基本信息、Bug 信息、Case Evidence、Tags、当前状态和 History 组织；状态操作只展示当前允许的下一步。
- Issues 顶部 Classification ToggleGroup 在移动端换行，表格仅在 Card 内局部滚动，不产生页面级横向溢出。
- AI 初判卡使用“模拟 AI 初判”文案；模拟能力保留页面级或全局说明，Latest Case 不重复展示“模拟”标签。
- 不属于本 Demo 范围的能力不提供伪交互入口，并在界面或文档中明确标识范围边界。

## 8. 响应式与无障碍设计

- 桌面端采用可折叠 Sidebar；小屏采用 Sheet Sidebar 和单列卡片布局。
- 主导航提供 `aria-label` 与当前页状态；主题按钮提供可访问名称；流程进度提供数值说明。
- 主要页面支持桌面与移动端布局，并保留 Claude Light / Dark 下的信息层级与可读性；完整生产级无障碍审计不属于本 Demo 范围。
