import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MapPin, 
  Zap, 
  DollarSign, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { WorkType } from '@/types/marketplace';

const WORK_TYPES: WorkType[] = ['翻地', '平整', '播种', '施肥', '打药', '收割', '打包', '运输'];
const CROP_TYPES = ['玉米', '大豆', '小麦', '水稻', '油菜', '其他'];
const PREFERRED_TIMES = ['上午', '下午', '全天', '不限'];

export default function PublishOrder() {
  const [location, setLocation] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");
  const base = isSimulateMode ? "/simulate" : "/dashboard";
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !isSimulateMode });
  const membershipLevel = (me as any)?.membershipLevel ?? "free";
  const verificationStatus = (me as any)?.verificationStatus ?? "unsubmitted";
  const canPublish = isSimulateMode || (
    me && (
      (me as any).role === "admin" ||
      (["silver", "gold", "diamond"].includes(membershipLevel) && verificationStatus === "approved")
    )
  );
  const { publishOrder, loading } = useMarketplace();
  const submitOrder = trpc.workOrders.submit.useMutation();
  const [step, setStep] = useState(1);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [formData, setFormData] = useState({
    workType: '' as WorkType,
    fieldName: '',
    area: '',
    cropType: '',
    description: '',
    startDate: '',
    endDate: '',
    preferredTime: '全天',
    priceType: 'fixed' as 'fixed' | 'bidding',
    fixedPrice: '',
    biddingStartPrice: '',
    requirements: [] as string[],
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePublish = async () => {
    try {
      if (isSimulateMode) {
        await publishOrder({
          publisherId: 'user_123',
          publisherName: '农场主张三',
          publisherRating: 4.8,
          workType: formData.workType,
          fieldId: `field_${Date.now()}`,
          fieldName: formData.fieldName,
          area: parseFloat(formData.area),
          cropType: formData.cropType,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
          preferredTime: formData.preferredTime,
          priceType: formData.priceType,
          fixedPrice: formData.priceType === 'fixed' ? parseFloat(formData.fixedPrice) : undefined,
          biddingStartPrice: formData.priceType === 'bidding' ? parseFloat(formData.biddingStartPrice) : undefined,
          description: formData.description,
          requirements: formData.requirements,
          status: '待抢单',
          deposit: 0,
          platformFee: 0,
          paymentStatus: 'pending',
        });
      } else {
        await submitOrder.mutateAsync({
          workType: formData.workType,
          fieldName: formData.fieldName,
          area: parseFloat(formData.area),
          cropType: formData.cropType,
          description: formData.description,
          startDate: new Date(formData.startDate),
          endDate: formData.endDate ? new Date(formData.endDate) : undefined,
          preferredTime: formData.preferredTime,
          priceType: formData.priceType,
          fixedPrice: formData.priceType === 'fixed' ? parseFloat(formData.fixedPrice) : undefined,
          biddingStartPrice: formData.priceType === 'bidding' ? parseFloat(formData.biddingStartPrice) : undefined,
        });
      }
      setPublishSuccess(true);
      setTimeout(() => {
        setLocation(`${base}/marketplace`);
      }, 1500);
      setFormData({
        workType: '翻地',
        fieldName: '',
        area: '',
        cropType: '',
        description: '',
        startDate: '',
        endDate: '',
        preferredTime: '全天',
        priceType: 'fixed',
        fixedPrice: '',
        biddingStartPrice: '',
        requirements: [],
      });
    } catch (error) {
      alert('发布失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 发布成功提示
  if (publishSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6 flex items-center justify-center">
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">订单发布成功！</h2>
          <p className="text-gray-600">正在跳转到交易大厅...</p>
        </Card>
      </div>
    );
  }

  if (!canPublish) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6 flex items-center justify-center pointer-events-auto">
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg p-8 text-center rounded-3xl">
          <AlertCircle className="h-14 w-14 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">暂未开通发布权限</h2>
          <p className="text-gray-600">
            正式运行需「白银及以上会员」且通过实名认证；黄金会员每天最多发布 5 条。
          </p>
          <div className="flex gap-3 justify-center mt-5">
            <Button className="rounded-2xl bg-[#1f6b3a] hover:bg-[#1b5f33] text-white" onClick={() => setLocation("/dashboard/onboarding")}>
              去注册与审核中心
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => setLocation("/dashboard/onboarding")}>
              升级会员
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
                  s <= step ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gray-300'
                }`}>
                  {s < step ? <CheckCircle2 className="h-6 w-6" /> : s}
                </div>
                {s < 3 && <div className={`flex-1 h-1 mx-2 transition-all ${s < step ? 'bg-green-600' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>基本信息</span>
            <span>地块详情</span>
            <span>价格设置</span>
          </div>
        </div>

        {/* 表单内容 */}
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === 1 && '第一步：基本信息'}
              {step === 2 && '第二步：地块详情'}
              {step === 3 && '第三步：价格设置'}
            </CardTitle>
            <CardDescription>
              {step === 1 && '选择作业类型和基本信息'}
              {step === 2 && '描述地块特征和作业要求'}
              {step === 3 && '设置价格和发布订单'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 第一步：基本信息 */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Zap className="inline h-4 w-4 mr-1 text-green-600" />
                    作业类型 *
                  </label>
                  <Select value={formData.workType} onValueChange={(v) => handleInputChange('workType', v)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="选择作业类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1 text-green-600" />
                    地块名称 *
                  </label>
                  <Input
                    placeholder="如：北田地块、东边大地"
                    value={formData.fieldName}
                    onChange={(e) => handleInputChange('fieldName', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1 text-green-600" />
                    地块面积 (亩) *
                  </label>
                  <Input
                    type="number"
                    placeholder="输入面积"
                    value={formData.area}
                    onChange={(e) => handleInputChange('area', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Zap className="inline h-4 w-4 mr-1 text-green-600" />
                    作物类型 *
                  </label>
                  <Select value={formData.cropType} onValueChange={(v) => handleInputChange('cropType', v)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="选择作物类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {CROP_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* 第二步：地块详情 */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1 text-green-600" />
                    开始日期 *
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1 text-green-600" />
                    结束日期 *
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Zap className="inline h-4 w-4 mr-1 text-green-600" />
                    偏好时间
                  </label>
                  <Select value={formData.preferredTime} onValueChange={(v) => handleInputChange('preferredTime', v)}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PREFERRED_TIMES.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AlertCircle className="inline h-4 w-4 mr-1 text-green-600" />
                    作业描述和要求
                  </label>
                  <Textarea
                    placeholder="描述地块特征、作业要求、注意事项等..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={5}
                    className="border-gray-300"
                  />
                </div>
              </div>
            )}

            {/* 第三步：价格设置 */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1 text-green-600" />
                    定价方式 *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.priceType === 'fixed'}
                        onChange={() => handleInputChange('priceType', 'fixed')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">固定价</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.priceType === 'bidding'}
                        onChange={() => handleInputChange('priceType', 'bidding')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">竞价</span>
                    </label>
                  </div>
                </div>

                {formData.priceType === 'fixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1 text-green-600" />
                      价格 (元/亩) *
                    </label>
                    <Input
                      type="number"
                      placeholder="输入价格"
                      value={formData.fixedPrice}
                      onChange={(e) => handleInputChange('fixedPrice', e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                )}

                {formData.priceType === 'bidding' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline h-4 w-4 mr-1 text-green-600" />
                      起价 (元/亩) *
                    </label>
                    <Input
                      type="number"
                      placeholder="输入起价"
                      value={formData.biddingStartPrice}
                      onChange={(e) => handleInputChange('biddingStartPrice', e.target.value)}
                      className="border-gray-300"
                    />
                  </div>
                )}

                {/* 预览 */}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">作业类型：</span>
                        <span className="font-medium">{formData.workType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">地块面积：</span>
                        <span className="font-medium">{formData.area} 亩</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">单价：</span>
                        <span className="font-medium">¥{formData.priceType === 'fixed' ? formData.fixedPrice : formData.biddingStartPrice}/亩</span>
                      </div>
                      <div className="border-t border-green-300 pt-2 mt-2 flex justify-between font-bold">
                        <span>预计总价：</span>
                        <span className="text-green-700">
                          ¥{(parseFloat(formData.area || '0') * parseFloat(formData.priceType === 'fixed' ? formData.fixedPrice || '0' : formData.biddingStartPrice || '0')).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 按钮 */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              {step > 1 && (
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300"
                  onClick={() => setStep(step - 1)}
                >
                  上一步
                </Button>
              )}
              {step < 3 && (
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  onClick={() => setStep(step + 1)}
                >
                  下一步
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {step === 3 && (
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  onClick={handlePublish}
                  disabled={loading}
                >
                  {loading ? '发布中...' : '发布订单'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
