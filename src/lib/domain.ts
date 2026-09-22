export type EntityId = string;

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type Severity = '致命' | '严重' | '一般' | '轻微';
export type WorkStatus = '待分诊' | '已指派' | '修复中' | '待验收' | '已关闭' | '不予修复';
export type TestResultStatus = '通过' | '失败' | '阻塞' | '未执行';
export type TestPlatform = 'Android' | 'iOS';
export type TestTargetType = '线上版本' | '开发版本' | '专项测试';
export type TestActivityStatus = '准备中' | '执行中' | '已完成';
export type IssueStatus =
  | 'New'
  | 'Assigned'
  | 'Following Up'
  | 'Developing'
  | 'Verifying'
  | 'Resolved'
  | 'Closed'
  | 'Blocked';
export type SourceChannel =
  | 'Discord'
  | 'Reddit'
  | 'X'
  | 'YouTube'
  | 'Telegram'
  | 'Internal'
  | 'Other';
export type IntakeMethod = 'auto' | 'manual_single' | 'manual_batch';
export type TagStatus = 'pending' | 'confirmed';
export type CaseStatus = 'Pending' | 'Needs Info' | 'Linked' | 'Closed';
export type CaseClassification = 'Bug' | 'Feature' | 'Non Issue' | 'Unclear';
export type IssueClassification = 'Pending' | 'Bug' | 'Feature' | 'Improvement' | 'Non Issue';
export type BugStatus = WorkStatus;

export interface IssueBugDetail {
  reproduction: string[];
  module: string;
  severity: Severity;
  screenshotNote?: string;
  assignee: string;
  status: BugStatus;
}

export interface CaseAttachment {
  id: EntityId;
  name: string;
  type: 'image';
  url: string;
  isMock: boolean;
}

export interface HistoryEvent {
  id: EntityId;
  at: string;
  actor: string;
  action: string;
  note?: string;
}

export interface Project {
  id: EntityId;
  name: string;
  code: string;
  owner: string;
}

export interface RawFeedback {
  id: EntityId;
  caseId: string;
  projectId: EntityId;
  issueId?: EntityId;
  status: CaseStatus;
  channel: SourceChannel;
  intakeMethod: IntakeMethod;
  submittedBy: string;
  text: string;
  occurredAt: string;
  caseCreatedAt: string;
  suggestedTags: string[];
  confirmedTags: string[];
  tagStatus: TagStatus;
  simulated: boolean;
  originalUrl?: string;
  author?: string;
  aiClassification: CaseClassification;
  aiConfidence: number;
  aiReason: string;
  humanClassification?: CaseClassification;
  classificationFeedbackAt?: string;
  issueMatchReason?: string;
  attachments: CaseAttachment[];
}

export interface AiAssessment {
  priority: Priority;
  businessLine: string;
  category: string;
  confidence: number;
  rationale: string;
  assessedAt: string;
  simulated: true;
}

export interface ClusterCase {
  id: EntityId;
  displayId: string;
  projectId: EntityId;
  title: string;
  summary: string;
  status: '待确认' | '跟进中' | '观察中' | '已解决';
  owner: string;
  team: string;
  risk: '高' | '中' | '低';
  priority: Priority;
  classification: IssueClassification;
  bugDetail?: IssueBugDetail;
  issueStatus: IssueStatus;
  previousPeriodStatus?: IssueStatus;
  createdAt: string;
  updatedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  caseCount: number;
  caseCount24h: number;
  caseCountPrevious24h: number;
  relatedTicket?: string;
  notificationStatus: '未通知' | '已通知';
  notificationTime?: string;
  blockedReason?: string;
  resolvedAt?: string;
  casesBeforeResolution?: number;
  casesAfterResolution?: number;
  possibleRegression?: boolean;
  suggestedTags: string[];
  confirmedTags: string[];
  aiAssessment: AiAssessment;
  humanDecision?: {
    priority: Priority;
    businessLine: string;
    conclusion: 'Bug' | 'Feature' | '信息不足' | '已知问题' | '非缺陷';
    decidedBy: string;
    decidedAt: string;
  };
  feedbackIds: EntityId[];
  featureIds: EntityId[];
  history: HistoryEvent[];
}

