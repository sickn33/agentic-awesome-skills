---
name: multi-platform-apps-multi-platform
description: "Build and deploy the same feature consistently across web, mobile, and desktop platforms using API-first architecture and parallel implementation strategies."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Multi-Platform Feature Development Workflow

Build and deploy the same feature consistently across web, mobile, and desktop platforms using API-first architecture and parallel implementation strategies.

[Extended thinking: This workflow orchestrates multiple specialized agents to ensure feature parity across platforms while maintaining platform-specific optimizations. The coordination strategy emphasizes shared contracts and parallel development with regular synchronization points. By establishing API contracts and data models upfront, teams can work independently while ensuring consistency. The workflow benefits include faster time-to-market, reduced integration issues, and maintainable cross-platform codebases.]

## Use this skill when

- Working on multi-platform feature development workflow tasks or workflows
- Needing guidance, best practices, or checklists for multi-platform feature development workflow

## Do not use this skill when

- The task is unrelated to multi-platform feature development workflow
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Phase 1: Architecture and API Design (Sequential)

### 1. Define Feature Requirements and API Contracts
- Use Task tool with subagent_type="backend-architect"
- Prompt: "Design the API contract for feature: $ARGUMENTS. Create OpenAPI 3.1 specification with:
  - RESTful endpoints with proper HTTP methods and status codes
  - GraphQL schema if applicable for complex data queries
  - WebSocket events for real-time features
  - Request/response schemas with validation rules
  - Authentication and authorization requirements
  - Rate limiting and caching strategies
  - Error response formats and codes
  Define shared data models that all platforms will consume."
- Expected output: Complete API specification, data models, and integration guidelines

### 2. Design System and UI/UX Consistency
- Use Task tool with subagent_type="ui-ux-designer"
- Prompt: "Create cross-platform design system for feature using API spec: [previous output]. Include:
  - Component specifications for each platform (Material Design, iOS HIG, Fluent)
  - Responsive layouts for web (mobile-first approach)
  - Native patterns for iOS (SwiftUI) and Android (Material You)
  - Desktop-specific considerations (keyboard shortcuts, window management)
  - Accessibility requirements (WCAG 2.2 Level AA)
  - Dark/light theme specifications
  - Animation and transition guidelines"
- Context from previous: API endpoints, data structures, authentication flows
- Expected output: Design system documentation, component library specs, platform guidelines

### 3. Shared Business Logic Architecture
- Use Task tool with subagent_type="comprehensive-review::architect-review"
- Prompt: "Design shared business logic architecture for cross-platform feature. Define:
  - Core domain models and entities (platform-agnostic)
  - Business rules and validation logic
  - State management patterns (MVI/Redux/BLoC)
  - Caching and offline strategies
  - Error handling and retry policies
  - Platform-specific adapter patterns
  Consider Kotlin Multiplatform for mobile or TypeScript for web/desktop sharing."
- Context from previous: API contracts, data models, UI requirements
- Expected output: Shared code architecture, platform abstraction layers, implementation guide

## Phase 2: Parallel Platform Implementation

### 4a. Web Implementation (React/Next.js)
- Use Task tool with subagent_type="frontend-developer"
- Prompt: "Implement web version of feature using:
  - React 18+ with Next.js 14+ App Router
  - TypeScript for type safety
  - TanStack Query for API integration: [API spec]
  - Zustand/Redux Toolkit for state management
  - Tailwind CSS with design system: [design specs]
  - Progressive Web App capabilities
  - SSR/SSG optimization where appropriate
  - Web vitals optimization (LCP < 2.5s, FID < 100ms)
  Follow shared business logic: [architecture doc]"
- Context from previous: API contracts, design system, shared logic patterns
- Expected output: Complete web implementation with tests

### 4b. iOS Implementation (SwiftUI)
- Use Task tool with subagent_type="ios-developer"
- Prompt: "Implement iOS version using:
  - SwiftUI with iOS 17+ features
  - Swift 5.9+ with async/await
  - URLSession with Combine for API: [API spec]
  - Core Data/SwiftData for persistence
  - Design system compliance: [iOS HIG specs]
  - Widget extensions if applicable
  - Platform-specific features (Face ID, Haptics, Live Activities)
  - Testable MVVM architecture
  Follow shared patterns: [architecture doc]"
