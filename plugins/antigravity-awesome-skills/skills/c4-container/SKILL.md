---
name: c4-container
description: Expert C4 Container-level documentation specialist.
risk: unknown
source: community
date_added: '2026-02-27'
---

# C4 Container Level: System Deployment

## Use this skill when

- Working on c4 container level: system deployment tasks or workflows
- Needing guidance, best practices, or checklists for c4 container level: system deployment

## Do not use this skill when

- The task is unrelated to c4 container level: system deployment
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Containers

### [Container Name]

- **Name**: [Container name]
- **Description**: [Short description of container purpose and deployment]
- **Type**: [Web Application, API, Database, Message Queue, etc.]
- **Technology**: [Primary technologies: Node.js, Python, PostgreSQL, Redis, etc.]
- **Deployment**: [Docker, Kubernetes, Cloud Service, etc.]

## Purpose

[Detailed description of what this container does and how it's deployed]

## Components

This container deploys the following components:

- [Component Name]: [Description]
  - Documentation: c4-component-name.md

## Interfaces

### [API/Interface Name]

- **Protocol**: [REST/GraphQL/gRPC/Events/etc.]
- **Description**: [What this interface provides]
- **Specification**: [Link to OpenAPI/Swagger/API Spec file]
- **Endpoints**:
  - `GET /api/resource` - [Description]
  - `POST /api/resource` - [Description]

## Dependencies

### Containers Used

- [Container Name]: [How it's used, communication protocol]

### External Systems

- [External System]: [How it's used, integration type]

## Infrastructure

- **Deployment Config**: [Link to Dockerfile, K8s manifest, etc.]
- **Scaling**: [Horizontal/vertical scaling strategy]
- **Resources**: [CPU, memory, storage requirements]

## Container Diagram

Use proper Mermaid C4Container syntax:

```mermaid
C4Container
    title Container Diagram for [System Name]

    Person(user, "User", "Uses the system")
    System_Boundary(system, "System Name") {
        Container(webApp, "Web Application", "Spring Boot, Java", "Provides web interface")
        Container(api, "API Application", "Node.js, Express", "Provides REST API")
        ContainerDb(database, "Database", "PostgreSQL", "Stores data")
        Container_Queue(messageQueue, "Message Queue", "RabbitMQ", "Handles async messaging")
    }
    System_Ext(external, "External System", "Third-party service")

    Rel(user, webApp, "Uses", "HTTPS")
    Rel(webApp, api, "Makes API calls to", "JSON/HTTPS")
    Rel(api, database, "Reads from and writes to", "SQL")
    Rel(api, messageQueue, "Publishes messages to")
    Rel(api, external, "Uses", "API")
```
````

**Key Principles** (from [c4model.com](https://c4model.com/diagrams/container)):

- Show **high-level technology choices** (this is where technology details belong)
- Show how **responsibilities are distributed** across containers
- Include **container types**: Applications, Databases, Message Queues, File Systems, etc.
- Show **communication protocols** between containers
- Include **external systems** that containers interact with

````

## API Specification Template

For each container API, create an OpenAPI/Swagger specification:

```yaml
openapi: 3.1.0
info:
  title: [Container Name] API
  description: [API description]
  version: 1.0.0
servers:
  - url: https://api.example.com
    description: Production server
paths:
  /api/resource:
    get:
      summary: [Operation summary]
      description: [Operation description]
      parameters:
        - name: param1
          in: query
          schema:
            type: string
      responses:
        '200':
          description: [Response description]
          content:
            application/json:
              schema:
                type: object
````

## Example Interactions

- "Synthesize all components into containers based on deployment definitions"
- "Map the API components to containers and document their APIs as OpenAPI specs"
- "Create container-level documentation for the microservices architecture"
- "Document container interfaces as Swagger/OpenAPI specifications"
- "Analyze Kubernetes manifests and create container documentation"

## Key Distinctions

- **vs C4-Component agent**: Maps components to deployment units; Component agent focuses on logical grouping
- **vs C4-Context agent**: Provides container-level detail; Context agent creates high-level system diagrams
- **vs C4-Code agent**: Focuses on deployment architecture; Code agent documents individual code elements

## Output Examples

When synthesizing containers, provide:

- Clear container boundaries with deployment rationale
- Descriptive container names and deployment characteristics
- Complete API documentation with OpenAPI/Swagger specifications
- Links to all contained components
- Mermaid container diagrams showing deployment architecture
- Links to deployment configurations (Dockerfiles, K8s manifests, etc.)
- Infrastructure requirements and scaling considerations
- Consistent documentation format across all containers

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
