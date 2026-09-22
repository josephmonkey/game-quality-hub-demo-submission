import type {
  Bug,
  Build,
  CheckInstance,
  CheckTemplate,
  ClusterCase,
  Feature,
  Project,
  QualityReport,
  RawFeedback,
  Resource,
  ResourceLoan,
  ResourceReservation,
  Tag,
  TestActivity,
  TestCase,
  TestRun,
  Version
} from '@/lib/domain';

const projectId = 'project-aurora';

function createScaledResources(): Resource[] {
  const resources: Resource[] = [];
  const addDevices = (
    key: string,
    count: number,
    platform: 'Android' | 'iOS',
    models: string[],
    versions: string[],
    tags: string[]
  ) => {
    for (let index = 1; index <= count; index += 1) {
      const model = models[(index - 1) % models.length];
      resources.push({
        id: `resource-scale-${key}-${String(index).padStart(3, '0')}`,
        type: '设备',
        name: `${model} #${String(index + 10).padStart(3, '0')}`,
        platform,
        model,
        systemVersion: versions[(index - 1) % versions.length],
        status: index % 23 === 0 ? '离线' : '可用',
        tags: index % 4 === 0 ? [...tags, '专项验证'] : tags
      });
    }
  };

  addDevices(
    'pixel',
    27,
    'Android',
    ['Pixel 9', 'Pixel 8', 'Pixel 7'],
    ['Android 16', 'Android 15'],
    ['主力机型', 'NFC']
  );
  addDevices(
    'galaxy',
    36,
    'Android',
    ['Galaxy S25', 'Galaxy S24', 'Galaxy S23'],
    ['Android 16', 'Android 15', 'Android 14'],
    ['高刷新率']
  );
  addDevices(
    'fold',
    9,
    'Android',
    ['Galaxy Z Fold 6', 'Galaxy Z Flip 6'],
    ['Android 15'],
    ['折叠屏']
  );
  addDevices(
    'android-other',
    18,
    'Android',
    ['OnePlus 13', 'Xiaomi 15', 'OPPO Find X8'],
    ['Android 16', 'Android 15'],
    ['兼容性']
  );
  addDevices(
    'iphone-new',
    27,
    'iOS',
    ['iPhone 16 Pro', 'iPhone 16', 'iPhone 15'],
    ['iOS 19', 'iOS 18'],
    ['主力机型']
  );
  addDevices('iphone-old', 21, 'iOS', ['iPhone 14', 'iPhone 13'], ['iOS 18', 'iOS 17'], ['兼容性']);
  addDevices('ipad', 13, 'iOS', ['iPad Pro', 'iPad Air'], ['iPadOS 19', 'iPadOS 18'], ['平板']);

  const addAccounts = (platform: 'Global' | 'CN', count: number) => {
    const accountTags = [
      ['高等级', '全角色'],
      ['付费账号'],
      ['新用户'],
      ['回流账号'],
      ['全角色账号']
    ];
    for (let index = 1; index <= count; index += 1) {
      const tags = accountTags[(index - 1) % accountTags.length];
      resources.push({
        id: `resource-scale-${platform.toLowerCase()}-${String(index).padStart(3, '0')}`,
        type: '测试账号',
        name: `${platform} ${tags[0]} #${String(index + 10).padStart(3, '0')}`,
        platform,
        status: index % 29 === 0 ? '离线' : '可用',
        tags
      });
    }
  };
  addAccounts('Global', 69);
  addAccounts('CN', 46);
  return resources;
}

const scaledResources = createScaledResources();

function createScaledReservations(): ResourceReservation[] {
  const dates = [
    ['2026-09-22', 0.12],
    ['2026-09-23', 0.22],
    ['2026-09-24', 0.36],
    ['2026-09-25', 0.5],
    ['2026-09-26', 0.66],
    ['2026-09-27', 0.82],
    ['2026-09-28', 1]
  ] as const;
  const generated = dates.flatMap(([date, ratio], dateIndex) =>
    scaledResources
      .filter((_, resourceIndex) => {
        const bucket = (resourceIndex * 37 + dateIndex * 11) % 100;
        return ratio === 1 || bucket < ratio * 100;
      })
      .map((resource, index) => ({
        id: `reservation-scale-${dateIndex}-${index}`,
        resourceId: resource.id,
        user: ['陈思', '林岚', '周齐', '赵安'][index % 4],
        purpose: ['登录回归', '支付专项', '版本兼容性', '公会战验证'][index % 4],
        startDate: date,
        endDate: date,
        createdAt: '2026-09-20T09:00:00+08:00'
      }))
  );
  const originalResourceIds = [
    'resource-pixel',
    'resource-iphone',
    'resource-account',
    'resource-pixel-01',
    'resource-pixel-02',
    'resource-galaxy-01',
    'resource-galaxy-02',
    'resource-fold',
    'resource-iphone-13',
    'resource-ipad',
    'resource-global-02',
    'resource-global-new',
    'resource-cn-01',
    'resource-cn-02'
  ];
  return [
    ...generated,
    ...originalResourceIds.map((resourceId, index) => ({
      id: `reservation-scale-full-${index}`,
      resourceId,
      user: '林岚',
      purpose: '全量资源压力日',
      startDate: '2026-09-28',
      endDate: '2026-09-28',
      createdAt: '2026-09-20T10:00:00+08:00'
    }))
  ];
}

function createScaledLoans(): ResourceLoan[] {
  return Array.from(
    { length: 28 },
    (_, index) => scaledResources[(index * 9) % scaledResources.length]
  ).map((resource, index) => {
    const overdue = index < 10;
    return {
      id: `loan-scale-${index + 1}`,
      resourceId: resource.id,
      borrower: ['赵安', '陈思', '周齐', '林岚'][index % 4],
      purpose: ['登录回归', '支付验证', '性能基线', '活动专项'][index % 4],
      borrowedAt: `2026-09-${String(8 + (index % 9)).padStart(2, '0')}`,
      dueDate: overdue
        ? `2026-09-${String(14 + (index % 6)).padStart(2, '0')}`
        : `2026-09-${String(22 + (index % 7)).padStart(2, '0')}`
    };
  });
}

