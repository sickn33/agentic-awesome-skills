# AWS CDK Patterns and Best Practices

This reference provides detailed patterns, anti-patterns, and best practices for AWS CDK development.

Examples omit imports/required props in places; typecheck complete constructs against the installed CDK version. Runtime versions are historical examples; check Lambda lifecycle before new deployment. Lifecycle deletion, NAT, scaling and logging require explicit cost/data-retention decisions. Generated APIs are not automatically authenticated or access-logged.

## Table of Contents

- [Naming Conventions](#naming-conventions)
- [Construct Patterns](#construct-patterns)
- [Security Patterns](#security-patterns)
- [Lambda Integration](#lambda-integration)
- [Testing Patterns](#testing-patterns)
- [Cost Optimization](#cost-optimization)
- [Anti-Patterns](#anti-patterns)

## Naming Conventions

### Automatic Resource Naming (Recommended)

Let CDK and CloudFormation generate unique resource names automatically:

**Benefits**:
- Enables multiple deployments in the same region/account
- Supports parallel environments (dev, staging, prod)
- Prevents naming conflicts
- Allows stack cloning and testing

**Example**:
```typescript
// ✅ GOOD - Automatic naming
const bucket = new s3.Bucket(this, 'DataBucket', {
  // No bucketName specified
  encryption: s3.BucketEncryption.S3_MANAGED,
});
```

### When Explicit Naming is Required

Some scenarios require explicit names:
- Resources referenced by external systems
- Resources that must maintain consistent names across deployments
- Cross-stack references requiring stable names

**Pattern**: Use logical prefixes and environment suffixes
```typescript
// Only when absolutely necessary
const bucket = new s3.Bucket(this, 'DataBucket', {
  bucketName: `${props.projectName}-data-${props.environment}`,
});
```

## Construct Patterns

### L3 Constructs (Patterns)

Prefer high-level patterns that encapsulate best practices:

```typescript
import * as patterns from 'aws-cdk-lib/aws-apigateway';

new patterns.LambdaRestApi(this, 'MyApi', {
  handler: myFunction,
  // Includes CloudWatch Logs, IAM roles, and API Gateway configuration
});
```

### Custom Constructs

Create reusable constructs for repeated patterns:

```typescript
export class ApiWithDatabase extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ApiWithDatabaseProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const handler = new NodejsFunction(this, 'Handler', {
      entry: props.handlerEntry,
      environment: {
        TABLE_NAME: this.table.tableName,
      },
    });

    this.table.grantReadWriteData(handler);

    this.api = new apigateway.LambdaRestApi(this, 'Api', {
      handler,
    });
  }
}
```

## Security Patterns

### IAM Least Privilege

Use grant methods instead of broad policies:

```typescript
// ✅ GOOD - Specific grants
const table = new dynamodb.Table(this, 'Table', { /* ... */ });
const fn = new lambda.Function(this, 'Function', { /* required code/runtime/handler omitted */ });

table.grantReadWriteData(fn);

// ❌ BAD - Overly broad permissions
fn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['dynamodb:*'],
  resources: ['*'],
}));
```

### Secrets Management

Use Secrets Manager for sensitive data:

```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

const secret = new secretsmanager.Secret(this, 'DbPassword', {
  generateSecretString: {
    secretStringTemplate: JSON.stringify({ username: 'admin' }),
    generateStringKey: 'password',
    excludePunctuation: true,
  },
});

// Grant read access to Lambda
secret.grantRead(myFunction);
```

### VPC Configuration

Follow VPC best practices:

```typescript
const vpc = new ec2.Vpc(this, 'Vpc', {
  maxAzs: 2,
  natGateways: 1, // Cost optimization: use 1 for dev, 2+ for prod
  subnetConfiguration: [
    {
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
    },
    {
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 24,
    },
    {
      name: 'Isolated',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: 24,
    },
  ],
});
```

## Lambda Integration

### NodejsFunction (TypeScript/JavaScript)

```typescript
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

const fn = new NodejsFunction(this, 'Function', {
  entry: 'src/handlers/process.ts',
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    TABLE_NAME: table.tableName,
  },
  bundling: {
    minify: true,
    sourceMap: true,
    externalModules: ['@aws-sdk/*'], // Use AWS SDK from Lambda runtime
  },
});
```

### PythonFunction

```typescript
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

const fn = new PythonFunction(this, 'Function', {
  entry: 'src/handlers',
  index: 'process.py',
  handler: 'handler',
  runtime: lambda.Runtime.PYTHON_3_12,
  timeout: Duration.seconds(30),
  memorySize: 512,
});
```

### Lambda Layers

Share code across functions:

```typescript
const layer = new lambda.LayerVersion(this, 'CommonLayer', {
  code: lambda.Code.fromAsset('layers/common'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description: 'Common utilities',
});

new NodejsFunction(this, 'Function', {
  entry: 'src/handler.ts',
  layers: [layer],
});
```

## Testing Patterns

### Snapshot Testing

```typescript
import { Template } from 'aws-cdk-lib/assertions';

test('Stack creates expected resources', () => {
  const app = new cdk.App();
  const stack = new MyStack(app, 'TestStack');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
```

### Fine-Grained Assertions

```typescript
test('Lambda has correct environment', () => {
  const app = new cdk.App();
  const stack = new MyStack(app, 'TestStack');

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs20.x',
    Timeout: 30,
    Environment: {
      Variables: {
        TABLE_NAME: { Ref: Match.anyValue() },
      },
    },
  });
});
```

### Resource Count Validation

```typescript
test('Stack has correct number of functions', () => {
  const app = new cdk.App();
  const stack = new MyStack(app, 'TestStack');

  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 3);
});
```

## Cost Optimization

### Right-Sizing Lambda

```typescript
// Development
const devFunction = new NodejsFunction(this, 'DevFunction', {
  memorySize: 256, // Lower for dev
  timeout: Duration.seconds(30),
});

// Production
const prodFunction = new NodejsFunction(this, 'ProdFunction', {
  memorySize: 1024, // Higher for prod performance
  timeout: Duration.seconds(10),
  reservedConcurrentExecutions: 10, // Limits concurrency, not total spend
});
```

### DynamoDB Billing Modes

```typescript
// Development/Low Traffic
const devTable = new dynamodb.Table(this, 'DevTable', {
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
});

// Production/Predictable Load
const prodTable = new dynamodb.Table(this, 'ProdTable', {
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 5,
  writeCapacity: 5,
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
});
prodTable.autoScaleReadCapacity({ minCapacity: 5, maxCapacity: 100 }).scaleOnUtilization({ targetUtilizationPercent: 70 });
prodTable.autoScaleWriteCapacity({ minCapacity: 5, maxCapacity: 100 }).scaleOnUtilization({ targetUtilizationPercent: 70 });
```

### S3 Lifecycle Policies

```typescript
const bucket = new s3.Bucket(this, 'DataBucket', {
  lifecycleRules: [
    {
      id: 'MoveToIA',
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: Duration.days(30),
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: Duration.days(90),
        },
      ],
    },
    {
      id: 'CleanupOldVersions',
      noncurrentVersionExpiration: Duration.days(30),
    },
  ],
});
```

## Anti-Patterns

### ❌ Hardcoded Values

```typescript
// BAD
new lambda.Function(this, 'Function', {
  functionName: 'my-function', // Prevents multiple deployments
  code: lambda.Code.fromAsset('lambda'),
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_20_X,
});

// GOOD
new NodejsFunction(this, 'Function', {
  entry: 'src/handler.ts',
  // Let CDK generate the name
});
```

### ❌ Overly Broad IAM Permissions

```typescript
// BAD
fn.addToRolePolicy(new iam.PolicyStatement({
  actions: ['*'],
  resources: ['*'],
}));

// GOOD
table.grantReadWriteData(fn);
```

### ❌ Manual Dependency Management

```typescript
// BAD - Manual bundling
new lambda.Function(this, 'Function', {
  code: lambda.Code.fromAsset('lambda.zip'), // Pre-bundled manually
  // ...
});

// GOOD - Let CDK handle it
new NodejsFunction(this, 'Function', {
  entry: 'src/handler.ts',
  // CDK handles bundling automatically
});
```

### ❌ Missing Environment Variables

```typescript
// BAD
new NodejsFunction(this, 'Function', {
  entry: 'src/handler.ts',
  // Table name hardcoded in Lambda code
});

// GOOD
new NodejsFunction(this, 'Function', {
  entry: 'src/handler.ts',
  environment: {
    TABLE_NAME: table.tableName,
  },
});
```

### ❌ Ignoring Stack Outputs

```typescript
// BAD - No way to reference resources
new MyStack(app, 'Stack', {});

// GOOD - Export important values
class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const api = new apigateway.RestApi(this, 'Api', {});

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'MyApiUrl',
    });
  }
}
```

## Summary

- **Always** let CDK generate resource names unless explicitly required
- **Use** high-level constructs (L2/L3) over low-level (L1)
- **Prefer** grant methods for IAM permissions
- **Leverage** `NodejsFunction` and `PythonFunction` for automatic bundling
- **Test** stacks with assertions and snapshots
- **Optimize** costs based on environment (dev vs prod)
- **Validate** infrastructure before deployment
- **Document** custom constructs and patterns
