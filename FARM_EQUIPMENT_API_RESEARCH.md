# 农机品牌API接口调研报告

## 1. 约翰迪尔 (John Deere)

### 开发者门户
- **网址**: https://developer.deere.com/
- **状态**: 需要注册和审批

### 可用API类型
1. **Precision Tech APIs** (精准农业技术)
   - Operations Center - Equipment: 设备管理
   - Operations Center - Machine Locations: 机器位置
   - Operations Center - Machine Alerts: 机器警报
   - Operations Center - Field Operations: 田间作业
   - Operations Center - Machine Engine Hours: 发动机工时
   - ISO 15143-3 (AEMP 2.0): 机器数据标准接口

2. **Dealer Solutions APIs** (经销商解决方案)
   - 需要经销商身份

3. **Financial APIs** (金融API)
   - 需要合作伙伴身份

### 访问要求
- 需要注册开发者账号
- 需要申请API访问权限
- 需要用户OAuth授权
- **非公开免费API**

### 第三方库
- GitHub: https://github.com/RealmFive/my_john_deere_api (Ruby)
- Leaf Agriculture: 提供统一农业数据API

---

## 2. 凯斯纽荷兰 (CNH Industrial - Case IH / New Holland)

### 开发者门户
- **网址**: https://develop.cnh.com/
- **状态**: 需要注册和审批

### FieldOps API
CNH提供统一的FieldOps API，支持Case IH、New Holland、Steyr品牌。

**可用数据**:
- Vehicle Telemetry (车辆远程信息)
- Agronomic Data (农艺数据)
- Machine Data (机器数据)

### 访问要求
- 需要使用公司邮箱注册 (不支持Gmail/Hotmail)
- 需要用户OAuth授权
- 需要Farm Manager权限
- **非公开免费API**

### 品牌门户
- Case IH: AFS Connect
- New Holland: PLM Connect / MyPLM Connect
- Steyr: S-Tech

---

## 3. 克拉斯 (CLAAS)

### 开发者门户
- **网址**: https://developer.claas.com/ (CLAAS connect API Partner Portal)
- **旧API**: https://api-int.claas.com/ (已弃用，2024年10月停止新集成)
- **状态**: 需要成为合作伙伴

### CLAAS connect API接口

**API Scopes**:
1. **Online File Transfer API** - 与机器终端交换任务数据
2. **Location API** - 获取田块边界和农场信息
3. **Tracker API** - 向CLAAS connect传输远程信息数据
4. **Point Data API** - 获取远程信息和农艺机器数据

### 旧API端点 (已弃用)
- GET /farms - 获取农场列表
- GET /locations - 获取地块列表
- GET /machines/{machineId} - 获取机器详情
- GET /workbooks - 获取作业记录

### 访问要求
- 需要成为API合作伙伴
- 需要联系CLAAS API团队 (api@claas.com)
- 需要获取ClientID
- **非公开免费API**

---

## 4. 统一农业数据API平台

### Leaf Agriculture
- **网址**: https://withleaf.io/
- **状态**: 商业付费服务

**支持的品牌**:
- John Deere Operations Center
- Climate FieldView
- CNH (Case IH, New Holland)
- AGCO (Fendt, Massey Ferguson)
- Trimble
- Raven
- 等多个品牌

**定价模式**: 按英亏收费 (Price-per-acre)

**套餐**:
| 套餐 | 功能 | API Keys |
|------|------|----------|
| Core | 基础连接、田块边界、作业数据 | 5 |
| Pro | 详细机器数据、数据分享、处方发送 | 25 |
| Enterprise | 自定义同步、云部署 | 无限 |

**访问要求**: 需要联系销售获取报价，**无免费层**

---

## 5. 开源替代方案

### AgIsoStack++ (ISOBUS开源库)
- **网址**: https://agisostack.com/
- **GitHub**: https://github.com/Open-Agriculture/AgIsoStack-plus-plus
- **许可**: MIT License (完全免费)
- **功能**: ISO 11783 (ISOBUS) 和 J1939 CAN通信
- **适用**: 直接与农机硬件通信，需要CAN接口

### OpenATK
- **网址**: https://openatk.com/
- **状态**: 开源移动应用
- **功能**: 通过Trello/Dropbox同步农场数据

---

## 调研结论

### 约翰迪尔 (John Deere)
- ❌ 无公开免费API
- ✅ 有完整的开发者门户
- ⚠️ 需要申请和审批流程
- ⚠️ 需要用户OAuth授权

### 凯斯纽荷兰 (CNH Industrial)
- ❌ 无公开免费API
- ✅ 有FieldOps API开发者门户
- ⚠️ 需要公司邮箱注册
- ⚠️ 需要Farm Manager权限

### 克拉斯 (CLAAS)
- ❌ 无公开免费API
- ✅ 有CLAAS connect API Partner Portal
- ⚠️ 需要成为合作伙伴
- ⚠️ 旧API已于2024年10月弃用

### Leaf Agriculture (统一API)
- ❌ 无免费层
- ✅ 支持多品牌统一接入
- ⚠️ 按英亏收费

---

## 总结

**很遗憾，所有主流农机品牌API均需要注册/审批/付费，没有公开免费的API接口。**

如果想集成真实农机数据，建议：
1. 申请John Deere开发者账号（最完善的生态系统）
2. 或使用Leaf Agriculture统一接入多品牌
3. 或使用AgIsoStack++开源库直接与硬件通信

