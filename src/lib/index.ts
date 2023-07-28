import Router from "router";
import finalhandler from "finalhandler";
import type { IncomingMessage, ServerResponse } from "http";

import Cache, { CustomError } from "./cache.js";
import routes from "./routes.js";

const hazel = (config: {
  interval?: string;
  account?: string;
  repository?: string;
  pre?: string;
  token?: string;
  url?: string;
}): ((req: IncomingMessage, res: ServerResponse) => void) => {
  const router = new Router();
  let cache: Cache | null = null;

  try {
    cache = new Cache(config);
  } catch (err) {
    const { code, message } = err as CustomError;

    if (code) {
      return (req, res) => {
        res.statusCode = 400;

        res.end(
          JSON.stringify({
            error: {
              code,
              message,
            },
          }),
        );
      };
    }

    throw err;
  }

  const paths = routes({ cache, config });

  // Define a route for every relevant path
  router.get("/", paths.overview);
  router.get("/download", paths.download);
  router.get("/download/:platform", paths.downloadPlatform);
  router.get("/update/:platform/:version", paths.update);
  router.get("/update/win32/:version/:filename", paths.squirrelWindows);

  return (req, res) => {
    router(req, res, finalhandler(req, res));
  };
};

export default hazel;
