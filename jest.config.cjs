/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: {
        module: "commonjs",
        moduleResolution: "node",
        esModuleInterop: true,
        strict: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ["jest", "node"],
        skipLibCheck: true,
      },
    }],
  },
};
