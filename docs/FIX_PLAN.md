# 地图定位问题修复方案

## 一、问题定义

**问题**：部分车辆定位到城镇，不在农田内
**根因**：我扩大了坐标范围，算法随机生成的坐标没有验证是否在农田内

## 二、修复目标

1. 所有80台设备必须显示在农田内
2. 地图定位准确，不漂移
3. 设备分布合理，不重叠
4. 一次修复，不再反复

## 三、修复方案

### 3.1 坐标范围（严格限制）

使用原始版本验证过的范围：
- **纬度**：46.745 - 46.770（南北约2.8km）
- **经度**：131.830 - 131.880（东西约3.5km）
- **中心点**：46.7575°N, 131.855°E

### 3.2 象限划分

将范围划分为4个象限，每个象限分配一个品牌：

```
经度:   131.830      131.855      131.880
纬度:
46.770  ┌────────────┬────────────┐
        │   西北区   │   东北区   │
        │ john_deere │  case_ih   │
        │  23台设备  │  20台设备  │
46.7575 ├────────────┼────────────┤
        │   西南区   │   东南区   │
        │new_holland │   claas    │
        │  19台设备  │  18台设备  │
46.745  └────────────┴────────────┘
```

### 3.3 每个象限的精确边界

| 象限 | 品牌 | 南边界 | 北边界 | 西边界 | 东边界 |
|------|------|--------|--------|--------|--------|
| 西北 | john_deere | 46.7575 | 46.770 | 131.830 | 131.855 |
| 东北 | case_ih | 46.7575 | 46.770 | 131.855 | 131.880 |
| 西南 | new_holland | 46.745 | 46.7575 | 131.830 | 131.855 |
| 东南 | claas | 46.745 | 46.7575 | 131.855 | 131.880 |

### 3.4 设备坐标生成算法

```typescript
function generateMachineCoordinate(quadrant: Quadrant): Coordinate {
  // 1. 获取象限边界
  const { south, north, west, east } = quadrant.boundary;
  
  // 2. 计算象限中心
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  
  // 3. 在中心附近随机偏移（±0.004度，约400米）
  // 但不能超出象限边界
  const maxOffset = 0.004;
  const latOffset = (Math.random() - 0.5) * 2 * maxOffset;
  const lngOffset = (Math.random() - 0.5) * 2 * maxOffset;
  
  // 4. 计算最终坐标
  let lat = centerLat + latOffset;
  let lng = centerLng + lngOffset;
  
  // 5. 边界检查（关键！）
  lat = Math.max(south + 0.001, Math.min(north - 0.001, lat));
  lng = Math.max(west + 0.001, Math.min(east - 0.001, lng));
  
  return { lat, lng };
}
```

### 3.5 边界保护机制

**三重保护**：
1. **生成时限制**：随机偏移不超过±0.004度
2. **生成后检查**：确保在象限边界内
3. **波动时限制**：fluctuate函数使用严格的min/max

### 3.6 fluctuate函数

保持原始版本的设计：
```typescript
export const fluctuate = (
  base: number, 
  variance: number, 
  min: number = 0, 
  max: number = 10000
): number => {
  const change = (Math.random() - 0.5) * variance;
  let newValue = base + change;
  return Math.max(min, Math.min(max, newValue));
};
```

坐标波动时的调用方式：
```typescript
// 纬度波动，限制在象限边界内
newLat = fluctuate(machine.lat, 0.0005, quadrant.south, quadrant.north);
// 经度波动，限制在象限边界内
newLng = fluctuate(machine.lng, 0.0005, quadrant.west, quadrant.east);
```

## 四、论证

### 4.1 为什么这个方案能解决问题？

1. **坐标范围来自原始版本** - 已验证都在农田内
2. **象限划分确保分布均匀** - 不会有设备重叠
3. **三重边界保护** - 绝对不会超出范围
4. **小范围偏移** - ±400米，不会跑到城镇

### 4.2 风险分析

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| 设备超出边界 | 极低 | 高 | 三重边界保护 |
| 设备重叠 | 低 | 低 | 80台设备在10平方公里内，密度可接受 |
| 地图加载失败 | 低 | 中 | 与坐标无关，不在本次修复范围 |

### 4.3 测试计划

1. 生成所有80台设备后，检查每台设备的坐标是否在边界内
2. 在地图上查看所有设备是否都在农田区域
3. 点击不同品牌的设备，验证地图定位是否正确
4. 观察设备位置波动，确认不会漂移出边界

## 五、需要修改的文件

1. **config.ts** - 已修改，使用原始坐标范围
2. **mockData.ts** - 需要重写，使用新的坐标生成算法

## 六、实施检查清单

- [ ] config.ts 中的边界是 46.745-46.770, 131.830-131.880
- [ ] mockData.ts 中的设备生成使用象限划分
- [ ] 每台设备的坐标都在对应象限边界内
- [ ] fluctuate函数有4个参数，包含min/max
- [ ] 坐标波动时使用严格的边界限制
- [ ] 地图中心点是 46.7575, 131.855
- [ ] 地图缩放级别是14
