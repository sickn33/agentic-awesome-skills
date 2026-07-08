---
name: azure-compute-batch-java
description: Azure Batch SDK for Java. Run large-scale parallel and HPC batch jobs with pools, jobs, tasks, and compute nodes.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Batch SDK for Java

Client library for running large-scale parallel and high-performance computing (HPC) batch jobs in Azure.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-compute-batch</artifactId>
    <version>1.0.0-beta.5</version>
</dependency>
```

## Prerequisites

- Azure Batch account
- Pool configured with compute nodes
- Azure subscription

## Environment Variables

```bash
AZURE_BATCH_ENDPOINT=https://<account>.<region>.batch.azure.com
AZURE_BATCH_ACCOUNT=<account-name>
AZURE_BATCH_ACCESS_KEY=<account-key>
```

## Client Creation

### With Microsoft Entra ID (Recommended)

```java
import com.azure.compute.batch.BatchClient;
import com.azure.compute.batch.BatchClientBuilder;
import com.azure.identity.DefaultAzureCredentialBuilder;

BatchClient batchClient = new BatchClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint(System.getenv("AZURE_BATCH_ENDPOINT"))
    .buildClient();
```

### Async Client

```java
import com.azure.compute.batch.BatchAsyncClient;

BatchAsyncClient batchAsyncClient = new BatchClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint(System.getenv("AZURE_BATCH_ENDPOINT"))
    .buildAsyncClient();
```

### With Shared Key Credentials

```java
import com.azure.core.credential.AzureNamedKeyCredential;

String accountName = System.getenv("AZURE_BATCH_ACCOUNT");
String accountKey = System.getenv("AZURE_BATCH_ACCESS_KEY");
AzureNamedKeyCredential sharedKeyCreds = new AzureNamedKeyCredential(accountName, accountKey);

BatchClient batchClient = new BatchClientBuilder()
    .credential(sharedKeyCreds)
    .endpoint(System.getenv("AZURE_BATCH_ENDPOINT"))
    .buildClient();
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| Pool | Collection of compute nodes that run tasks |
| Job | Logical grouping of tasks |
| Task | Unit of computation (command/script) |
| Node | VM that executes tasks |
| Job Schedule | Recurring job creation |

## Pool Operations

### Create Pool

```java
import com.azure.compute.batch.models.*;

batchClient.createPool(new BatchPoolCreateParameters("myPoolId", "STANDARD_DC2s_V2")
    .setVirtualMachineConfiguration(
        new VirtualMachineConfiguration(
            new BatchVmImageReference()
                .setPublisher("Canonical")
                .setOffer("UbuntuServer")
                .setSku("22_04-lts")
                .setVersion("latest"),
            "batch.node.ubuntu 22.04"))
    .setTargetDedicatedNodes(2)
    .setTargetLowPriorityNodes(0), null);
```

### Get Pool

```java
BatchPool pool = batchClient.getPool("myPoolId");
System.out.println("Pool state: " + pool.getState());
System.out.println("Current dedicated nodes: " + pool.getCurrentDedicatedNodes());
```

### List Pools

```java
import com.azure.core.http.rest.PagedIterable;

PagedIterable<BatchPool> pools = batchClient.listPools();
for (BatchPool pool : pools) {
    System.out.println("Pool: " + pool.getId() + ", State: " + pool.getState());
}
```

### Resize Pool

```java
import com.azure.core.util.polling.SyncPoller;

BatchPoolResizeParameters resizeParams = new BatchPoolResizeParameters()
    .setTargetDedicatedNodes(4)
    .setTargetLowPriorityNodes(2);

SyncPoller<BatchPool, BatchPool> poller = batchClient.beginResizePool("myPoolId", resizeParams);
poller.waitForCompletion();
BatchPool resizedPool = poller.getFinalResult();
```

### Enable AutoScale

