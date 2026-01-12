import { spawn } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  acquireLock,
  releaseLock,
  waitForLockRelease,
  cleanupNextDir,
  cleanupClassMap,
  FIXTURE_DIR,
  CLASS_MAP_FILE,
  NEXT_DIR,
} from "./utils";
import {
  startServer,
  stopServer,
  validateClassMap,
  toTailwindSelector,
  assertClassMapValidation,
  assertHtmlObfuscation,
} from "./test-helpers";

describe("Build Server Obfuscation", () => {
  let startProcess: ReturnType<typeof spawn> | null = null;
  const PORT = 3001; // Use different port to avoid conflicts
  const BASE_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    await waitForLockRelease(120); // Wait up to 2 minutes
    await acquireLock();
    await cleanupClassMap();
    await cleanupNextDir();

    await new Promise<void>((resolve, reject) => {
      const buildProcess = spawn("pnpm", ["build"], {
        cwd: FIXTURE_DIR,
        stdio: "pipe",
        env: {
          ...process.env,
        },
      });

      let buildOutput = "";

      buildProcess.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        buildOutput += output;
      });

      buildProcess.stderr?.on("data", (data: Buffer) => {
        const output = data.toString();
        buildOutput += output;
        console.error(output);
      });

      buildProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`Build failed with exit code ${code}\n${buildOutput}`),
          );
        }
      });

      buildProcess.on("error", (error) => {
        reject(error);
      });
    });

    startProcess = await startServer({
      cwd: FIXTURE_DIR,
      port: PORT,
      command: ["pnpm", "start"],
      timeoutSeconds: 60,
    });
  }, 180000);

  afterAll(async () => {
    try {
      if (startProcess) {
        await stopServer(startProcess);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } finally {
      await releaseLock();
    }
  });

  it("should generate class-map.json file after build", async () => {
    expect(existsSync(CLASS_MAP_FILE)).toBe(true);
  });

  it("should obfuscate class names in class-map.json", () => {
    assertClassMapValidation(CLASS_MAP_FILE, expect);
  });

  it("should serve obfuscated HTML", async () => {
    const response = await fetch(BASE_URL);
    expect(response.ok).toBe(true);

    const html = await response.text();
    assertHtmlObfuscation(html, CLASS_MAP_FILE, expect);
  });

  it("should obfuscate CSS selectors in generated CSS", () => {
    const { classMap, obfuscatedClasses, originalClasses } =
      validateClassMap(CLASS_MAP_FILE);

    const staticCssDir = path.join(NEXT_DIR, "static/css");
    expect(existsSync(staticCssDir)).toBe(true);

    const cssFiles = readdirSync(staticCssDir).filter((file) =>
      file.endsWith(".css"),
    );

    expect(cssFiles.length).toBeGreaterThan(0);

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
  });
});
