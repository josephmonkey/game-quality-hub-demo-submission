'use client';

import type {
  Build,
  CaseAttachment,
  CaseClassification,
  CaseStatus,
  CheckItemStatus,
  CheckScenario,
  CheckTemplateGroup,
  ClusterCase,
  IntakeMethod,
  IssueBugDetail,
  IssueClassification,
  IssueStatus,
  Priority,
  RawFeedback,
  Resource,
  SourceChannel,
  TestActivity,
  TestCase,
  TestCaseResult,
  TestPlatform,
  TestResultStatus,
  TestRun,
  TestTargetType,
  WorkStatus
} from '@/lib/domain';
import { createSeedData, type DemoData } from '@/lib/seed-data';
import { demoNow, isWithinLastHours } from '@/lib/demo-time';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEMO_STORAGE_KEY = 'game-quality-hub-demo-v23';

type BugIssueInput = {
  projectId: string;
  title: string;
  summary?: string;
  priority: Priority;
  tags: string[];
  feedbackIds?: string[];
  bugDetail: IssueBugDetail;
};

interface DemoActions {
  addDemoFeedback: () => void;
  addDemoIssue: () => void;
  createCases: (input: {
    projectId: string;
    channel: SourceChannel;
    occurredAt: string;
    texts: string[];
    intakeMethod: Exclude<IntakeMethod, 'auto'>;
    originalUrl?: string;
    initialTags: string[];
    attachments?: CaseAttachment[];
  }) => string[];
  createImportedCases: (
    rows: Array<{
      projectId: string;
      channel: SourceChannel;
      occurredAt: string;
      text: string;
      originalUrl?: string;
      initialTags: string[];
    }>
  ) => string[];
  confirmCaseTags: (feedbackId: string, tags: string[]) => void;
  updateIssueTags: (issueId: string, tags: string[]) => void;
  linkCaseToIssue: (feedbackId: string, issueId: string) => void;
  linkCasesToIssue: (feedbackIds: string[], issueId: string) => void;
  createIssueFromCases: (input: {
    feedbackIds: string[];
    title: string;
    projectId: string;
    classification: IssueClassification;
    priority: Priority;
    tags: string[];
  }) => string | undefined;
  createStandaloneIssue: (input: {
    projectId: string;
    title: string;
    summary: string;
    classification: Exclude<IssueClassification, 'Bug' | 'Non Issue'>;
    priority: Priority;
    owner: string;
    tags: string[];
  }) => string | undefined;
  createBugIssue: (input: BugIssueInput) => string | undefined;
  createImportedBugIssues: (inputs: BugIssueInput[]) => string[];
  convertIssueToBug: (issueId: string, bugDetail: IssueBugDetail) => void;
  updateIssueTriage: (
    issueId: string,
    input: {
      classification: IssueClassification;
      priority: Priority;
      owner: string;
    }
  ) => void;
  transitionIssueBug: (issueId: string, nextStatus: WorkStatus, note?: string) => void;
  updateCaseClassification: (feedbackId: string, value: CaseClassification) => void;
  updateCaseStatus: (feedbackId: string, value: CaseStatus) => void;
  addTag: (name: string) => void;
  renameTag: (tagId: string, name: string) => void;
  deleteTag: (tagId: string) => void;
  assignIssue: (issueId: string) => void;
  correctCaseClassification: (feedbackId: string) => void;
  createIssueTicket: (issueId: string) => void;
  decideCluster: (clusterId: string, priority: Priority) => void;
  registerBuild: (versionId: string, label: string) => void;
  saveTestCase: (
    input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => string;
  deleteTestCase: (testCaseId: string) => void;
  duplicateTestCase: (testCaseId: string) => string | undefined;
  saveGeneratedTestCases: (
    inputs: Array<Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>>
  ) => string[];
  createTestActivity: (input: {
    projectId: string;
    name: string;
    platforms: TestPlatform[];
    targetType: TestTargetType;
    versionId?: string;
    targetBuildId?: string;
    targetLabel?: string;
    selectedCaseIds: string[];
  }) => string | undefined;
  startTestActivity: (activityId: string) => void;
  updateTestResult: (
    runId: string,
    testCaseId: string,
    platform: TestPlatform,
    status: TestResultStatus,
    note: string
  ) => void;
  completeTestActivity: (activityId: string) => void;
  rerunActivity: (activityId: string, buildId?: string) => void;
  notifyIssueOwner: (issueId: string) => void;
  resetDemo: () => void;
  transitionIssue: (issueId: string, nextStatus: IssueStatus) => void;
  transitionBug: (bugId: string, nextStatus: WorkStatus) => void;
  unlinkCaseFromIssue: (feedbackId: string) => void;
  createResourceReservation: (input: {
    resourceId: string;
    user: string;
    purpose: string;
    startDate: string;
    endDate: string;
    activityId?: string;
  }) => { ok: boolean; message: string };
  borrowResource: (input: {
    resourceId: string;
    borrower: string;
    purpose: string;
    borrowedAt: string;
    dueDate: string;
    activityId?: string;
  }) => { ok: boolean; message: string };
  returnResource: (resourceId: string, returnedAt: string) => void;
  registerResource: (input: Omit<Resource, 'id'>) => string;
  createCheckInstance: (input: {
    projectId: string;
    versionId: string;
    scenario: CheckScenario;
    templateId: string;
    target: string;
    versionNotes: string;
  }) => string | undefined;
  updateCheckItem: (
    instanceId: string,
    itemId: string,
    status: CheckItemStatus,
    skipReason?: string
  ) => { ok: boolean; message: string };
  decideCheckSuggestion: (
    instanceId: string,
    suggestionId: string,
    decision: 'accept' | 'ignore',
    editedTitle?: string
  ) => void;
  addManualCheckItem: (instanceId: string, title: string) => void;
  saveCheckTemplate: (input: {
    id?: string;
    name: string;
    scenario: CheckScenario;
    description: string;
    groups: CheckTemplateGroup[];
  }) => string;
  deleteCheckTemplate: (templateId: string) => { ok: boolean; message: string };
}

export type DemoStore = DemoData & DemoActions;

let feedbackSequence = 0;

const CURRENT_USER = '当前演示用户';

function snapshotTestCase(testCase: TestCase) {
  return {
    sourceTestCaseId: testCase.id,
    projectId: testCase.projectId,
    platforms: [...testCase.platforms],
    module: testCase.module,
    title: testCase.title,
    preconditions: [...testCase.preconditions],
    steps: [...testCase.steps],
    expected: testCase.expected,
    priority: testCase.priority
  };
}

function dateRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && startB <= endA;
}

