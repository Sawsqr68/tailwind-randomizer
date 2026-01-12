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

function flushMap() {
  const obj = Object.fromEntries(classMap);
  const dirPath = path.dirname(MAP_FILE);
  
  // Create directory and write file - path is already validated
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
