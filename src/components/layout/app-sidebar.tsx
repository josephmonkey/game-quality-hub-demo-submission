'use client';

import { Icons, type Icon } from '@/components/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation: Array<{ href: string; label: string; icon: Icon }> = [
  { href: '/dashboard/resources', label: '设备与资源', icon: Icons.package }
];
const testNavigation = [
  { href: '/dashboard/tests', label: '用例库' },
  { href: '/dashboard/tests/runs', label: '测试执行' },
  { href: '/dashboard/tests/reports', label: '测试报告' }
];
const projectNavigation = [
  { href: '/dashboard/projects', label: 'Overview' },
  { href: '/dashboard/projects/checklists', label: '提测检查' }
];
const issueNavigation = [
  { href: '/dashboard/cases', label: 'Overview' },
  { href: '/dashboard/cases/manage', label: 'Cases' },
  { href: '/dashboard/cases/issues', label: 'Issues' },
  { href: '/dashboard/cases/reports', label: 'Reports' }
];

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' render={<div />}>
              <span className='flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md'>
                <Icons.platform aria-hidden='true' />
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-sm font-medium'>AI Test Platform</span>
                <span className='block truncate text-xs font-normal text-muted-foreground'>
                  Local Demo
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={
                    <Link
                      href='/dashboard'
                      aria-label='工作台'
                      onClick={() => setOpenMobile(false)}
                    />
                  }
                  tooltip='工作台'
                  isActive={pathname === '/dashboard'}
                >
                  <Icons.kanban aria-hidden='true' />
                  <span>工作台</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<div />}
                  tooltip='Issue Center'
                  isActive={pathname.startsWith('/dashboard/cases')}
                >
                  <Icons.chat aria-hidden='true' />
                  <span>Issue Center</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {issueNavigation.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            onClick={() => setOpenMobile(false)}
                          />
                        }
                        isActive={pathname === item.href}
                      >
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<div />}
                  tooltip='版本管理'
                  isActive={pathname.startsWith('/dashboard/projects')}
                >
                  <Icons.laptop aria-hidden='true' />
                  <span>版本管理</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {projectNavigation.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            onClick={() => setOpenMobile(false)}
                          />
                        }
                        isActive={pathname === item.href}
                      >
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<div />}
                  tooltip='测试中心'
                  isActive={pathname.startsWith('/dashboard/tests')}
                >
                  <Icons.galleryVerticalEnd aria-hidden='true' />
                  <span>测试中心</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  {testNavigation.map((item) => (
                    <SidebarMenuSubItem key={item.href}>
                      <SidebarMenuSubButton
                        render={
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            onClick={() => setOpenMobile(false)}
                          />
                        }
                        isActive={pathname === item.href}
                      >
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </SidebarMenuItem>
              {navigation.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.href}
                          aria-label={item.label}
                          onClick={() => setOpenMobile(false)}
                        />
                      }
                      tooltip={item.label}
                      isActive={active}
                    >
                      <Icon aria-hidden='true' />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className='px-2 text-xs leading-5 text-muted-foreground group-data-[collapsible=icon]:hidden'>
          外部渠道、AI 与自动化执行均为模拟
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
