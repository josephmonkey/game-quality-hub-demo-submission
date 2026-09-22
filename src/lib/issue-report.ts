import type { ClusterCase, RawFeedback } from '@/lib/domain';

const DAY_MS = 86_400_000;

export type ReportCriteria = {
  appId: string;
  start: string;
  end: string;
  topCount: number;
};

export type Comparison = {
  current: number;
  previous: number;
  delta: number;
  percent: number | null;
};

export type IssueReportRow = {
  issue: ClusterCase;
  currentCases: RawFeedback[];
  previousCases: RawFeedback[];
  comparison: Comparison;
};

export type AttentionItem = IssueReportRow & {
  reasons: string[];
  action: string;
};

function dateValue(date: string) {
  return new Date(`${date}T12:00:00+08:00`).getTime();
}

function dateString(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function previousPeriod(start: string, end: string) {
  const duration = Math.max(0, Math.round((dateValue(end) - dateValue(start)) / DAY_MS));
  const previousEnd = dateValue(start) - DAY_MS;
  return {
    start: dateString(previousEnd - duration * DAY_MS),
    end: dateString(previousEnd)
  };
}

export function inDateRange(iso: string, start: string, end: string) {
  const date = iso.slice(0, 10);
  return date >= start && date <= end;
}

function compare(current: number, previous: number): Comparison {
  return {
    current,
    previous,
    delta: current - previous,
    percent: previous === 0 ? null : Math.round(((current - previous) / previous) * 100)
  };
}

function countTags(cases: RawFeedback[]) {
  const counts = new Map<string, number>();
  cases.forEach((item) =>
    item.confirmedTags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
  );
  return counts;
}

function issueAge(issue: ClusterCase, end: string) {
  return Math.max(0, Math.floor((dateValue(end) - new Date(issue.createdAt).getTime()) / DAY_MS));
}

function isOpenAt(issue: ClusterCase, end: string) {
  if (issue.createdAt.slice(0, 10) > end) return false;
  if (issue.resolvedAt && issue.resolvedAt.slice(0, 10) <= end) return false;
  return issue.issueStatus !== 'Closed';
}

function actionFor(issue: ClusterCase, reasons: string[]) {
  if (issue.issueStatus === 'Blocked') {
    return `推动 ${issue.team} 解除阻塞并提供下一步时间点。`;
  }
  if (issue.owner === '未分配') return '尽快完成 Owner 分配并确认首个处理节点。';
  if (issue.possibleRegression) return '复核修复版本，并安排同场景回归验证。';
  if (reasons.some((reason) => reason.includes('快速增长'))) {
    return `请 ${issue.owner} 优先确认影响范围并给出止损方案。`;
  }
  return `请 ${issue.owner} 更新处理结论与预计关闭时间。`;
}

export function formatPercent(comparison: Comparison) {
  if (comparison.previous === 0) return comparison.current > 0 ? '新增' : '—';
  if (comparison.percent === 0) return '持平';
  return `${(comparison.percent ?? 0) > 0 ? '↑' : '↓'}${Math.abs(comparison.percent ?? 0)}%`;
}

export function formatDelta(comparison: Comparison) {
  if (comparison.delta === 0) return '持平';
  return `${comparison.delta > 0 ? '↑' : '↓'}${Math.abs(comparison.delta)}`;
}

export function buildIssueReport(
  criteria: ReportCriteria,
  allCases: RawFeedback[],
  allIssues: ClusterCase[]
) {
  const previous = previousPeriod(criteria.start, criteria.end);
  const scopedCases = allCases.filter(
    (item) => criteria.appId === 'all' || item.projectId === criteria.appId
  );
  const issues = allIssues.filter(
    (issue) => criteria.appId === 'all' || issue.projectId === criteria.appId
  );
  const currentCases = scopedCases.filter((item) =>
    inDateRange(item.caseCreatedAt, criteria.start, criteria.end)
  );
  const previousCases = scopedCases.filter((item) =>
    inDateRange(item.caseCreatedAt, previous.start, previous.end)
  );
  const currentTags = countTags(currentCases);
  const previousTags = countTags(previousCases);
  const tags = [...new Set([...currentTags.keys(), ...previousTags.keys()])]
    .map((tag) => ({
      tag,
      ...compare(currentTags.get(tag) ?? 0, previousTags.get(tag) ?? 0)
    }))
    .filter((item) => item.current > 0)
    .toSorted((a, b) => b.current - a.current || b.delta - a.delta);

  const issueRows: IssueReportRow[] = issues.map((issue) => {
    const currentIssueCases = currentCases.filter((item) => item.issueId === issue.id);
    const previousIssueCases = previousCases.filter((item) => item.issueId === issue.id);
    return {
      issue,
      currentCases: currentIssueCases,
      previousCases: previousIssueCases,
      comparison: compare(currentIssueCases.length, previousIssueCases.length)
    };
  });
  const priorityWeight = { P0: 16, P1: 10, P2: 4, P3: 0 };
  const score = (row: IssueReportRow) =>
    row.currentCases.length * 4 +
    Math.max(0, row.comparison.percent ?? 120) / 20 +
    priorityWeight[row.issue.priority] +
    (row.issue.issueStatus === 'Blocked' ? 12 : 0) +
    (row.issue.possibleRegression ? 12 : 0) +
    (issueAge(row.issue, criteria.end) > 14 ? 6 : 0);
  const coreIssues = issueRows
    .filter((row) => row.currentCases.length > 0)
    .toSorted((a, b) => score(b) - score(a))
    .slice(0, criteria.topCount);

  const newIssues = issueRows.filter((row) =>
    inDateRange(row.issue.createdAt, criteria.start, criteria.end)
  );
  const resolvedIssues = issueRows.filter(
    (row) => row.issue.resolvedAt && inDateRange(row.issue.resolvedAt, criteria.start, criteria.end)
  );
  const progressingIssues = issueRows.filter(
    (row) =>
      !newIssues.includes(row) &&
      !resolvedIssues.includes(row) &&
      row.issue.previousPeriodStatus &&
      row.issue.previousPeriodStatus !== row.issue.issueStatus &&
      !['Resolved', 'Closed'].includes(row.issue.issueStatus)
  );

  const attention: AttentionItem[] = issueRows
    .map((row) => {
      const reasons: string[] = [];
      const age = issueAge(row.issue, criteria.end);
      if (row.issue.issueStatus === 'Blocked') {
        reasons.push(
          row.issue.blockedReason ? `阻塞：${row.issue.blockedReason}` : 'Issue 当前被阻塞'
        );
      }
      if (age > 7 && !['Resolved', 'Closed'].includes(row.issue.issueStatus)) {
        reasons.push(`已持续 ${age} 天未关闭`);
      }
      if (
        ['P0', 'P1'].includes(row.issue.priority) &&
        age > 3 &&
        !['Resolved', 'Closed'].includes(row.issue.issueStatus)
      ) {
        reasons.push(`${row.issue.priority} 高优问题仍未解决`);
      }
      if (
        row.currentCases.length >= 5 &&
        (row.comparison.percent === null || row.comparison.percent >= 100)
      ) {
        reasons.push(`反馈快速增长：本期 ${row.currentCases.length} Cases`);
      }
      if (row.issue.possibleRegression) reasons.push('修复后仍有新增反馈，疑似未生效或回归');
      if (row.issue.owner === '未分配') reasons.push('尚未分配 Owner');
      return { ...row, reasons, action: actionFor(row.issue, reasons) };
    })
    .filter((row) => row.reasons.length > 0)
    .toSorted(
      (a, b) => b.reasons.length - a.reasons.length || b.currentCases.length - a.currentCases.length
    );

  const fixEffects = issueRows
    .filter(
      (row) =>
        ['Resolved', 'Closed'].includes(row.issue.issueStatus) &&
        row.issue.casesBeforeResolution !== undefined &&
        row.issue.casesAfterResolution !== undefined
    )
    .map((row) => {
      const before = row.issue.casesBeforeResolution ?? 0;
      const after = row.issue.casesAfterResolution ?? 0;
      const reduction = before === 0 ? 0 : Math.round(((before - after) / before) * 100);
      const result = row.issue.possibleRegression
        ? '疑似未生效 / 回归'
        : reduction >= 60
          ? '效果明显'
          : '持续观察';
      return { ...row, before, after, reduction, result };
    });
  const legacyIssues = issueRows.filter(
    (row) =>
      issueAge(row.issue, criteria.end) > 14 &&
      row.currentCases.length > 0 &&
      row.issue.issueStatus !== 'Closed'
  );
  const hotspots = tags.filter(
    (item) =>
      (item.current >= 3 && item.previous === 0) ||
      (item.current >= 5 && (item.percent ?? 0) >= 100)
  );

  const issueById = new Map(issues.map((issue) => [issue.id, issue]));
  const hasIssueClassification = (item: RawFeedback, classification: 'Bug' | 'Feature') =>
    Boolean(item.issueId && issueById.get(item.issueId)?.classification === classification);
  const currentBugCases = currentCases.filter((item) => hasIssueClassification(item, 'Bug'));
  const previousBugCases = previousCases.filter((item) => hasIssueClassification(item, 'Bug'));
  const currentFeatureCases = currentCases.filter((item) =>
    hasIssueClassification(item, 'Feature')
  );
  const previousFeatureCases = previousCases.filter((item) =>
    hasIssueClassification(item, 'Feature')
  );
  const previousNewIssues = issues.filter((issue) =>
    inDateRange(issue.createdAt, previous.start, previous.end)
  );
  const previousResolvedIssues = issues.filter(
    (issue) => issue.resolvedAt && inDateRange(issue.resolvedAt, previous.start, previous.end)
  );
  const currentOpen = issues.filter((issue) => isOpenAt(issue, criteria.end)).length;
  const previousOpen = issues.filter((issue) => isOpenAt(issue, previous.end)).length;
  const bugIssues = issues.filter((issue) => issue.classification === 'Bug' && issue.bugDetail);
  const openBugIssues = bugIssues.filter(
    (issue) => !['已关闭', '不予修复'].includes(issue.bugDetail!.status)
  );

  const discoveries = [
    tags[0]
      ? `${tags[0].tag}是本期最高频问题，共 ${tags[0].current} 条已确认 Case，${formatPercent(tags[0])}。`
      : '本期暂无已确认标签形成高频问题。',
    hotspots[0]
      ? `${hotspots[0].tag}进入新增热点，本期 ${hotspots[0].current} 条、上期 ${hotspots[0].previous} 条。`
      : '本期未识别到达到阈值的新增热点。',
    attention[0]
      ? `${attention[0].issue.displayId} 当前最需要推进：${attention[0].reasons[0]}。`
      : '当前没有命中自动关注规则的 Issue。',
    legacyIssues[0]
      ? `${legacyIssues[0].issue.displayId} 已跨周持续高发，仍处于 ${legacyIssues[0].issue.issueStatus}。`
      : '本期没有同时满足“超过 14 天、仍未关闭且有新增 Case”的跨周遗留。'
  ];
  const suggestions = [
    tags[0]
      ? `将“${tags[0].tag}”高频场景加入下一轮核心回归。`
      : '继续确认 Case 标签后再补充专项回归。',
    coreIssues[0]
      ? `围绕 ${coreIssues[0].issue.aiAssessment.businessLine} 补充 ${coreIssues[0].issue.aiAssessment.category} 场景覆盖。`
      : '待形成核心 Issue 后补充对应测试覆盖。',
    attention.some((item) => item.issue.possibleRegression)
      ? '对已解决后仍有反馈的 Issue 增加修复版本复验与发布后观察。'
      : '保持修复后 Case 趋势观察，避免仅凭 Issue 状态判断闭环。'
  ];

  return {
    previous,
    currentCases,
    previousCases,
    issues,
    tags,
    hotspots,
    coreIssues,
    newIssues,
    progressingIssues,
    resolvedIssues,
    attention,
    fixEffects,
    legacyIssues,
    discoveries,
    suggestions,
    bugMetrics: {
      new: bugIssues.filter((issue) => inDateRange(issue.createdAt, criteria.start, criteria.end))
        .length,
      closed: bugIssues.filter(
        (issue) =>
          issue.bugDetail?.status === '已关闭' &&
          inDateRange(issue.updatedAt, criteria.start, criteria.end)
      ).length,
      open: openBugIssues.length,
      high: openBugIssues.filter((issue) => issue.priority === 'P0' || issue.priority === 'P1')
        .length,
      pending: bugIssues.filter((issue) => issue.bugDetail?.status === '待分诊').length,
      unassigned: bugIssues.filter((issue) => !issue.bugDetail?.assignee).length
    },
    metrics: {
      all: compare(currentCases.length, previousCases.length),
      bug: compare(currentBugCases.length, previousBugCases.length),
      feature: compare(currentFeatureCases.length, previousFeatureCases.length),
      newIssues: compare(newIssues.length, previousNewIssues.length),
      resolvedIssues: compare(resolvedIssues.length, previousResolvedIssues.length),
      openIssues: compare(currentOpen, previousOpen)
    }
  };
}
