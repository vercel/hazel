import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^(.*)\\.js$": "$1",
  },
  testTimeout: 30000,
};

export default config;
