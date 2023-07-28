import aliases from "../src/lib/aliases.js";

describe("aliases", () => {
  it("should return the correct platform", () => {
    const result = aliases("mac");
    expect(result).toBe("darwin");
  });

  it("should return the platform when the platform is provided", () => {
    const result = aliases("darwin");
    expect(result).toBe("darwin");
  });

  it("should return false if no platform is found", () => {
    const result = aliases("test");
    expect(result).toBe(null);
  });
});
