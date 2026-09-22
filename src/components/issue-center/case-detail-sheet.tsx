'use client';

import { ChannelBadge } from '@/components/dashboard/channel-badge';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { BugIssueSheet } from '@/components/issue-center/bug-issue-sheet';
import { CaseIssueSheet } from '@/components/issue-center/case-issue-sheet';
import { TagPicker } from '@/components/issue-center/tag-picker';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import type { CaseClassification, CaseStatus } from '@/lib/domain';
import { useDemoStore } from '@/store/demo-store';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const intakeLabels = {
  auto: '自动采集',
  manual_single: '手工单条',
  manual_batch: '手工批量'
} as const;
const classificationLabels: Record<CaseClassification, string> = {
  Bug: 'Bug',
  Feature: 'Feature',
  'Non Issue': '非问题',
  Unclear: '暂未确定'
};
const statusLabels: Record<CaseStatus, string> = {
  Pending: '待处理',
  'Needs Info': '需补充信息',
  Linked: '已归并',
  Closed: '已关闭'
};

export function CaseDetailSheet({
  caseId,
  open,
  onOpenChange
}: {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const item = useDemoStore((state) => state.feedback.find((feedback) => feedback.id === caseId));
  const projects = useDemoStore((state) => state.projects);
  const issues = useDemoStore((state) => state.clusters);
  const tags = useDemoStore((state) => state.tags);
  const confirmCaseTags = useDemoStore((state) => state.confirmCaseTags);
  const updateCaseStatus = useDemoStore((state) => state.updateCaseStatus);
  const unlinkCaseFromIssue = useDemoStore((state) => state.unlinkCaseFromIssue);
  const [tagDrafts, setTagDrafts] = useState<Record<string, string[]>>({});
  const [issueAction, setIssueAction] = useState<'link' | 'create' | null>(null);
  const [bugOpen, setBugOpen] = useState(false);
  if (!item) return null;
  const selectedTags =
    tagDrafts[item.id] ??
    (item.tagStatus === 'confirmed' ? item.confirmedTags : item.suggestedTags);
  const linkedIssue = issues.find((issue) => issue.id === item.issueId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
          <SheetHeader className='pr-12'>
            <p className='text-xs text-muted-foreground'>{item.caseId}</p>
            <SheetTitle>Case Detail</SheetTitle>
            <SheetDescription>
              {projects.find((project) => project.id === item.projectId)?.name} ·{' '}
              {new Date(item.occurredAt).toLocaleString('zh-CN')}
            </SheetDescription>
          </SheetHeader>
          <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6'>
            <section className='flex flex-col gap-3'>
              <div className='flex flex-wrap items-center gap-2'>
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
              </div>
              <h3 className='text-sm font-medium'>原始反馈</h3>
              <p className='bg-muted/40 p-4 text-sm leading-6'>“{item.text}”</p>
              <div className='grid gap-3 text-sm sm:grid-cols-2'>
                <p>
                  <span className='text-muted-foreground'>来源渠道：</span>
                  <ChannelBadge channel={item.channel} />
                </p>
                <p>
                  <span className='text-muted-foreground'>采集方式：</span>
                  {intakeLabels[item.intakeMethod]}
                </p>
                <p>
                  <span className='text-muted-foreground'>提交人：</span>
                  {item.submittedBy}
                </p>
                <p>
                  <span className='text-muted-foreground'>反馈日期：</span>
                  {new Date(item.occurredAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              {item.originalUrl ? (
                <a
                  href={item.originalUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='text-sm font-medium text-primary hover:underline'
                >
                  打开原始链接
                </a>
              ) : null}
              {item.attachments.length ? (
                <div className='grid grid-cols-3 gap-3 sm:grid-cols-5'>
                  {item.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.url} target='_blank' rel='noreferrer'>
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        width={96}
                        height={96}
                        className='aspect-square w-full rounded-md object-cover'
                      />
                      <span className='mt-1 block truncate text-xs text-muted-foreground'>
                        {attachment.name}
                        {attachment.isMock ? ' · Demo' : ''}
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>AI 分析 · 模拟</h3>
              <div className='flex items-center gap-2'>
                <StatusBadge tone={item.aiClassification === 'Bug' ? 'warning' : 'neutral'}>
                  {classificationLabels[item.aiClassification]}
                </StatusBadge>
                <span className='text-xs tabular-nums text-muted-foreground'>
                  置信度 {Math.round(item.aiConfidence * 100)}%
                </span>
              </div>
              <p className='text-sm leading-6 text-muted-foreground'>{item.aiReason}</p>
              {item.issueMatchReason ? (
                <p className='text-sm leading-6 text-muted-foreground'>
                  Issue 匹配依据：{item.issueMatchReason}
                </p>
              ) : null}
              <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
                <span>建议 Tags：</span>
                <span>{item.suggestedTags.join(' · ') || '暂无'}</span>
              </div>
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-3'>
                <h3 className='text-sm font-medium'>Tags</h3>
                <StatusBadge tone={item.tagStatus === 'confirmed' ? 'success' : 'info'}>
                  {item.tagStatus === 'confirmed' ? '已确认' : '待确认'}
                </StatusBadge>
              </div>
              <Field>
                <FieldLabel>
                  {item.tagStatus === 'pending' ? 'AI 建议 Tags · 模拟' : '正式 Tags'}
                </FieldLabel>
                <TagPicker
                  options={tags.map((tag) => tag.name)}
                  value={selectedTags}
                  onChange={(value) =>
                    setTagDrafts((current) => ({ ...current, [item.id]: value }))
                  }
                  suggested={item.tagStatus === 'pending' ? item.suggestedTags : []}
                />
                <FieldDescription>只有人工确认的标签会参与查询和周报统计。</FieldDescription>
              </Field>
              <Button
                size='sm'
                className='self-start'
                onClick={() => confirmCaseTags(item.id, selectedTags)}
              >
                确认标签
              </Button>
            </section>
            <Separator />
            <section className='flex flex-col gap-3'>
              <h3 className='text-sm font-medium'>人工处理 / Linked Issue</h3>
              {linkedIssue ? (
                <div>
                  <p className='text-sm font-medium'>
                    {linkedIssue.displayId} · {linkedIssue.title}
                  </p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {linkedIssue.classification} · {linkedIssue.priority} ·{' '}
                    {linkedIssue.classification === 'Bug'
                      ? linkedIssue.bugDetail?.status
                      : linkedIssue.issueStatus}
                  </p>
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>当前未关联 Issue。</p>
              )}
              <div className='flex flex-wrap gap-2'>
                {item.status === 'Pending' || item.status === 'Needs Info' ? (
                  <Button size='sm' variant='outline' onClick={() => setIssueAction('link')}>
                    关联已有 Issue
                  </Button>
                ) : null}
                {item.status === 'Pending' || item.status === 'Needs Info' ? (
                  <Button size='sm' onClick={() => setIssueAction('create')}>
                    创建新 Issue
                  </Button>
                ) : null}
                {item.status === 'Pending' ? (
                  <Button size='sm' variant='outline' onClick={() => setBugOpen(true)}>
                    转为 Bug
                  </Button>
                ) : null}
                {item.status === 'Pending' ? (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => updateCaseStatus(item.id, 'Needs Info')}
                  >
                    标记需补充信息
                  </Button>
                ) : null}
                {item.status === 'Needs Info' || item.status === 'Closed' ? (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => updateCaseStatus(item.id, 'Pending')}
                  >
                    {item.status === 'Closed' ? '重新打开' : '恢复待处理'}
                  </Button>
                ) : null}
                {item.status === 'Linked' && linkedIssue ? (
                  <Link
                    href={`/dashboard/cases/issues?issue=${linkedIssue.id}`}
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    查看关联 Issue
                  </Link>
                ) : null}
                {item.status === 'Linked' && linkedIssue ? (
                  <Button size='sm' variant='outline' onClick={() => unlinkCaseFromIssue(item.id)}>
                    移出当前 Issue
                  </Button>
                ) : null}
                {item.status === 'Pending' || item.status === 'Needs Info' ? (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => updateCaseStatus(item.id, 'Closed')}
                  >
                    关闭 Case
                  </Button>
                ) : null}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
      <CaseIssueSheet
        key={`${item.id}-${issueAction}`}
        mode={issueAction ?? 'link'}
        caseIds={[item.id]}
        open={Boolean(issueAction)}
        onOpenChange={(next) => {
          if (!next) setIssueAction(null);
        }}
      />
      <BugIssueSheet
        key={`${item.id}-new-bug`}
        caseIds={[item.id]}
        open={bugOpen}
        onOpenChange={setBugOpen}
      />
    </>
  );
}
