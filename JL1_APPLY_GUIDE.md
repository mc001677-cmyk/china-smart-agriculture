# 吉林一号切片影像套件申请指南

## 申请步骤

### 1. 访问吉林一号网
- 网址: https://www.jl1mall.com/
- 进入【遥感商城】→【切片影像套件】

### 2. 注册账号
- 点击"使用体验版"
- 首次使用需填写相关信息完成注册申请

### 3. 获取密钥
- 登录后进入【套件管理】页面
- 复制 **TK** (套件Token)
- 选择所需的 **MK** (图层Key)
  - 推荐选择: 2022年度全国高质量一张图

### 4. API调用格式
```
https://api.jl1mall.com/getMap/{z}/{x}/{-y}?mk=${MK}&tk=${TK}
```

## 免费套餐说明
- 体验版: 免费在线使用2022年度全国高质量一张图
- 教育用户: 认证后可免费下载数据
- 1分钱套餐: 25平方公里专业版切片影像

## 代码示例 (Leaflet)
```javascript
const JL1_CONFIG = {
  mk: 'YOUR_MK_HERE',  // 替换为您的MK
  tk: 'YOUR_TK_HERE'   // 替换为您的TK
};

const satelliteLayer = L.tileLayer(
  `https://api.jl1mall.com/getMap/{z}/{x}/{-y}?mk=${JL1_CONFIG.mk}&tk=${JL1_CONFIG.tk}`,
  { 
    maxZoom: 18, 
    minZoom: 1,
    attribution: '© 吉林一号卫星 | 长光卫星'
  }
);
```

## 注意事项
- 示例密钥可能已失效，需要自行申请
- 坐标系: Web Mercator (EPSG:3857)
- Leaflet使用 `{-y}` 格式
