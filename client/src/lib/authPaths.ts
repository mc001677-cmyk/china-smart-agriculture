/**
 * 统一处理登录/注册回跳（next）参数：
 * - 生成：toLoginPath/toRegisterPath
 * - 解析：parseNextFromSearch
 * - 安全：只允许站内路径（以 / 开头，且不是 //，且不是 /login /register 自身）
 */

function isSafeInternalPath(path: string): boolean {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  // 防止奇怪的协议注入
  if (path.includes("://")) return false;
  // 防止循环跳转
  if (path.startsWith("/login") || path.startsWith("/register")) return false;
  return true;
}

export function getCurrentPathWithQueryHash(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function toLoginPath(next?: string): string {
  const safe = next && isSafeInternalPath(next) ? next : null;
  return safe ? `/login?next=${encodeURIComponent(safe)}` : "/login";
}

export function toRegisterPath(next?: string): string {
  const safe = next && isSafeInternalPath(next) ? next : null;
  return safe ? `/register?next=${encodeURIComponent(safe)}` : "/register";
}

export function parseNextFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const raw = params.get("next");
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // ignore
  }
  return isSafeInternalPath(decoded) ? decoded : null;
}


function getSafeInternalReferrerPath(): string | null {
  if (typeof window === "undefined") return null;
  const ref = document.referrer;
  if (!ref) return null;
  try {
    const u = new URL(ref);
    if (u.origin !== window.location.origin) return null;
    const p = `${u.pathname}${u.search}${u.hash}`;
    // 复用本文件的安全规则
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return (p && p.startsWith("/") && !p.startsWith("//") && !p.includes("://") && !p.startsWith("/login") && !p.startsWith("/register")) ? p : null;
  } catch {
    return null;
  }
}

/**
 * 登录/注册/微信登录成功后的默认落点：
 * - 优先使用 next（已在 parseNextFromSearch 做过安全校验）
 * - 否则根据同域 referrer 推断 /dashboard 或 /simulate
 * - 最后兜底 /dashboard
 */
export function getDefaultPostAuthPath(next: string | null, fallbackSubpage: string = "onboarding"): string {
  if (next) return next;
  const ref = getSafeInternalReferrerPath();
  const base = ref?.startsWith("/simulate") ? "/simulate" : "/dashboard";
  if (!fallbackSubpage) return base;
  return `${base}/${fallbackSubpage}`;
}
