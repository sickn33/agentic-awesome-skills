---
name: data-engineering-data-driven-feature
description: "Build features guided by data insights, A/B testing, and continuous measurement using specialized agents for analysis, implementation, and experimentation."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Data-Driven Feature Development

Build features guided by data insights, A/B testing, and continuous measurement using specialized agents for analysis, implementation, and experimentation.

[Extended thinking: This workflow orchestrates a comprehensive data-driven development process from initial data analysis and hypothesis formulation through feature implementation with integrated analytics, A/B testing infrastructure, and post-launch analysis. Each phase leverages specialized agents to ensure features are built based on data insights, properly instrumented for measurement, and validated through controlled experiments. The workflow emphasizes modern product analytics practices, statistical rigor in testing, and continuous learning from user behavior.]

## Use this skill when

- Working on data-driven feature development tasks or workflows
- Needing guidance, best practices, or checklists for data-driven feature development

## Do not use this skill when

- The task is unrelated to data-driven feature development
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Phase 1: Data Analysis and Hypothesis Formation

### 1. Exploratory Data Analysis
- Use Task tool with subagent_type="machine-learning-ops::data-scientist"
- Prompt: "Perform exploratory data analysis for feature: $ARGUMENTS. Analyze existing user behavior data, identify patterns and opportunities, segment users by behavior, and calculate baseline metrics. Use modern analytics tools (Amplitude, Mixpanel, Segment) to understand current user journeys, conversion funnels, and engagement patterns."
- Output: EDA report with visualizations, user segments, behavioral patterns, baseline metrics

### 2. Business Hypothesis Development
- Use Task tool with subagent_type="business-analytics::business-analyst"
- Context: Data scientist's EDA findings and behavioral patterns
- Prompt: "Formulate business hypotheses for feature: $ARGUMENTS based on data analysis. Define clear success metrics, expected impact on key business KPIs, target user segments, and minimum detectable effects. Create measurable hypotheses using frameworks like ICE scoring or RICE prioritization."
- Output: Hypothesis document, success metrics definition, expected ROI calculations

### 3. Statistical Experiment Design
- Use Task tool with subagent_type="machine-learning-ops::data-scientist"
- Context: Business hypotheses and success metrics
- Prompt: "Design statistical experiment for feature: $ARGUMENTS. Calculate required sample size for statistical power, define control and treatment groups, specify randomization strategy, and plan for multiple testing corrections. Consider Bayesian A/B testing approaches for faster decision making. Design for both primary and guardrail metrics."
- Output: Experiment design document, power analysis, statistical test plan

## Phase 2: Feature Architecture and Analytics Design

### 4. Feature Architecture Planning
- Use Task tool with subagent_type="data-engineering::backend-architect"
- Context: Business requirements and experiment design
- Prompt: "Design feature architecture for: $ARGUMENTS with A/B testing capability. Include feature flag integration (LaunchDarkly, Split.io, or Optimizely), gradual rollout strategy, circuit breakers for safety, and clean separation between control and treatment logic. Ensure architecture supports real-time configuration updates."
- Output: Architecture diagrams, feature flag schema, rollout strategy

### 5. Analytics Instrumentation Design
- Use Task tool with subagent_type="data-engineering::data-engineer"
- Context: Feature architecture and success metrics
- Prompt: "Design comprehensive analytics instrumentation for: $ARGUMENTS. Define event schemas for user interactions, specify properties for segmentation and analysis, design funnel tracking and conversion events, plan cohort analysis capabilities. Implement using modern SDKs (Segment, Amplitude, Mixpanel) with proper event taxonomy."
- Output: Event tracking plan, analytics schema, instrumentation guide

### 6. Data Pipeline Architecture
- Use Task tool with subagent_type="data-engineering::data-engineer"
- Context: Analytics requirements and existing data infrastructure
- Prompt: "Design data pipelines for feature: $ARGUMENTS. Include real-time streaming for live metrics (Kafka, Kinesis), batch processing for detailed analysis, data warehouse integration (Snowflake, BigQuery), and feature store for ML if applicable. Ensure proper data governance and GDPR compliance."
- Output: Pipeline architecture, ETL/ELT specifications, data flow diagrams

## Phase 3: Implementation with Instrumentation

### 7. Backend Implementation
- Use Task tool with subagent_type="backend-development::backend-architect"
- Context: Architecture design and feature requirements
- Prompt: "Implement backend for feature: $ARGUMENTS with full instrumentation. Include feature flag checks at decision points, comprehensive event tracking for all user actions, performance metrics collection, error tracking and monitoring. Implement proper logging for experiment analysis."
- Output: Backend code with analytics, feature flag integration, monitoring setup

### 8. Frontend Implementation
- Use Task tool with subagent_type="frontend-mobile-development::frontend-developer"
- Context: Backend APIs and analytics requirements
- Prompt: "Build frontend for feature: $ARGUMENTS with analytics tracking. Implement event tracking for all user interactions, session recording integration if applicable, performance metrics (Core Web Vitals), and proper error boundaries. Ensure consistent experience between control and treatment groups."
- Output: Frontend code with analytics, A/B test variants, performance monitoring

