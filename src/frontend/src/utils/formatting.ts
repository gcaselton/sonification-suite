export function formatCoord(coord: string) {
    return Number(coord).toFixed(4);
  }

export function formatSoniType(value: string) {
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toLowerCase())
      .replace(/s$/, "");
  }

export function capitaliseWords(str: string) {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}