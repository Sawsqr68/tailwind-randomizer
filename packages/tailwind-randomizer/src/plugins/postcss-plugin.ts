import fs from "fs";
import path from "path";
import type { Root, Rule, PluginCreator } from "postcss";

// Ensure the map file path is within the project directory to prevent path traversal
function getSecureMapFilePath(): string {
  const cwd = process.cwd();
  const mapPath = path.join(cwd, ".next/class-map.json");
  
  // Normalize the path to resolve any ".." sequences
  const normalizedPath = path.normalize(mapPath);
  
  // Ensure the resolved path is still within the cwd
  if (!normalizedPath.startsWith(path.normalize(cwd))) {
    throw new Error("Invalid map file path: path traversal detected");
  }
  
  return normalizedPath;
}

const MAP_FILE = getSecureMapFilePath();

function toTailwindSelector(className: string) {
  return className
    .split("")
    .map((ch) => {
      if (/^[a-zA-Z0-9_-]$/.test(ch)) return ch;
      return "\\" + ch;
    })
    .join("");
}

const postcssPlugin: PluginCreator<Record<string, never>> = () => {
  return {
    postcssPlugin: "tailwind-class-rewrite",
    Once(root: Root) {
      console.log("🧩 Tailwind Class Rewriter Plugin Initialized");

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

      console.log("🧩 Tailwind Replacer Class Map:", Object.keys(map).length);

      root.walkRules((rule: Rule) => {
        const original = rule.selector;

        let rewritten = original;

        for (const [orig, obf] of Object.entries(map)) {
          const tw = "." + toTailwindSelector(orig);
          const target = "." + obf;

          if (rewritten === tw) {
            rewritten = rewritten.split(tw).join(target);
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
