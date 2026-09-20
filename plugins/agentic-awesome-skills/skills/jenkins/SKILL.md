---
name: jenkins
description: Create and manage Jenkins CI/CD pipelines, configure agents, manage plugins,
  and automate builds.
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

# Jenkins

Build, test, and deploy applications using Jenkins, the leading open-source automation server.

## When to Use This Skill

Use this skill when:
- Setting up Jenkins pipelines (declarative or scripted)
- Configuring Jenkins agents and executors
- Managing Jenkins plugins and security
- Creating shared libraries for pipeline reuse
- Integrating Jenkins with external tools

## Prerequisites

- Jenkins server (2.x or later)
- Admin access to Jenkins
- Java 11+ on Jenkins server
- Basic Groovy understanding for pipelines

## Declarative Pipeline

Create `Jenkinsfile` in repository root:

```groovy
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'registry.example.com'
        APP_NAME = 'myapp'
    }
    
    stages {
        stage('Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit 'test-results/*.xml'
                }
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh './deploy.sh'
            }
        }
    }
    
    post {
        failure {
            mail to: 'team@example.com',
                 subject: "Pipeline Failed: ${env.JOB_NAME}",
                 body: "Check console output at ${env.BUILD_URL}"
        }
    }
}
```

## Agent Configuration

### Docker Agent

```groovy
pipeline {
    agent {
        docker {
            image 'node:20'
            args '-v /tmp:/tmp'
        }
    }
    stages {
        stage('Build') {
            steps {
                sh 'npm ci && npm run build'
            }
        }
    }
}
```

### Kubernetes Agent

```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
                apiVersion: v1
                kind: Pod
                spec:
                  containers:
                  - name: node
                    image: node:20
                    command:
                    - sleep
                    args:
                    - infinity
                  - name: docker
                    image: docker:24-dind
                    securityContext:
                      privileged: true
            '''
        }
    }
    stages {
        stage('Build') {
            steps {
                container('node') {
                    sh 'npm ci && npm run build'
                }
            }
        }
    }
}
```

### Labeled Agents

```groovy
pipeline {
    agent { label 'linux && docker' }
    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
    }
}
```

## Parameters

```groovy
pipeline {
    agent any
    
    parameters {
        string(name: 'BRANCH', defaultValue: 'main', description: 'Branch to build')
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: 'Target environment')
        booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'Run tests?')
    }
    
    stages {
        stage('Deploy') {
            when {
                expression { params.ENVIRONMENT == 'prod' }
            }
            steps {
                sh "deploy.sh ${params.ENVIRONMENT}"
            }
        }
    }
}
```

## Credentials

### Using Credentials

```groovy
pipeline {
    agent any
    
    environment {
        AWS_CREDS = credentials('aws-credentials')
        DOCKER_CREDS = credentials('docker-hub')
    }
    
    stages {
        stage('Deploy') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-token',
                        usernameVariable: 'GH_USER',
                        passwordVariable: 'GH_TOKEN'
                    )
                ]) {
                    sh 'git push https://${GH_USER}:${GH_TOKEN}@github.com/repo.git'
                }
            }
        }
    }
}
```

## Parallel Stages

```groovy
pipeline {
    agent any
    
    stages {
        stage('Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                }
                stage('E2E Tests') {
                    steps {
                        sh 'npm run test:e2e'
                    }
                }
            }
        }
    }
}
```

## Shared Libraries

### Library Structure

```
vars/
├── buildApp.groovy
├── deployApp.groovy
└── notifySlack.groovy
src/
└── com/example/
    └── Pipeline.groovy
resources/
└── templates/
    └── deployment.yaml
```

### Define Shared Step

```groovy
// vars/buildApp.groovy
def call(Map config = [:]) {
    def nodeVersion = config.nodeVersion ?: '20'
    
    docker.image("node:${nodeVersion}").inside {
        sh 'npm ci'
        sh 'npm run build'
    }
}
```

### Use Shared Library

```groovy
@Library('my-shared-library') _

pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                buildApp(nodeVersion: '20')
            }
        }
        stage('Deploy') {
            steps {
                deployApp(environment: 'staging')
            }
        }
    }
    
    post {
        failure {
            notifySlack(channel: '#builds', status: 'FAILED')
        }
    }
}
```

## Scripted Pipeline

```groovy
node('linux') {
    try {
        stage('Checkout') {
            checkout scm
        }
        
        stage('Build') {
            docker.image('node:20').inside {
                sh 'npm ci'
                sh 'npm run build'
            }
        }
        
        stage('Test') {
            sh 'npm test'
        }
        
        if (env.BRANCH_NAME == 'main') {
            stage('Deploy') {
                sh './deploy.sh'
            }
        }
    } catch (e) {
        currentBuild.result = 'FAILURE'
        throw e
    } finally {
        cleanWs()
    }
}
```

## Plugin Management

### Essential Plugins

```groovy
// Install via Jenkins CLI or init.groovy.d
def plugins = [
    'workflow-aggregator',      // Pipeline
    'git',                      // Git integration
    'docker-workflow',          // Docker Pipeline
    'kubernetes',               // Kubernetes agent
    'credentials-binding',      // Credentials
    'blueocean',               // Blue Ocean UI
    'job-dsl',                 // Job DSL
    'configuration-as-code'    // JCasC
]
```

### Configuration as Code

```yaml
# jenkins.yaml
jenkins:
  systemMessage: "Jenkins configured via JCasC"
  numExecutors: 2
  
  securityRealm:
    local:
      users:
        - id: admin
          password: ${ADMIN_PASSWORD}
  
  authorizationStrategy:
    globalMatrix:
      permissions:
        - "Overall/Administer:admin"
        - "Overall/Read:authenticated"

credentials:
  system:
    domainCredentials:
      - credentials:
          - usernamePassword:
              id: "docker-hub"
              username: "user"
              password: ${DOCKER_PASSWORD}
```

## Multibranch Pipeline

```groovy
// Automatically discovers branches with Jenkinsfile
// Configure in Jenkins UI: New Item > Multibranch Pipeline

// Branch-specific behavior in Jenkinsfile
pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            when {
                anyOf {
                    branch 'main'
                    branch 'release/*'
                }
            }
            steps {
                sh './deploy.sh'
            }
        }
    }
}
```

## Common Issues

### Issue: Pipeline Syntax Errors
**Problem**: Jenkinsfile fails to parse
**Solution**: Use Pipeline Syntax generator in Jenkins UI, validate with `jenkins-cli`

### Issue: Agent Not Connecting
**Problem**: Build agents disconnect
**Solution**: Check agent logs, verify network connectivity, increase timeout settings

### Issue: Out of Memory
**Problem**: Jenkins crashes or builds fail with OOM
**Solution**: Increase heap size in `JAVA_OPTS`, clean up old builds

## Best Practices

- Use declarative pipelines for most use cases
- Implement shared libraries for reusable code
- Store Jenkinsfile in source control
- Use credentials plugin for secrets management
- Implement proper cleanup in post blocks
- Configure build retention policies
- Use Blue Ocean for modern UI experience

## Related Skills

- github-actions (`github-actions`) - GitHub native CI/CD
- kubernetes-ops (`kubernetes-ops`) - K8s deployment target
- docker-management (`docker-management`) - Container builds

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
