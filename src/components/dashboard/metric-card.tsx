import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Icon } from '@/components/icons';
import Link from 'next/link';

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  href
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: Icon;
  href?: string;
}) {
  const card = (
    <Card size='sm'>
      <CardHeader className='grid grid-cols-[1fr_auto]'>
        <CardDescription>{label}</CardDescription>
        <Icon className='size-4 text-muted-foreground' aria-hidden='true' />
      </CardHeader>
      <CardContent className='flex flex-col gap-1'>
        <CardTitle className='text-2xl font-semibold tabular-nums'>{value}</CardTitle>
        <p className='text-xs text-muted-foreground'>{detail}</p>
      </CardContent>
    </Card>
  );
  return href ? (
    <Link
      href={href}
      className='rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
    >
      {card}
    </Link>
  ) : (
    card
  );
}
