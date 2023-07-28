import dotenv from "dotenv";

import hazel from "./index.js";

dotenv.config();

const {
  INTERVAL: interval,
  ACCOUNT: account,
  REPOSITORY: repository,
  PRE: pre,
  TOKEN: token,
  URL: PRIVATE_BASE_URL,
  VERCEL_URL,
}: {
  [key: string]: string | undefined;
} = process.env;

const url = VERCEL_URL || PRIVATE_BASE_URL;

const server = hazel({
  interval,
  account,
  repository,
  pre,
  token,
  url,
});

export default server;
