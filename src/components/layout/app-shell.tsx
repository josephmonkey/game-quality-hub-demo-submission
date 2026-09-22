import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <a
        href='#main-content'
        className='sr-only rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-2 focus:left-2'
      >
        跳到主要内容
      </a>
      <AppSidebar />
      <SidebarInset id='main-content' tabIndex={-1}>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
