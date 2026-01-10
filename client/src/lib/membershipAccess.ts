/**
 * 会员权限相关的前端工具函数（仅用于 UI 展示/按钮可用性）。
 * 注意：涉及“钱/会员/联系方式”的最终权限判断必须在后端执行；前端这里只做引导与交互保护。
 */

export type MembershipSummaryLite = {
  isActive?: boolean;
} | null | undefined;

/**
 * 是否具备“发布”入口可用性（模拟模式永远可用；正式运行依赖 membership.summary.isActive）。
 */
export function hasPublishingAccess(
  isSimulateMode: boolean,
  membership: MembershipSummaryLite
): boolean {
  return isSimulateMode || Boolean(membership?.isActive);
}

