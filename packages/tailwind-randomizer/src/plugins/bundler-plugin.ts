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
  const classMapObject = Object.fromEntries(classMap);
  const dirPath = path.dirname(MAP_FILE);
  
  // Create directory and write file - path is already validated
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(MAP_FILE, JSON.stringify(classMapObject, null, 2));
}

function getOrCreateObfuscatedClassName(className: string): string {
  if (!classMap.has(className)) {
    classMap.set(className, nanoid());
  }
  return classMap.get(className);
}

function rewriteString(value: string) {
  return value.split(/\s+/).map(getOrCreateObfuscatedClassName).join(" ");
}

export default function bundlerPlugin(source: string) {
  console.log("🧩 Transforming");

  const ast = parseSync(source, {
    syntax: "typescript",
    tsx: true,
    decorators: false,
  });

  function traverseAstAndObfuscateClassNames(node: any) {
    if (!node || typeof node !== "object") return;

    if (
      node.type === "JSXAttribute" &&
      node.name?.type === "Identifier" &&
      node.name.value === "className"
    ) {
      const attributeValue = node.value;

      if (attributeValue?.type === "StringLiteral") {
        const newValue = rewriteString(attributeValue.value);
        attributeValue.value = newValue;
        attributeValue.raw = JSON.stringify(newValue);
      }

      if (attributeValue?.type === "JSXExpressionContainer") {
        traverseAstAndObfuscateClassNames(attributeValue.expression);
      }
    }

    for (const key in node) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(traverseAstAndObfuscateClassNames);
      else if (child && typeof child === "object") traverseAstAndObfuscateClassNames(child);
    }
  }

  traverseAstAndObfuscateClassNames(ast);
  flushMap();
  return printSync(ast).code;
}
