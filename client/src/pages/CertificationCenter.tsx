import React, { useState } from 'react';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Upload,
  Star,
  Award,
  Shield,
  Zap,
  TrendingUp
} from 'lucide-react';
import { UserCertification, CertificationStatus } from '@/types/marketplace';

const CERTIFICATION_TYPES = [
  {
    id: '身份认证',
    name: '身份认证',
    description: '上传身份证照片',
    icon: Shield,
    required: true,
    benefits: ['解锁接单权限', '提高信用分'],
  },
  {
    id: '驾照认证',
    name: '驾照认证',
    description: '上传驾照照片',
    icon: Award,
    required: true,
    benefits: ['证明驾驶资格', '提高信任度'],
  },
  {
    id: '营业执照',
    name: '营业执照认证',
    description: '上传营业执照照片',
    icon: Zap,
    required: false,
    benefits: ['提高企业信誉', '优先推送订单'],
  },
  {
    id: '设备认证',
    name: '设备认证',
    description: '上传农机照片和序列号',
    icon: TrendingUp,
    required: false,
    benefits: ['展示设备等级', '提高竞争力'],
  },
];

const STATUS_CONFIG = {
  '未认证': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  '审核中': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  '已认证': { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  '已过期': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export default function CertificationCenter() {
  const { currentUser, submitCertification, loading } = useMarketplace();
  const [selectedCert, setSelectedCert] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleFileUpload = async () => {
    if (!selectedCert || !uploadFile) return;

    try {
      // 模拟文件上传
      const fileUrl = URL.createObjectURL(uploadFile);
      await submitCertification(selectedCert, fileUrl);
      alert('认证提交成功，请等待审核！');
      setUploadFile(null);
      setSelectedCert(null);
    } catch (error) {
      alert('提交失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 顶部信息 */}
        <Card className="mb-8 bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">认证中心</h1>
                <p className="text-blue-100">完成认证以解锁更多功能和接单机会</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{currentUser?.rating || 0}</div>
                <p className="text-blue-100">信用评分</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 认证进度 */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              认证进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentUser?.certifications.map((cert) => {
                const config = STATUS_CONFIG[cert.status];
                const Icon = config.icon;
                return (
                  <div key={cert.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">{cert.type}</p>
                        <p className="text-sm text-gray-600">
                          {cert.status === '已认证' && `已认证 · ${new Date(cert.verifiedAt!).toLocaleDateString()}`}
                          {cert.status === '审核中' && '审核中 · 1-2 天内完成'}
                          {cert.status === '未认证' && '未认证'}
                          {cert.status === '已过期' && `已过期 · ${new Date(cert.expiresAt!).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={config.color}>
                      {cert.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 认证类型 */}
        <Tabs defaultValue="required" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-1">
            <TabsTrigger value="required" className="rounded-md">必需认证</TabsTrigger>
            <TabsTrigger value="optional" className="rounded-md">可选认证</TabsTrigger>
          </TabsList>

          <TabsContent value="required" className="space-y-4 mt-6">
            {CERTIFICATION_TYPES.filter(c => c.required).map((cert) => (
              <CertificationCard 
                key={cert.id} 
                cert={cert}
                isSelected={selectedCert === cert.id}
                onSelect={() => setSelectedCert(cert.id)}
                uploadFile={uploadFile}
                onFileChange={setUploadFile}
                onSubmit={handleFileUpload}
                loading={loading}
              />
            ))}
          </TabsContent>

          <TabsContent value="optional" className="space-y-4 mt-6">
            {CERTIFICATION_TYPES.filter(c => !c.required).map((cert) => (
              <CertificationCard 
                key={cert.id} 
                cert={cert}
                isSelected={selectedCert === cert.id}
                onSelect={() => setSelectedCert(cert.id)}
                uploadFile={uploadFile}
                onFileChange={setUploadFile}
                onSubmit={handleFileUpload}
                loading={loading}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* 徽章系统 */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              成就徽章
            </CardTitle>
            <CardDescription>完成特定条件获得徽章，提高竞争力</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: '精准播种大师', desc: '漏播率低于1%', earned: true },
                { name: '低损失收割手', desc: '损失率低于2%', earned: true },
                { name: '准时完成王', desc: '连续10单按时完成', earned: false },
                { name: '五星好评', desc: '获得50个五星评价', earned: false },
                { name: '高效作业手', desc: '作业效率排名前10%', earned: false },
                { name: '诚信经营者', desc: '无投诉无纠纷', earned: false },
              ].map((badge, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg text-center transition-all ${
                    badge.earned 
                      ? 'bg-yellow-50 border-2 border-yellow-300' 
                      : 'bg-gray-50 border-2 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="text-2xl mb-2">{badge.earned ? '🏆' : '🎯'}</div>
                  <p className="font-medium text-sm text-gray-900">{badge.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{badge.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 认证好处 */}
        <Card className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              认证的好处
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  提高信用分
                </h3>
                <p className="text-sm text-gray-600">完成认证后，信用分会增加10-50分，更容易获得订单推荐。</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  优先接单
                </h3>
                <p className="text-sm text-gray-600">高认证等级的机手会优先收到订单推送，增加接单机会。</p>
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-600" />
                  保证金减免
                </h3>
                <p className="text-sm text-gray-600">认证等级越高，所需保证金越低，最高可减免50%。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CertificationCard({
  cert,
  isSelected,
  onSelect,
  uploadFile,
  onFileChange,
  onSubmit,
  loading,
}: {
  cert: any;
  isSelected: boolean;
  onSelect: () => void;
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const Icon = cert.icon;

  return (
    <Card 
      className={`bg-white/80 backdrop-blur-sm border-2 transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{cert.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{cert.description}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {cert.benefits.map((benefit: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="border-blue-300 text-blue-700 text-xs">
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Badge variant={cert.required ? 'default' : 'outline'} className="ml-4">
            {cert.required ? '必需' : '可选'}
          </Badge>
        </div>

        {isSelected && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传文件
              </label>
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                  id={`file-${cert.id}`}
                  accept="image/*,.pdf"
                />
                <label htmlFor={`file-${cert.id}`} className="cursor-pointer">
                  <Upload className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {uploadFile ? uploadFile.name : '点击选择或拖拽文件'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">支持 JPG, PNG, PDF</p>
                </label>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              onClick={onSubmit}
              disabled={!uploadFile || loading}
            >
              {loading ? '提交中...' : '提交认证'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
