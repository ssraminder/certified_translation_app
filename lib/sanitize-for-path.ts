export function sanitizeForPath(name: string): string {
  // keep letters, numbers, space, dash, underscore, dot; replace others with '-'
  const base = name
    .trim()
    .replace(/[^a-zA-Z0-9 \-_.]/g, "-")
    .replace(/\s+/g, " ")
  // collapse repeats
  return base.replace(/-+/g, "-")
}
