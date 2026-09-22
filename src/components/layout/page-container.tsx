import { Heading } from '@/components/ui/heading';

export function PageContainer({
  children,
  title,
  description,
  action
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className='flex flex-1 flex-col px-4 pt-4 pb-6 md:px-6'>
      <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <Heading title={title} description={description} />
        {action ? (
          <div className='flex max-w-full flex-wrap items-center gap-2 sm:shrink-0'>{action}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
