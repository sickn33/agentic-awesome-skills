---
name: azure-ai-contentsafety-java
description: "Build content moderation applications using the Azure AI Content Safety SDK for Java."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure AI Content Safety SDK for Java

Build content moderation applications using the Azure AI Content Safety SDK for Java.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-ai-contentsafety</artifactId>
    <version>1.1.0-beta.1</version>
</dependency>
```

## Client Creation

### With API Key

```java
import com.azure.ai.contentsafety.ContentSafetyClient;
import com.azure.ai.contentsafety.ContentSafetyClientBuilder;
import com.azure.ai.contentsafety.BlocklistClient;
import com.azure.ai.contentsafety.BlocklistClientBuilder;
import com.azure.core.credential.KeyCredential;

String endpoint = System.getenv("CONTENT_SAFETY_ENDPOINT");
String key = System.getenv("CONTENT_SAFETY_KEY");

ContentSafetyClient contentSafetyClient = new ContentSafetyClientBuilder()
    .credential(new KeyCredential(key))
    .endpoint(endpoint)
    .buildClient();

BlocklistClient blocklistClient = new BlocklistClientBuilder()
    .credential(new KeyCredential(key))
    .endpoint(endpoint)
    .buildClient();
```

### With DefaultAzureCredential

```java
import com.azure.identity.DefaultAzureCredentialBuilder;

ContentSafetyClient client = new ContentSafetyClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint(endpoint)
    .buildClient();
```

## Key Concepts

### Harm Categories
| Category | Description |
|----------|-------------|
| Hate | Discriminatory language based on identity groups |
| Sexual | Sexual content, relationships, acts |
| Violence | Physical harm, weapons, injury |
| Self-harm | Self-injury, suicide-related content |

### Severity Levels
- Text: 0-7 scale (default outputs 0, 2, 4, 6)
- Image: 0, 2, 4, 6 (trimmed scale)

## Core Patterns

### Analyze Text

```java
import com.azure.ai.contentsafety.models.*;

AnalyzeTextResult result = contentSafetyClient.analyzeText(
    new AnalyzeTextOptions("This is text to analyze"));

for (TextCategoriesAnalysis category : result.getCategoriesAnalysis()) {
    System.out.printf("Category: %s, Severity: %d%n",
        category.getCategory(),
        category.getSeverity());
}
```

### Analyze Text with Options

```java
AnalyzeTextOptions options = new AnalyzeTextOptions("Text to analyze")
    .setCategories(Arrays.asList(
        TextCategory.HATE,
        TextCategory.VIOLENCE))
    .setOutputType(AnalyzeTextOutputType.EIGHT_SEVERITY_LEVELS);

AnalyzeTextResult result = contentSafetyClient.analyzeText(options);
```

### Analyze Text with Blocklist

```java
AnalyzeTextOptions options = new AnalyzeTextOptions("I h*te you and want to k*ll you")
    .setBlocklistNames(Arrays.asList("my-blocklist"))
    .setHaltOnBlocklistHit(true);

AnalyzeTextResult result = contentSafetyClient.analyzeText(options);

if (result.getBlocklistsMatch() != null) {
    for (TextBlocklistMatch match : result.getBlocklistsMatch()) {
        System.out.printf("Blocklist: %s, Item: %s, Text: %s%n",
            match.getBlocklistName(),
            match.getBlocklistItemId(),
            match.getBlocklistItemText());
    }
}
```

### Analyze Image

```java
import com.azure.ai.contentsafety.models.*;
import com.azure.core.util.BinaryData;
import java.nio.file.Files;
import java.nio.file.Paths;

// From file
byte[] imageBytes = Files.readAllBytes(Paths.get("image.png"));
ContentSafetyImageData imageData = new ContentSafetyImageData()
    .setContent(BinaryData.fromBytes(imageBytes));

AnalyzeImageResult result = contentSafetyClient.analyzeImage(
    new AnalyzeImageOptions(imageData));

