/**
 * Converts a Tailwind class name to a CSS selector by escaping special characters.
 * 
 * @param className - The Tailwind class name to convert
 * @returns The escaped CSS selector format
 * 
 * @example
 * toTailwindSelector("flex") // "flex"
 * toTailwindSelector("min-h-screen") // "min\\-h\\-screen"
 * toTailwindSelector("bg-zinc-50") // "bg\\-zinc\\-50"
 */
export function toTailwindSelector(className: string): string {
  return className
    .split("")
    .map((ch) => {
      if (/^[a-zA-Z0-9_-]$/.test(ch)) return ch;
      return "\\" + ch;
    })
    .join("");
}
