import Dashboard from "./Dashboard";

/**
 * 模拟运行视图：
 * 与正式运行共用同一套 Dashboard 组件，
 * 但通过 mode="simulate" 区分数据来源和界面标识。
 */
export default function SimulateDashboard() {
  return <Dashboard mode="simulate" />;
}
