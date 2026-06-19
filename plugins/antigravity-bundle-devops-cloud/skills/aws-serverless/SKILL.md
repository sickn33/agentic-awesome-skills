---
name: aws-serverless
description: Specialized skill for building production-ready serverless
  applications on AWS. Covers Lambda functions, API Gateway, DynamoDB, SQS/SNS
  event-driven patterns, SAM/CDK deployment, and cold start optimization.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# AWS Serverless

Specialized skill for building production-ready serverless applications on AWS.
Covers Lambda functions, API Gateway, DynamoDB, SQS/SNS event-driven patterns,
SAM/CDK deployment, and cold start optimization.

## Principles

- Right-size memory and timeout (measure before optimizing)
- Minimize cold starts for latency-sensitive workloads
- Use SnapStart for Java/.NET functions
- Prefer HTTP API over REST API for simple use cases
- Design for failure with DLQs and retries
- Keep deployment packages small
- Use environment variables for configuration
- Implement structured logging with correlation IDs

## Patterns

### Lambda Handler Pattern

Proper Lambda function structure with error handling

**When to use**: Any Lambda function implementation,API handlers, event processors, scheduled tasks

```javascript
// Node.js Lambda Handler
// handler.js

// Initialize outside handler (reused across invocations)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Handler function
exports.handler = async (event, context) => {
  // Optional: Don't wait for event loop to clear (Node.js)
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Parse input based on event source
    const body = typeof event.body === 'string'
      ? JSON.parse(event.body)
      : event.body;

    // Business logic
    const result = await processRequest(body);

    // Return API Gateway compatible response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', JSON.stringify({
      error: error.message,
      stack: error.stack,
      requestId: context.awsRequestId
    }));

    return {
      statusCode: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message || 'Internal server error'
      })
    };
  }
};

async function processRequest(data) {
  // Your business logic here
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { id: data.id }
  }));
  return result.Item;
}
```

```python
# Python Lambda Handler
# handler.py

import json
import os
import logging
import boto3
from botocore.exceptions import ClientError

# Initialize outside handler (reused across invocations)
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def handler(event, context):
    try:
        # Parse input
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event.get('body', {})

        # Business logic
        result = process_request(body)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {e.response['Error']['Message']}")
        return error_response(500, 'Database error')

    except json.JSONDecodeError:
        return error_response(400, 'Invalid JSON')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, 'Internal server error')

def process_request(data):
    response = table.get_item(Key={'id': data['id']})
    return response.get('Item')

def error_response(status_code, message):
    return {
        'statusCode': status_code,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'error': message})
    }
```

### Best_practices

- Initialize clients outside handler (reused across warm invocations)
- Always return proper API Gateway response format
- Log with structured JSON for CloudWatch Insights
- Include request ID in error logs for tracing

### API Gateway Integration Pattern

REST API and HTTP API integration with Lambda

**When to use**: Building REST APIs backed by Lambda,Need HTTP endpoints for functions

```yaml
# template.yaml (SAM)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        TABLE_NAME: !Ref ItemsTable

Resources:
  # HTTP API (recommended for simple use cases)
  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      StageName: prod
      CorsConfiguration:
        AllowOrigins:
          - "*"
        AllowMethods:
          - GET
          - POST
          - DELETE
        AllowHeaders:
          - "*"

  # Lambda Functions
  GetItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/get.handler
      Events:
        GetItem:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: /items/{id}
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ItemsTable

  CreateItemFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/create.handler
      Events:
        CreateItem:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: /items
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ItemsTable

  # DynamoDB Table
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST

Outputs:
  ApiUrl:
    Value: !Sub "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com/prod"
```

```javascript
// src/handlers/get.js
const { getItem } = require('../lib/dynamodb');

exports.handler = async (event) => {
  const id = event.pathParameters?.id;

  if (!id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing id parameter' })
    };
  }

  const item = await getItem(id);

  if (!item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Item not found' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(item)
  };
};
```

### Structure

project/
├── template.yaml      # SAM template
├── src/
│   ├── handlers/
│   │   ├── get.js
│   │   ├── create.js
│   │   └── delete.js
│   └── lib/
│       └── dynamodb.js
└── events/
    └── event.json     # Test events

