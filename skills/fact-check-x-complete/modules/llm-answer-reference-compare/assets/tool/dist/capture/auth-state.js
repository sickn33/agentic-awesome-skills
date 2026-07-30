export async function authenticationRequired(page, config) {
    if (!config.requiresLogin) {
        return false;
    }
    const selectors = config.selectors?.loginGate || [
        "button:has-text('登录')",
        "button:has-text('Sign in')",
        "button:has-text('Log in')",
        "[data-testid*='login']",
        "[class*='login-btn']"
    ];
    for (const selector of selectors) {
        const locator = page.locator(selector);
        const count = await locator.count().catch(() => 0);
        for (let index = count - 1; index >= 0; index -= 1) {
            if (await locator.nth(index).isVisible().catch(() => false)) {
                return true;
            }
        }
    }
    let bodyText = "";
    try {
        bodyText = await page.locator("body").innerText({ timeout: 2000 });
    }
    catch {
        bodyText = "";
    }
    if (/会话过期，请重新登录|请登录后|登录后(?:即可|继续|使用)|请先登录|账号登录|扫码登录/.test(bodyText)) {
        return true;
    }
    return false;
}

export async function waitForAuthentication(page, config, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let consecutiveAuthenticatedChecks = 0;
    while (Date.now() < deadline) {
        if (page.isClosed?.()) {
            throw new Error("采集页面已关闭；将重开页面并自动重放原问题。");
        }
        if (await authenticationRequired(page, config)) {
            consecutiveAuthenticatedChecks = 0;
        }
        else {
            consecutiveAuthenticatedChecks += 1;
            if (consecutiveAuthenticatedChecks >= 3) {
                return true;
            }
        }
        await page.waitForTimeout(700);
    }
    return false;
}
