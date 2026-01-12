import fs from "fs";
import path from "path";
import type { Root, Rule, PluginCreator } from "postcss";
import { getSecureFilePath } from "../utils/path-security";

const MAP_FILE = getSecureFilePath(".next/class-map.json");

function toTailwindSelector(className: string) {
  return className
    .split("")
    .map((character) => {
      if (/^[a-zA-Z0-9_-]$/.test(character)) return character;
      return "\\" + character;
    })
    .join("");
}

const postcssPlugin: PluginCreator<Record<string, never>> = () => {
  return {
    postcssPlugin: "tailwind-class-rewrite",
    Once(root: Root) {
      console.log("🧩 Tailwind Class Rewriter Plugin Initialized");

      if (!fs.existsSync(MAP_FILE)) return;

      let classNameMap: Record<string, string>;
      try {
        const fileContent = fs.readFileSync(MAP_FILE, "utf8");
        classNameMap = JSON.parse(fileContent);
        
        // Validate that classNameMap is an object
        if (typeof classNameMap !== "object" || classNameMap === null || Array.isArray(classNameMap)) {
          throw new Error("Invalid class map format");
        }
      } catch (error) {
        console.error("🧩 Error reading or parsing class map:", error);
        return;
      }

      console.log("🧩 Tailwind Replacer Class Map:", Object.keys(classNameMap).length);

      root.walkRules((rule: Rule) => {
        const original = rule.selector;

        let rewritten = original;

        for (const [originalClassName, obfuscatedClassName] of Object.entries(classNameMap)) {
          const tailwindSelector = "." + toTailwindSelector(originalClassName);
          const targetSelector = "." + obfuscatedClassName;

          if (rewritten === tailwindSelector) {
            rewritten = rewritten.split(tailwindSelector).join(targetSelector);
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
