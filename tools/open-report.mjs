// tools/open-report.mjs – open the screenshot evidence report in the default browser
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'reports/screenshots/index.html');
if (!fs.existsSync(file)) {
  console.error(`No report at ${file} – run the tests first.`);
  process.exit(1);
}
const cmd = process.platform === 'win32' ? `start "" "${file}"`
  : process.platform === 'darwin' ? `open "${file}"` : `xdg-open "${file}"`;
exec(cmd);
console.log(`Opened ${file}`);