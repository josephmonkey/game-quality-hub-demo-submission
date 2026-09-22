import '@/styles/globals.css';
import { fontVariables } from '@/components/themes/font.config';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
  title: {
    default: '测试中台 Demo',
    template: '%s · 测试中台 Demo'
  },
  description: '面向游戏项目的质量管理中台交互 Demo'
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#292824' }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='zh-CN' suppressHydrationWarning data-theme='claude'>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontVariables)}>
        <ThemeProvider attribute='class' defaultTheme='light' enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
