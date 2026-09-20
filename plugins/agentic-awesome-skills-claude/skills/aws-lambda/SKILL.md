---
name: aws-lambda
description: Build and deploy serverless functions on AWS Lambda. Configure triggers,
  manage permissions, and optimize performance. Use when implementing serverless applications.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# AWS Lambda

Build serverless applications with AWS Lambda, covering function creation, event sources, layers, SAM templates, and cold start optimization.

## When to Use This Skill

- Building event-driven applications triggered by API Gateway, S3, SQS, or EventBridge
- Running scheduled tasks (cron) without managing servers
- Processing data streams from Kinesis or DynamoDB
- Building lightweight APIs with API Gateway or function URLs
- Implementing webhooks, Slack bots, or automation scripts
- Reducing compute costs for intermittent or bursty workloads

## Prerequisites

- AWS CLI v2 installed and configured
- IAM permissions: `lambda:*`, `iam:PassRole`, `logs:*`, `apigateway:*`, `s3:*`
- Python 3.11+, Node.js 20+, or another supported runtime installed locally
- (Optional) AWS SAM CLI for local development and deployment

## Create and Deploy a Function

```bash
# Create a deployment package
cd my-function
zip -r function.zip app.py

# Create the Lambda function
aws lambda create-function \
  --function-name my-api-handler \
  --runtime python3.12 \
  --handler app.handler \
  --role arn:aws:iam::123456789012:role/LambdaExecRole \
  --zip-file fileb://function.zip \
  --memory-size 256 \
  --timeout 30 \
  --environment 'Variables={STAGE=production,LOG_LEVEL=INFO}' \
  --architectures arm64 \
  --tracing-config Mode=Active \
  --tags '{"Team":"backend","Environment":"production"}'

# Update function code
aws lambda update-function-code \
  --function-name my-api-handler \
  --zip-file fileb://function.zip

# Update function configuration
aws lambda update-function-configuration \
  --function-name my-api-handler \
  --memory-size 512 \
  --timeout 60 \
  --environment 'Variables={STAGE=production,LOG_LEVEL=WARNING}'

# Publish a version (immutable snapshot)
aws lambda publish-version \
  --function-name my-api-handler \
  --description "v1.2.0 - added rate limiting"

# Create an alias pointing to the version
aws lambda create-alias \
  --function-name my-api-handler \
  --name live \
  --function-version 3

# Weighted alias for canary deployments (90% v3, 10% v4)
aws lambda update-alias \
  --function-name my-api-handler \
  --name live \
  --function-version 4 \
  --routing-config '{"AdditionalVersionWeights":{"3":0.9}}'
```

## Function Code Examples

```python
# app.py - API Gateway handler with structured logging
import json
import logging
import os

logger = logging.getLogger()
logger.setLevel(os.environ.get("LOG_LEVEL", "INFO"))

def handler(event, context):
    """Handle API Gateway proxy event."""
    logger.info("Request: %s %s", event["httpMethod"], event["path"])

    try:
        body = json.loads(event.get("body", "{}"))
        result = process_request(body)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "X-Request-Id": context.aws_request_id
            },
            "body": json.dumps(result)
        }
    except ValueError as e:
        logger.warning("Validation error: %s", e)
        return {"statusCode": 400, "body": json.dumps({"error": str(e)})}
    except Exception as e:
        logger.exception("Unhandled error")
        return {"statusCode": 500, "body": json.dumps({"error": "Internal server error"})}

def process_request(body):
    return {"message": "OK", "data": body}
```

```python
# sqs_processor.py - SQS batch processor with partial failure reporting
import json
import logging

logger = logging.getLogger()
logger.setLevel("INFO")

def handler(event, context):
    """Process SQS messages with partial batch failure reporting."""
    failed_ids = []

    for record in event["Records"]:
        try:
            body = json.loads(record["body"])
            logger.info("Processing message: %s", record["messageId"])
            process_message(body)
        except Exception as e:
            logger.error("Failed message %s: %s", record["messageId"], e)
            failed_ids.append(record["messageId"])

    # Return failed items so only those get retried
    return {
        "batchItemFailures": [
            {"itemIdentifier": msg_id} for msg_id in failed_ids
        ]
    }

def process_message(body):
    pass  # your logic here
```

## Lambda Layers

```bash
# Build a layer for Python dependencies
mkdir -p layer/python
pip install requests boto3-stubs -t layer/python/
cd layer
zip -r ../my-layer.zip python/

# Publish the layer
aws lambda publish-layer-version \
  --layer-name common-deps \
  --description "Shared Python dependencies" \
  --zip-file fileb://my-layer.zip \
  --compatible-runtimes python3.11 python3.12 \
  --compatible-architectures arm64 x86_64

# Attach layer to a function
aws lambda update-function-configuration \
  --function-name my-api-handler \
  --layers "arn:aws:lambda:us-east-1:123456789012:layer:common-deps:1"

# List available layers
aws lambda list-layers --compatible-runtime python3.12
```

## Event Source Mappings

