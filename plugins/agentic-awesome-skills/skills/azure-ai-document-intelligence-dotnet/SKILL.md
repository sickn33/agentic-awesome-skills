---
name: azure-ai-document-intelligence-dotnet
description: Azure AI Document Intelligence SDK for .NET. Extract text, tables, and structured data from documents using prebuilt and custom models.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.AI.DocumentIntelligence (.NET)

Extract text, tables, and structured data from documents using prebuilt and custom models.

## Installation

```bash
dotnet add package Azure.AI.DocumentIntelligence
dotnet add package Azure.Identity
```

**Current Version**: v1.0.0 (GA)

## Environment Variables

```bash
DOCUMENT_INTELLIGENCE_ENDPOINT=https://<resource-name>.cognitiveservices.azure.com/
DOCUMENT_INTELLIGENCE_API_KEY=<your-api-key>
BLOB_CONTAINER_SAS_URL=https://<storage>.blob.core.windows.net/<container>?<sas-token>
```

## Authentication

### Microsoft Entra ID (Recommended)

```csharp
using Azure.Identity;
using Azure.AI.DocumentIntelligence;

string endpoint = Environment.GetEnvironmentVariable("DOCUMENT_INTELLIGENCE_ENDPOINT");
var credential = new DefaultAzureCredential();
var client = new DocumentIntelligenceClient(new Uri(endpoint), credential);
```

> **Note**: Entra ID requires a **custom subdomain** (e.g., `https://<resource-name>.cognitiveservices.azure.com/`), not a regional endpoint.

### API Key

```csharp
string endpoint = Environment.GetEnvironmentVariable("DOCUMENT_INTELLIGENCE_ENDPOINT");
string apiKey = Environment.GetEnvironmentVariable("DOCUMENT_INTELLIGENCE_API_KEY");
var client = new DocumentIntelligenceClient(new Uri(endpoint), new AzureKeyCredential(apiKey));
```

## Client Types

| Client | Purpose |
|--------|---------|
| `DocumentIntelligenceClient` | Analyze documents, classify documents |
| `DocumentIntelligenceAdministrationClient` | Build/manage custom models and classifiers |

## Prebuilt Models

| Model ID | Description |
|----------|-------------|
| `prebuilt-read` | Extract text, languages, handwriting |
| `prebuilt-layout` | Extract text, tables, selection marks, structure |
| `prebuilt-invoice` | Extract invoice fields (vendor, items, totals) |
| `prebuilt-receipt` | Extract receipt fields (merchant, items, total) |
| `prebuilt-idDocument` | Extract ID document fields (name, DOB, address) |
| `prebuilt-businessCard` | Extract business card fields |
| `prebuilt-tax.us.w2` | Extract W-2 tax form fields |
| `prebuilt-healthInsuranceCard.us` | Extract health insurance card fields |

## Core Workflows

### 1. Analyze Invoice

```csharp
using Azure.AI.DocumentIntelligence;

Uri invoiceUri = new Uri("https://example.com/invoice.pdf");

Operation<AnalyzeResult> operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed, 
    "prebuilt-invoice", 
    invoiceUri);

AnalyzeResult result = operation.Value;

foreach (AnalyzedDocument document in result.Documents)
{
    if (document.Fields.TryGetValue("VendorName", out DocumentField vendorNameField)
        && vendorNameField.FieldType == DocumentFieldType.String)
    {
        string vendorName = vendorNameField.ValueString;
        Console.WriteLine($"Vendor Name: '{vendorName}', confidence: {vendorNameField.Confidence}");
    }

    if (document.Fields.TryGetValue("InvoiceTotal", out DocumentField invoiceTotalField)
        && invoiceTotalField.FieldType == DocumentFieldType.Currency)
    {
        CurrencyValue invoiceTotal = invoiceTotalField.ValueCurrency;
        Console.WriteLine($"Invoice Total: '{invoiceTotal.CurrencySymbol}{invoiceTotal.Amount}'");
    }
    
    // Extract line items
    if (document.Fields.TryGetValue("Items", out DocumentField itemsField)
        && itemsField.FieldType == DocumentFieldType.List)
    {
        foreach (DocumentField item in itemsField.ValueList)
        {
            var itemFields = item.ValueDictionary;
            if (itemFields.TryGetValue("Description", out DocumentField descField))
                Console.WriteLine($"  Item: {descField.ValueString}");
        }
    }
}
```

