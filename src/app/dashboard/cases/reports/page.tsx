'use client';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
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
import { Textarea } from '@/components/ui/textarea';
import type { Priority } from '@/lib/domain';
import {
  buildIssueReport,
  formatDelta,
  formatPercent,
  type Comparison,
  type ReportCriteria
} from '@/lib/issue-report';
import { useDemoStore } from '@/store/demo-store';
import { useMemo, useState } from 'react';

const defaults: ReportCriteria = {
  appId: 'all',
  start: '2026-09-14',
  end: '2026-09-20',
  topCount: 5
};

const priorityTone = (priority: Priority) =>
  priority === 'P0'
    ? ('critical' as const)
    : priority === 'P1'
      ? ('warning' as const)
      : ('neutral' as const);

function Metric({
  label,
  comparison,
  mode = 'percent'
}: {
  label: string;
  comparison: Comparison;
  mode?: 'percent' | 'delta';
}) {
  return (
    <div className='min-w-0'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 text-2xl font-semibold tabular-nums'>{comparison.current}</p>
      <p className='mt-1 text-xs text-muted-foreground'>
        {mode === 'percent' ? formatPercent(comparison) : formatDelta(comparison)} vs 上期
      </p>
    </div>
  );
}

function SectionEmpty({ children }: { children: string }) {
  return (
    <Empty className='py-8'>
      <EmptyHeader>
        <EmptyTitle>当前无匹配记录</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function createMarkdown(
  appName: string,
  criteria: ReportCriteria,
  report: ReturnType<typeof buildIssueReport>,
  discoveries: string,
  suggestions: string
) {
  const trendLines = report.tags.length
    ? report.tags.map(
        (item) =>
          `- ${item.tag}：本期 ${item.current} / 上期 ${item.previous} / ${formatPercent(item)}`
      )
    : ['- 暂无已确认标签'];
  const hotspotLines = report.hotspots.length
    ? report.hotspots.map((item) => `- ${item.tag}：${item.current} Cases（上期 ${item.previous}）`)
    : ['- 暂无'];
  const coreIssueLines = report.coreIssues.length
    ? report.coreIssues.flatMap((row) => [
        `### ${row.issue.displayId} · ${row.issue.title}`,
        '',
        `问题摘要：${row.issue.summary}`,
        '',
        `本期反馈：${row.currentCases.length} Cases；上期 ${row.previousCases.length}；${formatPercent(row.comparison)}`,
        '',
        `主要特征：${[row.issue.aiAssessment.businessLine, row.issue.aiAssessment.category, ...row.issue.confirmedTags].join(' / ')}`,
        '',
        `当前进展：${row.issue.issueStatus} · Owner：${row.issue.owner}`,
        ...(row.issue.classification === 'Bug' && row.issue.bugDetail
          ? [
              '',
              `Bug 分诊：${row.issue.bugDetail.severity} · ${row.issue.bugDetail.module} · ${row.issue.bugDetail.assignee || '未分配'} · ${row.issue.bugDetail.status}`
            ]
          : []),
        '',
        '代表反馈：',
        ...row.currentCases.slice(0, 2).map((item) => `- ${item.caseId} · “${item.text}”`),
        ''
      ])
    : ['暂无'];
  const fixLines = report.fixEffects.length
    ? report.fixEffects.map(
        (row) =>
          `- ${row.issue.displayId} · ${row.result}：${row.before} → ${row.after}（${row.reduction >= 0 ? '下降' : '上升'} ${Math.abs(row.reduction)}%）`
      )
    : ['- 暂无可评估记录'];
  const attentionLines = report.attention.length
    ? report.attention.flatMap((row) => [
        `### ${row.issue.displayId} · ${row.issue.title}`,
        ...row.reasons.map((reason) => `- ${reason}`),
        `- 建议动作：${row.action}`,
        ''
      ])
    : ['暂无'];

  return [
    '# 玩家反馈周报',
    '',
    `游戏：${appName}`,
    `本期：${criteria.start} ～ ${criteria.end}`,
    `上一周期：${report.previous.start} ～ ${report.previous.end}`,
    '',
    '## 一、本周概览',
    '',
    `- 全部 Case：${report.metrics.all.current}（${formatPercent(report.metrics.all)}）`,
    `- Bug Case：${report.metrics.bug.current}（${formatPercent(report.metrics.bug)}）`,
    `- Feature Case：${report.metrics.feature.current}（${formatPercent(report.metrics.feature)}）`,
    `- 新增 Issue：${report.metrics.newIssues.current}（${formatDelta(report.metrics.newIssues)}）`,
    `- 已解决 Issue：${report.metrics.resolvedIssues.current}（${formatDelta(report.metrics.resolvedIssues)}）`,
    `- 未关闭 Issue：${report.metrics.openIssues.current}（${formatDelta(report.metrics.openIssues)}）`,
    '',
    '## 二、Bug 分诊',
    '',
    `- 新增 Bug：${report.bugMetrics.new}`,
    `- 关闭 Bug：${report.bugMetrics.closed}`,
    `- Open Bug：${report.bugMetrics.open}`,
    `- P0 / P1 Bug：${report.bugMetrics.high}`,
    `- 待分诊 Bug：${report.bugMetrics.pending}`,
    `- 未分配 Bug：${report.bugMetrics.unassigned}`,
    '',
    '## 三、问题趋势',
    '',
    '### 高频问题',
    '',
    ...trendLines,
    '',
    '### 新增热点',
    '',
    ...hotspotLines,
    '',
    '## 四、核心问题',
    '',
    ...coreIssueLines,
    '## 五、Issue 闭环',
    '',
    `- 本期新增：${report.newIssues.length}`,
    `- 持续推进：${report.progressingIssues.length}`,
    `- 本期解决：${report.resolvedIssues.length}`,
    `- 需要关注：${report.attention.length}`,
    '',
    '## 六、修复效果',
    '',
    ...fixLines,
    '',
    '## 七、持续高发 / 跨周遗留',
    '',
    ...(report.legacyIssues.length
      ? report.legacyIssues.map(
          (row) =>
            `- ${row.issue.displayId} · ${row.issue.title}：本期 ${row.currentCases.length} / 上期 ${row.previousCases.length} Cases`
        )
      : ['- 暂无']),
    '',
    '## 八、需要推进',
    '',
    ...attentionLines,
    '## 九、本周发现',
    '',
    discoveries,
    '',
    '## 十、建议改进',
    '',
    suggestions,
    '',
    '> 事实统计来自本地 Demo 记录；问题摘要、发现和建议由确定性模拟规则生成，可由 QA 编辑确认。'
  ].join('\n');
}

export default function ReportsPage() {
  const projects = useDemoStore((state) => state.projects);
  const allCases = useDemoStore((state) => state.feedback);
  const allIssues = useDemoStore((state) => state.clusters);
  const [draft, setDraft] = useState(defaults);
  const [criteria, setCriteria] = useState(defaults);
  const report = useMemo(
    () => buildIssueReport(criteria, allCases, allIssues),
    [allCases, allIssues, criteria]
  );
  const generatedDiscoveries = report.discoveries
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');
  const generatedSuggestions = report.suggestions.map((item) => `• ${item}`).join('\n');
  const [discoveries, setDiscoveries] = useState(generatedDiscoveries);
  const [suggestions, setSuggestions] = useState(generatedSuggestions);
  const appName =
    criteria.appId === 'all'
      ? '全部游戏'
      : (projects.find((project) => project.id === criteria.appId)?.name ?? '未知游戏');
  const markdown = createMarkdown(appName, criteria, report, discoveries, suggestions);

  function generate() {
    const nextReport = buildIssueReport(draft, allCases, allIssues);
    setCriteria(draft);
    setDiscoveries(nextReport.discoveries.map((item, index) => `${index + 1}. ${item}`).join('\n'));
    setSuggestions(nextReport.suggestions.map((item) => `• ${item}`).join('\n'));
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
  }

  function downloadMarkdown() {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `player-feedback-weekly-${criteria.start}-${criteria.end}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <PageContainer title='Reports' description='生成可直接用于 QA、策划和项目周会的玩家反馈周报'>
      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>生成条件</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup className='sm:grid sm:grid-cols-4 sm:items-end sm:gap-4'>
            <Field>
              <FieldLabel>App</FieldLabel>
              <Select
                value={draft.appId}
                onValueChange={(value) =>
                  setDraft((current) => ({ ...current, appId: value ?? current.appId }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {draft.appId === 'all'
                      ? '全部游戏'
                      : projects.find((project) => project.id === draft.appId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='all'>全部游戏</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor='report-start'>开始日期</FieldLabel>
              <Input
                id='report-start'
                type='date'
                value={draft.start}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, start: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='report-end'>结束日期</FieldLabel>
              <Input
                id='report-end'
                type='date'
                value={draft.end}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, end: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>核心 Issue 数量</FieldLabel>
              <Select
                value={String(draft.topCount)}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    topCount: Number(value ?? current.topCount)
                  }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{draft.topCount}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[3, 5, 10].map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs text-muted-foreground'>上一周期将按所选日期长度自动计算。</p>
            <Button onClick={generate}>
              <Icons.report data-icon='inline-start' />
              生成周报预览
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='mt-4 flex min-w-0 flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>本周概览</CardTitle>
            <CardDescription>
              {appName} · 本期 {criteria.start} ～ {criteria.end} · 上期 {report.previous.start} ～{' '}
              {report.previous.end}
            </CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6'>
            <Metric label='全部 Case' comparison={report.metrics.all} />
            <Metric label='Bug Case' comparison={report.metrics.bug} />
            <Metric label='Feature Case' comparison={report.metrics.feature} />
            <Metric label='新增 Issue' comparison={report.metrics.newIssues} mode='delta' />
            <Metric label='已解决 Issue' comparison={report.metrics.resolvedIssues} mode='delta' />
            <Metric label='未关闭 Issue' comparison={report.metrics.openIssues} mode='delta' />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bug 分诊</CardTitle>
            <CardDescription>统计当前统一 Issue Pool 中的 Bug 处理情况</CardDescription>
          </CardHeader>
          <CardContent className='grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6'>
            {[
              ['新增 Bug', report.bugMetrics.new],
              ['关闭 Bug', report.bugMetrics.closed],
              ['Open Bug', report.bugMetrics.open],
              ['P0 / P1 Bug', report.bugMetrics.high],
              ['待分诊 Bug', report.bugMetrics.pending],
              ['未分配 Bug', report.bugMetrics.unassigned]
            ].map(([label, value]) => (
              <div key={label}>
                <p className='text-xs text-muted-foreground'>{label}</p>
                <p className='mt-1 text-2xl font-semibold tabular-nums'>{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className='grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]'>
          <Card className='min-w-0'>
            <CardHeader>
              <CardTitle>高频问题趋势</CardTitle>
              <CardDescription>仅统计人工确认后的标签</CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto p-0'>
              {report.tags.length ? (
                <div className='min-w-120'>
                  <div className='grid grid-cols-[minmax(160px,1fr)_72px_72px_80px] gap-3 px-4 pb-2 text-xs text-muted-foreground'>
                    <span>问题</span>
                    <span>本期</span>
                    <span>上期</span>
                    <span>环比</span>
                  </div>
                  {report.tags.map((item, index) => (
                    <div key={item.tag}>
                      {index > 0 ? <Separator /> : null}
                      <div className='grid grid-cols-[minmax(160px,1fr)_72px_72px_80px] gap-3 px-4 py-3 text-sm'>
                        <span className='font-medium'>{item.tag}</span>
                        <span className='tabular-nums'>{item.current}</span>
                        <span className='tabular-nums text-muted-foreground'>{item.previous}</span>
                        <span className='tabular-nums'>{formatPercent(item)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <SectionEmpty>当前周期没有已确认标签。</SectionEmpty>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>新增热点</CardTitle>
              <CardDescription>新增或较上期增长至少 100%</CardDescription>
            </CardHeader>
            <CardContent>
              {report.hotspots.length ? (
                report.hotspots.map((item, index) => (
                  <div key={item.tag}>
                    {index > 0 ? <Separator /> : null}
                    <div className='flex items-center justify-between gap-3 py-3'>
                      <span className='text-sm font-medium'>{item.tag}</span>
                      <span className='text-right text-xs text-muted-foreground'>
                        {item.current} Cases
                        <span className='block'>{formatPercent(item)}</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-sm text-muted-foreground'>暂无达到规则阈值的热点。</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>核心问题</CardTitle>
            <CardDescription>综合反馈量、增速、优先级、阻塞和回归风险排序</CardDescription>
          </CardHeader>
          <CardContent>
            {report.coreIssues.length ? (
              report.coreIssues.map((row, index) => (
                <article key={row.issue.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className='flex flex-col gap-4 py-5'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium'>
                          #{index + 1} {row.issue.displayId} · {row.issue.title}
                        </p>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          本期 {row.currentCases.length} · 上期 {row.previousCases.length} Cases ·{' '}
                          {formatPercent(row.comparison)}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <StatusBadge tone={priorityTone(row.issue.priority)}>
                          {row.issue.priority}
                        </StatusBadge>
                        <StatusBadge tone={row.issue.issueStatus === 'Blocked' ? 'danger' : 'info'}>
                          {row.issue.issueStatus}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className='grid gap-4 lg:grid-cols-3'>
                      <div>
                        <p className='text-xs text-muted-foreground'>发生了什么</p>
                        <p className='mt-1 text-sm leading-6'>{row.issue.summary}</p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>主要特征</p>
                        <p className='mt-1 text-sm leading-6'>
                          {[
                            row.issue.aiAssessment.businessLine,
                            row.issue.aiAssessment.category,
                            ...row.issue.confirmedTags
                          ].join(' / ')}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-muted-foreground'>当前进展</p>
                        <p className='mt-1 text-sm leading-6'>
                          {row.issue.classification === 'Bug' && row.issue.bugDetail
                            ? `${row.issue.bugDetail.status} · ${row.issue.bugDetail.severity} · ${row.issue.bugDetail.module} · Assignee: ${row.issue.bugDetail.assignee || '未分配'}`
                            : `${row.issue.issueStatus} · Owner: ${row.issue.owner}`}
                        </p>
                      </div>
                    </div>
                    {row.currentCases.length ? (
                      <div className='bg-muted/40 p-3'>
                        <p className='mb-2 text-xs text-muted-foreground'>代表反馈</p>
                        {row.currentCases.slice(0, 2).map((item) => (
                          <p key={item.id} className='text-sm leading-6'>
                            {item.caseId} · “{item.text}”
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <SectionEmpty>当前周期没有关联 Issue 的 Case。</SectionEmpty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue 闭环</CardTitle>
            <CardDescription>追踪上期关注问题在本期的推进与解决情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
              {[
                ['本期新增', report.newIssues.length],
                ['持续推进', report.progressingIssues.length],
                ['本期解决', report.resolvedIssues.length],
                ['需要关注', report.attention.length]
              ].map(([label, value]) => (
                <div key={label}>
                  <p className='text-xs text-muted-foreground'>{label}</p>
                  <p className='mt-1 text-2xl font-semibold tabular-nums'>{value}</p>
                </div>
              ))}
            </div>
            {(report.progressingIssues.length || report.resolvedIssues.length) > 0 ? (
              <div className='mt-4'>
                <Separator />
                {[...report.progressingIssues, ...report.resolvedIssues].map((row) => (
                  <div
                    key={row.issue.id}
                    className='flex flex-wrap items-center justify-between gap-3 py-3'
                  >
                    <div>
                      <p className='text-sm font-medium'>
                        {row.issue.displayId} · {row.issue.title}
                      </p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        上期 {row.issue.previousPeriodStatus ?? '持续跟进'} → 本期{' '}
                        {row.issue.issueStatus}
                      </p>
                    </div>
                    <span className='text-xs tabular-nums text-muted-foreground'>
                      {row.previousCases.length} → {row.currentCases.length} Cases
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className='grid gap-4 xl:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>修复效果</CardTitle>
              <CardDescription>结合解决前后 Case 数判断，不只依赖状态</CardDescription>
            </CardHeader>
            <CardContent>
              {report.fixEffects.length ? (
                report.fixEffects.map((row, index) => (
                  <div key={row.issue.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='flex flex-wrap items-center justify-between gap-3 py-3'>
                      <div>
                        <p className='text-sm font-medium'>
                          {row.issue.displayId} · {row.issue.title}
                        </p>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {row.before} → {row.after} Cases · {Math.abs(row.reduction)}%
                        </p>
                      </div>
                      <StatusBadge
                        tone={
                          row.issue.possibleRegression
                            ? 'danger'
                            : row.reduction >= 60
                              ? 'success'
                              : 'warning'
                        }
                      >
                        {row.result}
                      </StatusBadge>
                    </div>
                  </div>
                ))
              ) : (
                <SectionEmpty>暂无包含解决前后 Case 数据的 Issue。</SectionEmpty>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>持续高发 / 跨周遗留</CardTitle>
              <CardDescription>超过 14 天、仍未关闭且本期仍有新增 Case</CardDescription>
            </CardHeader>
            <CardContent>
              {report.legacyIssues.length ? (
                report.legacyIssues.map((row, index) => (
                  <div key={row.issue.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='py-3'>
                      <p className='text-sm font-medium'>
                        {row.issue.displayId} · {row.issue.title}
                      </p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        本期 {row.currentCases.length} · 上期 {row.previousCases.length} Cases ·{' '}
                        {row.issue.issueStatus}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <SectionEmpty>当前没有符合规则的跨周遗留问题。</SectionEmpty>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>需要推进</CardTitle>
            <CardDescription>由阻塞、时长、优先级、增长、回归和 Owner 规则自动识别</CardDescription>
            <CardAction className='text-2xl font-semibold tabular-nums'>
              {report.attention.length}
            </CardAction>
          </CardHeader>
          <CardContent>
            {report.attention.length ? (
              report.attention.map((row, index) => (
                <article key={row.issue.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className='grid gap-4 py-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.5fr)_minmax(240px,1fr)]'>
                    <div>
                      <p className='text-sm font-medium'>
                        {row.issue.displayId} · {row.issue.title}
                      </p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {row.issue.issueStatus} · {row.issue.owner}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>卡点 / 风险</p>
                      {row.reasons.map((reason) => (
                        <p key={reason} className='mt-1 text-sm'>
                          {reason}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className='text-xs text-muted-foreground'>建议动作</p>
                      <p className='mt-1 text-sm leading-6'>{row.action}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <SectionEmpty>当前没有命中自动关注规则的 Issue。</SectionEmpty>
            )}
          </CardContent>
        </Card>

        <div className='grid gap-4 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>
                本周发现{' '}
                <span className='text-xs font-normal text-muted-foreground'>· 模拟，可编辑</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={8}
                value={discoveries}
                onChange={(event) => setDiscoveries(event.target.value)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                建议改进{' '}
                <span className='text-xs font-normal text-muted-foreground'>· 模拟，可编辑</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={8}
                value={suggestions}
                onChange={(event) => setSuggestions(event.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className='flex flex-wrap justify-end gap-2'>
          <Button variant='outline' onClick={copyMarkdown}>
            <Icons.copy data-icon='inline-start' />
            复制 Markdown
          </Button>
          <Button onClick={downloadMarkdown}>
            <Icons.download data-icon='inline-start' />
            下载 .md
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
