// Control only the child process's wall clock through an external test boundary.
import { readFileSync } from 'node:fs';
const systemNow = Date.now;
Date.now = () => {
  try { return Number(readFileSync(process.env.REVIEW_TEST_CLOCK, 'utf8')); }
  catch { return systemNow(); }
};
