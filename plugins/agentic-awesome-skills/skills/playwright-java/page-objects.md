# Playwright Java – Page Object Patterns

## Component Pattern (Reusable Sub-Page-Objects)

For repeated UI components (navbars, modals, tables), create Component classes:

```java
// Reusable table component — pass the locator root
public class DataTable extends BasePage {
    private final Locator tableRoot;

    public DataTable(Page page, Locator tableRoot) {
        super(page);
        this.tableRoot = tableRoot;
    }

    public int getRowCount() {
        return tableRoot.locator("tbody tr").count();
    }

    public String getCellValue(int row, int col) {
        return tableRoot.locator("tbody tr")
                        .nth(row)
                        .locator("td")
                        .nth(col)
                        .innerText();
    }

    public void clickRowAction(int row, String actionLabel) {
        tableRoot.locator("tbody tr")
                 .nth(row)
                 .getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName(actionLabel))
                 .click();
    }

    public DataTable sortByColumn(String columnHeader) {
        tableRoot.getByRole(AriaRole.COLUMNHEADER,
                new Locator.GetByRoleOptions().setName(columnHeader)).click();
        return this;
    }
}

// Usage in a page object:
public class UsersPage extends BasePage {
    public final DataTable usersTable;
    private final Locator searchInput;
    private final Locator addUserButton;

    public UsersPage(Page page) {
        super(page);
        usersTable    = new DataTable(page, page.locator("#users-table"));
        searchInput   = page.getByPlaceholder("Search users…");
        addUserButton = page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add User"));
    }

    @Override protected String getUrl() { return "/admin/users"; }

    public UsersPage searchFor(String query) {
        searchInput.fill(query);
        searchInput.press("Enter");
        page.waitForResponse("**/api/users**", () -> {});
        return this;
    }
}
```

---

## Modal / Dialog Component

```java
public class ConfirmDialog extends BasePage {
    private final Locator dialog;
    private final Locator confirmButton;
    private final Locator cancelButton;
    private final Locator titleText;

    public ConfirmDialog(Page page) {
        super(page);
        dialog        = page.getByRole(AriaRole.DIALOG);
        confirmButton = dialog.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Confirm"));
        cancelButton  = dialog.getByRole(AriaRole.BUTTON, new Locator.GetByRoleOptions().setName("Cancel"));
        titleText     = dialog.getByRole(AriaRole.HEADING);
    }

    public void waitForOpen() {
        dialog.waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.VISIBLE));
    }

    public void confirm() { confirmButton.click(); dialog.waitFor(
        new Locator.WaitForOptions().setState(WaitForSelectorState.HIDDEN)); }

    public void cancel()  { cancelButton.click(); }

    public String getTitle() { return titleText.innerText(); }

    @Override protected String getUrl() { return ""; }
}
```

---

## Navigation Chain Pattern

Page methods should **return the next page object** — never return `void` for navigating actions:

```java
// CORRECT — enables fluent chaining
public DashboardPage loginAs(String email, String password) {
    fill(emailInput, email);
    fill(passwordInput, password);
    clickAndWaitForNav(submitButton);
    return new DashboardPage(page);
}

// USAGE
DashboardPage dash = new LoginPage(page)
    .navigate()
    .loginAs("user@test.com", "secret")
    .navigateTo(OrdersPage::new)  // helper to reduce boilerplate
    .filterByStatus("PENDING");
```

---

## Dynamic Locators

For lists of items that share structure:

```java
// Locate a card by its title
public Locator getProductCard(String productName) {
    return page.locator(".product-card")
               .filter(new Locator.FilterOptions().setHasText(productName));
}

// Wait for a specific row to appear in a table
public void waitForOrderRow(String orderId) {
    page.locator("tr[data-order-id='" + orderId + "']")
        .waitFor(new Locator.WaitForOptions().setState(WaitForSelectorState.VISIBLE)
                .setTimeout(15_000));
}
```

---

## Dropdown / Select Handling

```java
// Native <select>
page.selectOption("#country-select", "India");

// Custom dropdown (non-native)
public void selectCountry(String countryName) {
    page.getByLabel("Country").click();
    page.getByRole(AriaRole.LISTBOX)
        .getByText(countryName)
        .click();
}
```

---

## File Upload

```java
// Standard file input
page.setInputFiles("#file-upload", Paths.get("src/test/resources/testdata/sample.pdf"));

// Drag-and-drop upload zone
page.locator(".upload-zone").setInputFiles(Paths.get("src/test/resources/testdata/sample.pdf"));

// Multiple files
page.setInputFiles("#file-upload", new Path[]{
    Paths.get("file1.png"),
    Paths.get("file2.png")
});
```

---

## Download Handling

```java
Download download = page.waitForDownload(() ->
    page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Export CSV")).click()
);
Path downloadedFile = download.path();
assertThat(downloadedFile.toFile()).exists();
```

---

## Hover & Tooltip Verification

```java
page.getByTestId("info-icon").hover();
Locator tooltip = page.getByRole(AriaRole.TOOLTIP);
tooltip.waitFor();
assertThat(tooltip).hasText("This field is required");
```

---

## Waiting Strategies (Anti-Flake)

```java
// Wait for API response after action
page.waitForResponse(resp -> resp.url().contains("/api/search") && resp.status() == 200,
    () -> searchInput.fill("test"));

// Wait for network idle (after complex renders)
page.waitForLoadState(LoadState.NETWORKIDLE);

// Wait for element count to stabilize
Locator rows = page.locator("tbody tr");
rows.first().waitFor(); // wait for at least one
assertThat(rows).hasCount(10);

// Polling custom condition
Assertions.assertDoesNotThrow(() -> {
    page.waitForCondition(() -> page.locator(".spinner").count() == 0);
});
```
