'use client';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
import { PageContainer } from '@/components/layout/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import type {
  Priority,
  TestActivity,
  TestCase,
  TestCaseResult,
  TestPlatform,
  TestResultStatus,
  TestTargetType
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';
import { useMemo, useState } from 'react';

type View = 'cases' | 'runs' | 'reports';

const platforms: TestPlatform[] = ['Android', 'iOS'];
const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];
const resultStatuses: TestResultStatus[] = ['通过', '失败', '阻塞', '未执行'];

function lines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStats(results: TestCaseResult[]) {
  const passed = results.filter((item) => item.status === '通过').length;
  const failed = results.filter((item) => item.status === '失败').length;
  const blocked = results.filter((item) => item.status === '阻塞').length;
  const unexecuted = results.filter((item) => item.status === '未执行').length;
  const executed = results.length - unexecuted;
  return {
    total: results.length,
    executed,
    passed,
    failed,
    blocked,
    unexecuted,
    progress: results.length ? Math.round((executed / results.length) * 100) : 0,
    passRate: executed ? Math.round((passed / executed) * 1000) / 10 : null
  };
}

function conclusion(results: TestCaseResult[]) {
  const stats = getStats(results);
  if (stats.unexecuted) return '测试未完成';
  if (stats.failed || stats.blocked) return '存在风险';
  return '测试通过';
}