### 2. Extract Layout (Text, Tables, Structure)

```csharp
Uri fileUri = new Uri("https://example.com/document.pdf");

Operation<AnalyzeResult> operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed, 
    "prebuilt-layout", 
    fileUri);

AnalyzeResult result = operation.Value;

// Extract text by page
foreach (DocumentPage page in result.Pages)
{
    Console.WriteLine($"Page {page.PageNumber}: {page.Lines.Count} lines, {page.Words.Count} words");
    
    foreach (DocumentLine line in page.Lines)
    {
        Console.WriteLine($"  Line: '{line.Content}'");
    }
}

// Extract tables
foreach (DocumentTable table in result.Tables)
{
    Console.WriteLine($"Table: {table.RowCount} rows x {table.ColumnCount} columns");
    foreach (DocumentTableCell cell in table.Cells)
    {
        Console.WriteLine($"  Cell ({cell.RowIndex}, {cell.ColumnIndex}): {cell.Content}");
    }
}
```

### 3. Analyze Receipt

```csharp
Operation<AnalyzeResult> operation = await client.AnalyzeDocumentAsync(
    WaitUntil.Completed, 
    "prebuilt-receipt", 
    receiptUri);

AnalyzeResult result = operation.Value;

foreach (AnalyzedDocument document in result.Documents)
{
    if (document.Fields.TryGetValue("MerchantName", out DocumentField merchantField))
        Console.WriteLine($"Merchant: {merchantField.ValueString}");
        
    if (document.Fields.TryGetValue("Total", out DocumentField totalField))
        Console.WriteLine($"Total: {totalField.ValueCurrency.Amount}");
        
    if (document.Fields.TryGetValue("TransactionDate", out DocumentField dateField))
        Console.WriteLine($"Date: {dateField.ValueDate}");
}
```

### 4. Build Custom Model

```csharp
var adminClient = new DocumentIntelligenceAdministrationClient(
    new Uri(endpoint), 
    new AzureKeyCredential(apiKey));

string modelId = "my-custom-model";
Uri blobContainerUri = new Uri("<blob-container-sas-url>");

var blobSource = new BlobContentSource(blobContainerUri);
var options = new BuildDocumentModelOptions(modelId, DocumentBuildMode.Template, blobSource);

Operation<DocumentModelDetails> operation = await adminClient.BuildDocumentModelAsync(
    WaitUntil.Completed, 
    options);

DocumentModelDetails model = operation.Value;

Console.WriteLine($"Model ID: {model.ModelId}");
Console.WriteLine($"Created: {model.CreatedOn}");

foreach (var docType in model.DocumentTypes)
{
    Console.WriteLine($"Document type: {docType.Key}");
    foreach (var field in docType.Value.FieldSchema)
    {
        Console.WriteLine($"  Field: {field.Key}, Confidence: {docType.Value.FieldConfidence[field.Key]}");
    }
}
```

### 5. Build Document Classifier

