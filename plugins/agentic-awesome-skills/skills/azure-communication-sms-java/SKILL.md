---
name: azure-communication-sms-java
description: "Send SMS messages with Azure Communication Services SMS Java SDK. Use when implementing SMS notifications, alerts, OTP delivery, bulk messaging, or delivery reports."
risk: safe
source: community
date_added: "2026-02-27"
---

# Azure Communication SMS (Java)

Send SMS messages to single or multiple recipients with delivery reporting.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-communication-sms</artifactId>
    <version>1.2.0</version>
</dependency>
```

## Client Creation

```java
import com.azure.communication.sms.SmsClient;
import com.azure.communication.sms.SmsClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;

// With DefaultAzureCredential (recommended)
SmsClient smsClient = new SmsClientBuilder()
    .endpoint("https://<resource>.communication.azure.com")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();

// With connection string
SmsClient smsClient = new SmsClientBuilder()
    .connectionString("<connection-string>")
    .buildClient();

// With AzureKeyCredential
import com.azure.core.credential.AzureKeyCredential;

SmsClient smsClient = new SmsClientBuilder()
    .endpoint("https://<resource>.communication.azure.com")
    .credential(new AzureKeyCredential("<access-key>"))
    .buildClient();

// Async client
SmsAsyncClient smsAsyncClient = new SmsClientBuilder()
    .connectionString("<connection-string>")
    .buildAsyncClient();
```

## Send SMS to Single Recipient

```java
import com.azure.communication.sms.models.SmsSendResult;

// Simple send
SmsSendResult result = smsClient.send(
    "+14255550100",      // From (your ACS phone number)
    "+14255551234",      // To
    "Your verification code is 123456");

System.out.println("Message ID: " + result.getMessageId());
System.out.println("To: " + result.getTo());
System.out.println("Success: " + result.isSuccessful());

if (!result.isSuccessful()) {
    System.out.println("Error: " + result.getErrorMessage());
    System.out.println("Status: " + result.getHttpStatusCode());
}
```

## Send SMS to Multiple Recipients

```java
import com.azure.communication.sms.models.SmsSendOptions;
import java.util.Arrays;
import java.util.List;

List<String> recipients = Arrays.asList(
    "+14255551111",
    "+14255552222",
    "+14255553333"
);

// With options
SmsSendOptions options = new SmsSendOptions()
    .setDeliveryReportEnabled(true)
    .setTag("marketing-campaign-001");

Iterable<SmsSendResult> results = smsClient.sendWithResponse(
    "+14255550100",      // From
    recipients,          // To list
    "Flash sale! 50% off today only.",
    options,
    Context.NONE
).getValue();

for (SmsSendResult result : results) {
    if (result.isSuccessful()) {
        System.out.println("Sent to " + result.getTo() + ": " + result.getMessageId());
    } else {
        System.out.println("Failed to " + result.getTo() + ": " + result.getErrorMessage());
    }
}
```

## Send Options

```java
SmsSendOptions options = new SmsSendOptions();

// Enable delivery reports (sent via Event Grid)
options.setDeliveryReportEnabled(true);

// Add custom tag for tracking
options.setTag("order-confirmation-12345");
```

## Response Handling

```java
import com.azure.core.http.rest.Response;

Response<Iterable<SmsSendResult>> response = smsClient.sendWithResponse(
    "+14255550100",
    Arrays.asList("+14255551234"),
    "Hello!",
    new SmsSendOptions().setDeliveryReportEnabled(true),
    Context.NONE
);

// Check HTTP response
System.out.println("Status code: " + response.getStatusCode());
System.out.println("Headers: " + response.getHeaders());

// Process results
for (SmsSendResult result : response.getValue()) {
    System.out.println("Message ID: " + result.getMessageId());
    System.out.println("Successful: " + result.isSuccessful());
    
    if (!result.isSuccessful()) {
        System.out.println("HTTP Status: " + result.getHttpStatusCode());
        System.out.println("Error: " + result.getErrorMessage());
    }
}
```

## Async Operations

```java
import reactor.core.publisher.Mono;

