import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { FleetProvider } from "@/contexts/FleetContext";
import { FieldProvider } from "@/contexts/FieldContext";
import { MarketplaceProvider } from "@/contexts/MarketplaceContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Landing from "./pages/Landing";
import FileManager from "./pages/FileManager";
import SimulateDashboard from "./pages/SimulateDashboard";

// wouter 的 Route component 会注入 RouteComponentProps；这里用 wrapper 避免与我们自定义 props（mode）冲突
const DashboardRunRoute = (_props: unknown) => <Dashboard mode="run" />;

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {/* 落地页：二选一入口 */}
      <Route path={"/"} component={Landing} />

      {/* 登录页 */}
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />

      {/* 正式运行主视图 */}
      <Route path={"/dashboard"} component={DashboardRunRoute} />
      <Route path={"/dashboard/:subpage"} component={DashboardRunRoute} />

      {/* 模拟运行视图：单独的路由前缀 */}
      <Route path={"/simulate"} component={SimulateDashboard} />
      <Route path={"/simulate/:subpage"} component={SimulateDashboard} />

      {/* 其他功能页面 */}
      <Route path={"/files"} component={FileManager} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <LanguageProvider>
          <FleetProvider>
            <FieldProvider>
              <MarketplaceProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </MarketplaceProvider>
            </FieldProvider>
          </FleetProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
