'use client';

import { Icons, type Icon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { DAY_MS, demoNow } from '@/lib/demo-time';
import { useDemoStore } from '@/store/demo-store';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type SearchResult = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
  searchable: string;
};

type LauncherItem = {
  title: string;
  description: string;
  href: string;
  icon: Icon;
  stats: Array<{ label: string; value: string | number }>;
};

type ContinueItem = {
  id: string;
  type: string;
  title: string;
  status: string;
  cta: string;
  href: string;
};

const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;

export function WorkspaceLauncher() {
  const [query, setQuery] = useState('');
  const projects = useDemoStore((state) => state.projects);
  const feedback = useDemoStore((state) => state.feedback);
  const issues = useDemoStore((state) => state.clusters);
  const versions = useDemoStore((state) => state.versions);
  const checkInstances = useDemoStore((state) => state.checkInstances);
  const testActivities = useDemoStore((state) => state.testActivities);
  const testRuns = useDemoStore((state) => state.testRuns);
  const resources = useDemoStore((state) => state.resources);
  const resourceLoans = useDemoStore((state) => state.resourceLoans);

  const now = demoNow();
  const activeIssues = issues.filter(
    (issue) => issue.issueStatus !== 'Resolved' && issue.issueStatus !== 'Closed'
  );
  const triageCount = activeIssues.filter(
    (issue) => issue.classification === 'Pending' || issue.issueStatus === 'New'
  ).length;
  const activeCheckInstances = checkInstances.filter((instance) =>
    instance.items.some((item) => item.status === '待处理')
  );
  const overdueLoans = resourceLoans.filter(
    (loan) => !loan.returnedAt && new Date(loan.dueDate).getTime() < now.getTime()
  );
  const latestRun = testRuns.toSorted(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )[0];
  const latestPassed = latestRun?.results.filter((result) => result.status === '通过').length ?? 0;

  const launcherItems: LauncherItem[] = [
    {
      title: 'Issue Center',
      description: '玩家反馈、Issue 与 Bug 分诊',
      href: '/dashboard/cases',
      icon: Icons.inbox,
      stats: [
        { label: '活跃 Issue', value: activeIssues.length },
        { label: '待分诊', value: triageCount }
      ]
    },
    {
      title: '项目空间',
      description: '版本、Build、提测检查与质量报告',
      href: '/dashboard/projects',
      icon: Icons.kanban,
      stats: [
        {
          label: '测试中版本',
          value: versions.filter((version) => version.status === '测试中').length
        },
        { label: '检查进行中', value: activeCheckInstances.length }
      ]
    },
    {
      title: '测试中心',
      description: '测试活动、执行记录与重跑',
      href: '/dashboard/tests',
      icon: Icons.flask,
      stats: [
        { label: '测试活动', value: testActivities.length },
        {
          label: '最近执行',
          value: latestRun ? `${latestPassed} / ${latestRun.results.length}` : '暂无执行'
        }
      ]
    },
    {
      title: '设备与资源',
      description: '设备、账号、预约、借还与超期',
      href: '/dashboard/resources',
      icon: Icons.package,
      stats: [
        {
          label: '当前占用',
          value: resources.filter((resource) => resource.status === '占用').length
        },
        { label: '超期未还', value: overdueLoans.length }
      ]
    }
  ];

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];

    const projectNames = new Map(projects.map((project) => [project.id, project.name]));
    const candidates: SearchResult[] = [
      ...feedback.map((item) => ({
        id: `case-${item.id}`,
        type: 'Case',
        title: item.caseId,
        detail: item.text,
        href: '/dashboard/cases/manage',
        searchable: [item.caseId, item.text].join(' ')
      })),
      ...issues.map((item) => ({
        id: `issue-${item.id}`,
        type: 'Issue',
        title: `${item.displayId} · ${item.title}`,
        detail: item.summary,
        href: '/dashboard/cases/issues',
        searchable: [item.displayId, item.title, item.summary].join(' ')
      })),
      ...versions.map((item) => ({
        id: `version-${item.id}`,
        type: 'Version',
        title: item.name,
        detail: `${projectNames.get(item.projectId) ?? '未知项目'} · ${item.scope.join('、')}`,
        href: '/dashboard/projects',
        searchable: [item.name, ...item.scope].join(' ')
      })),
      ...testActivities.map((item) => ({
        id: `activity-${item.id}`,
        type: 'Test Activity',
        title: item.name,
        detail: `${item.platforms.join(' / ')} · ${item.targetLabel ?? item.targetType}`,
        href: '/dashboard/tests',
        searchable: [item.name, item.targetType, item.targetLabel, ...item.platforms]
          .filter(Boolean)
          .join(' ')
      })),
      ...resources.map((item) => ({
        id: `resource-${item.id}`,
        type: 'Resource',
        title: item.name,
        detail: [item.platform, item.model, item.systemVersion, ...item.tags]
          .filter(Boolean)
          .join(' · '),
        href: '/dashboard/resources',
        searchable: [item.name, item.platform, item.model, item.systemVersion, ...item.tags]
          .filter(Boolean)
          .join(' ')
      }))
    ];

    return candidates
      .filter((item) => item.searchable.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [feedback, issues, projects, query, resources, testActivities, versions]);

  const continueItems = (() => {
    const result: ContinueItem[] = [];
    const topIssue = activeIssues.toSorted((left, right) => {
      const priorityDifference = priorityOrder[left.priority] - priorityOrder[right.priority];
      return (
        priorityDifference ||
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    })[0];
    if (topIssue) {
      result.push({
        id: `continue-${topIssue.id}`,
        type: 'Issue',
        title: `${topIssue.displayId} · ${topIssue.title}`,
        status: `${topIssue.priority} · ${topIssue.issueStatus} · ${topIssue.caseCount24h} 条 24h Case`,
        cta: '继续分诊',
        href: '/dashboard/cases/issues'
      });
    }

    const latestCheck = activeCheckInstances.toSorted(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )[0];
    if (latestCheck) {
      const pendingCount = latestCheck.items.filter((item) => item.status === '待处理').length;
      result.push({
        id: `continue-${latestCheck.id}`,
        type: '提测检查',
        title: latestCheck.target,
        status: `${latestCheck.templateName} · ${pendingCount} 项待处理`,
        cta: '继续检查',
        href: '/dashboard/projects/checklists'
      });
    }

    const runsByRecency = testRuns.toSorted(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    const seenActivityIds = new Set<string>();
    const latestRunsByActivity = runsByRecency.filter((run) => {
      if (seenActivityIds.has(run.activityId)) return false;
      seenActivityIds.add(run.activityId);
      return true;
    });
    const attentionRun =
      latestRunsByActivity.find((run) => run.results.some((item) => item.status !== '通过')) ??
      undefined;
    const attentionActivity = attentionRun
      ? testActivities.find((activity) => activity.id === attentionRun.activityId)
      : testActivities.toSorted(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )[0];
    if (attentionActivity) {
      const activityRun =
        attentionRun?.activityId === attentionActivity.id ? attentionRun : undefined;
      const attentionCount =
        activityRun?.results.filter((item) => item.status !== '通过').length ?? 0;
      result.push({
        id: `continue-${attentionActivity.id}`,
        type: '测试活动',
        title: attentionActivity.name,
        status: activityRun
          ? `${attentionCount} 项需关注 · ${attentionActivity.status}`
          : attentionActivity.status,
        cta: '查看执行',
        href: '/dashboard/tests'
      });
    }

    const longestOverdueLoan = overdueLoans.toSorted(
      (left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
    )[0];
    const overdueResource = longestOverdueLoan
      ? resources.find((resource) => resource.id === longestOverdueLoan.resourceId)
      : undefined;
    if (longestOverdueLoan && overdueResource) {
      const overdueDays = Math.max(
        1,
        Math.floor((now.getTime() - new Date(longestOverdueLoan.dueDate).getTime()) / DAY_MS)
      );
      result.push({
        id: `continue-${longestOverdueLoan.id}`,
        type: '资源',
        title: overdueResource.name,
        status: `已超期 ${overdueDays} 天 · ${longestOverdueLoan.borrower}`,
        cta: '查看资源',
        href: '/dashboard/resources'
      });
    }

    return result.slice(0, 4);
  })();

  return (
    <div className='flex flex-col gap-6'>
      <section aria-labelledby='global-search-title'>
        <h2 id='global-search-title' className='sr-only'>
          全局搜索
        </h2>
        <div className='relative'>
          <Icons.search
            className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground'
            aria-hidden='true'
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='搜索 Case、Issue、版本、测试活动或资源…'
            className='h-10 pl-9'
            aria-label='搜索 Case、Issue、版本、测试活动或资源'
          />
        </div>
        {query.trim() ? (
          <Card className='mt-2' size='sm'>
            <CardContent className='flex flex-col'>
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 ? <Separator /> : null}
                    <Link
                      href={item.href}
                      className='flex items-center gap-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
                    >
                      <div className='min-w-0 flex-1'>
                        <p className='text-xs text-muted-foreground'>{item.type}</p>
                        <p className='truncate text-sm font-medium'>{item.title}</p>
                        <p className='truncate text-xs text-muted-foreground'>{item.detail}</p>
                      </div>
                      <Icons.arrowRight
                        className='size-4 shrink-0 text-muted-foreground'
                        aria-hidden='true'
                      />
                    </Link>
                  </div>
                ))
              ) : (
                <Empty className='py-8'>
                  <EmptyHeader>
                    <EmptyMedia variant='icon'>
                      <Icons.search />
                    </EmptyMedia>
                    <EmptyTitle>未找到匹配内容</EmptyTitle>
                    <EmptyDescription>请尝试搜索业务 ID、标题或关键字。</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section aria-labelledby='modules-title' className='flex flex-col gap-4'>
        <h2 id='modules-title' className='text-base font-medium'>
          业务模块
        </h2>
        <div className='grid gap-4 md:grid-cols-2'>
          {launcherItems.map((item) => {
            const ModuleIcon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                aria-label={`进入${item.title}`}
                className='rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
              >
                <Card className='h-full transition-colors hover:bg-muted/30'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <ModuleIcon className='size-5 text-muted-foreground' aria-hidden='true' />
                      {item.title}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                    <CardAction>
                      <span className='inline-flex items-center gap-1 text-sm font-medium text-primary'>
                        进入入口 <Icons.arrowRight className='size-4' aria-hidden='true' />
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent className='grid grid-cols-2 gap-4'>
                    {item.stats.map((stat) => (
                      <div key={stat.label} className='flex flex-col gap-1'>
                        <span className='text-xs text-muted-foreground'>{stat.label}</span>
                        <span className='text-2xl font-semibold tabular-nums'>{stat.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby='continue-title' className='flex flex-col gap-4'>
        <h2 id='continue-title' className='text-base font-medium'>
          继续处理
        </h2>
        <Card>
          <CardContent className='flex flex-col'>
            {continueItems.length > 0 ? (
              continueItems.map((item, index) => (
                <div key={item.id}>
                  {index > 0 ? <Separator /> : null}
                  <div className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center'>
                    <div className='min-w-0 flex-1'>
                      <p className='text-xs text-muted-foreground'>{item.type}</p>
                      <p className='truncate text-sm font-medium'>{item.title}</p>
                      <p className='truncate text-xs text-muted-foreground'>{item.status}</p>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      nativeButton={false}
                      render={<Link href={item.href} aria-label={`${item.cta}：${item.title}`} />}
                    >
                      {item.cta}
                      <Icons.arrowRight data-icon='inline-end' />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <Empty className='py-8'>
                <EmptyHeader>
                  <EmptyMedia variant='icon'>
                    <Icons.circleCheck />
                  </EmptyMedia>
                  <EmptyTitle>暂无需继续处理的内容</EmptyTitle>
                  <EmptyDescription>可以从下方快速入口开始新工作。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby='quick-start-title' className='flex flex-col gap-3'>
        <h2 id='quick-start-title' className='text-base font-medium'>
          快速开始
        </h2>
        <div className='flex flex-wrap gap-2'>
          <Link href='/dashboard/cases/manage' className={buttonVariants({ variant: 'outline' })}>
            <Icons.messageCircle data-icon='inline-start' />提 Case
          </Link>
          <Link href='/dashboard/cases/issues' className={buttonVariants({ variant: 'outline' })}>
            <Icons.plus data-icon='inline-start' />
            新建 Issue
          </Link>
          <Link
            href='/dashboard/projects/checklists'
            className={buttonVariants({ variant: 'outline' })}
          >
            <Icons.circleCheck data-icon='inline-start' />
            开始提测检查
          </Link>
          <Link href='/dashboard/resources' className={buttonVariants({ variant: 'outline' })}>
            <Icons.calendar data-icon='inline-start' />
            资源日历
          </Link>
        </div>
      </section>
    </div>
  );
}