### Api_comparison

- Http_api:
  - Lower latency (~10ms)
  - Lower cost (50-70% cheaper)
  - Simpler, fewer features
  - Best for: Most REST APIs
- Rest_api:
  - More features (caching, request validation, WAF)
  - Usage plans and API keys
  - Request/response transformation
  - Best for: Complex APIs, enterprise features

### Event-Driven SQS Pattern

Lambda triggered by SQS for reliable async processing

**When to use**: Decoupled, asynchronous processing,Need retry logic and DLQ,Processing messages in batches

```yaml
# template.yaml
Resources:
  ProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/processor.handler
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessingQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures  # Partial batch failure handling

  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 180  # 6x Lambda timeout
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn
        maxReceiveCount: 3

  DeadLetterQueue:
    Type: AWS::SQS::Queue
    Properties:
      MessageRetentionPeriod: 1209600  # 14 days
```

```javascript
// src/handlers/processor.js
exports.handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      await processMessage(body);
    } catch (error) {
      console.error(`Failed to process message ${record.messageId}:`, error);
      // Report this item as failed (will be retried)
      batchItemFailures.push({
        itemIdentifier: record.messageId
      });
    }
  }

  // Return failed items for retry
  return { batchItemFailures };
};

async function processMessage(message) {
  // Your processing logic
  console.log('Processing:', message);

  // Simulate work
  await saveToDatabase(message);
}
```

```python
# Python version
import json
import logging

logger = logging.getLogger()

def handler(event, context):
    batch_item_failures = []

    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            process_message(body)
        except Exception as e:
            logger.error(f"Failed to process {record['messageId']}: {e}")
            batch_item_failures.append({
                'itemIdentifier': record['messageId']
            })

    return {'batchItemFailures': batch_item_failures}
```

### Best_practices

- Set VisibilityTimeout to 6x Lambda timeout
- Use ReportBatchItemFailures for partial batch failure
- Always configure a DLQ for poison messages
- Process messages idempotently

### DynamoDB Streams Pattern

React to DynamoDB table changes with Lambda

**When to use**: Real-time reactions to data changes,Cross-region replication,Audit logging, notifications

```yaml
# template.yaml
Resources:
  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: items
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      BillingMode: PAY_PER_REQUEST
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES

  StreamProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/stream.handler
      Events:
        Stream:
          Type: DynamoDB
          Properties:
            Stream: !GetAtt ItemsTable.StreamArn
            StartingPosition: TRIM_HORIZON
            BatchSize: 100
            MaximumRetryAttempts: 3
            DestinationConfig:
              OnFailure:
                Destination: !GetAtt StreamDLQ.Arn

  StreamDLQ:
    Type: AWS::SQS::Queue
```

```javascript
// src/handlers/stream.js
exports.handler = async (event) => {
  for (const record of event.Records) {
    const eventName = record.eventName;  // INSERT, MODIFY, REMOVE

    // Unmarshall DynamoDB format to plain JS objects
    const newImage = record.dynamodb.NewImage
      ? unmarshall(record.dynamodb.NewImage)
      : null;
    const oldImage = record.dynamodb.OldImage
      ? unmarshall(record.dynamodb.OldImage)
      : null;

    console.log(`${eventName}: `, { newImage, oldImage });

    switch (eventName) {
      case 'INSERT':
        await handleInsert(newImage);
        break;
      case 'MODIFY':
        await handleModify(oldImage, newImage);
        break;
      case 'REMOVE':
        await handleRemove(oldImage);
        break;
    }
  }
};

// Use AWS SDK v3 unmarshall
const { unmarshall } = require('@aws-sdk/util-dynamodb');
```

### Stream_view_types

- KEYS_ONLY: Only key attributes
- NEW_IMAGE: After modification
- OLD_IMAGE: Before modification
- NEW_AND_OLD_IMAGES: Both before and after

### Cold Start Optimization Pattern

Minimize Lambda cold start latency

**When to use**: Latency-sensitive applications,User-facing APIs,High-traffic functions

## 1. Optimize Package Size

