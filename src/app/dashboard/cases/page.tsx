'use client';

import { MetricCard } from '@/components/dashboard/metric-card';
import { ChannelBadge } from '@/components/dashboard/channel-badge';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
import { PageContainer } from '@/components/layout/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { CaseStatus, ClusterCase, IntakeMethod, IssueStatus, Priority } from '@/lib/domain';
import { demoNow, formatDemoRelativeTime } from '@/lib/demo-time';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';
import { useMemo, useState } from 'react';
import Link from 'next/link';

type Period = 'today' | '7d' | '30d';
type IssueSort = 'latest' | 'priority';

const periodLabels: Record<Period, string> = {
  today: '今日',
  '7d': '近 7 天',
  '30d': '近 30 天'
};
const priorityWeight: Record<Priority, number> = { P0: 4, P1: 3, P2: 2, P3: 1 };
const intakeLabels: Record<IntakeMethod, string> = {
  auto: '自动采集',
  manual_single: '手工单条',
  manual_batch: '手工批量'
};
const caseStatusLabels: Record<CaseStatus, string> = {
  Pending: '待处理',
  'Needs Info': '需补充信息',
  Linked: '已归并',
  Closed: '已关闭'
};

function getTrend(issue: ClusterCase) {
  if (issue.caseCountPrevious24h === 0) return issue.caseCount24h > 0 ? 100 : 0;
  return Math.round(
    ((issue.caseCount24h - issue.caseCountPrevious24h) / issue.caseCountPrevious24h) * 100
  );
}

function trendLabel(issue: ClusterCase) {
  const trend = getTrend(issue);
  if (trend === 0) return 'Stable';
  return `${trend > 0 ? '+' : ''}${trend}%`;
}

function priorityTone(priority: Priority) {
  if (priority === 'P0') return 'critical' as const;
  if (priority === 'P1') return 'warning' as const;
  return 'neutral' as const;
}

function statusTone(status: IssueStatus) {
  if (status === 'Closed') return 'success' as const;
  if (status === 'Blocked') return 'danger' as const;
  if (status === 'Developing' || status === 'Verifying') return 'info' as const;
  if (status === 'Resolved') return 'warning' as const;
  return 'neutral' as const;
}

function inPeriod(iso: string, period: Period) {
  const now = demoNow();
  const date = new Date(iso);
  if (period === 'today') {
    return date.toLocaleDateString('zh-CN') === now.toLocaleDateString('zh-CN');
  }
  const days = period === '7d' ? 7 : 30;
  return now.getTime() - date.getTime() <= days * 86_400_000;
}

