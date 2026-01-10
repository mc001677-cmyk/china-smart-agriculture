import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Loader2, User, Tractor, ShoppingCart, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AdminReview() {
  const { data, refetch, isLoading } = trpc.admin.adminReview.listPending.useQuery();
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-6">
      <SectionHeader title="审核中心" description="处理用户提交的实名认证、农机认证及二手机挂牌申请" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="users" className="gap-2">
            <User className="w-4 h-4" />
            实名认证
            {data?.users && data.users.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 min-w-5 rounded-full text-[10px]">
                {data.users.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="machines" className="gap-2">
            <Tractor className="w-4 h-4" />
            农机认证
            {data?.machines && data.machines.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 min-w-5 rounded-full text-[10px]">
                {data.machines.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            二手挂牌
            {data?.listings && data.listings.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 min-w-5 rounded-full text-[10px]">
                {data.listings.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {isLoading ? <LoadingState /> : <UserReviewList list={data?.users || []} onSuccess={refetch} />}
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          {isLoading ? <LoadingState /> : <MachineReviewList list={data?.machines || []} onSuccess={refetch} />}
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          {isLoading ? <LoadingState /> : <ListingReviewList list={data?.listings || []} onSuccess={refetch} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      加载待审核数据...
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-muted/10">
      <Check className="w-12 h-12 text-muted-foreground/20 mb-3" />
      <p className="text-muted-foreground">{title}</p>
    </div>
  );
}

// --- 实名认证列表 ---
function UserReviewList({ list, onSuccess }: { list: any[]; onSuccess: () => void }) {
  const approve = trpc.admin.adminReview.approveUser.useMutation();
  const reject = trpc.admin.adminReview.rejectUser.useMutation();
  const [note, setNote] = useState("");

  if (list.length === 0) return <EmptyState title="暂无待审核的实名认证" />;

  const handleAction = async (userId: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        await approve.mutateAsync({ userId, note });
        toast.success("已通过认证");
      } else {
        if (!note) return toast.error("驳回必须填写原因");
        await reject.mutateAsync({ userId, note });
        toast.success("已驳回认证");
      }
      setNote("");
      onSuccess();
    } catch (e: any) {
      toast.error("操作失败", { description: e.message });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((item) => (
        <Card key={item.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex justify-between items-start">
              <span>{item.realName}</span>
              <Badge variant="outline">{format(new Date(item.verificationSubmittedAt), "MM-dd HH:mm")}</Badge>
            </CardTitle>
            <CardDescription>{item.organization}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 text-sm space-y-2">
            <div className="bg-muted/50 p-2 rounded text-muted-foreground">
              {item.identityIntro || "无简介"}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground pt-2">
              <span>手机: {item.phone}</span>
              <span>ID: {item.id}</span>
            </div>
            <Textarea 
              placeholder="审核备注 / 驳回原因..." 
              className="h-20 mt-2 resize-none text-xs"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleAction(item.id, "reject")}>
              <X className="w-4 h-4 mr-1" /> 驳回
            </Button>
            <Button className="w-full text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 border-green-200" variant="outline" onClick={() => handleAction(item.id, "approve")}>
              <Check className="w-4 h-4 mr-1" /> 通过
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// --- 农机认证列表 ---
function MachineReviewList({ list, onSuccess }: { list: any[]; onSuccess: () => void }) {
  const approve = trpc.admin.adminReview.approveMachine.useMutation();
  const reject = trpc.admin.adminReview.rejectMachine.useMutation();
  const [note, setNote] = useState("");

  if (list.length === 0) return <EmptyState title="暂无待审核的农机" />;

  const handleAction = async (applicationId: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        await approve.mutateAsync({ applicationId, note });
        toast.success("已通过认证");
      } else {
        if (!note) return toast.error("驳回必须填写原因");
        await reject.mutateAsync({ applicationId, note });
        toast.success("已驳回认证");
      }
      setNote("");
      onSuccess();
    } catch (e: any) {
      toast.error("操作失败", { description: e.message });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((item) => (
        <Card key={item.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex justify-between items-start">
              <span>{item.brand} {item.model}</span>
              <Badge variant="outline">{format(new Date(item.submittedAt), "MM-dd HH:mm")}</Badge>
            </CardTitle>
            <CardDescription>类型: {item.type} | 车牌: {item.licensePlate || "未填"}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 text-sm space-y-2">
             <div className="grid grid-cols-2 gap-1 text-xs">
                <span className="text-muted-foreground">设备ID:</span>
                <span className="font-mono">{item.deviceId}</span>
                <span className="text-muted-foreground">申请人ID:</span>
                <span>{item.applicantUserId}</span>
             </div>
             {item.description && (
                <div className="bg-muted/50 p-2 rounded text-muted-foreground text-xs mt-2">
                    {item.description}
                </div>
             )}
            <Textarea 
              placeholder="审核备注 / 驳回原因..." 
              className="h-20 mt-2 resize-none text-xs"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleAction(item.id, "reject")}>
              <X className="w-4 h-4 mr-1" /> 驳回
            </Button>
            <Button className="w-full text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 border-green-200" variant="outline" onClick={() => handleAction(item.id, "approve")}>
              <Check className="w-4 h-4 mr-1" /> 通过
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// --- 二手挂牌列表 ---
function ListingReviewList({ list, onSuccess }: { list: any[]; onSuccess: () => void }) {
  const approve = trpc.admin.adminReview.approveListing.useMutation();
  const reject = trpc.admin.adminReview.rejectListing.useMutation();
  const [note, setNote] = useState("");

  if (list.length === 0) return <EmptyState title="暂无待审核的二手机挂牌" />;

  const handleAction = async (listingId: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") {
        await approve.mutateAsync({ listingId, note });
        toast.success("已通过审核，已上架");
      } else {
        if (!note) return toast.error("驳回必须填写原因");
        await reject.mutateAsync({ listingId, note });
        toast.success("已驳回申请");
      }
      setNote("");
      onSuccess();
    } catch (e: any) {
      toast.error("操作失败", { description: e.message });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((item) => (
        <Card key={item.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base flex justify-between items-start">
              <span className="truncate pr-2">{item.title}</span>
              <Badge variant="outline" className="shrink-0">{format(new Date(item.createdAt), "MM-dd")}</Badge>
            </CardTitle>
            <CardDescription>{item.brand} {item.model}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 text-sm space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-amber-600 font-bold text-lg">¥ {item.price}</span>
                <span className="text-muted-foreground text-xs">{item.location}</span>
            </div>
            <div className="text-xs text-muted-foreground">
                联系人: {item.contactPhone || "无"} (ID: {item.sellerUserId})
            </div>
             {item.description && (
                <div className="bg-muted/50 p-2 rounded text-muted-foreground text-xs line-clamp-2">
                    {item.description}
                </div>
             )}
            <Textarea 
              placeholder="审核备注 / 驳回原因..." 
              className="h-20 mt-2 resize-none text-xs"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleAction(item.id, "reject")}>
              <X className="w-4 h-4 mr-1" /> 驳回
            </Button>
            <Button className="w-full text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700 border-green-200" variant="outline" onClick={() => handleAction(item.id, "approve")}>
              <Check className="w-4 h-4 mr-1" /> 通过
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
