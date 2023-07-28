import dotenv from "dotenv";
import type { RequestHandler } from "micro";

import { createHazel } from "./index.js";

dotenv.config();

export const hazel: RequestHandler = createHazel({
  interval: process.env.INTERVAL,
  account: process.env.ACCOUNT,
  repository: process.env.REPOSITORY,
  pre: process.env.PRE,
  token: process.env.TOKEN,
  url: process.env.VERCEL_URL || process.env.PRIVATE_BASE_URL,
});