function createReportFeedback(): RawFeedback[] {
  const scenarios = [
    {
      key: 'login-history',
      projectId,
      issueId: 'case-login',
      tag: '登录',
      text: 'Android 更新后登录页持续 loading，无法进入游戏。',
      current: 3,
      previous: 5
    },
    {
      key: 'guild-history',
      projectId: 'project-odyssey',
      issueId: 'issue-guild-crash',
      tag: '闪退',
      text: 'iOS 进入公会战后立即闪退。',
      current: 7,
      previous: 2
    },
    {
      key: 'raid-history',
      projectId: 'project-odyssey',
      issueId: 'issue-raid-performance',
      tag: '性能',
      text: '10 人 Raid 最终阶段出现明显掉帧。',
      current: 4,
      previous: 3
    },
    {
      key: 'payment-history',
      projectId: 'project-citadel',
      issueId: 'issue-payment-delay',
      tag: '支付',
      text: '付款成功后礼包仍未到账。',
      current: 3,
      previous: 0
    },
    {
      key: 'chat-freeze-history',
      projectId,
      issueId: 'issue-chat-freeze',
      tag: 'UI',
      text: '打开世界聊天后界面短暂无响应。',
      current: 1,
      previous: 4
    }
  ];
  let sequence = 3100;
  return scenarios.flatMap((scenario, scenarioIndex) => {
    const make = (period: 'current' | 'previous', index: number): RawFeedback => {
      sequence += 1;
      const day =
        period === 'current'
          ? 14 + ((index + scenarioIndex) % 7)
          : 7 + ((index + scenarioIndex) % 7);
      const timestamp = `2026-09-${String(day).padStart(2, '0')}T${String(9 + (index % 8)).padStart(2, '0')}:15:00+08:00`;
      return {
        id: `feedback-${scenario.key}-${period}-${index + 1}`,
        caseId: `CASE-${sequence}`,
        projectId: scenario.projectId,
        issueId: scenario.issueId,
        status: 'Linked',
        channel: index % 2 === 0 ? 'Discord' : 'Reddit',
        intakeMethod: 'auto',
        submittedBy: 'System',
        text: scenario.text,
        occurredAt: timestamp,
        caseCreatedAt: timestamp,
        suggestedTags: [scenario.tag],
        confirmedTags: [scenario.tag],
        tagStatus: 'confirmed',
        simulated: true,
        author: `Demo Player ${sequence}`,
        aiClassification: 'Bug',
        aiConfidence: 0.9,
        aiReason: '用于演示按报告周期计算趋势的确定性 Seed Data。',
        issueMatchReason: '与对应 Issue 的触发条件和问题表现一致。',
        attachments: []
      };
    };
    return [
      ...Array.from({ length: scenario.current }, (_, index) => make('current', index)),
      ...Array.from({ length: scenario.previous }, (_, index) => make('previous', index))
    ];
  });
}

export interface DemoData {
  projects: Project[];
  feedback: RawFeedback[];
  clusters: ClusterCase[];
  bugs: Bug[];
  features: Feature[];
  versions: Version[];
  builds: Build[];
  testCases: TestCase[];
  testActivities: TestActivity[];
  testRuns: TestRun[];
  reports: QualityReport[];
  checkTemplates: CheckTemplate[];
  checkInstances: CheckInstance[];
  resources: Resource[];
  resourceReservations: ResourceReservation[];
  resourceLoans: ResourceLoan[];
  tags: Tag[];
}

const testCaseBlueprints = [
  [
    '账号与登录',
    '游客账号首次登录',
    '首次安装应用',
    '启动应用\n选择游客登录',
    '成功创建账号并进入主界面',
    'P0'
  ],
  [
    '账号与登录',
    '令牌失效后重新登录',
    '账号令牌已过期',
    '启动应用\n完成重新认证',
    '刷新令牌并恢复游戏进度',
    'P0'
  ],
  [
    '账号与登录',
    '弱网环境登录恢复',
    '网络延迟 800ms',
    '启动应用\n登录后切换网络',
    '提示网络异常并可正常重试',
    'P1'
  ],
  [
    '核心玩法',
    '完成一局核心玩法',
    '账号已完成新手引导',
    '进入玩法\n完成一局\n领取结算奖励',
    '结算正确且奖励到账',
    'P0'
  ],
  [
    '核心玩法',
    '战斗中切后台再恢复',
    '已进入战斗',
    '切换到后台 30 秒\n返回游戏',
    '战斗状态正确恢复',
    'P1'
  ],
  [
    '核心玩法',
    '断线重连恢复进度',
    '已进入多人玩法',
    '断开网络\n恢复网络\n点击重连',
    '回到当前进度且数据一致',
    'P0'
  ],
  [
    '商城支付',
    '购买普通礼包',
    '测试账号余额充足',
    '打开商城\n购买礼包\n确认支付',
    '支付成功且道具只发放一次',
    'P0'
  ],
  [
    '商城支付',
    '取消支付返回商城',
    '已进入支付确认页',
    '取消支付\n返回商城',
    '订单取消且无扣款',
    'P1'
  ],
  [
    '社交',
    '发送并接收好友消息',
    '双方互为好友',
    '发送消息\n切换接收账号查看',
    '消息及时送达且顺序正确',
    'P2'
  ],
  [
    '设置',
    '切换语言并重启',
    '已下载语言资源',
    '切换语言\n重启应用',
    '语言设置保留且文案完整',
    'P2'
  ],
  [
    '性能',
    '主场景连续运行 20 分钟',
    '设备电量高于 50%',
    '进入主场景\n连续操作 20 分钟',
    '无闪退、卡死或明显掉帧',
    'P1'
  ],
  [
    '兼容性',
    '系统通知打断后恢复',
    '允许系统通知',
    '进入游戏\n触发系统通知\n返回应用',
    '音画与交互正常恢复',
    'P3'
  ]
] as const;

const testProjects = [
  ['project-aurora', 'vita'],
  ['project-odyssey', 'amaze'],
  ['project-citadel', 'tile']
] as const;

const seedTestCases: TestCase[] = testProjects.flatMap(([testProjectId, prefix]) =>
  testCaseBlueprints.map(([module, title, precondition, steps, expected, priority], index) => ({
    id: `tc-${prefix}-${String(index + 1).padStart(2, '0')}`,
    projectId: testProjectId,
    platforms:
      index === 7 || index === 11
        ? (['iOS'] as const)
        : index === 2 || index === 10
          ? (['Android'] as const)
          : (['Android', 'iOS'] as const),
    module,
    title,
    preconditions: [precondition],
    steps: steps.split('\n'),
    expected,
    priority,
    createdAt: '2026-09-15T10:00:00+08:00',
    updatedAt: `2026-09-${String(16 + (index % 5)).padStart(2, '0')}T10:00:00+08:00`
  }))
);

function snapshotFor(testCase: TestCase) {
  return {
    sourceTestCaseId: testCase.id,
    projectId: testCase.projectId,
    platforms: [...testCase.platforms],
    module: testCase.module,
    title: testCase.title,
    preconditions: [...testCase.preconditions],
    steps: [...testCase.steps],
    expected: testCase.expected,
    priority: testCase.priority
  };
}

function resultsFor(
  ids: string[],
  statuses: Array<'通过' | '失败' | '阻塞' | '未执行'>,
  notes: string[] = []
) {
  return ids.flatMap((id, caseIndex) => {
    const testCase = seedTestCases.find((item) => item.id === id);
    if (!testCase) return [];
    return testCase.platforms.map((platform, platformIndex) => ({
      testCaseId: id,
      platform,
      snapshot: snapshotFor(testCase),
      status: statuses[(caseIndex * 2 + platformIndex) % statuses.length],
      note: notes[(caseIndex * 2 + platformIndex) % notes.length] ?? '',
      evidence: [],
      updatedAt: '2026-09-21T18:00:00+08:00'
    }));
  });
}

