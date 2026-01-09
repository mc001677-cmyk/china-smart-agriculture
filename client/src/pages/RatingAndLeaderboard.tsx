import React, { useState } from 'react';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Star, 
  TrendingUp,
  Award,
  Users,
  Zap,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { LeaderboardEntry, WorkType } from '@/types/marketplace';

const WORK_TYPES: WorkType[] = ['翻地', '平整', '播种', '施肥', '打药', '收割', '打包', '运输'];

export default function RatingAndLeaderboard() {
  const { leaderboard, getLeaderboard } = useMarketplace();
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | 'all'>('all');

  const filteredLeaderboard = selectedWorkType === 'all' 
    ? leaderboard 
    : leaderboard.filter(entry => entry.specialization === selectedWorkType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 顶部标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Award className="h-10 w-10 text-yellow-600" />
            评分系统 & 排行榜
          </h1>
          <p className="text-gray-600">发现平台最优秀的机手和地主</p>
        </div>

        {/* 评分系统说明 */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              评分系统说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  机手/车队评分维度
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">作业质量</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">40%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">准时性</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">20%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">服务态度</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">20%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">设备级别</span>
                    <Badge variant="outline" className="border-blue-300 text-blue-700">20%</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  地主/农场主评分维度
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">付款准时</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">40%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">地块描述准确</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">30%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">配合程度</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">20%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">评价态度</span>
                    <Badge variant="outline" className="border-purple-300 text-purple-700">10%</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 排行榜 */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-1">
            <TabsTrigger value="all" className="rounded-md">全部排行</TabsTrigger>
            <TabsTrigger value="quality" className="rounded-md">质量排行</TabsTrigger>
            <TabsTrigger value="efficiency" className="rounded-md">效率排行</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {/* 筛选 */}
              <div className="flex gap-2 flex-wrap">
                <Badge 
                  variant={selectedWorkType === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedWorkType('all')}
                >
                  全部作业
                </Badge>
                {WORK_TYPES.map(type => (
                  <Badge 
                    key={type}
                    variant={selectedWorkType === type ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedWorkType(type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>

              {/* 排行榜列表 */}
              <div className="space-y-3">
                {filteredLeaderboard.map((entry) => (
                  <LeaderboardCard key={entry.userId} entry={entry} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="mt-6">
            <div className="space-y-3">
              {[...filteredLeaderboard].sort((a, b) => b.avgQualityScore - a.avgQualityScore).map((entry) => (
                <LeaderboardCard key={entry.userId} entry={entry} metric="quality" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="mt-6">
            <div className="space-y-3">
              {[...filteredLeaderboard].sort((a, b) => a.avgCompletionTime - b.avgCompletionTime).map((entry) => (
                <LeaderboardCard key={entry.userId} entry={entry} metric="efficiency" />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* 评价示例 */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              最近评价
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  reviewer: '张三（地主）',
                  target: '李四（机手）',
                  rating: 5,
                  comment: '作业质量非常好，机器操作很专业，按时完成，强烈推荐！',
                  date: '2024-01-02',
                },
                {
                  reviewer: '王五（机手）',
                  target: '赵六（地主）',
                  rating: 4,
                  comment: '地块描述准确，付款及时，配合度高，期待下次合作。',
                  date: '2024-01-01',
                },
              ].map((review, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{review.reviewer} → {review.target}</p>
                      <p className="text-xs text-gray-500">{review.date}</p>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 信用分等级 */}
        <Card className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              信用分等级
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { level: 'S', range: '90-100', color: 'bg-red-100 text-red-800', desc: '顶级' },
                { level: 'A', range: '80-89', color: 'bg-orange-100 text-orange-800', desc: '优秀' },
                { level: 'B', range: '70-79', color: 'bg-yellow-100 text-yellow-800', desc: '良好' },
                { level: 'C', range: '60-69', color: 'bg-blue-100 text-blue-800', desc: '一般' },
                { level: 'D', range: '0-59', color: 'bg-gray-100 text-gray-800', desc: '需改进' },
              ].map((level) => (
                <div key={level.level} className={`p-4 rounded-lg text-center ${level.color}`}>
                  <div className="text-2xl font-bold">{level.level}</div>
                  <p className="text-xs font-medium mt-1">{level.range}</p>
                  <p className="text-xs mt-1">{level.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LeaderboardCard({ entry, metric }: { entry: LeaderboardEntry; metric?: string }) {
  const medalEmoji = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-3xl font-bold text-gray-400 w-12 text-center">
              {medalEmoji[entry.rank as keyof typeof medalEmoji] || `#${entry.rank}`}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900">{entry.name}</h3>
                {entry.badge && (
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700 text-xs">
                    {entry.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{entry.specialization} · {entry.completedOrders} 单</p>
            </div>
          </div>

          <div className="text-right space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg text-gray-900">{entry.rating.toFixed(1)}</span>
            </div>
            <div className="text-xs text-gray-600">
              {metric === 'quality' && `质量评分: ${entry.avgQualityScore.toFixed(1)}`}
              {metric === 'efficiency' && `平均 ${entry.avgCompletionTime} 天完成`}
              {!metric && `信用分: ${entry.rating.toFixed(1)}`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
