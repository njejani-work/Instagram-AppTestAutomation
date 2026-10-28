// test/data/users.js – template for the receiving team.
// Values come from .env (see .env.example). Nothing secret is stored in this file.

const need = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing ${key} – copy .env.example to .env and fill it in`);
  return v;
};

export const users = {
  valid: {
    username: need('IG_VALID_USERNAME'),
    password: need('IG_VALID_PASSWORD'),
  },
  invalid: {
    username: process.env.IG_INVALID_USERNAME ?? 'not_a_real_user_9z8y7x',
    password: process.env.IG_INVALID_PASSWORD ?? 'wrong-password',
  },
};
