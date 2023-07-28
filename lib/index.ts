import type { IncomingMessage, ServerResponse } from "http";
import type { RequestHandler } from "micro";

import type { CustomError } from "./cache.js";
import { Cache } from "./cache.js";
import { generateRequestHandlers } from "./routes.js";

export type Config = {
  interval?: string;
  account?: string;
  repository?: string;
  pre?: string;
  token?: string;
  url?: string;
};

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  options: Record<string, string>,
) => unknown;

export const createHazel = (config: Config): RequestHandler => {
  let cache: Cache | null = null;
  try {
    cache = new Cache(config);
  } catch (err) {
    const { code, message } = err as CustomError;
    if (code) {
      return (req, res) => {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: { code, message } }));
      };
    } else {
      throw err;
    }
  }

  const { overview, download, downloadPlatform, update, squirrelWindows } =
    generateRequestHandlers({ cache, config });

  const middleware: RequestHandler = (req, res) => {
    try {
      const parsedUrl = new URL(req.url || "", config.url);
      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      const options: Record<string, string> = {};

      const routes: Record<string, RouteHandler> = {
        "/": overview,
        "/download": download,
        "/download/:platform": downloadPlatform,
        "/update/:platform/:version": update,
        "/update/win32/:version/:filename": squirrelWindows,
      };

      // Search for a matching route
      for (const pattern in routes) {
        const patternParts = pattern.split("/").filter(Boolean);

        // If parts length does not match, continue with the next pattern
        if (parts.length !== patternParts.length) continue;

        // Assume we have a match until proven otherwise
        let match = true;

        for (let i = 0; i < parts.length; i++) {
          if (patternParts[i].startsWith(":")) {
            // Capture the variable
            const option = patternParts[i].slice(1);
            options[option] = parts[i];
          } else if (parts[i] !== patternParts[i]) {
            // Literal parts of the pattern must be exactly equal to the part in the URL
            match = false;
            break;
          }
        }

        // If we found a match, run the handler and break the loop
        if (match) {
          routes[pattern](req, res, options);
          return;
        }
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: { code: 404, message: "Not Found" } }));
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          error: { code: 500, message: "Internal Server Error" },
        }),
      );
    }
  };

  return middleware;
};

export default createHazel;
