# 设备保养管理功能开发文档

## 功能概述

本次开发为中国智慧农业平台新增了**设备保养管理系统**，包含以下核心功能：

### 1. 保养台账管理

为每台设备建立电子保养台账，记录每一次保养的详细信息：

| 字段 | 说明 |
|------|------|
| 设备信息 | 关联的农机设备 |
| 保养类型 | 常规保养、维修、检查、配件更换 |
| 保养日期 | 执行保养的日期 |
| 发动机工时 | 保养时的发动机累计工作时长 |
| 保养描述 | 本次保养的主要内容 |
| 更换配件 | 更换的配件清单（名称、数量、单位） |
| 人工费用 | 人工成本 |
| 配件费用 | 配件成本 |
| 总费用 | 人工+配件总费用 |
| 维修技师 | 负责人姓名 |
| 备注 | 其他需要记录的信息 |

### 2. 智能保养预测

基于设备工作时长（Engine Hours）、作业强度和历史故障数据，实现预测性维护：

#### 预测算法核心逻辑

```typescript
// 调整后的保养间隔 = 基础间隔 / (设备类型系数 × 作业强度系数 × 故障风险系数)
const adjustedInterval = plan.intervalHours / (machineTypeFactor * intensityFactor * failureRiskFactor);

// 下次保养工时 = 上次保养工时 + 调整后的间隔
const nextServiceHours = lastServiceHours + adjustedInterval;

// 剩余工时 = 下次保养工时 - 当前工时
const remainingHours = nextServiceHours - currentEngineHours;

// 预测日期 = 当前日期 + (剩余工时 / 平均每日工作时长)
const predictedDate = today + (remainingHours / avgDailyHours);
```

#### 紧急程度分级

| 级别 | 剩余工时 | 建议 |
|------|----------|------|
| 已逾期 | ≤ 0h | 立即安排保养 |
| 紧急 | ≤ 50h | 尽快安排 |
| 较高 | ≤ 100h | 7天内完成 |
| 中等 | ≤ 200h | 按计划执行 |
| 正常 | > 200h | 正常监控 |

#### 影响因素

1. **设备类型系数**
   - 收割机: 1.2（工作强度大，保养更频繁）
   - 拖拉机: 1.0（标准）
   - 播种机: 0.9（相对轻负荷）
   - 喷药机: 0.85（负荷较轻）

2. **作业强度系数**（基于油耗分析）
   - 根据实际油耗与标准油耗的比值计算
   - 范围: 0.8 - 1.5

3. **故障风险系数**（基于历史数据）
   - 分析历史维修记录中的故障比例
   - 故障率越高，系数越大

### 3. 车队健康评分

综合评估车队整体保养状态：

- 基础分: 100分
- 每项逾期保养: -25分
- 每项紧急保养: -15分
- 每项较高优先级: -10分
- 每项中等优先级: -5分

评分等级：
- 优秀: ≥ 85分
- 良好: ≥ 70分
- 一般: ≥ 50分
- 较差: ≥ 30分
- 危险: < 30分

## 技术实现

### 数据库表结构

#### maintenance_logs（保养记录表）

```sql
CREATE TABLE maintenance_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  machine_id INT NOT NULL,
  maintenance_type ENUM('routine', 'repair', 'inspection', 'parts_replace'),
  maintenance_date DATE NOT NULL,
  engine_hours_at_maintenance DECIMAL(10,1),
  description TEXT,
  parts_replaced JSON,
  labor_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  technician VARCHAR(100),
  notes TEXT,
  next_maintenance_hours DECIMAL(10,1),
  next_maintenance_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id)
);
```

#### maintenance_plans（保养计划表）

```sql
CREATE TABLE maintenance_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  machine_id INT NOT NULL,
  plan_type ENUM('oil_change', 'filter_replace', 'belt_check', 'brake_service', 'hydraulic_service', 'engine_overhaul', 'general_service'),
  interval_hours INT NOT NULL,
  last_service_hours DECIMAL(10,1),
  last_service_date DATE,
  next_service_hours DECIMAL(10,1),
  estimated_cost DECIMAL(10,2),
  priority INT DEFAULT 1,
  status ENUM('pending', 'due', 'overdue', 'completed') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (machine_id) REFERENCES machines(id)
);
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/maintenance/listLogs | 获取保养记录列表 |
| GET | /api/maintenance/getLog | 获取单条保养记录详情 |
| POST | /api/maintenance/createLog | 创建保养记录 |
| PUT | /api/maintenance/updateLog | 更新保养记录 |
| DELETE | /api/maintenance/deleteLog | 删除保养记录 |
| GET | /api/maintenance/listPlans | 获取保养计划列表 |
| POST | /api/maintenance/createPlan | 创建保养计划 |
| PUT | /api/maintenance/updatePlanStatus | 更新保养计划状态 |
| DELETE | /api/maintenance/deletePlan | 删除保养计划 |
| GET | /api/maintenance/getStats | 获取设备保养统计 |
| GET | /api/maintenance/predictMaintenance | 智能保养预测 |

### 前端组件

- `Maintenance.tsx` - 保养管理主页面
- `maintenancePredictor.ts` - 智能预测算法库

## 使用说明

### 访问路径

```
/dashboard/maintenance
```

### 功能入口

1. **概览** - 查看最近保养记录和待处理保养任务
2. **保养台账** - 管理所有保养记录，支持搜索和筛选
3. **智能预测** - 查看各设备的保养预测和健康评分

### 操作流程

1. **添加保养计划**
   - 点击"添加保养计划"按钮
   - 选择设备和保养项目
   - 设置保养间隔和上次保养工时
   - 系统自动计算下次保养时间

2. **记录保养**
   - 点击"添加保养记录"按钮
   - 填写保养详情（类型、日期、工时、费用等）
   - 记录更换的配件信息
   - 保存后自动更新保养计划状态

3. **查看预测**
   - 切换到"智能预测"标签页
   - 查看各设备的保养预测卡片
   - 关注紧急和逾期的保养项目
   - 根据建议安排保养工作

## 后续优化建议

1. **机器学习增强**
   - 收集更多历史数据后，可引入机器学习模型
   - 基于实际故障数据训练预测模型
   - 实现更精准的预测性维护

2. **备件库存管理**
   - 关联备件库存系统
   - 自动提醒备件采购
   - 优化备件库存水平

3. **移动端支持**
   - 开发移动端保养记录功能
   - 支持现场拍照上传
   - 实现离线数据同步

4. **报表与分析**
   - 保养成本分析报表
   - 设备可靠性分析
   - 保养效率评估

---

开发完成时间: 2026-01-02