export const seedData: DemoData = {
  projects: [
    { id: projectId, name: 'vita-mahjong', code: 'VITA', owner: '林岚' },
    { id: 'project-odyssey', name: 'amaze-go', code: 'AMAZE', owner: '陈思' },
    {
      id: 'project-citadel',
      name: 'tile-explorer-triple-match',
      code: 'TILE',
      owner: '周齐'
    }
  ],
  feedback: [
    {
      id: 'feedback-login-1',
      caseId: 'CASE-3001',
      projectId,
      issueId: 'case-login',
      status: 'Linked',
      channel: 'Discord',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: '更新后一直卡在登录界面，重启也没用。',
      occurredAt: '2026-09-18T09:12:00+08:00',
      caseCreatedAt: '2026-09-18T09:14:00+08:00',
      suggestedTags: ['登录', '网络'],
      confirmedTags: ['登录'],
      tagStatus: 'confirmed',
      simulated: true,
      originalUrl: 'https://example.com/discord/login-1',
      author: 'Player#1842',
      aiClassification: 'Bug',
      aiConfidence: 0.96,
      aiReason: '更新后出现可重复的登录阻断。',
      issueMatchReason: '同样描述 Android 更新后无法完成登录。',
      attachments: [
        {
          id: 'attachment-login-screen',
          name: 'android-login-loading.png',
          type: 'image',
          url: '/platform-logo.png',
          isMock: true
        }
      ]
    },
    {
      id: 'feedback-login-2',
      caseId: 'CASE-3002',
      projectId,
      issueId: 'case-login',
      status: 'Linked',
      channel: 'Reddit',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: 'Cannot sign in after the latest patch on Android.',
      occurredAt: '2026-09-18T10:05:00+08:00',
      caseCreatedAt: '2026-09-18T10:08:00+08:00',
      suggestedTags: ['登录', '网络'],
      confirmedTags: ['登录'],
      tagStatus: 'confirmed',
      simulated: true,
      originalUrl: 'https://example.com/reddit/login-2',
      author: 'u/aurora_runner',
      aiClassification: 'Bug',
      aiConfidence: 0.94,
      aiReason: '补丁后 Android 认证失败，与已有 Issue 高度相似。',
      issueMatchReason: '平台、版本和登录阻断现象一致。',
      attachments: []
    },
    {
      id: 'feedback-guild-1',
      caseId: 'CASE-3003',
      projectId: 'project-odyssey',
      issueId: 'issue-guild-crash',
      status: 'Linked',
      channel: 'Reddit',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: 'Game crashes every time I enter Guild War on iPhone.',
      occurredAt: '2026-09-19T08:31:00+08:00',
      caseCreatedAt: '2026-09-19T08:33:00+08:00',
      suggestedTags: ['闪退', '玩法', '性能'],
      confirmedTags: ['闪退', '玩法'],
      tagStatus: 'confirmed',
      simulated: true,
      originalUrl: 'https://example.com/reddit/guild-war-crash',
      author: 'u/starfleet_9',
      aiClassification: 'Bug',
      aiConfidence: 0.98,
      aiReason: '进入核心玩法时稳定闪退，属于高严重度故障。',
      issueMatchReason: '同样描述 iOS 设备进入 Guild War 时闪退。',
      attachments: []
    },
    {
      id: 'feedback-guild-2',
      caseId: 'CASE-3004',
      projectId: 'project-odyssey',
      issueId: 'issue-guild-crash',
      status: 'Linked',
      channel: 'X',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: '公会战一点进入就闪退，iOS 更新后开始的。',
      occurredAt: '2026-09-19T09:02:00+08:00',
      caseCreatedAt: '2026-09-19T09:04:00+08:00',
      suggestedTags: ['闪退', '玩法'],
      confirmedTags: ['闪退', '玩法'],
      tagStatus: 'confirmed',
      simulated: true,
      originalUrl: 'https://example.com/x/guild-war-crash',
      author: '@moon_archer',
      aiClassification: 'Bug',
      aiConfidence: 0.97,
      aiReason: '触发条件和平台与 ISS-1002 一致。',
      issueMatchReason: '触发条件、平台和更新时点与当前 Issue 一致。',
      attachments: []
    },
    {
      id: 'feedback-payment-1',
      caseId: 'CASE-3005',
      projectId: 'project-citadel',
      issueId: 'issue-payment-delay',
      status: 'Linked',
      channel: 'Telegram',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: '支付成功了，但礼包半小时了还没到账。',
      occurredAt: '2026-09-19T07:46:00+08:00',
      caseCreatedAt: '2026-09-19T07:49:00+08:00',
      suggestedTags: ['支付'],
      confirmedTags: ['支付'],
      tagStatus: 'confirmed',
      simulated: true,
      originalUrl: 'https://example.com/telegram/payment-delay',
      author: 'Knight-07',
      aiClassification: 'Bug',
      aiConfidence: 0.92,
      aiReason: '支付完成但虚拟物品未发放，已命中支付延迟 Issue。',
      issueMatchReason: '支付回执成功但道具未到账，与当前 Issue 定义一致。',
      attachments: []
    },
    {
      id: 'feedback-raid-1',
      caseId: 'CASE-3006',
      projectId: 'project-odyssey',
      status: 'Needs Info',
      channel: 'Discord',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: '10-player Raid drops below 20 FPS during the final phase.',
      occurredAt: '2026-09-16T20:12:00+08:00',
      caseCreatedAt: '2026-09-16T20:19:00+08:00',
      suggestedTags: ['卡顿', '性能', '玩法'],
      confirmedTags: ['卡顿', '性能'],
      tagStatus: 'confirmed',
      simulated: true,
      originalUrl: 'https://example.com/discord/raid-fps',
      author: 'NovaTank',
      aiClassification: 'Unclear',
      aiConfidence: 0.89,
      aiReason: '多人战斗特定阶段帧率显著下降。',
      issueMatchReason: '同为 10 人 Raid 最终阶段的显著掉帧。',
      attachments: []
    },
    {
      id: 'feedback-skin-1',
      caseId: 'CASE-3007',
      projectId: 'project-citadel',
      status: 'Closed',
      channel: 'Reddit',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: 'Why is this skin so expensive?',
      occurredAt: '2026-09-19T09:21:00+08:00',
      caseCreatedAt: '2026-09-19T09:22:00+08:00',
      suggestedTags: ['数值'],
      confirmedTags: [],
      tagStatus: 'pending',
      simulated: true,
      originalUrl: 'https://example.com/reddit/skin-price',
      author: 'u/castle_builder',
      aiClassification: 'Non Issue',
      aiConfidence: 0.61,
      aiReason: '模拟 AI 将价格抱怨误判为付费故障，等待人工纠正。',
      issueMatchReason: '模拟 AI 将定价抱怨错误归入付费异常。',
      attachments: []
    },
    {
      id: 'feedback-security-1',
      caseId: 'CASE-3008',
      projectId,
      issueId: 'issue-account-security',
      status: 'Linked',
      channel: 'Internal',
      intakeMethod: 'manual_single',
      submittedBy: '当前演示用户',
      text: '单个玩家报告账号在异地自动登录，疑似会话令牌泄露。',
      occurredAt: '2026-09-19T06:05:00+08:00',
      caseCreatedAt: '2026-09-19T06:07:00+08:00',
      suggestedTags: ['账号', '安全'],
      confirmedTags: ['账号', '安全'],
      tagStatus: 'confirmed',
      simulated: true,
      author: '客服升级',
      aiClassification: 'Bug',
      aiConfidence: 0.86,
      aiReason: '即使仅 1 条 Case，账号安全风险也应直接高优处理。',
      issueMatchReason: '安全规则直接建立独立 Issue，不依赖反馈数量。',
      attachments: []
    },
    {
      id: 'feedback-feature-1',
      caseId: 'CASE-3009',
      projectId: 'project-odyssey',
      status: 'Pending',
      channel: 'Discord',
      intakeMethod: 'auto',
      submittedBy: 'System',
      text: '希望好友列表可以添加备注，方便记住一起组队的玩家。',
      occurredAt: '2026-09-20T10:18:00+08:00',
      caseCreatedAt: '2026-09-20T10:20:00+08:00',
      suggestedTags: ['社交'],
      confirmedTags: [],
      tagStatus: 'pending',
      simulated: true,
      author: 'Player#3901',
      aiClassification: 'Feature',
      aiConfidence: 0.91,
      aiReason: '描述的是当前不存在的好友备注能力。',
      attachments: []
    },
    ...createReportFeedback()
  ],
  clusters: [
    {
      id: 'case-login',
      displayId: 'ISS-1001',
      projectId,
      title: '更新后 Android 登录失败',
      summary: '2.7.0 更新后 Android 登录失败；修复后仍收到大量同类反馈。',
      status: '观察中',
      owner: '周齐',
      team: 'Client QA',
      risk: '高',
      priority: 'P0',
      classification: 'Bug',
      bugDetail: {
        reproduction: ['安装 2.7.0 构建', '清除应用数据后启动', '使用已有账号登录'],
        module: '账号与登录',
        severity: '致命',
        screenshotNote: '登录页持续 Loading，无法进入大厅。',
        assignee: '韩梅',
        status: '待验收'
      },
      issueStatus: 'Resolved',
      previousPeriodStatus: 'Verifying',
      createdAt: '2026-09-02T10:00:00+08:00',
      updatedAt: '2026-09-19T08:00:00+08:00',
      firstSeenAt: '2026-09-02T09:52:00+08:00',
      lastSeenAt: '2026-09-19T08:00:00+08:00',
      caseCount: 126,
      caseCount24h: 36,
      caseCountPrevious24h: 16,
      relatedTicket: 'BUG-1028',
      notificationStatus: '已通知',
      notificationTime: '2026-09-18T10:22:00+08:00',
      resolvedAt: '2026-09-17T18:00:00+08:00',
      casesBeforeResolution: 90,
      casesAfterResolution: 36,
      possibleRegression: true,
      suggestedTags: ['登录', '网络'],
      confirmedTags: ['登录'],
      aiAssessment: {
        priority: 'P1',
        businessLine: '账号与登录',
        category: '功能阻断',
        confidence: 0.91,
        rationale: '短时间内跨渠道出现相似描述，且阻断核心登录流程。',
        assessedAt: '2026-09-18T10:08:00+08:00',
        simulated: true
      },
      humanDecision: {
        priority: 'P0',
        businessLine: '账号与登录',
        conclusion: 'Bug',
        decidedBy: '周齐',
        decidedAt: '2026-09-18T10:20:00+08:00'
      },
      feedbackIds: ['feedback-login-1', 'feedback-login-2'],
      featureIds: [],
      history: [
        {
          id: 'history-case-login-1',
          at: '2026-09-18T10:20:00+08:00',
          actor: '周齐',
          action: '人工升级为 P0',
          note: '影响登录主路径'
        }
      ]
    },
    {
      id: 'issue-guild-crash',
      displayId: 'ISS-1002',
      projectId: 'project-odyssey',
      title: 'iOS 玩家进入公会战时闪退',
      summary: 'iOS 19 玩家在最新版本进入公会战时稳定闪退。',
      status: '跟进中',
      owner: 'Alex Chen',
      team: 'Client QA',
      risk: '高',
      priority: 'P0',
      classification: 'Bug',
      bugDetail: {
        reproduction: ['使用 iOS 19 设备登录', '进入公会战大厅', '点击进入当期关卡'],
        module: '公会战',
        severity: '严重',
        screenshotNote: '关卡加载到 80% 左右时应用退出。',
        assignee: 'Alex Chen',
        status: '修复中'
      },
      issueStatus: 'Developing',
      previousPeriodStatus: 'Assigned',
      createdAt: '2026-09-19T08:35:00+08:00',
      updatedAt: '2026-09-19T09:10:00+08:00',
      firstSeenAt: '2026-09-19T08:31:00+08:00',
      lastSeenAt: '2026-09-19T09:02:00+08:00',
      caseCount: 87,
      caseCount24h: 87,
      caseCountPrevious24h: 26,
      relatedTicket: 'BUG-1176',
      notificationStatus: '未通知',
      suggestedTags: ['闪退', '玩法', '性能'],
      confirmedTags: ['闪退', '玩法'],
      aiAssessment: {
        priority: 'P0',
        businessLine: '公会战',
        category: 'Crash',
        confidence: 0.98,
        rationale: '核心玩法阻断，24h 内 87 条 Case，较前 24h 增长 235%。',
        assessedAt: '2026-09-19T09:05:00+08:00',
        simulated: true
      },
      humanDecision: {
        priority: 'P0',
        businessLine: '公会战',
        conclusion: 'Bug',
        decidedBy: '陈思',
        decidedAt: '2026-09-19T08:42:00+08:00'
      },
      feedbackIds: ['feedback-guild-1', 'feedback-guild-2'],
      featureIds: [],
      history: []
    },
    {
      id: 'issue-payment-delay',
      displayId: 'ISS-1003',
      projectId: 'project-citadel',
      title: '支付成功后礼包到账延迟',
      summary: '支付回执成功，但道具发放队列存在延迟。',
      status: '跟进中',
      owner: '林岚',
      team: 'Game Ops',
      risk: '高',
      priority: 'P1',
      classification: 'Improvement',
      issueStatus: 'Verifying',
      previousPeriodStatus: 'Following Up',
      createdAt: '2026-09-15T14:00:00+08:00',
      updatedAt: '2026-09-19T08:10:00+08:00',
      firstSeenAt: '2026-09-15T13:42:00+08:00',
      lastSeenAt: '2026-09-19T07:46:00+08:00',
      caseCount: 43,
      caseCount24h: 8,
      caseCountPrevious24h: 12,
      relatedTicket: 'BUG-1153',
      notificationStatus: '已通知',
      suggestedTags: ['支付'],
      confirmedTags: ['支付'],
      notificationTime: '2026-09-15T14:10:00+08:00',
      aiAssessment: {
        priority: 'P1',
        businessLine: '支付',
        category: '到账延迟',
        confidence: 0.92,
        rationale: '涉及付费体验，当日持续有新 Case，建议保持 P1。',
        assessedAt: '2026-09-19T07:50:00+08:00',
        simulated: true
      },
      feedbackIds: ['feedback-payment-1'],
      featureIds: [],
      history: []
    },
    {
      id: 'issue-raid-performance',
      displayId: 'ISS-1004',
      projectId: 'project-odyssey',
      title: '10 人 Raid 最终阶段帧率下降',
      summary: '多玩家同屏且特效集中时帧率低于 20 FPS。',
      status: '跟进中',
      owner: '陈思',
      team: 'Engine',
      risk: '中',
      priority: 'P2',
      classification: 'Pending',
      issueStatus: 'Blocked',
      previousPeriodStatus: 'Developing',
      createdAt: '2026-09-03T11:00:00+08:00',
      updatedAt: '2026-09-18T17:00:00+08:00',
      firstSeenAt: '2026-09-03T10:40:00+08:00',
      lastSeenAt: '2026-09-16T20:12:00+08:00',
      caseCount: 31,
      caseCount24h: 1,
      caseCountPrevious24h: 1,
      notificationStatus: '未通知',
      blockedReason: '等待引擎团队提供 GPU trace 分析',
      suggestedTags: ['卡顿', '性能', '玩法'],
      confirmedTags: ['卡顿', '性能'],
      aiAssessment: {
        priority: 'P2',
        businessLine: 'Raid',
        category: '性能',
        confidence: 0.89,
        rationale: '持续时间已超 7 天，当前增速稳定，但需关注长期积压。',
        assessedAt: '2026-09-16T20:20:00+08:00',
        simulated: true
      },
      feedbackIds: [],
      featureIds: [],
      history: []
    },
    {
      id: 'issue-skin-price',
      displayId: 'ISS-1005',
      projectId: 'project-citadel',
      title: '皮肤定价异常（待人工确认）',
      summary: '模拟 AI 将价格抱怨误判为故障，用于演示人工负反馈。',
      status: '待确认',
      owner: '未分配',
      team: '待分诊',
      risk: '低',
      priority: 'P3',
      classification: 'Feature',
      issueStatus: 'New',
      createdAt: '2026-09-19T09:23:00+08:00',
      updatedAt: '2026-09-19T09:23:00+08:00',
      firstSeenAt: '2026-09-19T09:21:00+08:00',
      lastSeenAt: '2026-09-19T09:21:00+08:00',
      caseCount: 1,
      caseCount24h: 1,
      caseCountPrevious24h: 0,
      notificationStatus: '未通知',
      suggestedTags: ['数值'],
      confirmedTags: [],
      aiAssessment: {
        priority: 'P3',
        businessLine: '商业化',
        category: '付费故障',
        confidence: 0.61,
        rationale: '低置信度识别：价格负面表述可能并非功能故障。',
        assessedAt: '2026-09-19T09:22:00+08:00',
        simulated: true
      },
      feedbackIds: [],
      featureIds: [],
      history: []
    },
    {
      id: 'issue-account-security',
      displayId: 'ISS-1006',
      projectId,
      title: '疑似会话令牌导致异地登录',
      summary: '单条反馈触发账号安全高优先级规则。',
      status: '跟进中',
      owner: '韩梅',
      team: 'Security',
      risk: '高',
      priority: 'P1',
      classification: 'Pending',
      issueStatus: 'Following Up',
      previousPeriodStatus: 'Assigned',
      createdAt: '2026-09-19T06:10:00+08:00',
      updatedAt: '2026-09-19T07:20:00+08:00',
      firstSeenAt: '2026-09-19T06:05:00+08:00',
      lastSeenAt: '2026-09-19T06:05:00+08:00',
      caseCount: 1,
      caseCount24h: 1,
      caseCountPrevious24h: 0,
      notificationStatus: '已通知',
      notificationTime: '2026-09-19T06:12:00+08:00',
      suggestedTags: ['账号', '安全'],
      confirmedTags: ['账号', '安全'],
      aiAssessment: {
        priority: 'P1',
        businessLine: '账号安全',
        category: '安全',
        confidence: 0.86,
        rationale: '账号安全事件不依赖 Case 量，单条也需立即升级。',
        assessedAt: '2026-09-19T06:08:00+08:00',
        simulated: true
      },
      humanDecision: {
        priority: 'P1',
        businessLine: '账号安全',
        conclusion: 'Bug',
        decidedBy: '周齐',
        decidedAt: '2026-09-19T06:10:00+08:00'
      },
      feedbackIds: ['feedback-security-1'],
      featureIds: [],
      history: []
    },
    {
      id: 'issue-chat-freeze',
      displayId: 'ISS-1007',
      projectId,
      title: '打开世界聊天时界面短暂卡死',
      summary: '世界聊天列表首次加载时主线程阻塞，修复后同类反馈明显下降。',
      status: '已解决',
      owner: '韩梅',
      team: 'Client',
      risk: '中',
      priority: 'P1',
      classification: 'Bug',
      bugDetail: {
        reproduction: ['进入世界聊天', '首次加载大量历史消息'],
        module: '聊天',
        severity: '一般',
        screenshotNote: '首次打开时界面约卡死 2 秒。',
        assignee: '韩梅',
        status: '已关闭'
      },
      issueStatus: 'Closed',
      previousPeriodStatus: 'Verifying',
      createdAt: '2026-09-09T09:00:00+08:00',
      updatedAt: '2026-09-18T16:00:00+08:00',
      firstSeenAt: '2026-09-09T08:40:00+08:00',
      lastSeenAt: '2026-09-16T11:15:00+08:00',
      caseCount: 18,
      caseCount24h: 0,
      caseCountPrevious24h: 2,
      relatedTicket: 'BUG-1188',
      notificationStatus: '已通知',
      notificationTime: '2026-09-09T10:00:00+08:00',
      resolvedAt: '2026-09-17T15:00:00+08:00',
      casesBeforeResolution: 16,
      casesAfterResolution: 2,
      possibleRegression: false,
      suggestedTags: ['UI', '卡顿'],
      confirmedTags: ['UI'],
      aiAssessment: {
        priority: 'P1',
        businessLine: '聊天',
        category: '主线程阻塞',
        confidence: 0.93,
        rationale: '修复后同类玩家反馈由 16 条下降至 2 条。',
        assessedAt: '2026-09-18T16:00:00+08:00',
        simulated: true
      },
      feedbackIds: [],
      featureIds: [],
      history: []
    }
  ],
  bugs: [
    {
      id: 'bug-login-token',
      projectId,
      sourceCaseIds: ['case-login'],
      title: 'Android 冷启动后登录令牌刷新失败',
      reproduction: ['安装 2.7.0 构建', '清除应用数据后启动', '使用已有账号登录'],
      module: '账号与登录',
      severity: '致命',
      priority: 'P0',
      assignee: '韩梅',
      status: '待验收',
      foundInBuildId: 'build-270-100',
      targetVersionId: 'version-270',
      fixedInBuildId: 'build-270-101',
      history: [
        {
          id: 'history-bug-1',
          at: '2026-09-18T10:25:00+08:00',
          actor: '周齐',
          action: '从 Case 创建 Bug'
        },
        {
          id: 'history-bug-2',
          at: '2026-09-18T16:40:00+08:00',
          actor: '韩梅',
          action: '提交修复并转待验收',
          note: '修复令牌迁移顺序'
        }
      ]
    }
  ],
  features: [
    {
      id: 'feature-team',
      projectId,
      sourceCaseIds: [],
      title: '快速组队与队伍招募',
      status: '已排期',
      targetVersionId: 'version-280'
    }
  ],
  versions: [
    {
      id: 'version-270',
      projectId,
      name: '2.7.0 热修复',
      platforms: ['Android'],
      scope: ['修复 Android 登录阻断'],
      acceptanceCriteria: ['核心登录回归通过', '无 P0/P1 未关闭缺陷'],
      status: '测试中',
      buildIds: ['build-270-100', 'build-270-101']
    },
    {
      id: 'version-280',
      projectId,
      name: '2.8.0 组队更新',
      platforms: ['iOS', 'Android'],
      scope: ['快速组队', '队伍招募', '核心功能回归'],
      acceptanceCriteria: ['支线准入通过', '候选构建集成测试完成'],
      status: '规划中',
      buildIds: ['build-280-126', 'build-280-127']
    },
    {
      id: 'version-amaze-340',
      projectId: 'project-odyssey',
      name: '3.4.0 公会战更新',
      platforms: ['iOS'],
      scope: ['公会战赛季', '战斗结算回归'],
      acceptanceCriteria: ['核心战斗回归完成'],
      status: '测试中',
      buildIds: ['build-amaze-340-88']
    },
    {
      id: 'version-tile-190',
      projectId: 'project-citadel',
      name: '1.9.0 商店更新',
      platforms: ['iOS', 'Android'],
      scope: ['商店改版', '支付链路回归'],
      acceptanceCriteria: ['双平台支付冒烟完成'],
      status: '待发布',
      buildIds: ['build-tile-190-52', 'build-tile-190-53']
    }
  ],
  builds: [
    {
      id: 'build-270-100',
      versionId: 'version-270',
      platform: 'Android',
      label: '2.7.0+100',
      createdAt: '2026-09-18T08:30:00+08:00',
      source: '模拟合并',
      status: '已废弃'
    },
    {
      id: 'build-270-101',
      versionId: 'version-270',
      platform: 'Android',
      label: '2.7.0+101',
      createdAt: '2026-09-18T17:05:00+08:00',
      source: '模拟合并',
      status: '验证中'
    },
    {
      id: 'build-280-126',
      versionId: 'version-280',
      platform: 'Android',
      label: '2.8.0+126',
      createdAt: '2026-09-21T10:20:00+08:00',
      source: '手工登记',
      status: '验证中'
    },
    {
      id: 'build-280-127',
      versionId: 'version-280',
      platform: 'iOS',
      label: '2.8.0+127',
      createdAt: '2026-09-21T11:05:00+08:00',
      source: '手工登记',
      status: '候选'
    },
    {
      id: 'build-amaze-340-88',
      versionId: 'version-amaze-340',
      platform: 'iOS',
      label: '3.4.0+88',
      createdAt: '2026-09-20T15:40:00+08:00',
      source: '模拟合并',
      status: '验证中'
    },
    {
      id: 'build-tile-190-52',
      versionId: 'version-tile-190',
      platform: 'Android',
      label: '1.9.0+52',
      createdAt: '2026-09-20T16:10:00+08:00',
      source: '模拟合并',
      status: '可发布'
    },
    {
      id: 'build-tile-190-53',
      versionId: 'version-tile-190',
      platform: 'iOS',
      label: '1.9.0+53',
      createdAt: '2026-09-20T16:45:00+08:00',
      source: '模拟合并',
      status: '候选'
    }
  ],
  testCases: seedTestCases,
  testActivities: [
    {
      id: 'activity-login-regression',
      projectId,
      versionId: 'version-270',
      name: 'vita-mahjong 2.7.0 双平台回归',
      platforms: ['Android', 'iOS'],
      targetType: '开发版本',
      targetBuildId: 'build-270-101',
      targetLabel: '2.7.0+101',
      status: '已完成',
      selectedCaseIds: seedTestCases
        .filter((item) => item.projectId === projectId)
        .slice(0, 8)
        .map((item) => item.id),
      runIds: ['run-login-2'],
      createdAt: '2026-09-18T10:30:00+08:00',
      updatedAt: '2026-09-18T18:10:00+08:00'
    },
    {
      id: 'activity-amaze-stability',
      projectId: 'project-odyssey',
      versionId: 'version-amaze-340',
      name: 'amaze-go 3.4.0 稳定性测试',
      platforms: ['Android', 'iOS'],
      targetType: '线上版本',
      targetBuildId: 'build-amaze-340-88',
      targetLabel: '3.4.0+88',
      status: '执行中',
      selectedCaseIds: seedTestCases
        .filter((item) => item.projectId === 'project-odyssey')
        .slice(0, 9)
        .map((item) => item.id),
      runIds: ['run-amaze-1'],
      createdAt: '2026-09-21T09:30:00+08:00',
      updatedAt: '2026-09-21T17:20:00+08:00'
    }
  ],
  testRuns: [
    {
      id: 'run-login-2',
      activityId: 'activity-login-regression',
      buildId: 'build-270-101',
      runNumber: 1,
      createdAt: '2026-09-18T18:10:00+08:00',
      executor: '赵安',
      simulated: false,
      results: resultsFor(
        seedTestCases
          .filter((item) => item.projectId === projectId)
          .slice(0, 8)
          .map((item) => item.id),
        ['通过', '通过', '通过', '失败', '阻塞'],
        ['', '', '', 'Android 登录回调偶现超时', '等待支付沙箱恢复']
      )
    },
    {
      id: 'run-amaze-1',
      activityId: 'activity-amaze-stability',
      buildId: 'build-amaze-340-88',
      runNumber: 1,
      createdAt: '2026-09-21T17:20:00+08:00',
      executor: '陈思',
      simulated: false,
      results: resultsFor(
        seedTestCases
          .filter((item) => item.projectId === 'project-odyssey')
          .slice(0, 9)
          .map((item) => item.id),
        ['通过', '通过', '未执行', '失败', '阻塞', '未执行'],
        ['', '', '', '公会战返回大厅时闪退', '测试账号支付环境维护中', '']
      )
    }
  ],
  reports: [
    {
      id: 'report-270-101',
      versionId: 'version-270',
      buildId: 'build-270-101',
      createdAt: '2026-09-18T18:30:00+08:00',
      recommendation: '有条件发布',
      facts: { total: 2, passed: 2, failed: 0, blocked: 0, unexecuted: 0 },
      evidenceRunIds: ['run-login-2'],
      riskSummary: '登录回归通过；仍需完成发布后同类反馈观察。',
      simulatedSummary: true
    }
  ],
  checkTemplates: [
    {
      id: 'check-template-client',
      name: '客户端基础提测检查单',
      scenario: '客户端常规版本',
      description: '覆盖客户端常规版本的包体、配置、调试能力与提测资料。',
      updatedAt: '2026-09-18T10:00:00+08:00',
      groups: [
        {
          id: 'check-group-build',
          name: '构建与包体',
          items: [
            { id: 'check-item-release', title: 'Release 包已正确生成', isCritical: true },
            { id: 'check-item-version', title: '客户端版本号与资源版本正确', isCritical: true },
            { id: 'check-item-performance', title: '性能包已生成并可安装', isCritical: false }
          ]
        },
        {
          id: 'check-group-config',
          name: '配置与环境',
          items: [
            { id: 'check-item-config', title: '配置表已更新至目标测试环境', isCritical: false },
            { id: 'check-item-match', title: '客户端与服务端配置版本一致', isCritical: true }
          ]
        },
        {
          id: 'check-group-debug',
          name: '调试能力',
          items: [
            { id: 'check-item-gm', title: '正式包已关闭 GM 工具', isCritical: true },
            { id: 'check-item-debug', title: '正式包已关闭 Debug 菜单', isCritical: true }
          ]
        },
        {
          id: 'check-group-material',
          name: '提测资料',
          items: [
            { id: 'check-item-notes', title: '更新说明与影响范围完整', isCritical: false },
            { id: 'check-item-known', title: '已知问题已登记并标明影响', isCritical: false }
          ]
        }
      ]
    },
    {
      id: 'check-template-hotfix',
      name: 'Hotfix 提测检查单',
      scenario: '客户端 Hotfix',
      description: '聚焦修复验证、影响范围、核心链路和回滚准备。',
      updatedAt: '2026-09-18T10:00:00+08:00',
      groups: [
        {
          id: 'hotfix-group-fix',
          name: '修复与影响',
          items: [
            { id: 'hotfix-item-fix', title: '目标问题在修复 Build 中验证通过', isCritical: true },
            { id: 'hotfix-item-scope', title: '修复影响范围已经评审', isCritical: false },
            { id: 'hotfix-item-regression', title: '受影响核心链路回归完成', isCritical: true }
          ]
        },
        {
          id: 'hotfix-group-release',
          name: '发布准备',
          items: [
            { id: 'hotfix-item-version', title: '版本号与补丁资源版本正确', isCritical: true },
            { id: 'hotfix-item-rollback', title: '回滚方案已确认并可执行', isCritical: true }
          ]
        }
      ]
    },
    {
      id: 'check-template-config',
      name: '配置变更检查单',
      scenario: '配置 / 数值更新',
      description: '覆盖配置版本、目标环境、生效范围、关键数值和回滚。',
      updatedAt: '2026-09-18T10:00:00+08:00',
      groups: [
        {
          id: 'config-group-main',
          name: '配置发布',
          items: [
            { id: 'config-item-version', title: '配置版本与变更记录一致', isCritical: true },
            { id: 'config-item-env', title: '目标环境和生效时间正确', isCritical: true },
            { id: 'config-item-value', title: '关键数值完成双人复核', isCritical: true },
            { id: 'config-item-rollback', title: '旧配置已备份并验证回滚方式', isCritical: false }
          ]
        }
      ]
    }
  ],
  checkInstances: [
    {
      id: 'check-instance-270',
      projectId,
      versionId: 'version-270',
      scenario: '客户端 Hotfix',
      templateId: 'check-template-hotfix',
      templateName: 'Hotfix 提测检查单',
      target: 'Android Release 2.7.0 build 101',
      templateSnapshot: [
        {
          id: 'snapshot-hotfix-fix',
          name: '修复与影响',
          items: [
            { id: 'snapshot-fix', title: '目标问题在修复 Build 中验证通过', isCritical: true },
            { id: 'snapshot-scope', title: '修复影响范围已经评审', isCritical: false },
            { id: 'snapshot-regression', title: '受影响核心链路回归完成', isCritical: true }
          ]
        },
        {
          id: 'snapshot-hotfix-release',
          name: '发布准备',
          items: [
            { id: 'snapshot-version', title: '版本号与补丁资源版本正确', isCritical: true },
            { id: 'snapshot-rollback', title: '回滚方案已确认并可执行', isCritical: true }
          ]
        }
      ],
      versionNotes: '修复 Android 登录 Token 刷新顺序，不涉及渲染与资源加载。',
      createdBy: '赵安',
      createdAt: '2026-09-18T09:00:00+08:00',
      updatedAt: '2026-09-18T18:20:00+08:00',
      items: [
        {
          id: 'instance-270-fix',
          groupName: '修复与影响',
          title: '目标问题在修复 Build 中验证通过',
          isCritical: true,
          source: '模板',
          status: '完成',
          handledBy: '赵安',
          handledAt: '2026-09-18T18:10:00+08:00'
        },
        {
          id: 'instance-270-scope',
          groupName: '修复与影响',
          title: '修复影响范围已经评审',
          isCritical: false,
          source: '模板',
          status: '完成',
          handledBy: '赵安',
          handledAt: '2026-09-18T16:50:00+08:00'
        },
        {
          id: 'instance-270-regression',
          groupName: '修复与影响',
          title: '受影响核心链路回归完成',
          isCritical: true,
          source: '模板',
          status: '完成',
          handledBy: '赵安',
          handledAt: '2026-09-18T18:10:00+08:00'
        },
        {
          id: 'instance-270-version',
          groupName: '发布准备',
          title: '版本号与补丁资源版本正确',
          isCritical: true,
          source: '模板',
          status: '完成',
          handledBy: '赵安',
          handledAt: '2026-09-18T17:10:00+08:00'
        },
        {
          id: 'instance-270-rollback',
          groupName: '发布准备',
          title: '回滚方案已确认并可执行',
          isCritical: true,
          source: '模板',
          status: '跳过',
          skipReason: 'Demo Hotfix 使用旧 Build 直接回退，本次不单独制作回滚包。',
          handledBy: '赵安',
          handledAt: '2026-09-18T17:20:00+08:00'
        },
        {
          id: 'instance-270-ai-token',
          groupName: 'AI 补充项',
          title: '验证旧令牌迁移失败后的重新认证路径',
          isCritical: false,
          source: 'AI 建议',
          status: '完成',
          handledBy: '赵安',
          handledAt: '2026-09-18T18:12:00+08:00'
        }
      ],
      suggestions: [
        {
          id: 'suggestion-270-token',
          title: '验证旧令牌迁移失败后的重新认证路径',
          reason: '登录 Token 刷新逻辑变化可能影响旧账号迁移。',
          status: '已接受'
        }
      ]
    }
  ],
  resources: [
    ...scaledResources,
    {
      id: 'resource-pixel',
      type: '设备',
      name: 'Pixel 8 #03',
      platform: 'Android',
      model: 'Pixel 8',
      systemVersion: 'Android 15',
      status: '占用',
      tags: ['主力机型', 'NFC']
    },
    {
      id: 'resource-iphone',
      type: '设备',
      name: 'iPhone 15 #02',
      platform: 'iOS',
      model: 'iPhone 15',
      systemVersion: 'iOS 19',
      status: '可用',
      tags: ['主力机型']
    },
    {
      id: 'resource-account',
      type: '测试账号',
      name: 'Global Lv.80 #01',
      platform: 'Global',
      status: '占用',
      tags: ['高等级', '付费', '全角色']
    },
    {
      id: 'resource-pixel-01',
      type: '设备',
      name: 'Pixel 8 #01',
      platform: 'Android',
      model: 'Pixel 8',
      systemVersion: 'Android 15',
      status: '可用',
      tags: ['主力机型', 'NFC']
    },
    {
      id: 'resource-pixel-02',
      type: '设备',
      name: 'Pixel 8 #02',
      platform: 'Android',
      model: 'Pixel 8',
      systemVersion: 'Android 15',
      status: '可用',
      tags: ['主力机型']
    },
    {
      id: 'resource-galaxy-01',
      type: '设备',
      name: 'Galaxy S24 #01',
      platform: 'Android',
      model: 'Galaxy S24',
      systemVersion: 'Android 15',
      status: '可用',
      tags: ['高刷新率']
    },
    {
      id: 'resource-galaxy-02',
      type: '设备',
      name: 'Galaxy S23 #02',
      platform: 'Android',
      model: 'Galaxy S23',
      systemVersion: 'Android 14',
      status: '可用',
      tags: ['主力机型']
    },
    {
      id: 'resource-fold',
      type: '设备',
      name: 'Galaxy Z Fold #01',
      platform: 'Android',
      model: 'Galaxy Z Fold 6',
      systemVersion: 'Android 15',
      status: '离线',
      tags: ['折叠屏', '维修中']
    },
    {
      id: 'resource-iphone-13',
      type: '设备',
      name: 'iPhone 13 #01',
      platform: 'iOS',
      model: 'iPhone 13',
      systemVersion: 'iOS 18',
      status: '占用',
      tags: ['低端机']
    },
    {
      id: 'resource-ipad',
      type: '设备',
      name: 'iPad Pro #01',
      platform: 'iOS',
      model: 'iPad Pro',
      systemVersion: 'iPadOS 19',
      status: '可用',
      tags: ['平板']
    },
    {
      id: 'resource-global-02',
      type: '测试账号',
      name: 'Global Lv.80 #02',
      platform: 'Global',
      status: '可用',
      tags: ['高等级', '全角色']
    },
    {
      id: 'resource-global-new',
      type: '测试账号',
      name: 'Global New #01',
      platform: 'Global',
      status: '可用',
      tags: ['新用户']
    },
    {
      id: 'resource-cn-01',
      type: '测试账号',
      name: 'CN Lv.70 #01',
      platform: 'CN',
      status: '占用',
      tags: ['高等级', '回流用户']
    },
    {
      id: 'resource-cn-02',
      type: '测试账号',
      name: 'CN Paid #02',
      platform: 'CN',
      status: '可用',
      tags: ['付费']
    }
  ],
  resourceReservations: [
    ...createScaledReservations(),
    {
      id: 'reservation-1',
      resourceId: 'resource-pixel-01',
      user: '陈思',
      purpose: 'Android 15 登录兼容性回归',
      startDate: '2026-09-24',
      endDate: '2026-09-26',
      activityId: 'activity-login-regression',
      createdAt: '2026-09-18T10:00:00+08:00'
    },
    {
      id: 'reservation-2',
      resourceId: 'resource-galaxy-01',
      user: '林岚',
      purpose: '支付专项',
      startDate: '2026-09-24',
      endDate: '2026-09-25',
      createdAt: '2026-09-18T11:00:00+08:00'
    },
    {
      id: 'reservation-3',
      resourceId: 'resource-galaxy-02',
      user: '周齐',
      purpose: '公会战集成验证',
      startDate: '2026-09-23',
      endDate: '2026-09-27',
      createdAt: '2026-09-19T09:00:00+08:00'
    },
    {
      id: 'reservation-4',
      resourceId: 'resource-pixel-02',
      user: '赵安',
      purpose: '性能基线复测',
      startDate: '2026-09-25',
      endDate: '2026-09-28',
      createdAt: '2026-09-19T10:00:00+08:00'
    },
    {
      id: 'reservation-5',
      resourceId: 'resource-global-02',
      user: '陈思',
      purpose: 'Global 活动验证',
      startDate: '2026-09-24',
      endDate: '2026-09-26',
      createdAt: '2026-09-18T12:00:00+08:00'
    },
    {
      id: 'reservation-6',
      resourceId: 'resource-cn-02',
      user: '周齐',
      purpose: 'CN 支付回归',
      startDate: '2026-09-22',
      endDate: '2026-09-23',
      createdAt: '2026-09-18T13:00:00+08:00'
    },
    {
      id: 'reservation-7',
      resourceId: 'resource-pixel-01',
      user: '林岚',
      purpose: '弱网专项',
      startDate: '2026-09-29',
      endDate: '2026-09-30',
      createdAt: '2026-09-20T09:00:00+08:00'
    },
    {
      id: 'reservation-8',
      resourceId: 'resource-pixel-02',
      user: '林岚',
      purpose: '弱网专项',
      startDate: '2026-09-29',
      endDate: '2026-09-30',
      createdAt: '2026-09-20T09:01:00+08:00'
    },
    {
      id: 'reservation-9',
      resourceId: 'resource-galaxy-01',
      user: '林岚',
      purpose: '弱网专项',
      startDate: '2026-09-29',
      endDate: '2026-09-30',
      createdAt: '2026-09-20T09:02:00+08:00'
    },
    {
      id: 'reservation-10',
      resourceId: 'resource-galaxy-02',
      user: '林岚',
      purpose: '弱网专项',
      startDate: '2026-09-29',
      endDate: '2026-09-30',
      createdAt: '2026-09-20T09:03:00+08:00'
    },
    {
      id: 'reservation-11',
      resourceId: 'resource-pixel',
      user: '陈思',
      purpose: 'Android 全量兼容性日',
      startDate: '2026-09-29',
      endDate: '2026-09-30',
      createdAt: '2026-09-20T09:04:00+08:00'
    }
  ],
  resourceLoans: [
    ...createScaledLoans(),
    {
      id: 'loan-pixel',
      resourceId: 'resource-pixel',
      borrower: '当前演示用户',
      purpose: '登录热修复回归',
      borrowedAt: '2026-09-18',
      dueDate: '2026-09-20',
      activityId: 'activity-login-regression'
    },
    {
      id: 'loan-iphone',
      resourceId: 'resource-iphone-13',
      borrower: '当前演示用户',
      purpose: '支付回归',
      borrowedAt: '2026-09-20',
      dueDate: '2026-09-21'
    },
    {
      id: 'loan-global',
      resourceId: 'resource-account',
      borrower: '当前演示用户',
      purpose: '活动验证',
      borrowedAt: '2026-09-20',
      dueDate: '2026-09-25'
    },
    {
      id: 'loan-cn',
      resourceId: 'resource-cn-01',
      borrower: '赵安',
      purpose: 'CN 登录回归',
      borrowedAt: '2026-09-19',
      dueDate: '2026-09-24'
    },
    {
      id: 'loan-returned',
      resourceId: 'resource-iphone',
      borrower: '陈思',
      purpose: 'iOS 冒烟',
      borrowedAt: '2026-09-12',
      dueDate: '2026-09-14',
      returnedAt: '2026-09-14'
    }
  ],
  tags: [
    '闪退',
    '卡顿',
    '登录',
    '网络',
    '支付',
    '数值',
    '文案',
    '账号',
    '安全',
    '玩法',
    '社交',
    'UI',
    '性能'
  ].map((name, index) => ({
    id: `tag-${index + 1}`,
    name,
    createdAt: '2026-09-01T09:00:00+08:00',
    updatedAt: '2026-09-01T09:00:00+08:00'
  }))
};

export function createSeedData(): DemoData {
  return structuredClone(seedData);
}
