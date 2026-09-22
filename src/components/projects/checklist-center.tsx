'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CheckInstance, CheckScenario, CheckTemplate, CheckTemplateGroup } from '@/lib/domain';
import { useDemoStore } from '@/store/demo-store';
import { Icons } from '@/components/icons';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const scenarios: CheckScenario[] = [
  '客户端常规版本',
  '客户端 Hotfix',
  '配置 / 数值更新',
  '活动上线',
  '资源热更',
  'SDK / 渠道版本'
];

function getStats(instance: CheckInstance) {
  const completed = instance.items.filter((item) => item.status === '完成').length;
  const skipped = instance.items.filter((item) => item.status === '跳过').length;
  const pending = instance.items.length - completed - skipped;
  const handled = completed + skipped;
  const criticalSkipped = instance.items.filter(
    (item) => item.isCritical && item.status === '跳过'
  ).length;
  return {
    completed,
    skipped,
    pending,
    handled,
    criticalSkipped,
    total: instance.items.length,
    rate: instance.items.length ? Math.round((handled / instance.items.length) * 100) : 0
  };
}

function getCheckStatus(instance: CheckInstance) {
  const stats = getStats(instance);
  if (stats.pending) return '检查中';
  return stats.skipped ? '检查完成，有跳过项' : '检查完成，无跳过项';
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function exportInstance(
  instance: CheckInstance,
  versionName: string,
  projectName: string,
  format: 'md' | 'csv'
) {
  const stats = getStats(instance);
  const status = getCheckStatus(instance);
  if (format === 'csv') {
    const header = [
      '项目',
      '版本',
      '提测对象',
      '场景',
      '模板',
      '创建人',
      '总项数',
      '完成数',
      '跳过数',
      '待处理数',
      '关键项跳过数',
      '检查状态',
      '分组',
      '检查项',
      '是否关键项',
      '来源',
      '项状态',
      '跳过原因',
      '处理人',
      '处理时间'
    ];
    const rows = instance.items.map((item) => [
      projectName,
      versionName,
      instance.target,
      instance.scenario,
      instance.templateName,
      instance.createdBy,
      String(stats.total),
      String(stats.completed),
      String(stats.skipped),
      String(stats.pending),
      String(stats.criticalSkipped),
      status,
      item.groupName,
      item.title,
      item.isCritical ? '是' : '否',
      item.source,
      item.status,
      item.skipReason ?? '',
      item.handledBy ?? '',
      item.handledAt ?? ''
    ]);
    const csv = `\uFEFF${[header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
      .join('\n')}`;
    download(`checklist-${versionName}.csv`, csv, 'text/csv;charset=utf-8');
    return;
  }
  const groups = [...new Set(instance.items.map((item) => item.groupName))];
  const body = groups
    .map(
      (group) =>
        `## ${group}\n\n${instance.items
          .filter((item) => item.groupName === group)
          .map((item) => {
            const mark = item.status === '完成' ? '✅' : item.status === '跳过' ? '⏭' : '⬜';
            const metadata = `关键项：${item.isCritical ? '是' : '否'} · 来源：${item.source} · 状态：${item.status}`;
            const handling = item.handledBy
              ? `\n\n处理人：${item.handledBy}\n处理时间：${item.handledAt ?? ''}`
              : '';
            return `${mark} ${item.title}\n\n${metadata}${item.skipReason ? `\n\n跳过原因：${item.skipReason}` : ''}${handling}`;
          })
          .join('\n\n')}`
    )
    .join('\n\n');
  const markdown = `# ${versionName} — 提测检查记录\n\n项目：${projectName}\n版本：${versionName}\n提测对象：${instance.target}\n场景：${instance.scenario}\n模板：${instance.templateName}\n创建人：${instance.createdBy}\n创建时间：${instance.createdAt}\n最近更新：${instance.updatedAt}\n版本更新说明：${instance.versionNotes}\n\n## 检查概览\n\n当前检查状态：${status}\n总项数：${stats.total}\n完成：${stats.completed}\n跳过：${stats.skipped}\n待处理：${stats.pending}\n关键项跳过：${stats.criticalSkipped}\n\n${body}\n`;
  download(`checklist-${versionName}.md`, markdown, 'text/markdown;charset=utf-8');
}

function CreateInstanceSheet({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const projects = useDemoStore((state) => state.projects);
  const versions = useDemoStore((state) => state.versions);
  const templates = useDemoStore((state) => state.checkTemplates);
  const createCheckInstance = useDemoStore((state) => state.createCheckInstance);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const projectVersions = versions.filter((version) => version.projectId === projectId);
  const [versionId, setVersionId] = useState(projectVersions[0]?.id ?? '');
  const [scenario, setScenario] = useState<CheckScenario>('客户端常规版本');
  const matchingTemplates = templates.filter((template) => template.scenario === scenario);
  const [templateId, setTemplateId] = useState('check-template-client');
  const [target, setTarget] = useState('2.7.0+101');
  const [versionNotes, setVersionNotes] = useState(
    '新增快速组队和队伍招募，修改匹配配置，新增 GM 调试入口。'
  );
  const [error, setError] = useState('');

  function submit() {
    const resolvedTemplateId = matchingTemplates.some((item) => item.id === templateId)
      ? templateId
      : matchingTemplates[0]?.id;
    if (!projectId || !versionId || !resolvedTemplateId || !target.trim()) {
      setError('请选择有关联版本的场景与模板，并填写提测对象。');
      return;
    }
    const id = createCheckInstance({
      projectId,
      versionId,
      scenario,
      templateId: resolvedTemplateId,
      target,
      versionNotes
    });
    if (!id) {
      setError('创建失败，请重新选择模板。');
      return;
    }
    setError('');
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>开始提测检查</SheetTitle>
          <SheetDescription>
            从场景化模板生成独立快照，并用模拟 AI 分析本次版本差异。
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <FieldGroup>
            <Field>
              <FieldLabel>项目</FieldLabel>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  const next = value ?? projectId;
                  setProjectId(next);
                  setVersionId(versions.find((item) => item.projectId === next)?.id ?? '');
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{projects.find((item) => item.id === projectId)?.name}</SelectValue>
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
              <FieldLabel>版本</FieldLabel>
              <Select value={versionId} onValueChange={(value) => setVersionId(value ?? versionId)}>
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {projectVersions.find((item) => item.id === versionId)?.name ?? '请选择版本'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projectVersions.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={!target.trim()}>
              <FieldLabel htmlFor='check-target'>提测对象</FieldLabel>
              <Input
                id='check-target'
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder='例如：Android Release 2.8.0 build 126'
                aria-invalid={!target.trim()}
              />
              <FieldDescription>明确本次检查的 Build、包或资源版本。</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>提测场景</FieldLabel>
              <Select
                value={scenario}
                onValueChange={(value) => {
                  const next = (value as CheckScenario | null) ?? scenario;
                  setScenario(next);
                  setTemplateId(templates.find((item) => item.scenario === next)?.id ?? '');
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{scenario}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {scenarios.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>检查模板</FieldLabel>
              <Select
                value={templateId}
                onValueChange={(value) => setTemplateId(value ?? templateId)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {matchingTemplates.find((item) => item.id === templateId)?.name ??
                      '当前场景暂无模板'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {matchingTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                创建后保存模板内容快照，后续修改模板不会改写本次记录。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor='version-notes'>版本更新说明</FieldLabel>
              <Textarea
                id='version-notes'
                value={versionNotes}
                onChange={(event) => setVersionNotes(event.target.value)}
                rows={5}
              />
              <FieldDescription>
                模拟 Checklist Advisor 只给出建议，不会自动完成检查项。
              </FieldDescription>
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
        </div>
        <SheetFooter className='border-t'>
          <Button onClick={submit}>
            <Icons.plus data-icon='inline-start' />
            创建检查实例
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TemplateEditorSheet({
  template,
  open,
  onOpenChange
}: {
  template: CheckTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const saveCheckTemplate = useDemoStore((state) => state.saveCheckTemplate);
  const [name, setName] = useState(template?.name ?? '');
  const [scenario, setScenario] = useState<CheckScenario>(template?.scenario ?? '客户端常规版本');
  const [description, setDescription] = useState(template?.description ?? '');
  const [groups, setGroups] = useState<CheckTemplateGroup[]>(() =>
    structuredClone(
      template?.groups ?? [
        {
          id: 'group-new-basic',
          name: '基础检查',
          items: [{ id: 'item-new-basic', title: '', isCritical: false }]
        }
      ]
    )
  );
  const [nameError, setNameError] = useState('');
  const [groupsError, setGroupsError] = useState('');

  function addGroup() {
    setGroups((current) => [...current, { id: `group-${Date.now()}`, name: '新分组', items: [] }]);
  }

  function save() {
    const nextNameError = name.trim() ? '' : '请填写模板名称。';
    const nextGroupsError =
      groups.length &&
      groups.every((group) => group.items.length && group.items.every((item) => item.title.trim()))
        ? ''
        : '请确保至少有一个分组，并且每个分组至少有一个有效检查项。';
    setNameError(nextNameError);
    setGroupsError(nextGroupsError);
    if (nextNameError || nextGroupsError) {
      return;
    }
    saveCheckTemplate({
      id: template?.id,
      name: name.trim(),
      scenario,
      description: description.trim(),
      groups
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>{template ? '编辑检查模板' : '创建检查模板'}</SheetTitle>
          <SheetDescription>模板只影响未来实例；历史实例保存创建时的独立快照。</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor='template-name'>模板名称</FieldLabel>
              <Input
                id='template-name'
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError('');
                }}
                aria-invalid={Boolean(nameError)}
              />
              {nameError ? <FieldError>{nameError}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel>适用场景</FieldLabel>
              <Select
                value={scenario}
                onValueChange={(value) => setScenario((value as CheckScenario | null) ?? scenario)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{scenario}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {scenarios.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor='template-description'>说明</FieldLabel>
              <Textarea
                id='template-description'
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Separator />
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-sm font-medium'>检查分组</p>
                <p className='text-xs text-muted-foreground'>按执行语境组织检查项。</p>
              </div>
              <Button variant='outline' size='sm' onClick={addGroup}>
                <Icons.plus data-icon='inline-start' />
                添加分组
              </Button>
            </div>
            {groupsError ? <FieldError>{groupsError}</FieldError> : null}
            {groups.map((group, groupIndex) => (
              <Field key={group.id} className='bg-muted/40 p-4'>
                <div className='flex items-center gap-2'>
                  <Input
                    aria-label='分组名称'
                    value={group.name}
                    onChange={(event) =>
                      setGroups((current) =>
                        current.map((item, index) =>
                          index === groupIndex ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                  />
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label='删除分组'
                    onClick={() =>
                      setGroups((current) => current.filter((_, index) => index !== groupIndex))
                    }
                  >
                    <Icons.trash />
                  </Button>
                </div>
                {group.items.map((item, itemIndex) => (
                  <div key={item.id} className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                    <div className='flex min-w-0 flex-1 items-center gap-2'>
                      <Input
                        aria-label='检查项'
                        value={item.title}
                        onChange={(event) =>
                          setGroups((current) =>
                            current.map((groupItem, index) =>
                              index === groupIndex
                                ? {
                                    ...groupItem,
                                    items: groupItem.items.map((checkItem, checkIndex) =>
                                      checkIndex === itemIndex
                                        ? { ...checkItem, title: event.target.value }
                                        : checkItem
                                    )
                                  }
                                : groupItem
                            )
                          )
                        }
                      />
                      <label
                        htmlFor={`critical-${group.id}-${item.id}`}
                        className='flex shrink-0 items-center gap-2 text-sm'
                      >
                        <Checkbox
                          id={`critical-${group.id}-${item.id}`}
                          checked={item.isCritical}
                          onCheckedChange={(checked) =>
                            setGroups((current) =>
                              current.map((groupItem, index) =>
                                index === groupIndex
                                  ? {
                                      ...groupItem,
                                      items: groupItem.items.map((checkItem, checkIndex) =>
                                        checkIndex === itemIndex
                                          ? { ...checkItem, isCritical: checked }
                                          : checkItem
                                      )
                                    }
                                  : groupItem
                              )
                            )
                          }
                        />
                        关键项
                      </label>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label='删除检查项'
                      onClick={() =>
                        setGroups((current) =>
                          current.map((groupItem, index) =>
                            index === groupIndex
                              ? {
                                  ...groupItem,
                                  items: groupItem.items.filter(
                                    (_, checkIndex) => checkIndex !== itemIndex
                                  )
                                }
                              : groupItem
                          )
                        )
                      }
                    >
                      <Icons.trash />
                    </Button>
                  </div>
                ))}
                <Button
                  variant='ghost'
                  size='sm'
                  className='self-start'
                  onClick={() =>
                    setGroups((current) =>
                      current.map((groupItem, index) =>
                        index === groupIndex
                          ? {
                              ...groupItem,
                              items: [
                                ...groupItem.items,
                                { id: `item-${Date.now()}`, title: '', isCritical: false }
                              ]
                            }
                          : groupItem
                      )
                    )
                  }
                >
                  <Icons.plus data-icon='inline-start' />
                  添加检查项
                </Button>
              </Field>
            ))}
          </FieldGroup>
        </div>
        <SheetFooter className='border-t'>
          <Button onClick={save}>保存模板</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function InstanceDetailSheet({
  instanceId,
  onClose
}: {
  instanceId: string | null;
  onClose: () => void;
}) {
  const instance = useDemoStore((state) =>
    state.checkInstances.find((item) => item.id === instanceId)
  );
  const projects = useDemoStore((state) => state.projects);
  const versions = useDemoStore((state) => state.versions);
  const updateCheckItem = useDemoStore((state) => state.updateCheckItem);
  const decideCheckSuggestion = useDemoStore((state) => state.decideCheckSuggestion);
  const addManualCheckItem = useDemoStore((state) => state.addManualCheckItem);
  const [skipItemId, setSkipItemId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [suggestionDrafts, setSuggestionDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  if (!instance)
    return (
      <Sheet open={false}>
        <SheetContent>
          <SheetTitle>提测检查</SheetTitle>
        </SheetContent>
      </Sheet>
    );
  const stats = getStats(instance);
  const checkStatus = getCheckStatus(instance);
  const groups = [...new Set(instance.items.map((item) => item.groupName))];
  const version = versions.find((item) => item.id === instance.versionId);
  const project = projects.find((item) => item.id === instance.projectId);

  return (
    <Sheet open={Boolean(instanceId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-2xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>{version?.name ?? '提测检查'}</SheetTitle>
          <SheetDescription>{instance.target}</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4'>
          <section className='flex flex-col gap-3' aria-labelledby='check-basic-info'>
            <p id='check-basic-info' className='text-sm font-medium'>
              基本信息
            </p>
            <dl className='grid gap-x-4 gap-y-3 bg-muted/40 p-4 text-sm sm:grid-cols-2'>
              {[
                ['项目', project?.name ?? instance.projectId],
                ['版本', version?.name ?? instance.versionId],
                ['提测对象', instance.target],
                ['提测场景', instance.scenario],
                ['模板', instance.templateName],
                ['创建人', instance.createdBy],
                ['创建时间', new Date(instance.createdAt).toLocaleString('zh-CN')],
                ['最近更新', new Date(instance.updatedAt).toLocaleString('zh-CN')]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className='text-xs text-muted-foreground'>{label}</dt>
                  <dd className='mt-1'>{value}</dd>
                </div>
              ))}
              <div className='sm:col-span-2'>
                <dt className='text-xs text-muted-foreground'>版本更新说明</dt>
                <dd className='mt-1 whitespace-pre-wrap'>{instance.versionNotes || '未填写'}</dd>
              </div>
            </dl>
          </section>
          <section className='flex flex-col gap-3' aria-labelledby='check-overview'>
            <p id='check-overview' className='text-sm font-medium'>
              检查概览
            </p>
            <div className='flex flex-col gap-3 bg-muted/40 p-4'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-sm font-medium'>已处理 {stats.rate}%</p>
                <p className='text-xs text-muted-foreground tabular-nums'>
                  {stats.completed} 完成 · {stats.skipped} 跳过 · {stats.pending} 待处理
                </p>
              </div>
              <Progress value={stats.rate} aria-label={`已处理 ${stats.rate}%`} />
              <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums'>
                <span>总检查项 {stats.total}</span>
                <span>关键项跳过 {stats.criticalSkipped}</span>
                <span>{checkStatus}</span>
              </div>
            </div>
            {stats.pending ? (
              <Alert>
                <Icons.alertTriangle />
                <AlertTitle>当前还有 {stats.pending} 项检查未处理</AlertTitle>
                <AlertDescription>
                  本次检查记录尚未完成；Checklist 不替代正式版本准入结论。
                </AlertDescription>
              </Alert>
            ) : stats.skipped ? (
              <Alert>
                <Icons.alertTriangle />
                <AlertTitle>检查完成，有跳过项</AlertTitle>
                <AlertDescription>
                  {stats.completed} 项完成 · {stats.skipped}{' '}
                  项跳过。检查已处理完，请继续关注跳过原因。
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Icons.circleCheck />
                <AlertTitle>检查完成，无跳过项</AlertTitle>
                <AlertDescription>
                  所有检查项均已完成。检查记录完成不代替版本质量判断。
                </AlertDescription>
              </Alert>
            )}
            {stats.criticalSkipped ? (
              <Alert variant='destructive'>
                <Icons.alertTriangle />
                <AlertTitle>{stats.criticalSkipped} 个关键检查项被跳过</AlertTitle>
                <AlertDescription>请核对跳过原因并评估本次提测风险。</AlertDescription>
              </Alert>
            ) : null}
          </section>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-2'>
              <Icons.robot className='size-4 text-muted-foreground' />
              <p className='text-sm font-medium'>模拟 AI 建议</p>
            </div>
            <p className='text-sm text-muted-foreground'>
              基于版本说明给出差异项，只有人工接受后才进入本次检查。
            </p>
            {instance.suggestions.filter((suggestion) => suggestion.status === '待确认').length ? (
              instance.suggestions
                .filter((suggestion) => suggestion.status === '待确认')
                .map((suggestion) => (
                  <div key={suggestion.id} className='flex flex-col gap-2 bg-muted/40 p-3'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <div className='min-w-0 flex-1'>
                        {suggestion.status === '待确认' ? (
                          <Input
                            aria-label='AI 建议检查项'
                            value={suggestionDrafts[suggestion.id] ?? suggestion.title}
                            onChange={(event) =>
                              setSuggestionDrafts((current) => ({
                                ...current,
                                [suggestion.id]: event.target.value
                              }))
                            }
                          />
                        ) : (
                          <p className='text-sm font-medium'>{suggestion.title}</p>
                        )}
                        <p className='text-xs text-muted-foreground'>{suggestion.reason}</p>
                      </div>
                      <StatusBadge tone={suggestion.status === '待确认' ? 'info' : 'neutral'}>
                        {suggestion.status}
                      </StatusBadge>
                    </div>
                    {suggestion.status === '待确认' ? (
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() =>
                            decideCheckSuggestion(
                              instance.id,
                              suggestion.id,
                              'accept',
                              suggestionDrafts[suggestion.id]
                            )
                          }
                        >
                          接受并加入
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() =>
                            decideCheckSuggestion(instance.id, suggestion.id, 'ignore')
                          }
                        >
                          忽略
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
            ) : (
              <p className='text-sm text-muted-foreground'>当前没有待确认的 AI 建议。</p>
            )}
          </div>
          <Separator />
          <p className='text-sm font-medium'>正式检查项</p>
          {groups.map((group) => (
            <div key={group} className='flex flex-col gap-1'>
              <p className='mb-1 text-sm font-medium'>{group}</p>
              {instance.items
                .filter((item) => item.groupName === group)
                .map((item, index) => (
                  <div key={item.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='flex flex-col gap-2 py-3'>
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='min-w-0 flex-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <p className='text-sm'>{item.title}</p>
                            {item.isCritical ? (
                              <StatusBadge tone='warning'>关键</StatusBadge>
                            ) : null}
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            {item.source}
                            {item.skipReason ? ` · 跳过原因：${item.skipReason}` : ''}
                          </p>
                        </div>
                        <StatusBadge
                          tone={
                            item.status === '完成'
                              ? 'success'
                              : item.status === '跳过'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {item.status}
                        </StatusBadge>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='sm'
                          variant={item.status === '完成' ? 'secondary' : 'outline'}
                          onClick={() => {
                            const shouldClose = stats.pending === 1 && item.status === '待处理';
                            updateCheckItem(instance.id, item.id, '完成');
                            setSkipItemId(null);
                            if (shouldClose) closeTimer.current = setTimeout(onClose, 600);
                          }}
                        >
                          <Icons.circleCheck data-icon='inline-start' />
                          完成
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => {
                            setSkipItemId(item.id);
                            setSkipReason(item.skipReason ?? '');
                          }}
                        >
                          跳过
                        </Button>
                        {item.status !== '待处理' ? (
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => updateCheckItem(instance.id, item.id, '待处理')}
                          >
                            恢复待处理
                          </Button>
                        ) : null}
                      </div>
                      {skipItemId === item.id ? (
                        <Field data-invalid={!skipReason.trim()}>
                          <FieldLabel htmlFor={`skip-${item.id}`}>跳过原因</FieldLabel>
                          <Textarea
                            id={`skip-${item.id}`}
                            value={skipReason}
                            onChange={(event) => setSkipReason(event.target.value)}
                            aria-invalid={!skipReason.trim()}
                          />
                          {!skipReason.trim() ? (
                            <FieldError>必须说明本次为何不执行该项。</FieldError>
                          ) : null}
                          <div className='flex gap-2'>
                            <Button
                              size='sm'
                              onClick={() => {
                                const result = updateCheckItem(
                                  instance.id,
                                  item.id,
                                  '跳过',
                                  skipReason
                                );
                                setMessage(result.message);
                                if (result.ok) {
                                  setSkipItemId(null);
                                  if (stats.pending === 1 && item.status === '待处理') {
                                    closeTimer.current = setTimeout(onClose, 600);
                                  }
                                }
                              }}
                            >
                              确认跳过
                            </Button>
                            <Button size='sm' variant='ghost' onClick={() => setSkipItemId(null)}>
                              取消
                            </Button>
                          </div>
                        </Field>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          ))}
          <Field>
            <FieldLabel htmlFor='manual-check'>人工补充项</FieldLabel>
            <div className='flex gap-2'>
              <Input
                id='manual-check'
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder='输入本次临时检查项'
              />
              <Button
                variant='outline'
                onClick={() => {
                  addManualCheckItem(instance.id, manualTitle);
                  setManualTitle('');
                }}
              >
                <Icons.plus data-icon='inline-start' />
                添加
              </Button>
            </div>
          </Field>
          {message ? <p className='text-xs text-muted-foreground'>{message}</p> : null}
        </div>
        <SheetFooter className='border-t sm:flex-row'>
          <Button
            variant='outline'
            onClick={() =>
              exportInstance(instance, version?.name ?? instance.id, project?.name ?? '', 'csv')
            }
          >
            <Icons.download data-icon='inline-start' />
            CSV
          </Button>
          <Button
            onClick={() =>
              exportInstance(instance, version?.name ?? instance.id, project?.name ?? '', 'md')
            }
          >
            <Icons.download data-icon='inline-start' />
            Markdown
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ChecklistCenter() {
  const instances = useDemoStore((state) => state.checkInstances);
  const templates = useDemoStore((state) => state.checkTemplates);
  const projects = useDemoStore((state) => state.projects);
  const versions = useDemoStore((state) => state.versions);
  const deleteCheckTemplate = useDemoStore((state) => state.deleteCheckTemplate);
  const [view, setView] = useState<'instances' | 'templates'>('instances');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CheckTemplate | null>(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const sortedInstances = useMemo(
    () => instances.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [instances]
  );

  return (
    <>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <ToggleGroup
            value={[view]}
            onValueChange={(value) => setView((value[0] as typeof view | undefined) ?? view)}
            variant='outline'
            spacing={0}
          >
            <ToggleGroupItem value='instances'>检查实例</ToggleGroupItem>
            <ToggleGroupItem value='templates'>模板管理</ToggleGroupItem>
          </ToggleGroup>
          {view === 'instances' ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Icons.plus data-icon='inline-start' />
              开始提测检查
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateEditorOpen(true);
              }}
            >
              <Icons.plus data-icon='inline-start' />
              创建模板
            </Button>
          )}
        </div>

        {view === 'instances' ? (
          <div className='grid gap-4 lg:grid-cols-2'>
            {sortedInstances.map((instance) => {
              const stats = getStats(instance);
              const version = versions.find((item) => item.id === instance.versionId);
              const project = projects.find((item) => item.id === instance.projectId);
              return (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <CardTitle>{version?.name ?? instance.versionId}</CardTitle>
                        <CardDescription>
                          {project?.name} · {instance.scenario}
                        </CardDescription>
                      </div>
                      <StatusBadge tone={stats.pending ? 'warning' : 'success'}>
                        {stats.pending ? '进行中' : '已完成'}
                      </StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className='flex flex-col gap-4'>
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span>已处理 {stats.rate}%</span>
                        <span className='text-xs text-muted-foreground tabular-nums'>
                          {stats.completed} 完成 · {stats.skipped} 跳过 · {stats.pending} 待处理
                        </span>
                      </div>
                      <Progress value={stats.rate} aria-label={`已处理 ${stats.rate}%`} />
                    </div>
                    <div>
                      <p className='text-sm font-medium'>{instance.target}</p>
                      <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                        <span>{instance.templateName}</span>
                        <span>创建人 {instance.createdBy}</span>
                        <span>创建于 {new Date(instance.createdAt).toLocaleString('zh-CN')}</span>
                        <span>更新于 {new Date(instance.updatedAt).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    {stats.criticalSkipped ? (
                      <p className='text-sm text-destructive'>
                        {stats.criticalSkipped} 个关键检查项被跳过
                      </p>
                    ) : null}
                    <Button variant='outline' onClick={() => setSelectedInstanceId(instance.id)}>
                      {stats.pending ? '查看并执行检查' : '查看记录'}
                      <Icons.arrowRight data-icon='inline-end' />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className='grid gap-4 lg:grid-cols-2'>
            {templates.map((template) => {
              const count = template.groups.reduce((total, group) => total + group.items.length, 0);
              const criticalCount = template.groups.reduce(
                (total, group) => total + group.items.filter((item) => item.isCritical).length,
                0
              );
              return (
                <Card key={template.id}>
                  <CardHeader>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <StatusBadge tone='neutral'>{template.scenario}</StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className='flex flex-col gap-4'>
                    <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                      <span>{template.groups.length} 个分组</span>
                      <span>{count} 个检查项</span>
                      <span>{criticalCount} 个关键项</span>
                      <span>更新于 {new Date(template.updatedAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        onClick={() => {
                          setEditingTemplate(template);
                          setTemplateEditorOpen(true);
                        }}
                      >
                        <Icons.pencil data-icon='inline-start' />
                        编辑
                      </Button>
                      {pendingDeleteId === template.id ? (
                        <>
                          <Button
                            variant='destructive'
                            onClick={() => {
                              const result = deleteCheckTemplate(template.id);
                              setNotice(result.message);
                              setPendingDeleteId(null);
                            }}
                          >
                            确认删除
                          </Button>
                          <Button variant='ghost' onClick={() => setPendingDeleteId(null)}>
                            取消
                          </Button>
                        </>
                      ) : (
                        <Button variant='ghost' onClick={() => setPendingDeleteId(template.id)}>
                          <Icons.trash data-icon='inline-start' />
                          删除
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {notice ? <p className='text-sm text-muted-foreground'>{notice}</p> : null}
      </div>
      <CreateInstanceSheet open={createOpen} onOpenChange={setCreateOpen} />
      <InstanceDetailSheet
        key={selectedInstanceId ?? 'none'}
        instanceId={selectedInstanceId}
        onClose={() => setSelectedInstanceId(null)}
      />
      {templateEditorOpen ? (
        <TemplateEditorSheet
          key={editingTemplate?.id ?? 'new'}
          template={editingTemplate}
          open={templateEditorOpen}
          onOpenChange={setTemplateEditorOpen}
        />
      ) : null}
    </>
  );
}
