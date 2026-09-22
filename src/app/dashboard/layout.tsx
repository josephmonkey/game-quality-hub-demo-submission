import { AppShell } from '@/components/layout/app-shell';
import { StoreHydrator } from '@/components/providers/store-hydrator';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Test Platform',
  robots: { index: false, follow: false }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StoreHydrator />
      <AppShell>{children}</AppShell>
    </>
  );
}
