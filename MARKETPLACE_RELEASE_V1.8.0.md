# 宇诺智慧农业平台 V1.8.0 - 农机作业交易模块发布说明

**发布日期**: 2024年1月3日  
**版本**: 1.8.0  
**主要功能**: 农机作业交易市场模块

## 📋 功能概览

### 核心功能模块

#### 1. 交易大厅 (Marketplace Hub)
- **路由**: `/dashboard/marketplace`
- **功能**:
  - 平台统计展示（总订单、总面积、活跃机手、平台收入）
  - 订单搜索和多维度筛选
  - 按作业类型筛选（翻地、平整、播种、施肥、打药、收割、打包、运输）
  - 按订单状态筛选（待抢单、进行中、已完成）
  - 订单列表展示，包含发布者信息、价格、面积等关键信息
  - 快速操作按钮（竞价、查看详情、追踪进度等）

#### 2. 发布订单 (Publish Order)
- **路由**: `/dashboard/publish-order`
- **功能**:
  - 3步骤向导式订单发布流程
  - 第一步：基本信息（作业类型、地块名称、面积、作物类型）
  - 第二步：地块详情（开始/结束日期、偏好时间、作业描述）
  - 第三步：价格设置（固定价/竞价模式、价格预览）
  - 实时价格计算和预览
  - 订单发布后自动加入交易大厅

#### 3. 认证中心 (Certification Center)
- **路由**: `/dashboard/certification`
- **功能**:
  - 身份认证（必需）
  - 驾照认证（必需）
  - 营业执照认证（可选）
  - 设备认证（可选）
  - 认证进度展示
  - 成就徽章系统（精准播种大师、低损失收割手、准时完成王等）
  - 认证好处说明（提高信用分、优先接单、保证金减免）

#### 4. 评分与排行榜 (Rating & Leaderboard)
- **路由**: `/dashboard/rating`
- **功能**:
  - 双维度评分系统
    - 机手评分：作业质量(40%)、准时性(20%)、服务态度(20%)、设备级别(20%)
    - 地主评分：付款准时(40%)、地块描述准确(30%)、配合程度(20%)、评价态度(10%)
  - 排行榜展示（全部/质量/效率排行）
  - 按作业类型筛选排行
  - 信用分等级系统（S/A/B/C/D）
  - 最近评价展示

#### 5. 订单追踪 (Order Tracking)
- **路由**: `/dashboard/order-tracking`
- **功能**:
  - 订单列表和详情展示
  - 作业进度时间线（订单发布→接单→作业中→完成→验收→评价→结算）
  - 订单详情信息展示
  - 发布者/承接者信息卡片
  - 地块信息详情
  - 与机手/地主的实时沟通功能
  - 进度追踪和状态更新

### 数据结构

#### WorkOrder（作业订单）
```typescript
{
  id: string;
  orderId: string;
  publisherId: string;
  publisherName: string;
  publisherRating: number;
  contractorId?: string;
  contractorName?: string;
  contractorRating?: number;
  workType: WorkType; // 8种作业类型
  fieldId: string;
  fieldName: string;
  area: number; // 亩
  cropType: string;
  startDate: Date;
  endDate: Date;
  preferredTime?: string;
  priceType: 'fixed' | 'bidding';
  fixedPrice?: number; // 元/亩
  biddingStartPrice?: number;
  finalPrice?: number;
  status: OrderStatus; // 7种状态
  description: string;
  requirements?: string[];
  trackingData?: {...};
  inspection?: {...};
  publisherReview?: {...};
  contractorReview?: {...};
  deposit: number; // 保证金
  platformFee: number; // 1%抽成
  paymentStatus: 'pending' | 'paid' | 'refunded';
}
```

#### MarketplaceUser（用户信息）
```typescript
{
  id: string;
  name: string;
  role: '地主' | '机手' | '平台管理员';
  phone: string;
  rating: number; // 0-100信用分
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  certifications: UserCertification[];
  deposit: number;
  createdAt: Date;
  lastActiveAt: Date;
}
```

### 交易流程

