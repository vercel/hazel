import http from "http";
import dotenv from "dotenv";
import { listen } from "async-listen";

import carrots from "./index.js";

dotenv.config();

let server: http.Server;
let address: URL;
let currentVersion: string;

beforeAll(async () => {
  const listener = await carrots({
    account: "vercel",
    repository: "hyper",
    token: process.env.TOKEN,
  });
  server = http.createServer(listener);
  address = await listen(server);
  const response = await fetch(`${address}api/semver`);
  const data = await response.json();
  currentVersion = data.version.replace("v", "");
});

afterAll(() => {
  server.close();
});

describe("api", () => {
  it("should give semver", async () => {
    const res = await fetch(`${address}api/semver`);
    expect(res.status).toEqual(200);
    const data = await res.json();
    expect(data.version).toMatch(/\d+\.\d+\.\d+/);
  });
});

describe("html", () => {
  it("should give html for root", async () => {
    const res = await fetch(`${address}`);
    expect(res.status).toEqual(200);
    const text = await res.text();
    expect(text).toContain('<div id="wrap">');
  });

  it("should throw 404 for favicon", async () => {
    const res = await fetch(`${address}favicon.ico`);
    expect(res.status).toEqual(404);
  });

  it("should throw 404 for robots.txt", async () => {
    const res = await fetch(`${address}robots.txt`);
    expect(res.status).toEqual(404);
  });

  it("should throw 404 for wp-login.php", async () => {
    const res = await fetch(`${address}wp-login.php`);
    expect(res.status).toEqual(404);
  });
});

describe("download", () => {
  it("should give download for appimage", async () => {
    const res = await fetch(`${address}download/appimage`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Hyper-${currentVersion}.AppImage`
    );
  });

  it("should give download for appimage_arm64", async () => {
    const res = await fetch(`${address}download/appimage_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Hyper-${currentVersion}-arm64.AppImage`
    );
  });

  it("should give download for dmg", async () => {
    const res = await fetch(`${address}download/dmg`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Hyper-${currentVersion}-mac-x64.dmg`
    );
  });

  it("should give download for dmg_arm64", async () => {
    const res = await fetch(`${address}download/dmg_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Hyper-${currentVersion}-mac-arm64.dmg`
    );
  });

  it("should give download for rpm", async () => {
    const res = await fetch(`${address}download/rpm`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=hyper-${currentVersion}.x86_64.rpm`
    );
  });

  it("should give download for rpm_arm64", async () => {
    const res = await fetch(`${address}download/rpm_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=hyper-${currentVersion}.aarch64.rpm`
    );
  });

  it("should give download for deb", async () => {
    const res = await fetch(`${address}download/deb`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=hyper_${currentVersion}_amd64.deb`
    );
  });

  it("should give download for deb_arm64", async () => {
    const res = await fetch(`${address}download/deb_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=hyper_${currentVersion}_arm64.deb`
    );
  });

  it("should give download for exe", async () => {
    const res = await fetch(`${address}download/exe`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Hyper-Setup-${currentVersion}.exe`
    );
  });

  // it("should give download for snap", async () => {
  //   const res = await fetch(`${address}download/snap`);
  //   expect(res.status).toEqual(200);
  //   expect(res.headers.get("content-disposition")).toBe(
  //     `attachment; filename=hyper_${currentVersion}_amd64.snap`
  //   );
  // });
});

describe("update", () => {
  it("should give update for an old version of mac arm", async () => {
    const res = await fetch(`${address}update/darwin_arm64/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8"
    );
    const data = await res.json();
    expect(data).toEqual({
      name: "v3.4.1",
      notes:
        "V3.4.1\r\n\r\nBased on some reports of errors with `node-pty`, reverting it to a stable version.\r\n\r\n|   OS    | Installer |                                                                                                 |                                                                                                  |\r\n| :-----: | :-------: | :---------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------: |\r\n|   Mac   |    dmg    | [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1-mac-x64.dmg) (Intel) | [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1-mac-arm64.dmg) (M1) |\r\n|  Linux  |    deb    |      [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper_3.4.1_amd64.deb)      |     [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper_3.4.1_arm64.deb)      |\r\n|         |    rpm    |     [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper-3.4.1.x86_64.rpm)      |    [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper-3.4.1.aarch64.rpm)     |\r\n|         | AppImage  |      [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1.AppImage)       |   [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1-arm64.AppImage)   |\r\n|         |   snap    |     [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper_3.4.1_amd64.snap)      |                                                                                                  |\r\n| Windows |    exe    |      [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-Setup-3.4.1.exe)      |                                                                                                  |\r\n\r\n\r\n## What's Changed\r\n* Use stable node-pty in https://github.com/vercel/hyper/pull/6964\r\n\r\n\r\n**Full Changelog**: https://github.com/vercel/hyper/compare/v3.4.0...v3.4.1",
      pub_date: "2023-01-08T00:56:10Z",
      url: "http://localhost:3000/download/darwin_arm64?update=true",
    });
  });

  it("should give update for an old version mac x64", async () => {
    const res = await fetch(`${address}update/darwin/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8"
    );
    const data = await res.json();
    expect(data).toEqual({
      name: "v3.4.1",
      notes:
        "V3.4.1\r\n\r\nBased on some reports of errors with `node-pty`, reverting it to a stable version.\r\n\r\n|   OS    | Installer |                                                                                                 |                                                                                                  |\r\n| :-----: | :-------: | :---------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------------------: |\r\n|   Mac   |    dmg    | [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1-mac-x64.dmg) (Intel) | [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1-mac-arm64.dmg) (M1) |\r\n|  Linux  |    deb    |      [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper_3.4.1_amd64.deb)      |     [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper_3.4.1_arm64.deb)      |\r\n|         |    rpm    |     [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper-3.4.1.x86_64.rpm)      |    [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper-3.4.1.aarch64.rpm)     |\r\n|         | AppImage  |      [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1.AppImage)       |   [arm64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-3.4.1-arm64.AppImage)   |\r\n|         |   snap    |     [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/hyper_3.4.1_amd64.snap)      |                                                                                                  |\r\n| Windows |    exe    |      [x64](https://github.com/vercel/hyper/releases/download/v3.4.1/Hyper-Setup-3.4.1.exe)      |                                                                                                  |\r\n\r\n\r\n## What's Changed\r\n* Use stable node-pty in https://github.com/vercel/hyper/pull/6964\r\n\r\n\r\n**Full Changelog**: https://github.com/vercel/hyper/compare/v3.4.0...v3.4.1",
      pub_date: "2023-01-08T00:56:10Z",
      url: "http://localhost:3000/download/darwin?update=true",
    });
  });
});

describe("latest", () => {
  it("should not give update for up-to-date mac arm", async () => {
    const res = await fetch(`${address}update/darwin_arm64/${currentVersion}`);
    expect(res.status).toEqual(204);
  });

  it("should give update for up-to-date mac x64", async () => {
    const res = await fetch(`${address}update/darwin/${currentVersion}`);
    expect(res.status).toEqual(204);
  });
});