export interface Tag {
  id: EntityId;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bug {
  id: EntityId;
  projectId: EntityId;
  sourceCaseIds: EntityId[];
  title: string;
  reproduction: string[];
  module: string;
  severity: Severity;
  priority: Priority;
  assignee: string;
  status: WorkStatus;
  foundInBuildId?: EntityId;
  targetVersionId?: EntityId;
  fixedInBuildId?: EntityId;
  acceptedAt?: string;
  releasedAt?: string;
  history: HistoryEvent[];
}

export interface Feature {
  id: EntityId;
  projectId: EntityId;
  sourceCaseIds: EntityId[];
  title: string;
  status: '待办' | '已排期' | '进行中' | '已完成';
  targetVersionId?: EntityId;
}

export interface Version {
  id: EntityId;
  projectId: EntityId;
  name: string;
  platforms: Array<'iOS' | 'Android'>;
  scope: string[];
  acceptanceCriteria: string[];
  status: '规划中' | '测试中' | '待发布' | '已发布';
  buildIds: EntityId[];
}

export interface Build {
  id: EntityId;
  versionId: EntityId;
  platform: 'iOS' | 'Android';
  label: string;
  createdAt: string;
  source: '模拟合并' | '手工登记';
  status: '候选' | '验证中' | '可发布' | '已发布' | '已废弃';
}

export interface TestCase {
  id: EntityId;
  projectId: EntityId;
  platforms: TestPlatform[];
  module: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expected: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseSnapshot {
  sourceTestCaseId: EntityId;
  projectId: EntityId;
  platforms: TestPlatform[];
  module: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expected: string;
  priority: Priority;
}

export interface TestCaseResult {
  testCaseId: EntityId;
  platform: TestPlatform;
  snapshot: TestCaseSnapshot;
  status: TestResultStatus;
  note: string;
  evidence: string[];
  updatedAt?: string;
}

export interface TestRun {
  id: EntityId;
  activityId: EntityId;
  buildId?: EntityId;
  runNumber: number;
  createdAt: string;
  executor: string;
  simulated: boolean;
  results: TestCaseResult[];
}

export interface TestActivity {
  id: EntityId;
  projectId: EntityId;
  versionId?: EntityId;
  name: string;
  platforms: TestPlatform[];
  targetType: TestTargetType;
  targetBuildId?: EntityId;
  targetLabel?: string;
  status: TestActivityStatus;
  selectedCaseIds: EntityId[];
  runIds: EntityId[];
  createdAt: string;
  updatedAt: string;
}

export interface QualityReport {
  id: EntityId;
  versionId: EntityId;
  buildId: EntityId;
  createdAt: string;
  recommendation: '建议发布' | '有条件发布' | '暂缓发布';
  confirmedBy?: string;
  facts: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    unexecuted: number;
  };
  evidenceRunIds: EntityId[];
  riskSummary: string;
  simulatedSummary: true;
}

export type CheckScenario =
  | '客户端常规版本'
  | '客户端 Hotfix'
  | '配置 / 数值更新'
  | '活动上线'
  | '资源热更'
  | 'SDK / 渠道版本';
export type CheckItemStatus = '待处理' | '完成' | '跳过';
export type CheckItemSource = '模板' | 'AI 建议' | '人工新增';

export interface CheckTemplateItem {
  id: EntityId;
  title: string;
  description?: string;
  isCritical: boolean;
}

export interface CheckTemplateGroup {
  id: EntityId;
  name: string;
  items: CheckTemplateItem[];
}

export interface CheckTemplate {
  id: EntityId;
  name: string;
  scenario: CheckScenario;
  description: string;
  groups: CheckTemplateGroup[];
  updatedAt: string;
}

export interface CheckItem {
  id: EntityId;
  groupName: string;
  title: string;
  description?: string;
  isCritical: boolean;
  source: CheckItemSource;
  status: CheckItemStatus;
  skipReason?: string;
  handledBy?: string;
  handledAt?: string;
}

export interface CheckSuggestion {
  id: EntityId;
  title: string;
  reason: string;
  status: '待确认' | '已接受' | '已忽略';
}

export interface CheckInstance {
  id: EntityId;
  projectId: EntityId;
  versionId: EntityId;
  scenario: CheckScenario;
  templateId: EntityId;
  templateName: string;
  templateSnapshot: CheckTemplateGroup[];
  target: string;
  versionNotes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  items: CheckItem[];
  suggestions: CheckSuggestion[];
}

export interface Resource {
  id: EntityId;
  type: '设备' | '测试账号';
  name: string;
  platform: string;
  model?: string;
  systemVersion?: string;
  status: '可用' | '占用' | '离线';
  tags: string[];
}

export interface ResourceReservation {
  id: EntityId;
  resourceId: EntityId;
  user: string;
  purpose: string;
  startDate: string;
  endDate: string;
  activityId?: EntityId;
  createdAt: string;
}

export interface ResourceLoan {
  id: EntityId;
  resourceId: EntityId;
  borrower: string;
  purpose: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  activityId?: EntityId;
}