```javascript
// Use modular AWS SDK v3 imports
// GOOD - only imports what you need
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// BAD - imports entire SDK
const AWS = require('aws-sdk');  // Don't do this!
```

## 2. Use SnapStart (Java/.NET)

```yaml
# template.yaml
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: com.example.Handler::handleRequest
      Runtime: java21
      SnapStart:
        ApplyOn: PublishedVersions  # Enable SnapStart
      AutoPublishAlias: live
```

## 3. Right-size Memory

```yaml
# More memory = more CPU = faster init
Resources:
  FastFunction:
    Type: AWS::Serverless::Function
    Properties:
      MemorySize: 1024  # 1GB gets full vCPU
      Timeout: 30
```

## 4. Provisioned Concurrency (when needed)

```yaml
Resources:
  CriticalFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: src/handlers/critical.handler
      AutoPublishAlias: live

  ProvisionedConcurrency:
    Type: AWS::Lambda::ProvisionedConcurrencyConfig
    Properties:
      FunctionName: !Ref CriticalFunction
      Qualifier: live
      ProvisionedConcurrentExecutions: 5
```

## 5. Keep Init Light

```python
# GOOD - Lazy initialization
_table = None

def get_table():
    global _table
    if _table is None:
        dynamodb = boto3.resource('dynamodb')
        _table = dynamodb.Table(os.environ['TABLE_NAME'])
    return _table

def handler(event, context):
    table = get_table()  # Only initializes on first use
    # ...
```

### Optimization_priority

- 1: Reduce package size (biggest impact)
- 2: Use SnapStart for Java/.NET
- 3: Increase memory for faster init
- 4: Delay heavy imports
- 5: Provisioned concurrency (last resort)

### SAM Local Development Pattern

Local testing and debugging with SAM CLI

**When to use**: Local development and testing,Debugging Lambda functions,Testing API Gateway locally

```bash
# Install SAM CLI
pip install aws-sam-cli

# Initialize new project
sam init --runtime nodejs20.x --name my-api

# Build the project
sam build

# Run locally
sam local start-api

# Invoke single function
sam local invoke GetItemFunction --event events/get.json

# Local debugging (Node.js with VS Code)
sam local invoke --debug-port 5858 GetItemFunction

# Deploy
sam deploy --guided
```

```json
// events/get.json (test event)
{
  "pathParameters": {
    "id": "123"
  },
  "httpMethod": "GET",
  "path": "/items/123"
}
```

```json
// .vscode/launch.json (for debugging)
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to SAM CLI",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 5858,
      "localRoot": "${workspaceRoot}/src",
      "remoteRoot": "/var/task/src",
      "protocol": "inspector"
    }
  ]
}
```

### Commands

- Sam_build: Build Lambda deployment packages
- Sam_local_start_api: Start local API Gateway
- Sam_local_invoke: Invoke single function
- Sam_deploy: Deploy to AWS
- Sam_logs: Tail CloudWatch logs

### CDK Serverless Pattern

Infrastructure as code with AWS CDK

**When to use**: Complex infrastructure beyond Lambda,Prefer programming languages over YAML,Need reusable constructs

```typescript
// lib/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev only
    });

    // Lambda Function
    const getItemFn = new lambda.Function(this, 'GetItemFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'get.handler',
      code: lambda.Code.fromAsset('src/handlers'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions
    table.grantReadData(getItemFn);

    // API Gateway
    const api = new apigateway.RestApi(this, 'ItemsApi', {
      restApiName: 'Items Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const items = api.root.addResource('items');
    const item = items.addResource('{id}');

    item.addMethod('GET', new apigateway.LambdaIntegration(getItemFn));

    // Output API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
```

```bash
# CDK commands
npm install -g aws-cdk
cdk init app --language typescript
cdk synth    # Generate CloudFormation
cdk diff     # Show changes
cdk deploy   # Deploy to AWS
```

## Sharp Edges

### Cold Start INIT Phase Now Billed (Aug 2025)

Severity: HIGH

Situation: Running Lambda functions in production

Symptoms:
Unexplained increase in Lambda costs (10-50% higher).
Bill includes charges for function initialization.
Functions with heavy startup logic cost more than expected.

