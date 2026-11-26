import {
  chromium,
  expect,
} from "../../../node_modules/@playwright/test/index.mjs";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:5199");
await expect(
  page.getByRole("button", { name: "Play walkthrough", exact: true }),
).toBeEnabled();

await page
  .getByRole("button", { name: "Play walkthrough", exact: true })
  .click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Pause", exact: true }).click();
const slider = page.getByRole("slider");
const paused = Number(await slider.inputValue());
await page.waitForTimeout(400);
expect(Number(await slider.inputValue())).toBeCloseTo(paused, 1);
await page
  .getByRole("button", { name: "05 Feedback belongs to an attempt" })
  .click();
await expect
  .poll(async () => Number(await slider.inputValue()))
  .toBeGreaterThanOrEqual(42);
await slider.fill("62.9");
await expect(
  page.getByRole("button", { name: "Replay", exact: true }),
).toBeVisible();
await page.getByRole("button", { name: "Replay", exact: true }).click();
await expect
  .poll(async () => Number(await slider.inputValue()))
  .toBeLessThan(2);
await page.getByRole("button", { name: "Pause", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
expect(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
).toBeTruthy();
await page.emulateMedia({ reducedMotion: "reduce" });
await page.reload();
await expect(
  page.getByRole("button", { name: "Play walkthrough", exact: true }),
).toBeEnabled();
expect(errors).toEqual([]);
console.log(
  "PASS: playback, pause, chapter seeking, replay, mobile width, reduced motion, no browser errors.",
);
await browser.close();
