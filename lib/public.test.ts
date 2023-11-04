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

  it("should give download for snap", async () => {
    const res = await fetch(`${address}download/snap`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=hyper_${currentVersion}_amd64.snap`
    );
  });
});

describe("update", () => {
  it("should give update for an old version of mac arm", async () => {
    const res = await fetch(`${address}update/darwin_arm64/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
  });

  it("should give update for an old version mac x64", async () => {
    const res = await fetch(`${address}update/darwin/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
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
