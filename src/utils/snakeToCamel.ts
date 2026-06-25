export function snakeToCamel(rows: unknown[]): Record<string, unknown>[] {
  return (rows as Record<string, unknown>[]).map(row =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        value,
      ])
    )
  );
}
