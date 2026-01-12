import fs from "fs";
import path from "path";
import type { Root, Rule, PluginCreator } from "postcss";
import { getSecureFilePath } from "../utils/path-security";

const MAP_FILE = getSecureFilePath(".next/class-map.json");

// Cache for toTailwindSelector results to avoid repeated computation
const selectorCache = new Map<string, string>();

function toTailwindSelector(className: string): string {
  if (selectorCache.has(className)) {
    return selectorCache.get(className)!;
  }
  
  const result = className
    .split("")
    .map((ch) => {
      if (/^[a-zA-Z0-9_-]$/.test(ch)) return ch;
      return "\\" + ch;
    })
    .join("");
  
  selectorCache.set(className, result);
  return result;
}

// Cache the class map to avoid reading file on every CSS processing
let cachedMap: Record<string, string> | null = null;
let mapFileModTime: number | null = null;

function getClassMap(): Record<string, string> | null {
  if (!fs.existsSync(MAP_FILE)) return null;

  try {
    const stats = fs.statSync(MAP_FILE);
    const currentModTime = stats.mtimeMs;
    
    // Return cached map if file hasn't changed
    if (cachedMap && mapFileModTime === currentModTime) {
      return cachedMap;
    }
    
    const fileContent = fs.readFileSync(MAP_FILE, "utf8");
    const map = JSON.parse(fileContent);
    
    // Validate that map is an object
    if (typeof map !== "object" || map === null || Array.isArray(map)) {
      throw new Error("Invalid class map format");
    }
    
    cachedMap = map;
    mapFileModTime = currentModTime;
    return map;
  } catch (error) {
    console.error("🧩 Error reading or parsing class map:", error);
    return null;
  }
}

const postcssPlugin: PluginCreator<Record<string, never>> = () => {
  return {
    postcssPlugin: "tailwind-class-rewrite",
    Once(root: Root) {
      console.log("🧩 Tailwind Class Rewriter Plugin Initialized");

      const map = getClassMap();
      if (!map) return;

      console.log("🧩 Tailwind Replacer Class Map:", Object.keys(map).length);

      root.walkRules((rule: Rule) => {
        const original = rule.selector;

        // Check if selector starts with a class selector
        if (!original.startsWith('.')) return;

        let rewritten = original;

        // Optimize: iterate through map entries and exit early when match found
        for (const [orig, obf] of Object.entries(map)) {
          const tw = "." + toTailwindSelector(orig);
          
          // Use exact match check first (most common case)
          if (rewritten === tw) {
            rewritten = "." + obf;
            break; // Exit early - we found an exact match
          }
        }

        if (rewritten !== original) {
          rule.selector = rewritten;
        }
      });
    },
  };
};

postcssPlugin.postcss = true;

export default postcssPlugin;