```bash
# SQS trigger with batch processing
aws lambda create-event-source-mapping \
  --function-name sqs-processor \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:my-queue \
  --batch-size 10 \
  --maximum-batching-window-in-seconds 5 \
  --function-response-types ReportBatchItemFailures

# DynamoDB Streams trigger
aws lambda create-event-source-mapping \
  --function-name stream-processor \
  --event-source-arn arn:aws:dynamodb:us-east-1:123456789012:table/my-table/stream/2026-01-01T00:00:00.000 \
  --batch-size 100 \
  --starting-position LATEST \
  --maximum-retry-attempts 3 \
  --bisect-batch-on-function-error \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:us-east-1:123456789012:dlq"}}'

# S3 event notification (via Lambda permission + S3 config)
aws lambda add-permission \
  --function-name image-processor \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::my-uploads-bucket \
  --source-account 123456789012

aws s3api put-bucket-notification-configuration \
  --bucket my-uploads-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:image-processor",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {"Key": {"FilterRules": [{"Name": "suffix", "Value": ".jpg"}]}}
    }]
  }'

# Schedule with EventBridge (cron)
aws events put-rule \
  --name daily-cleanup \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED

aws lambda add-permission \
  --function-name daily-cleanup \
  --statement-id eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:123456789012:rule/daily-cleanup

aws events put-targets \
  --rule daily-cleanup \
  --targets '[{"Id":"1","Arn":"arn:aws:lambda:us-east-1:123456789012:function:daily-cleanup"}]'
```

## Function URLs (No API Gateway Needed)

```bash
# Create a function URL (public HTTPS endpoint)
aws lambda create-function-url-config \
  --function-name my-api-handler \
  --auth-type NONE \
  --cors '{
    "AllowOrigins": ["https://myapp.com"],
    "AllowMethods": ["GET", "POST"],
    "AllowHeaders": ["Content-Type"],
    "MaxAge": 86400
  }'

# Grant public invoke for function URL
aws lambda add-permission \
  --function-name my-api-handler \
  --statement-id function-url-public \
  --action lambda:InvokeFunctionUrl \
  --principal "*" \
  --function-url-auth-type NONE
```

## Cold Start Optimization

```bash
# Enable provisioned concurrency to eliminate cold starts
aws lambda put-provisioned-concurrency-config \
  --function-name my-api-handler \
  --qualifier live \
  --provisioned-concurrent-executions 10

# Set reserved concurrency (throttle limit)
aws lambda put-function-concurrency \
  --function-name my-api-handler \
  --reserved-concurrent-executions 100

# Enable SnapStart for Java functions (near-zero cold starts)
aws lambda update-function-configuration \
  --function-name my-java-handler \
  --snap-start '{"ApplyOn": "PublishedVersions"}'
aws lambda publish-version --function-name my-java-handler
```

Cold start reduction tips:
- Use `arm64` architecture (Graviton) for faster init and lower cost
- Minimize deployment package size; use layers for large dependencies
- Initialize SDK clients outside the handler function
- Avoid VPC unless required (VPC cold starts are longer)
- Use provisioned concurrency for latency-sensitive paths

## SAM Template

```yaml
# template.yaml - AWS SAM application
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: My serverless API

Globals:
  Function:
    Runtime: python3.12
    Architectures: [arm64]
    MemorySize: 256
    Timeout: 30
    Tracing: Active
    Environment:
      Variables:
        STAGE: !Ref Stage
        LOG_LEVEL: INFO

Parameters:
  Stage:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Stage}-api-handler"
      Handler: app.handler
      CodeUri: src/
      Layers:
        - !Ref DepsLayer
      Events:
        GetItems:
          Type: Api
          Properties:
            Path: /items
            Method: get
        PostItem:
          Type: Api
          Properties:
            Path: /items
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref ItemsTable

  QueueProcessor:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Stage}-queue-processor"
      Handler: sqs_processor.handler
      CodeUri: src/
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt ProcessingQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures

  DepsLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: common-deps
      ContentUri: layer/
      CompatibleRuntimes:
        - python3.12

  ItemsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub "${Stage}-items"
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH

  ProcessingQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "${Stage}-processing"
      VisibilityTimeout: 360

Outputs:
  ApiEndpoint:
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod"
```

```bash
# SAM CLI commands
sam build
sam local invoke ApiFunction --event events/get-items.json
sam local start-api --port 3000
sam deploy --guided
sam logs --name ApiFunction --stack-name my-stack --tail
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Function times out | Timeout too low or downstream slow | Increase timeout; check VPC/NAT config |
| Out of memory | Memory limit too small | Increase `--memory-size`; profile with CloudWatch Insights |
| Permission denied on AWS API | Execution role missing policy | Attach required policy to the execution role |
| Cold starts > 5s | Large package or VPC overhead | Use layers, arm64, provisioned concurrency; remove VPC if not needed |
| SQS messages reprocessed | Visibility timeout < function timeout | Set queue visibility timeout to 6x function timeout |
| Event source mapping disabled | Too many consecutive errors | Fix the function error; re-enable the mapping |
| Layer not found | Wrong region or deleted version | Verify layer ARN region matches function region |
| Canary deployment not shifting | Alias routing config wrong | Verify version numbers in routing config |
| Cannot invoke function URL | Missing resource-based policy | Add `lambda:InvokeFunctionUrl` permission |

## Related Skills

- aws-iam (`aws-iam`) - Execution roles and permissions
- terraform-aws (`terraform-aws`) - IaC deployment for Lambda
- aws-s3 (`aws-s3`) - S3 event triggers
- aws-vpc (`aws-vpc`) - VPC configuration for Lambda
- aws-cost-optimization (`aws-cost-optimization`) - Optimizing Lambda spend

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

