'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function TagPicker({
  options,
  value,
  onChange,
  suggested = []
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  suggested?: string[];
}) {
  return (
    <div className='flex flex-wrap gap-2'>
      {options.map((tag) => {
        const selected = value.includes(tag);
        return (
          <Button
            type='button'
            key={tag}
            size='xs'
            variant={selected ? 'secondary' : 'outline'}
            className={cn(suggested.includes(tag) && !selected && 'border-dashed')}
            aria-pressed={selected}
            onClick={() =>
              onChange(selected ? value.filter((item) => item !== tag) : [...value, tag])
            }
          >
            {tag}
            {suggested.includes(tag) ? ' · AI' : ''}
          </Button>
        );
      })}
    </div>
  );
}