```java
BatchPoolEnableAutoScaleParameters autoScaleParams = new BatchPoolEnableAutoScaleParameters()
    .setAutoScaleEvaluationInterval(Duration.ofMinutes(5))
    .setAutoScaleFormula("$TargetDedicatedNodes = min(10, $PendingTasks.GetSample(TimeInterval_Minute * 5));");

batchClient.enablePoolAutoScale("myPoolId", autoScaleParams);
```

### Delete Pool

```java
SyncPoller<BatchPool, Void> deletePoller = batchClient.beginDeletePool("myPoolId");
deletePoller.waitForCompletion();
```

## Job Operations

### Create Job

```java
batchClient.createJob(
    new BatchJobCreateParameters("myJobId", new BatchPoolInfo().setPoolId("myPoolId"))
        .setPriority(100)
        .setConstraints(new BatchJobConstraints()
            .setMaxWallClockTime(Duration.ofHours(24))
            .setMaxTaskRetryCount(3)),
    null);
```

### Get Job

```java
BatchJob job = batchClient.getJob("myJobId", null, null);
System.out.println("Job state: " + job.getState());
```

### List Jobs

```java
PagedIterable<BatchJob> jobs = batchClient.listJobs(new BatchJobsListOptions());
for (BatchJob job : jobs) {
    System.out.println("Job: " + job.getId() + ", State: " + job.getState());
}
```

### Get Task Counts

```java
BatchTaskCountsResult counts = batchClient.getJobTaskCounts("myJobId");
System.out.println("Active: " + counts.getTaskCounts().getActive());
System.out.println("Running: " + counts.getTaskCounts().getRunning());
System.out.println("Completed: " + counts.getTaskCounts().getCompleted());
```

### Terminate Job

```java
BatchJobTerminateParameters terminateParams = new BatchJobTerminateParameters()
    .setTerminationReason("Manual termination");
BatchJobTerminateOptions options = new BatchJobTerminateOptions().setParameters(terminateParams);

SyncPoller<BatchJob, BatchJob> poller = batchClient.beginTerminateJob("myJobId", options, null);
poller.waitForCompletion();
```

### Delete Job

```java
SyncPoller<BatchJob, Void> deletePoller = batchClient.beginDeleteJob("myJobId");
deletePoller.waitForCompletion();
```

## Task Operations

### Create Single Task

```java
BatchTaskCreateParameters task = new BatchTaskCreateParameters("task1", "echo 'Hello World'");
batchClient.createTask("myJobId", task);
```

### Create Task with Exit Conditions

```java
batchClient.createTask("myJobId", new BatchTaskCreateParameters("task2", "cmd /c exit 3")
    .setExitConditions(new ExitConditions()
        .setExitCodeRanges(Arrays.asList(
            new ExitCodeRangeMapping(2, 4, 
                new ExitOptions().setJobAction(BatchJobActionKind.TERMINATE)))))
    .setUserIdentity(new UserIdentity()
        .setAutoUser(new AutoUserSpecification()
            .setScope(AutoUserScope.TASK)
            .setElevationLevel(ElevationLevel.NON_ADMIN))),
    null);
```

### Create Task Collection (up to 100)

```java
List<BatchTaskCreateParameters> taskList = Arrays.asList(
    new BatchTaskCreateParameters("task1", "echo Task 1"),
    new BatchTaskCreateParameters("task2", "echo Task 2"),
    new BatchTaskCreateParameters("task3", "echo Task 3")
);
BatchTaskGroup taskGroup = new BatchTaskGroup(taskList);
BatchCreateTaskCollectionResult result = batchClient.createTaskCollection("myJobId", taskGroup);
```

### Create Many Tasks (no limit)

```java
List<BatchTaskCreateParameters> tasks = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    tasks.add(new BatchTaskCreateParameters("task" + i, "echo Task " + i));
}
batchClient.createTasks("myJobId", tasks);
```

### Get Task

```java
BatchTask task = batchClient.getTask("myJobId", "task1");
System.out.println("Task state: " + task.getState());
System.out.println("Exit code: " + task.getExecutionInfo().getExitCode());
```

