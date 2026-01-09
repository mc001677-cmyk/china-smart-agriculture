import DashboardLayout from "@/components/DashboardLayout";
import { useRoute } from "wouter";
import HarvestDashboard from "./HarvestDashboard";
import Fields from "./Fields";
import FieldDetailPanel from "@/components/FieldDetailPanel";
import { useField } from "@/contexts/FieldContext";
import Planning from "./Planning";
import Reports from "./Reports";
import Alerts from "./Alerts";
import Maintenance from "./Maintenance";
import History from "./History";
import MachineManager from "./MachineManager";
import WorkLogs from "./WorkLogs";
import WorkMonitor from "./WorkMonitor";
import TrajectoryReplay from "./TrajectoryReplay";
import YieldAnalysis from "./YieldAnalysis";
import SmartAlerts from "./SmartAlerts";
import MarketplaceHub from "./MarketplaceHub";
import MachineMarket from "./MachineMarket";
import PublishOrder from "./PublishOrder";
import CertificationCenter from "./CertificationCenter";
import RatingAndLeaderboard from "./RatingAndLeaderboard";
import OrderTracking from "./OrderTracking";
import OnboardingCenter from "./OnboardingCenter";
import IdentityApplication from "./IdentityApplication";
import MachineRegistration from "./MachineRegistration";
import AdminReview from "./AdminReview";
import PublishMachineListing from "./PublishMachineListing";



interface DashboardProps {
  /**
   * 运行模式：
   * - "run"      正式运行（默认）
   * - "simulate" 模拟运行
   */
  mode?: "run" | "simulate";
}

export default function Dashboard({ mode = "run" }: DashboardProps) {
  // 根据模式选择不同的路由前缀
  const routePattern = mode === "simulate" ? "/simulate/:subpage" : "/dashboard/:subpage";

  const [match, params] = useRoute(routePattern);
  const subpage = match ? (params?.subpage as string) : "overview";
  const { activeFieldId, setActiveFieldId } = useField();

  return (
    <DashboardLayout mode={mode}>
      {/* Content based on subpage */}
      {/* Default to Fleet (Autumn Harvest Scene) for overview */}
      {subpage === "overview" && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          <HarvestDashboard />
          {/* Field Detail Panel Overlay */}
          {activeFieldId && (
            <div className="absolute top-4 right-4 bottom-4 w-96 z-50 pointer-events-auto">
              <FieldDetailPanel 
                fieldId={activeFieldId} 
                onClose={() => setActiveFieldId(null)} 
              />
            </div>
          )}
        </div>
      )}

      {subpage === "fields" && (
          <div className="absolute inset-0 z-20 pointer-events-none p-4">
            <Fields />
          </div>
      )}

      {subpage === "machines" && (
          <div className="absolute inset-0 z-20 pointer-events-none p-4">
            <MachineManager />
          </div>
      )}

      {subpage === "planning" && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <Planning />
          </div>
      )}

      {subpage === "reports" && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <Reports />
          </div>
      )}

      {subpage === "alerts" && (
          <div className="absolute inset-0 z-20 pointer-events-none p-4 overflow-y-auto">
            <div className="pointer-events-auto h-full">
              <Alerts />
            </div>
          </div>
      )}

      {subpage === "maintenance" && (
          <div className="absolute inset-0 z-20 pointer-events-none p-4 overflow-y-auto">
            <div className="pointer-events-auto h-full">
              <Maintenance />
            </div>
          </div>
      )}

      {subpage === "history" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
            <History />
          </div>
      )}

      {subpage === "worklogs" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <WorkLogs />
          </div>
      )}

      {/* New Modules */}
      {subpage === "work-monitor" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
            <WorkMonitor />
          </div>
      )}

      {subpage === "trajectory" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
            <TrajectoryReplay />
          </div>
      )}

      {subpage === "yield-analysis" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
            <YieldAnalysis />
          </div>
      )}

      {subpage === "smart-alerts" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background">
            <SmartAlerts />
          </div>
      )}

      {subpage === "marketplace" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <MarketplaceHub />
          </div>
      )}

      {subpage === "machine-market" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <MachineMarket />
          </div>
      )}

      {subpage === "publish-order" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <PublishOrder />
          </div>
      )}

      {subpage === "certification" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <CertificationCenter />
          </div>
      )}

      {subpage === "rating" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <RatingAndLeaderboard />
          </div>
      )}

      {subpage === "order-tracking" && (
          <div className="absolute inset-0 z-20 pointer-events-auto bg-background overflow-y-auto">
            <OrderTracking />
          </div>
      )}

      {/* 传统注册/审核中心（正式运行） */}
      {subpage === "onboarding" && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          <OnboardingCenter />
        </div>
      )}
      {subpage === "identity" && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          <IdentityApplication />
        </div>
      )}
      {subpage === "machine-register" && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          <MachineRegistration />
        </div>
      )}
      {subpage === "admin-review" && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          <AdminReview />
        </div>
      )}
      {subpage === "publish-machine" && (
        <div className="absolute inset-0 z-20 pointer-events-auto">
          <PublishMachineListing />
        </div>
      )}
    </DashboardLayout>
  );
}
