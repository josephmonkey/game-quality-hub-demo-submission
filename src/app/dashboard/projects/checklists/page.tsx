import { ChecklistCenter } from '@/components/projects/checklist-center';
import { PageContainer } from '@/components/layout/page-container';

export default function ProjectChecklistsPage() {
  return (
    <PageContainer
      title='提测检查'
      description='按场景复用模板，为每次提测保留独立快照、处理记录与版本差异建议。'
    >
      <ChecklistCenter />
    </PageContainer>
  );
}
