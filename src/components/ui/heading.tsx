interface HeadingProps {
  title: string;
  description?: string;
}

export function Heading({ title, description }: HeadingProps) {
  return (
    <div className='flex max-w-3xl flex-col gap-1'>
      <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
      {description ? (
        <p className='text-sm leading-6 text-muted-foreground'>{description}</p>
      ) : null}
    </div>
  );
}
