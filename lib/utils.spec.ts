import { guessPlatform as g, getPlatform as p } from "./utils.js";

it("should resolve filename to the right platform-arch", () => {
  expect(p("electron-fiddle_0.33.0_amd64.deb")).toBe("deb_x64");
  expect(p("electron-fiddle_0.33.0_arm64.deb")).toBe("deb_arm64");
  expect(p("electron-fiddle_0.33.0_armhf.deb")).toBe("deb_arm");
  expect(p("electron-fiddle-0.33.0-1.arm64.rpm")).toBe("rpm_arm64");
  expect(p("electron-fiddle-0.33.0-1.armv7hl.rpm")).toBe("rpm_arm");
  expect(p("electron-fiddle-0.33.0-1.x86_64.rpm")).toBe("rpm_x64");
  expect(p("electron-fiddle-0.33.0-full.nupkg")).toBe("nupkg_universal");
  expect(p("electron-fiddle-0.33.0-win32-ia32-setup.exe")).toBe("exe_ia32");
  expect(p("electron-fiddle-0.33.0-win32-x64-setup.exe")).toBe("exe_x64");
  expect(p("Electron.Fiddle-0.33.0-arm64.AppImage")).toBe("appimage_arm64");
  expect(p("horse_0.57.4_amd64.deb")).toBe("deb_x64");
  expect(p("horse_0.57.4_arm64.deb")).toBe("deb_arm64");
  expect(p("horse_0.57.4_armhf.deb")).toBe("deb_arm");
  expect(p("horse-0.57.4-1.arm64.rpm")).toBe("rpm_arm64");
  expect(p("horse-0.57.4-1.armv7hl.rpm")).toBe("rpm_arm");
  expect(p("horse-0.57.4-1.x86_64.rpm")).toBe("rpm_x64");
  expect(p("horse-0.57.4-full.nupkg")).toBe("nupkg_universal");
  expect(p("horse-0.57.4-win32-ia32-setup.exe")).toBe("exe_ia32");
  expect(p("horse-0.57.4-win32-x64-setup.exe")).toBe("exe_x64");
  expect(p("Horse-darwin-arm64-0.57.4.zip")).toBe("zip_arm64");
  expect(p("Horse-darwin-x64-0.57.4.zip")).toBe("zip_x64");
  expect(p("Hyper-4.0.0-canary.5-aarch64.pacman")).toBe("pacman_arm64");
  expect(p("Hyper-4.0.0-canary.5-aarch64.rpm")).toBe("rpm_arm64");
  expect(p("Hyper-4.0.0-canary.5-amd64.deb")).toBe("deb_x64");
  expect(p("Hyper-4.0.0-canary.5-amd64.snap")).toBe("snap_x64");
  expect(p("Hyper-4.0.0-canary.5-arm64.AppImage")).toBe("appimage_arm64");
  expect(p("Hyper-4.0.0-canary.5-arm64.deb")).toBe("deb_arm64");
  expect(p("Hyper-4.0.0-canary.5-arm64.exe")).toBe("exe_arm64");
  expect(p("Hyper-4.0.0-canary.5-armv7l.AppImage")).toBe("appimage_arm");
  expect(p("Hyper-4.0.0-canary.5-armv7l.deb")).toBe("deb_arm");
  expect(p("Hyper-4.0.0-canary.5-armv7l.pacman")).toBe("pacman_arm");
  expect(p("Hyper-4.0.0-canary.5-armv7l.rpm")).toBe("rpm_arm");
  expect(p("Hyper-4.0.0-canary.5-mac-arm64.dmg")).toBe("dmg_arm64");
  expect(p("Hyper-4.0.0-canary.5-mac-arm64.zip")).toBe("zip_arm64");
  expect(p("Hyper-4.0.0-canary.5-mac-x64.dmg")).toBe("dmg_x64");
  expect(p("Hyper-4.0.0-canary.5-mac-x64.zip")).toBe("zip_x64");
  expect(p("Hyper-4.0.0-canary.5-x64.exe")).toBe("exe_x64");
  expect(p("Hyper-4.0.0-canary.5-x64.pacman")).toBe("pacman_x64");
  expect(p("Hyper-4.0.0-canary.5-x86_64.AppImage")).toBe("appimage_x64");
  expect(p("Hyper-4.0.0-canary.5-x86_64.rpm")).toBe("rpm_x64");
  expect(p("README.md")).toBe(false);
  expect(p("RELEASES")).toBe(false);
  expect(p("RELEASES-ia32")).toBe(false);
  expect(p("Windows10.0-KB4567512-x64.cab")).toBe(false);
  expect(p("")).toBe(false);
  expect(p("*")).toBe(false);
});

it("should try to guess the correct platform", () => {
  // Official Electron recommendations
  expect(g("darwin")).toBe("dmg_x64");
  expect(g("darwin-x64")).toBe("dmg_x64");
  expect(g("darwin-arm64")).toBe("dmg_arm64");

  expect(g("darwin", true)).toBe("zip_x64");
  expect(g("darwin-x64", true)).toBe("zip_x64");
  expect(g("darwin-arm64", true)).toBe("zip_arm64");

  expect(g("win32")).toBe("exe_x64");
  expect(g("win32-x64")).toBe("exe_x64");
  expect(g("win32-ia32")).toBe("exe_ia32");
  expect(g("win32-arm64")).toBe("exe_arm64");

  expect(g("win32", true)).toBe("nupkg_universal");
  expect(g("win32-x64", true)).toBe("nupkg_universal");
  expect(g("win32-ia32", true)).toBe("nupkg_universal");
  expect(g("win32-arm64", true)).toBe("nupkg_universal");

  // Common aliases
  expect(g("mac")).toBe("dmg_x64");
  expect(g("mac", true)).toBe("zip_x64");
  expect(g("macos_arm64")).toBe("dmg_arm64");
  expect(g("macos_arm64", true)).toBe("zip_arm64");
  expect(g("darwin")).toBe("dmg_x64");
  expect(g("win")).toBe("exe_x64");
  expect(g("win", true)).toBe("nupkg_universal");
  expect(g("windows_arm64")).toBe("exe_arm64");
  expect(g("raspberry")).toBe(false);
  expect(g("test")).toBe(false);
});