function suggestedTagsFor(text: string) {
  const rules: Array<[RegExp, string]> = [
    [/闪退|崩溃|crash/i, '闪退'],
    [/登录|sign.?in|login/i, '登录'],
    [/卡顿|掉帧|fps|performance/i, '性能'],
    [/支付|扣款|礼包|到账|pay/i, '支付'],
    [/网络|network|timeout|超时/i, '网络'],
    [/公会战|raid|竞技场|玩法/i, '玩法'],
    [/好友|社交|聊天|chat/i, '社交'],
    [/账号|token|令牌|异地/i, '账号'],
    [/安全|泄露/i, '安全'],
    [/界面|ui|白屏/i, 'UI'],
    [/技能|数值|价格/i, '数值'],
    [/文案|描述/i, '文案']
  ];
  const values = rules.filter(([pattern]) => pattern.test(text)).map(([, tag]) => tag);
  return [...new Set(values)].slice(0, 4);
}

function matchingIssueId(text: string) {
  if (/登录|sign.?in|login/i.test(text)) return 'case-login';
  if (/公会战|guild war|闪退|crash/i.test(text)) return 'issue-guild-crash';
  if (/支付|礼包|扣款|pay/i.test(text)) return 'issue-payment-delay';
  if (/raid|掉帧|fps|卡顿/i.test(text)) return 'issue-raid-performance';
  if (/安全|令牌|异地/i.test(text)) return 'issue-account-security';
  return '';
}

function classifyCase(text: string): CaseClassification {
  if (
    /闪退|崩溃|crash|失败|错误|故障|无法(?:登录|进入|使用|启动|打开|领取|支付)|不能(?:登录|进入|使用|启动|打开|领取|支付)|未到账|没到账|扣款|白屏|黑屏|卡死|报错|异常/i.test(
      text
    )
  )
    return 'Bug';
  if (/建议|希望|新增|增加|支持|想要|能否|feature|wish/i.test(text)) return 'Feature';
  if (/咨询|请问|怎么|如何|太贵|expensive|喜欢|好玩|哈哈|闲聊|吐槽|心情/i.test(text))
    return 'Non Issue';
  return 'Unclear';
}

function nextDisplayId(values: string[], prefix: 'ISS' | 'CASE', floor: number) {
  const maximum = values.reduce((current, value) => {
    const number = Number.parseInt(value.replace(`${prefix}-`, ''), 10);
    return Number.isNaN(number) ? current : Math.max(current, number);
  }, floor);
  return `${prefix}-${String(maximum + 1).padStart(4, '0')}`;
}

function syncIssueCaseData(issues: ClusterCase[], feedback: RawFeedback[], updatedAt: string) {
  const now = new Date(updatedAt);
  return issues.map((issue) => {
    const linked = feedback.filter((item) => item.issueId === issue.id);
    const times = linked.map((item) => item.occurredAt).toSorted();
    const feedbackIds = linked.map((item) => item.id);
    const firstSeenAt = times[0] ?? issue.createdAt;
    const lastSeenAt = times.at(-1) ?? issue.createdAt;
    const caseCount24h = linked.filter((item) =>
      isWithinLastHours(item.occurredAt, 24, now)
    ).length;
    const changed =
      feedbackIds.join('|') !== issue.feedbackIds.join('|') ||
      linked.length !== issue.caseCount ||
      firstSeenAt !== issue.firstSeenAt ||
      lastSeenAt !== issue.lastSeenAt ||
      caseCount24h !== issue.caseCount24h;
    return {
      ...issue,
      feedbackIds,
      caseCount: linked.length,
      firstSeenAt,
      lastSeenAt,
      caseCount24h,
      updatedAt: changed ? updatedAt : issue.updatedAt
    };
  });
}

const bugTransitions: Record<WorkStatus, WorkStatus[]> = {
  待分诊: ['已指派', '不予修复'],
  已指派: ['修复中', '不予修复'],
  修复中: ['待验收'],
  待验收: ['修复中', '已关闭'],
  已关闭: ['已指派'],
  不予修复: ['待分诊']
};

const issueTransitions: Record<IssueStatus, IssueStatus[]> = {
  New: ['Assigned'],
  Assigned: ['Following Up', 'Blocked'],
  'Following Up': ['Developing', 'Blocked'],
  Developing: ['Verifying', 'Blocked'],
  Verifying: ['Developing', 'Resolved', 'Blocked'],
  Resolved: ['Developing', 'Closed'],
  Closed: ['Developing'],
  Blocked: ['Following Up', 'Developing']
};

function issueStatusForBug(status: WorkStatus): IssueStatus {
  if (status === '已关闭' || status === '不予修复') return 'Closed';
  if (status === '待验收') return 'Verifying';
  if (status === '修复中') return 'Developing';
  if (status === '已指派') return 'Assigned';
  return 'New';
}

function reassessCluster(cluster: ClusterCase, feedbackCount: number): ClusterCase {
  const elevated = feedbackCount >= 3;
  return {
    ...cluster,
    risk: elevated ? '高' : cluster.risk,
    aiAssessment: {
      ...cluster.aiAssessment,
      priority: elevated ? 'P0' : cluster.aiAssessment.priority,
      confidence: elevated ? 0.94 : cluster.aiAssessment.confidence,
      rationale: elevated
        ? 'Demo 规则：同类反馈达到 3 条后升级风险与优先级，等待人工确认。'
        : cluster.aiAssessment.rationale,
      assessedAt: demoNow().toISOString()
    }
  };
}

