export const ASSET_CHAIN_ID = 42421;

export function normalizeChainId(
  chainId: string | number | undefined,
): string | null {
  if (chainId === undefined || chainId === null || chainId === "") {
    return null;
  }

  if (typeof chainId === "number") {
    return `0x${chainId.toString(16)}`;
  }

  const normalized = chainId.toLowerCase();

  if (normalized.startsWith("0x")) {
    return normalized;
  }

  const decimal = Number(normalized);

  return Number.isFinite(decimal) && decimal >= 0
    ? `0x${decimal.toString(16)}`
    : normalized;
}

export function isTestnet(
  chainId: string | number | undefined,
): boolean {
  const normalized = normalizeChainId(chainId);
  return normalized === normalizeChainId(ASSET_CHAIN_ID);
}

export function displayChainId(
  chainId: string | number | undefined,
): string {
  const normalized = normalizeChainId(chainId);

  if (!normalized) {
    return "Detecting network...";
  }

  if (normalized.startsWith("0x")) {
    return `${parseInt(normalized, 16)} (${normalized})`;
  }

  return normalized;
}