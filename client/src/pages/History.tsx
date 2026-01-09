import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, SkipBack, SkipForward, Clock, Calendar, MapPin, Gauge, Fuel, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock trajectory data generator
const generateTrajectory = (points = 100) => {
  const trajectory = [];
  let lat = 47.35;
  let lng = 123.95;
  let time = new Date("2025-05-20T08:00:00").getTime();
  
  for (let i = 0; i < points; i++) {
    lat += (Math.random() - 0.5) * 0.002;
    lng += (Math.random() - 0.3) * 0.002;
    time += 60000; // 1 minute interval
    
    trajectory.push({
      id: i,
      lat,
      lng,
      timestamp: time,
      speed: 10 + Math.random() * 5,
      rpm: 1800 + Math.random() * 200,
      fuelRate: 45 + Math.random() * 10,
      load: 70 + Math.random() * 20,
      status: Math.random() > 0.1 ? "working" : "idle"
    });
  }
  return trajectory;
};

const mockTrajectory = generateTrajectory(200);

export default function History() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedMachine, setSelectedMachine] = useState("JD-8R-2025");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPoint = mockTrajectory[currentIndex];
  const progress = (currentIndex / (mockTrajectory.length - 1)) * 100;

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= mockTrajectory.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handleSliderChange = (value: number[]) => {
    const index = Math.floor((value[0] / 100) * (mockTrajectory.length - 1));
    setCurrentIndex(index);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col relative animate-in fade-in duration-500">
      {/* Top Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row gap-4 pointer-events-none">
        <Card className="w-full md:w-80 bg-white/95 backdrop-blur shadow-lg pointer-events-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">历史轨迹回放</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">选择设备</label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="选择设备" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JD-8R-2025">8R 410 拖拉机</SelectItem>
                  <SelectItem value="JD-S780-001">S780 收割机</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">选择日期</label>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                2025年5月20日
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Playback Stats Panel */}
        <Card className="w-full md:w-64 ml-auto bg-black/80 backdrop-blur text-white border-none shadow-lg pointer-events-auto">
          <CardHeader className="pb-2 border-b border-white/10">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base text-primary">实时参数回放</CardTitle>
              <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                {formatTime(currentPoint.timestamp)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Gauge className="h-4 w-4 text-blue-400" /> 速度
              </div>
              <span className="font-mono font-bold text-lg">{currentPoint.speed.toFixed(1)} <span className="text-xs font-normal text-gray-500">km/h</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Activity className="h-4 w-4 text-green-400" /> 转速
              </div>
              <span className="font-mono font-bold text-lg">{Math.round(currentPoint.rpm)} <span className="text-xs font-normal text-gray-500">rpm</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Fuel className="h-4 w-4 text-yellow-400" /> 油耗
              </div>
              <span className="font-mono font-bold text-lg">{currentPoint.fuelRate.toFixed(1)} <span className="text-xs font-normal text-gray-500">L/h</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Activity className="h-4 w-4 text-purple-400" /> 负载
              </div>
              <span className="font-mono font-bold text-lg">{Math.round(currentPoint.load)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Playback Controls */}
      <div className="absolute bottom-8 left-4 right-4 z-10 pointer-events-none">
        <Card className="bg-white/95 backdrop-blur shadow-xl pointer-events-auto">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>08:00</span>
                <span className="font-bold text-primary text-lg">{formatTime(currentPoint.timestamp)}</span>
                <span>11:20</span>
              </div>
              
              <Slider 
                value={[progress]} 
                max={100} 
                step={0.1} 
                onValueChange={handleSliderChange}
                className="cursor-pointer"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={playbackSpeed.toString()} onValueChange={(v) => setPlaybackSpeed(Number(v))}>
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x</SelectItem>
                      <SelectItem value="4">4x</SelectItem>
                      <SelectItem value="8">8x</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">倍速</span>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 10))}>
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button 
                    size="icon" 
                    className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentIndex(Math.min(mockTrajectory.length - 1, currentIndex + 10))}>
                    <SkipForward className="h-5 w-5" />
                  </Button>
                </div>

                <div className="w-[80px] text-right text-xs text-muted-foreground">
                  {Math.round(progress)}% 完成
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Placeholder (In real implementation, this would be the Map component with polyline) */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>地图轨迹层将在此处渲染</p>
            <p className="text-xs opacity-50">当前坐标: {currentPoint.lat.toFixed(6)}, {currentPoint.lng.toFixed(6)}</p>
          </div>
        </div>
        {/* Simulated Trajectory Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <path 
            d="M 200 200 Q 400 100 600 300 T 900 200" 
            fill="none" 
            stroke="#367C2B" 
            strokeWidth="4" 
            strokeDasharray="10 5"
          />
        </svg>
      </div>
    </div>
  );
}
