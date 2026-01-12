import { spawn, ChildProcess } from "child_process";
import { existsSync, readFileSync } from "fs";
import { toTailwindSelector } from "../src/utils/tailwind-selector";
import type { expect } from "vitest";

export { toTailwindSelector };

export interface ServerStartOptions {
  cwd: string;
  port: number;
  command: string[];
  timeoutSeconds?: number;
}

/**
 * Starts a server process and waits for it to be ready
 */
export async function startServer(
  options: ServerStartOptions,
): Promise<ChildProcess> {
  const { cwd, port, command, timeoutSeconds = 60 } = options;
  const baseUrl = `http://localhost:${port}`;

  const serverProcess = spawn(command[0], command.slice(1), {
    cwd,
    stdio: "pipe",
    env: {
      ...process.env,
      PORT: port.toString(),
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      serverProcess?.kill("SIGTERM");
      reject(
        new Error(
          `Server failed to start within ${timeoutSeconds} seconds`,
        ),
      );
    }, timeoutSeconds * 1000);

    let serverReady = false;

    const checkServer = async () => {
      try {
        const response = await fetch(baseUrl);
        if (response.ok) {
          serverReady = true;
          clearTimeout(timeout);
          setTimeout(resolve, 2000);
        }
      } catch {}
    };

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const output = data.toString();
      if (
        (output.includes("Ready") ||
          output.includes("started server") ||
          output.includes(`localhost:${port}`) ||
          output.includes(`http://localhost:${port}`)) &&
        !serverReady
      ) {
        const interval = setInterval(async () => {
          if (serverReady) {
            clearInterval(interval);
            return;
          }
          await checkServer();
        }, 1000);
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      const output = data.toString();
      console.error(output);
    });

    serverProcess.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return serverProcess;
}

/**
 * Stops a server process gracefully
 */
export async function stopServer(
  serverProcess: ChildProcess | null,
): Promise<void> {
  if (!serverProcess) return;

  await new Promise<void>((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          if (serverProcess && !serverProcess.killed) {
            serverProcess.kill("SIGKILL");
          }
        } catch (error) {}
        resolve();
      }
    }, 10000);

    const exitHandler = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve();
      }
    };

    if (
      (serverProcess as any).exitCode !== null ||
      (serverProcess as any).signalCode !== null
    ) {
      exitHandler();
    } else {
      serverProcess?.once("exit", exitHandler);
      try {
        serverProcess?.kill("SIGTERM");
      } catch (error) {
        exitHandler();
      }
    }
  });
}

/**
 * Validates the class map file structure and content
 */
export function validateClassMap(classMapFile: string): {
  classMap: Record<string, string>;
  obfuscatedClasses: string[];
  originalClasses: string[];
} {
  if (!existsSync(classMapFile)) {
    throw new Error("class-map.json not found");
  }

  const classMapContent = readFileSync(classMapFile, "utf-8");
  const classMap: Record<string, string> = JSON.parse(classMapContent);
  const obfuscatedClasses = Object.values(classMap);
  const originalClasses = Object.keys(classMap);

  return { classMap, obfuscatedClasses, originalClasses };
}

/**
 * Common assertions for class map validation tests
 */
export function assertClassMapValidation(
  classMapFile: string,
  expectFn: typeof expect,
): void {
  expectFn(existsSync(classMapFile)).toBe(true);

  const classMapContent = readFileSync(classMapFile, "utf-8");
  const classMap: Record<string, string> = JSON.parse(classMapContent);

  expectFn(Object.keys(classMap).length).toBeGreaterThan(0);

  for (const [original, obfuscated] of Object.entries(classMap)) {
    expectFn(original).not.toBe(obfuscated);
    expectFn(typeof obfuscated).toBe("string");
    expectFn(obfuscated.length).toBeGreaterThan(0);
    expectFn(obfuscated).toMatch(/^[a-zA-Z]+$/);
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
  expectFn(hasExpectedClass).toBe(true);
}

/**
 * Common assertions for HTML obfuscation tests
 */
export function assertHtmlObfuscation(
  html: string,
  classMapFile: string,
  expectFn: typeof expect,
): void {
  if (!existsSync(classMapFile)) return;

  const classMapContent = readFileSync(classMapFile, "utf-8");
  const classMap = JSON.parse(classMapContent);

  const obfuscatedClasses = Object.values(classMap) as string[];
  const hasObfuscatedClass = obfuscatedClasses.some((obfClass) =>
    html.includes(obfClass),
  );

  expectFn(hasObfuscatedClass).toBe(true);
}

