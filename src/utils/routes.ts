export type RoutePage =
  | "Home" | "Markets" | "My Proposals" | "Portfolio" | "Claims" | "History"
  | "Referrals" | "Admin" | "Validators" | "Terms of Service";

function decodeRoutePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseRoutePath(pathname: string): {
  page: RoutePage;
  marketId: string | null;
  verificationMarketId: string | null;
} {
  const parts = (pathname || "/").split("/").filter(Boolean);
  if (parts[0] === "verify" && parts[1]) {
    return { page: "Markets", marketId: null, verificationMarketId: decodeRoutePath(parts.slice(1).join("/")) };
  }
  if (parts[0] === "markets" && parts[1]) {
    return { page: "Markets", marketId: decodeRoutePath(parts.slice(1).join("/")), verificationMarketId: null };
  }
  const routes: Record<string, RoutePage> = {
    "": "Home", markets: "Markets", "my-proposals": "My Proposals", portfolio: "Portfolio",
    claims: "Claims", history: "History", referrals: "Referrals", admin: "Admin",
    validators: "Validators", terms: "Terms of Service",
  };
  return { page: routes[parts[0] ?? ""] ?? "Home", marketId: null, verificationMarketId: null };
}
