import { Badge } from '@/components/ui/badge';

type StatusTone = 'critical' | 'danger' | 'warning' | 'success' | 'info' | 'neutral';

const variants: Record<StatusTone, React.ComponentProps<typeof Badge>['variant']> = {
  critical: 'destructive',
  danger: 'destructive',
  warning: 'default',
  success: 'secondary',
  info: 'secondary',
  neutral: 'outline'
};

export function StatusBadge({
  tone = 'neutral',
  children
}: {
  tone?: StatusTone;
  children: React.ReactNode;
}) {
  return <Badge variant={variants[tone]}>{children}</Badge>;
}
