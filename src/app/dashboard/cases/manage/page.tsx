'use client';

import { ChannelBadge } from '@/components/dashboard/channel-badge';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
import { BugIssueSheet } from '@/components/issue-center/bug-issue-sheet';
import { CaseDetailSheet } from '@/components/issue-center/case-detail-sheet';
import { CaseIssueSheet } from '@/components/issue-center/case-issue-sheet';
import { CreateCaseSheet } from '@/components/issue-center/create-case-sheet';
import { TagManagementSheet } from '@/components/issue-center/tag-management-sheet';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { CaseStatus, IntakeMethod, SourceChannel } from '@/lib/domain';
import { demoNow } from '@/lib/demo-time';
import { useDemoStore } from '@/store/demo-store';
import { useEffect, useMemo, useState } from 'react';

type Period = 'today' | '7d' | '30d' | 'custom';
const currentUser = '当前演示用户';
const intakeLabels: Record<IntakeMethod, string> = {
  auto: '自动采集',
  manual_single: '手工单条',
  manual_batch: '手工批量'
};
const statusLabels: Record<CaseStatus, string> = {
  Pending: '待处理',
  'Needs Info': '需补充信息',
  Linked: '已归并',
  Closed: '已关闭'
};

function SelectFilter({
  value,
  onValueChange,
  label,
  items
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next ?? value)}>
      <SelectTrigger size='sm' aria-label={label}>
        <SelectValue>{items.find((item) => item.value === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default function CasesManagePage() {
  const projects = useDemoStore((state) => state.projects);
  const feedback = useDemoStore((state) => state.feedback);
  const issues = useDemoStore((state) => state.clusters);
  const tags = useDemoStore((state) => state.tags);
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [appId, setAppId] = useState('all');
  const [period, setPeriod] = useState<Period>('30d');
  const [startDate, setStartDate] = useState('2026-09-14');
  const [endDate, setEndDate] = useState('2026-09-20');
  const [channel, setChannel] = useState('all');
  const [intake, setIntake] = useState('all');
  const [tag, setTag] = useState('all');
  const [caseStatus, setCaseStatus] = useState('all');
  const [tagStatus, setTagStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [detailId, setDetailId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [issueAction, setIssueAction] = useState<'link' | 'create' | null>(null);
  const [bugOpen, setBugOpen] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('action') !== 'create-case') return;
    const timer = window.setTimeout(() => setCreateOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(
    () =>
      feedback
        .filter((item) => {
          const created = new Date(item.caseCreatedAt);
          const now = demoNow();
          const days = (now.getTime() - created.getTime()) / 86_400_000;
          const inDate =
            period === 'today'
              ? created.toLocaleDateString('zh-CN') === now.toLocaleDateString('zh-CN')
              : period === 'custom'
                ? item.caseCreatedAt.slice(0, 10) >= startDate &&
                  item.caseCreatedAt.slice(0, 10) <= endDate
                : days <= (period === '7d' ? 7 : 30);
          return (
            inDate &&
            (scope === 'all' || item.submittedBy === currentUser) &&
            (appId === 'all' || item.projectId === appId) &&
            (channel === 'all' || item.channel === channel) &&
            (intake === 'all' || item.intakeMethod === intake) &&
            (tag === 'all' || item.confirmedTags.includes(tag)) &&
            (caseStatus === 'all' || item.status === caseStatus) &&
            (tagStatus === 'all' || item.tagStatus === tagStatus) &&
            (!query.trim() ||
              item.caseId.toLowerCase().includes(query.toLowerCase()) ||
              item.text.toLowerCase().includes(query.toLowerCase()))
          );
        })
        .toSorted(
          (a, b) => new Date(b.caseCreatedAt).getTime() - new Date(a.caseCreatedAt).getTime()
        ),
    [
      appId,
      channel,
      caseStatus,
      endDate,
      feedback,
      intake,
      period,
      query,
      scope,
      startDate,
      tag,
      tagStatus
    ]
  );

  const channels: SourceChannel[] = [
    'Reddit',
    'Discord',
    'X',
    'YouTube',
    'Telegram',
    'Internal',
    'Other'
  ];

  return (
    <PageContainer
      title='Cases'
      description='统一管理自动采集与人工提交的玩家反馈'
      action={
        <>
          <Button variant='outline' onClick={() => setTagOpen(true)}>
            <Icons.tags data-icon='inline-start' />
            标签管理
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Icons.plus data-icon='inline-start' />提 Case
          </Button>
        </>
      }
    >
      <div className='min-w-0 flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <ToggleGroup
            variant='outline'
            size='sm'
            value={[scope]}
            onValueChange={(value) => setScope((value[0] as 'all' | 'mine') ?? scope)}
          >
            <ToggleGroupItem value='all'>全部 Case</ToggleGroupItem>
            <ToggleGroupItem value='mine'>我的 Case</ToggleGroupItem>
          </ToggleGroup>
          <Input
            className='w-full sm:w-56'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='搜索 Case ID 或原文'
            aria-label='搜索 Case'
          />
        </div>
        <div className='flex flex-wrap gap-2'>
          <SelectFilter
            value={appId}
            onValueChange={setAppId}
            label='App'
            items={[
              { value: 'all', label: '全部 App' },
              ...projects.map((project) => ({ value: project.id, label: project.name }))
            ]}
          />
          <SelectFilter
            value={period}
            onValueChange={(value) => setPeriod(value as Period)}
            label='日期'
            items={[
              { value: 'today', label: '今日' },
              { value: '7d', label: '近 7 天' },
              { value: '30d', label: '近 30 天' },
              { value: 'custom', label: '自定义' }
            ]}
          />
          <SelectFilter
            value={channel}
            onValueChange={setChannel}
            label='来源渠道'
            items={[
              { value: 'all', label: '全部渠道' },
              ...channels.map((item) => ({ value: item, label: item }))
            ]}
          />
          <SelectFilter
            value={intake}
            onValueChange={setIntake}
            label='采集方式'
            items={[
              { value: 'all', label: '全部采集' },
              ...Object.entries(intakeLabels).map(([value, label]) => ({ value, label }))
            ]}
          />
          <SelectFilter
            value={tag}
            onValueChange={setTag}
            label='标签'
            items={[
              { value: 'all', label: '全部标签' },
              ...tags.map((item) => ({ value: item.name, label: item.name }))
            ]}
          />
          <SelectFilter
            value={caseStatus}
            onValueChange={setCaseStatus}
            label='Case Status'
            items={[
              { value: 'all', label: '全部状态' },
              ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
            ]}
          />
          <SelectFilter
            value={tagStatus}
            onValueChange={setTagStatus}
            label='标签状态'
            items={[
              { value: 'all', label: '全部标签状态' },
              { value: 'pending', label: '待确认' },
              { value: 'confirmed', label: '已确认' }
            ]}
          />
        </div>
        {period === 'custom' ? (
          <div className='flex flex-wrap items-center gap-2'>
            <Input
              className='w-40'
              type='date'
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label='开始日期'
            />
            <span className='text-sm text-muted-foreground'>至</span>
            <Input
              className='w-40'
              type='date'
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label='结束日期'
            />
          </div>
        ) : null}
      </div>

      {selectedIds.length ? (
        <div className='mt-4 flex flex-wrap items-center gap-2 bg-muted/40 px-4 py-3'>
          <span className='mr-auto text-sm font-medium'>已选择 {selectedIds.length} Cases</span>
          <Button size='sm' variant='outline' onClick={() => setIssueAction('link')}>
            关联已有 Issue
          </Button>
          <Button size='sm' onClick={() => setIssueAction('create')}>
            创建新 Issue
          </Button>
          <Button size='sm' variant='outline' onClick={() => setBugOpen(true)}>
            转为 Bug
          </Button>
          <Button size='sm' variant='ghost' onClick={() => setSelectedIds([])}>
            取消选择
          </Button>
        </div>
      ) : null}

      <Card className='mt-4 min-w-0'>
        <CardContent className='overflow-x-auto p-0'>
          <div className='min-w-205'>
            <div className='grid grid-cols-[24px_minmax(220px,1fr)_128px_minmax(140px,1fr)_96px_180px] gap-3 px-4 pb-2 text-xs text-muted-foreground'>
              <Checkbox
                aria-label='选择当前页全部 Case'
                checked={
                  filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))
                }
                onCheckedChange={(checked) =>
                  setSelectedIds(checked ? filtered.map((item) => item.id) : [])
                }
              />
              <span>Case</span>
              <span>来源</span>
              <span>Tags</span>
              <span>Case Status</span>
              <span>Linked Issue</span>
            </div>
            {filtered.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>没有匹配的 Case</EmptyTitle>
                  <EmptyDescription>调整筛选条件，或提交一条新 Case。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filtered.map((item, index) => {
                const linkedIssue = issues.find((issue) => issue.id === item.issueId);
                return (
                  <div key={item.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='grid grid-cols-[24px_minmax(220px,1fr)_128px_minmax(140px,1fr)_96px_180px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50'>
                      <Checkbox
                        aria-label={`选择 ${item.caseId}`}
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) =>
                          setSelectedIds((current) =>
                            checked
                              ? [...new Set([...current, item.id])]
                              : current.filter((id) => id !== item.id)
                          )
                        }
                      />
                      <button
                        type='button'
                        className='contents text-left'
                        onClick={() => setDetailId(item.id)}
                      >
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
                            {statusLabels[item.status]}
                          </StatusBadge>
                        </span>
                        <span className='text-sm font-medium'>
                          {linkedIssue ? linkedIssue.displayId : '未关联'}
                          {linkedIssue ? (
                            <span className='block text-xs font-normal text-muted-foreground'>
                              {linkedIssue.classification} ·{' '}
                              {linkedIssue.classification === 'Bug'
                                ? linkedIssue.bugDetail?.status
                                : linkedIssue.issueStatus}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
      <CreateCaseSheet open={createOpen} onOpenChange={setCreateOpen} />
      <TagManagementSheet open={tagOpen} onOpenChange={setTagOpen} />
      <CaseDetailSheet
        caseId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId('');
        }}
      />
      <CaseIssueSheet
        key={`${issueAction}-${selectedIds.join('-')}`}
        mode={issueAction ?? 'link'}
        caseIds={selectedIds}
        open={Boolean(issueAction)}
        onOpenChange={(open) => {
          if (!open) setIssueAction(null);
        }}
        onComplete={() => setSelectedIds([])}
      />
      <BugIssueSheet
        key={`bug-${selectedIds.join('-')}`}
        caseIds={selectedIds}
        open={bugOpen}
        onOpenChange={setBugOpen}
        onComplete={() => setSelectedIds([])}
      />
    </PageContainer>
  );
}
