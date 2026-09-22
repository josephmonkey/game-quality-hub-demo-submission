import { PageContainer } from '@/components/layout/page-container';
import { ResourceSchedulingCenter } from '@/components/resources/resource-scheduling-center';

export default function ResourcesPage() {
  return (
    <PageContainer
      title='设备与资源'
      description='通过容量月历与资源分组安排共享测试设备和账号，并跟踪预约、借用、归还和超期。'
    >
      <ResourceSchedulingCenter />
    </PageContainer>
  );
}
