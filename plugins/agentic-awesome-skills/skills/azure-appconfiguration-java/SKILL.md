---
name: azure-appconfiguration-java
description: Azure App Configuration SDK for Java. Centralized application configuration management with key-value settings, feature flags, and snapshots.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure App Configuration SDK for Java

Client library for Azure App Configuration, a managed service for centralizing application configurations.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-data-appconfiguration</artifactId>
    <version>1.8.0</version>
</dependency>
```

Or use Azure SDK BOM:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.azure</groupId>
            <artifactId>azure-sdk-bom</artifactId>
            <version>{bom_version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.azure</groupId>
        <artifactId>azure-data-appconfiguration</artifactId>
    </dependency>
</dependencies>
```

## Prerequisites

- Azure App Configuration store
- Connection string or Entra ID credentials

## Environment Variables

```bash
AZURE_APPCONFIG_CONNECTION_STRING=Endpoint=https://<store>.azconfig.io;Id=<id>;Secret=<secret>
AZURE_APPCONFIG_ENDPOINT=https://<store>.azconfig.io
```

## Client Creation

### With Connection String

```java
import com.azure.data.appconfiguration.ConfigurationClient;
import com.azure.data.appconfiguration.ConfigurationClientBuilder;

ConfigurationClient configClient = new ConfigurationClientBuilder()
    .connectionString(System.getenv("AZURE_APPCONFIG_CONNECTION_STRING"))
    .buildClient();
```

### Async Client

```java
import com.azure.data.appconfiguration.ConfigurationAsyncClient;

ConfigurationAsyncClient asyncClient = new ConfigurationClientBuilder()
    .connectionString(connectionString)
    .buildAsyncClient();
```

### With Entra ID (Recommended)

```java
import com.azure.identity.DefaultAzureCredentialBuilder;

ConfigurationClient configClient = new ConfigurationClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint(System.getenv("AZURE_APPCONFIG_ENDPOINT"))
    .buildClient();
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| Configuration Setting | Key-value pair with optional label |
| Label | Dimension for separating settings (e.g., environments) |
| Feature Flag | Special setting for feature management |
| Secret Reference | Setting pointing to Key Vault secret |
| Snapshot | Point-in-time immutable view of settings |

## Configuration Setting Operations

### Create Setting (Add)

Creates only if setting doesn't exist:

```java
import com.azure.data.appconfiguration.models.ConfigurationSetting;

ConfigurationSetting setting = configClient.addConfigurationSetting(
    "app/database/connection", 
    "Production", 
    "Server=prod.db.com;Database=myapp"
);
```

### Create or Update Setting (Set)

Creates or overwrites:

```java
ConfigurationSetting setting = configClient.setConfigurationSetting(
    "app/cache/enabled", 
    "Production", 
    "true"
);
```

### Get Setting

```java
ConfigurationSetting setting = configClient.getConfigurationSetting(
    "app/database/connection", 
    "Production"
);
System.out.println("Value: " + setting.getValue());
System.out.println("Content-Type: " + setting.getContentType());
System.out.println("Last Modified: " + setting.getLastModified());
```

### Conditional Get (If Changed)

```java
import com.azure.core.http.rest.Response;
import com.azure.core.util.Context;

Response<ConfigurationSetting> response = configClient.getConfigurationSettingWithResponse(
    setting,      // Setting with ETag
    null,         // Accept datetime
    true,         // ifChanged - only fetch if modified
    Context.NONE
);

if (response.getStatusCode() == 304) {
    System.out.println("Setting not modified");
} else {
    ConfigurationSetting updated = response.getValue();
}
```

### Update Setting

```java
ConfigurationSetting updated = configClient.setConfigurationSetting(
    "app/cache/enabled", 
    "Production", 
    "false"
);
```

### Conditional Update (If Unchanged)

```java
// Only update if ETag matches (no concurrent modifications)
Response<ConfigurationSetting> response = configClient.setConfigurationSettingWithResponse(
    setting,     // Setting with current ETag
    true,        // ifUnchanged
    Context.NONE
);
```

### Delete Setting

```java
ConfigurationSetting deleted = configClient.deleteConfigurationSetting(
    "app/cache/enabled", 
    "Production"
);
```

### Conditional Delete

```java
Response<ConfigurationSetting> response = configClient.deleteConfigurationSettingWithResponse(
    setting,     // Setting with ETag
    true,        // ifUnchanged
    Context.NONE
);
```

## List and Filter Settings

### List by Key Pattern

```java
import com.azure.data.appconfiguration.models.SettingSelector;
import com.azure.core.http.rest.PagedIterable;

