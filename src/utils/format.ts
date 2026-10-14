export function formatDate(value: string): string {
  let date: Date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    Crypto: "DIGITAL ASSETS",
    Sports: "SPORTS",
    Economics: "ECONOMICS",
    RWA: "REAL-WORLD ASSETS",
    Regional: "REGIONAL & GLOBAL",
  };

  return labels[category] ?? category.toUpperCase();
}

export function categorySymbol(category: string): string {
  const symbols: Record<string, string> = {
    Crypto: "DA",
    Sports: "SP",
    Economics: "EC",
    RWA: "RW",
    Regional: "RG",
  };

  return symbols[category] ?? "AO";
}