Why this breaks:
As of August 1, 2025, AWS bills the INIT phase the same way it bills
invocation duration. Previously, cold start initialization wasn't billed
for the full duration.

This affects functions with:
- Heavy dependency loading (large packages)
- Slow initialization code
- Frequent cold starts (low traffic or poor concurrency)

Cold starts now directly impact your bill, not just latency.

Recommended fix:

## Measure your INIT phase

```bash
# Check CloudWatch Logs for INIT_REPORT
# Look for Init Duration in milliseconds

# Example log line:
# INIT_REPORT Init Duration: 423.45 ms
```

## Reduce INIT duration

```javascript
// 1. Minimize package size
// Use tree shaking, exclude dev dependencies
// npm prune --production

// 2. Lazy load heavy dependencies
let heavyLib = null;
function getHeavyLib() {
  if (!heavyLib) {
    heavyLib = require('heavy-library');
  }
  return heavyLib;
}

// 3. Use AWS SDK v3 modular imports
const { S3Client } = require('@aws-sdk/client-s3');
// NOT: const AWS = require('aws-sdk');
```

## Use SnapStart for Java/.NET

```yaml
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: java21
      SnapStart:
        ApplyOn: PublishedVersions
```

## Monitor cold start frequency

```javascript
// Track cold starts with custom metric
let isColdStart = true;

exports.handler = async (event) => {
  if (isColdStart) {
    console.log('COLD_START');
    // CloudWatch custom metric here
    isColdStart = false;
  }
  // ...
};
```

### Lambda Timeout Misconfiguration

Severity: HIGH

Situation: Running Lambda functions, especially with external calls

Symptoms:
Function times out unexpectedly.
"Task timed out after X seconds" in logs.
Partial processing with no response.
Silent failures with no error caught.

Why this breaks:
Default Lambda timeout is only 3 seconds. Maximum is 15 minutes.

Common timeout causes:
- Default timeout too short for workload
- Downstream service taking longer than expected
- Network issues in VPC
- Infinite loops or blocking operations
- S3 downloads larger than expected

Lambda terminates at timeout without graceful shutdown.

Recommended fix:

## Set appropriate timeout

```yaml
# template.yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Timeout: 30  # Seconds (max 900)
      # Set to expected duration + buffer
```

## Implement timeout awareness

```javascript
exports.handler = async (event, context) => {
  // Get remaining time
  const remainingTime = context.getRemainingTimeInMillis();

  // If running low on time, fail gracefully
  if (remainingTime < 5000) {
    console.warn('Running low on time, aborting');
    throw new Error('Insufficient time remaining');
  }

  // For long operations, check periodically
  for (const item of items) {
    if (context.getRemainingTimeInMillis() < 10000) {
      // Save progress and exit gracefully
      await saveProgress(processedItems);
      throw new Error('Timeout approaching, saved progress');
    }
    await processItem(item);
  }
};
```

## Set downstream timeouts

```javascript
const axios = require('axios');

// Always set timeouts on HTTP calls
const response = await axios.get('https://api.example.com/data', {
  timeout: 5000  // 5 seconds
});
```

### Out of Memory (OOM) Crash

Severity: HIGH

Situation: Lambda function processing data

Symptoms:
Function stops abruptly without error.
CloudWatch logs appear truncated.
"Max Memory Used" hits configured limit.
Inconsistent behavior under load.

Why this breaks:
When Lambda exceeds memory allocation, AWS forcibly terminates
the runtime. This happens without raising a catchable exception.

Common causes:
- Processing large files in memory
- Memory leaks across invocations
- Buffering entire response bodies
- Heavy libraries consuming too much memory

Recommended fix:

## Increase memory allocation

```yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      MemorySize: 1024  # MB (128-10240)
      # More memory = more CPU too
```

## Stream large data

```javascript
// BAD - loads entire file into memory
const data = await s3.getObject(params).promise();
const content = data.Body.toString();

// GOOD - stream processing
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({});

const response = await s3.send(new GetObjectCommand(params));
const stream = response.Body;

// Process stream in chunks
for await (const chunk of stream) {
  await processChunk(chunk);
}
```

## Monitor memory usage

