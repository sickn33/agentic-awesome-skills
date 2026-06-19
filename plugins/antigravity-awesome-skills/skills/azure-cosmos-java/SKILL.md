---
name: azure-cosmos-java
description: Azure Cosmos DB SDK for Java. NoSQL database operations with global distribution, multi-model support, and reactive patterns.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Cosmos DB SDK for Java

Client library for Azure Cosmos DB NoSQL API with global distribution and reactive patterns.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-cosmos</artifactId>
    <version>LATEST</version>
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
        <artifactId>azure-cosmos</artifactId>
    </dependency>
</dependencies>
```

## Environment Variables

```bash
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_KEY=<your-primary-key>
```

## Authentication

### Key-based Authentication

```java
import com.azure.cosmos.CosmosClient;
import com.azure.cosmos.CosmosClientBuilder;

CosmosClient client = new CosmosClientBuilder()
    .endpoint(System.getenv("COSMOS_ENDPOINT"))
    .key(System.getenv("COSMOS_KEY"))
    .buildClient();
```

### Async Client

```java
import com.azure.cosmos.CosmosAsyncClient;

CosmosAsyncClient asyncClient = new CosmosClientBuilder()
    .endpoint(serviceEndpoint)
    .key(key)
    .buildAsyncClient();
```

### With Customizations

```java
import com.azure.cosmos.ConsistencyLevel;
import java.util.Arrays;

CosmosClient client = new CosmosClientBuilder()
    .endpoint(serviceEndpoint)
    .key(key)
    .directMode(directConnectionConfig, gatewayConnectionConfig)
    .consistencyLevel(ConsistencyLevel.SESSION)
    .connectionSharingAcrossClientsEnabled(true)
    .contentResponseOnWriteEnabled(true)
    .userAgentSuffix("my-application")
    .preferredRegions(Arrays.asList("West US", "East US"))
    .buildClient();
```

## Client Hierarchy

| Class | Purpose |
|-------|---------|
| `CosmosClient` / `CosmosAsyncClient` | Account-level operations |
| `CosmosDatabase` / `CosmosAsyncDatabase` | Database operations |
| `CosmosContainer` / `CosmosAsyncContainer` | Container/item operations |

## Core Workflow

### Create Database

```java
// Sync
client.createDatabaseIfNotExists("myDatabase")
    .map(response -> client.getDatabase(response.getProperties().getId()));

// Async with chaining
asyncClient.createDatabaseIfNotExists("myDatabase")
    .map(response -> asyncClient.getDatabase(response.getProperties().getId()))
    .subscribe(database -> System.out.println("Created: " + database.getId()));
```

### Create Container

```java
asyncClient.createDatabaseIfNotExists("myDatabase")
    .flatMap(dbResponse -> {
        String databaseId = dbResponse.getProperties().getId();
        return asyncClient.getDatabase(databaseId)
            .createContainerIfNotExists("myContainer", "/partitionKey")
            .map(containerResponse -> asyncClient.getDatabase(databaseId)
                .getContainer(containerResponse.getProperties().getId()));
    })
    .subscribe(container -> System.out.println("Container: " + container.getId()));
```

### CRUD Operations

```java
import com.azure.cosmos.models.PartitionKey;

CosmosAsyncContainer container = asyncClient
    .getDatabase("myDatabase")
    .getContainer("myContainer");

// Create
container.createItem(new User("1", "John Doe", "john@example.com"))
    .flatMap(response -> {
        System.out.println("Created: " + response.getItem());
        // Read
        return container.readItem(
            response.getItem().getId(),
            new PartitionKey(response.getItem().getId()),
            User.class);
    })
    .flatMap(response -> {
        System.out.println("Read: " + response.getItem());
        // Update
        User user = response.getItem();
        user.setEmail("john.doe@example.com");
        return container.replaceItem(
            user,
            user.getId(),
            new PartitionKey(user.getId()));
    })
    .flatMap(response -> {
        // Delete
        return container.deleteItem(
            response.getItem().getId(),
            new PartitionKey(response.getItem().getId()));
    })
    .block();
```

### Query Documents

```java
import com.azure.cosmos.models.CosmosQueryRequestOptions;
import com.azure.cosmos.util.CosmosPagedIterable;

CosmosContainer container = client.getDatabase("myDatabase").getContainer("myContainer");

String query = "SELECT * FROM c WHERE c.status = @status";
CosmosQueryRequestOptions options = new CosmosQueryRequestOptions();

CosmosPagedIterable<User> results = container.queryItems(
    query,
    options,
    User.class
);

results.forEach(user -> System.out.println("User: " + user.getName()));
```

## Key Concepts

### Partition Keys

Choose a partition key with:
- High cardinality (many distinct values)
- Even distribution of data and requests
- Frequently used in queries

### Consistency Levels

| Level | Guarantee |
|-------|-----------|
| Strong | Linearizability |
| Bounded Staleness | Consistent prefix with bounded lag |
| Session | Consistent prefix within session |
| Consistent Prefix | Reads never see out-of-order writes |
| Eventual | No ordering guarantee |

### Request Units (RUs)

All operations consume RUs. Check response headers:

```java
CosmosItemResponse<User> response = container.createItem(user);
System.out.println("RU charge: " + response.getRequestCharge());
```

## Best Practices

1. **Reuse CosmosClient** — Create once, reuse throughout application
2. **Use async client** for high-throughput scenarios
3. **Choose partition key carefully** — Affects performance and scalability
4. **Enable content response on write** for immediate access to created items
5. **Configure preferred regions** for geo-distributed applications
6. **Handle 429 errors** with retry policies (built-in by default)
7. **Use direct mode** for lowest latency in production

## Error Handling

```java
import com.azure.cosmos.CosmosException;

try {
    container.createItem(item);
} catch (CosmosException e) {
    System.err.println("Status: " + e.getStatusCode());
    System.err.println("Message: " + e.getMessage());
    System.err.println("Request charge: " + e.getRequestCharge());
    
    if (e.getStatusCode() == 409) {
        System.err.println("Item already exists");
    } else if (e.getStatusCode() == 429) {
        System.err.println("Rate limited, retry after: " + e.getRetryAfterDuration());
    }
}
```

## Reference Links

| Resource | URL |
|----------|-----|
| Maven Package | https://central.sonatype.com/artifact/com.azure/azure-cosmos |
| API Documentation | https://azuresdkdocs.z19.web.core.windows.net/java/azure-cosmos/latest/index.html |
| Product Docs | https://learn.microsoft.com/azure/cosmos-db/ |
| Samples | https://github.com/Azure-Samples/azure-cosmos-java-sql-api-samples |
| Performance Guide | https://learn.microsoft.com/azure/cosmos-db/performance-tips-java-sdk-v4-sql |
| Troubleshooting | https://learn.microsoft.com/azure/cosmos-db/troubleshoot-java-sdk-v4-sql |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
