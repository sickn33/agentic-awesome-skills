package com.company.tests.base;

import com.company.tests.config.ConfigReader;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.WaitForSelectorState;
import io.qameta.allure.Step;

/**
 * BasePage – foundation for all Page Object classes.
 *
 * Responsibilities:
 * - Inject Page via constructor (never create Playwright here)
 * - Provide common action helpers with Allure @Step reporting
 * - Enforce strict locator strategy (role/label/testid first)
 * - Declare getUrl() so pages can self-navigate
 */
public abstract class BasePage {

    protected final Page page;

    public BasePage(Page page) {
        this.page = page;
    }

    // ─── Navigation ────────────────────────────────────────────────────────────

    /** Navigate to this page's URL relative to baseUrl */
    @Step("Navigate to {this.getUrl()}")
    public BasePage navigate() {
        page.navigate(ConfigReader.getBaseUrl() + getUrl());
        waitForPageLoad();
        return this;
    }

    /** Each page declares its relative URL path, e.g. "/login" */
    protected abstract String getUrl();

    @Step("Wait for DOM content loaded; page-specific readiness asserted by caller")
    protected void waitForPageLoad() {
        page.waitForLoadState(LoadState.DOMCONTENTLOADED);
    }

    // ─── Locator Shortcuts ──────────────────────────────────────────────────────

    protected Locator byRole(AriaRole role, String name) {
        return page.getByRole(role, new Page.GetByRoleOptions().setName(name));
    }

    protected Locator byLabel(String label) {
        return page.getByLabel(label);
    }

    protected Locator byTestId(String testId) {
        return page.getByTestId(testId);
    }

    protected Locator byText(String text) {
        return page.getByText(text);
    }

    protected Locator byPlaceholder(String placeholder) {
        return page.getByPlaceholder(placeholder);
    }

    // ─── Action Helpers ─────────────────────────────────────────────────────────

    // Allure @Step can serialize method parameters including passwords.
    // Keep sensitive fill actions unannotated and audit report redaction.
    protected void fill(Locator locator, String value) {
        locator.waitFor(new Locator.WaitForOptions()
            .setState(WaitForSelectorState.VISIBLE)
            .setTimeout(10_000));
        locator.fill(value);
    }

    @Step("Click and wait for navigation")
    protected void clickAndWaitForNav(Locator locator, String expectedUrl) {
        locator.click();
        page.waitForURL(expectedUrl);
    }

    @Step("Click field")
    protected void click(Locator locator) {
        locator.waitFor(new Locator.WaitForOptions()
            .setState(WaitForSelectorState.VISIBLE)
            .setTimeout(10_000));
        locator.click();
    }

    @Step("Wait for element to be visible")
    protected void waitForVisible(Locator locator, int timeoutMs) {
        locator.waitFor(new Locator.WaitForOptions()
            .setState(WaitForSelectorState.VISIBLE)
            .setTimeout(timeoutMs));
    }

    @Step("Wait for element to be hidden")
    protected void waitForHidden(Locator locator) {
        locator.waitFor(new Locator.WaitForOptions()
            .setState(WaitForSelectorState.HIDDEN)
            .setTimeout(15_000));
    }

    @Step("Select option '{value}' from dropdown")
    protected void selectOption(Locator locator, String value) {
        locator.selectOption(value);
    }

    @Step("Check checkbox")
    protected void check(Locator locator) {
        if (!locator.isChecked()) locator.check();
    }

    @Step("Uncheck checkbox")
    protected void uncheck(Locator locator) {
        if (locator.isChecked()) locator.uncheck();
    }

    // ─── Scroll ─────────────────────────────────────────────────────────────────

    protected void scrollIntoView(Locator locator) {
        locator.scrollIntoViewIfNeeded();
    }

    // ─── Utility ────────────────────────────────────────────────────────────────

    public String getCurrentUrl() {
        return page.url();
    }

    public String getPageTitle() {
        return page.title();
    }
}
