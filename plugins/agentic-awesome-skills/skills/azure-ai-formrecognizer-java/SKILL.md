---
name: azure-ai-formrecognizer-java
description: "Build document analysis applications using the Azure AI Document Intelligence SDK for Java."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure Document Intelligence (Form Recognizer) SDK for Java

Build document analysis applications using the Azure AI Document Intelligence SDK for Java.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-ai-formrecognizer</artifactId>
    <version>4.2.0-beta.1</version>
</dependency>
```

## Client Creation

### DocumentAnalysisClient

```java
import com.azure.ai.formrecognizer.documentanalysis.DocumentAnalysisClient;
import com.azure.ai.formrecognizer.documentanalysis.DocumentAnalysisClientBuilder;
import com.azure.core.credential.AzureKeyCredential;

DocumentAnalysisClient client = new DocumentAnalysisClientBuilder()
    .credential(new AzureKeyCredential("{key}"))
    .endpoint("{endpoint}")
    .buildClient();
```

### DocumentModelAdministrationClient

```java
import com.azure.ai.formrecognizer.documentanalysis.administration.DocumentModelAdministrationClient;
import com.azure.ai.formrecognizer.documentanalysis.administration.DocumentModelAdministrationClientBuilder;

DocumentModelAdministrationClient adminClient = new DocumentModelAdministrationClientBuilder()
    .credential(new AzureKeyCredential("{key}"))
    .endpoint("{endpoint}")
    .buildClient();
```

### With DefaultAzureCredential

```java
import com.azure.identity.DefaultAzureCredentialBuilder;

DocumentAnalysisClient client = new DocumentAnalysisClientBuilder()
    .endpoint("{endpoint}")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

## Prebuilt Models

| Model ID | Purpose |
|----------|---------|
| `prebuilt-layout` | Extract text, tables, selection marks |
| `prebuilt-document` | General document with key-value pairs |
| `prebuilt-receipt` | Receipt data extraction |
| `prebuilt-invoice` | Invoice field extraction |
| `prebuilt-businessCard` | Business card parsing |
| `prebuilt-idDocument` | ID document (passport, license) |
| `prebuilt-tax.us.w2` | US W2 tax forms |

## Core Patterns

### Extract Layout

```java
import com.azure.ai.formrecognizer.documentanalysis.models.*;
import com.azure.core.util.BinaryData;
import com.azure.core.util.polling.SyncPoller;
import java.io.File;

File document = new File("document.pdf");
BinaryData documentData = BinaryData.fromFile(document.toPath());

SyncPoller<OperationResult, AnalyzeResult> poller = 
    client.beginAnalyzeDocument("prebuilt-layout", documentData);

AnalyzeResult result = poller.getFinalResult();

// Process pages
for (DocumentPage page : result.getPages()) {
    System.out.printf("Page %d: %.2f x %.2f %s%n",
        page.getPageNumber(),
        page.getWidth(),
        page.getHeight(),
        page.getUnit());
    
    // Lines
    for (DocumentLine line : page.getLines()) {
        System.out.println("Line: " + line.getContent());
    }
    
    // Selection marks (checkboxes)
    for (DocumentSelectionMark mark : page.getSelectionMarks()) {
        System.out.printf("Checkbox: %s (confidence: %.2f)%n",
            mark.getSelectionMarkState(),
            mark.getConfidence());
    }
}

// Tables
for (DocumentTable table : result.getTables()) {
    System.out.printf("Table: %d rows x %d columns%n",
        table.getRowCount(),
        table.getColumnCount());
    
    for (DocumentTableCell cell : table.getCells()) {
        System.out.printf("Cell[%d,%d]: %s%n",
            cell.getRowIndex(),
            cell.getColumnIndex(),
            cell.getContent());
    }
}
```

### Analyze from URL

```java
String documentUrl = "https://example.com/invoice.pdf";

SyncPoller<OperationResult, AnalyzeResult> poller = 
    client.beginAnalyzeDocumentFromUrl("prebuilt-invoice", documentUrl);

AnalyzeResult result = poller.getFinalResult();
```

### Analyze Receipt

```java
SyncPoller<OperationResult, AnalyzeResult> poller = 
    client.beginAnalyzeDocumentFromUrl("prebuilt-receipt", receiptUrl);

AnalyzeResult result = poller.getFinalResult();

for (AnalyzedDocument doc : result.getDocuments()) {
    Map<String, DocumentField> fields = doc.getFields();
    
    DocumentField merchantName = fields.get("MerchantName");
    if (merchantName != null && merchantName.getType() == DocumentFieldType.STRING) {
        System.out.printf("Merchant: %s (confidence: %.2f)%n",
            merchantName.getValueAsString(),
            merchantName.getConfidence());
    }
    
    DocumentField transactionDate = fields.get("TransactionDate");
    if (transactionDate != null && transactionDate.getType() == DocumentFieldType.DATE) {
        System.out.printf("Date: %s%n", transactionDate.getValueAsDate());
    }
    
    DocumentField items = fields.get("Items");
    if (items != null && items.getType() == DocumentFieldType.LIST) {
        for (DocumentField item : items.getValueAsList()) {
            Map<String, DocumentField> itemFields = item.getValueAsMap();
            System.out.printf("Item: %s, Price: %.2f%n",
                itemFields.get("Name").getValueAsString(),
                itemFields.get("Price").getValueAsDouble());
        }
    }
}
```

