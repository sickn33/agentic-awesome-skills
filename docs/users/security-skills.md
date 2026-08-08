# Security-Related Skills Report

Total Security Skills Found: 128

This report lists all security-related skills found in the `agentic-awesome-skills` repository, including their descriptions, use cases, and example prompts.

## accessibility-compliance-accessibility-audit (`accessibility-compliance-accessibility-audit`)

**Description:** You are an accessibility expert specializing in WCAG compliance, inclusive design, and assistive technology compatibility. Conduct audits, identify barriers, and provide remediation guidance.

### Use Cases
- Auditing web or mobile experiences for WCAG compliance
- Identifying accessibility barriers and remediation priorities
- Establishing ongoing accessibility testing practices
- Preparing compliance evidence for stakeholders

### Example Prompts
- "Audit this login page for WCAG 2.1 Level AA compliance and list all violations."
- "Perform a manual screen reader check of the checkout flow and document focus order issues."
- "Provide a remediation plan for resolving contrast and keyboard navigation errors found in the audit."

---

## Active Directory Attacks (`active-directory-attacks`)

**Description:** This skill should be used when the user asks to "attack Active Directory", "exploit AD", "Kerberoasting", "DCSync", "pass-the-hash", "BloodHound enumeration", "Golden Ticket", "Silver Ticket", "AS-REP roasting", "NTLM relay", or needs guidance on Windows domain penetration testing.

### Use Cases
- Executing Active Directory reconnaissance and attack path visualization
- Performing Kerberoasting and AS-REP roasting to harvest credentials
- Simulating lateral movement and privilege escalation in Windows domains
- Testing for critical AD vulnerabilities like ZeroLogon or PrintNightmare

### Example Prompts
- "Perform a BloodHound collection in the domain and identify the shortest path to Domain Admin."
- "GetUserSPNs.py against the target DC and extract hashes for offline cracking."
- "Execute a DCSync attack to extract the krbtgt hash for a Golden Ticket generation."
- "Test this Domain Controller for the ZeroLogon vulnerability and document findings."


---

## angular-migration (`angular-migration`)

**Description:** Migrate from AngularJS to Angular using hybrid mode, incremental component rewriting, and dependency injection updates. Use when upgrading AngularJS applications, planning framework migrations, or modernizing legacy Angular code.

### Use Cases
- Migrating AngularJS (1.x) applications to Angular (2+)
- Running hybrid AngularJS/Angular applications using ngUpgrade
- Converting directives to components and modernizing DI

### Example Prompts
- "Set up a hybrid Angular/AngularJS application bootstrapping both frameworks."
- "Convert this AngularJS directive into a modern Angular component."
- "Downgrade this new Angular service so it can be used in an existing AngularJS controller."

---

## anti-reversing-techniques (`anti-reversing-techniques`)

**Description:** Understand anti-reversing, obfuscation, and protection techniques encountered during software analysis. Use when analyzing protected binaries, bypassing anti-debugging for authorized analysis, or understanding software protection mechanisms.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## API Fuzzing for Bug Bounty (`api-fuzzing-bug-bounty`)

**Description:** This skill should be used when the user asks to "test API security", "fuzz APIs", "find IDOR vulnerabilities", "test REST API", "test GraphQL", "API penetration testing", "bug bounty API testing", or needs guidance on API security assessment techniques.

### Use Cases
- Discovering API endpoints and fuzzing for vulnerabilities
- Testing for IDOR, injection, and auth bypass in REST/GraphQL/SOAP APIs
- Performing security assessments during bug bounty hunting

### Example Prompts
- "Use Kiterunner to scan for hidden API endpoints on this target domain."
- "Test these GraphQL queries for introspection vulnerabilities and nested query DoS."
- "Attempt an IDOR bypass by wrapping the user ID in an array or using parameter pollution."

---

## api-patterns (`api-patterns`)

**Description:** API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## api-security-best-practices (`api-security-best-practices`)

**Description:** Implement secure API design patterns including authentication, authorization, input validation, rate limiting, and protection against common API vulnerabilities

### Use Cases
- Use when designing new API endpoints
- Use when securing existing APIs
- Use when implementing authentication and authorization
- Use when protecting against API attacks (injection, DDoS, etc.)
- Use when conducting API security reviews
- Use when preparing for security audits
- Use when implementing rate limiting and throttling
- Use when handling sensitive data in APIs

### Use Cases
- Implementing secure API design patterns (auth, validation, rate limiting)
- Protecting against injection, DDoS, and information disclosure
- Conducting API security reviews and audits

### Example Prompts
- "Implement secure user authentication with JWT and refresh token rotation."
- "Review this API endpoint for injection vulnerabilities and implement proper validation."
- "Set up comprehensive security headers and CSP for this web application."

---

## attack-tree-construction (`attack-tree-construction`)

**Description:** Build comprehensive attack trees to visualize threat paths. Use when mapping attack scenarios, identifying defense gaps, or communicating security risks to stakeholders.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## auth-implementation-patterns (`auth-implementation-patterns`)

**Description:** Master authentication and authorization patterns including JWT, OAuth2, session management, and RBAC to build secure, scalable access control systems. Use when implementing auth systems, securing APIs, or debugging security issues.

### Use Cases
- Implementing user authentication systems (JWT, OAuth2, Session)
- Securing REST or GraphQL APIs with industry-standard patterns
- Designing and debugging session management and RBAC systems

### Example Prompts
- "Implement secure user authentication with JWT and refresh token rotation."
- "Design an RBAC system for a multi-tenant SaaS application."
- "Debug an authentication flow that is failing to properly validate OAuth2 tokens."

---

## AWS Penetration Testing (`aws-penetration-testing`)

**Description:** This skill should be used when the user asks to "pentest AWS", "test AWS security", "enumerate IAM", "exploit cloud infrastructure", "AWS privilege escalation", "S3 bucket testing", "metadata SSRF", "Lambda exploitation", or needs guidance on Amazon Web Services security assessment.

### Use Cases
- Pentesting AWS cloud environments (IAM, S3, EC2, Lambda)
- Enumerating IAM permissions and identifying privesc paths
- Exploiting metadata SSRF and S3 bucket misconfigurations

### Example Prompts
- "Enumerate IAM permissions for these AWS access keys and find privilege escalation paths."
- "Extract temporary credentials from the EC2 metadata endpoint via an SSRF vulnerability."
- "Scan for public S3 buckets associated with this organization and check for sensitive data."

---

## backend-dev-guidelines (`backend-dev-guidelines`)

**Description:** Opinionated backend development standards for Node.js + Express + TypeScript microservices. Covers layered architecture, BaseController pattern, dependency injection, Prisma repositories, Zod validation, unifiedConfig, Sentry error tracking, async safety, and testing discipline.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## backend-security-coder (`backend-security-coder`)

**Description:** Expert in secure backend coding practices specializing in input validation, authentication, and API security. Use PROACTIVELY for backend security implementations or security code reviews.

### Use Cases
- **Use this agent for**: Hands-on backend security coding, API security implementation, database security configuration, authentication system coding, vulnerability fixes
- **Use security-auditor for**: High-level security audits, compliance assessments, DevSecOps pipeline design, threat modeling, security architecture reviews, penetration testing planning
- **Key difference**: This agent focuses on writing secure backend code, while security-auditor focuses on auditing and assessing security posture

### Example Prompts
- "Implement secure user authentication with JWT and refresh token rotation"
- "Review this API endpoint for injection vulnerabilities and implement proper validation"
- "Configure CSRF protection for cookie-based authentication system"
- "Implement secure database queries with parameterization and access controls"
- "Set up comprehensive security headers and CSP for web application"
- "Create secure error handling that doesn't leak sensitive information"
- "Implement rate limiting and DDoS protection for public API endpoints"
- "Design secure external service integration with allowlist validation"

