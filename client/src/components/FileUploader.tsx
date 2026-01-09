import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface FileUploaderProps {
  category?: "field_image" | "drone_image" | "document" | "report" | "other";
  relatedFieldId?: number;
  relatedMachineId?: number;
  onUploadComplete?: (result: { url: string; fileKey: string }) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  result?: { url: string; fileKey: string };
}

export default function FileUploader({
  category = "other",
  relatedFieldId,
  relatedMachineId,
  onUploadComplete,
  maxSizeMB = 10,
  acceptedTypes = ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx"],
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.files.upload.useMutation({
    onSuccess: (data, variables) => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === variables.filename
            ? { ...f, status: "success" as const, progress: 100, result: data }
            : f
        )
      );
      onUploadComplete?.(data);
      toast.success("文件上传成功");
    },
    onError: (error, variables) => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === variables.filename
            ? { ...f, status: "error" as const, error: error.message }
            : f
        )
      );
      toast.error(`上传失败: ${error.message}`);
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFiles = async (files: File[]) => {
    for (const file of files) {
      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`文件 ${file.name} 超过 ${maxSizeMB}MB 限制`);
        continue;
      }

      const uploadId = `${file.name}-${Date.now()}`;
      const newFile: UploadingFile = {
        id: uploadId,
        file,
        progress: 0,
        status: "uploading",
      };

      setUploadingFiles((prev) => [...prev, newFile]);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId && f.status === "uploading"
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 100);

        try {
          await uploadMutation.mutateAsync({
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            base64Data: base64,
            category,
            relatedFieldId,
            relatedMachineId,
          });
        } finally {
          clearInterval(progressInterval);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5" />;
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

  return (
    <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          文件上传
          <Badge variant="outline" className="ml-2 text-xs">
            {getCategoryLabel(category)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center transition-colors",
              isDragging ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
            )}>
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                拖放文件到此处，或 <span className="text-primary">点击选择</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                支持图片、PDF、Word、Excel 等格式，单文件最大 {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>

        {/* Upload List */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">上传列表</p>
            {uploadingFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  uploadFile.status === "success" && "bg-green-50 border-green-200",
                  uploadFile.status === "error" && "bg-red-50 border-red-200",
                  uploadFile.status === "uploading" && "bg-blue-50 border-blue-200"
                )}
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(uploadFile.file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    {uploadFile.status === "uploading" && (
                      <Progress value={uploadFile.progress} className="h-1.5 flex-1 max-w-[100px]" />
                    )}
                    {uploadFile.status === "error" && (
                      <span className="text-xs text-red-500">{uploadFile.error}</span>
                    )}
                  </div>
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {uploadFile.status === "uploading" && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  )}
                  {uploadFile.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {uploadFile.status === "error" && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(uploadFile.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
