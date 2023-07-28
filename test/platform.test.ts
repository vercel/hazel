import { checkPlatform } from "../src/lib/platform.js";

describe("platform", () => {
  it("should parse mac", () => {
    const result = checkPlatform("hyper-2.1.1-mac.zip");
    expect(result).toBe("darwin");
  });

  it("should parse other platforms", () => {
    const result = checkPlatform("hyper_2.1.1_amd64.deb");
    expect(result).toBe("deb");
  });

  it("should parse dmg", () => {
    const result = checkPlatform("hyper-2.1.1.dmg");
    expect(result).toBe("dmg");
  });

  it("should get the whole shebang", () => {
    const shebang = [
      "Hyper-4.0.0-canary.5-aarch64.pacman",
      "Hyper-4.0.0-canary.5-aarch64.rpm",
      "Hyper-4.0.0-canary.5-amd64.deb",
      "Hyper-4.0.0-canary.5-amd64.snap",
      "Hyper-4.0.0-canary.5-arm64.AppImage",
      "Hyper-4.0.0-canary.5-arm64.deb",
      "Hyper-4.0.0-canary.5-arm64.exe",
      "Hyper-4.0.0-canary.5-armv7l.AppImage",
      "Hyper-4.0.0-canary.5-armv7l.deb",
      "Hyper-4.0.0-canary.5-armv7l.pacman",
      "Hyper-4.0.0-canary.5-armv7l.rpm",
      "Hyper-4.0.0-canary.5-mac-arm64.dmg",
      "Hyper-4.0.0-canary.5-mac-arm64.zip",
      "Hyper-4.0.0-canary.5-mac-x64.dmg",
      "Hyper-4.0.0-canary.5-mac-x64.zip",
      "Hyper-4.0.0-canary.5-x64.exe",
      "Hyper-4.0.0-canary.5-x64.pacman",
      "Hyper-4.0.0-canary.5-x86_64.AppImage",
      "Hyper-4.0.0-canary.5-x86_64.rpm",
    ];
    const results: (string | false)[] = [];
    for (const file of shebang) {
      results.push(checkPlatform(file));
    }
    console.log(JSON.stringify(results));
    expect(results).toEqual([
      false, // "pacman_arm64",
      "rpm_arm64",
      "deb",
      false, // "snap",
      "AppImage_arm64",
      "deb_arm64",
      "exe_arm64",
      "AppImage", // "AppImage_arm7l",
      "deb", // "deb_arm7l",
      false, // "pacman_arm7l",
      "rpm", // "rpm_arm7l",
      "dmg_arm64",
      "darwin_arm64", // "zip_arm64",
      "dmg",
      "darwin", // "zip",
      "exe",
      false, // "pacman",
      "AppImage",
      "rpm",
    ]);
  });

  it("should return false for unknown files", () => {
    const result = checkPlatform("hi.txt");
    expect(result).toBe(false);
  });
});
