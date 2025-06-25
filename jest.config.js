export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  restoreMocks: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
