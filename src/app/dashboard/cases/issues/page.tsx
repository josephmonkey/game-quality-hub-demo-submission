'use client';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
import { BugIssueSheet } from '@/components/issue-center/bug-issue-sheet';
import { CreateIssueSheet } from '@/components/issue-center/create-issue-sheet';
import { TagPicker } from '@/components/issue-center/tag-picker';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type {
  BugStatus,
  ClusterCase,
  IssueClassification,
  IssueStatus,
  Priority,
  Severity
} from '@/lib/domain';
import { demoToday, formatDemoRelativeTime } from '@/lib/demo-time';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';
import { useEffect, useMemo, useState } from 'react';

type View = 'Bug' | 'Pending' | 'Feature' | 'Improvement' | 'All';
type BugDraft = {
  projectId?: string;
  title?: string;
  summary?: string;
  priority: Priority;
  owner?: string;
  tags?: string[];
};
const views: View[] = ['Bug', 'Pending', 'Feature', 'Improvement', 'All'];
const viewLabels: Record<View, string> = {
  Bug: 'Bug',
  Pending: '待判断',
  Feature: 'Feature',
  Improvement: 'Improvement',
  All: '全部'
};
const priorityWeight: Record<Priority, number> = { P0: 4, P1: 3, P2: 2, P3: 1 };
const bugTransitions: Record<BugStatus, BugStatus[]> = {
  待分诊: ['已指派', '不予修复'],
  已指派: ['修复中', '不予修复'],
  修复中: ['待验收'],
  待验收: ['修复中', '已关闭'],
  已关闭: ['已指派'],
  不予修复: ['待分诊']
};

function priorityTone(priority: Priority) {
  return priority === 'P0'
    ? ('critical' as const)
    : priority === 'P1'
      ? ('warning' as const)
      : ('neutral' as const);
}

function statusTone(status: IssueStatus | BugStatus) {
  if (status === 'Closed' || status === '已关闭') return 'success' as const;
  if (status === 'Blocked' || status === '不予修复') return 'danger' as const;
  if (['Developing', 'Verifying', '修复中', '待验收'].includes(status)) return 'info' as const;
  return 'neutral' as const;
}

function isOpenBug(issue: ClusterCase) {
  return (
    issue.classification === 'Bug' &&
    issue.bugDetail &&
    !['已关闭', '不予修复'].includes(issue.bugDetail.status)
  );
}

function issueTrend(issue: ClusterCase) {
  if (issue.caseCountPrevious24h === 0) return issue.caseCount24h > 0 ? 100 : 0;
  return Math.round(
    ((issue.caseCount24h - issue.caseCountPrevious24h) / issue.caseCountPrevious24h) * 100
  );
}

function issueTrendLabel(issue: ClusterCase) {
  const trend = issueTrend(issue);
  if (trend === 0) return 'Stable';
  return `${trend > 0 ? '+' : ''}${trend}%`;
}