### General Document Analysis

```java
SyncPoller<OperationResult, AnalyzeResult> poller = 
    client.beginAnalyzeDocumentFromUrl("prebuilt-document", documentUrl);

AnalyzeResult result = poller.getFinalResult();

// Key-value pairs
for (DocumentKeyValuePair kvp : result.getKeyValuePairs()) {
    System.out.printf("Key: %s => Value: %s%n",
        kvp.getKey().getContent(),
        kvp.getValue() != null ? kvp.getValue().getContent() : "null");
}
```

## Custom Models

### Build Custom Model

```java
import com.azure.ai.formrecognizer.documentanalysis.administration.models.*;

String blobContainerUrl = "{SAS_URL_of_training_data}";
String prefix = "training-docs/";

SyncPoller<OperationResult, DocumentModelDetails> poller = adminClient.beginBuildDocumentModel(
    blobContainerUrl,
    DocumentModelBuildMode.TEMPLATE,
    prefix,
    new BuildDocumentModelOptions()
        .setModelId("my-custom-model")
        .setDescription("Custom invoice model"),
    Context.NONE);

DocumentModelDetails model = poller.getFinalResult();

System.out.println("Model ID: " + model.getModelId());
System.out.println("Created: " + model.getCreatedOn());

model.getDocumentTypes().forEach((docType, details) -> {
    System.out.println("Document type: " + docType);
    details.getFieldSchema().forEach((field, schema) -> {
        System.out.printf("  Field: %s (%s)%n", field, schema.getType());
    });
});
```

### Analyze with Custom Model

```java
SyncPoller<OperationResult, AnalyzeResult> poller = 
    client.beginAnalyzeDocumentFromUrl("my-custom-model", documentUrl);

AnalyzeResult result = poller.getFinalResult();

for (AnalyzedDocument doc : result.getDocuments()) {
    System.out.printf("Document type: %s (confidence: %.2f)%n",
        doc.getDocType(),
        doc.getConfidence());
    
    doc.getFields().forEach((name, field) -> {
        System.out.printf("Field '%s': %s (confidence: %.2f)%n",
            name,
            field.getContent(),
            field.getConfidence());
    });
}
```

### Compose Models

```java
List<String> modelIds = Arrays.asList("model-1", "model-2", "model-3");

SyncPoller<OperationResult, DocumentModelDetails> poller = 
    adminClient.beginComposeDocumentModel(
        modelIds,
        new ComposeDocumentModelOptions()
            .setModelId("composed-model")
            .setDescription("Composed from multiple models"));

DocumentModelDetails composedModel = poller.getFinalResult();
```

### Manage Models

```java
// List models
PagedIterable<DocumentModelSummary> models = adminClient.listDocumentModels();
for (DocumentModelSummary summary : models) {
    System.out.printf("Model: %s, Created: %s%n",
        summary.getModelId(),
        summary.getCreatedOn());
}

// Get model details
DocumentModelDetails model = adminClient.getDocumentModel("model-id");

// Delete model
adminClient.deleteDocumentModel("model-id");

// Check resource limits
ResourceDetails resources = adminClient.getResourceDetails();
System.out.printf("Models: %d / %d%n",
    resources.getCustomDocumentModelCount(),
    resources.getCustomDocumentModelLimit());
```

## Document Classification

### Build Classifier

```java
Map<String, ClassifierDocumentTypeDetails> docTypes = new HashMap<>();
docTypes.put("invoice", new ClassifierDocumentTypeDetails()
    .setAzureBlobSource(new AzureBlobContentSource(containerUrl).setPrefix("invoices/")));
docTypes.put("receipt", new ClassifierDocumentTypeDetails()
    .setAzureBlobSource(new AzureBlobContentSource(containerUrl).setPrefix("receipts/")));

SyncPoller<OperationResult, DocumentClassifierDetails> poller = 
    adminClient.beginBuildDocumentClassifier(docTypes,
        new BuildDocumentClassifierOptions().setClassifierId("my-classifier"));

DocumentClassifierDetails classifier = poller.getFinalResult();
```

### Classify Document

```java
SyncPoller<OperationResult, AnalyzeResult> poller = 
    client.beginClassifyDocumentFromUrl("my-classifier", documentUrl, Context.NONE);

AnalyzeResult result = poller.getFinalResult();

for (AnalyzedDocument doc : result.getDocuments()) {
    System.out.printf("Classified as: %s (confidence: %.2f)%n",
        doc.getDocType(),
        doc.getConfidence());
}
```

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;

try {
    client.beginAnalyzeDocumentFromUrl("prebuilt-receipt", "invalid-url");
} catch (HttpResponseException e) {
    System.out.println("Status: " + e.getResponse().getStatusCode());
    System.out.println("Error: " + e.getMessage());
}
```

## Environment Variables

```bash
FORM_RECOGNIZER_ENDPOINT=https://<resource>.cognitiveservices.azure.com/
FORM_RECOGNIZER_KEY=<your-api-key>
```

## Trigger Phrases

- "document intelligence Java"
- "form recognizer SDK"
- "extract text from PDF"
- "OCR document Java"
- "analyze invoice receipt"
- "custom document model"
- "document classification"

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
