import { spawn } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  acquireLock,
  releaseLock,
  cleanupNextDir,
  FIXTURE_DIR,
  CLASS_MAP_FILE,
  NEXT_DIR,
} from "./utils";
import {
  startServer,
  stopServer,
  validateClassMap,
  toTailwindSelector,
} from "./test-helpers";

describe("Dev Server Obfuscation", () => {
  let devProcess: ReturnType<typeof spawn> | null = null;
  const PORT = 3000;
  const BASE_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    await acquireLock();

    await cleanupNextDir();

    devProcess = await startServer({
      cwd: FIXTURE_DIR,
      port: PORT,
      command: ["pnpm", "dev"],
      timeoutSeconds: 60,
    });

    // Wait a bit longer for dev server to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }, 120000);

  afterAll(async () => {
    try {
      if (devProcess) {
        await stopServer(devProcess);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      await cleanupNextDir();
    } finally {
      await releaseLock();
    }
  });

  it("should generate class-map.json file", async () => {
    expect(existsSync(CLASS_MAP_FILE)).toBe(true);
  });

  it("should obfuscate class names in class-map.json", () => {
    expect(existsSync(CLASS_MAP_FILE)).toBe(true);

    const classMapContent = readFileSync(CLASS_MAP_FILE, "utf-8");
    const classMap: { [key: string]: string } = JSON.parse(classMapContent);

    expect(Object.keys(classMap).length).toBeGreaterThan(0);

    for (const [original, obfuscated] of Object.entries(classMap)) {
      expect(original).not.toBe(obfuscated);
      expect(typeof obfuscated).toBe("string");
      expect(obfuscated.length).toBeGreaterThan(0);
      expect(obfuscated).toMatch(/^[a-zA-Z]+$/);
    }

    const expectedClasses = [
      "flex",
      "min-h-screen",
      "items-center",
      "justify-center",
      "bg-zinc-50",
    ];

    const hasExpectedClass = expectedClasses.some((cls) =>
      Object.keys(classMap).includes(cls),
    );
    expect(hasExpectedClass).toBe(true);
  });

  it("should serve obfuscated HTML", async () => {
    const response = await fetch(BASE_URL);
    expect(response.ok).toBe(true);

    const html = await response.text();

    if (existsSync(CLASS_MAP_FILE)) {
      const classMapContent = readFileSync(CLASS_MAP_FILE, "utf-8");
      const classMap = JSON.parse(classMapContent);

      const obfuscatedClasses = Object.values(classMap) as string[];
      const hasObfuscatedClass = obfuscatedClasses.some((obfClass) =>
        html.includes(obfClass),
      );

      expect(hasObfuscatedClass).toBe(true);

      const originalClasses = Object.keys(classMap);
      originalClasses.some((origClass) =>
        html.includes(`className="${origClass}"`),
      );
    }
  });

  it("should obfuscate CSS selectors in generated CSS", () => {
    const { classMap, obfuscatedClasses, originalClasses } =
      validateClassMap(CLASS_MAP_FILE);

    const staticCssDir = path.join(NEXT_DIR, "/dev/static/css/app");
    if (existsSync(staticCssDir)) {
      const cssFiles = readdirSync(staticCssDir).filter((file) =>
        file.endsWith(".css"),
      );

      if (cssFiles.length > 0) {
        const cssFile = path.join(staticCssDir, cssFiles[0]);
        const cssContent = readFileSync(cssFile, "utf-8");

        const hasObfuscatedSelector = obfuscatedClasses.some((obfClass) =>
          cssContent.includes(`.${obfClass}`),
        );

        expect(hasObfuscatedSelector).toBe(true);

        const sampleOriginalClasses = originalClasses.slice(0, 5);

        for (const origClass of sampleOriginalClasses) {
          const twSelector = `.${toTailwindSelector(origClass)}`;
          const obfClass = classMap[origClass];

          if (cssContent.includes(`.${obfClass}`)) {
            expect(cssContent).not.toContain(twSelector);
          }
        }
      }
    }
  });
});
