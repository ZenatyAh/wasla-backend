import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openApiSpec } from "./openapi.js";

const collectRefs = (value: unknown, refs = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRefs(item, refs);
    }
    return refs;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key === "$ref" && typeof nested === "string") {
        refs.add(nested);
      } else {
        collectRefs(nested, refs);
      }
    }
  }

  return refs;
};

const resolveRef = (ref: string): boolean => {
  if (!ref.startsWith("#/")) {
    return false;
  }

  const parts = ref.slice(2).split("/");
  let current: unknown = openApiSpec;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current !== undefined;
};

describe("OpenAPI spec", () => {
  it("resolves all internal $ref targets", () => {
    const refs = collectRefs(openApiSpec);
    const missing = [...refs].filter((ref) => !resolveRef(ref));

    assert.deepEqual(
      missing,
      [],
      `Unresolved OpenAPI refs: ${missing.join(", ")}`,
    );
  });

  it("does not expose a fake /realtime/chat HTTP route", () => {
    assert.equal("/realtime/chat" in openApiSpec.paths, false);
  });

  it("documents feed and internal export routes", () => {
    assert.ok("/feed/{userId}" in openApiSpec.paths);
    assert.ok("/internal/recommender-export" in openApiSpec.paths);
  });

  it("documents skills routes", () => {
    assert.ok("/skills" in openApiSpec.paths);
    assert.ok("get" in openApiSpec.paths["/skills"]);
    assert.ok("post" in openApiSpec.paths["/skills"]);
  });
});
