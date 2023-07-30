import { createServer } from "http";
import { serve } from "micro";
import listen from "test-listen";

import { carrots } from "./index.js";

describe("carrots", () => {
  it("should start carrots without errors", async () => {
    const config = { account: "vercel", repository: "hyper" };
    const server = createServer(serve(carrots(config)));
    await listen(server);
    server.close();
  });
});
