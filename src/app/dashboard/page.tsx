'use client';

import { WorkspaceLauncher } from '@/components/dashboard/workspace-launcher';
import { Icons } from '@/components/icons';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { useDemoStore } from '@/store/demo-store';

export default function DashboardPage() {
  const resetDemo = useDemoStore((state) => state.resetDemo);

  return (
    <PageContainer
      title='Hi，乐信圣文 👋'
      action={
        <Button variant='outline' onClick={resetDemo}>
          <Icons.rotate data-icon='inline-start' />
          Reset Demo
        </Button>
      }
    >
      <WorkspaceLauncher />
    </PageContainer>
  );
}
