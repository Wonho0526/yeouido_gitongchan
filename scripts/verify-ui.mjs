import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "./serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOT_DIR = path.join(ROOT, ".screenshots");
const headed = process.argv.includes("--headed");

let failures = 0;
const check = (label, condition) => {
  console.log(`${condition ? "PASS" : "FAIL"} - ${label}`);
  if (!condition) failures += 1;
};

const { server, origin } = await startServer();
await fs.mkdir(SHOT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (msg) => msg.type() === "error" && pageErrors.push(msg.text()));

await page.goto(`${origin}/index.html`, { waitUntil: "networkidle" });

const trigger = page.getByRole("button", { name: "환자권리장전" });
await trigger.scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(SHOT_DIR, "01-footer.png") });

check("footer trigger button is visible", await trigger.isVisible());

const dialog = page.getByRole("dialog");
check("modal is closed initially", (await dialog.count()) === 0);

await trigger.click();
await dialog.waitFor({ state: "visible" });
await page.screenshot({ path: path.join(SHOT_DIR, "02-modal-open.png") });

check("modal title reads 환자 권리장전", (await dialog.getByRole("heading", { level: 2 }).textContent()) === "환자 권리장전");
check("rights list has 10 items", (await dialog.locator(".modal-list").nth(0).locator("li").count()) === 10);
check("responsibilities list has 7 items", (await dialog.locator(".modal-list").nth(1).locator("li").count()) === 7);
check(
  "lead paragraph is present",
  (await dialog.locator(".modal-lead").textContent()).includes("모든 환자는 인간으로서 존엄과 가치를 지니고")
);
check("background scroll is locked while open", await page.evaluate(() => document.body.classList.contains("modal-open")));

await dialog.locator(".modal-list").nth(1).locator("li").last().scrollIntoViewIfNeeded();
check("last responsibility item is reachable by scrolling", await dialog.locator(".modal-list").nth(1).locator("li").last().isVisible());
await page.screenshot({ path: path.join(SHOT_DIR, "03-modal-scrolled.png") });

await dialog.locator(".modal-dialog, .modal-body").first().click({ position: { x: 10, y: 10 } });
check("modal stays open when clicking inside", await dialog.isVisible());

const focusIsOnTrigger = () => trigger.evaluate((el) => el === document.activeElement);

await page.getByRole("button", { name: "닫기" }).click();
await dialog.waitFor({ state: "detached" });
check("closes via the × button", (await dialog.count()) === 0);
check("background scroll is restored", !(await page.evaluate(() => document.body.classList.contains("modal-open"))));
check("focus returns to the trigger after the × button", await focusIsOnTrigger());

await trigger.click();
await dialog.waitFor({ state: "visible" });
await page.keyboard.press("Escape");
await dialog.waitFor({ state: "detached" });
check("closes via the Escape key", (await dialog.count()) === 0);
check("focus returns to the trigger after Escape", await focusIsOnTrigger());

await trigger.click();
await dialog.waitFor({ state: "visible" });
await page.locator(".modal-overlay").click({ position: { x: 8, y: 8 } });
await dialog.waitFor({ state: "detached" });
check("closes by clicking the backdrop", (await dialog.count()) === 0);
check("focus returns to the trigger after a backdrop click", await focusIsOnTrigger());

await page.setViewportSize({ width: 390, height: 844 });
await trigger.scrollIntoViewIfNeeded();
await trigger.click();
await dialog.waitFor({ state: "visible" });
await page.screenshot({ path: path.join(SHOT_DIR, "04-modal-mobile.png") });
const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
check("no horizontal overflow on a 390px viewport", !overflows);

check(`no page errors (${pageErrors.join(" | ") || "none"})`, pageErrors.length === 0);

await browser.close();
server.close();

console.log(`\nScreenshots: ${SHOT_DIR}`);
console.log(failures ? `${failures} CHECK(S) FAILED` : "ALL CHECKS PASSED");
process.exit(failures ? 1 : 0);
