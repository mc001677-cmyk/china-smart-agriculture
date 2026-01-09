# 设备遥测上报统一 JSON 规范（v0.1）

本规范用于“正式运行”模式（**硬件直连 + HTTP 上报**）的第一版对接：  
目标是先跑通 **看得见全场 + 管得住机队**，并为后续 **告警闭环 / 维保深版 / 健康度推断** 留好扩展位。

---

## 1. 上报方式（HTTP）

### 1.1 单条上报
- **Method**：`POST`
- **Path**：`/api/telemetry`
- **Content-Type**：`application/json`

### 1.2 批量补传（离线缓冲/断点续传）
- **Method**：`POST`
- **Path**：`/api/telemetry/batch`
- **Body**：`{ items: TelemetryEnvelope[] }`
- **建议**：一次 50～500 条（按网络与设备能力调优）

### 1.3 心跳（可选）
- **Method**：`POST`
- **Path**：`/api/telemetry/heartbeat`
- **用途**：只报告在线/信号/电量/时间同步等，不含定位

> 说明：当前仓库未内置这 3 个 HTTP 接口实现（后续会按本规范落地）。本规范先用于对接统一标准。

---

## 2. 鉴权与签名（建议：HMAC）

### 2.1 头部（Headers）
- `X-Device-Id`: 设备唯一ID（与 body.deviceId 一致）
- `X-Timestamp`: Unix 毫秒时间戳（例如 `1736265600123`）
- `X-Nonce`: 随机串（防重放，建议 16～32 字符）
- `X-Signature`: 签名（Base64 或 Hex）
- `X-Signature-Alg`: 固定 `HMAC-SHA256`

### 2.2 签名原文（canonical string）

建议使用以下拼接顺序（换行分隔）：

```
<X-Timestamp>\n
<X-Nonce>\n
<HTTP_METHOD>\n
<HTTP_PATH>\n
<SHA256_HEX(body_raw)>
```

- `body_raw`：请求体原始 JSON 字符串（设备侧发出的原文）
- 平台侧用设备的 `deviceSecret` 计算：
  - `signature = HMAC_SHA256(deviceSecret, canonical_string)`

### 2.3 防重放
- 平台侧校验 `X-Timestamp` 与服务器时间偏差（建议 ≤ 5 分钟）
- 平台侧对 `X-Nonce` 做短期去重缓存（建议 10 分钟）

---

## 3. 数据模型（统一 Envelope）

每次上报都用同一个包裹结构（Envelope），保证可扩展与可追溯。

### 3.1 TelemetryEnvelope（顶层）

必填字段（M）：
- `schema`: string（M）固定 `"telemetry.v0.1"`
- `deviceId`: string（M）设备唯一ID（建议 SN 或企业资产编码）
- `sentAt`: number（M）设备发送时间（Unix ms）
- `seq`: number（M）单设备自增序号（用于补传/排序）
- `payload`: object（M）遥测内容（见下）

可选字段（O）：
- `gatewayId`: string（O）若经网关转发，填网关ID
- `firmwareVersion`: string（O）固件版本
- `projectId`: string（O）农场/项目ID（多租户预留）
- `signature`: object（O）若不走 header，可内嵌签名信息（不推荐）

### 3.2 payload（遥测内容）

建议按模块分组，便于后续扩展：
- `position`：定位与姿态
- `state`：运行状态（工作/怠速/移动/离线…）
- `powertrain`：发动机/动力链关键参数
- `consumables`：燃油/DEF 等消耗品
- `work`：作业过程关键值（幅宽/作业状态/作业模式）
- `dtc`：故障码/诊断
- `health`：健康度（先规则后推断）
- `network`：信号/网络/定位精度

---

## 4. 字段清单（v0.1 最小可用 + 为 C 阶段预留）

### 4.1 position（定位）
- `position.lat`: number（M）纬度 WGS84
- `position.lng`: number（M）经度 WGS84
- `position.altM`: number（O）海拔（米）
- `position.headingDeg`: number（O）航向 0-360
- `position.speedKph`: number（O）速度 km/h

### 4.2 state（状态）
- `state.status`: string（M）建议枚举：
  - `"working" | "moving" | "idle" | "power_on" | "off" | "offline"`
- `state.statusText`: string（O）人类可读状态
- `state.isIgnitionOn`: boolean（O）点火状态

### 4.3 consumables（消耗品）
- `consumables.fuelPct`: number（O）0-100
- `consumables.defPct`: number（O）0-100
- `consumables.fuelRateLph`: number（O）L/h
- `consumables.defRateLph`: number（O）L/h