function IssueActions({ issue }: { issue: ClusterCase }) {
  const assignIssue = useDemoStore((state) => state.assignIssue);
  const createIssueTicket = useDemoStore((state) => state.createIssueTicket);
  const decideCluster = useDemoStore((state) => state.decideCluster);
  const notifyIssueOwner = useDemoStore((state) => state.notifyIssueOwner);
  const transitionIssue = useDemoStore((state) => state.transitionIssue);
  const transitionIssueBug = useDemoStore((state) => state.transitionIssueBug);

  const primaryAction = (() => {
    if (issue.classification === 'Bug' && issue.bugDetail) {
      switch (issue.bugDetail.status) {
        case '待分诊':
          return ['分配 Assignee', () => assignIssue(issue.id)] as const;
        case '已指派':
          return ['开始修复', () => transitionIssueBug(issue.id, '修复中')] as const;
        case '修复中':
          return ['提交验收', () => transitionIssueBug(issue.id, '待验收')] as const;
        case '待验收':
          return ['关闭 Bug', () => transitionIssueBug(issue.id, '已关闭')] as const;
        case '已关闭':
          return ['重新打开', () => transitionIssueBug(issue.id, '已指派')] as const;
        case '不予修复':
          return ['重新分诊', () => transitionIssueBug(issue.id, '待分诊')] as const;
      }
    }
    switch (issue.issueStatus) {
      case 'New':
        return ['分配 Owner', () => assignIssue(issue.id)] as const;
      case 'Assigned':
        return ['开始跟进', () => transitionIssue(issue.id, 'Following Up')] as const;
      case 'Following Up':
        return ['进入开发', () => transitionIssue(issue.id, 'Developing')] as const;
      case 'Developing':
        return ['提交验证', () => transitionIssue(issue.id, 'Verifying')] as const;
      case 'Verifying':
        return ['标记 Resolved', () => transitionIssue(issue.id, 'Resolved')] as const;
      case 'Resolved':
        return issue.possibleRegression
          ? (['重新打开', () => transitionIssue(issue.id, 'Developing')] as const)
          : (['关闭 Issue', () => transitionIssue(issue.id, 'Closed')] as const);
      case 'Closed':
        return ['重新打开', () => transitionIssue(issue.id, 'Developing')] as const;
      case 'Blocked':
        return ['恢复跟进', () => transitionIssue(issue.id, 'Following Up')] as const;
    }
  })();

  return (
    <div className='flex flex-wrap gap-2'>
      <Button size='sm' onClick={primaryAction[1]}>
        {primaryAction[0]}
      </Button>
      {(issue.priority === 'P0' || issue.priority === 'P1') &&
      issue.notificationStatus === '未通知' ? (
        <Button size='sm' variant='outline' onClick={() => notifyIssueOwner(issue.id)}>
          <Icons.bell data-icon='inline-start' />
          通知 Owner
        </Button>
      ) : null}
      {!issue.relatedTicket ? (
        <Button size='sm' variant='outline' onClick={() => createIssueTicket(issue.id)}>
          <Icons.ticket data-icon='inline-start' />
          创建 Mock Ticket
        </Button>
      ) : null}
      {issue.priority !== 'P0' ? (
        <Button size='sm' variant='outline' onClick={() => decideCluster(issue.id, 'P0')}>
          <Icons.arrowUp data-icon='inline-start' />
          升为 P0
        </Button>
      ) : null}
      {issue.classification !== 'Bug' &&
      ['Assigned', 'Following Up', 'Developing', 'Verifying'].includes(issue.issueStatus) ? (
        <Button
          size='sm'
          variant='destructive'
          onClick={() => transitionIssue(issue.id, 'Blocked')}
        >
          标记阻塞
        </Button>
      ) : null}
    </div>
  );
}

