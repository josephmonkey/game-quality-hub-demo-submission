'use client';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { TagPicker } from '@/components/issue-center/tag-picker';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { useDemoStore } from '@/store/demo-store';
import { useMemo, useState } from 'react';

export function CaseIssueSheet({
  mode,
  caseIds,
  open,
  onOpenChange,
  onComplete
}: {
  mode: 'link' | 'create';
  caseIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}) {
  const allCases = useDemoStore((state) => state.feedback);
  const issues = useDemoStore((state) => state.clusters);
  const projects = useDemoStore((state) => state.projects);
  const tags = useDemoStore((state) => state.tags);
  const linkCasesToIssue = useDemoStore((state) => state.linkCasesToIssue);
  const createIssueFromCases = useDemoStore((state) => state.createIssueFromCases);
  const caseKey = caseIds.join('|');
  const cases = useMemo(() => {
    const selected = new Set(caseKey.split('|').filter(Boolean));
    return allCases.filter((item) => selected.has(item.id));
  }, [allCases, caseKey]);
  const first = cases[0];
  const [query, setQuery] = useState('');
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [title, setTitle] = useState(
    first
      ? cases.length === 1
        ? first.text.slice(0, 48)
        : `${cases.length} 条 Case 的共同问题`
      : ''
  );
  const projectId = first?.projectId ?? '';
  const [selectedTags, setSelectedTags] = useState<string[]>([
    ...new Set(cases.flatMap((item) => item.confirmedTags))
  ]);
  const sharedProjectId = cases.every((item) => item.projectId === first?.projectId)
    ? first?.projectId
    : undefined;
  const visibleIssues = useMemo(() => {
    const value = query.trim().toLowerCase();
    return issues.filter(
      (issue) =>
        issue.projectId === sharedProjectId &&
        (!value ||
          issue.displayId.toLowerCase().includes(value) ||
          issue.title.toLowerCase().includes(value))
    );
  }, [issues, query, sharedProjectId]);

  function complete() {
    onOpenChange(false);
    onComplete?.();
  }

  function submitLink() {
    if (!selectedIssueId) return;
    linkCasesToIssue(caseIds, selectedIssueId);
    complete();
  }

  function submitCreate() {
    if (!title.trim() || !projectId || !caseIds.length || !sharedProjectId) return;
    const id = createIssueFromCases({
      feedbackIds: caseIds,
      title,
      projectId,
      classification: 'Pending',
      priority: 'P2',
      tags: selectedTags
    });
    if (id) complete();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>{mode === 'link' ? '关联已有 Issue' : '创建新 Issue'}</SheetTitle>
          <SheetDescription>
            {caseIds.length === 1
              ? '将当前 Case 作为 Issue 的原始证据。'
              : `将所选 ${caseIds.length} 个 Case 归并到同一个 Issue。`}
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          {mode === 'link' ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='issue-search'>搜索 Issue</FieldLabel>
                <Input
                  id='issue-search'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder='Issue ID 或标题'
                />
              </Field>
              <Field>
                <FieldLabel>选择目标 Issue</FieldLabel>
                {!sharedProjectId ? (
                  <FieldDescription>
                    所选 Case 属于不同 App，不能关联到同一 Issue。
                  </FieldDescription>
                ) : null}
                <div className='flex flex-col gap-2'>
                  {visibleIssues.map((issue) => (
                    <Button
                      key={issue.id}
                      type='button'
                      variant={selectedIssueId === issue.id ? 'secondary' : 'outline'}
                      className='h-auto justify-start py-3 text-left'
                      onClick={() => setSelectedIssueId(issue.id)}
                    >
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate text-sm font-medium'>
                          {issue.displayId} · {issue.title}
                        </span>
                        <span className='mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                          <span>{issue.classification}</span>
                          <span>{issue.issueStatus}</span>
                          <span>{issue.priority}</span>
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='issue-title'>Issue 标题</FieldLabel>
                <Input
                  id='issue-title'
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <FieldDescription>
                  新 Issue 固定为待判断、P2、未分配；正式分诊在 Issues 工作台完成。
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>App</FieldLabel>
                <Input
                  value={
                    projects.find((project) => project.id === sharedProjectId)?.name ?? '多 App'
                  }
                  disabled
                />
              </Field>
              <Field>
                <FieldLabel>Tags</FieldLabel>
                <TagPicker
                  options={tags.map((tag) => tag.name)}
                  value={selectedTags}
                  onChange={setSelectedTags}
                />
              </Field>
              <Field>
                <FieldLabel>关联 Case</FieldLabel>
                <div className='flex flex-wrap gap-2'>
                  {cases.map((item) => (
                    <StatusBadge key={item.id} tone='neutral'>
                      {item.caseId}
                    </StatusBadge>
                  ))}
                </div>
              </Field>
            </FieldGroup>
          )}
        </div>
        <SheetFooter className='border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={mode === 'link' ? submitLink : submitCreate}
            disabled={
              mode === 'link'
                ? !selectedIssueId || !sharedProjectId
                : !title.trim() || !projectId || !sharedProjectId
            }
          >
            {mode === 'link' ? '确认关联' : '创建 Issue'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