```csharp
string classifierId = "my-classifier";
Uri blobContainerUri = new Uri("<blob-container-sas-url>");

var sourceA = new BlobContentSource(blobContainerUri) { Prefix = "TypeA/train" };
var sourceB = new BlobContentSource(blobContainerUri) { Prefix = "TypeB/train" };

var docTypes = new Dictionary<string, ClassifierDocumentTypeDetails>()
{
    { "TypeA", new ClassifierDocumentTypeDetails(sourceA) },
    { "TypeB", new ClassifierDocumentTypeDetails(sourceB) }
};

var options = new BuildClassifierOptions(classifierId, docTypes);

Operation<DocumentClassifierDetails> operation = await adminClient.BuildClassifierAsync(
    WaitUntil.Completed, 
    options);

DocumentClassifierDetails classifier = operation.Value;
Console.WriteLine($"Classifier ID: {classifier.ClassifierId}");
```

### 6. Classify Document

```csharp
string classifierId = "my-classifier";
Uri documentUri = new Uri("https://example.com/document.pdf");

var options = new ClassifyDocumentOptions(classifierId, documentUri);

Operation<AnalyzeResult> operation = await client.ClassifyDocumentAsync(
    WaitUntil.Completed, 
    options);

AnalyzeResult result = operation.Value;

foreach (AnalyzedDocument document in result.Documents)
{
    Console.WriteLine($"Document type: {document.DocumentType}, confidence: {document.Confidence}");
}
```

### 7. Manage Models

```csharp
// Get resource details
DocumentIntelligenceResourceDetails resourceDetails = await adminClient.GetResourceDetailsAsync();
Console.WriteLine($"Custom models: {resourceDetails.CustomDocumentModels.Count}/{resourceDetails.CustomDocumentModels.Limit}");

// Get specific model
DocumentModelDetails model = await adminClient.GetModelAsync("my-model-id");
Console.WriteLine($"Model: {model.ModelId}, Created: {model.CreatedOn}");

// List models
await foreach (DocumentModelDetails modelItem in adminClient.GetModelsAsync())
{
    Console.WriteLine($"Model: {modelItem.ModelId}");
}

// Delete model
await adminClient.DeleteModelAsync("my-model-id");
```

## Key Types Reference

| Type | Description |
|------|-------------|
| `DocumentIntelligenceClient` | Main client for analysis |
| `DocumentIntelligenceAdministrationClient` | Model management |
| `AnalyzeResult` | Result of document analysis |
| `AnalyzedDocument` | Single document within result |
| `DocumentField` | Extracted field with value and confidence |
| `DocumentFieldType` | String, Date, Number, Currency, etc. |
| `DocumentPage` | Page info (lines, words, selection marks) |
| `DocumentTable` | Extracted table with cells |
| `DocumentModelDetails` | Custom model metadata |
| `BlobContentSource` | Training data source |

## Build Modes

| Mode | Use Case |
|------|----------|
| `DocumentBuildMode.Template` | Fixed layout documents (forms) |
| `DocumentBuildMode.Neural` | Variable layout documents |

## Best Practices

1. **Use DefaultAzureCredential** for production
2. **Reuse client instances** — clients are thread-safe
3. **Handle long-running operations** — Use `WaitUntil.Completed` for simplicity
4. **Check field confidence** — Always verify `Confidence` property
5. **Use appropriate model** — Prebuilt for common docs, custom for specialized
6. **Use custom subdomain** — Required for Entra ID authentication

## Error Handling

```csharp
using Azure;

try
{
    var operation = await client.AnalyzeDocumentAsync(
        WaitUntil.Completed, 
        "prebuilt-invoice", 
        documentUri);
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Error: {ex.Status} - {ex.Message}");
}
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.AI.DocumentIntelligence` | Document analysis (this SDK) | `dotnet add package Azure.AI.DocumentIntelligence` |
| `Azure.AI.FormRecognizer` | Legacy SDK (deprecated) | Use DocumentIntelligence instead |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.AI.DocumentIntelligence |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.ai.documentintelligence |
| GitHub Samples | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/documentintelligence/Azure.AI.DocumentIntelligence/samples |
| Document Intelligence Studio | https://documentintelligence.ai.azure.com/ |
| Prebuilt Models | https://aka.ms/azsdk/formrecognizer/models |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
