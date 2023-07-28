import { type Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^(.*)\\.js$": "$1",
  },
};

export default config;
