module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/helpers/setup.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middlewares/**/*.js',
    'routes/**/*.js',
    'index.js',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
};
