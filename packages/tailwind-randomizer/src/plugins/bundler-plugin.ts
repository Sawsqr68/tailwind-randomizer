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
  const cwd = path.resolve(process.cwd());
  const mapPath = path.resolve(cwd, ".next/class-map.json");
  
  // Use path.relative to check if the path escapes the working directory
  const relativePath = path.relative(cwd, mapPath);
  
  // Ensure the path doesn't start with '..' and isn't an absolute path to a different location
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error("Invalid map file path: path traversal detected");
  }
  
  return mapPath;
}

const MAP_FILE = getSecureMapFilePath();

function flushMap() {
  const obj = Object.fromEntries(classMap);
  const dirPath = path.dirname(MAP_FILE);
  
  // Additional check before creating directory
  const cwd = path.resolve(process.cwd());
  const relativeDirPath = path.relative(cwd, dirPath);
  
  if (relativeDirPath.startsWith('..') || path.isAbsolute(relativeDirPath)) {
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
