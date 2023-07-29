// This file is used for Vercel to deploy the API

import dotenv from "dotenv";

import { hazel } from "../lib/index.js";

dotenv.config();

export default hazel({
  interval: process.env.INTERVAL,
  account: process.env.ACCOUNT,
  repository: process.env.REPOSITORY,
  pre: process.env.PRE,
  token: process.env.TOKEN,
  url: process.env.VERCEL_URL || process.env.PRIVATE_BASE_URL,
});