---

## bash-defensive-patterns (`bash-defensive-patterns`)

**Description:** Master defensive Bash programming techniques for production-grade scripts. Use when writing robust shell scripts, CI/CD pipelines, or system utilities requiring fault tolerance and safety.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## bash-pro (`bash-pro`)

**Description:** Master of defensive Bash scripting for production automation, CI/CD pipelines, and system utilities. Expert in safe, portable, and testable shell scripts.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Broken Authentication Testing (`broken-authentication`)

**Description:** This skill should be used when the user asks to "test for broken authentication vulnerabilities", "assess session management security", "perform credential stuffing tests", "evaluate password policies", "test for session fixation", or "identify authentication bypass flaws". It provides comprehensive techniques for identifying authentication and session management weaknesses in web applications.

### Use Cases
- Identifying and exploiting session management vulnerabilities
- Evaluating password policies and account lockout mechanisms
- Testing MFA implementation and bypass techniques
- Analyzing password reset token security and manipulation

### Example Prompts
- "Test this login form for account lockout bypass using IP rotation in the X-Forwarded-For header."
- "Perform a JWT 'none' algorithm attack by capturing and modifying the authentication token."
- "Analyze this password reset workflow for host header injection and token predictability."

---

## Burp Suite Web Application Testing (`burp-suite-testing`)

**Description:** This skill should be used when the user asks to "intercept HTTP traffic", "modify web requests", "use Burp Suite for testing", "perform web vulnerability scanning", "test with Burp Repeater", "analyze HTTP history", or "configure proxy for web testing". It provides comprehensive guidance for using Burp Suite's core features for web application security testing.

### Use Cases
- Intercepting and modifying HTTP traffic to test business logic
- Using Burp Repeater for manual request replay and analysis
- Executing automated vulnerability scans (Professional edition)
- Performing Intruder attacks for fuzzing and credential testing

### Example Prompts
- "Intercept this checkout request and attempt to manipulate the 'price' parameter to 1."
- "Send this product lookup request to Burp Repeater and test for error-based SQL injection."
- "Configure a Burp Intruder Pitchfork attack to test a list of username:password pairs."

---

## cicd-automation-workflow-automate (`cicd-automation-workflow-automate`)

**Description:** You are a workflow automation expert specializing in creating efficient CI/CD pipelines, GitHub Actions workflows, and automated development processes. Design automation that reduces manual work, improves consistency, and accelerates delivery while maintaining quality and security.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## clerk-auth (`clerk-auth`)

**Description:** Expert patterns for Clerk auth implementation, middleware, organizations, webhooks, and user sync Use when: adding authentication, clerk auth, user authentication, sign in, sign up.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Cloud Penetration Testing (`cloud-penetration-testing`)

**Description:** This skill should be used when the user asks to "perform cloud penetration testing", "assess Azure or AWS or GCP security", "enumerate cloud resources", "exploit cloud misconfigurations", "test O365 security", "extract secrets from cloud environments", or "audit cloud infrastructure". It provides comprehensive techniques for security assessment across major cloud platforms.

### Use Cases
- Assessing security posture across Azure, AWS, and GCP infrastructure
- Enumerating cloud resources (S3, EC2, Azure AD, Lambda, etc.)
- Identifying privilege escalation paths through misconfigured IAM policies
- Testing for sensitive data exposure in public storage buckets or snapshots

### Example Prompts
- "Perform a reconnaissance scan for all public S3 buckets associated with 'targetcompany'."
- "Dump the Key Vault secrets for this Azure tenant using the compromised service principal."
- "Identify privilege escalation paths in this AWS account using Pacu or SkyArk."

---

## cloud-architect (`cloud-architect`)

**Description:** Expert cloud architect specializing in AWS/Azure/GCP multi-cloud infrastructure design, advanced IaC (Terraform/OpenTofu/CDK), FinOps cost optimization, and modern architectural patterns. Masters serverless, microservices, security, compliance, and disaster recovery. Use PROACTIVELY for cloud architecture, cost optimization, migration planning, or multi-cloud strategies.

### Use Cases
Expert cloud architect with deep knowledge of AWS, Azure, GCP, and emerging cloud technologies. Masters Infrastructure as Code, FinOps practices, and modern architectural patterns including serverless, microservices, and event-driven architectures. Specializes in cost optimization, security best practices, and building resilient, scalable systems.

### Example Prompts
- "Design a multi-region, auto-scaling web application architecture on AWS with estimated monthly costs"
- "Create a hybrid cloud strategy connecting on-premises data center with Azure"
- "Optimize our GCP infrastructure costs while maintaining performance and availability"
- "Design a serverless event-driven architecture for real-time data processing"
- "Plan a migration from monolithic application to microservices on Kubernetes"
- "Implement a disaster recovery solution with 4-hour RTO across multiple cloud providers"
- "Design a compliant architecture for healthcare data processing meeting HIPAA requirements"
- "Create a FinOps strategy with automated cost optimization and chargeback reporting"

---

## code-review-checklist (`code-review-checklist`)

**Description:** Comprehensive checklist for conducting thorough code reviews covering functionality, security, performance, and maintainability

### Use Cases
- Use when reviewing pull requests
- Use when conducting code audits
- Use when establishing code review standards for a team
- Use when training new developers on code review practices
- Use when you want to ensure nothing is missed in reviews
- Use when creating code review documentation

### Example Prompts
Not specified

---

## code-reviewer (`code-reviewer`)

**Description:** Elite code review expert specializing in modern AI-powered code analysis, security vulnerabilities, performance optimization, and production reliability. Masters static analysis tools, security scanning, and configuration review with 2024/2025 best practices. Use PROACTIVELY for code quality assurance.

### Use Cases
Not specified

### Example Prompts
- "Review this microservice API for security vulnerabilities and performance issues"
- "Analyze this database migration for potential production impact"
- "Assess this React component for accessibility and performance best practices"
- "Review this Kubernetes deployment configuration for security and reliability"
- "Evaluate this authentication implementation for OAuth2 compliance"
- "Analyze this caching strategy for race conditions and data consistency"
- "Review this CI/CD pipeline for security and deployment best practices"
- "Assess this error handling implementation for observability and debugging"

---

## codebase-cleanup-deps-audit (`codebase-cleanup-deps-audit`)

**Description:** You are a dependency security expert specializing in vulnerability scanning, license compliance, and supply chain security. Analyze project dependencies for known vulnerabilities, licensing issues, outdated packages, and provide actionable remediation strategies.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## computer-use-agents (`computer-use-agents`)

**Description:** Build AI agents that interact with computers like humans do - viewing screens, moving cursors, clicking buttons, and typing text. Covers Anthropic's Computer Use, OpenAI's Operator/CUA, and open-source alternatives. Critical focus on sandboxing, security, and handling the unique challenges of vision-based control. Use when: computer use, desktop automation agent, screen control AI, vision-based agent, GUI automation.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Cross-Site Scripting and HTML Injection Testing (`xss-html-injection`)

**Description:** This skill should be used when the user asks to "test for XSS vulnerabilities", "perform cross-site scripting attacks", "identify HTML injection flaws", "exploit client-side injection vulnerabilities", "steal cookies via XSS", or "bypass content security policies". It provides comprehensive techniques for detecting, exploiting, and understanding XSS and HTML injection attack vectors in web applications.

### Use Cases
- Detecting reflected, stored, and DOM-based XSS vulnerabilities
- Stealing user cookies and session tokens for session hijacking
- Bypassing Content Security Policy (CSP) and other client-side filters
- Performing HTML injection for phishing or defacement during assessments

