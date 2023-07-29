import { createServer } from "http";
import { serve } from "micro";
import listen from "test-listen";

import { hazel } from "./index.js";

describe("hazel", () => {
  it("should start hazel without errors", async () => {
    const config = { account: "vercel", repository: "hyper" };
    const server = createServer(serve(hazel(config)));
    await listen(server);
    server.close();
  });
});
