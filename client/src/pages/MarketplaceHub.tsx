import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Calendar, 
  Users, 
  TrendingUp, 
  Plus, 
  Search,
  Star,
  Clock,
  AlertCircle,
  CheckCircle2,
  Shield,
  Trophy,
  FileText,
  Truck
} from 'lucide-react';
import { WorkOrder, WorkType } from '@/types/marketplace';

const WORK_TYPES: WorkType[] = ['翻地', '平整', '播种', '施肥', '打药', '收割', '打包', '运输'];

const STATUS_COLORS = {
  '待抢单': 'bg-blue-100 text-blue-800',
  '已接单': 'bg-yellow-100 text-yellow-800',
  '进行中': 'bg-green-100 text-green-800',
  '待验收': 'bg-purple-100 text-purple-800',
  '已完成': 'bg-emerald-100 text-emerald-800',
  '已取消': 'bg-gray-100 text-gray-800',
  '争议中': 'bg-red-100 text-red-800',
};

export default function MarketplaceHub() {
  const [location, navigate] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");
  const base = isSimulateMode ? "/simulate" : "/dashboard";
  const to = (subpage: string) => `${base}/${subpage}`;
  const { data: me } = trpc.auth.me.useQuery();
  const canPublish = isSimulateMode || (me && ((me as any).role === "admin" || (me as any).verificationStatus === "approved"));
  const { orders, stats, searchOrders, loading } = useMarketplace();
  const [filteredOrders, setFilteredOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let filtered = orders;

    if (selectedWorkType !== 'all') {
      filtered = filtered.filter(o => o.workType === selectedWorkType);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(o => o.status === selectedStatus);
    }

    if (searchText) {
      filtered = filtered.filter(o => 
        o.fieldName.includes(searchText) || 
        o.publisherName.includes(searchText)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, selectedWorkType, selectedStatus, searchText]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              总订单数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{stats.totalOrders}</div>
            <p className="text-xs text-gray-500 mt-1">已完成 {stats.completedOrders} 单</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-blue-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              总作业面积
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.totalVolume.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">亩</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-purple-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              活跃机手
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{stats.activeContractors}</div>
            <p className="text-xs text-gray-500 mt-1">地主 {stats.activePublishers}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-orange-200 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              平台收入
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">¥{(stats.platformRevenue / 10000).toFixed(1)}w</div>
            <p className="text-xs text-gray-500 mt-1">1% 抽成</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button 
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg"
          size="lg"
          onClick={() => {
            if (!canPublish) {
              navigate("/dashboard/onboarding");
              return;
            }
            navigate(to('publish-order'));
          }}
        >
          <Plus className="h-5 w-5 mr-2" />
          发布作业需求
        </Button>
        <Button 
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-50"
          size="lg"
        >
          我的竞价
        </Button>
        <Button 
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
          size="lg"
          onClick={() => navigate(to('certification'))}
        >
          <Shield className="h-5 w-5 mr-2" />
          认证中心
        </Button>
        <Button 
          variant="outline"
          className="border-purple-300 text-purple-700 hover:bg-purple-50"
          size="lg"
          onClick={() => navigate(to('rating'))}
        >
          <Trophy className="h-5 w-5 mr-2" />
          评分排行榜
        </Button>
        <Button 
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
          size="lg"
          onClick={() => navigate(to('order-tracking'))}
        >
          <Truck className="h-5 w-5 mr-2" />
          订单追踪
        </Button>
      </div>

      {/* 搜索和过滤 */}
      <Card className="mb-6 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">搜索订单</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索地块名称或发布者..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedWorkType} onValueChange={(v) => setSelectedWorkType(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="选择作业类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                {WORK_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="选择订单状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="待抢单">待抢单</SelectItem>
                <SelectItem value="已接单">已接单</SelectItem>
                <SelectItem value="进行中">进行中</SelectItem>
                <SelectItem value="待验收">待验收</SelectItem>
                <SelectItem value="已完成">已完成</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              className="border-gray-300"
              onClick={() => {
                setSelectedWorkType('all');
                setSelectedStatus('all');
                setSearchText('');
              }}
            >
              重置筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-1">
          <TabsTrigger value="available" className="rounded-md">待抢单 ({filteredOrders.filter(o => o.status === '待抢单').length})</TabsTrigger>
          <TabsTrigger value="ongoing" className="rounded-md">进行中 ({filteredOrders.filter(o => o.status === '进行中').length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-md">已完成 ({filteredOrders.filter(o => o.status === '已完成').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4 mt-6">
          {filteredOrders.filter(o => o.status === '待抢单').map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4 mt-6">
          {filteredOrders.filter(o => o.status === '进行中').map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {filteredOrders.filter(o => o.status === '已完成').map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderCard({ order }: { order: WorkOrder }) {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{order.fieldName}</h3>
              <Badge className={`${STATUS_COLORS[order.status]}`}>
                {order.status}
              </Badge>
              <Badge variant="outline" className="border-green-300 text-green-700">
                {order.workType}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              发布者: <span className="font-medium">{order.publisherName}</span>
              <span className="ml-2 flex items-center gap-1 inline-flex">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {order.publisherRating.toFixed(1)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              ¥{order.fixedPrice || order.biddingStartPrice}
              <span className="text-sm text-gray-600 font-normal">/亩</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {order.priceType === 'fixed' ? '固定价' : '竞价'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{order.area} 亩</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {order.startDate ? new Date(order.startDate).toLocaleDateString() : '待定'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{order.preferredTime || '全天'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{order.cropType}</span>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4 line-clamp-2">{order.description}</p>

        <div className="flex gap-3">
          {order.status === '待抢单' && (
            <>
              <Button className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
                立即抢单
              </Button>
              <Button variant="outline" className="flex-1 border-green-300 text-green-700 hover:bg-green-50">
                竞价
              </Button>
            </>
          )}
          {order.status === '进行中' && (
            <Button variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
              查看进度
            </Button>
          )}
          {order.status === '已完成' && (
            <Button variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50">
              查看评价
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
