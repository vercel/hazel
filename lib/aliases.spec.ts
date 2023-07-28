import { resolvePlatform } from "./aliases.js";

describe("aliases", () => {
  it("should return the correct platform", () => {
    const result = resolvePlatform("mac");
    expect(result).toBe("darwin");
  });

  it("should return the platform when the platform is provided", () => {
    const result = resolvePlatform("darwin");
    expect(result).toBe("darwin");
  });

  it("should return null if no platform is found", () => {
    const result = resolvePlatform("test");
    expect(result).toBe(null);
  });
});
