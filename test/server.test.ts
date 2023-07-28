import { createServer } from "http";
import { serve } from "micro";
import listen from "test-listen";

import run from "../src/lib/server.js";

const initialEnv: NodeJS.ProcessEnv = Object.assign({}, process.env);

afterEach(() => {
  process.env = initialEnv;
});

describe("Server", () => {
  it("Should start without errors", async () => {
    process.env = {
      ACCOUNT: "vercel",
      REPOSITORY: "hyper",
    };

    const server = createServer(serve(run));

    await listen(server);
    server.close();
  });
});
