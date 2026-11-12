// One jest run with two environments:
//   - "server" tests run in node (they boot the Express app + in-memory Mongo)
//   - "client" tests run in jsdom (they exercise the browser-side api client)
// `npm test` runs both.
//
// `testRegex` is used instead of `testMatch` because jest's glob matching skips
// paths containing dot-directories (e.g. a checkout under `.gemini/` or `.cache/`),
// which silently finds zero tests.
module.exports = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testRegex: '[\\\\/]tests[\\\\/]server[\\\\/].*\\.test\\.js$',
      transform: {
        '^.+\\.js$': 'babel-jest'
      }
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testRegex: '[\\\\/]tests[\\\\/]client[\\\\/].*\\.test\\.js$',
      transform: {
        '^.+\\.js$': 'babel-jest'
      }
    }
  ]
};
