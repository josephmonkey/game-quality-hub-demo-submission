'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDemoStore } from '@/store/demo-store';

type PlatformFilter = 'all' | 'iOS' | 'Android';

export default function ProjectsPage() {
  const projects = useDemoStore((state) => state.projects);
  const bugs = useDemoStore((state) => state.bugs);
  const versions = useDemoStore((state) => state.versions);
  const builds = useDemoStore((state) => state.builds);
  const reports = useDemoStore((state) => state.reports);
  const checkInstances = useDemoStore((state) => state.checkInstances);
  const [projectFilter, setProjectFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const visibleVersions = versions.filter(
    (version) =>
      (projectFilter === 'all' || version.projectId === projectFilter) &&
      (platformFilter === 'all' || version.platforms.includes(platformFilter))
  );
  const visibleBugs = bugs.filter((bug) => {
    if (projectFilter !== 'all' && bug.projectId !== projectFilter) return false;
    if (platformFilter === 'all') return true;
    return [bug.foundInBuildId, bug.fixedInBuildId].some(
      (buildId) => builds.find((build) => build.id === buildId)?.platform === platformFilter
    );
  });
  const visibleReports = reports.filter((report) => {
    const version = versions.find((item) => item.id === report.versionId);
    const build = builds.find((item) => item.id === report.buildId);
    return (
      (projectFilter === 'all' || version?.projectId === projectFilter) &&
      (platformFilter === 'all' || build?.platform === platformFilter)
    );
  });

  return (
    <PageContainer
      title='版本总览'
      description='按游戏与平台查看版本范围、Build 状态和提测检查进度。'
    >
      <div className='mb-4 flex flex-wrap items-center gap-x-6 gap-y-3'>
        <div className='flex items-center gap-2'>
          <p className='shrink-0 text-sm font-medium'>游戏</p>
          <ToggleGroup
            value={[projectFilter]}
            onValueChange={(value) => setProjectFilter(value[0] ?? projectFilter)}
            variant='outline'
            spacing={0}
            className='w-fit max-w-full flex-wrap justify-start'
          >
            <ToggleGroupItem value='all'>全部游戏</ToggleGroupItem>
            {projects.map((project) => (
              <ToggleGroupItem key={project.id} value={project.id}>
                {project.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className='flex items-center gap-2'>
          <p className='shrink-0 text-sm font-medium'>平台</p>
          <ToggleGroup
            value={[platformFilter]}
            onValueChange={(value) =>
              setPlatformFilter((value[0] as PlatformFilter | undefined) ?? platformFilter)
            }
            variant='outline'
            spacing={0}
          >
            <ToggleGroupItem value='all'>全部平台</ToggleGroupItem>
            <ToggleGroupItem value='iOS'>iOS</ToggleGroupItem>
            <ToggleGroupItem value='Android'>Android</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {visibleVersions.length ? (
        <div className='grid gap-4 lg:grid-cols-2'>
          {visibleVersions.map((version) => {
            const project = projects.find((item) => item.id === version.projectId);
            const versionBuilds = version.buildIds
              .map((buildId) => builds.find((item) => item.id === buildId))
              .filter(
                (build): build is NonNullable<typeof build> =>
                  Boolean(build) && (platformFilter === 'all' || build?.platform === platformFilter)
              );
            const instance = checkInstances
              .filter((item) => item.versionId === version.id)
              .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

            return (
              <Card key={version.id}>
                <CardHeader>
                  <div className='flex items-center justify-between gap-3'>
                    <CardTitle>{version.name}</CardTitle>
                    <StatusBadge
                      tone={
                        version.status === '已发布'
                          ? 'success'
                          : version.status === '测试中'
                            ? 'info'
                            : version.status === '待发布'
                              ? 'warning'
                              : 'neutral'
                      }
                    >
                      {version.status}
                    </StatusBadge>
                  </div>
                  <CardDescription>
                    {project?.name ?? version.projectId} · {version.platforms.join(' · ')}
                  </CardDescription>
                  <p className='text-sm'>{version.scope.join(' · ')}</p>
                </CardHeader>
                <CardContent>
                  {instance ? (
                    (() => {
                      const completed = instance.items.filter(
                        (item) => item.status === '完成'
                      ).length;
                      const skipped = instance.items.filter(
                        (item) => item.status === '跳过'
                      ).length;
                      const pending = instance.items.length - completed - skipped;
                      return (
                        <div className='mb-3 flex items-center justify-between gap-3 bg-muted/40 p-3'>
                          <div>
                            <p className='text-sm font-medium'>
                              提测检查：{completed + skipped} / {instance.items.length} 已处理
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {skipped} 项跳过 · {pending} 项待处理
                            </p>
                          </div>
                          <Button
                            variant='outline'
                            size='sm'
                            nativeButton={false}
                            aria-label={`${pending ? '继续' : '查看'} ${version.name} 提测检查`}
                            render={
                              <Link
                                href='/dashboard/projects/checklists'
                                aria-label={`${pending ? '继续' : '查看'} ${version.name} 提测检查`}
                              />
                            }
                          >
                            {pending ? '继续检查' : '查看记录'}
                          </Button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className='mb-3 flex items-center justify-between gap-3 bg-muted/40 p-3'>
                      <div>
                        <p className='text-sm font-medium'>尚未开始提测检查</p>
                        <p className='text-xs text-muted-foreground'>按场景模板生成独立检查记录</p>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        nativeButton={false}
                        aria-label={`开始 ${version.name} 提测检查`}
                        render={
                          <Link
                            href='/dashboard/projects/checklists'
                            aria-label={`开始 ${version.name} 提测检查`}
                          />
                        }
                      >
                        开始检查
                      </Button>
                    </div>
                  )}
                  <div className='flex items-center justify-between gap-3 py-2'>
                    <p className='text-sm font-medium'>Build</p>
                    <p className='text-xs text-muted-foreground tabular-nums'>
                      {versionBuilds.length} 个
                    </p>
                  </div>
                  {versionBuilds.length ? (
                    versionBuilds.map((build, index) => (
                      <div key={build.id}>
                        {index > 0 ? <Separator /> : null}
                        <div className='flex items-center gap-3 py-3'>
                          <Icons.gitMerge
                            className='size-4 shrink-0 text-muted-foreground'
                            aria-hidden='true'
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm font-medium'>
                              {build.platform} · {build.label}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {build.source} · {new Date(build.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <StatusBadge
                            tone={
                              build.status === '已发布' || build.status === '可发布'
                                ? 'success'
                                : build.status === '验证中'
                                  ? 'info'
                                  : 'neutral'
                            }
                          >
                            {build.status}
                          </StatusBadge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty className='min-h-32'>
                      <EmptyHeader>
                        <EmptyMedia variant='icon'>
                          <Icons.gitMerge className='size-4' />
                        </EmptyMedia>
                        <EmptyTitle>当前平台暂无 Build</EmptyTitle>
                        <EmptyDescription>切换平台或登记新的候选构建。</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className='min-h-48'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Icons.laptop className='size-5' />
            </EmptyMedia>
            <EmptyTitle>没有符合筛选条件的版本</EmptyTitle>
            <EmptyDescription>尝试切换游戏或平台。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className='mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <Card>
          <CardHeader>
            <CardTitle>缺陷待办</CardTitle>
            <CardDescription>来源 Case、发现构建和修复构建保持关联</CardDescription>
          </CardHeader>
          <CardContent>
            {visibleBugs.length ? (
              visibleBugs.map((bug, index) => {
                const project = projects.find((item) => item.id === bug.projectId);
                const foundBuild = builds.find((item) => item.id === bug.foundInBuildId);
                const fixedBuild = builds.find((item) => item.id === bug.fixedInBuildId);
                const platformContext = [
                  foundBuild ? `发现于 ${foundBuild.platform}` : '',
                  fixedBuild ? `修复于 ${fixedBuild.platform}` : ''
                ].filter(Boolean);
                return (
                  <div key={bug.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='flex items-center gap-3 py-3'>
                      <Icons.bug
                        className='size-4 shrink-0 text-muted-foreground'
                        aria-hidden='true'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm font-medium'>{bug.title}</p>
                        <p className='text-xs text-muted-foreground'>
                          {project?.name ?? bug.projectId}
                          {platformContext.length ? ` · ${platformContext.join(' · ')}` : ''}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {bug.module} · {bug.severity} · 指派给 {bug.assignee}
                        </p>
                      </div>
                      <div className='flex shrink-0 gap-2'>
                        <StatusBadge tone={bug.priority === 'P0' ? 'critical' : 'warning'}>
                          {bug.priority}
                        </StatusBadge>
                        <StatusBadge tone={bug.status === '待验收' ? 'info' : 'neutral'}>
                          {bug.status}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <Empty className='min-h-32'>
                <EmptyHeader>
                  <EmptyTitle>当前筛选下没有缺陷待办</EmptyTitle>
                  <EmptyDescription>这里只展示能解析到所选平台的关联缺陷。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>构建质量报告</CardTitle>
            <CardDescription>快照不随后续数据改写</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-3'>
            {visibleReports.length ? (
              visibleReports.map((report) => {
                const version = versions.find((item) => item.id === report.versionId);
                const build = builds.find((item) => item.id === report.buildId);
                const project = projects.find((item) => item.id === version?.projectId);
                return (
                  <div key={report.id} className='flex flex-col gap-3 rounded-lg bg-muted/50 p-4'>
                    <div className='flex items-center justify-between gap-2'>
                      <span className='flex items-center gap-2 text-sm font-medium'>
                        <Icons.report className='size-4' aria-hidden='true' />
                        {build?.label}
                      </span>
                      <StatusBadge tone='warning'>{report.recommendation}</StatusBadge>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      {project?.name ?? version?.projectId} · {build?.platform}
                    </p>
                    <p className='text-sm leading-6 text-muted-foreground'>{report.riskSummary}</p>
                    <p className='flex items-center gap-2 text-xs text-muted-foreground'>
                      <Icons.history className='size-4' aria-hidden='true' />
                      {new Date(report.createdAt).toLocaleString('zh-CN')} · AI 摘要为模拟
                    </p>
                  </div>
                );
              })
            ) : (
              <Empty className='min-h-32'>
                <EmptyHeader>
                  <EmptyTitle>当前筛选下没有质量报告</EmptyTitle>
                  <EmptyDescription>报告需要关联到明确的版本与 Build。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
