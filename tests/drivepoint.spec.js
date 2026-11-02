import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const viewportMatrix = [320, 375, 390, 430, 768, 1024, 1440, 1920];
const mobileWidths = [320, 375, 390, 430];
const localBaseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4178/drivepoint/';
const screenshotDir = path.resolve('test-artifacts', 'screenshots');

fs.mkdirSync(screenshotDir, { recursive: true });

test.afterAll(() => {
  if (process.platform !== 'win32') return;

  try {
    const netstat = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' });
    const match = netstat.match(/TCP\s+127\.0\.0\.1:4178\s+\S+\s+LISTENING\s+(\d+)/i);
    if (match) {
      execFileSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Stop-Process -Id ${match[1]} -Force -ErrorAction SilentlyContinue`,
      ], { stdio: 'ignore' });
    }
  } catch {
    // The server may already be stopped by Playwright.
  }
});

const localResourceAudit = (page, baseURL) => {
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (text.startsWith('Failed to load resource:') && !text.includes(baseURL)) return;
    pageErrors.push(text);
  });
  page.on('requestfailed', (request) => {
    if (request.url().startsWith(baseURL)) {
      failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText || 'failed'}`);
    }
  });
  page.on('response', (response) => {
    if (response.url().startsWith(baseURL) && response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  return { pageErrors, failedRequests, badResponses };
};

const openPage = async (page, width, height = 900) => {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const audit = localResourceAudit(page, localBaseURL);
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  return audit;
};

const assertNoHorizontalOverflow = async (page, width) => {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.viewport).toBe(width);
  expect(Math.max(metrics.documentWidth, metrics.bodyWidth)).toBeLessThanOrEqual(width);
};

const assertLocalHeroImage = async (page) => {
  const heroImage = page.locator('.hero__image-wrap img');
  await expect(heroImage).toBeVisible();
  await expect.poll(() => heroImage.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);

  const imageMetrics = await heroImage.evaluate((image) => ({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    complete: image.complete,
    rect: image.getBoundingClientRect().toJSON(),
  }));
  expect(imageMetrics.complete).toBe(true);
  expect(imageMetrics.rect.width).toBeGreaterThan(0);
  expect(imageMetrics.rect.height).toBeGreaterThan(0);
  expect(imageMetrics.naturalWidth).toBeGreaterThan(0);
};

test.describe('responsive viewport matrix', () => {
  for (const width of viewportMatrix) {
    test(`renders without overflow at ${width}px`, async ({ page }) => {
      const audit = await openPage(page, width);

      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('.hero h1')).toBeVisible();
      await expect(page.locator('.hero__buttons a').first()).toBeVisible();
      await expect(page.locator('#services')).toBeAttached();
      await expect(page.locator('#contacts')).toBeAttached();
      await assertNoHorizontalOverflow(page, width);
      await assertLocalHeroImage(page);

      await page.screenshot({
        path: path.join(screenshotDir, `drivepoint-${width}.png`),
        fullPage: true,
      });

      expect(audit.pageErrors, `page errors at ${width}px`).toEqual([]);
      expect(audit.failedRequests, `failed local requests at ${width}px`).toEqual([]);
      expect(audit.badResponses, `bad local responses at ${width}px`).toEqual([]);
    });
  }
});

