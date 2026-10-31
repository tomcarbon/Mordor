/**
 * Replaces {token} placeholders in one pass. Values are never re-read, so a recruit who enters
 * "{station}" or "$&" as a name gets exactly that on the Writ. Unknown tokens stay visible.
 */
export function fillTokens(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : whole,
  );
}
