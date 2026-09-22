'use client';

import { TagPicker } from '@/components/issue-center/tag-picker';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetDescription,
  SheetTitle
} from '@/components/ui/sheet';
import type { IssueClassification, Priority, Severity } from '@/lib/domain';
import { useDemoStore } from '@/store/demo-store';
import { useEffect, useState } from 'react';

const classifications: Exclude<IssueClassification, 'Non Issue'>[] = [
  'Pending',
  'Bug',
  'Feature',
  'Improvement'
];
const priorities: Priority[] = ['P0', 'P1', 'P2', 'P3'];
const severities: Severity[] = ['致命', '严重', '一般', '轻微'];

export function CreateIssueSheet({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const projects = useDemoStore((state) => state.projects);
  const tags = useDemoStore((state) => state.tags);
  const createStandaloneIssue = useDemoStore((state) => state.createStandaloneIssue);
  const createBugIssue = useDemoStore((state) => state.createBugIssue);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [classification, setClassification] =
    useState<Exclude<IssueClassification, 'Non Issue'>>('Pending');
  const [priority, setPriority] = useState<Priority>('P2');
  const [owner, setOwner] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [module, setModule] = useState('');
  const [severity, setSeverity] = useState<Severity>('一般');
  const [reproduction, setReproduction] = useState('');
  const [screenshotNote, setScreenshotNote] = useState('');

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setClassification('Pending'), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  function submit() {
    if (classification === 'Bug') {
      const id = createBugIssue({
        projectId,
        title,
        summary,
        priority,
        tags: selectedTags,
        bugDetail: {
          module: module.trim(),
          severity,
          assignee: owner.trim(),
          reproduction: reproduction
            .split('\n')
            .map((step) => step.trim())
            .filter(Boolean),
          screenshotNote: screenshotNote.trim() || undefined,
          status: owner.trim() ? '已指派' : '待分诊'
        }
      });
      if (!id) return;
      resetForm();
      onOpenChange(false);
      return;
    }
    const id = createStandaloneIssue({
      projectId,
      title,
      summary,
      classification,
      priority,
      owner,
      tags: selectedTags
    });
    if (!id) return;
    resetForm();
    onOpenChange(false);
  }

  function resetForm() {
    setTitle('');
    setSummary('');
    setOwner('');
    setSelectedTags([]);
    setModule('');
    setSeverity('一般');
    setReproduction('');
    setScreenshotNote('');
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='data-[side=right]:w-full data-[side=right]:sm:max-w-xl'>
        <SheetHeader className='pr-12'>
          <SheetTitle>新建 Issue</SheetTitle>
          <SheetDescription>直接创建待处理 Issue；可后续补充关联的 Case 证据。</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-4 pb-4'>
          <FieldGroup>
            <Field>
              <FieldLabel>App</FieldLabel>
              <Select value={projectId} onValueChange={(value) => setProjectId(value ?? projectId)}>
                <SelectTrigger className='w-full'>
                  <SelectValue>
                    {projects.find((project) => project.id === projectId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor='standalone-issue-title'>标题</FieldLabel>
              <Input
                id='standalone-issue-title'
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder='简要描述需要处理的问题'
              />
            </Field>
            <Field>
              <FieldLabel htmlFor='standalone-issue-summary'>问题描述 / Summary</FieldLabel>
              <Textarea
                id='standalone-issue-summary'
                rows={4}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder='说明问题现象、影响或处理背景'
              />
            </Field>
            <Field>
              <FieldLabel>Classification</FieldLabel>
              <Select
                value={classification}
                onValueChange={(value) =>
                  setClassification(
                    (value as Exclude<IssueClassification, 'Bug' | 'Non Issue'>) ?? classification
                  )
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{classification}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {classifications.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value === 'Pending' ? '待判断' : value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={priority}
                onValueChange={(value) => setPriority((value as Priority) ?? priority)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue>{priority}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {priorities.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor='standalone-issue-owner'>
                {classification === 'Bug' ? 'Assignee' : 'Owner'}
              </FieldLabel>
              <Input
                id='standalone-issue-owner'
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder='留空则为未分配'
              />
            </Field>
            {classification === 'Bug' ? (
              <>
                <Field>
                  <FieldLabel htmlFor='standalone-issue-module'>Module</FieldLabel>
                  <Input
                    id='standalone-issue-module'
                    value={module}
                    onChange={(event) => setModule(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Severity</FieldLabel>
                  <Select
                    value={severity}
                    onValueChange={(value) => setSeverity((value as Severity) ?? severity)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue>{severity}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {severities.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor='standalone-issue-reproduction'>复现步骤</FieldLabel>
                  <Textarea
                    id='standalone-issue-reproduction'
                    rows={5}
                    value={reproduction}
                    onChange={(event) => setReproduction(event.target.value)}
                    placeholder='每行一个步骤'
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='standalone-issue-screenshot'>截图说明</FieldLabel>
                  <Textarea
                    id='standalone-issue-screenshot'
                    rows={3}
                    value={screenshotNote}
                    onChange={(event) => setScreenshotNote(event.target.value)}
                  />
                </Field>
              </>
            ) : null}
            <Field>
              <FieldLabel>Tags</FieldLabel>
              <TagPicker
                options={tags.map((tag) => tag.name)}
                value={selectedTags}
                onChange={setSelectedTags}
              />
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter className='border-t'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={submit}
            disabled={
              !projectId ||
              !title.trim() ||
              (classification === 'Bug' && (!module.trim() || !reproduction.trim())) ||
              (classification === 'Bug' && (!owner.trim() || !screenshotNote.trim()))
            }
          >
            创建 Issue
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
