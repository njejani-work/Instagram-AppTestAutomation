// test/data/users.js
// Test accounts. Set them in a .env file (see .env.example) or as environment variables.
// Passwords are masked in every log, report and dashboard entry.

export const users = {
  valid: {
    username: process.env.IG_VALID_USERNAME ?? '',
    password: process.env.IG_VALID_PASSWORD ?? '',
  },
  invalid: {
    username: process.env.IG_INVALID_USERNAME ?? 'djfksjfs',
    password: process.env.IG_INVALID_PASSWORD ?? 'sdfsfs',
  },
};