```javascript
exports.handler = async (event, context) => {
  const used = process.memoryUsage();
  console.log('Memory:', {
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB'
  });
  // ...
};
```

## Use Lambda Power Tuning

```bash
# Find optimal memory setting
# https://github.com/alexcasalboni/aws-lambda-power-tuning
```

### VPC-Attached Lambda Cold Start Delay

Severity: MEDIUM

Situation: Lambda functions in VPC accessing private resources

Symptoms:
Extremely slow cold starts (was 10+ seconds, now ~100ms).
Timeouts on first invocation after idle period.
Functions work in VPC but slow compared to non-VPC.

Why this breaks:
Lambda functions in VPC need Elastic Network Interfaces (ENIs).
AWS improved this significantly with Hyperplane ENIs, but:

- First cold start in VPC still has overhead
- NAT Gateway issues can cause timeouts
- Security group misconfig blocks traffic
- DNS resolution can be slow

Recommended fix:

## Verify VPC configuration

```yaml
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2  # Multiple AZs

  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Lambda SG
      VpcId: !Ref VPC
      SecurityGroupEgress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0  # Allow HTTPS outbound
```

## Use VPC endpoints for AWS services

```yaml
# Avoid NAT Gateway for AWS service calls
DynamoDBEndpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    ServiceName: !Sub com.amazonaws.${AWS::Region}.dynamodb
    VpcId: !Ref VPC
    RouteTableIds:
      - !Ref PrivateRouteTable
    VpcEndpointType: Gateway

S3Endpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    ServiceName: !Sub com.amazonaws.${AWS::Region}.s3
    VpcId: !Ref VPC
    VpcEndpointType: Gateway
```

## Only use VPC when necessary

Don't attach Lambda to VPC unless you need:
- Access to RDS/ElastiCache in VPC
- Access to private EC2 instances
- Compliance requirements

Most AWS services can be accessed without VPC.

### Node.js Event Loop Not Cleared

Severity: MEDIUM

Situation: Node.js Lambda function with callbacks or timers

Symptoms:
Function takes full timeout duration to return.
"Task timed out" even though logic completed.
Extra billing for idle time.

Why this breaks:
By default, Lambda waits for the Node.js event loop to be empty
before returning. If you have:
- Unresolved setTimeout/setInterval
- Dangling database connections
- Pending callbacks

Lambda waits until timeout, even if your response was ready.

Recommended fix:

## Tell Lambda not to wait for event loop

```javascript
exports.handler = async (event, context) => {
  // Don't wait for event loop to clear
  context.callbackWaitsForEmptyEventLoop = false;

  // Your code here
  const result = await processRequest(event);

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
```

## Close connections properly

```javascript
// For database connections, use connection pooling
// or close connections explicitly

const mysql = require('mysql2/promise');

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const connection = await mysql.createConnection({...});
  try {
    const [rows] = await connection.query('SELECT * FROM users');
    return { statusCode: 200, body: JSON.stringify(rows) };
  } finally {
    await connection.end();  // Always close
  }
};
```

### API Gateway Payload Size Limits

Severity: MEDIUM

Situation: Returning large responses or receiving large requests

Symptoms:
"413 Request Entity Too Large" error
"Execution failed due to configuration error: Malformed Lambda proxy response"
Response truncated or failed

Why this breaks:
API Gateway has hard payload limits:
- REST API: 10 MB request/response
- HTTP API: 10 MB request/response
- Lambda itself: 6 MB sync response, 256 KB async

Exceeding these causes failures that may not be obvious.

Recommended fix:

## For large file uploads

```javascript
// Use presigned S3 URLs instead of passing through API Gateway

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  const s3 = new S3Client({});

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `uploads/${Date.now()}.file`
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    statusCode: 200,
    body: JSON.stringify({ uploadUrl })
  };
};
```

## For large responses

```javascript
// Store in S3, return presigned download URL
exports.handler = async (event) => {
  const largeData = await generateLargeReport();

  await s3.send(new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `reports/${reportId}.json`,
    Body: JSON.stringify(largeData)
  }));

  const downloadUrl = await getSignedUrl(s3,
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: `reports/${reportId}.json`
    }),
    { expiresIn: 3600 }
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ downloadUrl })
  };
};
```

