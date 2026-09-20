---
name: azure-devops
description: Set up Azure Pipelines for CI/CD, configure build and release pipelines,
  manage Azure DevOps projects, and integrate with Azure services.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Azure DevOps Pipelines

Build, test, and deploy applications using Azure Pipelines with YAML or classic editor.

## When to Use This Skill

Use this skill when:
- Creating CI/CD pipelines in Azure DevOps
- Configuring build and release stages
- Managing Azure DevOps service connections
- Deploying to Azure or other cloud platforms
- Setting up multi-stage YAML pipelines

## Prerequisites

- Azure DevOps organization and project
- Service connections for target environments
- Basic YAML understanding
- Azure subscription (for Azure deployments)

## YAML Pipeline Structure

Create `azure-pipelines.yml` in repository root:

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - src/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'
  nodeVersion: '20.x'

stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
          - script: |
              npm ci
              npm run build
            displayName: 'Build application'
          - publish: $(Build.ArtifactStagingDirectory)
            artifact: drop

  - stage: Deploy
    dependsOn: Build
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployWeb
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo Deploying to production
```

## Triggers

### Branch Triggers

```yaml
trigger:
  branches:
    include:
      - main
      - release/*
    exclude:
      - feature/*
  tags:
    include:
      - v*
```

### Pull Request Triggers

```yaml
pr:
  branches:
    include:
      - main
  paths:
    include:
      - src/*
    exclude:
      - docs/*
```

### Scheduled Triggers

```yaml
schedules:
  - cron: '0 2 * * *'
    displayName: 'Nightly build'
    branches:
      include:
        - main
    always: true
```

## Jobs and Stages

### Parallel Jobs

```yaml
stages:
  - stage: Test
    jobs:
      - job: UnitTests
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: npm run test:unit
      
      - job: IntegrationTests
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: npm run test:integration
```

### Matrix Strategy

```yaml
jobs:
  - job: Build
    strategy:
      matrix:
        linux:
          vmImage: 'ubuntu-latest'
        windows:
          vmImage: 'windows-latest'
        mac:
          vmImage: 'macos-latest'
    pool:
      vmImage: $(vmImage)
    steps:
      - script: npm test
```

### Job Dependencies

```yaml
stages:
  - stage: Build
    jobs:
      - job: A
        steps:
          - script: echo Job A
      - job: B
        dependsOn: A
        steps:
          - script: echo Job B
```

## Variables and Parameters

### Variable Groups

```yaml
variables:
  - group: 'production-secrets'
  - name: buildConfiguration
    value: 'Release'
```

### Runtime Parameters

```yaml
parameters:
  - name: environment
    displayName: 'Environment'
    type: string
    default: 'dev'
    values:
      - dev
      - staging
      - prod

stages:
  - stage: Deploy
    variables:
      env: ${{ parameters.environment }}
    jobs:
      - job: Deploy
        steps:
          - script: echo "Deploying to $(env)"
```

### Secret Variables

```yaml
variables:
  - name: mySecret
    value: $(SECRET_FROM_PIPELINE)  # Set in pipeline settings

steps:
  - script: |
      echo "Using secret"
      ./deploy.sh
    env:
      API_KEY: $(mySecret)
```

## Templates

### Job Template

```yaml
# templates/build-job.yml
parameters:
  - name: nodeVersion
    default: '20'

jobs:
  - job: Build
    steps:
      - task: NodeTool@0
        inputs:
          versionSpec: ${{ parameters.nodeVersion }}
      - script: npm ci && npm run build
```

### Using Templates

```yaml
# azure-pipelines.yml
stages:
  - stage: Build
    jobs:
      - template: templates/build-job.yml
        parameters:
          nodeVersion: '20'
```

### Stage Template

```yaml
# templates/deploy-stage.yml
parameters:
  - name: environment
    type: string
  - name: serviceConnection
    type: string

stages:
  - stage: Deploy_${{ parameters.environment }}
    jobs:
      - deployment: Deploy
        environment: ${{ parameters.environment }}
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: ${{ parameters.serviceConnection }}
                    appName: 'myapp-${{ parameters.environment }}'
```

## Deployments

### Environment Deployments

```yaml
stages:
  - stage: DeployStaging
    jobs:
      - deployment: DeployWeb
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: drop
                - script: ./deploy.sh staging
```

### Approval Gates

Configure in Azure DevOps UI:
1. Go to Environments
2. Select environment
3. Add approval check
4. Configure approvers

### Rolling Deployment

```yaml
jobs:
  - deployment: Deploy
    environment: 'production'
    strategy:
      rolling:
        maxParallel: 2
        deploy:
          steps:
            - script: ./deploy.sh
```

## Azure Service Tasks

### Azure Web App Deployment

```yaml
- task: AzureWebApp@1
  inputs:
    azureSubscription: 'my-azure-connection'
    appType: 'webAppLinux'
    appName: 'my-web-app'
    package: '$(Pipeline.Workspace)/drop/*.zip'
```

### Azure Container Apps

```yaml
- task: AzureContainerApps@1
  inputs:
    azureSubscription: 'my-azure-connection'
    containerAppName: 'my-container-app'
    resourceGroup: 'my-rg'
    imageToDeploy: 'myregistry.azurecr.io/myapp:$(Build.BuildId)'
```

### Azure Kubernetes Service

```yaml
- task: KubernetesManifest@0
  inputs:
    action: 'deploy'
    kubernetesServiceConnection: 'my-aks-connection'
    namespace: 'default'
    manifests: |
      $(Pipeline.Workspace)/manifests/deployment.yml
      $(Pipeline.Workspace)/manifests/service.yml
    containers: |
      myregistry.azurecr.io/myapp:$(Build.BuildId)
```

## Docker Builds

```yaml
- task: Docker@2
  inputs:
    containerRegistry: 'my-acr-connection'
    repository: 'myapp'
    command: 'buildAndPush'
    Dockerfile: '**/Dockerfile'
    tags: |
      $(Build.BuildId)
      latest
```

## Self-Hosted Agents

### Install Agent

```bash
# Download agent
mkdir myagent && cd myagent
curl -o vsts-agent.tar.gz https://vstsagentpackage.azureedge.net/agent/3.227.2/vsts-agent-linux-x64-3.227.2.tar.gz
tar zxvf vsts-agent.tar.gz

# Configure
./config.sh --url https://dev.azure.com/myorg --auth pat --token PAT_TOKEN --pool default

# Run as service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Use Self-Hosted Pool

```yaml
pool:
  name: 'my-self-hosted-pool'
  demands:
    - docker
    - Agent.OS -equals Linux
```

## Common Issues

### Issue: Service Connection Fails
**Problem**: Cannot authenticate to Azure
**Solution**: Verify service principal permissions, check connection in project settings

### Issue: Artifact Not Found
**Problem**: Download artifact fails
**Solution**: Ensure publish task ran successfully, check artifact name matches

### Issue: Environment Not Found
**Problem**: Deployment to environment fails
**Solution**: Create environment in Pipelines > Environments first

## Best Practices

- Use YAML pipelines over classic editor
- Implement templates for reusable components
- Use variable groups for shared configuration
- Configure environment approvals for production
- Use service connections with minimal permissions
- Implement artifact versioning
- Cache dependencies for faster builds

## Related Skills

- github-actions (`github-actions`) - GitHub CI/CD alternative
- terraform-azure (`terraform-azure`) - Azure IaC
- azure-aks (`azure-aks`) - AKS deployments

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
