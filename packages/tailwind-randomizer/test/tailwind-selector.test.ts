import { describe, expect, it } from "vitest";
import { toTailwindSelector } from "../src/utils/tailwind-selector";

describe("toTailwindSelector", () => {
  it("should return plain alphanumeric class names unchanged", () => {
    expect(toTailwindSelector("flex")).toBe("flex");
    expect(toTailwindSelector("container")).toBe("container");
    expect(toTailwindSelector("block")).toBe("block");
  });

  it("should not escape hyphens and underscores (valid CSS chars)", () => {
    expect(toTailwindSelector("min-h-screen")).toBe("min-h-screen");
    expect(toTailwindSelector("bg-zinc-50")).toBe("bg-zinc-50");
    expect(toTailwindSelector("items-center")).toBe("items-center");
    expect(toTailwindSelector("my_custom_class")).toBe("my_custom_class");
  });

  it("should escape colons in responsive classes", () => {
    expect(toTailwindSelector("md:flex")).toBe("md\\:flex");
    expect(toTailwindSelector("lg:hidden")).toBe("lg\\:hidden");
  });

  it("should escape brackets in arbitrary values", () => {
    expect(toTailwindSelector("w-[100px]")).toBe("w-\\[100px\\]");
    expect(toTailwindSelector("bg-[#fff]")).toBe("bg-\\[\\#fff\\]");
  });

  it("should escape slashes in opacity modifiers", () => {
    expect(toTailwindSelector("bg-black/50")).toBe("bg-black\\/50");
  });

  it("should handle complex class names with multiple special characters", () => {
    expect(toTailwindSelector("hover:bg-blue-500/50")).toBe(
      "hover\\:bg-blue-500\\/50",
    );
    expect(toTailwindSelector("md:w-[calc(100%-2rem)]")).toBe(
      "md\\:w-\\[calc\\(100\\%-2rem\\)\\]",
    );
  });

  it("should escape parentheses and percent signs", () => {
    expect(toTailwindSelector("calc(100%)")).toBe("calc\\(100\\%\\)");
  });
});