export default function IssuesPage() {
  const issues = useDemoStore((state) => state.clusters);
  const projects = useDemoStore((state) => state.projects);
  const feedback = useDemoStore((state) => state.feedback);
  const tags = useDemoStore((state) => state.tags);
  const updateIssueTags = useDemoStore((state) => state.updateIssueTags);
  const transitionIssue = useDemoStore((state) => state.transitionIssue);
  const transitionIssueBug = useDemoStore((state) => state.transitionIssueBug);
  const assignIssue = useDemoStore((state) => state.assignIssue);
  const updateIssueTriage = useDemoStore((state) => state.updateIssueTriage);
  const [view, setView] = useState<View>('Bug');
  const [app, setApp] = useState('all');
  const [module, setModule] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [assignee, setAssignee] = useState('all');
  const [tag, setTag] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [bugOpen, setBugOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertDraft, setConvertDraft] = useState<BugDraft | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search);
      const requestedView = search.get('view');
      if (requestedView === 'all') setView('All');
      if (requestedView === 'bug') setView('Bug');
      if (search.get('action') === 'create') setCreateIssueOpen(true);
      if (search.get('action') === 'create-bug') setBugOpen(true);
      if (search.get('priority')) setPriority(search.get('priority')!);
      if (search.get('status')) setStatus(search.get('status')!);
      if (search.get('assignee')) setAssignee(search.get('assignee')!);
      if (search.get('issue')) setSelectedId(search.get('issue')!);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        views.map((item) => [
          item,
          issues.filter((issue) => item === 'All' || issue.classification === item).length
        ])
      ) as Record<View, number>,
    [issues]
  );
  const bugIssues = issues.filter((issue) => issue.classification === 'Bug' && issue.bugDetail);
  const openBugs = bugIssues.filter(isOpenBug);
  const modules = [...new Set(bugIssues.map((issue) => issue.bugDetail!.module))];
  const assignees = [
    ...new Set(
      issues
        .map((issue) => (issue.classification === 'Bug' ? issue.bugDetail?.assignee : issue.owner))
        .filter(Boolean)
    )
  ] as string[];
  const visible = useMemo(
    () =>
      issues
        .filter((issue) => view === 'All' || issue.classification === view)
        .filter((issue) => app === 'all' || issue.projectId === app)
        .filter(
          (issue) =>
            priority === 'all' ||
            (priority === 'high'
              ? issue.priority === 'P0' || issue.priority === 'P1'
              : issue.priority === priority)
        )
        .filter((issue) => tag === 'all' || issue.confirmedTags.includes(tag))
        .filter((issue) => view !== 'Bug' || module === 'all' || issue.bugDetail?.module === module)
        .filter(
          (issue) => view !== 'Bug' || severity === 'all' || issue.bugDetail?.severity === severity
        )
        .filter((issue) => {
          if (status === 'all') return true;
          return issue.classification === 'Bug'
            ? issue.bugDetail?.status === status
            : issue.issueStatus === status;
        })
        .filter((issue) => {
          if (assignee === 'all') return true;
          const owner = issue.classification === 'Bug' ? issue.bugDetail?.assignee : issue.owner;
          return assignee === 'unassigned' ? !owner || owner === '未分配' : owner === assignee;
        })
        .toSorted(
          (a, b) =>
            priorityWeight[b.priority] - priorityWeight[a.priority] ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [app, assignee, issues, module, priority, severity, status, tag, view]
  );
  const selected = issues.find((issue) => issue.id === selectedId);
  const evidence = selected ? feedback.filter((item) => item.issueId === selected.id) : [];
  const moduleCounts = modules
    .map((name) => ({
      name,
      count: openBugs.filter((issue) => issue.bugDetail?.module === name).length
    }))
    .toSorted((a, b) => b.count - a.count);
  const severityCounts = (['致命', '严重', '一般', '轻微'] as Severity[]).map((name) => ({
    name,
    count: openBugs.filter((issue) => issue.bugDetail?.severity === name).length
  }));

  function openIssue(id: string) {
    const issue = issues.find((item) => item.id === id);
    if (!issue) return;
    setSelectedId(id);
    setEditingTags(issue.confirmedTags);
  }

  function advanceIssue(issue: ClusterCase) {
    const next: Partial<Record<IssueStatus, IssueStatus>> = {
      New: 'Assigned',
      Assigned: 'Following Up',
      'Following Up': 'Developing',
      Developing: 'Verifying',
      Verifying: 'Resolved',
      Resolved: 'Closed',
      Closed: 'Developing',
      Blocked: 'Following Up'
    };
    if (issue.issueStatus === 'New') assignIssue(issue.id);
    else if (next[issue.issueStatus]) transitionIssue(issue.id, next[issue.issueStatus]!);
  }

  const today = demoToday();
  const todayBugs = bugIssues.filter((issue) => issue.createdAt.slice(0, 10) === today);
  const triagedToday = bugIssues.filter((issue) =>
    issue.history.some(
      (event) =>
        event.at.slice(0, 10) === today &&
        (event.action.includes('Classification') || event.action.includes('Bug Status'))
    )
  );
  const dailyMarkdown = [
    '# Bug 当日分诊汇总',
    '',
    `日期：${today}`,
    '',
    '## 概览',
    '',
    `- 今日新增 Bug：${todayBugs.length}`,
    `- 今日完成分诊：${triagedToday.length}`,
    `- 未关闭 Bug：${openBugs.length}`,
    `- 待分诊：${bugIssues.filter((item) => item.bugDetail?.status === '待分诊').length}`,
    `- 未分配：${bugIssues.filter((item) => !item.bugDetail?.assignee).length}`,
    `- 致命 / 严重：${openBugs.filter((item) => ['致命', '严重'].includes(item.bugDetail!.severity)).length}`,
    '',
    '## 按模块',
    '',
    ...(moduleCounts.length
      ? moduleCounts.map((item) => `- ${item.name}：${item.count}`)
      : ['- 暂无']),
    '',
    '## 按严重程度',
    '',
    ...severityCounts.map((item) => `- ${item.name}：${item.count}`),
    '',
    '## 今日重点 Bug',
    '',
    ...openBugs
      .filter((issue) => issue.priority === 'P0' || issue.priority === 'P1')
      .slice(0, 5)
      .flatMap((issue) => [
        `### ${issue.displayId} · ${issue.title}`,
        '',
        `- Module：${issue.bugDetail!.module}`,
        `- Severity：${issue.bugDetail!.severity}`,
        `- Priority：${issue.priority}`,
        `- Assignee：${issue.bugDetail!.assignee || '未分配'}`,
        `- Status：${issue.bugDetail!.status}`,
        ''
      ])
  ].join('\n');

  async function copyDaily() {
    await navigator.clipboard.writeText(dailyMarkdown);
  }

  function downloadDaily() {
    const url = URL.createObjectURL(
      new Blob([dailyMarkdown], { type: 'text/markdown;charset=utf-8' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bug-triage-${today}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <PageContainer
      title='Issues'
      description='Issue Center 的统一问题分诊与处理工作台'
      action={
        <>
          <Button variant='outline' onClick={() => void copyDaily()}>
            <Icons.copy data-icon='inline-start' />
            复制今日分诊
          </Button>
          <Button variant='outline' onClick={downloadDaily}>
            <Icons.download data-icon='inline-start' />
            导出今日分诊
          </Button>
          <Button onClick={() => setCreateIssueOpen(true)}>
            <Icons.plus data-icon='inline-start' />
            新建 Issue
          </Button>
        </>
      }
    >
      <ToggleGroup
        className='flex-wrap justify-start'
        variant='outline'
        size='sm'
        value={[view]}
        onValueChange={(value) => {
          const nextView = (value[0] as View) ?? view;
          if (nextView !== view) setStatus('all');
          setView(nextView);
        }}
        aria-label='Issue Classification'
      >
        {views.map((item) => (
          <ToggleGroupItem key={item} value={item}>
            {viewLabels[item]} {counts[item]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className='mt-3 flex flex-wrap gap-2'>
        <Filter
          label='App'
          value={app}
          onChange={setApp}
          items={[
            ['all', '全部 App'],
            ...projects.map((item) => [item.id, item.name] as [string, string])
          ]}
        />
        {view === 'Bug' ? (
          <Filter
            label='Module'
            value={module}
            onChange={setModule}
            items={[
              ['all', '全部模块'],
              ...modules.map((item) => [item, item] as [string, string])
            ]}
          />
        ) : null}
        {view === 'Bug' ? (
          <Filter
            label='Severity'
            value={severity}
            onChange={setSeverity}
            items={[
              ['all', '全部 Severity'],
              ...(['致命', '严重', '一般', '轻微'] as Severity[]).map(
                (item) => [item, item] as [string, string]
              )
            ]}
          />
        ) : null}
        <Filter
          label='Priority'
          value={priority}
          onChange={setPriority}
          items={[
            ['all', '全部 Priority'],
            ['high', 'P0 / P1'],
            ...(['P0', 'P1', 'P2', 'P3'] as Priority[]).map(
              (item) => [item, item] as [string, string]
            )
          ]}
        />
        <Filter
          label='Status'
          value={status}
          onChange={setStatus}
          items={[
            ['all', '全部状态'],
            ...(view === 'Bug'
              ? (['待分诊', '已指派', '修复中', '待验收', '已关闭', '不予修复'] as BugStatus[])
              : ([
                  'New',
                  'Assigned',
                  'Following Up',
                  'Developing',
                  'Verifying',
                  'Resolved',
                  'Closed',
                  'Blocked'
                ] as IssueStatus[])
            ).map((item) => [item, item] as [string, string])
          ]}
        />
        <Filter
          label={view === 'Bug' ? 'Assignee' : 'Owner'}
          value={assignee}
          onChange={setAssignee}
          items={[
            ['all', '全部负责人'],
            ['unassigned', '未分配'],
            ...assignees.map((item) => [item, item] as [string, string])
          ]}
        />
        <Filter
          label='Tags'
          value={tag}
          onChange={setTag}
          items={[
            ['all', '全部标签'],
            ...tags.map((item) => [item.name, item.name] as [string, string])
          ]}
        />
      </div>

      {view === 'Bug' ? (
        <>
          <div className='mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <Summary label='未关闭 Bug' value={openBugs.length} />
            <Summary
              label='待分诊'
              value={bugIssues.filter((item) => item.bugDetail?.status === '待分诊').length}
            />
            <Summary
              label='未分配'
              value={bugIssues.filter((item) => !item.bugDetail?.assignee).length}
              danger
            />
            <Summary
              label='今日新增'
              value={bugIssues.filter((item) => item.createdAt.slice(0, 10) === today).length}
            />
          </div>
          <div className='mt-4 grid gap-4 lg:grid-cols-2'>
            <Breakdown title='按模块' items={moduleCounts} />
            <Breakdown title='按严重程度' items={severityCounts} />
          </div>
        </>
      ) : null}

      <Card className='mt-4 min-w-0'>
        <CardContent className='overflow-x-auto p-0'>
          {visible.length ? (
            view === 'Bug' ? (
              <BugTable issues={visible} projects={projects} onOpen={openIssue} />
            ) : (
              <IssueTable issues={visible} projects={projects} onOpen={openIssue} />
            )
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>没有匹配的 Issue</EmptyTitle>
                <EmptyDescription>调整分类或筛选条件。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <IssueDetail
        key={selected?.id ?? 'no-issue'}
        issue={selected}
        evidence={evidence}
        editingTags={editingTags}
        onEditingTags={setEditingTags}
        tags={tags.map((item) => item.name)}
        onClose={() => setSelectedId('')}
        onSaveTags={() => selected && updateIssueTags(selected.id, editingTags)}
        onSaveTriage={(input) => {
          if (!selected) return;
          if (input.classification === 'Bug' && selected.classification !== 'Bug') {
            updateIssueTriage(selected.id, {
              classification: selected.classification,
              priority: input.priority,
              owner: input.owner
            });
            setConvertDraft({ priority: input.priority, owner: input.owner });
            setConvertOpen(true);
            return;
          }
          updateIssueTriage(selected.id, input);
        }}
        onAdvance={() => selected && advanceIssue(selected)}
        onBugTransition={(next) => selected && transitionIssueBug(selected.id, next)}
      />
      <BugIssueSheet key='direct-bug' open={bugOpen} onOpenChange={setBugOpen} />
      <CreateIssueSheet open={createIssueOpen} onOpenChange={setCreateIssueOpen} />
      <BugIssueSheet
        key={`convert-${selected?.id}-${convertDraft?.priority}-${convertDraft?.owner}`}
        issueId={selected?.id}
        open={convertOpen}
        onOpenChange={(open) => {
          setConvertOpen(open);
          if (!open) setConvertDraft(null);
        }}
        initialPriority={convertDraft?.priority}
        initialAssignee={convertDraft?.owner}
      />
    </PageContainer>
  );
}

function Filter({
  label,
  value,
  onChange,
  items
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: [string, string][];
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? value)}>
      <SelectTrigger size='sm' aria-label={label}>
        <SelectValue>{items.find((item) => item[0] === value)?.[1]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map(([itemValue, itemLabel]) => (
            <SelectItem key={itemValue} value={itemValue}>
              {itemLabel}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function Summary({
  label,
  value,
  danger = false
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <Card size='sm'>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle
          className={cn(
            'text-2xl font-semibold tabular-nums',
            danger && value > 0 && 'text-destructive'
          )}
        >
          {value}
        </CardTitle>
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  items
}: {
  title: string;
  items: Array<{ name: string; count: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardAction className='text-xs text-muted-foreground'>仅统计未关闭 Bug</CardAction>
      </CardHeader>
      <CardContent>
        {items.map((item, index) => (
          <div key={item.name}>
            {index ? <Separator /> : null}
            <div className='flex items-center justify-between py-2.5 text-sm'>
              <span>{item.name}</span>
              <span className='font-medium tabular-nums'>{item.count}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BugTable({
  issues,
  projects,
  onOpen
}: {
  issues: ClusterCase[];
  projects: Array<{ id: string; name: string }>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className='min-w-260'>
      <div className='grid grid-cols-[minmax(240px,1fr)_120px_80px_72px_120px_100px_112px_96px] gap-3 px-4 pb-2 text-xs text-muted-foreground'>
        <span>Issue</span>
        <span>Module</span>
        <span>Severity</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Cases</span>
        <span>Activity</span>
        <span>Status</span>
      </div>
      {issues.map((issue, index) => (
        <div key={issue.id}>
          {index ? <Separator /> : null}
          <button
            type='button'
            className='grid w-full grid-cols-[minmax(240px,1fr)_120px_80px_72px_120px_100px_112px_96px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
            onClick={() => onOpen(issue.id)}
          >
            <span className='min-w-0'>
              <span className='block truncate text-sm font-medium'>{issue.title}</span>
              <span className='block text-xs text-muted-foreground'>
                {issue.displayId} · {projects.find((item) => item.id === issue.projectId)?.name}
              </span>
            </span>
            <span className='truncate text-xs'>{issue.bugDetail?.module}</span>
            <span>
              <StatusBadge
                tone={
                  issue.bugDetail?.severity === '致命'
                    ? 'critical'
                    : issue.bugDetail?.severity === '严重'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {issue.bugDetail?.severity}
              </StatusBadge>
            </span>
            <span>
              <StatusBadge tone={priorityTone(issue.priority)}>{issue.priority}</StatusBadge>
            </span>
            <span
              className={cn(
                'truncate text-sm',
                !issue.bugDetail?.assignee && 'font-medium text-destructive'
              )}
            >
              {issue.bugDetail?.assignee || '未分配'}
            </span>
            <span className='text-sm tabular-nums'>
              {issue.caseCount}
              <span
                className={cn(
                  'block text-xs text-muted-foreground',
                  issueTrend(issue) > 50 && 'font-medium text-destructive'
                )}
              >
                24h {issue.caseCount24h} · {issueTrendLabel(issue)}
              </span>
            </span>
            <span className='text-xs text-muted-foreground'>
              最近反馈 {formatDemoRelativeTime(issue.lastSeenAt)}
              <span className='block'>更新 {formatDemoRelativeTime(issue.updatedAt)}</span>
            </span>
            <span>
              <StatusBadge tone={statusTone(issue.bugDetail?.status ?? '待分诊')}>
                {issue.bugDetail?.status}
              </StatusBadge>
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

function IssueTable({
  issues,
  projects,
  onOpen
}: {
  issues: ClusterCase[];
  projects: Array<{ id: string; name: string }>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className='min-w-245'>
      <div className='grid grid-cols-[minmax(260px,1fr)_110px_72px_140px_100px_112px_110px] gap-3 px-4 pb-2 text-xs text-muted-foreground'>
        <span>Issue</span>
        <span>Classification</span>
        <span>Priority</span>
        <span>Owner / Tags</span>
        <span>Cases</span>
        <span>Activity</span>
        <span>Status</span>
      </div>
      {issues.map((issue, index) => (
        <div key={issue.id}>
          {index ? <Separator /> : null}
          <button
            type='button'
            className='grid w-full grid-cols-[minmax(260px,1fr)_110px_72px_140px_100px_112px_110px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
            onClick={() => onOpen(issue.id)}
          >
            <span className='min-w-0'>
              <span className='block truncate text-sm font-medium'>{issue.title}</span>
              <span className='block text-xs text-muted-foreground'>
                {issue.displayId} · {projects.find((item) => item.id === issue.projectId)?.name}
              </span>
            </span>
            <span className='text-xs'>{issue.classification}</span>
            <span>
              <StatusBadge tone={priorityTone(issue.priority)}>{issue.priority}</StatusBadge>
            </span>
            <span className='truncate text-xs'>
              {issue.owner}
              <span className='block text-muted-foreground'>
                {issue.confirmedTags.join(' · ') || '未确认标签'}
              </span>
            </span>
            <span className='text-sm tabular-nums'>
              {issue.caseCount}
              <span
                className={cn(
                  'block text-xs text-muted-foreground',
                  issueTrend(issue) > 50 && 'font-medium text-destructive'
                )}
              >
                24h {issue.caseCount24h} · {issueTrendLabel(issue)}
              </span>
            </span>
            <span className='text-xs text-muted-foreground'>
              最近反馈 {formatDemoRelativeTime(issue.lastSeenAt)}
              <span className='block'>更新 {formatDemoRelativeTime(issue.updatedAt)}</span>
            </span>
            <span>
              <StatusBadge tone={statusTone(issue.issueStatus)}>{issue.issueStatus}</StatusBadge>
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

function IssueDetail({
  issue,
  evidence,
  editingTags,
  onEditingTags,
  tags,
  onClose,
  onSaveTags,
  onSaveTriage,
  onAdvance,
  onBugTransition
}: {
  issue?: ClusterCase;
  evidence: ReturnType<typeof useDemoStore.getState>['feedback'];
  editingTags: string[];
  onEditingTags: (value: string[]) => void;
  tags: string[];
  onClose: () => void;
  onSaveTags: () => void;
  onSaveTriage: (input: {
    classification: IssueClassification;
    priority: Priority;
    owner: string;
  }) => void;
  onAdvance: () => void;
  onBugTransition: (next: BugStatus) => void;
}) {
  const [triageClassification, setTriageClassification] = useState<IssueClassification>(
    issue?.classification ?? 'Pending'
  );
  const [triagePriority, setTriagePriority] = useState<Priority>(issue?.priority ?? 'P2');
  const [triageOwner, setTriageOwner] = useState(
    issue?.classification === 'Bug' ? issue.bugDetail?.assignee || '' : issue?.owner || ''
  );

  return (
    <Sheet
      open={Boolean(issue)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {issue ? (
        <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
          <SheetHeader className='pr-12'>
            <p className='text-xs text-muted-foreground'>{issue.displayId}</p>
            <SheetTitle>{issue.title}</SheetTitle>
            <SheetDescription>
              {issue.classification} · {issue.priority} ·{' '}
              {issue.classification === 'Bug' ? issue.bugDetail?.status : issue.issueStatus}
            </SheetDescription>
          </SheetHeader>
          <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6'>
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>基本信息</h3>
              <div className='flex flex-wrap gap-2'>
                <StatusBadge tone='neutral'>{issue.classification}</StatusBadge>
                <StatusBadge tone={priorityTone(issue.priority)}>{issue.priority}</StatusBadge>
                {issue.bugDetail ? (
                  <StatusBadge tone={issue.bugDetail.severity === '致命' ? 'critical' : 'warning'}>
                    {issue.bugDetail.severity}
                  </StatusBadge>
                ) : null}
              </div>
              <p className='text-sm leading-6 text-muted-foreground'>{issue.summary}</p>
            </section>
            {issue.bugDetail ? (
              <>
                <Separator />
                <section className='flex flex-col gap-3'>
                  <h3 className='text-sm font-medium'>Bug 信息</h3>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                      <p className='text-xs text-muted-foreground'>Module</p>
                      <p className='mt-1 text-sm'>{issue.bugDetail.module}</p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>Assignee</p>
                      <p
                        className={cn(
                          'mt-1 text-sm font-medium',
                          !issue.bugDetail.assignee && 'text-destructive'
                        )}
                      >
                        {issue.bugDetail.assignee || '未分配'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>复现步骤</p>
                    <ol className='mt-1 flex list-decimal flex-col gap-1 pl-5 text-sm leading-6'>
                      {issue.bugDetail.reproduction.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  {issue.bugDetail.screenshotNote ? (
                    <div>
                      <p className='text-xs text-muted-foreground'>截图说明</p>
                      <p className='mt-1 text-sm'>{issue.bugDetail.screenshotNote}</p>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}
            <Separator />
            <section className='flex flex-col gap-3'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Case Evidence</h3>
                <span className='text-xs text-muted-foreground'>{evidence.length} Cases</span>
              </div>
              {evidence.length ? (
                evidence.map((item, index) => (
                  <div key={item.id}>
                    {index ? <Separator /> : null}
                    <div className='py-3'>
                      <p className='text-xs text-muted-foreground'>
                        {item.caseId} · {item.channel}
                      </p>
                      <p className='mt-1 text-sm leading-6'>“{item.text}”</p>
                      {item.attachments.length ? (
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {item.attachments.length} 个附件
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>
                  该 Bug 由 QA 直接提交，无关联 Case。
                </p>
              )}
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>Issue Tags</h3>
              <TagPicker
                options={tags}
                value={editingTags}
                onChange={onEditingTags}
                suggested={issue.suggestedTags}
              />
              <Button size='sm' className='self-start' onClick={onSaveTags}>
                保存 Tags
              </Button>
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>人工分诊</h3>
              <FieldGroup>
                <Field>
                  <FieldLabel>Classification</FieldLabel>
                  <Select
                    value={triageClassification}
                    onValueChange={(value) =>
                      setTriageClassification(
                        (value as IssueClassification) ?? triageClassification
                      )
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue>{triageClassification}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(
                          [
                            'Pending',
                            'Bug',
                            'Feature',
                            'Improvement',
                            'Non Issue'
                          ] as IssueClassification[]
                        ).map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <Select
                    value={triagePriority}
                    onValueChange={(value) =>
                      setTriagePriority((value as Priority) ?? triagePriority)
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue>{triagePriority}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor='issue-triage-owner'>
                    {issue.classification === 'Bug' ? 'Assignee' : 'Owner'}
                  </FieldLabel>
                  <Input
                    id='issue-triage-owner'
                    value={triageOwner}
                    onChange={(event) => setTriageOwner(event.target.value)}
                    placeholder='未分配'
                  />
                </Field>
              </FieldGroup>
              <Button
                size='sm'
                className='self-start'
                onClick={() =>
                  onSaveTriage({
                    classification: triageClassification,
                    priority: triagePriority,
                    owner: triageOwner
                  })
                }
              >
                保存分诊
              </Button>
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>当前状态</h3>
              {issue.classification === 'Bug' && issue.bugDetail ? (
                <div className='flex flex-wrap gap-2'>
                  {bugTransitions[issue.bugDetail.status].map((next) => (
                    <Button
                      key={next}
                      size='sm'
                      variant={next === '不予修复' ? 'destructive' : 'outline'}
                      onClick={() => onBugTransition(next)}
                    >
                      转为{next}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  <Button size='sm' onClick={onAdvance}>
                    推进到下一阶段
                  </Button>
                </div>
              )}
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>History</h3>
              {issue.history.length ? (
                issue.history
                  .toSorted((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                  .map((event, index) => (
                    <div key={event.id}>
                      {index ? <Separator /> : null}
                      <div className='py-3'>
                        <p className='text-sm'>{event.action}</p>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {new Date(event.at).toLocaleString('zh-CN')} · {event.actor}
                        </p>
                        {event.note ? (
                          <p className='mt-1 text-xs text-muted-foreground'>{event.note}</p>
                        ) : null}
                      </div>
                    </div>
                  ))
              ) : (
                <p className='text-sm text-muted-foreground'>暂无操作记录。</p>
              )}
            </section>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