### Example Prompts
- "Test this search parameter for reflected XSS using a basic '<script>alert(1)</script>' payload."
- "Identify if this comment section is vulnerable to stored XSS and attempt to capture a test cookie."
- "Analyze this application's CSP headers and look for potential bypasses via insecure script sources."

---

## database-admin (`database-admin`)

**Description:** Expert database administrator specializing in modern cloud databases, automation, and reliability engineering. Masters AWS/Azure/GCP database services, Infrastructure as Code, high availability, disaster recovery, performance optimization, and compliance. Handles multi-cloud strategies, container databases, and cost optimization. Use PROACTIVELY for database architecture, operations, or reliability engineering.

### Use Cases
Expert database administrator with comprehensive knowledge of cloud-native databases, automation, and reliability engineering. Masters multi-cloud database platforms, Infrastructure as Code for databases, and modern operational practices. Specializes in high availability, disaster recovery, performance optimization, and database security.

### Example Prompts
- "Design multi-region PostgreSQL setup with automated failover and disaster recovery"
- "Implement comprehensive database monitoring with proactive alerting and performance optimization"
- "Create automated backup and recovery system with point-in-time recovery capabilities"
- "Set up database CI/CD pipeline with automated schema migrations and testing"
- "Design database security architecture meeting HIPAA compliance requirements"
- "Optimize database costs while maintaining performance SLAs across multiple cloud providers"
- "Implement database operations automation using Infrastructure as Code and GitOps"
- "Create database disaster recovery plan with automated failover and business continuity procedures"

---

## dependency-management-deps-audit (`dependency-management-deps-audit`)

**Description:** You are a dependency security expert specializing in vulnerability scanning, license compliance, and supply chain security. Analyze project dependencies for known vulnerabilities, licensing issues, outdated packages, and provide actionable remediation strategies.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## deployment-engineer (`deployment-engineer`)

**Description:** Expert deployment engineer specializing in modern CI/CD pipelines, GitOps workflows, and advanced deployment automation. Masters GitHub Actions, ArgoCD/Flux, progressive delivery, container security, and platform engineering. Handles zero-downtime deployments, security scanning, and developer experience optimization. Use PROACTIVELY for CI/CD design, GitOps implementation, or deployment automation.

### Use Cases
Expert deployment engineer with comprehensive knowledge of modern CI/CD practices, GitOps workflows, and container orchestration. Masters advanced deployment strategies, security-first pipelines, and platform engineering approaches. Specializes in zero-downtime deployments, progressive delivery, and enterprise-scale automation.

### Example Prompts
- "Design a complete CI/CD pipeline for a microservices application with security scanning and GitOps"
- "Implement progressive delivery with canary deployments and automated rollbacks"
- "Create secure container build pipeline with vulnerability scanning and image signing"
- "Set up multi-environment deployment pipeline with proper promotion and approval workflows"
- "Design zero-downtime deployment strategy for database-backed application"
- "Implement GitOps workflow with ArgoCD for Kubernetes application deployment"
- "Create comprehensive monitoring and alerting for deployment pipeline and application health"
- "Build developer platform with self-service deployment capabilities and proper guardrails"

---

## deployment-pipeline-design (`deployment-pipeline-design`)

**Description:** Design multi-stage CI/CD pipelines with approval gates, security checks, and deployment orchestration. Use when architecting deployment workflows, setting up continuous delivery, or implementing GitOps practices.

### Use Cases
Design robust, secure deployment pipelines that balance speed with safety through proper stage organization and approval workflows.

### Example Prompts
Not specified

---

## devops-troubleshooter (`devops-troubleshooter`)

**Description:** Expert DevOps troubleshooter specializing in rapid incident response, advanced debugging, and modern observability. Masters log analysis, distributed tracing, Kubernetes debugging, performance optimization, and root cause analysis. Handles production outages, system reliability, and preventive monitoring. Use PROACTIVELY for debugging, incident response, or system troubleshooting.

### Use Cases
Expert DevOps troubleshooter with comprehensive knowledge of modern observability tools, debugging methodologies, and incident response practices. Masters log analysis, distributed tracing, performance debugging, and system reliability engineering. Specializes in rapid problem resolution, root cause analysis, and building resilient systems.

### Example Prompts
- "Debug high memory usage in Kubernetes pods causing frequent OOMKills and restarts"
- "Analyze distributed tracing data to identify performance bottleneck in microservices architecture"
- "Troubleshoot intermittent 504 gateway timeout errors in production load balancer"
- "Investigate CI/CD pipeline failures and implement automated debugging workflows"
- "Root cause analysis for database deadlocks causing application timeouts"
- "Debug DNS resolution issues affecting service discovery in Kubernetes cluster"
- "Analyze logs to identify security breach and implement containment procedures"
- "Troubleshoot GitOps deployment failures and implement automated rollback procedures"

---

## doc-coauthoring (`doc-coauthoring`)

**Description:** Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation, proposals, technical specs, decision docs, or similar structured content. This workflow helps users efficiently transfer context, refine content through iteration, and verify the doc works for readers. Trigger when user mentions writing docs, creating proposals, drafting specs, or similar documentation tasks.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## docker-expert (`docker-expert`)

**Description:** Docker containerization expert with deep knowledge of multi-stage builds, image optimization, container security, Docker Compose orchestration, and production deployment patterns. Use PROACTIVELY for Dockerfile optimization, container issues, image size problems, security hardening, networking, and orchestration challenges.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## dotnet-architect (`dotnet-architect`)

**Description:** Expert .NET backend architect specializing in C#, ASP.NET Core, Entity Framework, Dapper, and enterprise application patterns. Masters async/await, dependency injection, caching strategies, and performance optimization. Use PROACTIVELY for .NET API development, code review, or architecture decisions.

### Use Cases
Senior .NET architect focused on building production-grade APIs, microservices, and enterprise applications. Combines deep expertise in C# language features, ASP.NET Core framework, data access patterns, and cloud-native development to deliver robust, maintainable, and high-performance solutions.

### Example Prompts
- "Design a caching strategy for product catalog with 100K items"
- "Review this async code for potential deadlocks and performance issues"
- "Implement a repository pattern with both EF Core and Dapper"
- "Optimize this LINQ query that's causing N+1 problems"
- "Create a background service for processing order queue"
- "Design authentication flow with JWT and refresh tokens"
- "Set up health checks for API and database dependencies"
- "Implement rate limiting for public API endpoints"

---

## dotnet-backend-patterns (`dotnet-backend-patterns`)

**Description:** Master C#/.NET backend development patterns for building robust APIs, MCP servers, and enterprise applications. Covers async/await, dependency injection, Entity Framework Core, Dapper, configuration, caching, and testing with xUnit. Use when developing .NET backends, reviewing C# code, or designing API architectures.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## error-debugging-error-analysis (`error-debugging-error-analysis`)

**Description:** You are an expert error analysis specialist with deep expertise in debugging distributed systems, analyzing production incidents, and implementing comprehensive observability solutions.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## error-diagnostics-error-analysis (`error-diagnostics-error-analysis`)

**Description:** You are an expert error analysis specialist with deep expertise in debugging distributed systems, analyzing production incidents, and implementing comprehensive observability solutions.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Ethical Hacking Methodology (`ethical-hacking-methodology`)

**Description:** This skill should be used when the user asks to "learn ethical hacking", "understand penetration testing lifecycle", "perform reconnaissance", "conduct security scanning", "exploit vulnerabilities", or "write penetration test reports". It provides comprehensive ethical hacking methodology and techniques.