SettingSelector selector = new SettingSelector()
    .setKeyFilter("app/*");

PagedIterable<ConfigurationSetting> settings = configClient.listConfigurationSettings(selector);
for (ConfigurationSetting s : settings) {
    System.out.println(s.getKey() + " = " + s.getValue());
}
```

### List by Label

```java
SettingSelector selector = new SettingSelector()
    .setKeyFilter("*")
    .setLabelFilter("Production");

PagedIterable<ConfigurationSetting> settings = configClient.listConfigurationSettings(selector);
```

### List by Multiple Keys

```java
SettingSelector selector = new SettingSelector()
    .setKeyFilter("app/database/*,app/cache/*");

PagedIterable<ConfigurationSetting> settings = configClient.listConfigurationSettings(selector);
```

### List Revisions

```java
SettingSelector selector = new SettingSelector()
    .setKeyFilter("app/database/connection");

PagedIterable<ConfigurationSetting> revisions = configClient.listRevisions(selector);
for (ConfigurationSetting revision : revisions) {
    System.out.println("Value: " + revision.getValue() + ", Modified: " + revision.getLastModified());
}
```

## Feature Flags

### Create Feature Flag

```java
import com.azure.data.appconfiguration.models.FeatureFlagConfigurationSetting;
import com.azure.data.appconfiguration.models.FeatureFlagFilter;
import java.util.Arrays;

FeatureFlagFilter percentageFilter = new FeatureFlagFilter("Microsoft.Percentage")
    .addParameter("Value", 50);

FeatureFlagConfigurationSetting featureFlag = new FeatureFlagConfigurationSetting("beta-feature", true)
    .setDescription("Beta feature rollout")
    .setClientFilters(Arrays.asList(percentageFilter));

FeatureFlagConfigurationSetting created = (FeatureFlagConfigurationSetting)
    configClient.addConfigurationSetting(featureFlag);
```

### Get Feature Flag

```java
FeatureFlagConfigurationSetting flag = (FeatureFlagConfigurationSetting)
    configClient.getConfigurationSetting(featureFlag);

System.out.println("Feature: " + flag.getFeatureId());
System.out.println("Enabled: " + flag.isEnabled());
System.out.println("Filters: " + flag.getClientFilters());
```

### Update Feature Flag

```java
featureFlag.setEnabled(false);
FeatureFlagConfigurationSetting updated = (FeatureFlagConfigurationSetting)
    configClient.setConfigurationSetting(featureFlag);
```

## Secret References

### Create Secret Reference

```java
import com.azure.data.appconfiguration.models.SecretReferenceConfigurationSetting;

SecretReferenceConfigurationSetting secretRef = new SecretReferenceConfigurationSetting(
    "app/secrets/api-key",
    "https://myvault.vault.azure.net/secrets/api-key"
);

SecretReferenceConfigurationSetting created = (SecretReferenceConfigurationSetting)
    configClient.addConfigurationSetting(secretRef);
```

### Get Secret Reference

```java
SecretReferenceConfigurationSetting ref = (SecretReferenceConfigurationSetting)
    configClient.getConfigurationSetting(secretRef);

System.out.println("Secret URI: " + ref.getSecretId());
```

## Read-Only Settings

### Set Read-Only

```java
ConfigurationSetting readOnly = configClient.setReadOnly(
    "app/critical/setting", 
    "Production", 
    true
);
```

### Clear Read-Only

```java
ConfigurationSetting writable = configClient.setReadOnly(
    "app/critical/setting", 
    "Production", 
    false
);
```

## Snapshots

### Create Snapshot

```java
import com.azure.data.appconfiguration.models.ConfigurationSnapshot;
import com.azure.data.appconfiguration.models.ConfigurationSettingsFilter;
import com.azure.core.util.polling.SyncPoller;
import com.azure.core.util.polling.PollOperationDetails;

