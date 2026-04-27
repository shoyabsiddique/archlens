import { describe, expect, it } from "vitest";

import { createDefaultConfig } from "../../../src/shared/config.js";

describe("createDefaultConfig", () => {
  it("returns the documented defaults", () => {
    const config = createDefaultConfig();

    expect(config.llm.provider).toBe("ollama");
    expect(config.llm.model).toBe("llama3.2");
    expect(config.adr.output_dir).toBe("docs/decisions");
    expect(config.detection.watch_paths).toContain("src");
  });
});