function toneForResult(value: string) {
  if (value === '通过' || value === '测试通过') return 'success' as const;
  if (value === '失败') return 'danger' as const;
  if (value === '阻塞' || value === '存在风险') return 'warning' as const;
  if (value === '执行中') return 'info' as const;
  return 'neutral' as const;
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportText(activity: TestActivity, results: TestCaseResult[], projectName: string) {
  const stats = getStats(results);
  const platformRows = platforms
    .filter((platform) => activity.platforms.includes(platform))
    .map((platform) => {
      const item = getStats(results.filter((result) => result.platform === platform));
      return `| ${platform} | ${item.executed} | ${item.passed} | ${item.failed} | ${item.blocked} | ${item.unexecuted} | ${item.passRate === null ? '--' : `${item.passRate}%`} |`;
    });
  const modules = [...new Set(results.map((item) => item.snapshot.module))].map((module) => {
    const item = getStats(results.filter((result) => result.snapshot.module === module));
    return `| ${module} | ${item.total} | ${item.executed} | ${item.passed} | ${item.failed} | ${item.blocked} | ${item.unexecuted} | ${item.passRate === null ? '--' : `${item.passRate}%`} |`;
  });
  const details = (status: TestResultStatus) => {
    const rows = results.filter((item) => item.status === status);
    return rows.length
      ? rows
          .map(
            (item) =>
              `- [${item.snapshot.priority}][${item.platform}][${item.snapshot.module}] ${item.snapshot.title}${item.note ? ` — ${item.note}` : ''}`
          )
          .join('\n')
      : '- 无';
  };
  return `# 测试报告\n\n## 基本信息\n\n- 游戏：${projectName}\n- 测试名称：${activity.name}\n- 测试对象：${activity.targetType}\n- Version / Build：${activity.targetLabel || '未绑定'}\n- 平台：${activity.platforms.join(' / ')}\n- 完成时间：${activity.updatedAt}\n\n## 测试概况\n\n- 总执行项：${stats.total}\n- 已执行：${stats.executed}\n- 通过：${stats.passed}\n- 失败：${stats.failed}\n- 阻塞：${stats.blocked}\n- 未执行：${stats.unexecuted}\n- 执行进度：${stats.progress}%\n- 通过率：${stats.passRate === null ? '--' : `${stats.passRate}%`}\n- 结论：${conclusion(results)}\n\n## 平台结果\n\n| 平台 | 已执行 | 通过 | 失败 | 阻塞 | 未执行 | 通过率 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${platformRows.join('\n')}\n\n## 模块结果\n\n| 模块 | 总数 | 已执行 | 通过 | 失败 | 阻塞 | 未执行 | 通过率 |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${modules.join('\n')}\n\n## 失败项\n\n${details('失败')}\n\n## 阻塞项\n\n${details('阻塞')}\n\n## 未执行项\n\n${details('未执行')}\n`;
}

function CaseEditor({
  open,
  onOpenChange,
  item
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: TestCase;
}) {
  const projects = useDemoStore((state) => state.projects);
  const saveTestCase = useDemoStore((state) => state.saveTestCase);
  const initialProject = item?.projectId ?? projects[0]?.id ?? '';
  const [draft, setDraft] = useState({
    projectId: initialProject,
    platforms: item?.platforms ?? (['Android', 'iOS'] as TestPlatform[]),
    module: item?.module ?? '',
    title: item?.title ?? '',
    preconditions: item?.preconditions.join('\n') ?? '',
    steps: item?.steps.join('\n') ?? '',
    expected: item?.expected ?? '',
    priority: item?.priority ?? ('P1' as Priority)
  });
  const valid =
    draft.projectId &&
    draft.platforms.length &&
    draft.module.trim() &&
    draft.title.trim() &&
    draft.expected.trim();

  function submit() {
    if (!valid) return;
    saveTestCase({
      id: item?.id,
      projectId: draft.projectId,
      platforms: draft.platforms,
      module: draft.module.trim(),
      title: draft.title.trim(),
      preconditions: lines(draft.preconditions),
      steps: lines(draft.steps),
      expected: draft.expected.trim(),
      priority: draft.priority
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>{item ? '编辑用例' : '新建用例'}</SheetTitle>
          <SheetDescription>
            保存到当前游戏用例库；已有执行使用独立快照，不会被改写。
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <FieldGroup>
            <Field>
              <FieldLabel>游戏</FieldLabel>
              <Select
                value={draft.projectId}
                onValueChange={(value) =>
                  value && setDraft((current) => ({ ...current, projectId: value }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {projects.find((project) => project.id === draft.projectId)?.name}
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
              <FieldLabel>适用平台</FieldLabel>
              <ToggleGroup
                value={draft.platforms}
                onValueChange={(value) =>
                  value.length &&
                  setDraft((current) => ({ ...current, platforms: value as TestPlatform[] }))
                }
                variant='outline'
                spacing={0}
              >
                {platforms.map((platform) => (
                  <ToggleGroupItem key={platform} value={platform}>
                    {platform}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor='case-module'>游戏模块</FieldLabel>
              <Input
                id='case-module'
                value={draft.module}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, module: event.target.value }))
                }
                placeholder='例如：账号与登录'
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='case-title'>用例标题</FieldLabel>
              <Input
                id='case-title'
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='case-preconditions'>前置条件</FieldLabel>
              <Textarea
                id='case-preconditions'
                value={draft.preconditions}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, preconditions: event.target.value }))
                }
                placeholder='每行一项'
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='case-steps'>测试步骤</FieldLabel>
              <Textarea
                id='case-steps'
                value={draft.steps}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, steps: event.target.value }))
                }
                placeholder='每行一个步骤'
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='case-expected'>预期结果</FieldLabel>
              <Textarea
                id='case-expected'
                value={draft.expected}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, expected: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>优先级</FieldLabel>
              <Select
                value={draft.priority}
                onValueChange={(value) =>
                  value && setDraft((current) => ({ ...current, priority: value as Priority }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{draft.priority}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {priorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter>
          <Button onClick={submit} disabled={!valid}>
            保存用例
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type AiDraft = Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'> & {
  tempId: string;
  selected: boolean;
};

function AiGenerator({
  open,
  onOpenChange,
  projectId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const projects = useDemoStore((state) => state.projects);
  const saveGeneratedTestCases = useDemoStore((state) => state.saveGeneratedTestCases);
  const [gameId, setGameId] = useState(projectId);
  const [selectedPlatforms, setSelectedPlatforms] = useState<TestPlatform[]>(['Android', 'iOS']);
  const [requirement, setRequirement] = useState(
    '新增公会战功能。玩家可以选择 Boss 发起挑战，每天最多挑战 3 次，挑战次数每日 5:00 重置。'
  );
  const [drafts, setDrafts] = useState<AiDraft[]>([]);

  function generate() {
    const generatedModule = /支付|礼包/.test(requirement)
      ? '商城支付'
      : /登录|账号/.test(requirement)
        ? '账号与登录'
        : '核心玩法';
    const subjects = /支付|礼包/.test(requirement)
      ? ['支付成功并发放一次', '支付取消不产生扣款', '重复支付请求保持幂等', '支付失败后可重试']
      : /登录|账号/.test(requirement)
        ? ['正常登录进入游戏', '令牌失效后重新认证', '弱网登录失败后重试', '切换账号后数据隔离']
        : [
            '首次进入功能主流程',
            '每日次数上限校验',
            '每日重置时间校验',
            '挑战失败后次数扣减',
            '切后台恢复功能状态'
          ];
    setDrafts(
      subjects.map((title, index) => ({
        tempId: `ai-${index}`,
        selected: true,
        projectId: gameId,
        platforms: selectedPlatforms,
        module: generatedModule,
        title,
        preconditions: ['账号已完成新手引导'],
        steps: ['进入对应功能', '完成目标操作', '检查状态与数据'],
        expected:
          index === 1
            ? '达到上限后禁止继续操作并给出明确提示'
            : '功能结果与需求描述一致，数据只更新一次',
        priority: index < 2 ? 'P0' : index < 4 ? 'P1' : 'P2'
      }))
    );
  }

  function save() {
    saveGeneratedTestCases(
      drafts
        .filter((item) => item.selected)
        .map(({ tempId: _tempId, selected: _selected, ...item }) => item)
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>AI 生成用例</SheetTitle>
          <SheetDescription>确定性规则模拟；草稿经人工确认后才会进入用例库。</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <div className='flex flex-col gap-4'>
            <Alert>
              <Icons.sparkles aria-hidden='true' />
              <AlertTitle>AI 生成 · 模拟</AlertTitle>
              <AlertDescription>不会调用真实模型，也不会自动保存未确认草稿。</AlertDescription>
            </Alert>
            <FieldGroup>
              <Field>
                <FieldLabel>游戏</FieldLabel>
                <Select value={gameId} onValueChange={(value) => value && setGameId(value)}>
                  <SelectTrigger className='w-full'>
                    <SelectValue>
                      {projects.find((project) => project.id === gameId)?.name}
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
                <FieldLabel>适用平台</FieldLabel>
                <ToggleGroup
                  value={selectedPlatforms}
                  onValueChange={(value) =>
                    value.length && setSelectedPlatforms(value as TestPlatform[])
                  }
                  variant='outline'
                  spacing={0}
                >
                  {platforms.map((platform) => (
                    <ToggleGroupItem key={platform} value={platform}>
                      {platform}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor='ai-requirement'>需求描述</FieldLabel>
                <Textarea
                  id='ai-requirement'
                  value={requirement}
                  onChange={(event) => setRequirement(event.target.value)}
                  className='min-h-28'
                />
              </Field>
            </FieldGroup>
            <Button onClick={generate} disabled={!requirement.trim()} className='self-start'>
              <Icons.sparkles data-icon='inline-start' />
              生成草稿
            </Button>
            {drafts.map((draft, index) => (
              <div key={draft.tempId}>
                {index ? <Separator className='mb-4' /> : null}
                <div className='flex items-start gap-3'>
                  <Checkbox
                    checked={draft.selected}
                    onCheckedChange={(checked) =>
                      setDrafts((items) =>
                        items.map((item) =>
                          item.tempId === draft.tempId
                            ? { ...item, selected: checked === true }
                            : item
                        )
                      )
                    }
                    aria-label={`选择 ${draft.title}`}
                  />
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <StatusBadge tone={draft.priority === 'P0' ? 'critical' : 'neutral'}>
                        {draft.priority}
                      </StatusBadge>
                      <span className='text-xs text-muted-foreground'>
                        {draft.module} · {draft.platforms.join(' / ')}
                      </span>
                    </div>
                    <Input
                      className='mt-2'
                      value={draft.title}
                      onChange={(event) =>
                        setDrafts((items) =>
                          items.map((item) =>
                            item.tempId === draft.tempId
                              ? { ...item, title: event.target.value }
                              : item
                          )
                        )
                      }
                      aria-label='草稿标题'
                    />
                    <Textarea
                      className='mt-2'
                      value={draft.expected}
                      onChange={(event) =>
                        setDrafts((items) =>
                          items.map((item) =>
                            item.tempId === draft.tempId
                              ? { ...item, expected: event.target.value }
                              : item
                          )
                        )
                      }
                      aria-label='草稿预期结果'
                    />
                  </div>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() =>
                      setDrafts((items) => items.filter((item) => item.tempId !== draft.tempId))
                    }
                    aria-label='删除草稿'
                  >
                    <Icons.trash />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <SheetFooter>
          <Button onClick={save} disabled={!drafts.some((item) => item.selected)}>
            保存选中用例
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function CreateActivity({
  open,
  onOpenChange,
  onCreated
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const projects = useDemoStore((state) => state.projects);
  const versions = useDemoStore((state) => state.versions);
  const builds = useDemoStore((state) => state.builds);
  const testCases = useDemoStore((state) => state.testCases);
  const createTestActivity = useDemoStore((state) => state.createTestActivity);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [name, setName] = useState('vita-mahjong 全量稳定性测试');
  const [selectedPlatforms, setSelectedPlatforms] = useState<TestPlatform[]>(['Android', 'iOS']);
  const [targetType, setTargetType] = useState<TestTargetType>('开发版本');
  const [versionId, setVersionId] = useState('');
  const [buildId, setBuildId] = useState('');
  const available = testCases.filter(
    (item) =>
      item.projectId === projectId &&
      item.platforms.some((platform) => selectedPlatforms.includes(platform))
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const projectVersions = versions.filter((item) => item.projectId === projectId);
  const versionBuilds = builds.filter((item) => item.versionId === versionId);

  function submit() {
    const build = builds.find((item) => item.id === buildId);
    const id = createTestActivity({
      projectId,
      name,
      platforms: selectedPlatforms,
      targetType,
      versionId: versionId || undefined,
      targetBuildId: buildId || undefined,
      targetLabel: build?.label,
      selectedCaseIds: selectedIds
    });
    if (!id) return;
    onOpenChange(false);
    onCreated(id);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-2xl'>
        <SheetHeader>
          <SheetTitle>发起测试</SheetTitle>
          <SheetDescription>创建后会保存用例快照；默认状态为未执行。</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='activity-name'>测试名称</FieldLabel>
              <Input
                id='activity-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>游戏</FieldLabel>
              <Select
                value={projectId}
                onValueChange={(value) => {
                  if (!value) return;
                  setProjectId(value);
                  setSelectedIds([]);
                  setVersionId('');
                  setBuildId('');
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
              <FieldLabel>平台</FieldLabel>
              <ToggleGroup
                value={selectedPlatforms}
                onValueChange={(value) => {
                  if (!value.length) return;
                  setSelectedPlatforms(value as TestPlatform[]);
                  setSelectedIds([]);
                }}
                variant='outline'
                spacing={0}
              >
                {platforms.map((platform) => (
                  <ToggleGroupItem key={platform} value={platform}>
                    {platform}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel>测试对象</FieldLabel>
              <ToggleGroup
                value={[targetType]}
                onValueChange={(value) => value[0] && setTargetType(value[0] as TestTargetType)}
                variant='outline'
                spacing={0}
                className='flex-wrap'
              >
                {(['线上版本', '开发版本', '专项测试'] as TestTargetType[]).map((item) => (
                  <ToggleGroupItem key={item} value={item}>
                    {item}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel>Version（可选）</FieldLabel>
              <Select
                value={versionId}
                onValueChange={(value) => {
                  setVersionId(value ?? '');
                  setBuildId('');
                }}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {projectVersions.find((item) => item.id === versionId)?.name ??
                      '不绑定 Version'}
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
            <Field>
              <FieldLabel>Build（可选）</FieldLabel>
              <Select value={buildId} onValueChange={(value) => setBuildId(value ?? '')}>
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {versionBuilds.find((item) => item.id === buildId)?.label ?? '不绑定 Build'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {versionBuilds.map((build) => (
                      <SelectItem key={build.id} value={build.id}>
                        {build.label} · {build.platform}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <div className='flex items-center justify-between gap-3'>
                <FieldLabel>选择测试用例</FieldLabel>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() =>
                    setSelectedIds(
                      selectedIds.length === available.length
                        ? []
                        : available.map((item) => item.id)
                    )
                  }
                >
                  {selectedIds.length === available.length ? '取消全选' : '全选'}
                </Button>
              </div>
              <div className='flex flex-col gap-0'>
                {available.map((item, index) => (
                  <div key={item.id}>
                    {index ? <Separator /> : null}
                    <label
                      htmlFor={`activity-case-${item.id}`}
                      className='flex cursor-pointer items-start gap-3 py-3'
                    >
                      <Checkbox
                        id={`activity-case-${item.id}`}
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) =>
                          setSelectedIds((current) =>
                            checked === true
                              ? [...current, item.id]
                              : current.filter((id) => id !== item.id)
                          )
                        }
                      />
                      <span className='min-w-0 flex-1'>
                        <span className='block text-sm font-medium'>{item.title}</span>
                        <span className='block text-xs text-muted-foreground'>
                          {item.module} · {item.platforms.join(' / ')} · {item.priority}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              <FieldDescription>仅显示当前游戏且适用于所选平台的用例。</FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter>
          <Button onClick={submit} disabled={!name.trim() || !selectedIds.length}>
            创建测试
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ActivityDetail({
  activityId,
  open,
  onOpenChange
}: {
  activityId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activity = useDemoStore((state) =>
    state.testActivities.find((item) => item.id === activityId)
  );
  const run = useDemoStore((state) =>
    state.testRuns.find((item) => item.id === activity?.runIds.at(-1))
  );
  const start = useDemoStore((state) => state.startTestActivity);
  const update = useDemoStore((state) => state.updateTestResult);
  const complete = useDemoStore((state) => state.completeTestActivity);
  const [selected, setSelected] = useState<TestCaseResult>();
  const [status, setStatus] = useState<TestResultStatus>('未执行');
  const [note, setNote] = useState('');
  if (!activity || !run) return null;
  const stats = getStats(run.results);
  const runId = run.id;
  const stage = activity.status === '准备中' ? 2 : activity.status === '执行中' ? 3 : 4;
  const modules = [...new Set(run.results.map((item) => item.snapshot.module))];

  function choose(item: TestCaseResult) {
    setSelected(item);
    setStatus(item.status);
    setNote(item.note);
  }
  function saveResult() {
    if (!selected) return;
    update(runId, selected.testCaseId, selected.platform, status, note);
    setSelected(undefined);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-4xl'>
          <SheetHeader>
            <SheetTitle>{activity.name}</SheetTitle>
            <SheetDescription>
              {activity.targetType} · {activity.platforms.join(' / ')} ·{' '}
              {activity.targetLabel || '未绑定 Version / Build'}
            </SheetDescription>
          </SheetHeader>
          <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
            <div className='flex flex-col gap-6'>
              <ol className='grid grid-cols-2 gap-2 lg:grid-cols-4' aria-label='测试流水线'>
                {['测试范围', '准备完成', '执行中', '测试完成'].map((label, index) => (
                  <li
                    key={label}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm',
                      index + 1 <= stage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span className='mr-2 tabular-nums'>{index + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
              {activity.status === '准备中' ? (
                <Alert>
                  <Icons.info aria-hidden='true' />
                  <AlertTitle>执行快照已就绪</AlertTitle>
                  <AlertDescription>
                    {run.results.length} 个“用例 ×
                    平台”执行项已生成，原用例后续修改不会影响本轮记录。
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className='grid gap-4 sm:grid-cols-3'>
                <Card>
                  <CardHeader>
                    <CardDescription>总执行进度</CardDescription>
                    <CardTitle className='text-2xl tabular-nums'>
                      {stats.executed} / {stats.total}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={stats.progress} />
                  </CardContent>
                </Card>
                {activity.platforms.map((platform) => {
                  const item = getStats(
                    run.results.filter((result) => result.platform === platform)
                  );
                  return (
                    <Card key={platform}>
                      <CardHeader>
                        <CardDescription>{platform} 进度</CardDescription>
                        <CardTitle className='text-2xl tabular-nums'>{item.progress}%</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className='text-xs text-muted-foreground'>
                          通过率 {item.passRate === null ? '--' : `${item.passRate}%`}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {modules.map((module) => {
                const items = run.results.filter((item) => item.snapshot.module === module);
                const done = items.filter((item) => item.status !== '未执行').length;
                return (
                  <Card key={module}>
                    <CardHeader>
                      <div className='flex items-center justify-between gap-3'>
                        <CardTitle>{module}</CardTitle>
                        <span className='text-sm tabular-nums text-muted-foreground'>
                          {done} / {items.length}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {items.map((item, index) => (
                        <div key={`${item.testCaseId}-${item.platform}`}>
                          {index ? <Separator /> : null}
                          <button
                            type='button'
                            className='flex w-full items-start gap-3 py-3 text-left'
                            onClick={() => choose(item)}
                          >
                            <span className='min-w-0 flex-1'>
                              <span className='block text-sm font-medium'>
                                {item.snapshot.title}
                              </span>
                              <span className='block text-xs text-muted-foreground'>
                                {item.platform} · {item.snapshot.priority}
                                {item.note ? ` · ${item.note}` : ''}
                              </span>
                            </span>
                            <StatusBadge tone={toneForResult(item.status)}>
                              {item.status}
                            </StatusBadge>
                          </button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          <SheetFooter>
            <div className='flex flex-wrap justify-end gap-2'>
              {activity.status === '准备中' ? (
                <Button onClick={() => start(activity.id)}>
                  <Icons.playerPlay data-icon='inline-start' />
                  开始执行
                </Button>
              ) : null}
              {activity.status === '执行中' ? (
                <Button onClick={() => complete(activity.id)}>完成测试</Button>
              ) : null}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(selected)} onOpenChange={(value) => !value && setSelected(undefined)}>
        <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-lg'>
          <SheetHeader>
            <SheetTitle>{selected?.snapshot.title}</SheetTitle>
            <SheetDescription>
              {selected?.platform} · {selected?.snapshot.module} · {selected?.snapshot.priority}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
              <div className='flex flex-col gap-4'>
                <section>
                  <h3 className='text-sm font-medium'>前置条件</h3>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {selected.snapshot.preconditions.join('；') || '无'}
                  </p>
                </section>
                <section>
                  <h3 className='text-sm font-medium'>测试步骤</h3>
                  <ol className='mt-1 list-inside list-decimal text-sm leading-6 text-muted-foreground'>
                    {selected.snapshot.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
                <section>
                  <h3 className='text-sm font-medium'>预期结果</h3>
                  <p className='mt-1 text-sm text-muted-foreground'>{selected.snapshot.expected}</p>
                </section>
                <Separator />
                <FieldGroup>
                  <Field>
                    <FieldLabel>执行结果</FieldLabel>
                    <ToggleGroup
                      value={[status]}
                      onValueChange={(value) => value[0] && setStatus(value[0] as TestResultStatus)}
                      variant='outline'
                      spacing={0}
                      className='flex-wrap'
                    >
                      {resultStatuses.map((item) => (
                        <ToggleGroupItem key={item} value={item}>
                          {item}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='result-note'>备注</FieldLabel>
                    <Textarea
                      id='result-note'
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder='失败或阻塞时建议填写原因'
                    />
                  </Field>
                </FieldGroup>
              </div>
            </div>
          ) : null}
          <SheetFooter>
            <Button onClick={saveResult}>保存结果</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ResultDetail({
  activityId,
  open,
  onOpenChange
}: {
  activityId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activity = useDemoStore((state) =>
    state.testActivities.find((item) => item.id === activityId)
  );
  const run = useDemoStore((state) =>
    state.testRuns.find((item) => item.id === activity?.runIds.at(-1))
  );
  const project = useDemoStore((state) =>
    state.projects.find((item) => item.id === activity?.projectId)
  );
  const [copied, setCopied] = useState(false);
  if (!activity || !run) return null;
  const stats = getStats(run.results);
  const modules = [...new Set(run.results.map((item) => item.snapshot.module))]
    .map((module) => ({
      module,
      stats: getStats(run.results.filter((item) => item.snapshot.module === module))
    }))
    .toSorted((a, b) => b.stats.failed + b.stats.blocked - (a.stats.failed + a.stats.blocked));
  const markdown = reportText(activity, run.results, project?.name ?? '未知游戏');
  const currentActivity = activity;
  const currentRun = run;
  const summary = `【${activity.name}】\n平台：${activity.platforms.join(' / ')}\n总执行项：${stats.total}\n已执行：${stats.executed}\n通过：${stats.passed}\n失败：${stats.failed}\n阻塞：${stats.blocked}\n未执行：${stats.unexecuted}\n执行进度：${stats.progress}%\n通过率：${stats.passRate === null ? '--' : `${stats.passRate}%`}\n结论：${conclusion(run.results)}`;
  function csv() {
    const header = [
      '游戏',
      '测试名称',
      '测试对象',
      'Version',
      'Build',
      '模块',
      '用例标题',
      '平台',
      '优先级',
      '执行结果',
      '备注'
    ];
    const rows = currentRun.results.map((item) => [
      project?.name ?? '',
      currentActivity.name,
      currentActivity.targetType,
      currentActivity.versionId ?? '',
      currentActivity.targetLabel ?? '',
      item.snapshot.module,
      item.snapshot.title,
      item.platform,
      item.snapshot.priority,
      item.status,
      item.note
    ]);
    const content = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    download(
      `${project?.name}-${currentActivity.name}.csv`,
      `\ufeff${content}`,
      'text/csv;charset=utf-8'
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-5xl'>
        <SheetHeader>
          <div className='flex flex-wrap items-center justify-between gap-3 pr-10'>
            <div>
              <SheetTitle>{activity.name}</SheetTitle>
              <SheetDescription>
                {project?.name} · {activity.platforms.join(' / ')} · {activity.targetType}
              </SheetDescription>
            </div>
            <StatusBadge tone={toneForResult(conclusion(run.results))}>
              {conclusion(run.results)}
            </StatusBadge>
          </div>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <div className='flex flex-col gap-6'>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8'>
              {[
                ['总项', stats.total],
                ['已执行', stats.executed],
                ['通过', stats.passed],
                ['失败', stats.failed],
                ['阻塞', stats.blocked],
                ['未执行', stats.unexecuted],
                ['执行进度', `${stats.progress}%`],
                ['通过率', stats.passRate === null ? '--' : `${stats.passRate}%`]
              ].map(([label, value]) => (
                <div key={label} className='rounded-md bg-muted px-3 py-3'>
                  <p className='text-xs text-muted-foreground'>{label}</p>
                  <p className='mt-1 text-xl font-semibold tabular-nums'>{value}</p>
                </div>
              ))}
            </div>
            <div className='grid gap-4 lg:grid-cols-2'>
              {activity.platforms.map((platform) => {
                const item = getStats(run.results.filter((result) => result.platform === platform));
                return (
                  <Card key={platform}>
                    <CardHeader>
                      <CardTitle>{platform}</CardTitle>
                      <CardDescription>
                        {item.executed} 已执行 · {item.failed} 失败 · {item.blocked} 阻塞 ·{' '}
                        {item.unexecuted} 未执行
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Progress value={item.passRate ?? 0} />
                      <p className='mt-2 text-xs text-muted-foreground'>
                        通过率 {item.passRate === null ? '--' : `${item.passRate}%`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>模块结果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-160 text-sm'>
                    <thead>
                      <tr className='border-b text-left text-muted-foreground'>
                        {['模块', '总数', '已执行', '通过', '失败', '阻塞', '未执行', '通过率'].map(
                          (item) => (
                            <th key={item} className='px-2 py-2 font-normal'>
                              {item}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(({ module, stats: item }) => (
                        <tr key={module} className='border-b last:border-0'>
                          <td className='px-2 py-3 font-medium'>{module}</td>
                          <td className='px-2 tabular-nums'>{item.total}</td>
                          <td className='px-2 tabular-nums'>{item.executed}</td>
                          <td className='px-2 tabular-nums'>{item.passed}</td>
                          <td className='px-2 tabular-nums'>{item.failed}</td>
                          <td className='px-2 tabular-nums'>{item.blocked}</td>
                          <td className='px-2 tabular-nums'>{item.unexecuted}</td>
                          <td className='px-2 tabular-nums'>
                            {item.passRate === null ? '--' : `${item.passRate}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {(['失败', '阻塞', '未执行'] as TestResultStatus[]).map((status) => {
              const items = run.results.filter((item) => item.status === status);
              return items.length ? (
                <Card key={status}>
                  <CardHeader>
                    <CardTitle>{status}</CardTitle>
                    <CardDescription>{items.length} 个执行项需要关注</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {items.map((item, index) => (
                      <div key={`${item.testCaseId}-${item.platform}`}>
                        {index ? <Separator /> : null}
                        <div className='flex items-start justify-between gap-3 py-3'>
                          <div>
                            <p className='text-sm font-medium'>{item.snapshot.title}</p>
                            <p className='text-xs text-muted-foreground'>
                              {item.snapshot.priority} · {item.platform} · {item.snapshot.module}
                              {item.note ? ` · ${item.note}` : ''}
                            </p>
                          </div>
                          <StatusBadge tone={toneForResult(status)}>{status}</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null;
            })}
          </div>
        </div>
        <SheetFooter>
          <div className='flex flex-wrap justify-end gap-2'>
            <Button
              variant='outline'
              onClick={async () => {
                await navigator.clipboard.writeText(summary);
                setCopied(true);
              }}
            >
              <Icons.copy data-icon='inline-start' />
              {copied ? '已复制' : '复制摘要'}
            </Button>
            <Button
              variant='outline'
              onClick={() =>
                download(
                  `${project?.name}-${activity.name}.md`,
                  markdown,
                  'text/markdown;charset=utf-8'
                )
              }
            >
              <Icons.download data-icon='inline-start' />
              Markdown
            </Button>
            <Button onClick={csv}>
              <Icons.download data-icon='inline-start' />
              CSV
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function TestCenter({ view }: { view: View }) {
  const projects = useDemoStore((state) => state.projects);
  const testCases = useDemoStore((state) => state.testCases);
  const activities = useDemoStore((state) => state.testActivities);
  const runs = useDemoStore((state) => state.testRuns);
  const deleteTestCase = useDemoStore((state) => state.deleteTestCase);
  const duplicateTestCase = useDemoStore((state) => state.duplicateTestCase);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [platform, setPlatform] = useState<'全部' | TestPlatform>('全部');
  const [query, setQuery] = useState('');
  const [module, setModule] = useState('全部');
  const [priority, setPriority] = useState<'全部' | Priority>('全部');
  const [editing, setEditing] = useState<TestCase>();
  const [createOpen, setCreateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [activityId, setActivityId] = useState<string>();
  const [detailMode, setDetailMode] = useState<'run' | 'report'>('run');
  const modules = useMemo(
    () => [
      '全部',
      ...new Set(
        testCases.filter((item) => item.projectId === projectId).map((item) => item.module)
      )
    ],
    [projectId, testCases]
  );
  const visibleCases = testCases.filter(
    (item) =>
      item.projectId === projectId &&
      (platform === '全部' || item.platforms.includes(platform)) &&
      (module === '全部' || item.module === module) &&
      (priority === '全部' || item.priority === priority) &&
      `${item.title}${item.module}`.toLowerCase().includes(query.toLowerCase())
  );
  const visibleActivities = activities
    .filter((item) => (view === 'reports' ? item.status === '已完成' : true))
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const title = view === 'cases' ? '用例库' : view === 'runs' ? '测试执行' : '测试报告';
  const description =
    view === 'cases'
      ? '维护三款游戏的 Android / iOS 测试用例，AI 草稿需经人工确认。'
      : view === 'runs'
        ? '发起一轮测试，以用例 × 平台记录独立结果和备注。'
        : '查看历史测试结论、平台与模块统计，并复制或下载报告。';

  function openActivity(id: string, mode: 'run' | 'report') {
    setActivityId(id);
    setDetailMode(mode);
  }

  return (
    <PageContainer title={title} description={description}>
      <div className='flex flex-col gap-6'>
        {view === 'cases' ? (
          <>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div className='flex flex-wrap gap-2'>
                <ToggleGroup
                  value={[projectId]}
                  onValueChange={(value) => value[0] && setProjectId(value[0])}
                  variant='outline'
                  spacing={0}
                  className='flex-wrap'
                >
                  {projects.map((project) => (
                    <ToggleGroupItem key={project.id} value={project.id}>
                      {project.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <ToggleGroup
                  value={[platform]}
                  onValueChange={(value) =>
                    value[0] && setPlatform(value[0] as '全部' | TestPlatform)
                  }
                  variant='outline'
                  spacing={0}
                >
                  {['全部', ...platforms].map((item) => (
                    <ToggleGroupItem key={item} value={item}>
                      {item}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' onClick={() => setAiOpen(true)}>
                  <Icons.sparkles data-icon='inline-start' />
                  AI 生成用例
                </Button>
                <Button onClick={() => setCreateOpen(true)}>
                  <Icons.plus data-icon='inline-start' />
                  新建用例
                </Button>
              </div>
            </div>
            <Card>
              <CardHeader>
                <div className='grid gap-2 md:grid-cols-[1fr_180px_140px]'>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder='搜索用例或模块'
                  />
                  <Select value={module} onValueChange={(value) => value && setModule(value)}>
                    <SelectTrigger className='w-full'>
                      <SelectValue>{module}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {modules.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Select
                    value={priority}
                    onValueChange={(value) => value && setPriority(value as '全部' | Priority)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue>{priority}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {['全部', ...priorities].map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {visibleCases.map((item, index) => (
                  <div key={item.id}>
                    {index ? <Separator /> : null}
                    <div className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center'>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='text-sm font-medium'>{item.title}</p>
                          <StatusBadge tone={item.priority === 'P0' ? 'critical' : 'neutral'}>
                            {item.priority}
                          </StatusBadge>
                        </div>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {item.module} · {item.platforms.join(' / ')} · 更新于{' '}
                          {formatDate(item.updatedAt)}
                        </p>
                      </div>
                      <div className='flex gap-1'>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => setEditing(item)}
                          aria-label={`编辑 ${item.title}`}
                        >
                          <Icons.pencil />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => duplicateTestCase(item.id)}
                          aria-label={`复制 ${item.title}`}
                        >
                          <Icons.copy />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          onClick={() => deleteTestCase(item.id)}
                          aria-label={`删除 ${item.title}`}
                        >
                          <Icons.trash />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            {!visibleCases.length ? (
              <Empty className='min-h-56 border'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Icons.flask />
                  </EmptyMedia>
                  <EmptyTitle>没有匹配用例</EmptyTitle>
                  <EmptyDescription>调整筛选条件，或为当前游戏创建第一条用例。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {createOpen ? <CaseEditor open={createOpen} onOpenChange={setCreateOpen} /> : null}
            {editing ? (
              <CaseEditor
                open={Boolean(editing)}
                onOpenChange={(value) => !value && setEditing(undefined)}
                item={editing}
              />
            ) : null}
            {aiOpen ? (
              <AiGenerator open={aiOpen} onOpenChange={setAiOpen} projectId={projectId} />
            ) : null}
          </>
        ) : (
          <>
            {view === 'runs' ? (
              <div className='flex justify-end'>
                <Button onClick={() => setLaunchOpen(true)}>
                  <Icons.plus data-icon='inline-start' />
                  发起测试
                </Button>
              </div>
            ) : null}
            <div className='flex flex-col gap-4'>
              {visibleActivities.map((activity) => {
                const run = runs.find((item) => item.id === activity.runIds.at(-1));
                const stats = getStats(run?.results ?? []);
                const project = projects.find((item) => item.id === activity.projectId);
                return (
                  <Card key={activity.id}>
                    <CardHeader>
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                          <CardTitle>{activity.name}</CardTitle>
                          <CardDescription>
                            {project?.name} · {activity.platforms.join(' / ')} ·{' '}
                            {activity.targetType} · 更新于 {formatDate(activity.updatedAt)}
                          </CardDescription>
                        </div>
                        <StatusBadge
                          tone={
                            view === 'reports'
                              ? toneForResult(conclusion(run?.results ?? []))
                              : toneForResult(activity.status)
                          }
                        >
                          {view === 'reports' ? conclusion(run?.results ?? []) : activity.status}
                        </StatusBadge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className='grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center'>
                        <div>
                          <div className='flex items-center justify-between gap-3 text-sm'>
                            <span>执行进度</span>
                            <span className='tabular-nums'>
                              {stats.executed} / {stats.total}
                            </span>
                          </div>
                          <Progress className='mt-2' value={stats.progress} />
                          <p className='mt-2 text-xs text-muted-foreground'>
                            通过 {stats.passed} · 失败 {stats.failed} · 阻塞 {stats.blocked} ·
                            未执行 {stats.unexecuted} · 通过率{' '}
                            {stats.passRate === null ? '--' : `${stats.passRate}%`}
                          </p>
                        </div>
                        <Button
                          variant='outline'
                          onClick={() =>
                            openActivity(
                              activity.id,
                              view === 'reports'
                                ? 'report'
                                : activity.status === '已完成'
                                  ? 'report'
                                  : 'run'
                            )
                          }
                        >
                          {view === 'reports' || activity.status === '已完成'
                            ? '查看结果'
                            : '继续执行'}
                          <Icons.arrowRight data-icon='inline-end' />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {!visibleActivities.length ? (
              <Empty className='min-h-56 border'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Icons.report />
                  </EmptyMedia>
                  <EmptyTitle>{view === 'reports' ? '暂无已完成测试' : '暂无测试任务'}</EmptyTitle>
                  <EmptyDescription>
                    {view === 'reports'
                      ? '完成测试后，结果会出现在这里。'
                      : '发起一次测试，创建独立用例快照并开始执行。'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            <CreateActivity
              open={launchOpen}
              onOpenChange={setLaunchOpen}
              onCreated={(id) => {
                setActivityId(id);
                setDetailMode('run');
              }}
            />
            {detailMode === 'run' ? (
              <ActivityDetail
                activityId={activityId}
                open={Boolean(activityId)}
                onOpenChange={(value) => !value && setActivityId(undefined)}
              />
            ) : (
              <ResultDetail
                activityId={activityId}
                open={Boolean(activityId)}
                onOpenChange={(value) => !value && setActivityId(undefined)}
              />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
