'use client';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { TagPicker } from '@/components/issue-center/tag-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { IssueBugDetail, Priority, Severity } from '@/lib/domain';
import { useDemoStore } from '@/store/demo-store';
import { readSheet } from 'read-excel-file/browser';
import { useMemo, useState } from 'react';

const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];
const severities: Severity[] = ['致命', '严重', '一般', '轻微'];
const headers = [
  'title',
  'reproduction',
  'module',
  'severity',
  'screenshot_note',
  'assignee',
  'priority'
];

type ImportRow = {
  row: number;
  title: string;
  reproduction: string[];
  module: string;
  severity: Severity;
  screenshotNote?: string;
  assignee: string;
  priority: Priority;
};

export function BugIssueSheet({
  open,
  onOpenChange,
  caseIds = [],
  issueId,
  initialProjectId,
  initialTitle,
  initialSummary,
  initialPriority,
  initialAssignee,
  initialTags,
  onComplete
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseIds?: string[];
  issueId?: string;
  initialProjectId?: string;
  initialTitle?: string;
  initialSummary?: string;
  initialPriority?: Priority;
  initialAssignee?: string;
  initialTags?: string[];
  onComplete?: () => void;
}) {
  const projects = useDemoStore((state) => state.projects);
  const allCases = useDemoStore((state) => state.feedback);
  const issues = useDemoStore((state) => state.clusters);
  const tags = useDemoStore((state) => state.tags);
  const createBugIssue = useDemoStore((state) => state.createBugIssue);
  const createImportedBugIssues = useDemoStore((state) => state.createImportedBugIssues);
  const convertIssueToBug = useDemoStore((state) => state.convertIssueToBug);
  const cases = useMemo(
    () => allCases.filter((item) => caseIds.includes(item.id)),
    [allCases, caseIds]
  );
  const issue = issues.find((item) => item.id === issueId);
  const [mode, setMode] = useState<'single' | 'excel'>('single');
  const [projectId, setProjectId] = useState(
    initialProjectId ?? issue?.projectId ?? cases[0]?.projectId ?? projects[0]?.id ?? ''
  );
  const [title, setTitle] = useState(
    initialTitle ??
      issue?.title ??
      (cases.length === 1
        ? cases[0].text.slice(0, 48)
        : cases.length
          ? `${cases.length} 条 Case 的共同 Bug`
          : '')
  );
  const [summary, setSummary] = useState(initialSummary ?? issue?.summary ?? '');
  const [module, setModule] = useState(issue?.aiAssessment.businessLine ?? '');
  const [severity, setSeverity] = useState<Severity>('一般');
  const [priority, setPriority] = useState<Priority>(initialPriority ?? issue?.priority ?? 'P1');
  const initialOwner = initialAssignee ?? issue?.owner ?? '';
  const [assignee, setAssignee] = useState(initialOwner === '未分配' ? '' : initialOwner);
  const [reproduction, setReproduction] = useState(
    cases.length ? ['根据关联 Case 复现并补充完整步骤'] : []
  );
  const [screenshotNote, setScreenshotNote] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialTags ?? [...new Set(cases.flatMap((item) => item.confirmedTags))]
  );
  const [error, setError] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const sheetTitle = issue
    ? '确认关联 Issue 为 Bug'
    : caseIds.length
      ? `从 ${caseIds.length} 个 Case 创建 Bug`
      : '提 Bug';

  function details(): IssueBugDetail {
    return {
      reproduction: reproduction.map((item) => item.trim()).filter(Boolean),
      module: module.trim(),
      severity,
      screenshotNote: screenshotNote.trim() || undefined,
      assignee: assignee.trim(),
      status: assignee.trim() ? '已指派' : '待分诊'
    };
  }

  function finish() {
    setError('');
    onOpenChange(false);
    onComplete?.();
  }

  function submit() {
    const bugDetail = details();
    if (
      !title.trim() ||
      !projectId ||
      !bugDetail.module ||
      !bugDetail.assignee ||
      !bugDetail.screenshotNote ||
      !bugDetail.reproduction.length
    ) {
      setError('请填写标题、App、所属模块、Assignee、复现步骤和截图说明。');
      return;
    }
    if (issue) {
      convertIssueToBug(issue.id, bugDetail);
      finish();
      return;
    }
    const id = createBugIssue({
      projectId,
      title,
      summary,
      priority,
      tags: selectedTags,
      feedbackIds: caseIds,
      bugDetail
    });
    if (id) finish();
  }

  async function parseExcel(file?: File) {
    if (!file) return;
    setFileName(file.name);
    try {
      const values = await readSheet(file);
      const actual = (values[0] ?? []).map((cell) => String(cell ?? '').trim());
      const missing = headers.filter((header) => !actual.includes(header));
      if (missing.length) {
        setRows([]);
        setRowErrors([`表头缺少字段：${missing.join('、')}`]);
        return;
      }
      const nextRows: ImportRow[] = [];
      const nextErrors: string[] = [];
      values.slice(1).forEach((cells, index) => {
        const row = index + 2;
        const get = (name: string) => String(cells[actual.indexOf(name)] ?? '').trim();
        const itemSeverity = get('severity') as Severity;
        const itemPriority = (get('priority') || 'P2') as Priority;
        const item = {
          row,
          title: get('title'),
          reproduction: get('reproduction')
            .split(/\r?\n|\s*>\s*/)
            .filter(Boolean),
          module: get('module'),
          severity: itemSeverity,
          screenshotNote: get('screenshot_note') || undefined,
          assignee: get('assignee'),
          priority: itemPriority
        };
        const errors: string[] = [];
        if (!item.title) errors.push('title 为空');
        if (!item.reproduction.length) errors.push('reproduction 为空');
        if (!item.module) errors.push('module 为空');
        if (!severities.includes(item.severity)) errors.push('severity 不支持');
        if (!priorities.includes(item.priority)) errors.push('priority 不支持');
        if (errors.length) nextErrors.push(`第 ${row} 行：${errors.join('；')}`);
        else nextRows.push(item);
      });
      setRows(nextRows);
      setRowErrors(nextErrors);
    } catch {
      setRows([]);
      setRowErrors(['文件解析失败，请确认使用 .xlsx 固定模板。']);
    }
  }

  function importRows() {
    const ids = createImportedBugIssues(
      rows.map((row) => ({
        projectId,
        title: row.title,
        summary: '通过 Excel 导入的 Bug Issue。',
        priority: row.priority,
        tags: [],
        bugDetail: {
          reproduction: row.reproduction,
          module: row.module,
          severity: row.severity,
          screenshotNote: row.screenshotNote,
          assignee: row.assignee,
          status: row.assignee ? '已指派' : '待分诊'
        }
      }))
    );
    if (ids.length) finish();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>
            Bug 使用 Issue 编号和统一问题池，不创建独立 Bug 实体。
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          {!issue && !caseIds.length ? (
            <Field className='mb-4'>
              <FieldLabel>提交方式</FieldLabel>
              <ToggleGroup
                variant='outline'
                value={[mode]}
                onValueChange={(value) => setMode((value[0] as 'single' | 'excel') ?? mode)}
              >
                <ToggleGroupItem value='single'>单条录入</ToggleGroupItem>
                <ToggleGroupItem value='excel'>Excel 导入</ToggleGroupItem>
              </ToggleGroup>
            </Field>
          ) : null}
          {mode === 'excel' && !issue && !caseIds.length ? (
            <FieldGroup>
              <Field>
                <FieldLabel>App</FieldLabel>
                <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />
              </Field>
              <Field>
                <FieldLabel htmlFor='bug-excel'>选择 Excel</FieldLabel>
                <Input
                  id='bug-excel'
                  type='file'
                  accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  onChange={(event) => void parseExcel(event.target.files?.[0])}
                />
                <FieldDescription>
                  固定字段：title、reproduction、module、severity、screenshot_note、assignee、priority。
                </FieldDescription>
              </Field>
              {fileName ? (
                <div className='flex flex-col gap-3'>
                  <div className='bg-muted/40 p-4 text-sm'>
                    <p className='font-medium'>{fileName}</p>
                    <p className='mt-1 text-muted-foreground'>
                      检测到 {rows.length + rowErrors.length} 条 · 可导入 {rows.length} · 异常{' '}
                      {rowErrors.length}
                    </p>
                  </div>
                  {rowErrors.length ? (
                    <Alert variant='destructive'>
                      <AlertTitle>异常行</AlertTitle>
                      <AlertDescription>{rowErrors.join('；')}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor='bug-title'>标题</FieldLabel>
                <Input
                  id='bug-title'
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(error)}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
              <Field>
                <FieldLabel htmlFor='bug-summary'>问题描述 / Summary</FieldLabel>
                <Textarea
                  id='bug-summary'
                  rows={4}
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                />
              </Field>
              <FieldGroup className='sm:grid sm:grid-cols-2'>
                <Field>
                  <FieldLabel>App</FieldLabel>
                  {caseIds.length || issue ? (
                    <Input
                      value={projects.find((project) => project.id === projectId)?.name ?? ''}
                      disabled
                    />
                  ) : (
                    <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} />
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor='bug-module'>所属模块</FieldLabel>
                  <Input
                    id='bug-module'
                    value={module}
                    onChange={(event) => setModule(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Severity</FieldLabel>
                  <ValueSelect
                    values={severities}
                    value={severity}
                    onChange={(value) => setSeverity(value as Severity)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <ValueSelect
                    values={priorities}
                    value={priority}
                    onChange={(value) => setPriority(value as Priority)}
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor='bug-assignee'>Assignee</FieldLabel>
                <Input
                  id='bug-assignee'
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  placeholder='留空则进入待分诊'
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='bug-reproduction'>复现步骤</FieldLabel>
                <Textarea
                  id='bug-reproduction'
                  rows={6}
                  value={reproduction.join('\n')}
                  onChange={(event) => setReproduction(event.target.value.split('\n'))}
                  placeholder='每行一个步骤'
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='bug-screenshot'>截图说明</FieldLabel>
                <Textarea
                  id='bug-screenshot'
                  rows={3}
                  value={screenshotNote}
                  onChange={(event) => setScreenshotNote(event.target.value)}
                />
              </Field>
              {!issue ? (
                <Field>
                  <FieldLabel>Tags</FieldLabel>
                  <TagPicker
                    options={tags.map((tag) => tag.name)}
                    value={selectedTags}
                    onChange={setSelectedTags}
                  />
                </Field>
              ) : null}
              {caseIds.length ? (
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
              ) : null}
            </FieldGroup>
          )}
        </div>
        <SheetFooter className='border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          {mode === 'excel' && !issue && !caseIds.length ? (
            <Button disabled={!rows.length || !projectId} onClick={importRows}>
              导入 {rows.length} 条 Bug
            </Button>
          ) : (
            <Button onClick={submit}>{issue ? '确认为 Bug' : '创建 Bug'}</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ProjectSelect({
  projects,
  value,
  onChange
}: {
  projects: Array<{ id: string; name: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? value)}>
      <SelectTrigger className='w-full'>
        <SelectValue>{projects.find((item) => item.id === value)?.name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {projects.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ValueSelect({
  values,
  value,
  onChange
}: {
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? value)}>
      <SelectTrigger className='w-full'>
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {values.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