### Infinite Loop or Recursive Invocation

Severity: HIGH

Situation: Lambda triggered by events

Symptoms:
Runaway costs.
Thousands of invocations in minutes.
CloudWatch logs show repeated invocations.
Lambda writing to source bucket/table that triggers it.

Why this breaks:
Lambda can accidentally trigger itself:
- S3 trigger writes back to same bucket
- DynamoDB trigger updates same table
- SNS publishes to topic that triggers it
- Step Functions with wrong error handling

Recommended fix:

## Use different buckets/prefixes

```yaml
# S3 trigger with prefix filter
Events:
  S3Event:
    Type: S3
    Properties:
      Bucket: !Ref InputBucket
      Events: s3:ObjectCreated:*
      Filter:
        S3Key:
          Rules:
            - Name: prefix
              Value: uploads/  # Only trigger on uploads/

# Output to different bucket or prefix
# OutputBucket or processed/ prefix
```

## Add idempotency checks

```javascript
exports.handler = async (event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key;

    // Skip if this is a processed file
    if (key.startsWith('processed/')) {
      console.log('Skipping already processed file:', key);
      continue;
    }

    // Process and write to different location
    await processFile(key);
    await writeToS3(`processed/${key}`, result);
  }
};
```

## Set reserved concurrency as circuit breaker

```yaml
Resources:
  RiskyFunction:
    Type: AWS::Serverless::Function
    Properties:
      ReservedConcurrentExecutions: 10  # Max 10 parallel
      # Limits blast radius of runaway invocations
```

## Monitor with CloudWatch alarms

```yaml
InvocationAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    MetricName: Invocations
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1000  # Alert if >1000 invocations/min
    ComparisonOperator: GreaterThanThreshold
```

## Validation Checks

### Hardcoded AWS Credentials

Severity: ERROR

AWS credentials must never be hardcoded

Message: Hardcoded AWS access key detected. Use IAM roles or environment variables.

### AWS Secret Key in Source Code

Severity: ERROR

Secret keys should use Secrets Manager or environment variables

Message: Hardcoded AWS secret key. Use IAM roles or Secrets Manager.

### Overly Permissive IAM Policy

Severity: WARNING

Avoid wildcard permissions in Lambda IAM roles

Message: Overly permissive IAM policy. Use least privilege principle.

### Lambda Handler Without Error Handling

Severity: WARNING

Lambda handlers should have try/catch for graceful errors

Message: Lambda handler without error handling. Add try/catch.

### Missing callbackWaitsForEmptyEventLoop

Severity: INFO

Node.js handlers should set callbackWaitsForEmptyEventLoop

Message: Consider setting context.callbackWaitsForEmptyEventLoop = false

### Default Memory Configuration

Severity: INFO

Default 128MB may be too low for many workloads

Message: Using default 128MB memory. Consider increasing for better performance.

### Low Timeout Configuration

Severity: WARNING

Very low timeout may cause unexpected failures

Message: Timeout of 1-3 seconds may be too low. Increase if making external calls.

### No Dead Letter Queue Configuration

Severity: WARNING

Async functions should have DLQ for failed invocations

Message: No DLQ configured. Add for async invocations.

### Importing Full AWS SDK v2

Severity: WARNING

Import specific clients from AWS SDK v3 for smaller packages

Message: Importing full AWS SDK. Use modular SDK v3 imports for smaller packages.

### Hardcoded DynamoDB Table Name

Severity: WARNING

Table names should come from environment variables

Message: Hardcoded table name. Use environment variable for portability.

## Collaboration

### Delegation Triggers

- user needs GCP serverless -> gcp-cloud-run (Cloud Run for containers, Cloud Functions for events)
- user needs Azure serverless -> azure-functions (Azure Functions, Logic Apps)
- user needs database design -> postgres-wizard (RDS design, or use DynamoDB patterns)
- user needs authentication -> auth-specialist (Cognito, API Gateway authorizers)
- user needs complex workflows -> workflow-automation (Step Functions, EventBridge)
- user needs AI integration -> llm-architect (Lambda calling Bedrock or external LLMs)

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
