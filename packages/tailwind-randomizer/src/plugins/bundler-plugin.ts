import { parseSync, printSync } from "@swc/core";
import fs from "fs";
import path from "path";
import { customAlphabet } from "nanoid";
import { getSecureFilePath } from "../utils/path-security";

const nanoid = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  8,
);

const classMap = new Map();
const MAP_FILE = getSecureFilePath(".next/class-map.json");
let flushTimeout: NodeJS.Timeout | null = null;
let mapDirty = false;

function flushMap() {
  const obj = Object.fromEntries(classMap);
  const dirPath = path.dirname(MAP_FILE);
  
  // Create directory and write file - path is already validated
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(obj, null, 2));
  mapDirty = false;
}

function scheduleFlush() {
  mapDirty = true;
  
  // Debounce file writes - only write after 100ms of inactivity
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }
  
  flushTimeout = setTimeout(() => {
    if (mapDirty) {
      flushMap();
    }
  }, 100);
}

// Ensure flush happens on process exit
process.on('exit', () => {
  if (mapDirty && flushTimeout) {
    clearTimeout(flushTimeout);
    flushMap();
  }
});

process.on('SIGINT', () => {
  if (mapDirty && flushTimeout) {
    clearTimeout(flushTimeout);
    flushMap();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (mapDirty && flushTimeout) {
    clearTimeout(flushTimeout);
    flushMap();
  }
  process.exit(0);
});

function get(cls: string): string {
  if (!classMap.has(cls)) {
    classMap.set(cls, nanoid());
  }
  return classMap.get(cls);
}

function rewriteString(value: string) {
  return value.split(/\s+/).map(get).join(" ");
}

export default function bundlerPlugin(source: string) {
  console.log("🧩 Transforming");

  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: true,
    decorators: false,
  });

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    // Early exit for non-JSX nodes - skip processing nodes that can't contain className
    const nodeType = node.type;
    if (nodeType === "StringLiteral" || nodeType === "NumericLiteral" || 
        nodeType === "BooleanLiteral" || nodeType === "NullLiteral") {
      return;
    }

    if (
      nodeType === "JSXAttribute" &&
      node.name?.type === "Identifier" &&
      node.name.value === "className"
    ) {
      const v = node.value;

      if (v?.type === "StringLiteral") {
        const newValue = rewriteString(v.value);
        v.value = newValue;
        v.raw = JSON.stringify(newValue);
      }

      if (v?.type === "JSXExpressionContainer") {
        walk(v.expression);
      }
    }

    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === "object") walk(child);
    }
  }

  walk(ast);
  scheduleFlush();
  return printSync(ast).code;
}
