import { parseSync, printSync } from "@swc/core";
import fs from "fs";
import path from "path";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  8,
);

const classMap = new Map();

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

function flushMap() {
  const obj = Object.fromEntries(classMap);
  const dirPath = path.dirname(MAP_FILE);
  
  // Additional check before creating directory
  if (!dirPath.startsWith(path.normalize(process.cwd()))) {
    throw new Error("Invalid directory path: path traversal detected");
  }
  
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(obj, null, 2));
}

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

    if (
      node.type === "JSXAttribute" &&
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
  flushMap();
  return printSync(ast).code;
}