List<ConfigurationSettingsFilter> filters = new ArrayList<>();
filters.add(new ConfigurationSettingsFilter("app/*"));

SyncPoller<PollOperationDetails, ConfigurationSnapshot> poller = configClient.beginCreateSnapshot(
    "release-v1.0",
    new ConfigurationSnapshot(filters),
    Context.NONE
);
poller.setPollInterval(Duration.ofSeconds(10));
poller.waitForCompletion();

ConfigurationSnapshot snapshot = poller.getFinalResult();
System.out.println("Snapshot: " + snapshot.getName() + ", Status: " + snapshot.getStatus());
```

### Get Snapshot

```java
ConfigurationSnapshot snapshot = configClient.getSnapshot("release-v1.0");
System.out.println("Created: " + snapshot.getCreatedAt());
System.out.println("Items: " + snapshot.getItemCount());
```

### List Settings in Snapshot

```java
PagedIterable<ConfigurationSetting> settings = 
    configClient.listConfigurationSettingsForSnapshot("release-v1.0");

for (ConfigurationSetting setting : settings) {
    System.out.println(setting.getKey() + " = " + setting.getValue());
}
```

### Archive Snapshot

```java
ConfigurationSnapshot archived = configClient.archiveSnapshot("release-v1.0");
System.out.println("Status: " + archived.getStatus()); // archived
```

### Recover Snapshot

```java
ConfigurationSnapshot recovered = configClient.recoverSnapshot("release-v1.0");
System.out.println("Status: " + recovered.getStatus()); // ready
```

### List All Snapshots

```java
import com.azure.data.appconfiguration.models.SnapshotSelector;

SnapshotSelector selector = new SnapshotSelector().setNameFilter("release-*");
PagedIterable<ConfigurationSnapshot> snapshots = configClient.listSnapshots(selector);

for (ConfigurationSnapshot snap : snapshots) {
    System.out.println(snap.getName() + " - " + snap.getStatus());
}
```

## Labels

### List Labels

```java
import com.azure.data.appconfiguration.models.SettingLabelSelector;

configClient.listLabels(new SettingLabelSelector().setNameFilter("*"))
    .forEach(label -> System.out.println("Label: " + label.getName()));
```

## Async Operations

```java
ConfigurationAsyncClient asyncClient = new ConfigurationClientBuilder()
    .connectionString(connectionString)
    .buildAsyncClient();

// Async list with reactive streams
asyncClient.listConfigurationSettings(new SettingSelector().setLabelFilter("Production"))
    .subscribe(
        setting -> System.out.println(setting.getKey() + " = " + setting.getValue()),
        error -> System.err.println("Error: " + error.getMessage()),
        () -> System.out.println("Completed")
    );
```

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;

try {
    configClient.getConfigurationSetting("nonexistent", null);
} catch (HttpResponseException e) {
    if (e.getResponse().getStatusCode() == 404) {
        System.err.println("Setting not found");
    } else {
        System.err.println("Error: " + e.getMessage());
    }
}
```

## Best Practices

1. **Use labels** — Separate configurations by environment (Dev, Staging, Production)
2. **Use snapshots** — Create immutable snapshots for releases
3. **Feature flags** — Use for gradual rollouts and A/B testing
4. **Secret references** — Store sensitive values in Key Vault
5. **Conditional requests** — Use ETags for optimistic concurrency
6. **Read-only protection** — Lock critical production settings
7. **Use Entra ID** — Preferred over connection strings
8. **Async client** — Use for high-throughput scenarios

## Reference Links

| Resource | URL |
|----------|-----|
| Maven Package | https://central.sonatype.com/artifact/com.azure/azure-data-appconfiguration |
| GitHub | https://github.com/Azure/azure-sdk-for-java/tree/main/sdk/appconfiguration/azure-data-appconfiguration |
| API Documentation | https://aka.ms/java-docs |
| Product Docs | https://learn.microsoft.com/azure/azure-app-configuration |
| Samples | https://github.com/Azure/azure-sdk-for-java/tree/main/sdk/appconfiguration/azure-data-appconfiguration/src/samples |
| Troubleshooting | https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/appconfiguration/azure-data-appconfiguration/TROUBLESHOOTING.md |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
