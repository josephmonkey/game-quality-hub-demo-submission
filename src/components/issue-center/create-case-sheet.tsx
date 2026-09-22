'use client';

import { Icons } from '@/components/icons';
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
import type { CaseAttachment, SourceChannel } from '@/lib/domain';
import { demoToday } from '@/lib/demo-time';
import { useDemoStore } from '@/store/demo-store';
import Image from 'next/image';
import { readSheet } from 'read-excel-file/browser';
import { useState } from 'react';

const channels: SourceChannel[] = [
  'Reddit',
  'Discord',
  'X',
  'YouTube',
  'Telegram',
  'Internal',
  'Other'
];
const expectedHeaders = [
  'app',
  'feedback_text',
  'source_channel',
  'feedback_date',
  'original_url',
  'tags'
];
type Mode = 'single' | 'batch' | 'excel';
type PostCreateAction = 'case' | 'link' | 'create';
type ExcelRow = {
  row: number;
  projectId: string;
  text: string;
  channel: SourceChannel;
  occurredAt: string;
  originalUrl?: string;
  initialTags: string[];
};

function formatExcelDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00`))
    ? text
    : '';
}

export function CreateCaseSheet({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const projects = useDemoStore((state) => state.projects);
  const tags = useDemoStore((state) => state.tags);
  const issues = useDemoStore((state) => state.clusters);
  const createCases = useDemoStore((state) => state.createCases);
  const createImportedCases = useDemoStore((state) => state.createImportedCases);
  const linkCasesToIssue = useDemoStore((state) => state.linkCasesToIssue);
  const createIssueFromCases = useDemoStore((state) => state.createIssueFromCases);
  const [mode, setMode] = useState<Mode>('single');
  const [projectId, setProjectId] = useState('project-aurora');
  const [channel, setChannel] = useState<SourceChannel>('Reddit');
  const [occurredAt, setOccurredAt] = useState(demoToday());
  const [text, setText] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [initialTags, setInitialTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [excelErrors, setExcelErrors] = useState<string[]>([]);
  const [excelName, setExcelName] = useState('');
  const [error, setError] = useState('');
  const [createdCount, setCreatedCount] = useState(0);
  const [postCreateAction, setPostCreateAction] = useState<PostCreateAction>('case');
  const [targetIssueId, setTargetIssueId] = useState('');
  const [newIssueTitle, setNewIssueTitle] = useState('');

  const excelProjectIds = [...new Set(excelRows.map((row) => row.projectId))];
  const actionProjectId = mode === 'excel' ? excelProjectIds[0] : projectId;
  const canHandleIssue = mode !== 'excel' || excelProjectIds.length === 1;
  const availableIssues = issues.filter((issue) => issue.projectId === actionProjectId);

  function savedAttachments(): CaseAttachment[] {
    return attachments.map(({ file }, index) => ({
      id: `attachment-${Date.now()}-${index}`,
      name: file.name,
      type: 'image',
      url: '/platform-logo.png',
      isMock: true
    }));
  }
  function clearForm() {
    attachments.forEach((item) => URL.revokeObjectURL(item.preview));
    setAttachments([]);
    setText('');
    setOriginalUrl('');
    setInitialTags([]);
    setPostCreateAction('case');
    setTargetIssueId('');
    setNewIssueTitle('');
  }
  function handleCreatedCases(ids: string[], fallbackTitle: string, createdProjectId: string) {
    if (postCreateAction === 'link' && targetIssueId) {
      linkCasesToIssue(ids, targetIssueId);
    }
    if (postCreateAction === 'create') {
      createIssueFromCases({
        feedbackIds: ids,
        title: newIssueTitle.trim() || fallbackTitle,
        projectId: createdProjectId,
        classification: 'Pending',
        priority: 'P2',
        tags: initialTags
      });
    }
  }
  function submit() {
    const texts = mode === 'batch' ? text.split('\n').filter((line) => line.trim()) : [text.trim()];
    if (!projectId || !channel || !occurredAt || texts.length === 0 || !texts[0]) {
      setError('请填写 App、来源渠道、日期和反馈文本。');
      return;
    }
    const ids = createCases({
      projectId,
      channel,
      occurredAt,
      texts,
      intakeMethod: mode === 'single' ? 'manual_single' : 'manual_batch',
      originalUrl: mode === 'single' ? originalUrl : undefined,
      initialTags,
      attachments: mode === 'single' ? savedAttachments() : []
    });
    handleCreatedCases(
      ids,
      mode === 'batch' ? `${ids.length} 条 Case 的共同问题` : texts[0].slice(0, 48),
      projectId
    );
    setError('');
    setCreatedCount(ids.length);
    clearForm();
  }
  function addAttachments(files: FileList | null) {
    if (!files) return;
    const validTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const valid = [...files].filter((file) => validTypes.has(file.type));
    if (valid.length !== files.length) setError('附件仅支持 jpg、jpeg、png 和 webp。');
    setAttachments((current) => [
      ...current,
      ...valid
        .slice(0, Math.max(0, 5 - current.length))
        .map((file) => ({ file, preview: URL.createObjectURL(file) }))
    ]);
  }
  function removeAttachment(index: number) {
    setAttachments((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }
  async function parseExcel(file?: File) {
    if (!file) return;
    setExcelName(file.name);
    setError('');
    try {
      const rows = await readSheet(file);
      const headers = (rows[0] ?? []).map((cell) => String(cell ?? '').trim());
      const missing = expectedHeaders.filter((header) => !headers.includes(header));
      if (missing.length) {
        setExcelRows([]);
        setExcelErrors([`表头缺少字段：${missing.join('、')}`]);
        return;
      }
      const validRows: ExcelRow[] = [];
      const errors: string[] = [];
      rows.slice(1).forEach((cells, index) => {
        const row = index + 2;
        const get = (name: string) => cells[headers.indexOf(name)];
        const app = String(get('app') ?? '').trim();
        const project = projects.find((item) => item.name === app);
        const feedbackText = String(get('feedback_text') ?? '').trim();
        const source = String(get('source_channel') ?? '').trim() as SourceChannel;
        const date = formatExcelDate(get('feedback_date'));
        const rowErrors: string[] = [];
        if (!project) rowErrors.push('app 不存在');
        if (!feedbackText) rowErrors.push('feedback_text 为空');
        if (!channels.includes(source)) rowErrors.push('source_channel 不支持');
        if (!date) rowErrors.push('feedback_date 格式错误');
        if (rowErrors.length) {
          errors.push(`第 ${row} 行：${rowErrors.join('；')}`);
          return;
        }
        validRows.push({
          row,
          projectId: project!.id,
          text: feedbackText,
          channel: source,
          occurredAt: date,
          originalUrl: String(get('original_url') ?? '').trim() || undefined,
          initialTags: String(get('tags') ?? '')
            .split(/[,，]/)
            .map((value) => value.trim())
            .filter(Boolean)
        });
      });
      setExcelRows(validRows);
      setExcelErrors(errors);
      if (new Set(validRows.map((row) => row.projectId)).size > 1) {
        setPostCreateAction('case');
        setTargetIssueId('');
      }
    } catch {
      setExcelRows([]);
      setExcelErrors(['文件解析失败，请确认使用 .xlsx 固定模板。']);
    }
  }
  function importValidRows() {
    const ids = createImportedCases(excelRows);
    if (excelProjectIds.length === 1) {
      handleCreatedCases(ids, `${ids.length} 条导入 Case 的共同问题`, excelProjectIds[0]);
    }
    setCreatedCount(ids.length);
    setExcelRows([]);
    setExcelErrors([]);
    setExcelName('');
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) clearForm();
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>提 Case</SheetTitle>
          <SheetDescription>单条、批量粘贴或 Excel 导入均进入同一 Case Pool。</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <FieldGroup>
            <Field>
              <FieldLabel>提交方式</FieldLabel>
              <ToggleGroup
                variant='outline'
                value={[mode]}
                onValueChange={(value) => setMode((value[0] as Mode) ?? mode)}
              >
                <ToggleGroupItem value='single'>单条录入</ToggleGroupItem>
                <ToggleGroupItem value='batch'>批量粘贴</ToggleGroupItem>
                <ToggleGroupItem value='excel'>Excel 导入</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            {mode === 'excel' ? (
              <>
                <Field>
                  <FieldLabel htmlFor='excel-file'>选择 Excel</FieldLabel>
                  <Input
                    id='excel-file'
                    type='file'
                    accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    onChange={(event) => void parseExcel(event.target.files?.[0])}
                  />
                  <FieldDescription>
                    固定字段：app、feedback_text、source_channel、feedback_date、original_url、tags；不解析图片。
                  </FieldDescription>
                </Field>
                {excelName ? (
                  <div className='flex flex-col gap-3'>
                    <div className='bg-muted/40 p-4 text-sm'>
                      <p className='font-medium'>{excelName}</p>
                      <p className='mt-1 text-muted-foreground'>
                        检测到 {excelRows.length + excelErrors.length} 条数据 · 可导入{' '}
                        {excelRows.length} · 异常 {excelErrors.length}
                      </p>
                    </div>
                    {excelErrors.length ? (
                      <Alert variant='destructive'>
                        <AlertTitle>异常行</AlertTitle>
                        <AlertDescription>
                          <ul className='mt-2 flex list-disc flex-col gap-1 pl-4'>
                            {excelErrors.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    {excelRows.length ? (
                      <div className='flex max-h-48 flex-col gap-2 overflow-y-auto text-sm'>
                        {excelRows.map((row) => (
                          <p key={row.row} className='truncate'>
                            第 {row.row} 行 · {row.text}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <Field>
                    <FieldLabel>App</FieldLabel>
                    <Select
                      value={projectId}
                      onValueChange={(value) => {
                        setProjectId(value ?? projectId);
                        setTargetIssueId('');
                      }}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue>
                          {projects.find((project) => project.id === projectId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
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
                    <FieldLabel>来源渠道</FieldLabel>
                    <Select
                      value={channel}
                      onValueChange={(value) => setChannel((value as SourceChannel) ?? channel)}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue>{channel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {channels.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor='case-date'>反馈日期</FieldLabel>
                  <Input
                    id='case-date'
                    type='date'
                    value={occurredAt}
                    onChange={(event) => setOccurredAt(event.target.value)}
                  />
                </Field>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor='case-text'>反馈文本</FieldLabel>
                  <Textarea
                    id='case-text'
                    rows={mode === 'batch' ? 9 : 5}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    aria-invalid={Boolean(error)}
                    placeholder={mode === 'batch' ? '每行一条 Case' : '输入玩家反馈原文'}
                  />
                  <FieldDescription>
                    {mode === 'batch'
                      ? '空行会被忽略，每个非空行生成独立 Case。'
                      : '提交后会生成模拟 AI 分类和标签建议。'}
                  </FieldDescription>
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
                {mode === 'single' ? (
                  <>
                    <Field>
                      <FieldLabel htmlFor='case-url'>原始链接（可选）</FieldLabel>
                      <Input
                        id='case-url'
                        type='url'
                        value={originalUrl}
                        onChange={(event) => setOriginalUrl(event.target.value)}
                        placeholder='https://...'
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor='case-attachments'>附件</FieldLabel>
                      <Input
                        id='case-attachments'
                        type='file'
                        accept='image/jpeg,image/png,image/webp'
                        multiple
                        onChange={(event) => addAttachments(event.target.files)}
                        disabled={attachments.length >= 5}
                      />
                      <FieldDescription>
                        最多 5 张；仅本次创建时本地预览，保存后使用 Demo 占位图记录，不写入 Base64。
                      </FieldDescription>
                      {attachments.length ? (
                        <div className='grid grid-cols-3 gap-3 sm:grid-cols-5'>
                          {attachments.map((item, index) => (
                            <button
                              key={item.preview}
                              type='button'
                              className='group text-left'
                              onClick={() => removeAttachment(index)}
                              aria-label={`移除 ${item.file.name}`}
                            >
                              <Image
                                src={item.preview}
                                alt=''
                                width={96}
                                height={96}
                                unoptimized
                                className='aspect-square w-full rounded-md object-cover'
                              />
                              <span className='mt-1 block truncate text-xs text-muted-foreground group-hover:text-foreground'>
                                {item.file.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </Field>
                  </>
                ) : null}
                <Field>
                  <FieldLabel>初始标签（可选）</FieldLabel>
                  <TagPicker
                    options={tags.map((tag) => tag.name)}
                    value={initialTags}
                    onChange={setInitialTags}
                  />
                </Field>
              </>
            )}
            {mode !== 'excel' || excelRows.length > 0 ? (
              <Field>
                <FieldLabel>创建后处理</FieldLabel>
                <ToggleGroup
                  variant='outline'
                  value={[postCreateAction]}
                  onValueChange={(value) =>
                    setPostCreateAction((value[0] as PostCreateAction) ?? postCreateAction)
                  }
                >
                  <ToggleGroupItem value='case'>仅创建 Case</ToggleGroupItem>
                  <ToggleGroupItem value='link' disabled={!canHandleIssue}>
                    关联已有 Issue
                  </ToggleGroupItem>
                  <ToggleGroupItem value='create' disabled={!canHandleIssue}>
                    创建新 Issue
                  </ToggleGroupItem>
                </ToggleGroup>
                {mode === 'excel' && !canHandleIssue ? (
                  <FieldDescription>有效数据包含多个 App，本次只能导入 Case。</FieldDescription>
                ) : null}
              </Field>
            ) : null}
            {postCreateAction === 'link' && canHandleIssue ? (
              <Field>
                <FieldLabel>目标 Issue</FieldLabel>
                <Select
                  value={targetIssueId}
                  onValueChange={(value) => setTargetIssueId(value ?? targetIssueId)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue>
                      {availableIssues.find((issue) => issue.id === targetIssueId)?.displayId ??
                        '选择同 App Issue'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableIssues.map((issue) => (
                        <SelectItem key={issue.id} value={issue.id}>
                          {issue.displayId} · {issue.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>只展示与本次 Case 相同 App 的 Issue。</FieldDescription>
              </Field>
            ) : null}
            {postCreateAction === 'create' && canHandleIssue ? (
              <Field>
                <FieldLabel htmlFor='new-issue-title'>新 Issue 标题（可选）</FieldLabel>
                <Input
                  id='new-issue-title'
                  value={newIssueTitle}
                  onChange={(event) => setNewIssueTitle(event.target.value)}
                  placeholder='留空则根据 Case 自动生成'
                />
                <FieldDescription>
                  将创建 Pending / P2 / 未分配 Issue，正式分诊在 Issues 工作台完成。
                </FieldDescription>
              </Field>
            ) : null}
            {createdCount > 0 ? (
              <Alert>
                <Icons.circleCheck />
                <AlertTitle>已创建 {createdCount} 条 Case</AlertTitle>
                <AlertDescription>
                  新 Case 已进入统一 Case Pool，可继续人工判断和归并。
                </AlertDescription>
              </Alert>
            ) : null}
          </FieldGroup>
        </div>
        <SheetFooter className='border-t'>
          {mode === 'excel' ? (
            <>
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={importValidRows}
                disabled={
                  !excelRows.length ||
                  (postCreateAction === 'link' && !targetIssueId) ||
                  (!canHandleIssue && postCreateAction !== 'case')
                }
              >
                仅导入有效数据
              </Button>
            </>
          ) : (
            <>
              <Button onClick={submit} disabled={postCreateAction === 'link' && !targetIssueId}>
                <Icons.plus data-icon='inline-start' />
                {mode === 'batch' ? '批量创建' : '创建 Case'}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