test.describe('mobile Hero geometry', () => {
  for (const width of mobileWidths) {
    test(`engine photo and decorations are stable at ${width}px`, async ({ page }) => {
      await openPage(page, width, 900);
      await assertNoHorizontalOverflow(page, width);
      await assertLocalHeroImage(page);

      const metrics = await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const content = document.querySelector('.hero__content');
        const visual = document.querySelector('.hero__visual');
        const imageWrap = document.querySelector('.hero__image-wrap');
        const stamp = document.querySelector('.hero__stamp');
        const scroll = document.querySelector('.hero__scroll');
        const rect = (element) => element?.getBoundingClientRect().toJSON() ?? null;
        return {
          hero: rect(hero),
          content: rect(content),
          visual: rect(visual),
          imageWrap: rect(imageWrap),
          stamp: rect(stamp),
          scroll: rect(scroll),
          scrollDisplay: scroll ? getComputedStyle(scroll).display : 'missing',
          imagePosition: imageWrap ? getComputedStyle(imageWrap).position : 'missing',
          visualPosition: visual ? getComputedStyle(visual).position : 'missing',
        };
      });

      expect(metrics.visual).not.toBeNull();
      expect(metrics.imageWrap).not.toBeNull();
      expect(metrics.imageWrap.y).toBeGreaterThanOrEqual(metrics.content.y + metrics.content.height - 1);
      expect(metrics.visual.height).toBeGreaterThan(metrics.imageWrap.height - 1);
      expect(metrics.imagePosition).toBe('relative');
      expect(metrics.visualPosition).toBe('relative');
      expect(metrics.imageWrap.width).toBeGreaterThan(0);
      expect(metrics.imageWrap.height).toBeGreaterThan(0);
      expect(metrics.hero.height).toBeLessThan(1_300);

      expect(metrics.stamp.left).toBeGreaterThanOrEqual(metrics.imageWrap.left - 1);
      expect(metrics.stamp.top).toBeGreaterThanOrEqual(metrics.imageWrap.top - 1);
      expect(metrics.stamp.right).toBeLessThanOrEqual(metrics.imageWrap.right + 1);
      expect(metrics.stamp.bottom).toBeLessThanOrEqual(metrics.imageWrap.bottom + 1);

      if (width <= 360) {
        expect(metrics.scrollDisplay).toBe('none');
      } else {
        expect(metrics.scroll).not.toBeNull();
        expect(metrics.scroll.y).toBeGreaterThanOrEqual(metrics.imageWrap.bottom - 1);
        expect(metrics.scroll.y).toBeLessThan(metrics.hero.bottom);
      }
    });
  }
});

test('mobile menu opens, closes, supports Escape and navigates', async ({ page }) => {
  await openPage(page, 390);
  const toggle = page.locator('.menu-toggle');
  const menu = page.locator('#mobile-menu');

  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toHaveAttribute('aria-hidden', 'false');
  await expect(menu).toHaveClass(/is-open/);

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toHaveAttribute('aria-hidden', 'true');
  await expect(toggle).toBeFocused();

  await toggle.click();
  await menu.locator('a[href="#services"]').click();
  await expect(page.locator('#services')).toBeInViewport();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('CTA links, navigation links, tel links and FAQ work', async ({ page }) => {
  await openPage(page, 1440);

  for (const href of ['#services', '#prices', '#about', '#contacts']) {
    await page.locator(`.desktop-nav a[href="${href}"]`).click();
    await expect(page.locator(href)).toBeInViewport();
  }

  await page.locator('.hero__buttons a[href="#services"]').click();
  await expect(page.locator('#services')).toBeInViewport();
  await page.locator('.hero__buttons a[href="#contacts"]').click();
  await expect(page.locator('#contacts')).toBeInViewport();
  await page.locator('.service-row').first().click();
  await expect(page.locator('#contacts')).toBeInViewport();

  const telLinks = page.locator('a[href^="tel:"]');
  await expect(telLinks).toHaveCount(4);
  for (let index = 0; index < await telLinks.count(); index += 1) {
    await expect(telLinks.nth(index)).toHaveAttribute('href', 'tel:+78005550120');
  }

  const faqItems = page.locator('.accordion-item');
  const firstQuestion = faqItems.nth(0).locator('button');
  const secondQuestion = faqItems.nth(1).locator('button');
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
  await secondQuestion.click();
  await expect(secondQuestion).toHaveAttribute('aria-expanded', 'true');
  await expect(faqItems.nth(1).locator('.accordion-answer')).toBeVisible();
  await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  await expect(faqItems.nth(0).locator('.accordion-answer')).toBeHidden();
  await secondQuestion.click();
  await expect(secondQuestion).toHaveAttribute('aria-expanded', 'false');
  await expect(faqItems.nth(1).locator('.accordion-answer')).toBeHidden();
});
