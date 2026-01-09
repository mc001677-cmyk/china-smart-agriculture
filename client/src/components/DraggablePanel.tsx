import { Rnd } from "react-rnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DraggablePanelProps {
  id: string;
  title: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number | string; height: number | string };
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  children: React.ReactNode;
  onClose?: () => void;
  onResize?: (width: number | string, height: number | string) => void;
  className?: string;
}

export default function DraggablePanel({
  id,
  title,
  defaultPosition = { x: 0, y: 0 },
  defaultSize = { width: 400, height: 300 },
  minWidth = 300,
  minHeight = 250,
  maxWidth = 800,
  maxHeight = 600,
  children,
  onClose,
  onResize,
  className,
}: DraggablePanelProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [savedPosition, setSavedPosition] = useState(defaultPosition);
  const [savedSize, setSavedSize] = useState(defaultSize);

  const handleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
    } else {
      setIsMaximized(true);
    }
  };

  return (
    <Rnd
      default={{
        x: defaultPosition.x,
        y: defaultPosition.y,
        width: defaultSize.width,
        height: defaultSize.height,
      }}
      position={isMaximized ? { x: 0, y: 0 } : undefined}
      size={isMaximized ? { width: "100%", height: "100%" } : undefined}
      minWidth={minWidth}
      minHeight={minHeight}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="draggable-handle"
      onDragStop={(_e: any, d: any) => {
        if (!isMaximized) {
          setSavedPosition({ x: d.x, y: d.y });
        }
      }}
      onResizeStop={(_e: any, _direction: any, ref: any, _delta: any, _position: any) => {
        if (!isMaximized) {
          const newWidth = ref.style.width;
          const newHeight = ref.style.height;
          setSavedSize({ width: newWidth, height: newHeight });
          onResize?.(newWidth, newHeight);
        }
      }}
      style={{
        zIndex: isMaximized ? 50 : 10,
        position: isMaximized ? "fixed" : "absolute",
      }}
      className={cn(
        !isMaximized && "transition-none",
        isMaximized && "fixed inset-0 !w-screen !h-screen !transform-none"
      )}
    >
      <Card
        className={cn(
          "h-full w-full flex flex-col shadow-xl border border-primary/20 bg-card/90 backdrop-blur-sm overflow-hidden",
          isMaximized && "rounded-none border-0",
          className
        )}
      >
        {/* Header - Draggable Area */}
        <CardHeader
          className={cn(
            "flex flex-row items-center justify-between p-3 border-b border-primary/10 bg-gradient-to-r from-primary/10 to-transparent select-none",
            !isMaximized && "draggable-handle cursor-move active:cursor-grabbing"
          )}
        >
          <CardTitle className="text-sm font-bold text-primary font-heading tracking-wider uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            {title}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-primary/20 hover:text-primary"
              onClick={handleMaximize}
              title={isMaximized ? "还原" : "最大化"}
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                onClick={onClose}
                title="关闭"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Content Area - Scrollable */}
        <CardContent className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/40">
          {children}
        </CardContent>

        {/* Resize Handle - Visual Indicator */}
        {!isMaximized && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 50%, var(--primary) 50%)",
              opacity: 0.5,
            }}
          />
        )}
      </Card>
    </Rnd>
  );
}