### Use Cases
- Learning and applying the standard 5-phase hacking methodology (Recon, Scanning, Vulnerability Analysis, Exploitation, Reporting)
- Understanding different hacker types (White, Black, Grey Hat) and ethical guidelines
- Setting up a specialized security testing environment using Kali Linux
- Documenting security assessment findings in a professional format

### Example Prompts
- "Explain the five phases of the ethical hacking methodology and provide examples for each."
- "What are the key ethical guidelines and legal requirements I must follow before starting a penetration test?"
- "How do I configure a basic reconnaissance workflow using OSINT tools and public data sources?"

---

## event-sourcing-architect (`event-sourcing-architect`)

**Description:** Expert in event sourcing, CQRS, and event-driven architecture patterns. Masters event store design, projection building, saga orchestration, and eventual consistency patterns. Use PROACTIVELY for event-sourced systems, audit trails, or temporal queries.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## fastapi-templates (`fastapi-templates`)

**Description:** Create production-ready FastAPI projects with async patterns, dependency injection, and comprehensive error handling. Use when building new FastAPI applications or setting up backend API projects.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## File Path Traversal Testing (`file-path-traversal`)

**Description:** This skill should be used when the user asks to "test for directory traversal", "exploit path traversal vulnerabilities", "read arbitrary files through web applications", "find LFI vulnerabilities", or "access files outside web root". It provides comprehensive file path traversal attack and testing methodologies.

### Use Cases
- Identifying and exploiting directory traversal points in web applications
- Bypassing input filters and extension validation to read arbitrary system files
- Escalating Local File Inclusion (LFI) to Remote Code Execution (RCE) via log poisoning
- Extracting sensitive data such as /etc/passwd, wp-config.php, or SSH private keys

### Example Prompts
- "Test the 'filename' parameter of this image loading endpoint for basic path traversal using '../../../../etc/passwd'."
- "Attempt to read the WordPress configuration file using a PHP filter wrapper to bypass binary data issues."
- "Poison the Apache access logs with a PHP web shell and then include the log file to achieve RCE."

---

## firebase (`firebase`)

**Description:** Firebase gives you a complete backend in minutes - auth, database, storage, functions, hosting. But the ease of setup hides real complexity. Security rules are your last line of defense, and they're often wrong. Firestore queries are limited, and you learn this after you've designed your data model.  This skill covers Firebase Authentication, Firestore, Realtime Database, Cloud Functions, Cloud Storage, and Firebase Hosting. Key insight: Firebase is optimized for read-heavy, denormalized data. I

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## firmware-analyst (`firmware-analyst`)

**Description:** Expert firmware analyst specializing in embedded systems, IoT security, and hardware reverse engineering. Masters firmware extraction, analysis, and vulnerability research for routers, IoT devices, automotive systems, and industrial controllers. Use PROACTIVELY for firmware security audits, IoT penetration testing, or embedded systems research.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## form-cro (`form-cro`)

**Description:** Optimize any form that is NOT signup or account registration — including lead capture, contact, demo request, application, survey, quote, and checkout forms. Use when the goal is to increase form completion rate, reduce friction, or improve lead quality without breaking compliance or downstream workflows.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## frontend-mobile-security-xss-scan (`frontend-mobile-security-xss-scan`)

**Description:** You are a frontend security specialist focusing on Cross-Site Scripting (XSS) vulnerability detection and prevention. Analyze React, Vue, Angular, and vanilla JavaScript code to identify injection poi

### Use Cases
Not specified

### Example Prompts
Not specified

---

## frontend-security-coder (`frontend-security-coder`)

**Description:** Expert in secure frontend coding practices specializing in XSS prevention, output sanitization, and client-side security patterns. Use PROACTIVELY for frontend security implementations or client-side security code reviews.

### Use Cases
- **Use this agent for**: Hands-on frontend security coding, XSS prevention implementation, CSP configuration, secure DOM manipulation, client-side vulnerability fixes
- **Use security-auditor for**: High-level security audits, compliance assessments, DevSecOps pipeline design, threat modeling, security architecture reviews, penetration testing planning
- **Key difference**: This agent focuses on writing secure frontend code, while security-auditor focuses on auditing and assessing security posture

### Example Prompts
- "Implement secure DOM manipulation for user-generated content display"
- "Configure Content Security Policy to prevent XSS while maintaining functionality"
- "Create secure form validation that prevents injection attacks"
- "Implement clickjacking protection for sensitive user operations"
- "Set up secure redirect handling with URL validation and allowlists"
- "Sanitize user input for rich text editor with DOMPurify integration"
- "Implement secure authentication token storage and rotation"
- "Create secure third-party widget integration with iframe sandboxing"

---

## gdpr-data-handling (`gdpr-data-handling`)

**Description:** Implement GDPR-compliant data handling with consent management, data subject rights, and privacy by design. Use when building systems that process EU personal data, implementing privacy controls, or conducting GDPR compliance reviews.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## graphql-architect (`graphql-architect`)

**Description:** Master modern GraphQL with federation, performance optimization, and enterprise security. Build scalable schemas, implement advanced caching, and design real-time systems. Use PROACTIVELY for GraphQL architecture or performance optimization.

### Use Cases
Expert GraphQL architect focused on building scalable, performant, and secure GraphQL systems for enterprise applications. Masters modern federation patterns, advanced optimization techniques, and cutting-edge GraphQL tooling to deliver high-performance APIs that scale with business needs.

### Example Prompts
- "Design a federated GraphQL architecture for a multi-team e-commerce platform"
- "Optimize this GraphQL schema to eliminate N+1 queries and improve performance"
- "Implement real-time subscriptions for a collaborative application with proper authorization"
- "Create a migration strategy from REST to GraphQL with backward compatibility"
- "Build a GraphQL gateway that aggregates data from multiple microservices"
- "Design field-level caching strategy for a high-traffic GraphQL API"
- "Implement query complexity analysis and rate limiting for production safety"
- "Create a schema evolution strategy that supports multiple client versions"

---

## HTML Injection Testing (`html-injection-testing`)

**Description:** This skill should be used when the user asks to "test for HTML injection", "inject HTML into web pages", "perform HTML injection attacks", "deface web applications", or "test content injection vulnerabilities". It provides comprehensive HTML injection attack techniques and testing methodologies.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## hubspot-integration (`hubspot-integration`)

**Description:** Expert patterns for HubSpot CRM integration including OAuth authentication, CRM objects, associations, batch operations, webhooks, and custom objects. Covers Node.js and Python SDKs. Use when: hubspot, hubspot api, hubspot crm, hubspot integration, contacts api.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## hybrid-cloud-architect (`hybrid-cloud-architect`)

**Description:** Expert hybrid cloud architect specializing in complex multi-cloud solutions across AWS/Azure/GCP and private clouds (OpenStack/VMware). Masters hybrid connectivity, workload placement optimization, edge computing, and cross-cloud automation. Handles compliance, cost optimization, disaster recovery, and migration strategies. Use PROACTIVELY for hybrid architecture, multi-cloud strategy, or complex infrastructure integration.

### Use Cases
Expert hybrid cloud architect with deep expertise in designing, implementing, and managing complex multi-cloud environments. Masters public cloud platforms (AWS, Azure, GCP), private cloud solutions (OpenStack, VMware, Kubernetes), and edge computing. Specializes in hybrid connectivity, workload placement optimization, compliance, and cost management across heterogeneous environments.

### Example Prompts
- "Design a hybrid cloud architecture for a financial services company with strict compliance requirements"
- "Plan workload placement strategy for a global manufacturing company with edge computing needs"
- "Create disaster recovery solution across AWS, Azure, and on-premises OpenStack"
- "Optimize costs for hybrid workloads while maintaining performance SLAs"
- "Design secure hybrid connectivity with zero-trust networking principles"
- "Plan migration strategy from legacy on-premises to hybrid multi-cloud architecture"
- "Implement unified monitoring and observability across hybrid infrastructure"
- "Create FinOps strategy for multi-cloud cost optimization and governance"

