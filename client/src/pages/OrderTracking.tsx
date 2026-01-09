import React, { useState, useEffect } from 'react';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Phone,
  MapIcon,
  TrendingUp,
  DollarSign,
  User
} from 'lucide-react';
import { OrderStatus, WorkOrder } from '@/types/marketplace';

const STATUS_COLORS: Record<OrderStatus, string> = {
  '待抢单': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  '已接单': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  '进行中': 'bg-blue-100 text-blue-800 border-blue-300',
  '待验收': 'bg-orange-100 text-orange-800 border-orange-300',
  '已完成': 'bg-green-100 text-green-800 border-green-300',
  '已取消': 'bg-red-100 text-red-800 border-red-300',
  '争议中': 'bg-rose-100 text-rose-800 border-rose-300',
};

export default function OrderTracking() {
  const { orders } = useMarketplace();
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(orders[0] || null);
  const [activeTab, setActiveTab] = useState('details');

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 顶部标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <MapIcon className="h-10 w-10 text-cyan-600" />
            订单追踪
          </h1>
          <p className="text-gray-600">实时监控作业进度，与机手/地主沟通</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 订单列表 */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg h-full">
              <CardHeader>
                <CardTitle className="text-lg">订单列表</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedOrder?.id === order.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm text-gray-900">{order.workType}</p>
                      <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{order.fieldName}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.area} 亩 · ¥{order.fixedPrice}/亩</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 订单详情 */}
          <div className="lg:col-span-2 space-y-6">
            {selectedOrder ? (
              <>
                {/* 订单基本信息 */}
                <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">{selectedOrder.workType} - {selectedOrder.fieldName}</CardTitle>
                        <CardDescription className="mt-1">订单号：{selectedOrder.id}</CardDescription>
                      </div>
                      <Badge className={`text-base border ${STATUS_COLORS[selectedOrder.status]}`}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">作业面积</p>
                        <p className="font-bold text-lg text-gray-900">{selectedOrder.area} 亩</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">单价</p>
                        <p className="font-bold text-lg text-green-600">¥{selectedOrder.fixedPrice}/亩</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">总价</p>
                        <p className="font-bold text-lg text-green-700">¥{(selectedOrder.area * selectedOrder.fixedPrice!).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">平台费用</p>
                        <p className="font-bold text-lg text-orange-600">¥{(selectedOrder.area * selectedOrder.fixedPrice! * 0.01).toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 标签页 */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-1">
                    <TabsTrigger value="details" className="rounded-md">订单详情</TabsTrigger>
                    <TabsTrigger value="progress" className="rounded-md">作业进度</TabsTrigger>
                    <TabsTrigger value="communication" className="rounded-md">沟通</TabsTrigger>
                  </TabsList>

                  {/* 订单详情 */}
                  <TabsContent value="details" className="mt-6">
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg">订单详情</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* 发布者信息 */}
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            发布者信息
                          </h3>
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="font-medium text-gray-900">{selectedOrder.publisherName}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className="text-yellow-400">★</span>
                              ))}
                              <span className="text-sm text-gray-600">{selectedOrder.publisherRating}/5.0</span>
                            </div>
                          </div>
                        </div>

                        {/* 地块信息 */}
                        <div>
                          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-green-600" />
                            地块信息
                          </h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">作物类型：</span>
                              <span className="font-medium">{selectedOrder.cropType}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">作业时间：</span>
                              <span className="font-medium">
                                {new Date(selectedOrder.startDate).toLocaleDateString()} - {new Date(selectedOrder.endDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">偏好时间：</span>
                              <span className="font-medium">{selectedOrder.preferredTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* 作业描述 */}
                        <div>
                          <h3 className="font-bold text-gray-900 mb-2">作业描述</h3>
                          <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded border border-gray-200">
                            {selectedOrder.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 作业进度 */}
                  <TabsContent value="progress" className="mt-6">
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg">作业进度</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* 进度条 */}
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">完成进度</span>
                              <span className="text-sm font-bold text-green-600">75%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{ width: '75%' }} />
                            </div>
                          </div>

                          {/* 时间线 */}
                          <div className="mt-6 space-y-4">
                            {[
                              { status: '订单已发布', time: '2024-01-02 10:00', completed: true },
                              { status: '机手已接单', time: '2024-01-02 11:30', completed: true },
                              { status: '作业进行中', time: '2024-01-02 14:00', completed: true },
                              { status: '作业已完成', time: '预计 2024-01-03 16:00', completed: false },
                              { status: '订单已结算', time: '待完成', completed: false },
                            ].map((item, idx) => (
                              <div key={idx} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                  <div className={`w-4 h-4 rounded-full ${item.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                                  {idx < 4 && <div className={`w-0.5 h-12 ${item.completed ? 'bg-green-500' : 'bg-gray-300'}`} />}
                                </div>
                                <div className="pt-1">
                                  <p className="font-medium text-gray-900">{item.status}</p>
                                  <p className="text-xs text-gray-600">{item.time}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* 沟通 */}
                  <TabsContent value="communication" className="mt-6">
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg">与机手沟通</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* 快速联系 */}
                        <div className="flex gap-2">
                          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                            <Phone className="h-4 w-4 mr-2" />
                            拨打电话
                          </Button>
                          <Button variant="outline" className="flex-1 border-blue-300">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            发送消息
                          </Button>
                        </div>

                        {/* 消息历史 */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {[
                            { sender: '机手李四', message: '我接单了，明天上午10点开始作业', time: '14:30' },
                            { sender: '你', message: '好的，地块在北边，注意避开水渠', time: '14:35' },
                            { sender: '机手李四', message: '收到，已记下。预计下午5点完成', time: '14:40' },
                          ].map((msg, idx) => (
                            <div key={idx} className={`p-3 rounded-lg ${msg.sender === '你' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'}`}>
                              <p className="text-xs text-gray-600 mb-1">{msg.sender} · {msg.time}</p>
                              <p className="text-sm text-gray-900">{msg.message}</p>
                            </div>
                          ))}
                        </div>

                        {/* 输入框 */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="输入消息..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                          />
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white">发送</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">请选择一个订单查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
