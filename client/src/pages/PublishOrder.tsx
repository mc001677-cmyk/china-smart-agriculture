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
  ArrowRight,
  Phone,
  User,
  MessageSquare
} from 'lucide-react';
import { WorkType } from '@/types/marketplace';
import { hasPublishingAccess } from '@/lib/membershipAccess';

const WORK_TYPES: WorkType[] = ['翻地', '平整', '播种', '施肥', '打药', '收割', '打包', '运输'];
const CROP_TYPES = ['玉米', '大豆', '小麦', '水稻', '油菜', '其他'];
const PREFERRED_TIMES = ['上午', '下午', '全天', '不限'];

export default function PublishOrder() {
  const [location, setLocation] = useLocation();
  const isSimulateMode = location.startsWith("/simulate");
  const base = isSimulateMode ? "/simulate" : "/dashboard";
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: !isSimulateMode });
  const { data: membership } = trpc.membership.summary.useQuery(undefined, {
    // FIX: membership.summary 为受保护接口；未登录时不要请求，避免页面报错
    enabled: !isSimulateMode && !!me,
  });
  
  const canPublish = hasPublishingAccess(isSimulateMode, membership);
  const { publishOrder } = useMarketplace();
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
    contactName: '',
    contactPhone: '',
    contactWechat: '',
    contactAddress: '',
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
          contactName: formData.contactName,
          contactPhone: formData.contactPhone,
          contactWechat: formData.contactWechat,
          contactAddress: formData.contactAddress,
        });
      }
      setPublishSuccess(true);
      setTimeout(() => {
        setLocation(`${base}/marketplace`);
      }, 1500);
    } catch (error) {
      alert('发布失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  if (publishSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-6 flex items-center justify-center">
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg p-8 text-center rounded-3xl">
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
        <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-lg p-8 text-center rounded-3xl max-w-md">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">暂未开通发布权限</h2>
          <p className="text-gray-600 mb-8">
            发布作业需求需开通「白银会员」（66元/年）。白银会员可解锁联系方式查看权限并获得发布资格。
          </p>
          <div className="flex flex-col gap-3">
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white h-12 shadow-apple" onClick={() => setLocation("/dashboard/membership")}>
              去开通白银会员
            </Button>
            <Button variant="ghost" className="rounded-xl h-12" onClick={() => setLocation("/dashboard/marketplace")}>
              返回交易大厅
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
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white transition-all ${
                  s <= step ? 'bg-primary shadow-apple' : 'bg-gray-300'
                }`}>
                  {s < step ? <CheckCircle2 className="h-6 w-6" /> : s}
                </div>
                {s < 4 && <div className={`flex-1 h-1 mx-2 transition-all ${s < step ? 'bg-primary' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
            <span>基本信息</span>
            <span>地块详情</span>
            <span>联系方式</span>
            <span>价格设置</span>
          </div>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm border-none shadow-apple rounded-3xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl">
              {step === 1 && '第一步：基本信息'}
              {step === 2 && '第二步：地块详情'}
              {step === 3 && '第三步：联系方式'}
              {step === 4 && '第四步：价格设置'}
            </CardTitle>
            <CardDescription>
              {step === 1 && '选择作业类型和地块基本信息'}
              {step === 2 && '描述地块特征和作业要求'}
              {step === 3 && '填写农场主联系信息（仅会员可见）'}
              {step === 4 && '设置价格并发布订单'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> 作业类型 *
                  </label>
                  <Select value={formData.workType} onValueChange={(v) => handleInputChange('workType', v)}>
                    <SelectTrigger className="rounded-xl border-slate-200">
                      <SelectValue placeholder="选择作业类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> 地块名称 *
                  </label>
                  <Input
                    placeholder="如：北田地块"
                    value={formData.fieldName}
                    onChange={(e) => handleInputChange('fieldName', e.target.value)}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> 面积 (亩) *
                    </label>
                    <Input
                      type="number"
                      placeholder="输入面积"
                      value={formData.area}
                      onChange={(e) => handleInputChange('area', e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" /> 作物类型 *
                    </label>
                    <Select value={formData.cropType} onValueChange={(v) => handleInputChange('cropType', v)}>
                      <SelectTrigger className="rounded-xl border-slate-200">
                        <SelectValue placeholder="选择作物" />
                      </SelectTrigger>
                      <SelectContent>
                        {CROP_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> 开始日期 *
                    </label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> 结束日期
                    </label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">作业描述</label>
                  <Textarea
                    placeholder="描述地块地形、路况、作业要求等..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="rounded-xl border-slate-200 min-h-[120px]"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> 联系人姓名 *
                  </label>
                  <Input
                    placeholder="输入姓名"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    className="rounded-xl border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" /> 联系电话 *
                    </label>
                    <Input
                      placeholder="输入手机号"
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" /> 微信 (可选)
                    </label>
                    <Input
                      placeholder="输入微信号"
                      value={formData.contactWechat}
                      onChange={(e) => handleInputChange('contactWechat', e.target.value)}
                      className="rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">详细地址 *</label>
                  <Input
                    placeholder="输入作业地块详细地址"
                    value={formData.contactAddress}
                    onChange={(e) => handleInputChange('contactAddress', e.target.value)}
                    className="rounded-xl border-slate-200"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-4">
                  <label className="text-sm font-semibold">价格模式</label>
                  <Tabs
                    value={formData.priceType}
                    onValueChange={(v) =>
                      handleInputChange(
                        "priceType",
                        v === "bidding" ? "bidding" : "fixed"
                      )
                    }
                  >
                    <TabsList className="grid w-full grid-cols-2 rounded-xl">
                      <TabsTrigger value="fixed" className="rounded-lg">固定价格</TabsTrigger>
                      <TabsTrigger value="bidding" className="rounded-lg">竞价模式</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fixed" className="pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">固定单价 (元/亩)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={formData.fixedPrice}
                            onChange={(e) => handleInputChange('fixedPrice', e.target.value)}
                            className="pl-9 rounded-xl border-slate-200"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="bidding" className="pt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">起拍单价 (元/亩)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={formData.biddingStartPrice}
                            onChange={(e) => handleInputChange('biddingStartPrice', e.target.value)}
                            className="pl-9 rounded-xl border-slate-200"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              {step > 1 && (
                <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setStep(step - 1)}>
                  上一步
                </Button>
              )}
              {step < 4 ? (
                <Button className="flex-1 rounded-xl h-12 shadow-apple" onClick={() => setStep(step + 1)}>
                  下一步 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button className="flex-1 rounded-xl h-12 shadow-apple bg-primary hover:bg-primary/90" onClick={handlePublish}>
                  立即发布需求
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
