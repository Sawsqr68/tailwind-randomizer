import fs from "fs";
import path from "path";
import type { Root, Rule, PluginCreator } from "postcss";
import { getSecureFilePath } from "../utils/path-security";

const MAP_FILE = getSecureFilePath(".next/class-map.json");

// Cache for escaped selectors to avoid recomputation
// Limited to 1000 entries to prevent memory leaks in long-running processes
const selectorCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

function toTailwindSelector(className: string): string {
  if (selectorCache.has(className)) {
    return selectorCache.get(className)!;
  }
  
  const escaped = className
    .split("")
    .map((ch) => {
      if (/^[a-zA-Z0-9_-]$/.test(ch)) return ch;
      return "\\" + ch;
    })
    .join("");
  
  // Limit cache size to prevent memory leaks
  if (selectorCache.size >= MAX_CACHE_SIZE) {
    // Simple eviction: clear half the cache when limit is reached
    // This avoids O(n) operation of creating arrays for every insert
    const iterator = selectorCache.keys();
    const deleteCount = Math.floor(MAX_CACHE_SIZE / 2);
    for (let i = 0; i < deleteCount; i++) {
      const key = iterator.next().value;
      if (key !== undefined) {
        selectorCache.delete(key);
      }
    }
  }
  
  selectorCache.set(className, escaped);
  return escaped;
}

const postcssPlugin: PluginCreator<Record<string, never>> = () => {
  return {
    postcssPlugin: "tailwind-class-rewrite",
    Once(root: Root) {
      if (!fs.existsSync(MAP_FILE)) return;

      let map: Record<string, string>;
      try {
        const fileContent = fs.readFileSync(MAP_FILE, "utf8");
        map = JSON.parse(fileContent);
        
        // Validate that map is an object
        if (typeof map !== "object" || map === null || Array.isArray(map)) {
          throw new Error("Invalid class map format");
        }
      } catch (error) {
        console.error("🧩 Error reading or parsing class map:", error);
        return;
      }

      // Pre-compute all selector mappings for faster lookup
      const selectorMap = new Map<string, string>();
      for (const [orig, obf] of Object.entries(map)) {
        const tw = "." + toTailwindSelector(orig);
        const target = "." + obf;
        selectorMap.set(tw, target);
      }

      root.walkRules((rule: Rule) => {
        const replacement = selectorMap.get(rule.selector);
        if (replacement) {
          rule.selector = replacement;
        }
      });
    },
  };
};

postcssPlugin.postcss = true;

export default postcssPlugin;
