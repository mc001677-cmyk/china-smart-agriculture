# 实时数据处理与WebSocket技术研究笔记

## 1. WebSocket基础

### 1.1 什么是WebSocket
WebSocket是一种通信协议，能够在应用程序之间实现**双向通信**。

**适用场景**：
- 聊天和多人协作
- 实时体育比分更新
- 包裹配送状态更新
- 实时图表数据
- 在线多人游戏

### 1.2 WebSocket工作原理
- 与HTTP短连接不同，WebSocket使用**长连接**
- 连接建立后保持打开状态，直到任一方关闭
- 支持**全双工**通信，信息可以同时双向流动
- 一个WebSocket连接可以处理所有消息（**多路复用**）

### 1.3 基本API使用
```javascript
const socket = new WebSocket("ws://localhost:8080")

// 连接打开
socket.addEventListener("open", event => {
  socket.send("Connection established")
});

// 监听消息
socket.addEventListener("message", event => {
  console.log("Message from server ", event.data)
});
```

## 2. React中的WebSocket最佳实践

### 2.1 推荐库

| 库名 | 特点 | 适用场景 |
|------|------|----------|
| **react-use-websocket** | React专用Hook，自动重连 | 简单项目 |
| **Socket.IO** | 功能丰富，支持回退 | 中型项目 |
| **Ably** | 托管服务，无需自建服务器 | 企业级项目 |

### 2.2 useWebSocket Hook使用示例
```javascript
import useWebSocket, { ReadyState } from "react-use-websocket"

export const Dashboard = () => {
  const WS_URL = "ws://127.0.0.1:8080"
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    WS_URL,
    {
      share: false,
      shouldReconnect: () => true,
    },
  )

  useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      sendJsonMessage({
        event: "subscribe",
        data: { channel: "equipment-status" },
      })
    }
  }, [readyState])

  useEffect(() => {
    if (lastJsonMessage) {
      // 处理接收到的数据
      console.log("Received:", lastJsonMessage)
    }
  }, [lastJsonMessage])

  return <div>...</div>
}
```

### 2.3 WebSocket放置位置

| 方式 | 优点 | 缺点 |
|------|------|------|
| **顶层组件** | 简单直接 | 可能导致prop drilling |
| **Context API** | 全局可访问 | 需要额外配置 |
| **自定义Hook** | 封装良好，可复用 | 需要设计好接口 |
| **单例模式** | 确保只有一个连接 | 不够React风格 |

### 2.4 生产环境注意事项
- **认证和授权**
- **心跳检测**：检测断开连接
- **自动重连**：无缝重新连接
- **消息恢复**：恢复断开期间错过的消息

## 3. 时序数据库选择

### 3.1 主流时序数据库对比

| 数据库 | 查询语言 | 特点 | 适用场景 |
|--------|----------|------|----------|
| **InfluxDB** | InfluxQL/Flux | 专为监控设计 | 监控、告警 |
| **TimescaleDB** | SQL | PostgreSQL扩展，兼容性好 | 复杂查询、数据分析 |
| **QuestDB** | SQL | 极高性能 | 高吞吐量场景 |
| **TDengine** | SQL | 国产，专为IoT设计 | 物联网、工业数据 |

### 3.2 性能对比（1000行数据读取）
| 数据库 | 读取时间 | 存储大小 |
|--------|----------|----------|
| TimescaleDB | 0.389秒 | 136KB |
| InfluxDB | 0.5秒+ | 更大 |

### 3.3 推荐选择
**对于我们的智慧农业系统，推荐使用 TimescaleDB**：
- 基于PostgreSQL，SQL查询能力强
- 支持复杂的时间序列分析
- 与现有工具兼容性好
- 支持高基数数据

## 4. 实时数据架构设计

### 4.1 数据流架构
```
传感器/设备 → 数据采集网关 → 消息队列 → 数据处理服务 → 时序数据库
                                    ↓
                              WebSocket服务器 → React前端
```

### 4.2 消息格式设计
```typescript
interface EquipmentMessage {
  type: 'status' | 'location' | 'alert' | 'yield';
  equipmentId: string;
  timestamp: number;
  data: {
    // 状态数据
    engineRpm?: number;
    speed?: number;
    fuelLevel?: number;
    temperature?: number;
    // 位置数据
    latitude?: number;
    longitude?: number;
    heading?: number;
    // 产量数据
    yieldRate?: number;
    moisture?: number;
    area?: number;
  };
}
```

### 4.3 数据更新频率
| 数据类型 | 更新频率 | 说明 |
|----------|----------|------|
| 位置数据 | 1-5 Hz | GPS坐标、航向 |
| 发动机数据 | 1 Hz | 转速、温度、油耗 |
| 产量数据 | 1 Hz | 实时产量、水分 |
| 告警数据 | 实时 | 事件驱动 |
| 统计数据 | 10秒 | 汇总统计 |

## 5. 应用于我们系统的建议

### 5.1 WebSocket服务实现
```typescript
// server/websocket.ts
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// 设备状态广播
function broadcastEquipmentStatus(data: EquipmentMessage) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// 定时推送设备状态
setInterval(() => {
  const equipmentData = getLatestEquipmentData();
  broadcastEquipmentStatus(equipmentData);
}, 1000);
```

### 5.2 React客户端实现
```typescript
// hooks/useEquipmentWebSocket.ts
import useWebSocket from 'react-use-websocket';

export function useEquipmentWebSocket() {
  const { lastJsonMessage, readyState } = useWebSocket(
    'ws://localhost:8080',
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    }
  );

  const [equipmentStatus, setEquipmentStatus] = useState<Map<string, Equipment>>(new Map());

  useEffect(() => {
    if (lastJsonMessage) {
      setEquipmentStatus(prev => {
        const next = new Map(prev);
        next.set(lastJsonMessage.equipmentId, lastJsonMessage.data);
        return next;
      });
    }
  }, [lastJsonMessage]);

  return { equipmentStatus, isConnected: readyState === ReadyState.OPEN };
}
```

### 5.3 数据缓存策略
- **内存缓存**：最近5分钟的实时数据
- **本地存储**：用户偏好设置
- **服务端缓存**：Redis缓存热点数据
- **数据库**：历史数据持久化

---
*研究日期：2026年1月2日*
*来源：Ably Blog, 学术论文, 技术文档*