for (ImageCategoriesAnalysis category : result.getCategoriesAnalysis()) {
    System.out.printf("Category: %s, Severity: %d%n",
        category.getCategory(),
        category.getSeverity());
}
```

### Analyze Image from URL

```java
ContentSafetyImageData imageData = new ContentSafetyImageData()
    .setBlobUrl("https://example.com/image.jpg");

AnalyzeImageResult result = contentSafetyClient.analyzeImage(
    new AnalyzeImageOptions(imageData));
```

## Blocklist Management

### Create or Update Blocklist

```java
import com.azure.core.http.rest.RequestOptions;
import com.azure.core.http.rest.Response;
import com.azure.core.util.BinaryData;
import java.util.Map;

Map<String, String> description = Map.of("description", "Custom blocklist");
BinaryData resource = BinaryData.fromObject(description);

Response<BinaryData> response = blocklistClient.createOrUpdateTextBlocklistWithResponse(
    "my-blocklist", resource, new RequestOptions());

if (response.getStatusCode() == 201) {
    System.out.println("Blocklist created");
} else if (response.getStatusCode() == 200) {
    System.out.println("Blocklist updated");
}
```

### Add Block Items

```java
import com.azure.ai.contentsafety.models.*;
import java.util.Arrays;

List<TextBlocklistItem> items = Arrays.asList(
    new TextBlocklistItem("badword1").setDescription("Offensive term"),
    new TextBlocklistItem("badword2").setDescription("Another term")
);

AddOrUpdateTextBlocklistItemsResult result = blocklistClient.addOrUpdateBlocklistItems(
    "my-blocklist",
    new AddOrUpdateTextBlocklistItemsOptions(items));

for (TextBlocklistItem item : result.getBlocklistItems()) {
    System.out.printf("Added: %s (ID: %s)%n",
        item.getText(),
        item.getBlocklistItemId());
}
```

### List Blocklists

```java
PagedIterable<TextBlocklist> blocklists = blocklistClient.listTextBlocklists();

for (TextBlocklist blocklist : blocklists) {
    System.out.printf("Blocklist: %s, Description: %s%n",
        blocklist.getName(),
        blocklist.getDescription());
}
```

### Get Blocklist

```java
TextBlocklist blocklist = blocklistClient.getTextBlocklist("my-blocklist");
System.out.println("Name: " + blocklist.getName());
```

### List Block Items

```java
PagedIterable<TextBlocklistItem> items = 
    blocklistClient.listTextBlocklistItems("my-blocklist");

for (TextBlocklistItem item : items) {
    System.out.printf("ID: %s, Text: %s%n",
        item.getBlocklistItemId(),
        item.getText());
}
```

### Remove Block Items

```java
List<String> itemIds = Arrays.asList("item-id-1", "item-id-2");

blocklistClient.removeBlocklistItems(
    "my-blocklist",
    new RemoveTextBlocklistItemsOptions(itemIds));
```

### Delete Blocklist

```java
blocklistClient.deleteTextBlocklist("my-blocklist");
```

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;

try {
    contentSafetyClient.analyzeText(new AnalyzeTextOptions("test"));
} catch (HttpResponseException e) {
    System.out.println("Status: " + e.getResponse().getStatusCode());
    System.out.println("Error: " + e.getMessage());
    // Common codes: InvalidRequestBody, ResourceNotFound, TooManyRequests
}
```

## Environment Variables

```bash
CONTENT_SAFETY_ENDPOINT=https://<resource>.cognitiveservices.azure.com/
CONTENT_SAFETY_KEY=<your-api-key>
```

## Best Practices

1. **Blocklist Delay**: Changes take ~5 minutes to take effect
2. **Category Selection**: Only request needed categories to reduce latency
3. **Severity Thresholds**: Typically block severity >= 4 for strict moderation
4. **Batch Processing**: Process multiple items in parallel for throughput
5. **Caching**: Cache blocklist results where appropriate

## Trigger Phrases

- "content safety Java"
- "content moderation Azure"
- "analyze text safety"
- "image moderation Java"
- "blocklist management"
- "hate speech detection"
- "harmful content filter"

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