### 4.4 powertrain（动力系统）
（用于规则告警/后续健康度推断）
- `powertrain.rpm`: number（O）
- `powertrain.loadPct`: number（O）0-100
- `powertrain.coolantTempC`: number（O）
- `powertrain.oilTempC`: number（O）
- `powertrain.oilPressureKpa`: number（O）
- `powertrain.airTempC`: number（O）
- `powertrain.intakeHumidityPct`: number（O）

### 4.5 aftertreatment（后处理，建议放在 powertrain 下或单独模块）
- `aftertreatment.scrInTempC`: number（O）
- `aftertreatment.scrOutTempC`: number（O）
- `aftertreatment.dpfSootG`: number（O）
- `aftertreatment.dpfDiffPressureKpa`: number（O）

### 4.6 work（作业）
- `work.mode`: string（O）如 `"harvest" | "transport" | "tillage" | ...`
- `work.isInField`: boolean（O）是否在地块内（可由平台计算回填）
- `work.swathWidthM`: number（O）作业幅宽（用于面积/覆盖率）
- `work.estimatedAreaMu`: number（O）本次上报周期内估算面积（可选）

### 4.7 dtc（故障码/诊断）
- `dtc.active`: Array（O）当前激活故障
  - `code`: string（M）故障码（例如 Pxxxx）
  - `level`: `"info" | "warning" | "error"`（M）
  - `firstSeenAt`: number（O）Unix ms
  - `message`: string（O）

### 4.8 health（健康度）
> v0.1：**先规则告警（C）**；v0.2：平台侧推断（B）

- `health.engineOilHealthPct`: number（O）0-100
- `health.hydraulicOilHealthPct`: number（O）0-100
- `health.filterHealthPct`: number（O）0-100
- `health.overallHealthPct`: number（O）0-100

### 4.9 network（网络/定位质量）
- `network.rssiDbm`: number（O）
- `network.netType`: string（O）`"4g"|"5g"|"nb-iot"|"wifi"|...`
- `network.gpsHdop`: number（O）定位精度指标（越小越好）
- `network.satellites`: number（O）卫星数

---

## 5. 示例 JSON（单条上报）

```json
{
  "schema": "telemetry.v0.1",
  "deviceId": "JD-S760-0001",
  "sentAt": 1736265600123,
  "seq": 10241,
  "projectId": "youyi_farm",
  "firmwareVersion": "fw-1.3.8",
  "payload": {
    "position": {
      "lat": 46.88512,
      "lng": 131.82156,
      "headingDeg": 128,
      "speedKph": 6.4
    },
    "state": {
      "status": "working",
      "statusText": "Corn Harvesting",
      "isIgnitionOn": true
    },
    "consumables": {
      "fuelPct": 63.2,
      "defPct": 51.4,
      "fuelRateLph": 52.8
    },
    "powertrain": {
      "rpm": 1850,
      "loadPct": 72,
      "coolantTempC": 88,
      "oilTempC": 96,
      "oilPressureKpa": 320
    },
    "aftertreatment": {
      "scrInTempC": 285,
      "scrOutTempC": 260,
      "dpfSootG": 8.6,
      "dpfDiffPressureKpa": 2.4
    },
    "dtc": {
      "active": [
        { "code": "P20EE", "level": "warning", "message": "SCR NOx efficiency low" }
      ]
    },
    "network": {
      "netType": "4g",
      "rssiDbm": -79,
      "gpsHdop": 0.9,
      "satellites": 18
    }
  }
}
```

---

## 6. 上报频率建议（v0.1）

按场景分级（可配置）：
- **作业中**：1～2 秒/次（大屏更“实时”）
- **移动中**：2～5 秒/次
- **怠速/待机**：10～30 秒/次
- **熄火**：不必上报（或 5 分钟心跳一次）
- **离线补传**：恢复网络后批量补传（按 `seq` 排序）

---

## 7. 平台返回（建议）

### 成功
- `200 OK`
```json
{ "ok": true, "serverTime": 1736265600456 }
```

### 典型错误码
- `400`：字段缺失/类型不对
- `401`：签名错误/设备未注册
- `409`：重复 `nonce` 或重复 `seq`（可做幂等）
- `429`：限流
- `500`：服务器内部错误

---

## 8. 下一步（对应你的路线）

你确认的路线：  
- **V1**：统一 JSON + HTTP 上报（本规范）  
- **V2**：实时位置/状态大屏（A）  
- **V3**：规则告警/故障码 + 告警闭环 + 维保深版（C）  
- **V4**：平台侧健康度推断（B）  