function createCheckSuggestions(input: {
  scenario: CheckScenario;
  templateGroups: CheckTemplateGroup[];
  versionNotes: string;
}) {
  const suggestions: Array<{ title: string; reason: string }> = [];
  const templateTitles = new Set(
    input.templateGroups.flatMap((group) => group.items.map((item) => item.title))
  );
  const addSuggestion = (title: string, reason: string) => {
    if (!templateTitles.has(title)) suggestions.push({ title, reason });
  };
  const notes = input.versionNotes;
  if (/组队|匹配|队伍/i.test(notes)) {
    addSuggestion(
      '验证快速组队异常退出后的重新加入路径',
      '组队状态变化可能造成队伍残留或重复入队。'
    );
  }
  if (/配置|数值|匹配/i.test(notes)) {
    addSuggestion(
      '确认本次配置已同步至目标测试环境',
      '版本说明包含配置变化，环境间不一致会影响验证结论。'
    );
  }
  if (/gm|debug|调试/i.test(notes)) {
    addSuggestion('确认正式包关闭本次新增的调试入口', '新增调试能力可能被遗漏在正式构建中。');
  }
  if (/支付|sdk|渠道/i.test(notes)) {
    addSuggestion('验证渠道登录与支付回调的完整链路', 'SDK 或支付变化可能影响渠道回调与到账。');
  }
  if (!suggestions.length) {
    suggestions.push({
      title: '复核本次变更影响范围与核心回归清单',
      reason: `“${input.scenario}”的版本说明未命中明确规则，需要人工确认是否存在模板外风险。`
    });
  }
  return { suggestions };
}

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      ...createSeedData(),
      addDemoFeedback: () =>
        set((state) => {
          feedbackSequence += 1;
          const id = `feedback-demo-${Date.now()}-${feedbackSequence}`;
          const feedback: RawFeedback = {
            id,
            caseId: nextDisplayId(
              state.feedback.map((item) => item.caseId),
              'CASE',
              3000
            ),
            projectId: 'project-aurora',
            issueId: 'case-login',
            status: 'Linked',
            channel: 'Internal',
            intakeMethod: 'manual_single',
            submittedBy: CURRENT_USER,
            text: 'Demo 新反馈：Android 更新后无法登录。',
            occurredAt: new Date().toISOString(),
            caseCreatedAt: new Date().toISOString(),
            suggestedTags: ['登录'],
            confirmedTags: ['登录'],
            tagStatus: 'confirmed',
            simulated: true,
            author: 'Demo Player',
            aiClassification: 'Bug',
            aiConfidence: 0.93,
            aiReason: '登录阻断与现有 Issue 的平台和触发条件一致。',
            issueMatchReason: '同为 Android 更新后的登录阻断。',
            attachments: []
          };
          const nextFeedback = [...state.feedback, feedback];
          const syncedClusters = syncIssueCaseData(
            state.clusters,
            nextFeedback,
            feedback.occurredAt
          );
          const clusters = syncedClusters.map((cluster) => {
            if (cluster.id !== 'case-login') return cluster;
            return reassessCluster(
              {
                ...cluster,
                casesAfterResolution: (cluster.casesAfterResolution ?? 0) + 1,
                possibleRegression:
                  cluster.issueStatus === 'Resolved' ? true : cluster.possibleRegression
              },
              cluster.caseCount
            );
          });
          return { feedback: nextFeedback, clusters };
        }),
      addDemoIssue: () =>
        set((state) => {
          const stamp = Date.now();
          const issueId = `issue-demo-${stamp}`;
          const feedbackId = `feedback-demo-new-${stamp}`;
          const createdAt = new Date().toISOString();
          const item: RawFeedback = {
            id: feedbackId,
            caseId: nextDisplayId(
              state.feedback.map((feedbackItem) => feedbackItem.caseId),
              'CASE',
              3000
            ),
            projectId: 'project-aurora',
            issueId,
            status: 'Linked',
            channel: 'Internal',
            intakeMethod: 'manual_single',
            submittedBy: CURRENT_USER,
            text: 'Demo 新 Case：进入商城时偶发白屏。',
            occurredAt: createdAt,
            caseCreatedAt: createdAt,
            suggestedTags: ['UI'],
            confirmedTags: [],
            tagStatus: 'pending',
            simulated: true,
            author: '运营手工上报',
            aiClassification: 'Bug',
            aiConfidence: 0.84,
            aiReason: '具备明确触发场景与异常结果，未匹配现有 Issue。',
            issueMatchReason: '未匹配已有 Issue，由此 Case 创建新 Issue。',
            attachments: []
          };
          const issue: ClusterCase = {
            id: issueId,
            displayId: nextDisplayId(
              state.clusters.map((cluster) => cluster.displayId),
              'ISS',
              1000
            ),
            projectId: 'project-aurora',
            title: '进入商城时偶发白屏',
            summary: '新增模拟 Case 未匹配现有 Issue，已生成待分诊 Issue。',
            status: '待确认',
            owner: '未分配',
            team: '待分诊',
            risk: '中',
            priority: 'P2',
            classification: 'Pending',
            issueStatus: 'New',
            createdAt,
            updatedAt: createdAt,
            firstSeenAt: createdAt,
            lastSeenAt: createdAt,
            caseCount: 1,
            caseCount24h: 1,
            caseCountPrevious24h: 0,
            notificationStatus: '未通知',
            suggestedTags: ['UI'],
            confirmedTags: [],
            aiAssessment: {
              priority: 'P2',
              businessLine: '商城',
              category: '显示异常',
              confidence: 0.84,
              rationale: '当前仅 1 条 Case，建议人工确认后分配 Owner。',
              assessedAt: createdAt,
              simulated: true
            },
            feedbackIds: [feedbackId],
            featureIds: [],
            history: []
          };
          return { feedback: [...state.feedback, item], clusters: [...state.clusters, issue] };
        }),
      createCases: (input) => {
        const state = get();
        const createdAt = new Date().toISOString();
        const createdIds: string[] = [];
        let feedbackValues = [...state.feedback];
        let clusterValues = [...state.clusters];

        input.texts.forEach((rawText, index) => {
          const text = rawText.trim();
          if (!text) return;
          feedbackSequence += 1;
          const id = `feedback-manual-${Date.now()}-${feedbackSequence}-${index}`;
          const suggestedIssueId = matchingIssueId(text);
          const suggestedTags = suggestedTagsFor(text);
          const caseId = nextDisplayId(
            feedbackValues.map((item) => item.caseId),
            'CASE',
            3000
          );
          const feedbackItem: RawFeedback = {
            id,
            caseId,
            projectId: input.projectId,
            status: 'Pending',
            channel: input.channel,
            intakeMethod: input.intakeMethod,
            submittedBy: CURRENT_USER,
            text,
            occurredAt: new Date(`${input.occurredAt}T12:00:00+08:00`).toISOString(),
            caseCreatedAt: createdAt,
            suggestedTags,
            confirmedTags: input.initialTags,
            tagStatus: input.initialTags.length > 0 ? 'confirmed' : 'pending',
            simulated: true,
            originalUrl: input.originalUrl || undefined,
            author: CURRENT_USER,
            aiClassification: classifyCase(text),
            aiConfidence: suggestedIssueId ? 0.91 : 0.76,
            aiReason: suggestedIssueId
              ? '模拟 AI 已找到可能相关的 Issue，等待人工确认关联。'
              : '模拟 AI 未匹配到已有 Issue，进入人工处理。',
            issueMatchReason: suggestedIssueId
              ? '关键现象与已有 Issue 定义一致，尚未自动关联。'
              : undefined,
            attachments: input.intakeMethod === 'manual_single' ? (input.attachments ?? []) : []
          };
          feedbackValues.push(feedbackItem);
          createdIds.push(id);
        });

        set({ feedback: feedbackValues, clusters: clusterValues });
        return createdIds;
      },
      createImportedCases: (rows) => {
        const createdIds: string[] = [];
        rows.forEach((row) => {
          createdIds.push(
            ...get().createCases({
              ...row,
              texts: [row.text],
              intakeMethod: 'manual_batch',
              attachments: []
            })
          );
        });
        return createdIds;
      },
      confirmCaseTags: (feedbackId, tagNames) =>
        set((state) => ({
          feedback: state.feedback.map((item) =>
            item.id === feedbackId
              ? { ...item, confirmedTags: [...new Set(tagNames)], tagStatus: 'confirmed' }
              : item
          )
        })),
      updateIssueTags: (issueId, tagNames) =>
        set((state) => ({
          clusters: state.clusters.map((issue) =>
            issue.id === issueId ? { ...issue, confirmedTags: [...new Set(tagNames)] } : issue
          )
        })),
      linkCaseToIssue: (feedbackId, issueId) => get().linkCasesToIssue([feedbackId], issueId),
      linkCasesToIssue: (feedbackIds, issueId) =>
        set((state) => {
          const selected = new Set(feedbackIds);
          const targets = state.feedback.filter((item) => selected.has(item.id));
          const targetIssue = state.clusters.find((issue) => issue.id === issueId);
          if (
            !targets.length ||
            !targetIssue ||
            targets.some((item) => item.projectId !== targetIssue.projectId)
          ) {
            return state;
          }
          const now = demoNow().toISOString();
          const nextFeedback = state.feedback.map((item) =>
            selected.has(item.id) ? { ...item, issueId, status: 'Linked' as const } : item
          );
          return {
            feedback: nextFeedback,
            clusters: syncIssueCaseData(state.clusters, nextFeedback, now)
          };
        }),
      createIssueFromCases: (input) => {
        const state = get();
        const selected = state.feedback.filter((item) => input.feedbackIds.includes(item.id));
        if (
          !selected.length ||
          !input.title.trim() ||
          selected.some((item) => item.projectId !== input.projectId)
        ) {
          return undefined;
        }
        const now = demoNow().toISOString();
        const id = `issue-manual-${Date.now()}`;
        const issue: ClusterCase = {
          id,
          displayId: nextDisplayId(
            state.clusters.map((item) => item.displayId),
            'ISS',
            1000
          ),
          projectId: input.projectId,
          title: input.title.trim(),
          summary: `由 ${selected.length} 条 Case 人工归并创建。`,
          status: '待确认',
          owner: '未分配',
          team: '待分诊',
          risk: input.priority === 'P0' || input.priority === 'P1' ? '高' : '中',
          priority: input.priority,
          classification: input.classification,
          issueStatus: 'New',
          createdAt: now,
          updatedAt: now,
          firstSeenAt: selected.map((item) => item.occurredAt).toSorted()[0] ?? now,
          lastSeenAt:
            selected
              .map((item) => item.occurredAt)
              .toSorted()
              .at(-1) ?? now,
          caseCount: selected.length,
          caseCount24h: selected.length,
          caseCountPrevious24h: 0,
          notificationStatus: '未通知',
          suggestedTags: [...new Set(selected.flatMap((item) => item.suggestedTags))].slice(0, 4),
          confirmedTags: [
            ...new Set(
              input.tags.length ? input.tags : selected.flatMap((item) => item.confirmedTags)
            )
          ],
          aiAssessment: {
            priority: input.priority,
            businessLine: '待人工补充',
            category: input.classification,
            confidence: 0.72,
            rationale: '模拟 AI 基于所选 Case 提供初始 Issue 建议，最终内容由人工确认。',
            assessedAt: now,
            simulated: true
          },
          feedbackIds: selected.map((item) => item.id),
          featureIds: [],
          history: [
            {
              id: `history-${id}`,
              at: now,
              actor: CURRENT_USER,
              action: `从 ${selected.length} 条 Case 创建 Issue`
            }
          ]
        };
        const selectedIds = new Set(selected.map((item) => item.id));
        set((current) => {
          const nextFeedback = current.feedback.map((item) =>
            selectedIds.has(item.id) ? { ...item, issueId: id, status: 'Linked' as const } : item
          );
          return {
            feedback: nextFeedback,
            clusters: syncIssueCaseData([...current.clusters, issue], nextFeedback, now)
          };
        });
        return id;
      },
      createStandaloneIssue: (input) => {
        const state = get();
        if (!input.title.trim() || !input.projectId) return undefined;
        const now = demoNow().toISOString();
        const id = `issue-manual-${Date.now()}-${feedbackSequence++}`;
        const issue: ClusterCase = {
          id,
          displayId: nextDisplayId(
            state.clusters.map((item) => item.displayId),
            'ISS',
            1000
          ),
          projectId: input.projectId,
          title: input.title.trim(),
          summary: input.summary.trim() || '由人工直接创建，暂未关联 Case 证据。',
          status: '待确认',
          owner: input.owner.trim() || '未分配',
          team: '待分诊',
          risk: input.priority === 'P0' || input.priority === 'P1' ? '高' : '中',
          priority: input.priority,
          classification: input.classification,
          issueStatus: 'New',
          createdAt: now,
          updatedAt: now,
          firstSeenAt: now,
          lastSeenAt: now,
          caseCount: 0,
          caseCount24h: 0,
          caseCountPrevious24h: 0,
          notificationStatus: '未通知',
          suggestedTags: [],
          confirmedTags: [...new Set(input.tags)],
          aiAssessment: {
            priority: input.priority,
            businessLine: '待人工补充',
            category: input.classification,
            confidence: 0.72,
            rationale: '该 Issue 由人工直接创建，AI 未参与最终分类判断。',
            assessedAt: now,
            simulated: true
          },
          feedbackIds: [],
          featureIds: [],
          history: [
            {
              id: `history-${id}`,
              at: now,
              actor: CURRENT_USER,
              action: '直接创建 Issue'
            }
          ]
        };
        set((current) => ({ clusters: [...current.clusters, issue] }));
        return id;
      },
      createBugIssue: (input) => {
        const state = get();
        const selected = state.feedback.filter((item) =>
          (input.feedbackIds ?? []).includes(item.id)
        );
        if (
          !input.title.trim() ||
          !input.projectId ||
          !input.bugDetail.module.trim() ||
          !input.bugDetail.assignee.trim() ||
          !input.bugDetail.screenshotNote?.trim() ||
          !input.bugDetail.reproduction.length ||
          selected.some((item) => item.projectId !== input.projectId)
        ) {
          return undefined;
        }
        const now = demoNow().toISOString();
        const id = `issue-bug-${Date.now()}-${feedbackSequence++}`;
        const selectedIds = new Set(selected.map((item) => item.id));
        const issue: ClusterCase = {
          id,
          displayId: nextDisplayId(
            state.clusters.map((item) => item.displayId),
            'ISS',
            1000
          ),
          projectId: input.projectId,
          title: input.title.trim(),
          summary:
            input.summary?.trim() ||
            (selected.length
              ? `由 ${selected.length} 条 Case 直接确认为 Bug。`
              : '由 QA 直接提交的线上 Bug。'),
          status: '跟进中',
          owner: input.bugDetail.assignee || '未分配',
          team: input.bugDetail.module,
          risk: input.priority === 'P0' || input.priority === 'P1' ? '高' : '中',
          priority: input.priority,
          classification: 'Bug',
          bugDetail: input.bugDetail,
          issueStatus: input.bugDetail.assignee ? 'Assigned' : 'New',
          createdAt: now,
          updatedAt: now,
          firstSeenAt: selected.map((item) => item.occurredAt).toSorted()[0] ?? now,
          lastSeenAt:
            selected
              .map((item) => item.occurredAt)
              .toSorted()
              .at(-1) ?? now,
          caseCount: selected.length,
          caseCount24h: selected.length,
          caseCountPrevious24h: 0,
          notificationStatus: '未通知',
          suggestedTags: [...new Set(selected.flatMap((item) => item.suggestedTags))].slice(0, 4),
          confirmedTags: [...new Set(input.tags)],
          aiAssessment: {
            priority: input.priority,
            businessLine: input.bugDetail.module,
            category: '线上 Bug',
            confidence: 0.72,
            rationale: '该 Bug 由人工确认并录入，AI 仅提供模拟的字段建议。',
            assessedAt: now,
            simulated: true
          },
          feedbackIds: selected.map((item) => item.id),
          featureIds: [],
          history: [
            {
              id: `history-${id}`,
              at: now,
              actor: CURRENT_USER,
              action: selected.length ? `从 ${selected.length} 条 Case 创建 Bug` : '直接提交 Bug'
            }
          ]
        };
        set((current) => {
          const nextFeedback = current.feedback.map((item) =>
            selectedIds.has(item.id) ? { ...item, issueId: id, status: 'Linked' as const } : item
          );
          return {
            feedback: nextFeedback,
            clusters: syncIssueCaseData([...current.clusters, issue], nextFeedback, now)
          };
        });
        return id;
      },
      createImportedBugIssues: (inputs) =>
        inputs
          .map((input) => get().createBugIssue(input))
          .filter((id): id is string => Boolean(id)),
      convertIssueToBug: (issueId, bugDetail) =>
        set((state) => ({
          clusters: state.clusters.map((issue) => {
            if (issue.id !== issueId) return issue;
            const now = new Date().toISOString();
            return {
              ...issue,
              classification: 'Bug' as const,
              bugDetail,
              owner: bugDetail.assignee || '未分配',
              team: bugDetail.module,
              status: '跟进中' as const,
              issueStatus: bugDetail.assignee ? ('Assigned' as const) : ('New' as const),
              updatedAt: now,
              history: [
                ...issue.history,
                {
                  id: `history-${issue.id}-${Date.now()}`,
                  at: now,
                  actor: CURRENT_USER,
                  action: `Issue Classification：${issue.classification} → Bug`
                }
              ]
            };
          })
        })),
      updateIssueTriage: (issueId, input) =>
        set((state) => ({
          clusters: state.clusters.map((issue) => {
            if (issue.id !== issueId) return issue;
            if (input.classification === 'Bug' && issue.classification !== 'Bug') return issue;

            const owner = input.owner.trim() || '未分配';
            const changes: string[] = [];
            if (issue.classification !== input.classification) {
              changes.push(`Classification：${issue.classification} → ${input.classification}`);
            }
            if (issue.priority !== input.priority) {
              changes.push(`Priority：${issue.priority} → ${input.priority}`);
            }
            const currentOwner =
              issue.classification === 'Bug' ? issue.bugDetail?.assignee || '未分配' : issue.owner;
            if (currentOwner !== owner) changes.push(`Owner：${currentOwner} → ${owner}`);
            if (!changes.length) return issue;

            const now = new Date().toISOString();
            const remainsBug = issue.classification === 'Bug' && input.classification === 'Bug';
            return {
              ...issue,
              classification: input.classification,
              priority: input.priority,
              owner,
              issueStatus:
                input.classification === 'Non Issue'
                  ? ('Closed' as const)
                  : remainsBug && issue.bugDetail
                    ? issueStatusForBug(issue.bugDetail.status)
                    : issue.issueStatus,
              bugDetail: remainsBug
                ? issue.bugDetail
                  ? { ...issue.bugDetail, assignee: owner === '未分配' ? '' : owner }
                  : undefined
                : undefined,
              updatedAt: now,
              history: [
                ...issue.history,
                {
                  id: `history-${issue.id}-${Date.now()}`,
                  at: now,
                  actor: CURRENT_USER,
                  action: `人工分诊：${changes.join('；')}`
                }
              ]
            };
          })
        })),
      transitionIssueBug: (issueId, nextStatus, note) =>
        set((state) => ({
          clusters: state.clusters.map((issue) => {
            if (
              issue.id !== issueId ||
              issue.classification !== 'Bug' ||
              !issue.bugDetail ||
              !bugTransitions[issue.bugDetail.status].includes(nextStatus)
            ) {
              return issue;
            }
            const now = demoNow().toISOString();
            const terminal = nextStatus === '已关闭' || nextStatus === '不予修复';
            return {
              ...issue,
              updatedAt: now,
              status: terminal ? ('已解决' as const) : ('跟进中' as const),
              issueStatus: issueStatusForBug(nextStatus),
              resolvedAt: terminal ? now : undefined,
              bugDetail: { ...issue.bugDetail, status: nextStatus },
              history: [
                ...issue.history,
                {
                  id: `history-${issue.id}-${Date.now()}`,
                  at: now,
                  actor: CURRENT_USER,
                  action: `Bug Status：${issue.bugDetail.status} → ${nextStatus}`,
                  note: note?.trim() || undefined
                }
              ]
            };
          })
        })),
      updateCaseClassification: (feedbackId, value) =>
        set((state) => ({
          feedback: state.feedback.map((item) =>
            item.id === feedbackId
              ? {
                  ...item,
                  humanClassification: value,
                  classificationFeedbackAt: new Date().toISOString()
                }
              : item
          )
        })),
      updateCaseStatus: (feedbackId, value) =>
        set((state) => {
          const target = state.feedback.find((item) => item.id === feedbackId);
          if (!target || (value === 'Linked' && !target.issueId)) return state;
          const unlink = value !== 'Linked' && Boolean(target.issueId);
          const now = demoNow().toISOString();
          const nextFeedback = state.feedback.map((item) =>
            item.id === feedbackId
              ? { ...item, issueId: value === 'Linked' ? item.issueId : undefined, status: value }
              : item
          );
          return {
            feedback: nextFeedback,
            clusters: unlink ? syncIssueCaseData(state.clusters, nextFeedback, now) : state.clusters
          };
        }),
      addTag: (name) =>
        set((state) => {
          const value = name.trim();
          if (!value || state.tags.some((tag) => tag.name.toLowerCase() === value.toLowerCase())) {
            return state;
          }
          const timestamp = new Date().toISOString();
          return {
            tags: [
              ...state.tags,
              { id: `tag-${Date.now()}`, name: value, createdAt: timestamp, updatedAt: timestamp }
            ]
          };
        }),
      renameTag: (tagId, name) =>
        set((state) => {
          const target = state.tags.find((tag) => tag.id === tagId);
          const value = name.trim();
          if (
            !target ||
            !value ||
            state.tags.some((tag) => tag.id !== tagId && tag.name === value)
          ) {
            return state;
          }
          return {
            tags: state.tags.map((tag) =>
              tag.id === tagId ? { ...tag, name: value, updatedAt: new Date().toISOString() } : tag
            ),
            feedback: state.feedback.map((item) => ({
              ...item,
              suggestedTags: item.suggestedTags.map((tag) => (tag === target.name ? value : tag)),
              confirmedTags: item.confirmedTags.map((tag) => (tag === target.name ? value : tag))
            })),
            clusters: state.clusters.map((issue) => ({
              ...issue,
              suggestedTags: issue.suggestedTags.map((tag) => (tag === target.name ? value : tag)),
              confirmedTags: issue.confirmedTags.map((tag) => (tag === target.name ? value : tag))
            }))
          };
        }),
      deleteTag: (tagId) =>
        set((state) => {
          const target = state.tags.find((tag) => tag.id === tagId);
          if (!target) return state;
          return {
            tags: state.tags.filter((tag) => tag.id !== tagId),
            feedback: state.feedback.map((item) => ({
              ...item,
              suggestedTags: item.suggestedTags.filter((tag) => tag !== target.name),
              confirmedTags: item.confirmedTags.filter((tag) => tag !== target.name)
            })),
            clusters: state.clusters.map((issue) => ({
              ...issue,
              suggestedTags: issue.suggestedTags.filter((tag) => tag !== target.name),
              confirmedTags: issue.confirmedTags.filter((tag) => tag !== target.name)
            }))
          };
        }),
      assignIssue: (issueId) =>
        set((state) => ({
          clusters: state.clusters.map((issue) =>
            issue.id === issueId
              ? {
                  ...issue,
                  owner: '周齐',
                  team: 'Client QA',
                  bugDetail: issue.bugDetail
                    ? { ...issue.bugDetail, assignee: '周齐', status: '已指派' }
                    : undefined,
                  issueStatus: issue.issueStatus === 'New' ? 'Assigned' : issue.issueStatus,
                  updatedAt: new Date().toISOString()
                }
              : issue
          )
        })),
      correctCaseClassification: (feedbackId) =>
        set((state) => {
          const target = state.feedback.find((item) => item.id === feedbackId);
          if (!target || target.humanClassification === 'Non Issue') return state;
          const now = demoNow().toISOString();
          const nextFeedback = state.feedback.map((item) =>
            item.id === feedbackId
              ? {
                  ...item,
                  issueId: undefined,
                  status: 'Closed' as const,
                  humanClassification: 'Non Issue' as const,
                  classificationFeedbackAt: now
                }
              : item
          );
          return {
            feedback: nextFeedback,
            clusters: syncIssueCaseData(state.clusters, nextFeedback, now)
          };
        }),
      createIssueTicket: (issueId) =>
        set((state) => ({
          clusters: state.clusters.map((issue) =>
            issue.id === issueId && !issue.relatedTicket
              ? {
                  ...issue,
                  relatedTicket: `BUG-${1200 + state.clusters.findIndex((item) => item.id === issueId)}`,
                  updatedAt: new Date().toISOString()
                }
              : issue
          )
        })),
      decideCluster: (clusterId, priority) =>
        set((state) => ({
          clusters: state.clusters.map((cluster) =>
            cluster.id === clusterId
              ? {
                  ...cluster,
                  priority,
                  risk: priority === 'P0' || priority === 'P1' ? '高' : cluster.risk,
                  humanDecision: {
                    priority,
                    businessLine: cluster.aiAssessment.businessLine,
                    conclusion: cluster.humanDecision?.conclusion ?? 'Bug',
                    decidedBy: '当前演示用户',
                    decidedAt: new Date().toISOString()
                  },
                  history: [
                    ...cluster.history,
                    {
                      id: `history-${Date.now()}`,
                      at: new Date().toISOString(),
                      actor: '当前演示用户',
                      action: `人工调整为 ${priority}`
                    }
                  ]
                }
              : cluster
          )
        })),
      saveTestCase: (input) => {
        const now = new Date().toISOString();
        const id = input.id ?? `test-case-${Date.now()}`;
        set((state) => {
          const existing = state.testCases.find((item) => item.id === id);
          const next: TestCase = {
            ...input,
            id,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
          };
          return {
            testCases: existing
              ? state.testCases.map((item) => (item.id === id ? next : item))
              : [...state.testCases, next]
          };
        });
        return id;
      },
      deleteTestCase: (testCaseId) =>
        set((state) => ({
          testCases: state.testCases.filter((item) => item.id !== testCaseId)
        })),
      duplicateTestCase: (testCaseId) => {
        let newId: string | undefined;
        set((state) => {
          const source = state.testCases.find((item) => item.id === testCaseId);
          if (!source) return state;
          const now = new Date().toISOString();
          newId = `test-case-${Date.now()}`;
          return {
            testCases: [
              ...state.testCases,
              {
                ...source,
                id: newId,
                title: `${source.title}（副本）`,
                createdAt: now,
                updatedAt: now
              }
            ]
          };
        });
        return newId;
      },
      saveGeneratedTestCases: (inputs) => {
        const now = new Date().toISOString();
        const ids = inputs.map((_, index) => `test-case-ai-${Date.now()}-${index + 1}`);
        set((state) => ({
          testCases: [
            ...state.testCases,
            ...inputs.map((input, index) => ({
              ...input,
              id: ids[index],
              createdAt: now,
              updatedAt: now
            }))
          ]
        }));
        return ids;
      },
      createTestActivity: (input) => {
        const selected = get().testCases.filter(
          (testCase) =>
            input.selectedCaseIds.includes(testCase.id) &&
            testCase.projectId === input.projectId &&
            testCase.platforms.some((platform) => input.platforms.includes(platform))
        );
        if (!input.name.trim() || !input.platforms.length || !selected.length) return undefined;
        const now = new Date().toISOString();
        const activityId = `test-activity-${Date.now()}`;
        const runId = `test-run-${Date.now()}`;
        const results: TestCaseResult[] = selected.flatMap((testCase) =>
          input.platforms
            .filter((platform) => testCase.platforms.includes(platform))
            .map((platform) => ({
              testCaseId: testCase.id,
              platform,
              snapshot: snapshotTestCase(testCase),
              status: '未执行' as const,
              note: '',
              evidence: []
            }))
        );
        const activity: TestActivity = {
          ...input,
          id: activityId,
          name: input.name.trim(),
          targetLabel: input.targetLabel?.trim() || undefined,
          status: '准备中',
          selectedCaseIds: selected.map((item) => item.id),
          runIds: [runId],
          createdAt: now,
          updatedAt: now
        };
        const run: TestRun = {
          id: runId,
          activityId,
          buildId: input.targetBuildId,
          runNumber: 1,
          createdAt: now,
          executor: CURRENT_USER,
          simulated: false,
          results
        };
        set((state) => ({
          testActivities: [...state.testActivities, activity],
          testRuns: [...state.testRuns, run]
        }));
        return activityId;
      },
      startTestActivity: (activityId) =>
        set((state) => ({
          testActivities: state.testActivities.map((item) =>
            item.id === activityId
              ? { ...item, status: '执行中' as const, updatedAt: new Date().toISOString() }
              : item
          )
        })),
      updateTestResult: (runId, testCaseId, platform, status, note) =>
        set((state) => {
          const updatedAt = new Date().toISOString();
          const run = state.testRuns.find((item) => item.id === runId);
          return {
            testRuns: state.testRuns.map((item) =>
              item.id === runId
                ? {
                    ...item,
                    results: item.results.map((result) =>
                      result.testCaseId === testCaseId && result.platform === platform
                        ? { ...result, status, note: note.trim(), updatedAt }
                        : result
                    )
                  }
                : item
            ),
            testActivities: run
              ? state.testActivities.map((item) =>
                  item.id === run.activityId ? { ...item, updatedAt } : item
                )
              : state.testActivities
          };
        }),
      completeTestActivity: (activityId) =>
        set((state) => ({
          testActivities: state.testActivities.map((item) =>
            item.id === activityId
              ? { ...item, status: '已完成' as const, updatedAt: new Date().toISOString() }
              : item
          )
        })),
      registerBuild: (versionId, label) =>
        set((state) => {
          if (
            state.builds.some((build) => build.versionId === versionId && build.label === label)
          ) {
            return state;
          }
          const buildId = `build-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
          const version = state.versions.find((item) => item.id === versionId);
          const build: Build = {
            id: buildId,
            versionId,
            platform: version?.platforms[0] ?? 'Android',
            label,
            createdAt: new Date().toISOString(),
            source: '手工登记',
            status: '候选'
          };
          return {
            builds: [...state.builds, build],
            versions: state.versions.map((version) =>
              version.id === versionId
                ? { ...version, buildIds: [...version.buildIds, buildId] }
                : version
            )
          };
        }),
      rerunActivity: (activityId, buildId) =>
        set((state) => {
          const activity = state.testActivities.find((item) => item.id === activityId);
          const previousRuns = state.testRuns.filter((run) => run.activityId === activityId);
          const previous = previousRuns.at(-1);
          if (!activity || !previous) return state;
          const runId = `run-${activityId}-${Date.now()}`;
          const run: TestRun = {
            id: runId,
            activityId,
            buildId: buildId ?? activity.targetBuildId,
            runNumber: Math.max(...previousRuns.map((item) => item.runNumber)) + 1,
            createdAt: new Date().toISOString(),
            executor: '当前演示用户',
            simulated: false,
            results: previous.results.map((result) => ({
              ...result,
              status: '未执行',
              note: '',
              evidence: []
            }))
          };
          return {
            testRuns: [...state.testRuns, run],
            testActivities: state.testActivities.map((item) =>
              item.id === activityId
                ? {
                    ...item,
                    targetBuildId: buildId ?? item.targetBuildId,
                    status: '执行中' as const,
                    updatedAt: new Date().toISOString(),
                    runIds: [...item.runIds, runId]
                  }
                : item
            )
          };
        }),
      notifyIssueOwner: (issueId) =>
        set((state) => ({
          clusters: state.clusters.map((issue) =>
            issue.id === issueId
              ? {
                  ...issue,
                  notificationStatus: '已通知',
                  notificationTime: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              : issue
          )
        })),
      resetDemo: () => set(createSeedData()),
      transitionIssue: (issueId, nextStatus) =>
        set((state) => ({
          clusters: state.clusters.map((issue) => {
            if (
              issue.id !== issueId ||
              issue.classification === 'Bug' ||
              !issueTransitions[issue.issueStatus].includes(nextStatus)
            ) {
              return issue;
            }
            const changedAt = new Date().toISOString();
            return {
              ...issue,
              issueStatus: nextStatus,
              status:
                nextStatus === 'Closed'
                  ? '已解决'
                  : nextStatus === 'Resolved'
                    ? '观察中'
                    : '跟进中',
              resolvedAt: nextStatus === 'Resolved' ? changedAt : issue.resolvedAt,
              blockedReason:
                nextStatus === 'Blocked'
                  ? (issue.blockedReason ?? '等待跨团队依赖确认（Demo）')
                  : issue.blockedReason,
              possibleRegression: nextStatus === 'Developing' ? false : issue.possibleRegression,
              updatedAt: changedAt,
              history: [
                ...issue.history,
                {
                  id: `history-${issueId}-${Date.now()}`,
                  at: changedAt,
                  actor: '当前演示用户',
                  action: `Issue 状态变更：${issue.issueStatus} → ${nextStatus}`
                }
              ]
            };
          })
        })),
      transitionBug: (bugId, nextStatus) =>
        set((state) => ({
          bugs: state.bugs.map((bug) => {
            if (bug.id !== bugId || !bugTransitions[bug.status].includes(nextStatus)) return bug;
            return {
              ...bug,
              status: nextStatus,
              history: [
                ...bug.history,
                {
                  id: `history-${bugId}-${Date.now()}`,
                  at: new Date().toISOString(),
                  actor: '当前演示用户',
                  action: `状态变更：${bug.status} → ${nextStatus}`
                }
              ]
            };
          })
        })),
      unlinkCaseFromIssue: (feedbackId) =>
        set((state) => {
          const target = state.feedback.find((item) => item.id === feedbackId);
          if (!target || !target.issueId) return state;
          const now = demoNow().toISOString();
          const nextFeedback = state.feedback.map((item) =>
            item.id === feedbackId
              ? { ...item, issueId: undefined, status: 'Pending' as const }
              : item
          );
          return {
            feedback: nextFeedback,
            clusters: syncIssueCaseData(state.clusters, nextFeedback, now)
          };
        }),
      createResourceReservation: (input) => {
        const state = get();
        const resource = state.resources.find((item) => item.id === input.resourceId);
        if (!resource) return { ok: false, message: '未找到该资源。' };
        if (!input.purpose.trim() || !input.user.trim()) {
          return { ok: false, message: '请填写预约人和用途。' };
        }
        if (!input.startDate || !input.endDate || input.startDate > input.endDate) {
          return { ok: false, message: '请选择有效的开始和结束日期。' };
        }
        const conflict = state.resourceReservations.find(
          (item) =>
            item.resourceId === input.resourceId &&
            dateRangesOverlap(input.startDate, input.endDate, item.startDate, item.endDate)
        );
        const activeLoan = state.resourceLoans.find(
          (item) =>
            item.resourceId === input.resourceId &&
            !item.returnedAt &&
            dateRangesOverlap(input.startDate, input.endDate, item.borrowedAt, item.dueDate)
        );
        if (conflict || activeLoan) {
          const holder = conflict?.user ?? activeLoan?.borrower;
          const purpose = conflict?.purpose ?? activeLoan?.purpose;
          const start = conflict?.startDate ?? activeLoan?.borrowedAt;
          const end = conflict?.endDate ?? activeLoan?.dueDate;
          return {
            ok: false,
            message: `时间冲突：${holder} · ${purpose} · ${start} 至 ${end}`
          };
        }
        set((current) => ({
          resourceReservations: [
            ...current.resourceReservations,
            {
              id: `reservation-${Date.now()}`,
              ...input,
              createdAt: new Date().toISOString()
            }
          ]
        }));
        return { ok: true, message: `${resource.name} 已预约。` };
      },
      borrowResource: (input) => {
        const state = get();
        const resource = state.resources.find((item) => item.id === input.resourceId);
        if (!resource) return { ok: false, message: '未找到该资源。' };
        if (resource.status === '离线') return { ok: false, message: '离线资源不能借出。' };
        if (
          state.resourceLoans.some(
            (item) => item.resourceId === input.resourceId && !item.returnedAt
          )
        ) {
          return { ok: false, message: '该资源当前已被占用，不能重复借出。' };
        }
        if (!input.borrower.trim() || !input.purpose.trim()) {
          return { ok: false, message: '请填写借用人和用途。' };
        }
        if (!input.borrowedAt || !input.dueDate || input.borrowedAt > input.dueDate) {
          return { ok: false, message: '请选择有效的借出和预计归还日期。' };
        }
        set((current) => ({
          resources: current.resources.map((item) =>
            item.id === input.resourceId ? { ...item, status: '占用' as const } : item
          ),
          resourceLoans: [...current.resourceLoans, { id: `loan-${Date.now()}`, ...input }]
        }));
        return { ok: true, message: `${resource.name} 已登记借出。` };
      },
      returnResource: (resourceId, returnedAt) =>
        set((state) => ({
          resources: state.resources.map((item) =>
            item.id === resourceId ? { ...item, status: '可用' as const } : item
          ),
          resourceLoans: state.resourceLoans.map((item) =>
            item.resourceId === resourceId && !item.returnedAt ? { ...item, returnedAt } : item
          )
        })),
      registerResource: (input) => {
        const id = `resource-${Date.now()}`;
        set((state) => ({ resources: [...state.resources, { id, ...input }] }));
        return id;
      },
      createCheckInstance: (input) => {
        const state = get();
        const template = state.checkTemplates.find((item) => item.id === input.templateId);
        if (!template || !input.target.trim()) return undefined;
        const stamp = Date.now();
        const id = `check-instance-${stamp}`;
        const createdAt = new Date().toISOString();
        const snapshot = structuredClone(template.groups);
        set((current) => ({
          checkInstances: [
            ...current.checkInstances,
            {
              id,
              projectId: input.projectId,
              versionId: input.versionId,
              scenario: input.scenario,
              templateId: template.id,
              templateName: template.name,
              templateSnapshot: snapshot,
              target: input.target.trim(),
              versionNotes: input.versionNotes.trim(),
              createdBy: CURRENT_USER,
              createdAt,
              updatedAt: createdAt,
              items: snapshot.flatMap((group) =>
                group.items.map((item) => ({
                  id: `${id}-${item.id}`,
                  groupName: group.name,
                  title: item.title,
                  description: item.description,
                  isCritical: item.isCritical,
                  source: '模板' as const,
                  status: '待处理' as const
                }))
              ),
              suggestions: createCheckSuggestions({
                scenario: input.scenario,
                templateGroups: snapshot,
                versionNotes: input.versionNotes
              }).suggestions.map((suggestion, index) => ({
                id: `${id}-suggestion-${index + 1}`,
                ...suggestion,
                status: '待确认' as const
              }))
            }
          ]
        }));
        return id;
      },
      updateCheckItem: (instanceId, itemId, status, skipReason) => {
        if (status === '跳过' && !skipReason?.trim()) {
          return { ok: false, message: '跳过检查项必须填写原因。' };
        }
        const handledAt = status === '待处理' ? undefined : new Date().toISOString();
        set((state) => ({
          checkInstances: state.checkInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  updatedAt: new Date().toISOString(),
                  items: instance.items.map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          status,
                          skipReason: status === '跳过' ? skipReason?.trim() : undefined,
                          handledBy: status === '待处理' ? undefined : CURRENT_USER,
                          handledAt
                        }
                      : item
                  )
                }
              : instance
          )
        }));
        return { ok: true, message: '检查项已更新。' };
      },
      decideCheckSuggestion: (instanceId, suggestionId, decision, editedTitle) =>
        set((state) => ({
          checkInstances: state.checkInstances.map((instance) => {
            if (instance.id !== instanceId) return instance;
            const suggestion = instance.suggestions.find((item) => item.id === suggestionId);
            if (!suggestion || suggestion.status !== '待确认') return instance;
            const title = editedTitle?.trim() || suggestion.title;
            return {
              ...instance,
              updatedAt: new Date().toISOString(),
              suggestions: instance.suggestions.map((item) =>
                item.id === suggestionId
                  ? { ...item, title, status: decision === 'accept' ? '已接受' : '已忽略' }
                  : item
              ),
              items:
                decision === 'accept'
                  ? [
                      ...instance.items,
                      {
                        id: `${instance.id}-ai-${suggestionId}`,
                        groupName: 'AI 补充项',
                        title,
                        isCritical: false,
                        source: 'AI 建议' as const,
                        status: '待处理' as const
                      }
                    ]
                  : instance.items
            };
          })
        })),
      addManualCheckItem: (instanceId, title) => {
        if (!title.trim()) return;
        set((state) => ({
          checkInstances: state.checkInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  updatedAt: new Date().toISOString(),
                  items: [
                    ...instance.items,
                    {
                      id: `${instance.id}-manual-${Date.now()}`,
                      groupName: '人工补充项',
                      title: title.trim(),
                      isCritical: false,
                      source: '人工新增' as const,
                      status: '待处理' as const
                    }
                  ]
                }
              : instance
          )
        }));
      },
      saveCheckTemplate: (input) => {
        const id = input.id ?? `check-template-${Date.now()}`;
        const updatedAt = new Date().toISOString();
        set((state) => ({
          checkTemplates: state.checkTemplates.some((item) => item.id === id)
            ? state.checkTemplates.map((item) =>
                item.id === id ? { ...item, ...input, id, updatedAt } : item
              )
            : [...state.checkTemplates, { ...input, id, updatedAt }]
        }));
        return id;
      },
      deleteCheckTemplate: (templateId) => {
        set((state) => ({
          checkTemplates: state.checkTemplates.filter((item) => item.id !== templateId)
        }));
        return { ok: true, message: '模板已删除，已有实例快照保持不变。' };
      }
    }),
    {
      name: DEMO_STORAGE_KEY,
      skipHydration: true,
      partialize: ({
        projects,
        feedback,
        clusters,
        bugs,
        features,
        versions,
        builds,
        testCases,
        testActivities,
        testRuns,
        reports,
        checkTemplates,
        checkInstances,
        resources,
        resourceReservations,
        resourceLoans,
        tags
      }) => ({
        projects,
        feedback,
        clusters,
        bugs,
        features,
        versions,
        builds,
        testCases,
        testActivities,
        testRuns,
        reports,
        checkTemplates,
        checkInstances,
        resources,
        resourceReservations,
        resourceLoans,
        tags
      })
    }
  )
);
