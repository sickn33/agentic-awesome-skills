#!/usr/bin/env node
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function takeScreenshots() {
    const dashboardPath = path.resolve(__dirname, '../autonomy/.loki/dashboard/index.html');
    const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');

    // Ensure screenshots directory exists
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1400, height: 900 });

    console.log('Loading dashboard...');
    await page.goto(`file://${dashboardPath}`, { waitUntil: 'networkidle0' });

    // Wait for content to render
    await page.waitForSelector('#agents-grid');
    await page.waitForSelector('#queue-columns');

    // Screenshot 1: Agents section
    console.log('Taking agents screenshot...');
    const agentsSection = await page.$('#agents-section');
    await agentsSection.screenshot({
        path: path.join(screenshotsDir, 'dashboard-agents.png'),
        type: 'png'
    });
    console.log('Saved: dashboard-agents.png');

    // Screenshot 2: Task queue section
    console.log('Taking tasks screenshot...');
    const queueSection = await page.$('#queue-section');
    await queueSection.screenshot({
        path: path.join(screenshotsDir, 'dashboard-tasks.png'),
        type: 'png'
    });
    console.log('Saved: dashboard-tasks.png');

    await browser.close();
    console.log('Done! Screenshots saved to docs/screenshots/');
}

takeScreenshots().catch(console.error);
