import { createServer } from "http";
import { serve } from "micro";
import listen from "test-listen";

import { hazel } from "./server.js";

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

    const server = createServer(serve(hazel));
    await listen(server);
    server.close();
  });
});
