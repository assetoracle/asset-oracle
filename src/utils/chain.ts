
export { ASSET_CHAIN_ID } from "../config/assetChain";

export function normalizeChainId(
  chainId: string | number | undefined,
): string | null {
  if (chainId === undefined) {
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

  if (Number.isFinite(decimal) && decimal >= 0) {
    return `0x${decimal.toString(16)}`;
  }

  return normalized;
}

export function isTestnet(chainId: string | null): boolean {
  if (chainId === null) {
    return false;
  }

  return normalizeChainId(chainId) === "0xa5b5";
}

export function displayChainId(
  chainId: string | null | undefined,
): string {
  if (chainId === null || chainId === undefined) {
    return "Unknown";
  }

  try {
    if (chainId.toLowerCase().startsWith("0x")) {
      return `${Number.parseInt(chainId, 16)} (${chainId})`;
    }

    return `${Number(chainId)} (${chainId})`;
  } catch {
    return chainId;
  }
}
