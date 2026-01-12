import fs from "fs";
import path from "path";
import type { Root, Rule, PluginCreator } from "postcss";
import { getSecureFilePath } from "../utils/path-security";
import { toTailwindSelector } from "../utils/tailwind-selector";

const MAP_FILE = getSecureFilePath(".next/class-map.json");

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
