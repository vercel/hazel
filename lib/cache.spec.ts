import { CarrotCache } from "./cache.js";

describe("cache", () => {
  it("should throw when account is not defined", () => {
    expect(() => {
      const config = { repository: "hyper" };
      new CarrotCache(config);
    }).toThrow(/ACCOUNT/);
  });

  it("should throw when repository is not defined", () => {
    expect(() => {
      const config = { account: "vercel" };
      new CarrotCache(config);
    }).toThrow(/REPOSITORY/);
  });

  it("should throw when token is defined and url is not", () => {
    expect(() => {
      const config = { account: "vercel", repository: "hyper", token: "abc" };
      new CarrotCache(config);
    }).toThrow(/URL/);
  });

  it("should refresh the cache", async () => {
    const config = {
      account: "vercel",
      repository: "hyper",
    };

    const cache = new CarrotCache(config);
    const storage = await cache.loadCache();

    expect(typeof storage.version).toBe("string");
    expect(typeof storage.platforms).toBe("object");
  });
});
