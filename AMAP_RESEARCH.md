# 高德地图 API 调研及集成指南 (2026)

## 1. 费用与配额 (最新政策)

高德地图对开发者提供了一定的免费配额，超出后需付费。

### 免费配额 (月度)
| 服务类型 | 个人认证开发者 | 企业认证开发者 |
| :--- | :--- | :--- |
| **基础地图定位** (JS API 初始化) | 150 万次 | 3,000 万次 |
| **基础 LBS 服务** (路径规划、地理编码等) | 15 万次 | 300 万次 |
| **基础搜索服务** (关键字搜索、输入提示等) | 5,000 次 | 50,000 次 |

### 超额价格
- **基础 LBS/搜索服务**: 30 元 / 万次
- **基础地图定位**: 3 元 / 万次

## 2. 集成方式 (React + TS)

### 步骤 1: 获取 Key 和安全密钥
1. 登录 [高德开放平台控制台](https://console.amap.com/)。
2. 创建应用并添加 Key，选择 "Web 端 (JS API)"。
3. **重要**: 2021年12月后，高德要求必须配置安全密钥 (Security JS Code)。

### 步骤 2: 安装依赖
```bash
pnpm add @amap/amap-jsapi-loader
```

### 步骤 3: 编写地图组件
```tsx
import React, { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

const AmapContainer: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 配置安全密钥 (正式环境建议通过后端接口获取或环境变量注入)
    window._AMapSecurityConfig = {
      securityJsCode: '您的安全密钥', 
    };

    AMapLoader.load({
      key: '您的Key',
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.ControlBar'],
    }).then((AMap) => {
      if (mapRef.current) {
        const map = new AMap.Map(mapRef.current, {
          viewMode: '3D',
          zoom: 11,
          center: [116.397428, 39.90923], // 默认中心点
          mapStyle: 'amap://styles/darkblue', // 智慧农业推荐深色风格
        });
        
        // 添加控件
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar());
      }
    }).catch(e => {
      console.error(e);
    });
  }, []);

  return <div ref={mapRef} style={{ width: '100%', height: '500px' }} />;
};

export default AmapContainer;
```

## 3. 智慧农业适用特性
- **卫星图层**: `new AMap.TileLayer.Satellite()` 可提供高清卫星影像。
- **数据可视化 (LOCA)**: 适合展示农田产量分布、设备轨迹等大数据量场景。
- **行政区划查询**: 方便快速定位农场所属区域。
