import { HazelCache } from "./cache.js";

describe("cache", () => {
  it("should throw when account is not defined", () => {
    expect(() => {
      const config = { repository: "hyper" };
      new HazelCache(config);
    }).toThrow(/ACCOUNT/);
  });

  it("should throw when repository is not defined", () => {
    expect(() => {
      const config = { account: "vercel" };
      new HazelCache(config);
    }).toThrow(/REPOSITORY/);
  });

  it("should throw when token is defined and url is not", () => {
    expect(() => {
      const config = { account: "vercel", repository: "hyper", token: "abc" };
      new HazelCache(config);
    }).toThrow(/URL/);
  });

  it("should run without errors", () => {
    const config = {
      account: "vercel",
      repository: "hyper",
      token: process.env.TOKEN,
      url: process.env.URL,
    };

    new HazelCache(config);
  });

  it("should refresh the cache", async () => {
    const config = {
      account: "vercel",
      repository: "hyper",
      token: process.env.TOKEN,
      url: process.env.URL,
    };

    const cache = new HazelCache(config);
    const storage = await cache.loadCache();

    expect(typeof storage.version).toBe("string");
    expect(typeof storage.platforms).toBe("object");
  });
});
