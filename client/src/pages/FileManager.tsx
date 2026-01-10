import DashboardLayout from "@/components/DashboardLayout";
import FileUploader from "@/components/FileUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { SectionHeader } from "@/components/ui/section-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  Image,
  FileText,
  File,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Upload,
  HardDrive,
  Clock,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

type FileCategory = "field_image" | "drone_image" | "document" | "report" | "other";

export default function FileManager() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState<FileCategory | "all">("all");
  const [showUploader, setShowUploader] = useState(false);

  const { data: me } = trpc.auth.me.useQuery();
  const { data: files, isLoading, refetch } = trpc.files.list.useQuery(
    {},
    {
      // FIX: files.list 为受保护接口；未登录时不要请求，避免页面报错
      enabled: !!me,
    }
  );
  
  const deleteMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("文件已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className="h-5 w-5 text-blue-600" />;
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return <FileText className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      field_image: "地块图片",
      drone_image: "无人机航拍",
      document: "文档",
      report: "报告",
      other: "其他",
    };
    return labels[cat] || cat;
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      field_image: "bg-green-100 text-green-700",
      drone_image: "bg-blue-100 text-blue-700",
      document: "bg-yellow-100 text-yellow-700",
      report: "bg-purple-100 text-purple-700",
      other: "bg-gray-100 text-gray-700",
    };
    return colors[cat] || "bg-gray-100 text-gray-700";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredFiles = files?.filter(
    (f) => activeCategory === "all" || f.category === activeCategory
  );

  const stats = {
    total: files?.length || 0,
    totalSize: files?.reduce((acc, f) => acc + f.size, 0) || 0,
    byCategory: {
      field_image: files?.filter((f) => f.category === "field_image").length || 0,
      drone_image: files?.filter((f) => f.category === "drone_image").length || 0,
      document: files?.filter((f) => f.category === "document").length || 0,
      report: files?.filter((f) => f.category === "report").length || 0,
      other: files?.filter((f) => f.category === "other").length || 0,
    },
  };

  if (!me) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Empty className="bg-card/40 border-border">
            <EmptyHeader>
              <EmptyTitle>登录后管理文件</EmptyTitle>
              <EmptyDescription>上传与管理地块图片、无人机航拍、文档报告等资料需要先登录。</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex gap-2">
                <Button onClick={() => navigate("/login")}>去登录</Button>
                <Button variant="outline" onClick={() => navigate("/register")}>
                  去注册
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <SectionHeader
          title="文件管理"
          description="管理地块图片、无人机航拍、文档报告等文件资源"
          right={
            <Button onClick={() => setShowUploader(!showUploader)} className="bg-primary hover:bg-primary/90">
              <Upload className="h-4 w-4 mr-2" />
              上传文件
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">文件总数</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-sky-500/15 flex items-center justify-center">
                <HardDrive className="h-6 w-6 text-sky-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">存储空间</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatFileSize(stats.totalSize)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Image className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">图片文件</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.byCategory.field_image + stats.byCategory.drone_image}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <FileText className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">文档报告</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.byCategory.document + stats.byCategory.report}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload Panel */}
        {showUploader && (
          <div className="animate-in slide-in-from-top duration-300">
            <FileUploader
              category="other"
              onUploadComplete={() => {
                refetch();
              }}
            />
          </div>
        )}

        {/* File List */}
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-xl">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">文件列表</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Tabs
                  value={activeCategory}
                  onValueChange={(v) => setActiveCategory(v as FileCategory | "all")}
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="all" className="text-xs px-3 h-6">
                      全部
                    </TabsTrigger>
                    <TabsTrigger value="field_image" className="text-xs px-3 h-6">
                      地块图片
                    </TabsTrigger>
                    <TabsTrigger value="drone_image" className="text-xs px-3 h-6">
                      航拍
                    </TabsTrigger>
                    <TabsTrigger value="document" className="text-xs px-3 h-6">
                      文档
                    </TabsTrigger>
                    <TabsTrigger value="report" className="text-xs px-3 h-6">
                      报告
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFiles && filteredFiles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>文件名</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>上传时间</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id} className="hover:bg-gray-50">
                      <TableCell>{getFileIcon(file.mimeType)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">
                            {file.originalName}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">
                            {file.fileKey}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("text-xs", getCategoryColor(file.category))}
                        >
                          {getCategoryLabel(file.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(file.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => window.open(file.url, "_blank")}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              预览
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = file.url;
                                link.download = file.originalName;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              下载
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (confirm("确定要删除此文件吗？")) {
                                  deleteMutation.mutate({ id: file.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">暂无文件</p>
                <p className="text-sm text-gray-400 mt-1">
                  点击上方"上传文件"按钮添加文件
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