- Context from previous: API contracts, iOS design guidelines, shared models
- Expected output: Native iOS implementation with unit/UI tests

### 4c. Android Implementation (Kotlin/Compose)
- Use Task tool with subagent_type="mobile-developer"
- Prompt: "Implement Android version using:
  - Jetpack Compose with Material 3
  - Kotlin coroutines and Flow
  - Retrofit/Ktor for API: [API spec]
  - Room database for local storage
  - Hilt for dependency injection
  - Material You dynamic theming: [design specs]
  - Platform features (biometric auth, widgets)
  - Clean architecture with MVI pattern
  Follow shared logic: [architecture doc]"
- Context from previous: API contracts, Material Design specs, shared patterns
- Expected output: Native Android implementation with tests

### 4d. Desktop Implementation (Optional - Electron/Tauri)
- Use Task tool with subagent_type="frontend-mobile-development::frontend-developer"
- Prompt: "Implement desktop version using Tauri 2.0 or Electron with:
  - Shared web codebase where possible
  - Native OS integration (system tray, notifications)
  - File system access if needed
  - Auto-updater functionality
  - Code signing and notarization setup
  - Keyboard shortcuts and menu bar
  - Multi-window support if applicable
  Reuse web components: [web implementation]"
- Context from previous: Web implementation, desktop-specific requirements
- Expected output: Desktop application with platform packages

## Phase 3: Integration and Validation

### 5. API Documentation and Testing
- Use Task tool with subagent_type="documentation-generation::api-documenter"
- Prompt: "Create comprehensive API documentation including:
  - Interactive OpenAPI/Swagger documentation
  - Platform-specific integration guides
  - SDK examples for each platform
  - Authentication flow diagrams
  - Rate limiting and quota information
  - Postman/Insomnia collections
  - WebSocket connection examples
  - Error handling best practices
  - API versioning strategy
  Test all endpoints with platform implementations."
- Context from previous: Implemented platforms, API usage patterns
- Expected output: Complete API documentation portal, test results

### 6. Cross-Platform Testing and Feature Parity
- Use Task tool with subagent_type="unit-testing::test-automator"
- Prompt: "Validate feature parity across all platforms:
  - Functional testing matrix (features work identically)
  - UI consistency verification (follows design system)
  - Performance benchmarks per platform
  - Accessibility testing (platform-specific tools)
  - Network resilience testing (offline, slow connections)
  - Data synchronization validation
  - Platform-specific edge cases
  - End-to-end user journey tests
  Create test report with any platform discrepancies."
- Context from previous: All platform implementations, API documentation
- Expected output: Test report, parity matrix, performance metrics

### 7. Platform-Specific Optimizations
- Use Task tool with subagent_type="application-performance::performance-engineer"
- Prompt: "Optimize each platform implementation:
  - Web: Bundle size, lazy loading, CDN setup, SEO
  - iOS: App size, launch time, memory usage, battery
  - Android: APK size, startup time, frame rate, battery
  - Desktop: Binary size, resource usage, startup time
  - API: Response time, caching, compression
  Maintain feature parity while leveraging platform strengths.
  Document optimization techniques and trade-offs."
- Context from previous: Test results, performance metrics
- Expected output: Optimized implementations, performance improvements

## Configuration Options

- **--platforms**: Specify target platforms (web,ios,android,desktop)
- **--api-first**: Generate API before UI implementation (default: true)
- **--shared-code**: Use Kotlin Multiplatform or similar (default: evaluate)
- **--design-system**: Use existing or create new (default: create)
- **--testing-strategy**: Unit, integration, e2e (default: all)

## Success Criteria

- API contract defined and validated before implementation
- All platforms achieve feature parity with <5% variance
- Performance metrics meet platform-specific standards
- Accessibility standards met (WCAG 2.2 AA minimum)
- Cross-platform testing shows consistent behavior
- Documentation complete for all platforms
- Code reuse >40% between platforms where applicable
- User experience optimized for each platform's conventions

## Platform-Specific Considerations

**Web**: PWA capabilities, SEO optimization, browser compatibility
**iOS**: App Store guidelines, TestFlight distribution, iOS-specific features
**Android**: Play Store requirements, Android App Bundles, device fragmentation
**Desktop**: Code signing, auto-updates, OS-specific installers

Initial feature specification: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