### List Tasks

```java
PagedIterable<BatchTask> tasks = batchClient.listTasks("myJobId");
for (BatchTask task : tasks) {
    System.out.println("Task: " + task.getId() + ", State: " + task.getState());
}
```

### Get Task Output

```java
import com.azure.core.util.BinaryData;
import java.nio.charset.StandardCharsets;

BinaryData stdout = batchClient.getTaskFile("myJobId", "task1", "stdout.txt");
System.out.println(new String(stdout.toBytes(), StandardCharsets.UTF_8));
```

### Terminate Task

```java
batchClient.terminateTask("myJobId", "task1", null, null);
```

## Node Operations

### List Nodes

```java
PagedIterable<BatchNode> nodes = batchClient.listNodes("myPoolId", new BatchNodesListOptions());
for (BatchNode node : nodes) {
    System.out.println("Node: " + node.getId() + ", State: " + node.getState());
}
```

### Reboot Node

```java
SyncPoller<BatchNode, BatchNode> rebootPoller = batchClient.beginRebootNode("myPoolId", "nodeId");
rebootPoller.waitForCompletion();
```

### Get Remote Login Settings

```java
BatchNodeRemoteLoginSettings settings = batchClient.getNodeRemoteLoginSettings("myPoolId", "nodeId");
System.out.println("IP: " + settings.getRemoteLoginIpAddress());
System.out.println("Port: " + settings.getRemoteLoginPort());
```

## Job Schedule Operations

### Create Job Schedule

```java
batchClient.createJobSchedule(new BatchJobScheduleCreateParameters("myScheduleId",
    new BatchJobScheduleConfiguration()
        .setRecurrenceInterval(Duration.ofHours(6))
        .setDoNotRunUntil(OffsetDateTime.now().plusDays(1)),
    new BatchJobSpecification(new BatchPoolInfo().setPoolId("myPoolId"))
        .setPriority(50)),
    null);
```

### Get Job Schedule

```java
BatchJobSchedule schedule = batchClient.getJobSchedule("myScheduleId");
System.out.println("Schedule state: " + schedule.getState());
```

## Error Handling

```java
import com.azure.compute.batch.models.BatchErrorException;
import com.azure.compute.batch.models.BatchError;

try {
    batchClient.getPool("nonexistent-pool");
} catch (BatchErrorException e) {
    BatchError error = e.getValue();
    System.err.println("Error code: " + error.getCode());
    System.err.println("Message: " + error.getMessage().getValue());
    
    if ("PoolNotFound".equals(error.getCode())) {
        System.err.println("The specified pool does not exist.");
    }
}
```

## Best Practices

1. **Use Entra ID** — Preferred over shared key for authentication
2. **Use management SDK for pools** — `azure-resourcemanager-batch` supports managed identities
3. **Batch task creation** — Use `createTaskCollection` or `createTasks` for multiple tasks
4. **Handle LRO properly** — Pool resize, delete operations are long-running
5. **Monitor task counts** — Use `getJobTaskCounts` to track progress
6. **Set constraints** — Configure `maxWallClockTime` and `maxTaskRetryCount`
7. **Use low-priority nodes** — Cost savings for fault-tolerant workloads
8. **Enable autoscale** — Dynamically adjust pool size based on workload

## Reference Links

| Resource | URL |
|----------|-----|
| Maven Package | https://central.sonatype.com/artifact/com.azure/azure-compute-batch |
| GitHub | https://github.com/Azure/azure-sdk-for-java/tree/main/sdk/batch/azure-compute-batch |
| API Documentation | https://learn.microsoft.com/java/api/com.azure.compute.batch |
| Product Docs | https://learn.microsoft.com/azure/batch/ |
| REST API | https://learn.microsoft.com/rest/api/batchservice/ |
| Samples | https://github.com/azure/azure-batch-samples |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
