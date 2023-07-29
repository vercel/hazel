// This file is used for Vercel to deploy the API
import { hazel } from "../lib/index.js";

export default hazel({
  interval: process.env.INTERVAL,
  account: process.env.ACCOUNT,
  repository: process.env.REPOSITORY,
  pre: process.env.PRE,
  token: process.env.TOKEN,
  url: process.env.VERCEL_URL || process.env.URL,
});
