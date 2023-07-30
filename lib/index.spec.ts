import { Server, createServer } from "http";
import { serve } from "micro";
import { listen } from "async-listen";

import { carrots } from "./index.js";

const UA_MACINTOSH =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.3 Safari/605.1.15";
const UA_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36";
const UA_UBUNTU =
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:15.0) Gecko/20100101 Firefox/15.0.1";
const VALID_VERSION = "3.3.0";
const INVALID_VERSION = "does-not-exist";

let server: Server;
let address: URL;

beforeAll(async () => {
  server = createServer(
    serve(carrots({ account: "vercel", repository: "hyper" })),
  );
  address = await listen(server);
});

afterAll(() => {
  server.close();
});

describe("server", () => {
  it("should start without errors", async () => {
    expect(address).toBeDefined();
  });

  it("should show the homepage", async () => {
    const res = await fetch(`${address}/`);

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeNull();

    const text = await res.text();
    expect(text).toContain("<title>vercel/hyper</title>");
  });

  it("should not allow download without a user agent", async () => {
    const res = await fetch(`${address}/download`);

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeNull();

    const text = await res.text();
    expect(text).toContain("No download available for your platform!");
  });

  it("should not allow linux download based on user agent", async () => {
    const res = await fetch(`${address}/download`, {
      headers: { "User-Agent": UA_UBUNTU },
    });

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeNull();

    const text = await res.text();
    expect(text).toContain("No download available for your platform!");
  });

  it("should allow mac download based on user agent", async () => {
    const res = await fetch(`${address}/download`, {
      headers: { "User-Agent": UA_MACINTOSH },
    });

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeDefined();

    const filename = disp ? disp.split("=")[1] : "";
    expect(filename).toContain(".dmg");
  });

  it("should allow windows download based on user agent", async () => {
    const res = await fetch(`${address}/download`, {
      headers: { "User-Agent": UA_WINDOWS },
    });

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeDefined();

    const filename = disp ? disp.split("=")[1] : "";
    expect(filename).toContain(".exe");
  });

  it("should allow deb download", async () => {
    const res = await fetch(`${address}/download/deb`);

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeDefined();

    const filename = disp ? disp.split("=")[1] : "";
    expect(filename).toContain(".deb");
  });

  it("should provide updates for valid version", async () => {
    const res = await fetch(`${address}/update/darwin/${VALID_VERSION}`);

    const disp = res.headers.get("content-disposition");
    expect(disp).toBeDefined();

    const text = await res.text();
    expect(text).toContain('"notes":');
  });

  it("should not provide updates for invalid version", async () => {
    const res = await fetch(`${address}/update/darwin/${INVALID_VERSION}`);

    const status = res.status;
    expect(status).toBe(500);
  });

  it("should not provide updates for invalid platform", async () => {
    const res = await fetch(`${address}/update/x/${VALID_VERSION}`);

    const status = res.status;
    expect(status).toBe(500);
  });

  it("should return RELEASES for valid version", async () => {
    const res = await fetch(
      `${address}/update/win32/${VALID_VERSION}/RELEASES`,
    );

    // No RELEASES found
    const status = res.status;
    expect(status).toBe(204);

    // RELEASES found returns stream
    // const status = res.status;
    // expect(status).toBe(200);
    // const type = res.headers.get("content-type");
    // expect(type).toBe("application/octet-stream");
  });

  it("should return 404 for non-existent route", async () => {
    const res = await fetch(`${address}/non-existent-route`);

    const status = res.status;
    expect(status).toBe(404);
  });
});
