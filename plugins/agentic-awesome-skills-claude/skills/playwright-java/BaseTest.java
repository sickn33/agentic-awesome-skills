package com.company.tests.base;

import com.company.tests.config.ConfigReader;
import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;
import io.qameta.allure.Allure;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestInfo;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Thread-safe BaseTest for parallel Playwright execution.
 * Handles Playwright/Browser/Context/Page lifecycle.
 * Captures traces and screenshots on test completion.
 */
public abstract class BaseTest {

    private static final ThreadLocal<Playwright>     playwrightTL = new ThreadLocal<>();
    private static final ThreadLocal<Browser>        browserTL    = new ThreadLocal<>();
    private static final ThreadLocal<BrowserContext> contextTL    = new ThreadLocal<>();
    private static final ThreadLocal<Page>           pageTL       = new ThreadLocal<>();

    /** Access the Page in test/page-object classes */
    protected Page page() {
        return pageTL.get();
    }

    @BeforeEach
    void setUpPlaywright(TestInfo testInfo) throws Exception {
        // Ensure trace/video output directories exist
        Files.createDirectories(Paths.get("target/traces"));
        Files.createDirectories(Paths.get("target/videos"));

        Playwright playwright = Playwright.create();
        playwrightTL.set(playwright);

        BrowserType.LaunchOptions launchOptions = new BrowserType.LaunchOptions()
            .setHeadless(ConfigReader.isHeadless())
            .setSlowMo(Integer.parseInt(System.getProperty("slowMo", "0")));

        Browser browser = resolveBrowser(playwright).launch(launchOptions);
        browserTL.set(browser);

        Browser.NewContextOptions contextOptions = new Browser.NewContextOptions()
            .setViewportSize(1920, 1080)
            .setLocale("en-US")
            .setTimezoneId("Asia/Kolkata")
            .setRecordVideoDir(Paths.get("target/videos/"));

        // Load saved auth state if available
        Path authState = Paths.get("target/auth/user-state.json");
        if (Files.exists(authState)) {
            contextOptions.setStorageStatePath(authState);
        }

        BrowserContext context = browser.newContext(contextOptions);
        context.setDefaultTimeout(ConfigReader.getDefaultTimeout());
        context.setDefaultNavigationTimeout(60_000);

        // Start tracing
        context.tracing().start(new Tracing.StartOptions()
            .setScreenshots(true)
            .setSnapshots(true)
            .setSources(true));

        contextTL.set(context);

        Page page = context.newPage();
        pageTL.set(page);
    }

    @AfterEach
    void tearDownPlaywright(TestInfo testInfo) {
        String safeName = testInfo.getDisplayName()
            .replaceAll("[^a-zA-Z0-9._-]", "_")
            .substring(0, Math.min(80, testInfo.getDisplayName().length()));

        try {
            // Capture screenshot for Allure
            if (pageTL.get() != null) {
                byte[] screenshot = pageTL.get().screenshot(
                    new Page.ScreenshotOptions().setFullPage(true));
                Allure.addAttachment("Final Screenshot", "image/png",
                    new ByteArrayInputStream(screenshot), "png");
            }
        } catch (Exception ignored) {}

        try {
            // Stop and save trace
            if (contextTL.get() != null) {
                contextTL.get().tracing().stop(new Tracing.StopOptions()
                    .setPath(Paths.get("target/traces/" + safeName + ".zip")));
            }
        } catch (Exception ignored) {}

        // Close resources in order
        closeQuietly(pageTL.get());
        closeQuietly(contextTL.get());
        closeQuietly(browserTL.get());
        closeQuietly(playwrightTL.get());

        pageTL.remove();
        contextTL.remove();
        browserTL.remove();
        playwrightTL.remove();
    }

    private BrowserType resolveBrowser(Playwright playwright) {
        return switch (System.getProperty("browser", "chromium").toLowerCase()) {
            case "firefox" -> playwright.firefox();
            case "webkit"  -> playwright.webkit();
            default        -> playwright.chromium();
        };
    }

    private void closeQuietly(AutoCloseable closeable) {
        if (closeable != null) {
            try { closeable.close(); } catch (Exception ignored) {}
        }
    }
}