### 9. ML Model Integration (if applicable)
- Use Task tool with subagent_type="machine-learning-ops::ml-engineer"
- Context: Feature requirements and data pipelines
- Prompt: "Integrate ML models for feature: $ARGUMENTS if needed. Implement online inference with low latency, A/B testing between model versions, model performance tracking, and automatic fallback mechanisms. Set up model monitoring for drift detection."
- Output: ML pipeline, model serving infrastructure, monitoring setup

## Phase 4: Pre-Launch Validation

### 10. Analytics Validation
- Use Task tool with subagent_type="data-engineering::data-engineer"
- Context: Implemented tracking and event schemas
- Prompt: "Validate analytics implementation for: $ARGUMENTS. Test all event tracking in staging, verify data quality and completeness, validate funnel definitions, ensure proper user identification and session tracking. Run end-to-end tests for data pipeline."
- Output: Validation report, data quality metrics, tracking coverage analysis

### 11. Experiment Setup
- Use Task tool with subagent_type="cloud-infrastructure::deployment-engineer"
- Context: Feature flags and experiment design
- Prompt: "Configure experiment infrastructure for: $ARGUMENTS. Set up feature flags with proper targeting rules, configure traffic allocation (start with 5-10%), implement kill switches, set up monitoring alerts for key metrics. Test randomization and assignment logic."
- Output: Experiment configuration, monitoring dashboards, rollout plan

## Phase 5: Launch and Experimentation

### 12. Gradual Rollout
- Use Task tool with subagent_type="cloud-infrastructure::deployment-engineer"
- Context: Experiment configuration and monitoring setup
- Prompt: "Execute gradual rollout for feature: $ARGUMENTS. Start with internal dogfooding, then beta users (1-5%), gradually increase to target traffic. Monitor error rates, performance metrics, and early indicators. Implement automated rollback on anomalies."
- Output: Rollout execution, monitoring alerts, health metrics

### 13. Real-time Monitoring
- Use Task tool with subagent_type="observability-monitoring::observability-engineer"
- Context: Deployed feature and success metrics
- Prompt: "Set up comprehensive monitoring for: $ARGUMENTS. Create real-time dashboards for experiment metrics, configure alerts for statistical significance, monitor guardrail metrics for negative impacts, track system performance and error rates. Use tools like Datadog, New Relic, or custom dashboards."
- Output: Monitoring dashboards, alert configurations, SLO definitions

## Phase 6: Analysis and Decision Making

### 14. Statistical Analysis
- Use Task tool with subagent_type="machine-learning-ops::data-scientist"
- Context: Experiment data and original hypotheses
- Prompt: "Analyze A/B test results for: $ARGUMENTS. Calculate statistical significance with confidence intervals, check for segment-level effects, analyze secondary metrics impact, investigate any unexpected patterns. Use both frequentist and Bayesian approaches. Account for multiple testing if applicable."
- Output: Statistical analysis report, significance tests, segment analysis

### 15. Business Impact Assessment
- Use Task tool with subagent_type="business-analytics::business-analyst"
- Context: Statistical analysis and business metrics
- Prompt: "Assess business impact of feature: $ARGUMENTS. Calculate actual vs expected ROI, analyze impact on key business metrics, evaluate cost-benefit including operational overhead, project long-term value. Make recommendation on full rollout, iteration, or rollback."
- Output: Business impact report, ROI analysis, recommendation document

### 16. Post-Launch Optimization
- Use Task tool with subagent_type="machine-learning-ops::data-scientist"
- Context: Launch results and user feedback
- Prompt: "Identify optimization opportunities for: $ARGUMENTS based on data. Analyze user behavior patterns in treatment group, identify friction points in user journey, suggest improvements based on data, plan follow-up experiments. Use cohort analysis for long-term impact."
- Output: Optimization recommendations, follow-up experiment plans

## Configuration Options

```yaml
experiment_config:
  min_sample_size: 10000
  confidence_level: 0.95
  runtime_days: 14
  traffic_allocation: "gradual"  # gradual, fixed, or adaptive

analytics_platforms:
  - amplitude
  - segment
  - mixpanel

feature_flags:
  provider: "launchdarkly"  # launchdarkly, split, optimizely, unleash

statistical_methods:
  - frequentist
  - bayesian

monitoring:
  - real_time_metrics: true
  - anomaly_detection: true
  - automatic_rollback: true
```

## Success Criteria

- **Data Coverage**: 100% of user interactions tracked with proper event schema
- **Experiment Validity**: Proper randomization, sufficient statistical power, no sample ratio mismatch
- **Statistical Rigor**: Clear significance testing, proper confidence intervals, multiple testing corrections
- **Business Impact**: Measurable improvement in target metrics without degrading guardrail metrics
- **Technical Performance**: No degradation in p95 latency, error rates below 0.1%
- **Decision Speed**: Clear go/no-go decision within planned experiment runtime
- **Learning Outcomes**: Documented insights for future feature development

## Coordination Notes

- Data scientists and business analysts collaborate on hypothesis formation
- Engineers implement with analytics as first-class requirement, not afterthought
- Feature flags enable safe experimentation without full deployments
- Real-time monitoring allows for quick iteration and rollback if needed
- Statistical rigor balanced with business practicality and speed to market
- Continuous learning loop feeds back into next feature development cycle

Feature to develop with data-driven approach: $ARGUMENTS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
