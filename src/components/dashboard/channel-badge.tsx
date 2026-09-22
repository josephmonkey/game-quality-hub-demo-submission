import { Badge } from '@/components/ui/badge';
import type { RawFeedback } from '@/lib/domain';
import type { CSSProperties } from 'react';

const channelColors: Record<RawFeedback['channel'], string> = {
  Discord: '#5865f2',
  Reddit: '#ff4500',
  X: '#3f4348',
  YouTube: '#ff0033',
  Telegram: '#229ed9',
  Internal: '#71717a',
  Other: '#71717a'
};

export function ChannelBadge({ channel }: { channel: RawFeedback['channel'] }) {
  return (
    <Badge
      variant='outline'
      className='border-[color-mix(in_oklab,var(--channel-brand)_40%,var(--border))] bg-[color-mix(in_oklab,var(--channel-brand)_10%,var(--background))] text-[color-mix(in_oklab,var(--channel-brand)_72%,var(--foreground))]'
      style={{ '--channel-brand': channelColors[channel] } as CSSProperties}
    >
      {channel}
    </Badge>
  );
}
