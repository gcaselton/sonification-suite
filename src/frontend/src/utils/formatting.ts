export function formatCoord(coord: string) {
    return Number(coord).toFixed(2);
  }

export function formatSoniType(value: string) {
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toLowerCase())
      .replace(/s$/, "");
  }