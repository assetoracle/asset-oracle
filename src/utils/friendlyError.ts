const RULES: Array<[RegExp, string]> = [
  [/user rejected|user denied|user cancelled|request rejected/i, "Request cancelled."],
  [/insufficient funds|not enough funds/i, "Not enough funds."],
  [/wrong network|chain.?id|unsupported chain|network mismatch/i, "Switch network."],
  [/not found|does not exist|unknown market|unknown proposal/i, "Not found."],
  [/unauthori[sz]ed|forbidden|not an admin|not a validator|access denied/i, "Access denied."],
  [/already (voted|claimed|settled|exists|submitted)|duplicate/i, "Already done."],
  [/deadline|expired|challenge period|too late/i, "Time has passed."],
  [/invalid address|bad address/i, "Check wallet address."],
  [/wallet.*(connect|available)|connect.*wallet|no wallet/i, "Connect wallet."],
  [/timeout|timed out|network error|failed to fetch|fetch failed|rpc|gateway/i, "Connection issue."],
  [/revert|execution reverted|contract error|call exception/i, "Action failed."],
  [/rate limit|too many requests/i, "Try again soon."],
  [/required|missing|must provide|cannot be empty/i, "Missing information."],
];

const MAX_ERROR_LENGTH = 40;
const DEFAULT_ERROR = "Action failed.";

export function friendlyError(error: unknown, fallback = DEFAULT_ERROR): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  for (const [pattern, friendly] of RULES) {
    if (pattern.test(message)) return friendly.slice(0, MAX_ERROR_LENGTH);
  }

  // Never show raw provider, RPC, or backend error text in the UI.
  // Unknown errors use a short safe fallback, regardless of input length.
  const safeFallback = fallback.trim();
  if (safeFallback.length > 0 && safeFallback.length <= MAX_ERROR_LENGTH) {
    return safeFallback;
  }
  return DEFAULT_ERROR;
}