SmsAsyncClient asyncClient = new SmsClientBuilder()
    .connectionString("<connection-string>")
    .buildAsyncClient();

// Send single message
asyncClient.send("+14255550100", "+14255551234", "Async message!")
    .subscribe(
        result -> System.out.println("Sent: " + result.getMessageId()),
        error -> System.out.println("Error: " + error.getMessage())
    );

// Send to multiple with options
SmsSendOptions options = new SmsSendOptions()
    .setDeliveryReportEnabled(true);

asyncClient.sendWithResponse(
    "+14255550100",
    Arrays.asList("+14255551111", "+14255552222"),
    "Bulk async message",
    options)
    .subscribe(response -> {
        for (SmsSendResult result : response.getValue()) {
            System.out.println("Result: " + result.getTo() + " - " + result.isSuccessful());
        }
    });
```

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;

try {
    SmsSendResult result = smsClient.send(
        "+14255550100",
        "+14255551234",
        "Test message"
    );
    
    // Individual message errors don't throw exceptions
    if (!result.isSuccessful()) {
        handleMessageError(result);
    }
    
} catch (HttpResponseException e) {
    // Request-level failures (auth, network, etc.)
    System.out.println("Request failed: " + e.getMessage());
    System.out.println("Status: " + e.getResponse().getStatusCode());
} catch (RuntimeException e) {
    System.out.println("Unexpected error: " + e.getMessage());
}

private void handleMessageError(SmsSendResult result) {
    int status = result.getHttpStatusCode();
    String error = result.getErrorMessage();
    
    if (status == 400) {
        System.out.println("Invalid phone number: " + result.getTo());
    } else if (status == 429) {
        System.out.println("Rate limited - retry later");
    } else {
        System.out.println("Error " + status + ": " + error);
    }
}
```

## Delivery Reports

Delivery reports are sent via Azure Event Grid. Configure an Event Grid subscription for your ACS resource.

```java
// Event Grid webhook handler (in your endpoint)
public void handleDeliveryReport(String eventJson) {
    // Parse Event Grid event
    // Event type: Microsoft.Communication.SMSDeliveryReportReceived
    
    // Event data contains:
    // - messageId: correlates to SmsSendResult.getMessageId()
    // - from: sender number
    // - to: recipient number
    // - deliveryStatus: "Delivered", "Failed", etc.
    // - deliveryStatusDetails: detailed status
    // - receivedTimestamp: when status was received
    // - tag: your custom tag from SmsSendOptions
}
```

## SmsSendResult Properties

| Property | Type | Description |
|----------|------|-------------|
| `getMessageId()` | String | Unique message identifier |
| `getTo()` | String | Recipient phone number |
| `isSuccessful()` | boolean | Whether send succeeded |
| `getHttpStatusCode()` | int | HTTP status for this recipient |
| `getErrorMessage()` | String | Error details if failed |
| `getRepeatabilityResult()` | RepeatabilityResult | Idempotency result |

## Environment Variables

```bash
AZURE_COMMUNICATION_ENDPOINT=https://<resource>.communication.azure.com
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://...;accesskey=...
SMS_FROM_NUMBER=+14255550100
```

## Best Practices

1. **Phone Number Format** - Use E.164 format: `+[country code][number]`
2. **Delivery Reports** - Enable for critical messages (OTP, alerts)
3. **Tagging** - Use tags to correlate messages with business context
4. **Error Handling** - Check `isSuccessful()` for each recipient individually
5. **Rate Limiting** - Implement retry with backoff for 429 responses
6. **Bulk Sending** - Use batch send for multiple recipients (more efficient)

## Trigger Phrases

- "send SMS Java", "text message Java"
- "SMS notification", "OTP SMS", "bulk SMS"
- "delivery report SMS", "Azure Communication Services SMS"

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
