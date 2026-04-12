import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        diagnostics: false,
      },
    ],
  },
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/lib/**/*.test.ts", "<rootDir>/tests/api/**/*.test.ts", "<rootDir>/tests/middleware/**/*.test.ts", "<rootDir>/tests/hooks/**/*.test.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.json", diagnostics: false },
        ],
      },
    },
    {
      displayName: "components",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/tests/components/**/*.test.tsx"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: "tsconfig.json", diagnostics: false },
        ],
      },
      setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    },
  ],
};

export default config;
