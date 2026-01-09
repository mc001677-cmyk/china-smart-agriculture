# 中国智慧农业平台 - 坐标修复日志

## 修复日期
2026年1月6日

## 问题描述
吉林一号卫星地图显示空白蓝屏，原因是平台坐标设置在美国爱荷华州（Iowa），而吉林一号卫星影像只覆盖中国区域。

## 解决方案
将所有地图组件和模拟数据的坐标从美国更新为中国黑龙江省友谊农场。

## 友谊农场坐标配置

### 中心坐标
- 经度：131.85°E
- 纬度：46.85°N

### 边界范围
- 北界：46.98°N
- 南界：46.72°N
- 东界：132.01°E
- 西界：131.69°E

### 四个作业区
1. **西北作业区** (约翰迪尔): 中心 131.77°E, 46.915°N
2. **东北作业区** (凯斯): 中心 131.93°E, 46.915°N
3. **西南作业区** (纽荷兰): 中心 131.77°E, 46.785°N
4. **东南作业区** (克拉斯): 中心 131.93°E, 46.785°N

## 修改的文件列表

| 文件 | 修改内容 |
|------|----------|
| `client/src/lib/config.ts` | 主配置文件，更新 FARM_CONFIG 和 FARM_FIELDS |
| `client/src/components/GoogleMap.tsx` | 更新 MAP_CONFIG 中心坐标和边界 |
| `client/src/components/JL1SatelliteMap.tsx` | 更新默认中心坐标 |
| `client/src/components/OfflineMap.tsx` | 更新 TILE_CONFIG 中心坐标和边界 |
| `client/src/components/DashboardLayout.tsx` | 更新 JL1SatelliteMap 组件的 center 属性 |
| `client/src/contexts/FieldContext.tsx` | 更新 MOCK_FIELDS 地块坐标和默认值 |
| `client/src/lib/mockData.ts` | 更新文件头注释 |

## 验证结果
- ✅ 标准卫星地图（Google Maps）正常显示中国区域
- ✅ 吉林一号卫星地图正常加载0.5米分辨率影像
- ✅ 地图切换功能正常工作
- ✅ 农机设备位置显示在友谊农场范围内
- ✅ 作业交易市场功能正常

## 吉林一号 API 配置
- API 端点：`https://api.jl1mall.com/getMap/{z}/{x}/{-y}`
- mk: `3ddec00f5f435270285ffc7ad1a60ce5`
- tk: `ce004315969f7a4d3977ea8745c66db6`
