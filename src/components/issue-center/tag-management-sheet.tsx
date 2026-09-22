'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { useDemoStore } from '@/store/demo-store';
import { useMemo, useState } from 'react';

export function TagManagementSheet({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tags = useDemoStore((state) => state.tags);
  const feedback = useDemoStore((state) => state.feedback);
  const issues = useDemoStore((state) => state.clusters);
  const addTag = useDemoStore((state) => state.addTag);
  const renameTag = useDemoStore((state) => state.renameTag);
  const deleteTag = useDemoStore((state) => state.deleteTag);
  const [query, setQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingName, setEditingName] = useState('');

  const visible = useMemo(
    () => tags.filter((tag) => tag.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query, tags]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>标签管理</SheetTitle>
          <SheetDescription>维护 Case 与 Issue 共用的统一标签库。</SheetDescription>
        </SheetHeader>
        <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6'>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='tag-search'>搜索标签</FieldLabel>
              <Input
                id='tag-search'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='输入标签名'
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='tag-new'>新增标签</FieldLabel>
              <div className='flex gap-2'>
                <Input
                  id='tag-new'
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  placeholder='例如：匹配'
                />
                <Button
                  type='button'
                  onClick={() => {
                    addTag(newTag);
                    setNewTag('');
                  }}
                >
                  <Icons.plus data-icon='inline-start' />
                  新增
                </Button>
              </div>
            </Field>
          </FieldGroup>

          <div>
            <div className='grid grid-cols-[minmax(120px,1fr)_80px_80px_76px] gap-3 pb-2 text-xs text-muted-foreground'>
              <span>Tag Name</span>
              <span>Cases</span>
              <span>Issues</span>
              <span className='text-right'>操作</span>
            </div>
            {visible.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>未找到标签</EmptyTitle>
                  <EmptyDescription>换个关键字或创建新标签。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              visible.map((tag, index) => {
                const caseCount = feedback.filter((item) =>
                  item.confirmedTags.includes(tag.name)
                ).length;
                const issueCount = issues.filter((item) =>
                  item.confirmedTags.includes(tag.name)
                ).length;
                const editing = editingId === tag.id;
                return (
                  <div key={tag.id}>
                    {index > 0 ? <Separator /> : null}
                    <div className='grid grid-cols-[minmax(120px,1fr)_80px_80px_76px] items-center gap-3 py-3'>
                      {editing ? (
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          aria-label={`重命名 ${tag.name}`}
                        />
                      ) : (
                        <span className='text-sm font-medium'>{tag.name}</span>
                      )}
                      <span className='text-sm tabular-nums'>{caseCount}</span>
                      <span className='text-sm tabular-nums'>{issueCount}</span>
                      <div className='flex justify-end gap-1'>
                        <Button
                          type='button'
                          size='icon-xs'
                          variant='ghost'
                          aria-label={editing ? `保存 ${tag.name}` : `重命名 ${tag.name}`}
                          onClick={() => {
                            if (editing) {
                              renameTag(tag.id, editingName);
                              setEditingId('');
                            } else {
                              setEditingId(tag.id);
                              setEditingName(tag.name);
                            }
                          }}
                        >
                          {editing ? <Icons.circleCheck /> : <Icons.pencil />}
                        </Button>
                        <Button
                          type='button'
                          size='icon-xs'
                          variant='ghost'
                          aria-label={`删除 ${tag.name}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `删除标签“${tag.name}”？\n\n删除标签仅移除标签关联，不删除 Case / Issue。`
                              )
                            )
                              deleteTag(tag.id);
                          }}
                        >
                          <Icons.trash />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