---

## IDOR Vulnerability Testing (`idor-testing`)

**Description:** This skill should be used when the user asks to "test for insecure direct object references," "find IDOR vulnerabilities," "exploit broken access control," "enumerate user IDs or object references," or "bypass authorization to access other users' data." It provides comprehensive guidance for detecting, exploiting, and remediating IDOR vulnerabilities in web applications.

### Use Cases
- Testing for access control bypasses by manipulating object identifiers (e.g., user IDs, order IDs)
- Enumerating sensitive data through predictable resource patterns
- Validating horizontal and vertical privilege escalation vulnerabilities
- Capturing and analyzing API requests for authorization weaknesses

### Example Prompts
- "Capture the request for viewing profile ID 123 and attempt to view profile ID 124 by changing the parameter."
- "Enumerate public files by iterating through numerical IDs in the download URL."
- "Test if a regular user can access administrative API endpoints by modifying the 'role' or 'admin' parameter."

---
## incident-responder (`incident-responder`)

**Description:** Expert SRE incident responder specializing in rapid problem resolution, modern observability, and comprehensive incident management. Masters incident command, blameless post-mortems, error budget management, and system reliability patterns. Handles critical outages, communication strategies, and continuous improvement. Use IMMEDIATELY for production incidents or SRE practices.

### Use Cases
Expert incident responder with deep knowledge of SRE principles, modern observability, and incident management frameworks. Masters rapid problem resolution, effective communication, and comprehensive post-incident analysis. Specializes in building resilient systems and improving organizational incident response capabilities.

### Example Prompts
Not specified

---

## incident-response-incident-response (`incident-response-incident-response`)

**Description:** Use when working with incident response incident response

### Use Cases
Not specified

### Example Prompts
Not specified

---

## incident-response-smart-fix (`incident-response-smart-fix`)

**Description:** Advanced issue resolution workflow using multi-agent orchestration for diagnosing and fixing complex software incidents.

### Use Cases
- Establishing incident command structure for data breaches
- Conducting blameless post-mortems for system outages
- Implementing proactive monitoring strategies for broad threat detection

### Example Prompts
- "Establish an incident command structure for a critical data breach affecting customer records."
- "Conduct a blameless post-mortem for the payment system outage and identify technical and process improvements."
- "Implement a proactive monitoring strategy to detect potential security breaches before they escalate."

---

## incident-runbook-templates (`incident-runbook-templates`)

**Description:** Create structured incident response runbooks with step-by-step procedures, escalation paths, and recovery actions. Use when building runbooks, responding to incidents, or establishing incident response procedures.

### Use Cases
**Service**: Payment Processing Service
**Owner**: Platform Team
**Slack**: #payments-incidents
**PagerDuty**: payments-oncall

### Example Prompts
Not specified

---

## internal-comms (`internal-comms-anthropic`)

**Description:** A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).

### Use Cases
To write internal communications, use this skill for:
- 3P updates (Progress, Plans, Problems)
- Company newsletters
- FAQ responses
- Status reports
- Leadership updates
- Project updates
- Incident reports

### Example Prompts
Not specified

---

## internal-comms (`internal-comms-community`)

**Description:** A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).

### Use Cases
To write internal communications, use this skill for:
- 3P updates (Progress, Plans, Problems)
- Company newsletters
- FAQ responses
- Status reports
- Leadership updates
- Project updates
- Incident reports

### Example Prompts
Not specified

---

## k8s-manifest-generator (`k8s-manifest-generator`)

**Description:** Create production-ready Kubernetes manifests for Deployments, Services, ConfigMaps, and Secrets following best practices and security standards. Use when generating Kubernetes YAML manifests, creating K8s resources, or implementing production-grade Kubernetes configurations.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## k8s-security-policies (`k8s-security-policies`)

**Description:** Implement Kubernetes security policies including NetworkPolicy, PodSecurityPolicy, and RBAC for production-grade security. Use when securing Kubernetes clusters, implementing network isolation, or enforcing pod security standards.

### Use Cases
Implement defense-in-depth security for Kubernetes clusters using network policies, pod security standards, and RBAC.

### Example Prompts
Not specified

---

## kubernetes-architect (`kubernetes-architect`)

**Description:** Expert Kubernetes architect specializing in cloud-native infrastructure, advanced GitOps workflows (ArgoCD/Flux), and enterprise container orchestration. Masters EKS/AKS/GKE, service mesh (Istio/Linkerd), progressive delivery, multi-tenancy, and platform engineering. Handles security, observability, cost optimization, and developer experience. Use PROACTIVELY for K8s architecture, GitOps implementation, or cloud-native platform design.

### Use Cases
Expert Kubernetes architect with comprehensive knowledge of container orchestration, cloud-native technologies, and modern GitOps practices. Masters Kubernetes across all major providers (EKS, AKS, GKE) and on-premises deployments. Specializes in building scalable, secure, and cost-effective platform engineering solutions that enhance developer productivity.

### Example Prompts
- "Design a multi-cluster Kubernetes platform with GitOps for a financial services company"
- "Implement progressive delivery with Argo Rollouts and service mesh traffic splitting"
- "Create a secure multi-tenant Kubernetes platform with namespace isolation and RBAC"
- "Design disaster recovery for stateful applications across multiple Kubernetes clusters"
- "Optimize Kubernetes costs while maintaining performance and availability SLAs"
- "Implement observability stack with Prometheus, Grafana, and OpenTelemetry for microservices"
- "Create CI/CD pipeline with GitOps for container applications with security scanning"
- "Design Kubernetes operator for custom application lifecycle management"

---

## legal-advisor (`legal-advisor`)

**Description:** Draft privacy policies, terms of service, disclaimers, and legal notices. Creates GDPR-compliant texts, cookie policies, and data processing agreements. Use PROACTIVELY for legal documentation, compliance texts, or regulatory requirements.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## linkerd-patterns (`linkerd-patterns`)

**Description:** Implement Linkerd service mesh patterns for lightweight, security-focused service mesh deployments. Use when setting up Linkerd, configuring traffic policies, or implementing zero-trust networking with minimal overhead.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Linux Privilege Escalation (`linux-privilege-escalation`)

**Description:** This skill should be used when the user asks to "escalate privileges on Linux", "find privesc vectors on Linux systems", "exploit sudo misconfigurations", "abuse SUID binaries", "exploit cron jobs for root access", "enumerate Linux systems for privilege escalation", or "gain root access from low-privilege shell". It provides comprehensive techniques for identifying and exploiting privilege escalation paths on Linux systems.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## loki-mode (`loki-mode`)

**Description:** Multi-agent autonomous startup system for Claude Code. Triggers on "Loki Mode". Orchestrates 100+ specialized agents across engineering, QA, DevOps, security, data/ML, business operations, marketing, HR, and customer success. Takes PRD to fully deployed, revenue-generating product with zero human intervention. Features Task tool for subagent dispatch, parallel code review with 3 specialized reviewers, severity-based issue triage, distributed task queue with dead letter handling, automatic deployment to cloud providers, A/B testing, customer feedback loops, incident response, circuit breakers, and self-healing. Handles rate limits via distributed state checkpoints and auto-resume with exponential backoff. Requires --dangerously-skip-permissions flag.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Full workflow fails -> Simplified workflow -> Decompose to subtasks -> Human escalation


---

## malware-analyst (`malware-analyst`)

