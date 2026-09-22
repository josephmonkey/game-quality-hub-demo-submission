'use client';

import { useMemo, useState } from 'react';

import { StatusBadge } from '@/components/dashboard/status-badge';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Resource, ResourceLoan, ResourceReservation } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';

type ResourceType = Resource['type'];
type ActionMode = 'reserve' | 'borrow' | 'register' | null;
type AvailabilityStatus = '可用' | '预约' | '占用' | '离线';
type ResourceRow = {
  resource: Resource;
  status: AvailabilityStatus;
  loan?: ResourceLoan;
  reservation?: ResourceReservation;
};

const CURRENT_USER = '当前演示用户';
const DEMO_TODAY = '2026-09-21';
const STATUSES: AvailabilityStatus[] = ['可用', '预约', '占用', '离线'];
const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)} 月 ${Number(day)} 日`;
}

function daysBetween(start: string, end: string) {
  return Math.floor((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

function borrowedLabel(borrowedAt: string) {
  const days = daysBetween(borrowedAt, DEMO_TODAY);
  return days === 0 ? '今天借出' : `已借用 ${days} 天`;
}

function dueLabel(dueDate: string) {
  const distance = daysBetween(DEMO_TODAY, dueDate);
  if (distance < 0) return `已超期 ${Math.abs(distance)} 天`;
  if (distance === 0) return '今天到期';
  if (distance === 1) return '明天到期';
  return `还有 ${distance} 天`;
}

function availabilityLabel(available: number, total: number) {
  if (!total || available === 0) return '已满';
  const ratio = available / total;
  if (ratio >= 0.7) return '充足';
  if (ratio >= 0.45) return '正常';
  if (ratio >= 0.2) return '紧张';
  return '严重紧张';
}

function resourceGroup(resource: Resource) {
  if (resource.type === '测试账号') {
    if (resource.tags.some((tag) => tag.includes('高等级'))) return '高等级账号';
    if (resource.tags.some((tag) => tag.includes('付费'))) return '付费账号';
    if (resource.tags.some((tag) => tag.includes('新用户'))) return '新用户账号';
    if (resource.tags.some((tag) => tag.includes('回流'))) return '回流账号';
    return '全角色账号';
  }
  const model = resource.model ?? '';
  if (model.includes('Pixel')) return 'Pixel 系列';
  if (model.includes('Galaxy S')) return 'Galaxy S 系列';
  if (model.includes('Fold') || model.includes('Flip')) return 'Fold / Flip';
  if (/iPhone 1[56]/.test(model)) return 'iPhone 15 / 16';
  if (/iPhone 1[34]/.test(model)) return 'iPhone 13 / 14';
  if (model.includes('iPad')) return 'iPad';
  return '其他 Android';
}

function isReserved(reservation: ResourceReservation, date: string) {
  return reservation.startDate <= date && date <= reservation.endDate;
}

function isLoaned(loan: ResourceLoan, date: string) {
  if (date < loan.borrowedAt) return false;
  return loan.returnedAt ? date < loan.returnedAt : true;
}

function statusCounts(rows: ResourceRow[]) {
  return STATUSES.reduce<Record<AvailabilityStatus, number>>(
    (result, status) => ({
      ...result,
      [status]: rows.filter((row) => row.status === status).length
    }),
    { 可用: 0, 预约: 0, 占用: 0, 离线: 0 }
  );
}

function segmentClass(status: AvailabilityStatus) {
  if (status === '可用') return 'bg-primary';
  if (status === '预约') return 'bg-muted-foreground/45';
  if (status === '占用') return 'bg-foreground/70';
  return 'bg-destructive/65';
}

function StatusDistribution({ counts }: { counts: Record<AvailabilityStatus, number> }) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex h-2 overflow-hidden rounded-full bg-muted' aria-label='资源状态分布'>
        {STATUSES.map((status) =>
          counts[status] ? (
            <span
              key={status}
              className={segmentClass(status)}
              style={{ width: `${(counts[status] / total) * 100}%` }}
              title={`${status} ${counts[status]}`}
            />
          ) : null
        )}
      </div>
      <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        {STATUSES.map((status) => (
          <span key={status} className='flex items-center gap-1.5'>
            <span className={cn('size-2 rounded-full', segmentClass(status))} />
            {status} <span className='tabular-nums'>{counts[status]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ActionSheet({
  mode,
  onOpenChange,
  resources,
  selectedDate,
  resourceType
}: {
  mode: ActionMode;
  onOpenChange: (open: boolean) => void;
  resources: Resource[];
  selectedDate: string;
  resourceType: ResourceType;
}) {
  const createReservation = useDemoStore((state) => state.createResourceReservation);
  const borrowResource = useDemoStore((state) => state.borrowResource);
  const registerResource = useDemoStore((state) => state.registerResource);
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? '');
  const [person, setPerson] = useState(CURRENT_USER);
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(selectedDate);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState(resourceType === '设备' ? 'Android' : 'Global');
  const [model, setModel] = useState('');
  const [systemVersion, setSystemVersion] = useState('');
  const [tags, setTags] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const title = mode === 'reserve' ? '预约资源' : mode === 'borrow' ? '借出登记' : '登记资源';

  function submit() {
    if (mode === 'reserve') {
      const result = createReservation({ resourceId, user: person, purpose, startDate, endDate });
      setMessage({ ok: result.ok, text: result.message });
      return;
    }
    if (mode === 'borrow') {
      const result = borrowResource({
        resourceId,
        borrower: person,
        purpose,
        borrowedAt: startDate,
        dueDate: endDate
      });
      setMessage({ ok: result.ok, text: result.message });
      return;
    }
    if (!name.trim()) {
      setMessage({ ok: false, text: '请填写资源名称。' });
      return;
    }
    registerResource({
      type: resourceType,
      name: name.trim(),
      platform,
      model: resourceType === '设备' ? model.trim() : undefined,
      systemVersion: resourceType === '设备' ? systemVersion.trim() : undefined,
      status: '可用',
      tags: tags
        .split(/[、,，/]/)
        .map((item) => item.trim())
        .filter(Boolean)
    });
    setMessage({ ok: true, text: `${name.trim()} 已登记。` });
    setName('');
  }

  return (
    <Sheet open={mode !== null} onOpenChange={onOpenChange}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {mode === 'reserve'
              ? '按日期预约共享资源；重叠区间会直接拦截。'
              : mode === 'borrow'
                ? '登记实际领取记录，并同步更新占用状态。'
                : `新增${resourceType}台账。`}
          </SheetDescription>
        </SheetHeader>
        <div className='px-4'>
          {mode === 'register' ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='resource-name'>资源名称</FieldLabel>
                <Input
                  id='resource-name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={
                    resourceType === '设备' ? '例如 Pixel 9 #161' : '例如 Global 高等级 #121'
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='resource-platform'>
                  {resourceType === '设备' ? '平台' : '区域'}
                </FieldLabel>
                <Select value={platform} onValueChange={(value) => value && setPlatform(value)}>
                  <SelectTrigger id='resource-platform' className='w-full'>
                    <SelectValue>{platform}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(resourceType === '设备' ? ['Android', 'iOS'] : ['Global', 'CN']).map(
                        (item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        )
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              {resourceType === '设备' ? (
                <>
                  <Field>
                    <FieldLabel htmlFor='resource-model'>型号</FieldLabel>
                    <Input
                      id='resource-model'
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      placeholder='Pixel 9'
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='resource-system'>系统版本</FieldLabel>
                    <Input
                      id='resource-system'
                      value={systemVersion}
                      onChange={(event) => setSystemVersion(event.target.value)}
                      placeholder='Android 16'
                    />
                  </Field>
                </>
              ) : null}
              <Field>
                <FieldLabel htmlFor='resource-tags'>用途标签</FieldLabel>
                <Input
                  id='resource-tags'
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder='用逗号分隔'
                />
                <FieldDescription>例如：主力机型、NFC、高等级、付费账号</FieldDescription>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='action-resource'>资源</FieldLabel>
                <Select value={resourceId} onValueChange={(value) => value && setResourceId(value)}>
                  <SelectTrigger id='action-resource' className='w-full'>
                    <SelectValue>
                      {resources.find((item) => item.id === resourceId)?.name ?? '选择资源'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {resources.map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name} · {resource.status}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor='action-person'>
                  {mode === 'reserve' ? '预约人' : '借用人'}
                </FieldLabel>
                <Input
                  id='action-person'
                  value={person}
                  onChange={(event) => setPerson(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='action-purpose'>用途</FieldLabel>
                <Input
                  id='action-purpose'
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder='例如 Android 16 登录回归'
                />
              </Field>
              <div className='grid grid-cols-2 gap-4'>
                <Field>
                  <FieldLabel htmlFor='action-start'>
                    {mode === 'reserve' ? '开始日期' : '借出日期'}
                  </FieldLabel>
                  <Input
                    id='action-start'
                    type='date'
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='action-end'>
                    {mode === 'reserve' ? '结束日期' : '预计归还'}
                  </FieldLabel>
                  <Input
                    id='action-end'
                    type='date'
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </Field>
              </div>
            </FieldGroup>
          )}
          {message ? (
            <Alert variant={message.ok ? 'default' : 'destructive'} className='mt-5'>
              <Icons.info />
              <AlertTitle>{message.ok ? '操作成功' : '无法完成'}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <SheetFooter>
          <Button onClick={submit}>{title}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ResourceGroupSheet({
  group,
  date,
  rows,
  onClose,
  onReserve
}: {
  group: string | null;
  date: string;
  rows: ResourceRow[];
  onClose: () => void;
  onReserve: (resourceId: string) => void;
}) {
  const [status, setStatus] = useState('全部');
  const [query, setQuery] = useState('');
  const visible = rows.filter(
    (row) =>
      (status === '全部' || row.status === status) &&
      [
        row.resource.name,
        row.resource.model,
        row.resource.systemVersion,
        row.resource.tags.join(' ')
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );
  return (
    <Sheet open={Boolean(group)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>
            {formatDate(date)} · {group}
          </SheetTitle>
          <SheetDescription>
            共 {rows.length} 个资源，可按状态、型号、系统版本或标签定位。
          </SheetDescription>
        </SheetHeader>
        <div className='flex flex-col gap-4 px-4'>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='搜索编号、型号、系统版本或标签'
          />
          <ToggleGroup
            value={[status]}
            onValueChange={(value) => setStatus(value[0] ?? status)}
            variant='outline'
            spacing={0}
            className='flex-wrap justify-start'
          >
            {['全部', ...STATUSES].map((item) => (
              <ToggleGroupItem key={item} value={item}>
                {item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div>
            {visible.map((row, index) => {
              const overdue = Boolean(
                row.loan && !row.loan.returnedAt && row.loan.dueDate < DEMO_TODAY
              );
              return (
                <div key={row.resource.id}>
                  <div className='flex items-start justify-between gap-3 py-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-medium'>{row.resource.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        {[
                          row.resource.model ?? row.resource.platform,
                          row.resource.systemVersion,
                          row.resource.tags.join(' / ')
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {row.loan ? (
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {row.loan.borrower} · {row.loan.purpose} ·{' '}
                          {borrowedLabel(row.loan.borrowedAt)} · 应还 {formatDate(row.loan.dueDate)}
                        </p>
                      ) : null}
                      {row.reservation && !row.loan ? (
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {row.reservation.user} · {row.reservation.purpose} ·{' '}
                          {row.reservation.startDate} 至 {row.reservation.endDate}
                        </p>
                      ) : null}
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                      <StatusBadge
                        tone={
                          overdue
                            ? 'danger'
                            : row.status === '可用'
                              ? 'success'
                              : row.status === '离线'
                                ? 'neutral'
                                : 'warning'
                        }
                      >
                        {overdue && row.loan ? dueLabel(row.loan.dueDate) : row.status}
                      </StatusBadge>
                      {row.status === '可用' ? (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onReserve(row.resource.id)}
                        >
                          预约
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {index < visible.length - 1 ? <Separator /> : null}
                </div>
              );
            })}
            {!visible.length ? (
              <p className='py-8 text-center text-sm text-muted-foreground'>没有匹配的资源。</p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ResourceSchedulingCenter() {
  const resources = useDemoStore((state) => state.resources);
  const reservations = useDemoStore((state) => state.resourceReservations);
  const loans = useDemoStore((state) => state.resourceLoans);
  const returnResource = useDemoStore((state) => state.returnResource);
  const [resourceType, setResourceType] = useState<ResourceType>('设备');
  const [category, setCategory] = useState('Android');
  const [monthCursor, setMonthCursor] = useState({ year: 2026, month: 8 });
  const [selectedDate, setSelectedDate] = useState('2026-09-24');
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reservedResourceId, setReservedResourceId] = useState<string | null>(null);
  const [overdueType, setOverdueType] = useState('全部');
  const [overduePlatform, setOverduePlatform] = useState('全部');
  const [overdueBorrower, setOverdueBorrower] = useState('全部');

  const categories =
    resourceType === '设备' ? ['全部', 'iOS', 'Android'] : ['全部', 'Global', 'CN'];
  const filteredResources = useMemo(
    () =>
      resources.filter(
        (resource) =>
          resource.type === resourceType && (category === '全部' || resource.platform === category)
      ),
    [category, resourceType, resources]
  );
  const activeLoans = useMemo(() => loans.filter((loan) => !loan.returnedAt), [loans]);

  function rowFor(resource: Resource, date: string): ResourceRow {
    const loan = loans.find((item) => item.resourceId === resource.id && isLoaned(item, date));
    const reservation = reservations.find(
      (item) => item.resourceId === resource.id && isReserved(item, date)
    );
    const status: AvailabilityStatus =
      resource.status === '离线' ? '离线' : loan ? '占用' : reservation ? '预约' : '可用';
    return { resource, status, loan, reservation };
  }

  const selectedRows = filteredResources.map((resource) => rowFor(resource, selectedDate));
  const selectedCounts = statusCounts(selectedRows);
  const selectedOverdue = selectedRows.filter(
    (row) => row.loan && !row.loan.returnedAt && row.loan.dueDate < selectedDate
  ).length;
  const groupMap = new Map<string, ResourceRow[]>();
  for (const row of selectedRows) {
    const key = resourceGroup(row.resource);
    groupMap.set(key, [...(groupMap.get(key) ?? []), row]);
  }
  const groups = [...groupMap]
    .map(([name, rows]) => ({ name, rows }))
    .toSorted((a, b) => b.rows.length - a.rows.length);
  const groupRows = groups.find((group) => group.name === selectedGroup)?.rows ?? [];
  const mine = activeLoans.filter((loan) => loan.borrower === CURRENT_USER);
  const overdue = activeLoans
    .map((loan) => ({
      loan,
      resource: resources.find((resource) => resource.id === loan.resourceId)
    }))
    .filter(
      (item): item is { loan: ResourceLoan; resource: Resource } =>
        Boolean(item.resource) && item.loan.dueDate < DEMO_TODAY
    )
    .toSorted(
      (a, b) => daysBetween(b.loan.dueDate, DEMO_TODAY) - daysBetween(a.loan.dueDate, DEMO_TODAY)
    );
  const overdueFiltered = overdue.filter(
    ({ loan, resource }) =>
      (overdueType === '全部' || resource.type === overdueType) &&
      (overduePlatform === '全部' || resource.platform === overduePlatform) &&
      (overdueBorrower === '全部' || loan.borrower === overdueBorrower)
  );
  const queryResults = query.trim()
    ? resources
        .filter((resource) => {
          const active = activeLoans.find((loan) => loan.resourceId === resource.id);
          return [
            resource.name,
            resource.model,
            resource.systemVersion,
            resource.platform,
            resource.tags.join(' '),
            active?.borrower,
            active?.purpose
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase());
        })
        .slice(0, 12)
    : [];
  const firstDay = new Date(monthCursor.year, monthCursor.month, 1);
  const daysInMonth = new Date(monthCursor.year, monthCursor.month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;
  const calendarDays = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ];

  function switchType(next: ResourceType) {
    setResourceType(next);
    setCategory(next === '设备' ? 'Android' : 'Global');
  }

  function moveMonth(offset: number) {
    const next = new Date(monthCursor.year, monthCursor.month + offset, 1);
    setMonthCursor({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(toDateKey(next.getFullYear(), next.getMonth(), 1));
  }

  function downloadOverdue(format: 'csv' | 'md') {
    const header = [
      '资源名称',
      '资源类型',
      '平台',
      '借用人',
      '用途',
      '借出日期',
      '预计归还日期',
      '已借用天数',
      '超期天数'
    ];
    const rows = overdueFiltered.map(({ loan, resource }) => [
      resource.name,
      resource.type,
      resource.platform,
      loan.borrower,
      loan.purpose,
      loan.borrowedAt,
      loan.dueDate,
      String(daysBetween(loan.borrowedAt, DEMO_TODAY)),
      String(daysBetween(loan.dueDate, DEMO_TODAY))
    ]);
    const content =
      format === 'csv'
        ? `\uFEFF${[header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')}`
        : `## 超期资源催还清单\n\n| ${header.join(' | ')} |\n|${header.map(() => '---').join('|')}|\n${rows.map((row) => `| ${row.map((cell, index) => (index >= 7 ? `${cell} 天` : cell)).join(' | ')} |`).join('\n')}`;
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === 'csv' ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8'
      })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `resource-overdue-${DEMO_TODAY}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex flex-wrap items-center gap-2'>
              <ToggleGroup
                value={[resourceType]}
                onValueChange={(value) =>
                  switchType((value[0] as ResourceType | undefined) ?? resourceType)
                }
                variant='outline'
                spacing={0}
              >
                <ToggleGroupItem value='设备'>设备</ToggleGroupItem>
                <ToggleGroupItem value='测试账号'>测试账号</ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup
                value={[category]}
                onValueChange={(value) => setCategory(value[0] ?? category)}
                variant='outline'
                spacing={0}
              >
                {categories.map((item) => (
                  <ToggleGroupItem key={item} value={item}>
                    {item}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button onClick={() => setActionMode('reserve')}>
                <Icons.calendar data-icon='inline-start' />
                预约资源
              </Button>
              <Button variant='outline' onClick={() => setActionMode('borrow')}>
                <Icons.user data-icon='inline-start' />
                借出登记
              </Button>
              <Button variant='outline' onClick={() => setActionMode('register')}>
                <Icons.plus data-icon='inline-start' />
                登记资源
              </Button>
            </div>
          </div>
          <div className='relative'>
            <Icons.search
              className='absolute top-2.5 left-3 size-4 text-muted-foreground'
              aria-hidden='true'
            />
            <Input
              className='pl-9'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='全局搜索资源、型号、账号、借用人或用途'
            />
            {query.trim() ? (
              <Card className='absolute top-11 right-0 left-0 z-20 max-h-96 overflow-y-auto shadow-lg'>
                <CardContent className='py-2'>
                  {queryResults.map((resource, index) => {
                    const loan = activeLoans.find((item) => item.resourceId === resource.id);
                    const future = reservations
                      .filter(
                        (item) => item.resourceId === resource.id && item.startDate >= DEMO_TODAY
                      )
                      .toSorted((a, b) => a.startDate.localeCompare(b.startDate))[0];
                    const overdueNow = Boolean(loan && loan.dueDate < DEMO_TODAY);
                    return (
                      <div key={resource.id}>
                        <div className='flex items-start justify-between gap-4 py-3'>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>{resource.name}</p>
                            <p className='text-xs text-muted-foreground'>
                              {resource.type} · {resource.platform} ·{' '}
                              {[resource.model, resource.systemVersion, resource.tags.join(' / ')]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                            <p className='mt-1 text-sm'>
                              {loan
                                ? `${loan.borrower} · ${loan.purpose} · ${borrowedLabel(loan.borrowedAt)} · 应还 ${formatDate(loan.dueDate)}`
                                : resource.status === '离线'
                                  ? '当前离线'
                                  : '当前无人占用'}
                            </p>
                            {future ? (
                              <p className='text-xs text-muted-foreground'>
                                未来预约：{future.user} · {future.startDate} 至 {future.endDate}
                              </p>
                            ) : null}
                          </div>
                          <StatusBadge
                            tone={
                              overdueNow
                                ? 'danger'
                                : loan
                                  ? 'warning'
                                  : resource.status === '可用'
                                    ? 'success'
                                    : 'neutral'
                            }
                          >
                            {overdueNow && loan
                              ? dueLabel(loan.dueDate)
                              : loan
                                ? '占用'
                                : resource.status}
                          </StatusBadge>
                        </div>
                        {index < queryResults.length - 1 ? <Separator /> : null}
                      </div>
                    );
                  })}
                  {!queryResults.length ? (
                    <p className='py-4 text-center text-sm text-muted-foreground'>
                      没有匹配的资源。
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.8fr)]'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <CardTitle>资源容量月历</CardTitle>
                  <CardDescription>先比较每日容量，再查看资源分组与具体资源。</CardDescription>
                </div>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label='上个月'
                    onClick={() => moveMonth(-1)}
                  >
                    <Icons.chevronLeft />
                  </Button>
                  <span className='min-w-28 text-center text-sm font-medium tabular-nums'>
                    {monthCursor.year} 年 {monthCursor.month + 1} 月
                  </span>
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label='下个月'
                    onClick={() => moveMonth(1)}
                  >
                    <Icons.chevronRight />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                <span>容量条：</span>
                {STATUSES.map((status) => (
                  <span key={status} className='flex items-center gap-1.5'>
                    <span className={cn('size-2 rounded-full', segmentClass(status))} />
                    {status}
                  </span>
                ))}
              </div>
              <div className='overflow-x-auto'>
                <div className='grid min-w-175 grid-cols-7 border-t border-l'>
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className='border-r border-b px-1 py-2 text-center text-xs text-muted-foreground'
                    >
                      {day}
                    </div>
                  ))}
                  {calendarDays.map((day, index) => {
                    if (day === null)
                      return (
                        <div
                          key={`blank-${index}`}
                          className='min-h-28 border-r border-b bg-muted/20'
                        />
                      );
                    const date = toDateKey(monthCursor.year, monthCursor.month, day);
                    const counts = statusCounts(
                      filteredResources.map((resource) => rowFor(resource, date))
                    );
                    const ratio = filteredResources.length
                      ? Math.round((counts.可用 / filteredResources.length) * 100)
                      : 0;
                    const label = availabilityLabel(counts.可用, filteredResources.length);
                    return (
                      <button
                        key={date}
                        type='button'
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          'min-h-28 border-r border-b p-2 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                          selectedDate === date && 'bg-muted ring-1 ring-inset ring-foreground/20',
                          counts.可用 === 0 && filteredResources.length > 0 && 'bg-destructive/5'
                        )}
                      >
                        <span className='text-sm font-medium tabular-nums'>{day}</span>
                        <span className='mt-2 block text-sm font-medium tabular-nums'>
                          {counts.可用} 可借
                        </span>
                        <span className='block text-xs text-muted-foreground'>
                          / {filteredResources.length}
                        </span>
                        <div className='mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted'>
                          {STATUSES.map((status) =>
                            counts[status] ? (
                              <span
                                key={status}
                                className={segmentClass(status)}
                                style={{
                                  width: `${(counts[status] / filteredResources.length) * 100}%`
                                }}
                              />
                            ) : null
                          )}
                        </div>
                        <span
                          className={cn(
                            'mt-1 block text-xs text-muted-foreground',
                            counts.可用 === 0 && 'text-destructive'
                          )}
                        >
                          {ratio}% 可用
                          {['紧张', '严重紧张', '已满'].includes(label) ? ` · ${label}` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {formatDate(selectedDate)} · {category === '全部' ? resourceType : category}
              </CardTitle>
              <CardDescription>
                {filteredResources.length} 个资源，超期是占用资源的异常子集。
              </CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-5'>
              <StatusDistribution counts={selectedCounts} />
              <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm'>
                <span className='text-muted-foreground'>可用</span>
                <span className='text-right font-medium tabular-nums'>{selectedCounts.可用}</span>
                <span className='text-muted-foreground'>预约</span>
                <span className='text-right font-medium tabular-nums'>{selectedCounts.预约}</span>
                <span className='text-muted-foreground'>占用</span>
                <span className='text-right font-medium tabular-nums'>{selectedCounts.占用}</span>
                <span className='pl-3 text-xs text-muted-foreground'>其中超期</span>
                <span className='text-right text-xs text-destructive tabular-nums'>
                  {selectedOverdue}
                </span>
                <span className='text-muted-foreground'>离线</span>
                <span className='text-right font-medium tabular-nums'>{selectedCounts.离线}</span>
              </div>
              <Separator />
              <div className='flex flex-col gap-1'>
                <p className='mb-2 text-sm font-medium'>资源分组</p>
                {groups.map((group) => {
                  const available = group.rows.filter((row) => row.status === '可用').length;
                  return (
                    <Button
                      key={group.name}
                      variant='ghost'
                      className='h-auto justify-start px-2 py-2'
                      onClick={() => setSelectedGroup(group.name)}
                    >
                      <div className='w-full text-left'>
                        <div className='flex justify-between gap-3 text-sm'>
                          <span>{group.name}</span>
                          <span className='tabular-nums'>
                            {available} / {group.rows.length} 可用
                          </span>
                        </div>
                        <div className='mt-2 h-1 overflow-hidden rounded-full bg-muted'>
                          <div
                            className='h-full bg-primary'
                            style={{
                              width: `${group.rows.length ? (available / group.rows.length) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]'>
          <Card>
            <CardHeader>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <CardTitle>我的占用</CardTitle>
                  <CardDescription>不跟随顶部筛选，显示当前持有的全部设备和账号。</CardDescription>
                </div>
                <span className='text-sm text-muted-foreground'>当前 {mine.length} 个</span>
              </div>
            </CardHeader>
            <CardContent>
              {mine.map((loan, index) => {
                const resource = resources.find((item) => item.id === loan.resourceId);
                const isOverdue = loan.dueDate < DEMO_TODAY;
                return (
                  <div key={loan.id}>
                    <div className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='text-sm font-medium'>{resource?.name ?? loan.resourceId}</p>
                          {isOverdue ? (
                            <StatusBadge tone='danger'>{dueLabel(loan.dueDate)}</StatusBadge>
                          ) : null}
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          {resource?.type} · {resource?.platform} · {loan.purpose}
                        </p>
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {formatDate(loan.borrowedAt)}借出 · {borrowedLabel(loan.borrowedAt)}
                        </p>
                        <p
                          className={cn(
                            'mt-1 text-sm tabular-nums',
                            isOverdue && 'text-destructive'
                          )}
                        >
                          预计归还：{formatDate(loan.dueDate)} · {dueLabel(loan.dueDate)}
                        </p>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => returnResource(loan.resourceId, DEMO_TODAY)}
                      >
                        归还
                      </Button>
                    </div>
                    {index < mine.length - 1 ? <Separator /> : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>我的资源信用</CardTitle>
              <CardDescription>Demo 固定示例，不参与真实权限判断。</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <div>
                <span className='text-3xl font-semibold tabular-nums'>86</span>
                <span className='ml-2 text-sm text-muted-foreground'>良好</span>
              </div>
              <div>
                <div className='flex justify-between text-sm'>
                  <span>当前占用</span>
                  <span className='tabular-nums'>{mine.length} / 5</span>
                </div>
                <div className='mt-2 h-2 overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full bg-primary'
                    style={{ width: `${Math.min(100, (mine.length / 5) * 100)}%` }}
                  />
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                按时归还有助于保持良好信用；此处不实现动态积分或权限限制。
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <CardTitle>超期资源 {overdueFiltered.length}</CardTitle>
                <CardDescription>默认按超期天数从高到低；导出内容遵循当前筛选。</CardDescription>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => downloadOverdue('csv')}
                  disabled={!overdueFiltered.length}
                >
                  <Icons.download data-icon='inline-start' />
                  CSV
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => downloadOverdue('md')}
                  disabled={!overdueFiltered.length}
                >
                  <Icons.fileText data-icon='inline-start' />
                  Markdown
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <div className='flex flex-wrap gap-2'>
              <Select value={overdueType} onValueChange={(value) => value && setOverdueType(value)}>
                <SelectTrigger className='w-36'>
                  <SelectValue>{overdueType}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {['全部', '设备', '测试账号'].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={overduePlatform}
                onValueChange={(value) => value && setOverduePlatform(value)}
              >
                <SelectTrigger className='w-36'>
                  <SelectValue>{overduePlatform}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {['全部', 'Android', 'iOS', 'Global', 'CN'].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={overdueBorrower}
                onValueChange={(value) => value && setOverdueBorrower(value)}
              >
                <SelectTrigger className='w-36'>
                  <SelectValue>{overdueBorrower}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {['全部', ...new Set(overdue.map(({ loan }) => loan.borrower))].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-200 text-left text-sm'>
                <thead>
                  <tr className='border-b text-xs text-muted-foreground'>
                    <th className='py-2 pr-4 font-normal'>资源</th>
                    <th className='px-3 py-2 font-normal'>类型 / 平台</th>
                    <th className='px-3 py-2 font-normal'>借用人</th>
                    <th className='px-3 py-2 font-normal'>用途</th>
                    <th className='px-3 py-2 font-normal'>已借用</th>
                    <th className='px-3 py-2 font-normal'>应还</th>
                    <th className='py-2 pl-3 text-right font-normal'>超期</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueFiltered.map(({ loan, resource }) => (
                    <tr key={loan.id} className='border-b last:border-b-0'>
                      <td className='py-3 pr-4 font-medium'>{resource.name}</td>
                      <td className='px-3 py-3 text-muted-foreground'>
                        {resource.type} · {resource.platform}
                      </td>
                      <td className='px-3 py-3'>{loan.borrower}</td>
                      <td className='px-3 py-3 text-muted-foreground'>{loan.purpose}</td>
                      <td className='px-3 py-3 tabular-nums'>
                        {daysBetween(loan.borrowedAt, DEMO_TODAY)} 天
                      </td>
                      <td className='px-3 py-3 text-destructive tabular-nums'>
                        {formatDate(loan.dueDate)}
                      </td>
                      <td className='py-3 pl-3 text-right'>
                        <StatusBadge tone='danger'>
                          {daysBetween(loan.dueDate, DEMO_TODAY)} 天
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <ResourceGroupSheet
        group={selectedGroup}
        date={selectedDate}
        rows={groupRows}
        onClose={() => setSelectedGroup(null)}
        onReserve={(resourceId) => {
          setReservedResourceId(resourceId);
          setSelectedGroup(null);
          setActionMode('reserve');
        }}
      />
      <ActionSheet
        key={`${actionMode}-${resourceType}-${selectedDate}-${reservedResourceId ?? ''}`}
        mode={actionMode}
        onOpenChange={(open) => {
          if (!open) {
            setActionMode(null);
            setReservedResourceId(null);
          }
        }}
        resources={
          reservedResourceId
            ? resources.filter((resource) => resource.id === reservedResourceId)
            : resources.filter((resource) => resource.type === resourceType)
        }
        selectedDate={selectedDate}
        resourceType={resourceType}
      />
    </>
  );
}
