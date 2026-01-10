import type { User } from "../../drizzle/schema";

/**
 * 判断用户是否为“有效会员”（含管理员）。
 * - admin：永远视为有效
 * - free：无权益
 * - silver/gold/diamond：必须存在 membershipExpiresAt 且未过期
 */
export function isActivePaidMember(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.membershipLevel === "free") return false;
  if (!user.membershipExpiresAt) return false;
  return new Date(user.membershipExpiresAt) > new Date();
}

/**
 * 作业需求联系方式可见性（FREE 不可见；SILVER 及以上且未过期可见；管理员可见）
 */
export function canViewJobContact(user: User | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return isActivePaidMember(user);
}