**Description:** Expert malware analyst specializing in defensive malware research, threat intelligence, and incident response. Masters sandbox analysis, behavioral analysis, and malware family identification. Handles static/dynamic analysis, unpacking, and IOC extraction. Use PROACTIVELY for malware triage, threat hunting, incident response, or security research.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## memory-forensics (`memory-forensics`)

**Description:** Master memory forensics techniques including memory acquisition, process analysis, and artifact extraction using Volatility and related tools. Use when analyzing memory dumps, investigating incidents, or performing malware analysis from RAM captures.

### Use Cases
Not specified

## Metasploit Framework (`metasploit-framework`)

**Description:** This skill should be used when the user asks to "use Metasploit for penetration testing", "exploit vulnerabilities with msfconsole", "create payloads with msfvenom", "perform post-exploitation", "use auxiliary modules for scanning", or "develop custom exploits". It provides comprehensive guidance for leveraging the Metasploit Framework in security assessments.

### Use Cases
- Performing vulnerability exploitation using a unified framework
- Generating and encoding various payloads for different architectures (msfvenom)
- Executing post-exploitation activities using powerful Meterpreter sessions
- Automating network service enumeration and vulnerability verification

### Example Prompts
- "Search for an exploit module targeting 'Apache Struts' with an 'excellent' rank."
- "Configure a windows/x64/meterpreter/reverse_tcp payload with LHOST and LPORT for this exploit."
- "Execute a credential harvesting post-module on active Meterpreter session 1."

---

## micro-saas-launcher (`micro-saas-launcher`)

**Description:** Expert in launching small, focused SaaS products fast - the indie hacker approach to building profitable software. Covers idea validation, MVP development, pricing, launch strategies, and growing to sustainable revenue. Ship in weeks, not months. Use when: micro saas, indie hacker, small saas, side project, saas mvp.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## mobile-security-coder (`mobile-security-coder`)

**Description:** Expert in secure mobile coding practices specializing in input validation, WebView security, and mobile-specific security patterns. Use PROACTIVELY for mobile security implementations or mobile security code reviews.

### Use Cases
- **Use this agent for**: Hands-on mobile security coding, implementation of secure mobile patterns, mobile-specific vulnerability fixes, WebView security configuration, mobile authentication implementation
- **Use security-auditor for**: High-level security audits, compliance assessments, DevSecOps pipeline design, threat modeling, security architecture reviews, penetration testing planning
- **Key difference**: This agent focuses on writing secure mobile code, while security-auditor focuses on auditing and assessing security posture

### Example Prompts
- "Implement secure WebView configuration with HTTPS enforcement and CSP"
- "Set up biometric authentication with secure fallback mechanisms"
- "Create secure local storage with encryption for sensitive user data"
- "Implement certificate pinning for API communication security"
- "Configure deep link security with URL validation and parameter sanitization"
- "Set up root/jailbreak detection with graceful security degradation"
- "Implement secure cross-platform data sharing between native and WebView"
- "Create privacy-compliant analytics with data minimization and consent"
- "Implement secure React Native bridge communication with input validation"
- "Configure Flutter platform channel security with message validation"
- "Set up secure Xamarin native interop with assembly protection"
- "Implement secure Cordova plugin communication with sandboxing"

---

## mtls-configuration (`mtls-configuration`)

**Description:** Configure mutual TLS (mTLS) for zero-trust service-to-service communication. Use when implementing zero-trust networking, certificate management, or securing internal service communication.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Network 101 (`network-101`)

**Description:** This skill should be used when the user asks to "set up a web server", "configure HTTP or HTTPS", "perform SNMP enumeration", "configure SMB shares", "test network services", or needs guidance on configuring target environments for security testing.

### Use Cases
- Configuring and testing common network services (HTTP, HTTPS, SNMP, SMB)
- Enumerating network services for security assessment training
- Analyzing service logs for security events and credential harvesting
- Setting up isolated lab environments for penetration testing practice

### Example Prompts
- "Set up a basic Apache web server on Linux and create a test login page for credential harvesting practice."
- "Configure an SNMP service with 'public' and 'private' community strings for enumeration practice."
- "Enumerate an SMB service anonymously and list all accessible shares using smbclient."

---

## nestjs-expert (`nestjs-expert`)

**Description:** Nest.js framework expert specializing in module architecture, dependency injection, middleware, guards, interceptors, testing with Jest/Supertest, TypeORM/Mongoose integration, and Passport.js authentication. Use PROACTIVELY for any Nest.js application issues including architecture decisions, testing strategies, performance optimization, or debugging complex dependency injection problems. If a specialized expert is a better fit, I will recommend switching and stop.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## network-engineer (`network-engineer`)

**Description:** Expert network engineer specializing in modern cloud networking, security architectures, and performance optimization. Masters multi-cloud connectivity, service mesh, zero-trust networking, SSL/TLS, global load balancing, and advanced troubleshooting. Handles CDN optimization, network automation, and compliance. Use PROACTIVELY for network design, connectivity issues, or performance optimization.

### Use Cases
Expert network engineer with comprehensive knowledge of cloud networking, modern protocols, security architectures, and performance optimization. Masters multi-cloud networking, service mesh technologies, zero-trust architectures, and advanced troubleshooting. Specializes in scalable, secure, and high-performance network solutions.

### Example Prompts
- "Design secure multi-cloud network architecture with zero-trust connectivity"
- "Troubleshoot intermittent connectivity issues in Kubernetes service mesh"
- "Optimize CDN configuration for global application performance"
- "Configure SSL/TLS termination with automated certificate management"
- "Design network security architecture for compliance with HIPAA requirements"
- "Implement global load balancing with disaster recovery failover"
- "Analyze network performance bottlenecks and implement optimization strategies"
- "Set up comprehensive network monitoring with automated alerting and incident response"

---

## nextjs-supabase-auth (`nextjs-supabase-auth`)

**Description:** Expert integration of Supabase Auth with Next.js App Router Use when: supabase auth next, authentication next.js, login supabase, auth middleware, protected route.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## nodejs-backend-patterns (`nodejs-backend-patterns`)

**Description:** Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## nodejs-best-practices (`nodejs-best-practices`)

**Description:** Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.

### Use Cases
Use this skill when making Node.js architecture decisions, choosing frameworks, designing async patterns, or applying security and deployment best practices.

### Example Prompts
Not specified

---

## notebooklm (`notebooklm`)

**Description:** Use this skill to query your Google NotebookLM notebooks directly from Claude Code for source-grounded, citation-backed answers from Gemini. Browser automation, library management, persistent auth. Drastically reduced hallucinations through document-only responses.

### Use Cases
Trigger when user:
- Mentions NotebookLM explicitly
- Shares NotebookLM URL (`https://notebooklm.google.com/notebook/...`)
- Asks to query their notebooks/documentation
- Wants to add documentation to NotebookLM library
- Uses phrases like "ask my NotebookLM", "check my docs", "query my notebook"

### Example Prompts
Not specified

---

## observability-engineer (`observability-engineer`)

**Description:** Build production-ready monitoring, logging, and tracing systems. Implements comprehensive observability strategies, SLI/SLO management, and incident response workflows. Use PROACTIVELY for monitoring infrastructure, performance optimization, or production reliability.

### Use Cases
Expert observability engineer specializing in comprehensive monitoring strategies, distributed tracing, and production reliability systems. Masters both traditional monitoring approaches and cutting-edge observability patterns, with deep knowledge of modern observability stacks, SRE practices, and enterprise-scale monitoring architectures.