export default function CasesPage() {
  const projects = useDemoStore((state) => state.projects);
  const feedback = useDemoStore((state) => state.feedback);
  const issues = useDemoStore((state) => state.clusters);
  const unlinkCaseFromIssue = useDemoStore((state) => state.unlinkCaseFromIssue);
  const [appId, setAppId] = useState('all');
  const [period, setPeriod] = useState<Period>('7d');
  const [issueSort, setIssueSort] = useState<IssueSort>('priority');
  const [selectedIssueId, setSelectedIssueId] = useState('issue-guild-crash');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const scopedIssues = useMemo(
    () => issues.filter((issue) => appId === 'all' || issue.projectId === appId),
    [appId, issues]
  );
  const scopedFeedback = useMemo(
    () =>
      feedback.filter(
        (item) =>
          (appId === 'all' || item.projectId === appId) && inPeriod(item.caseCreatedAt, period)
      ),
    [appId, feedback, period]
  );
  const attentionIssues = useMemo(
    () =>
      scopedIssues
        .filter((issue) => issue.issueStatus !== 'Closed')
        .toSorted((a, b) =>
          issueSort === 'latest'
            ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            : priorityWeight[b.priority] - priorityWeight[a.priority] ||
              getTrend(b) - getTrend(a) ||
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [issueSort, scopedIssues]
  );
  const selectedIssue =
    scopedIssues.find((issue) => issue.id === selectedIssueId) ?? attentionIssues[0];
  const visibleIssues = attentionIssues.slice(0, 10);
  const selectedEvidence = selectedIssue
    ? feedback.filter((item) => item.issueId === selectedIssue.id)
    : [];
  const openIssues = scopedIssues.filter((issue) => issue.issueStatus !== 'Closed');
  const bugIssues = scopedIssues.filter(
    (issue) => issue.classification === 'Bug' && issue.bugDetail
  );
  const openBugs = bugIssues.filter(
    (issue) => !['已关闭', '不予修复'].includes(issue.bugDetail!.status)
  );
  const riskBugs = openBugs
    .filter(
      (issue) =>
        issue.priority === 'P0' ||
        issue.priority === 'P1' ||
        issue.bugDetail?.status === '待分诊' ||
        !issue.bugDetail?.assignee ||
        getTrend(issue) > 50
    )
    .slice(0, 5);
  const statusCounts = [
    'New',
    'Assigned',
    'Following Up',
    'Developing',
    'Verifying',
    'Resolved',
    'Blocked'
  ].map((status) => ({
    status: status as IssueStatus,
    count: openIssues.filter((issue) => issue.issueStatus === status).length
  }));

  return (
    <PageContainer
      title='Issue Center'
      description='一站式管理用户 Case 与智能聚合的 Issue，协同 QA 及研发高效推进闭环'
      action={
        <>
          <Link href='/dashboard/cases/reports' className={buttonVariants({ variant: 'outline' })}>
            <Icons.report data-icon='inline-start' />
            生成周报
          </Link>
          <Link href='/dashboard/cases/manage?action=create-case' className={buttonVariants()}>
            <Icons.plus data-icon='inline-start' />提 Case
          </Link>
          <Link href='/dashboard/cases/issues?view=bug&action=create' className={buttonVariants()}>
            <Icons.bug data-icon='inline-start' />提 Bug
          </Link>
        </>
      }
    >
      <div className='mt-4 flex flex-wrap items-center gap-2'>
        <ToggleGroup
          variant='outline'
          size='sm'
          spacing={0}
          value={[appId]}
          onValueChange={(value) => setAppId(value[0] ?? appId)}
          aria-label='游戏筛选'
        >
          {[{ id: 'all', name: '全部游戏' }, ...projects].map((project) => (
            <ToggleGroupItem key={project.id} value={project.id}>
              {project.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          variant='outline'
          size='sm'
          spacing={0}
          value={[period]}
          onValueChange={(value) => setPeriod((value[0] as Period | undefined) ?? period)}
          aria-label='时间筛选'
        >
          {(Object.keys(periodLabels) as Period[]).map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {periodLabels[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className='mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-6'>
        <MetricCard
          label='新增反馈'
          value={scopedFeedback.length}
          detail={`${periodLabels[period]} Signal`}
          icon={Icons.inbox}
        />
        <MetricCard
          label='Open Issue'
          value={openIssues.length}
          detail='当前真实存量'
          icon={Icons.activity}
          href='/dashboard/cases/issues?view=all'
        />
        <MetricCard
          label='Open Bug'
          value={openBugs.length}
          detail='当前未关闭'
          icon={Icons.bug}
          href='/dashboard/cases/issues?view=bug'
        />
        <MetricCard
          label='P0 / P1 Bug'
          value={
            openBugs.filter((issue) => issue.priority === 'P0' || issue.priority === 'P1').length
          }
          detail='高优线上缺陷'
          icon={Icons.alertTriangle}
          href='/dashboard/cases/issues?view=bug&priority=high'
        />
        <MetricCard
          label='待分诊 Bug'
          value={bugIssues.filter((issue) => issue.bugDetail?.status === '待分诊').length}
          detail='需要 QA 确认'
          icon={Icons.inbox}
          href='/dashboard/cases/issues?view=bug&status=%E5%BE%85%E5%88%86%E8%AF%8A'
        />
        <MetricCard
          label='未指派 Bug'
          value={bugIssues.filter((issue) => !issue.bugDetail?.assignee).length}
          detail='尚无 Assignee'
          icon={Icons.user}
          href='/dashboard/cases/issues?view=bug&assignee=unassigned'
        />
      </div>

      <div className='mt-4 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]'>
        <Card>
          <CardHeader>
            <CardTitle>Open Issue 状态分布</CardTitle>
            <CardAction className='text-2xl font-semibold tabular-nums'>
              {openIssues.length}
            </CardAction>
          </CardHeader>
          <CardContent>
            {statusCounts.map((item, index) => (
              <div key={item.status}>
                {index > 0 ? <Separator /> : null}
                <div className='flex items-center justify-between py-2.5'>
                  <span className='text-sm'>{item.status}</span>
                  <span className='text-sm font-medium tabular-nums'>{item.count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活跃 Issue</CardTitle>
            <CardAction className='flex items-center gap-2'>
              <ToggleGroup
                size='sm'
                value={[issueSort]}
                onValueChange={(value) =>
                  setIssueSort((value[0] as IssueSort | undefined) ?? issueSort)
                }
                aria-label='Issue 排序'
              >
                <ToggleGroupItem value='latest'>最新</ToggleGroupItem>
                <ToggleGroupItem value='priority'>按优先级</ToggleGroupItem>
              </ToggleGroup>
              <Link
                href='/dashboard/cases/issues'
                className={buttonVariants({ variant: 'link', size: 'sm' })}
              >
                查看全部
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className='overflow-x-auto p-0'>
            <div className='min-w-190'>
              <div className='grid grid-cols-[minmax(210px,1fr)_90px_58px_72px_54px_48px_104px_92px] gap-3 px-4 pb-2 text-xs text-muted-foreground'>
                <span>Issue</span>
                <span>Classification</span>
                <span>Cases</span>
                <span>24h 趋势</span>
                <span>优先级</span>
                <span>Age</span>
                <span>Owner / Team</span>
                <span>Stage</span>
              </div>
              {visibleIssues.map((issue, index) => (
                <div key={issue.id}>
                  {index > 0 ? <Separator /> : null}
                  <button
                    type='button'
                    className={cn(
                      'grid w-full grid-cols-[minmax(210px,1fr)_90px_58px_72px_54px_48px_104px_92px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      selectedIssue?.id === issue.id && drawerOpen && 'bg-muted/40'
                    )}
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setDrawerOpen(true);
                    }}
                  >
                    <span className='min-w-0'>
                      <span className='block truncate text-sm font-medium'>{issue.title}</span>
                      <span className='block truncate text-xs text-muted-foreground'>
                        {issue.displayId} ·{' '}
                        {projects.find((project) => project.id === issue.projectId)?.name}
                      </span>
                    </span>
                    <span className='text-xs'>{issue.classification}</span>
                    <span className='text-sm tabular-nums'>{issue.caseCount}</span>
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        getTrend(issue) > 50 && 'font-medium text-destructive'
                      )}
                    >
                      {trendLabel(issue)}
                    </span>
                    <span>
                      <StatusBadge tone={priorityTone(issue.priority)}>
                        {issue.priority}
                      </StatusBadge>
                    </span>
                    <span
                      className={cn(
                        'text-sm tabular-nums',
                        formatDemoRelativeTime(issue.createdAt).endsWith('d') &&
                          Number.parseInt(formatDemoRelativeTime(issue.createdAt)) > 7 &&
                          'font-medium text-destructive'
                      )}
                    >
                      {formatDemoRelativeTime(issue.createdAt)}
                    </span>
                    <span className='truncate text-xs'>
                      {issue.classification === 'Bug'
                        ? issue.bugDetail?.assignee || '未分配'
                        : issue.owner}
                      <span className='block text-muted-foreground'>{issue.team}</span>
                    </span>
                    <span>
                      <StatusBadge tone={statusTone(issue.issueStatus)}>
                        {issue.classification === 'Bug'
                          ? issue.bugDetail?.status
                          : issue.issueStatus}
                      </StatusBadge>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        {selectedIssue ? (
          <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
            <SheetHeader className='pr-12'>
              <p className='text-xs text-muted-foreground'>{selectedIssue.displayId}</p>
              <SheetTitle className='text-xl'>{selectedIssue.title}</SheetTitle>
              <SheetDescription className='flex flex-wrap items-center gap-2 pt-1'>
                <StatusBadge tone={priorityTone(selectedIssue.priority)}>
                  {selectedIssue.priority}
                </StatusBadge>
                <StatusBadge tone={statusTone(selectedIssue.issueStatus)}>
                  {selectedIssue.classification === 'Bug'
                    ? selectedIssue.bugDetail?.status
                    : selectedIssue.issueStatus}
                </StatusBadge>
                <span>
                  {projects.find((project) => project.id === selectedIssue.projectId)?.name}
                </span>
              </SheetDescription>
            </SheetHeader>
            <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6'>
              <section className='flex flex-col gap-3' aria-labelledby='ai-definition-title'>
                <h3
                  id='ai-definition-title'
                  className='flex items-center gap-2 text-sm font-medium'
                >
                  <Icons.robot className='size-4' aria-hidden='true' />
                  AI 问题定义
                  <span className='text-xs font-normal text-muted-foreground'>模拟</span>
                </h3>
                <div className='flex flex-col gap-2 bg-muted/40 p-4'>
                  <p className='text-sm'>{selectedIssue.summary}</p>
                  <p className='text-xs text-muted-foreground'>
                    {selectedIssue.aiAssessment.category} ·{' '}
                    {selectedIssue.aiAssessment.businessLine} · 置信度{' '}
                    {Math.round(selectedIssue.aiAssessment.confidence * 100)}%
                  </p>
                  <p className='text-sm leading-6 text-muted-foreground'>
                    {selectedIssue.aiAssessment.rationale}
                  </p>
                </div>
              </section>

              <section className='flex flex-col gap-3' aria-labelledby='case-evidence-title'>
                <div className='flex items-center justify-between gap-3'>
                  <h3 id='case-evidence-title' className='text-sm font-medium'>
                    用户 Case 证据
                  </h3>
                  <span className='text-xs text-muted-foreground tabular-nums'>
                    {selectedIssue.caseCount} Cases
                  </span>
                </div>
                <div>
                  {selectedEvidence.map((item, index) => (
                    <article key={item.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className='flex flex-col gap-2 py-3'>
                        <div className='flex items-center justify-between gap-3 text-xs text-muted-foreground'>
                          <span>{item.caseId}</span>
                          <span>
                            {item.channel} · {formatDemoRelativeTime(item.caseCreatedAt)} ago
                          </span>
                        </div>
                        <p className='text-sm leading-6'>“{item.text}”</p>
                        <p className='text-xs text-muted-foreground'>
                          {item.confirmedTags.join(' · ') || 'Tag 待确认'}
                        </p>
                        <p className='text-xs leading-5 text-muted-foreground'>
                          关联理由：{item.issueMatchReason ?? '与当前 Issue 定义相符。'}
                        </p>
                        <div className='flex flex-wrap items-center gap-2'>
                          {item.originalUrl ? (
                            <a
                              className='text-xs font-medium text-primary hover:underline'
                              href={item.originalUrl}
                              target='_blank'
                              rel='noreferrer'
                            >
                              查看原帖
                            </a>
                          ) : null}
                          <Button
                            size='xs'
                            variant='outline'
                            onClick={() => unlinkCaseFromIssue(item.id)}
                          >
                            移出当前 Issue
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className='flex flex-col gap-4' aria-labelledby='handling-title'>
                <h3 id='handling-title' className='text-sm font-medium'>
                  当前处理
                </h3>
                <div className='grid gap-4 sm:grid-cols-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>
                      {selectedIssue.classification === 'Bug' ? 'Assignee / Team' : 'Owner / Team'}
                    </p>
                    <p className='mt-1 text-sm font-medium'>
                      {selectedIssue.classification === 'Bug'
                        ? selectedIssue.bugDetail?.assignee || '未分配'
                        : selectedIssue.owner}{' '}
                      / {selectedIssue.team}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Ticket</p>
                    <p className='mt-1 text-sm font-medium'>
                      {selectedIssue.relatedTicket ?? '未创建'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>最近反馈</p>
                    <p className='mt-1 text-sm font-medium'>
                      {formatDemoRelativeTime(selectedIssue.lastSeenAt)} ago
                    </p>
                  </div>
                </div>
                <IssueActions issue={selectedIssue} />
                {selectedIssue.blockedReason ? (
                  <Alert variant='destructive'>
                    <Icons.alertTriangle className='size-4' />
                    <AlertTitle>阻塞原因</AlertTitle>
                    <AlertDescription>{selectedIssue.blockedReason}</AlertDescription>
                  </Alert>
                ) : null}
              </section>

              <section className='flex flex-col gap-3' aria-labelledby='trend-title'>
                <h3 id='trend-title' className='text-sm font-medium'>
                  玩家反馈趋势 / 修复效果
                </h3>
                <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                  <div>
                    <p className='text-xs text-muted-foreground'>全部 Case</p>
                    <p className='mt-1 text-lg font-semibold tabular-nums'>
                      {selectedIssue.caseCount}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>最近 24h</p>
                    <p className='mt-1 text-lg font-semibold tabular-nums'>
                      {selectedIssue.caseCount24h}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>24h 趋势</p>
                    <p className='mt-1 text-lg font-semibold tabular-nums'>
                      {trendLabel(selectedIssue)}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Issue Age</p>
                    <p className='mt-1 text-lg font-semibold tabular-nums'>
                      {formatDemoRelativeTime(selectedIssue.createdAt)}
                    </p>
                  </div>
                </div>
                {selectedIssue.possibleRegression ? (
                  <Alert variant='destructive'>
                    <Icons.rotate className='size-4' />
                    <AlertTitle>可能回归 / 修复或未生效</AlertTitle>
                    <AlertDescription>
                      解决前 {selectedIssue.casesBeforeResolution ?? 0} 条，解决后仍有{' '}
                      {selectedIssue.casesAfterResolution ?? 0} 条。
                    </AlertDescription>
                  </Alert>
                ) : null}
              </section>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>待推进 Bug</CardTitle>
          <CardDescription>P0 / P1、待分诊、未分配或 Case 快速增长</CardDescription>
          <CardAction>
            <Link
              href='/dashboard/cases/issues?view=bug'
              className={buttonVariants({ variant: 'link', size: 'sm' })}
            >
              进入分诊
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          {riskBugs.map((issue, index) => (
            <div key={issue.id}>
              {index ? <Separator /> : null}
              <div className='flex flex-wrap items-center justify-between gap-3 py-3'>
                <div>
                  <p className='text-sm font-medium'>
                    {issue.displayId} · {issue.title}
                  </p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {issue.bugDetail?.severity} · {issue.priority} ·{' '}
                    {issue.bugDetail?.assignee || '未分配'} · {issue.bugDetail?.status}
                  </p>
                </div>
                <span className='text-xs text-muted-foreground'>
                  {issue.caseCount} Cases · {trendLabel(issue)}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>最新 Case</CardTitle>
          <CardAction>
            <Link
              href='/dashboard/cases/manage'
              className={buttonVariants({ variant: 'link', size: 'sm' })}
            >
              查看全部
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className='overflow-x-auto p-0'>
          <div className='min-w-205'>
            <div className='grid grid-cols-[minmax(220px,1fr)_128px_minmax(140px,1fr)_96px_180px] gap-3 px-4 pb-2 text-xs text-muted-foreground'>
              <span>Case</span>
              <span>来源</span>
              <span>Tags</span>
              <span>Case Status</span>
              <span>Linked Issue</span>
            </div>
            {scopedFeedback
              .toSorted(
                (a, b) => new Date(b.caseCreatedAt).getTime() - new Date(a.caseCreatedAt).getTime()
              )
              .slice(0, 5)
              .map((item, index) => {
                const linkedIssue = issues.find((issue) => issue.id === item.issueId);
                return (
                  <article key={item.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='grid grid-cols-[minmax(220px,1fr)_128px_minmax(140px,1fr)_96px_180px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50'>
                      <span className='min-w-0'>
                        <span className='block truncate text-sm font-medium'>{item.text}</span>
                        <span className='block text-xs text-muted-foreground'>
                          {item.caseId} ·{' '}
                          {projects.find((project) => project.id === item.projectId)?.name}
                        </span>
                      </span>
                      <span>
                        <ChannelBadge channel={item.channel} />
                        <span className='mt-1 block text-xs text-muted-foreground'>
                          {new Date(item.caseCreatedAt).toLocaleDateString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit'
                          })}{' '}
                          · {intakeLabels[item.intakeMethod]}
                        </span>
                      </span>
                      <span className='truncate text-xs'>
                        {item.tagStatus === 'confirmed'
                          ? item.confirmedTags.join(' · ') || '无标签'
                          : item.suggestedTags.map((tag) => `AI · ${tag}`).join(' / ') ||
                            'AI 暂无建议'}
                      </span>
                      <span>
                        <StatusBadge
                          tone={
                            item.status === 'Linked'
                              ? 'success'
                              : item.status === 'Needs Info'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {caseStatusLabels[item.status]}
                        </StatusBadge>
                      </span>
                      <span className='text-sm font-medium'>
                        {linkedIssue ? (
                          <button
                            type='button'
                            className='text-left text-sm font-medium hover:underline'
                            onClick={() => {
                              setSelectedIssueId(linkedIssue.id);
                              setDrawerOpen(true);
                            }}
                          >
                            {linkedIssue.displayId}
                          </button>
                        ) : (
                          '未关联'
                        )}
                        {linkedIssue ? (
                          <span className='block text-xs font-normal text-muted-foreground'>
                            {linkedIssue.classification} ·{' '}
                            {linkedIssue.classification === 'Bug'
                              ? linkedIssue.bugDetail?.status
                              : linkedIssue.issueStatus}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </article>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
