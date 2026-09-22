'use client';

import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const pageNames: Record<string, string> = {
  '/dashboard': '工作台',
  '/dashboard/cases': 'Issue Center',
  '/dashboard/projects': '项目空间',
  '/dashboard/tests': '测试中心',
  '/dashboard/resources': '设备与资源'
};

function getPageName(pathname: string) {
  if (pathname === '/dashboard/cases/manage') return 'Issue Center / Cases';
  if (pathname === '/dashboard/cases/issues') return 'Issue Center / Issues';
  if (pathname === '/dashboard/cases/reports') return 'Issue Center / Reports';
  return pageNames[pathname] ?? '工作台';
}

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  return (
    <header className='sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 bg-background/80 px-4 backdrop-blur-md'>
      <div className='flex min-w-0 items-center gap-2'>
        <SidebarTrigger className='-ml-1' />
        <nav aria-label='面包屑' className='flex min-w-0 items-center gap-2 text-sm'>
          <span className='hidden text-muted-foreground sm:inline'>AI Test Platform</span>
          <span className='hidden text-muted-foreground sm:inline'>/</span>
          <span className='truncate font-medium'>{getPageName(pathname)}</span>
        </nav>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label='切换明暗主题'
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {mounted && resolvedTheme === 'dark' ? <Icons.sun /> : <Icons.moon />}
        </Button>
        <Avatar size='sm'>
          <AvatarFallback>QA</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