### Example Prompts
- "Design a comprehensive monitoring strategy for a microservices architecture with 50+ services"
- "Implement distributed tracing for a complex e-commerce platform handling 1M+ daily transactions"
- "Set up cost-effective log management for a high-traffic application generating 10TB+ daily logs"
- "Create SLI/SLO framework with error budget tracking for API services with 99.9% availability target"
- "Build real-time alerting system with intelligent noise reduction for 24/7 operations team"
- "Implement chaos engineering with monitoring validation for Netflix-scale resilience testing"
- "Design executive dashboard showing business impact of system reliability and revenue correlation"
- "Set up compliance monitoring for SOC2 and PCI requirements with automated evidence collection"
- "Optimize monitoring costs while maintaining comprehensive coverage for startup scaling to enterprise"
- "Create automated incident response workflows with runbook integration and Slack/PagerDuty escalation"
- "Build multi-region observability architecture with data sovereignty compliance"
- "Implement machine learning-based anomaly detection for proactive issue identification"
- "Design observability strategy for serverless architecture with AWS Lambda and API Gateway"
- "Create custom metrics pipeline for business KPIs integrated with technical monitoring"

---

## openapi-spec-generation (`openapi-spec-generation`)

**Description:** Generate and maintain OpenAPI 3.1 specifications from code, design-first specs, and validation patterns. Use when creating API documentation, generating SDKs, or ensuring API contract compliance.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## payment-integration (`payment-integration`)

**Description:** Integrate Stripe, PayPal, and payment processors. Handles checkout flows, subscriptions, webhooks, and PCI compliance. Use PROACTIVELY when implementing payments, billing, or subscription features.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## pci-compliance (`pci-compliance`)

**Description:** Implement PCI DSS compliance requirements for secure handling of payment card data and payment systems. Use when securing payment processing, achieving PCI compliance, or implementing payment card security measures.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Pentest Checklist (`pentest-checklist`)

**Description:** This skill should be used when the user asks to "plan a penetration test", "create a security assessment checklist", "prepare for penetration testing", "define pentest scope", "follow security testing best practices", or needs a structured methodology for penetration testing engagements.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Pentest Commands (`pentest-commands`)

**Description:** This skill should be used when the user asks to "run pentest commands", "scan with nmap", "use metasploit exploits", "crack passwords with hydra or john", "scan web vulnerabilities with nikto", "enumerate networks", or needs essential penetration testing command references.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## plaid-fintech (`plaid-fintech`)

**Description:** Expert patterns for Plaid API integration including Link token flows, transactions sync, identity verification, Auth for ACH, balance checks, webhook handling, and fintech compliance best practices. Use when: plaid, bank account linking, bank connection, ach, account aggregation.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## postmortem-writing (`postmortem-writing`)

**Description:** Write effective blameless postmortems with root cause analysis, timelines, and action items. Use when conducting incident reviews, writing postmortem documents, or improving incident response processes.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Privilege Escalation Methods (`privilege-escalation-methods`)

**Description:** This skill should be used when the user asks to "escalate privileges", "get root access", "become administrator", "privesc techniques", "abuse sudo", "exploit SUID binaries", "Kerberoasting", "pass-the-ticket", "token impersonation", or needs guidance on post-exploitation privilege escalation for Linux or Windows systems.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## production-code-audit (`production-code-audit`)

**Description:** Autonomously deep-scan entire codebase line-by-line, understand architecture and patterns, then systematically transform it to production-grade, corporate-level professional quality with optimizations

### Use Cases
- Use when user says "make this production-ready"
- Use when user says "audit my codebase"
- Use when user says "make this professional/corporate-level"
- Use when user says "optimize everything"
- Use when user wants enterprise-grade quality
- Use when preparing for production deployment
- Use when code needs to meet corporate standards

### Example Prompts
Not specified

---

## prompt-caching (`prompt-caching`)

**Description:** Caching strategies for LLM prompts including Anthropic prompt caching, response caching, and CAG (Cache Augmented Generation) Use when: prompt caching, cache prompt, response cache, cag, cache augmented.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Red Team Tools and Methodology (`red-team-tools`)

**Description:** This skill should be used when the user asks to "follow red team methodology", "perform bug bounty hunting", "automate reconnaissance", "hunt for XSS vulnerabilities", "enumerate subdomains", or needs security researcher techniques and tool configurations from top bug bounty hunters.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## red-team-tactics (`red-team-tactics`)

**Description:** Red team tactics principles based on MITRE ATT&CK. Attack phases, detection evasion, reporting.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## reverse-engineer (`reverse-engineer`)

**Description:** Expert reverse engineer specializing in binary analysis, disassembly, decompilation, and software analysis. Masters IDA Pro, Ghidra, radare2, x64dbg, and modern RE toolchains. Handles executable analysis, library inspection, protocol extraction, and vulnerability research. Use PROACTIVELY for binary analysis, CTF challenges, security research, or understanding undocumented software.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## sast-configuration (`sast-configuration`)

**Description:** Configure Static Application Security Testing (SAST) tools for automated vulnerability detection in application code. Use when setting up security scanning, implementing DevSecOps practices, or automating code vulnerability detection.

### Use Cases
This skill provides comprehensive guidance for setting up and configuring SAST tools including Semgrep, SonarQube, and CodeQL.

### Example Prompts
Not specified

---

## Security Auditing Workflow (`security-audit`)

**Description:** Comprehensive security auditing workflow covering web application testing, API security, penetration testing, vulnerability scanning, and security hardening.

### Use Cases
- Managing the complete penetration testing lifecycle (Recon → Scanning → Exploitation → Reporting)
- Performing passive reconnaissance using OSINT and Google Hacking
- Executing automated and manual vulnerability scans against web surfaces
- Orchestrating multi-layer hardening and remediation testing

### Example Prompts
- "Conduct a full security audit of this target domain starting with passive reconnaissance."
- "Run a vulnerability scan against the identified web services and prioritize findings by severity."
- "Formulate a remediation strategy for the top 5 critical vulnerabilities found in the audit."

---

## schema-markup (`schema-markup`)

**Description:** Design, validate, and optimize schema.org structured data for eligibility, correctness, and measurable SEO impact. Use when the user wants to add, fix, audit, or scale schema markup (JSON-LD) for rich results. This skill evaluates whether schema should be implemented, what types are valid, and how to deploy safely according to Google guidelines.


### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Security Scanning Tools (`scanning-tools`)

**Description:** This skill should be used when the user asks to "perform vulnerability scanning", "scan networks for open ports", "assess web application security", "scan wireless networks", "detect malware", "check cloud security", or "evaluate system compliance". It provides comprehensive guidance on security scanning tools and methodologies.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## security-auditor (`security-auditor`)

**Description:** Comprehensive security auditing workflow covering web application testing, API security, penetration testing, vulnerability scanning, and security hardening.

### Use Cases
- Managing the complete penetration testing lifecycle (Recon → Scanning → Exploitation → Reporting)
- Performing passive reconnaissance using OSINT and Google Hacking
- Executing automated and manual vulnerability scans against web surfaces
- Orchestrating multi-layer hardening and remediation testing

### Example Prompts
- "Conduct a full security audit of this target domain starting with passive reconnaissance."
- "Run a vulnerability scan against the identified web services and prioritize findings by severity."
- "Formulate a remediation strategy for the top 5 critical vulnerabilities found in the audit."

---

## security-compliance-compliance-check (`security-compliance-compliance-check`)

**Description:** You are a compliance expert specializing in regulatory requirements for software systems including GDPR, HIPAA, SOC2, PCI-DSS, and other industry standards. Perform compliance audits and provide implementation guidance.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## security-requirement-extraction (`security-requirement-extraction`)

**Description:** Derive security requirements from threat models and business context. Use when translating threats into actionable requirements, creating security user stories, or building security test cases.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## security-review (`cc-skill-security-review`)

**Description:** Use this skill when adding authentication, handling user input, working with secrets, creating API endpoints, or implementing payment/sensitive features. Provides comprehensive security checklist and patterns.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## security-scanning-security-dependencies (`security-scanning-security-dependencies`)