```
发布订单 → 待抢单 → 机手竞价 → 确认接单 → 进行中 → 完成作业 → 待验收 → 验收通过 → 已完成 → 双向评价 → 结算
```

### 平台费用

- **平台抽成**: 1%（为人民服务原则）
- **保证金**: 订单总价的10-20%，最高2000元
- **保证金减免**: 高认证等级可减免最高50%

## 📊 示例数据

### 初始化数据包含：
- **4个示例订单**
  - 1个待抢单（收割 150亩 玉米）
  - 1个进行中（播种 200亩 大豆）
  - 1个已完成（翻地 100亩 小麦）
  - 1个待抢单（施肥 80亩 玉米）

- **5个排行榜机手**
  - 李四机队（S级，4.9分，65单）
  - 王五农机（A级，4.7分，52单）
  - 赵六机手（A级，4.6分，48单）
  - 孙七车队（B级，4.5分，42单）
  - 周八农机（B级，4.4分，38单）

- **平台统计**
  - 总订单数: 1250
  - 已完成: 1180
  - 总面积: 125000亩
  - 总交易额: 1500万元
  - 活跃机手: 328
  - 活跃地主: 456
  - 平台收入: 15万元

## 🔧 技术实现

### 新增文件

```
client/src/
├── pages/
│   ├── MarketplaceHub.tsx          # 交易大厅
│   ├── PublishOrder.tsx            # 发布订单
│   ├── CertificationCenter.tsx      # 认证中心
│   ├── RatingAndLeaderboard.tsx     # 评分排行榜
│   └── OrderTracking.tsx            # 订单追踪
├── types/
│   └── marketplace.ts              # 类型定义
├── contexts/
│   └── MarketplaceContext.tsx       # 状态管理（已更新）
└── data/
    └── marketplaceData.ts          # 示例数据
```

### 核心组件

1. **MarketplaceProvider** - 全局状态管理
   - 订单管理（发布、取消、完成、验收）
   - 竞价管理（竞价、接受、拒绝）
   - 认证管理（提交、查询）
   - 排行榜管理

2. **UI组件** - 使用 Shadcn/UI + Tailwind CSS
   - Card、Badge、Button、Tabs、Select 等
   - Glass morphism 效果
   - 响应式设计
   - 深色/浅色主题支持

### 集成点

- **导航栏**: CNHHeader 中添加"作业交易"标签
- **路由**: Dashboard 中添加 5 个新路由
- **Provider**: App.tsx 中添加 MarketplaceProvider
- **样式**: 使用现有的 Tailwind CSS 配置

## 🚀 使用指南

### 访问交易模块

1. **交易大厅**: 点击顶部导航栏"作业交易"按钮
2. **发布订单**: 在交易大厅点击"发布作业需求"按钮
3. **认证中心**: 在用户菜单中选择"认证中心"
4. **排行榜**: 在交易大厅查看"排行榜"标签
5. **订单追踪**: 点击订单卡片的"追踪进度"按钮

### 订单发布流程

1. 点击"发布作业需求"按钮
2. 填写基本信息（作业类型、地块名称、面积、作物）
3. 填写地块详情（时间、描述、要求）
4. 设置价格（固定价或竞价）
5. 确认并发布

### 认证流程

1. 进入认证中心
2. 选择要认证的类型
3. 上传相关文件
4. 等待审核（1-2天）
5. 认证通过后获得徽章和信用分加成

## 📈 后续扩展计划

### V1.9.0 计划功能
- [ ] 支付集成（支付宝、微信支付）
- [ ] 电子合同签署
- [ ] 保证金管理系统
- [ ] 纠纷仲裁系统
- [ ] 发票管理

### V2.0.0 计划功能
- [ ] AI 价格推荐系统
- [ ] 智能匹配算法
- [ ] 机手调度优化
- [ ] 天气预警集成
- [ ] 作业质量 AI 评估

## 🔐 安全性

- 所有订单操作都记录在案
- 支持订单争议处理
- 用户认证和身份验证
- 支付安全保障
- 数据加密存储

## 📞 技术支持

如有问题，请联系开发团队。

---

**开发团队**: 宇诺智慧农业平台开发组  
**最后更新**: 2024年1月3日
