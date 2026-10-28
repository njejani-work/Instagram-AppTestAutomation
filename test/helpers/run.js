// test/helpers/run.js
// One ID per test run ("iteration"). The launcher creates it; worker processes inherit it
// through the environment, so every spec of the same run writes into the same folder.
//
//   reports/runs/<RUN_ID>/            one folder per run
//   reports/dashboard/index.html      dashboard over all kept runs

import path from 'node:path';

if (!process.env.RUN_ID) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  process.env.RUN_ID = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

export const RUN_ID = process.env.RUN_ID;
export const REPORTS_DIR = path.resolve('reports');
export const RUNS_DIR = path.join(REPORTS_DIR, 'runs');
export const RUN_DIR = path.join(RUNS_DIR, RUN_ID);
export const DASHBOARD_DIR = path.join(REPORTS_DIR, 'dashboard');

/** Path relative to reports/, always with forward slashes (works on Windows too). */
export const relToReports = (p) => path.relative(REPORTS_DIR, p).split(path.sep).join('/');