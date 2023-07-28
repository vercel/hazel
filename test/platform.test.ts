import platform from "../src/lib/platform.js";

describe("platform", () => {
  it("should parse mac", () => {
    const result = platform("hyper-2.1.1-mac.zip");
    expect(result).toBe("darwin");
  });

  it("should parse other platforms", () => {
    const result = platform("hyper_2.1.1_amd64.deb");
    expect(result).toBe("deb");
  });

  it("should parse dmg", () => {
    const result = platform("hyper-2.1.1.dmg");
    expect(result).toBe("dmg");
  });

  it("should return false for unknown files", () => {
    const result = platform("hi.txt");
    expect(result).toBe(false);
  });
});