**Description:** You are a security expert specializing in dependency vulnerability analysis, SBOM generation, and supply chain security. Scan project dependencies across ecosystems to identify vulnerabilities, assess risks, and recommend remediation.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## security-scanning-security-hardening (`security-scanning-security-hardening`)

**Description:** Coordinate multi-layer security scanning and hardening across application, infrastructure, and compliance controls.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## security-scanning-security-sast (`security-scanning-security-sast`)

**Description:** Static Application Security Testing (SAST) for code vulnerability analysis across multiple languages and frameworks

### Use Cases
Not specified

### Example Prompts
Not specified

---


## service-mesh-expert (`service-mesh-expert`)

**Description:** Expert service mesh architect specializing in Istio, Linkerd, and cloud-native networking patterns. Masters traffic management, security policies, observability integration, and multi-cluster mesh con

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Shodan Reconnaissance and Pentesting (`shodan-reconnaissance`)

**Description:** This skill should be used when the user asks to "search for exposed devices on the internet," "perform Shodan reconnaissance," "find vulnerable services using Shodan," "scan IP ranges with Shodan," or "discover IoT devices and open ports." It provides comprehensive guidance for using Shodan's search engine, CLI, and API for penetration testing reconnaissance.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## SMTP Penetration Testing (`smtp-penetration-testing`)

**Description:** This skill should be used when the user asks to "perform SMTP penetration testing", "enumerate email users", "test for open mail relays", "grab SMTP banners", "brute force email credentials", or "assess mail server security". It provides comprehensive techniques for testing SMTP server security.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## solidity-security (`solidity-security`)

**Description:** Master smart contract security best practices to prevent common vulnerabilities and implement secure Solidity patterns. Use when writing smart contracts, auditing existing contracts, or implementing security measures for blockchain applications.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## SQL Injection Testing (`sql-injection-testing`)

**Description:** This skill should be used when the user asks to "test for SQL injection vulnerabilities", "perform SQLi attacks", "bypass authentication using SQL injection", "extract database information through injection", "detect SQL injection flaws", or "exploit database query vulnerabilities". It provides comprehensive techniques for identifying, exploiting, and understanding SQL injection attack vectors across different database systems.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## SQLMap Database Penetration Testing (`sqlmap-database-pentesting`)

**Description:** This skill should be used when the user asks to "automate SQL injection testing," "enumerate database structure," "extract database credentials using sqlmap," "dump tables and columns from a vulnerable database," or "perform automated database penetration testing." It provides comprehensive guidance for using SQLMap to detect and exploit SQL injection vulnerabilities.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## SSH Penetration Testing (`ssh-penetration-testing`)

**Description:** This skill should be used when the user asks to "pentest SSH services", "enumerate SSH configurations", "brute force SSH credentials", "exploit SSH vulnerabilities", "perform SSH tunneling", or "audit SSH security". It provides comprehensive SSH penetration testing methodologies and techniques.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## stride-analysis-patterns (`stride-analysis-patterns`)

**Description:** Apply STRIDE methodology to systematically identify threats. Use when analyzing system security, conducting threat modeling sessions, or creating security documentation.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## stripe-integration (`stripe-integration`)

**Description:** Implement Stripe payment processing for robust, PCI-compliant payment flows including checkout, subscriptions, and webhooks. Use when integrating Stripe payments, building subscription systems, or implementing secure checkout flows.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## terraform-specialist (`terraform-specialist`)

**Description:** Expert Terraform/OpenTofu specialist mastering advanced IaC automation, state management, and enterprise infrastructure patterns. Handles complex module design, multi-cloud deployments, GitOps workflows, policy as code, and CI/CD integration. Covers migration strategies, security best practices, and modern IaC ecosystems. Use PROACTIVELY for advanced IaC, state management, or infrastructure automation.

### Use Cases
Expert Infrastructure as Code specialist with comprehensive knowledge of Terraform, OpenTofu, and modern IaC ecosystems. Masters advanced module design, state management, provider development, and enterprise-scale infrastructure automation. Specializes in GitOps workflows, policy as code, and complex multi-cloud deployments.

### Example Prompts
- "Design a reusable Terraform module for a three-tier web application with proper testing"
- "Set up secure remote state management with encryption and locking for multi-team environment"
- "Create CI/CD pipeline for infrastructure deployment with security scanning and approval workflows"
- "Migrate existing Terraform codebase to OpenTofu with minimal disruption"
- "Implement policy as code validation for infrastructure compliance and cost control"
- "Design multi-cloud Terraform architecture with provider abstraction"
- "Troubleshoot state corruption and implement recovery procedures"
- "Create enterprise service catalog with approved infrastructure modules"

---

## threat-mitigation-mapping (`threat-mitigation-mapping`)

**Description:** Map identified threats to appropriate security controls and mitigations. Use when prioritizing security investments, creating remediation plans, or validating control effectiveness.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## threat-modeling-expert (`threat-modeling-expert`)

**Description:** Expert in threat modeling methodologies, security architecture review, and risk assessment. Masters STRIDE, PASTA, attack trees, and security requirement extraction. Use for security architecture reviews, threat identification, and secure-by-design planning.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## Top 100 Web Vulnerabilities Reference (`top-web-vulnerabilities`)

**Description:** This skill should be used when the user asks to "identify web application vulnerabilities", "explain common security flaws", "understand vulnerability categories", "learn about injection attacks", "review access control weaknesses", "analyze API security issues", "assess security misconfigurations", "understand client-side vulnerabilities", "examine mobile and IoT security flaws", or "reference the OWASP-aligned vulnerability taxonomy". Use this skill to provide comprehensive vulnerability definitions, root causes, impacts, and mitigation strategies across all major web security categories.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## using-superpowers (`using-superpowers`)

**Description:** Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## vulnerability-scanner (`vulnerability-scanner`)

**Description:** Advanced vulnerability analysis principles. OWASP 2025, Supply Chain Security, attack surface mapping, risk prioritization.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## wcag-audit-patterns (`wcag-audit-patterns`)

**Description:** Conduct WCAG 2.2 accessibility audits with automated testing, manual verification, and remediation guidance. Use when auditing websites for accessibility, fixing WCAG violations, or implementing accessible design patterns.

### Use Cases
Not specified

### Example Prompts
Not specified

---

## web-design-guidelines (`web-design-guidelines`)

**Description:** Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Windows Privilege Escalation (`windows-privilege-escalation`)

**Description:** This skill should be used when the user asks to "escalate privileges on Windows," "find Windows privesc vectors," "enumerate Windows for privilege escalation," "exploit Windows misconfigurations," or "perform post-exploitation privilege escalation." It provides comprehensive guidance for discovering and exploiting privilege escalation vulnerabilities in Windows environments.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## Wireshark Network Traffic Analysis (`wireshark-analysis`)

**Description:** This skill should be used when the user asks to "analyze network traffic with Wireshark", "capture packets for troubleshooting", "filter PCAP files", "follow TCP/UDP streams", "detect network anomalies", "investigate suspicious traffic", or "perform protocol analysis". It provides comprehensive techniques for network packet capture, filtering, and analysis using Wireshark.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

## WordPress Penetration Testing (`wordpress-penetration-testing`)

**Description:** This skill should be used when the user asks to "pentest WordPress sites", "scan WordPress for vulnerabilities", "enumerate WordPress users, themes, or plugins", "exploit WordPress vulnerabilities", or "use WPScan". It provides comprehensive WordPress security assessment methodologies.

### Use Cases
This skill is applicable to execute the workflow or actions described in the overview.

### Example Prompts
Not specified

---

