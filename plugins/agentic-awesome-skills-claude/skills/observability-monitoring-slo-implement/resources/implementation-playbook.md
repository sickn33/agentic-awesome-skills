# SLO Implementation Guide Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# SLO Implementation Guide

You are an SLO (Service Level Objective) expert specializing in implementing reliability standards and error budget-based engineering practices. Design comprehensive SLO frameworks, establish meaningful SLIs, and create monitoring systems that balance reliability with feature velocity.

## Use this skill when

- Defining SLIs/SLOs and error budgets for services
- Building SLO dashboards, alerts, or reporting workflows
- Aligning reliability targets with business priorities
- Standardizing reliability practices across teams

## Do not use this skill when

- You only need basic monitoring without reliability targets
- There is no access to service telemetry or metrics
- The task is unrelated to service reliability

## Safety

- Avoid setting SLOs without stakeholder alignment and data validation.
- Do not alert on metrics that include sensitive or personal data.

## Context
The user needs to implement SLOs to establish reliability targets, measure service performance, and make data-driven decisions about reliability vs. feature development. Focus on practical SLO implementation that aligns with business objectives.

## Requirements
$ARGUMENTS

## Instructions

### 1. SLO Foundation

Establish SLO fundamentals and framework:

**SLO Framework Designer**
```python
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class SLOFramework:
    def __init__(self, service_name: str):
        self.service = service_name
        self.slos = []
        self.error_budget = None
        
    def design_slo_framework(self):
        """
        Design comprehensive SLO framework
        """
        framework = {
            'service_context': self._analyze_service_context(),
            'user_journeys': self._identify_user_journeys(),
            'sli_candidates': self._identify_sli_candidates(),
            'slo_targets': self._calculate_slo_targets(),
            'error_budgets': self._define_error_budgets(),
            'measurement_strategy': self._design_measurement_strategy()
        }
        
        return self._generate_slo_specification(framework)
    
    def _analyze_service_context(self):
        """Analyze service characteristics for SLO design"""
        return {
            'service_tier': self._determine_service_tier(),
            'user_expectations': self._assess_user_expectations(),
            'business_impact': self._evaluate_business_impact(),
            'technical_constraints': self._identify_constraints(),
            'dependencies': self._map_dependencies()
        }
    
    def _determine_service_tier(self):
        """Determine appropriate service tier and SLO targets"""
        tiers = {
            'critical': {
                'description': 'Revenue-critical or safety-critical services',
                'availability_target': 99.95,
                'latency_p99': 100,
                'error_rate': 0.001,
                'examples': ['payment processing', 'authentication']
            },
            'essential': {
                'description': 'Core business functionality',
                'availability_target': 99.9,
                'latency_p99': 500,
                'error_rate': 0.01,
                'examples': ['search', 'product catalog']
            },
            'standard': {
                'description': 'Standard features',
                'availability_target': 99.5,
                'latency_p99': 1000,
                'error_rate': 0.05,
                'examples': ['recommendations', 'analytics']
            },
            'best_effort': {
                'description': 'Non-critical features',
                'availability_target': 99.0,
                'latency_p99': 2000,
                'error_rate': 0.1,
                'examples': ['batch processing', 'reporting']
            }
        }
        
        # Analyze service characteristics to determine tier
        characteristics = self._analyze_service_characteristics()
        recommended_tier = self._match_tier(characteristics, tiers)
        
        return {
            'recommended': recommended_tier,
            'rationale': self._explain_tier_selection(characteristics),
            'all_tiers': tiers
        }
    
    def _identify_user_journeys(self):
        """Map critical user journeys for SLI selection"""
        journeys = []
        
        # Example user journey mapping
        journey_template = {
            'name': 'User Login',
            'description': 'User authenticates and accesses dashboard',
            'steps': [
                {
                    'step': 'Load login page',
                    'sli_type': 'availability',
                    'threshold': '< 2s load time'
                },
                {
                    'step': 'Submit credentials',
                    'sli_type': 'latency',
                    'threshold': '< 500ms response'
                },
                {
                    'step': 'Validate authentication',
                    'sli_type': 'error_rate',
                    'threshold': '< 0.1% auth failures'
                },
                {
                    'step': 'Load dashboard',
                    'sli_type': 'latency',
                    'threshold': '< 3s full render'
                }
            ],
            'critical_path': True,
            'business_impact': 'high'
        }
        
        return journeys
```

### 2. SLI Selection and Measurement

Choose and implement appropriate SLIs:

**SLI Implementation**
```python
class SLIImplementation:
    def __init__(self):
        self.sli_types = {
            'availability': AvailabilitySLI,
            'latency': LatencySLI,
            'error_rate': ErrorRateSLI,
            'throughput': ThroughputSLI,
            'quality': QualitySLI
        }
    
    def implement_slis(self, service_type):
        """Implement SLIs based on service type"""
        if service_type == 'api':
            return self._api_slis()
        elif service_type == 'web':
            return self._web_slis()
        elif service_type == 'batch':
            return self._batch_slis()
        elif service_type == 'streaming':
            return self._streaming_slis()
    
    def _api_slis(self):
        """SLIs for API services"""
        return {
            'availability': {
                'definition': 'Percentage of successful requests',
                'formula': 'successful_requests / total_requests * 100',
                'implementation': '''
# Prometheus query for API availability
api_availability = """
sum(rate(http_requests_total{status!~"5.."}[5m])) / 
sum(rate(http_requests_total[5m])) * 100
"""

# Implementation
class APIAvailabilitySLI:
    def __init__(self, prometheus_client):
        self.prom = prometheus_client
        
    def calculate(self, time_range='5m'):
        query = f"""
        sum(rate(http_requests_total{{status!~"5.."}}[{time_range}])) / 
        sum(rate(http_requests_total[{time_range}])) * 100
        """
        result = self.prom.query(query)
        return float(result[0]['value'][1])
    
    def calculate_with_exclusions(self, time_range='5m'):
        """Calculate availability excluding certain endpoints"""
        query = f"""
        sum(rate(http_requests_total{{
            status!~"5..",
            endpoint!~"/health|/metrics"
        }}[{time_range}])) / 
        sum(rate(http_requests_total{{
            endpoint!~"/health|/metrics"
        }}[{time_range}])) * 100
        """
        return self.prom.query(query)
'''
            },
            'latency': {
                'definition': 'Percentage of requests faster than threshold',
                'formula': 'fast_requests / total_requests * 100',
                'implementation': '''
# Latency SLI with multiple thresholds
class LatencySLI:
    def __init__(self, thresholds_ms):
        self.thresholds = thresholds_ms  # e.g., {'p50': 100, 'p95': 500, 'p99': 1000}
    
    def calculate_latency_sli(self, time_range='5m'):
        slis = {}
        
        for percentile, threshold in self.thresholds.items():
            query = f"""
            sum(rate(http_request_duration_seconds_bucket{{
                le="{threshold/1000}"
            }}[{time_range}])) / 
            sum(rate(http_request_duration_seconds_count[{time_range}])) * 100
            """
            
            slis[f'latency_{percentile}'] = {
                'value': self.execute_query(query),
                'threshold': threshold,
                'unit': 'ms'
            }
        
        return slis
    
    def calculate_user_centric_latency(self):
        """Calculate latency from user perspective"""
        # Include client-side metrics
        query = """
        histogram_quantile(0.95,
            sum(rate(user_request_duration_bucket[5m])) by (le)
        )
        """
        return self.execute_query(query)
'''
            },
            'error_rate': {
                'definition': 'Percentage of successful requests',
                'formula': '(1 - error_requests / total_requests) * 100',
                'implementation': '''
class ErrorRateSLI:
    def calculate_error_rate(self, time_range='5m'):
        """Calculate error rate with categorization"""
        
        # Different error categories
        error_categories = {
            'client_errors': 'status=~"4.."',
            'server_errors': 'status=~"5.."',
            'timeout_errors': 'status="504"',
            'business_errors': 'error_type="business_logic"'
        }
        
        results = {}
        for category, filter_expr in error_categories.items():
            query = f"""
            sum(rate(http_requests_total{{{filter_expr}}}[{time_range}])) / 
            sum(rate(http_requests_total[{time_range}])) * 100
            """
            results[category] = self.execute_query(query)
        
        # Overall error rate (excluding 4xx)
        overall_query = f"""
        (1 - sum(rate(http_requests_total{{status=~"5.."}}[{time_range}])) / 
        sum(rate(http_requests_total[{time_range}]))) * 100
        """
        results['overall_success_rate'] = self.execute_query(overall_query)
        
        return results
'''
            }
        }
```

### 3. Error Budget Calculation

Implement error budget tracking:

**Error Budget Manager**
```python
class ErrorBudgetManager:
    def __init__(self, slo_target: float, window_days: int):
        self.slo_target = slo_target
        self.window_days = window_days
        self.error_budget_minutes = self._calculate_total_budget()
    
    def _calculate_total_budget(self):
        """Calculate total error budget in minutes"""
        total_minutes = self.window_days * 24 * 60
        allowed_downtime_ratio = 1 - (self.slo_target / 100)
        return total_minutes * allowed_downtime_ratio
    
    def calculate_error_budget_status(self, start_date, end_date):
        """Calculate current error budget status"""
        # Get actual performance
        actual_uptime = self._get_actual_uptime(start_date, end_date)
        
        # Calculate consumed budget
        total_time = (end_date - start_date).total_seconds() / 60
        expected_uptime = total_time * (self.slo_target / 100)
        consumed_minutes = expected_uptime - actual_uptime
        
        # Calculate remaining budget
        remaining_budget = self.error_budget_minutes - consumed_minutes
        burn_rate = consumed_minutes / self.error_budget_minutes
        
        # Project exhaustion
        if burn_rate > 0:
            days_until_exhaustion = (self.window_days * (1 - burn_rate)) / burn_rate
        else:
            days_until_exhaustion = float('inf')
        
        return {
            'total_budget_minutes': self.error_budget_minutes,
            'consumed_minutes': consumed_minutes,
            'remaining_minutes': remaining_budget,
            'burn_rate': burn_rate,
            'budget_percentage_remaining': (remaining_budget / self.error_budget_minutes) * 100,
            'projected_exhaustion_days': days_until_exhaustion,
            'status': self._determine_status(remaining_budget, burn_rate)
        }
    
    def _determine_status(self, remaining_budget, burn_rate):
        """Determine error budget status"""
        if remaining_budget <= 0:
            return 'exhausted'
        elif burn_rate > 2:
            return 'critical'
        elif burn_rate > 1.5:
            return 'warning'
        elif burn_rate > 1:
            return 'attention'
        else:
            return 'healthy'
    
    def generate_burn_rate_alerts(self):
        """Generate multi-window burn rate alerts"""
        return {
            'fast_burn': {
                'description': '14.4x burn rate over 1 hour',
                'condition': 'burn_rate >= 14.4 AND window = 1h',
                'action': 'page',
                'budget_consumed': '2% in 1 hour'
            },
            'slow_burn': {
                'description': '3x burn rate over 6 hours',
                'condition': 'burn_rate >= 3 AND window = 6h',
                'action': 'ticket',
                'budget_consumed': '10% in 6 hours'
            }
        }
```

### 4. SLO Monitoring Setup

Implement comprehensive SLO monitoring:

**SLO Monitoring Implementation**
```yaml
# Prometheus recording rules for SLO
groups:
  - name: slo_rules
    interval: 30s
    rules:
      # Request rate
      - record: service:request_rate
        expr: |
          sum(rate(http_requests_total[5m])) by (service, method, route)
      
      # Success rate
      - record: service:success_rate_5m
        expr: |
          (
            sum(rate(http_requests_total{status!~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
          ) * 100
      
      # Multi-window success rates
      - record: service:success_rate_30m
        expr: |
          (
            sum(rate(http_requests_total{status!~"5.."}[30m])) by (service)
            /
            sum(rate(http_requests_total[30m])) by (service)
          ) * 100
      
      - record: service:success_rate_1h
        expr: |
          (
            sum(rate(http_requests_total{status!~"5.."}[1h])) by (service)
            /
            sum(rate(http_requests_total[1h])) by (service)
          ) * 100
      
      # Latency percentiles
      - record: service:latency_p50_5m
        expr: |
          histogram_quantile(0.50,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          )
      
      - record: service:latency_p95_5m
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          )
      
      - record: service:latency_p99_5m
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          )
      
      # Error budget burn rate
      - record: service:error_budget_burn_rate_1h
        expr: |
          (
            1 - (
              sum(increase(http_requests_total{status!~"5.."}[1h])) by (service)
              /
              sum(increase(http_requests_total[1h])) by (service)
            )
          ) / (1 - 0.999) # 99.9% SLO
```

**Alert Configuration**
```yaml
# Multi-window multi-burn-rate alerts
groups:
  - name: slo_alerts
    rules:
      # Fast burn alert (2% budget in 1 hour)
      - alert: ErrorBudgetFastBurn
        expr: |
          (
            service:error_budget_burn_rate_5m{service="api"} > 14.4
            AND
            service:error_budget_burn_rate_1h{service="api"} > 14.4
          )
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Fast error budget burn for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} is burning error budget at 14.4x rate.
            Current burn rate: {{ $value }}x
            This will exhaust 2% of monthly budget in 1 hour.
          
      # Slow burn alert (10% budget in 6 hours)
      - alert: ErrorBudgetSlowBurn
        expr: |
          (
            service:error_budget_burn_rate_30m{service="api"} > 3
            AND
            service:error_budget_burn_rate_6h{service="api"} > 3
          )
        for: 15m
        labels:
          severity: warning
          team: platform
        annotations:
          summary: "Slow error budget burn for {{ $labels.service }}"
          description: |
            Service {{ $labels.service }} is burning error budget at 3x rate.
            Current burn rate: {{ $value }}x
            This will exhaust 10% of monthly budget in 6 hours.
```

### 5. SLO Dashboard

Create comprehensive SLO dashboards:

**Grafana Dashboard Configuration**
```python
def create_slo_dashboard():
    """Generate Grafana dashboard for SLO monitoring"""
    return {
        "dashboard": {
            "title": "Service SLO Dashboard",
            "panels": [
                {
                    "title": "SLO Summary",
                    "type": "stat",
                    "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
                    "targets": [{
                        "expr": "service:success_rate_30d{service=\"$service\"}",
                        "legendFormat": "30-day SLO"
                    }],
                    "fieldConfig": {
                        "defaults": {
                            "thresholds": {
                                "mode": "absolute",
                                "steps": [
                                    {"color": "red", "value": None},
                                    {"color": "yellow", "value": 99.5},
                                    {"color": "green", "value": 99.9}
                                ]
                            },
                            "unit": "percent"
                        }
                    }
                },
                {
                    "title": "Error Budget Status",
                    "type": "gauge",
                    "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0},
                    "targets": [{
                        "expr": '''
                        100 * (
                            1 - (
                                (1 - service:success_rate_30d{service="$service"}/100) /
                                (1 - $slo_target/100)
                            )
                        )
                        ''',
                        "legendFormat": "Remaining Budget"
                    }],
                    "fieldConfig": {
                        "defaults": {
                            "min": 0,
                            "max": 100,
                            "thresholds": {
                                "mode": "absolute",
                                "steps": [
                                    {"color": "red", "value": None},
                                    {"color": "yellow", "value": 20},
                                    {"color": "green", "value": 50}
                                ]
                            },
                            "unit": "percent"
                        }
                    }
                },
                {
                    "title": "Burn Rate Trend",
                    "type": "graph",
                    "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
                    "targets": [
                        {
                            "expr": "service:error_budget_burn_rate_1h{service=\"$service\"}",
                            "legendFormat": "1h burn rate"
                        },
                        {
                            "expr": "service:error_budget_burn_rate_6h{service=\"$service\"}",
                            "legendFormat": "6h burn rate"
                        },
                        {
                            "expr": "service:error_budget_burn_rate_24h{service=\"$service\"}",
                            "legendFormat": "24h burn rate"
                        }
                    ],
                    "yaxes": [{
                        "format": "short",
                        "label": "Burn Rate (x)",
                        "min": 0
                    }],
                    "alert": {
                        "conditions": [{
                            "evaluator": {"params": [14.4], "type": "gt"},
                            "operator": {"type": "and"},
                            "query": {"params": ["A", "5m", "now"]},
                            "type": "query"
                        }],
                        "name": "High burn rate detected"
                    }
                }
            ]
        }
    }
```

### 6. SLO Reporting

Generate SLO reports and reviews:

**SLO Report Generator**
```python
class SLOReporter:
    def __init__(self, metrics_client):
        self.metrics = metrics_client
        
    def generate_monthly_report(self, service, month):
        """Generate comprehensive monthly SLO report"""
        report_data = {
            'service': service,
            'period': month,
            'slo_performance': self._calculate_slo_performance(service, month),
            'incidents': self._analyze_incidents(service, month),
            'error_budget': self._analyze_error_budget(service, month),
            'trends': self._analyze_trends(service, month),
            'recommendations': self._generate_recommendations(service, month)
        }
        
        return self._format_report(report_data)
    
    def _calculate_slo_performance(self, service, month):
        """Calculate SLO performance metrics"""
        slos = {}
        
        # Availability SLO
        availability_query = f"""
        avg_over_time(
            service:success_rate_5m{{service="{service}"}}[{month}]
        )
        """
        slos['availability'] = {
            'target': 99.9,
            'actual': self.metrics.query(availability_query),
            'met': self.metrics.query(availability_query) >= 99.9
        }
        
        # Latency SLO
        latency_query = f"""
        quantile_over_time(0.95,
            service:latency_p95_5m{{service="{service}"}}[{month}]
        )
        """
        slos['latency_p95'] = {
            'target': 500,  # ms
            'actual': self.metrics.query(latency_query) * 1000,
            'met': self.metrics.query(latency_query) * 1000 <= 500
        }
        
        return slos
    
    def _format_report(self, data):
        """Format report as HTML"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <title>SLO Report - {data['service']} - {data['period']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        .summary {{ background: #f0f0f0; padding: 20px; border-radius: 8px; }}
        .metric {{ margin: 20px 0; }}
        .good {{ color: green; }}
        .bad {{ color: red; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        .chart {{ margin: 20px 0; }}
    </style>
</head>
<body>
    <h1>SLO Report: {data['service']}</h1>
    <h2>Period: {data['period']}</h2>
    
    <div class="summary">
        <h3>Executive Summary</h3>
        <p>Service reliability: {data['slo_performance']['availability']['actual']:.2f}%</p>
        <p>Error budget remaining: {data['error_budget']['remaining_percentage']:.1f}%</p>
        <p>Number of incidents: {len(data['incidents'])}</p>
    </div>
    
    <div class="metric">
        <h3>SLO Performance</h3>
        <table>
            <tr>
                <th>SLO</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Status</th>
            </tr>
            {self._format_slo_table_rows(data['slo_performance'])}
        </table>
    </div>
    
    <div class="incidents">
        <h3>Incident Analysis</h3>
        {self._format_incident_analysis(data['incidents'])}
    </div>
    
    <div class="recommendations">
        <h3>Recommendations</h3>
        {self._format_recommendations(data['recommendations'])}
    </div>
</body>
</html>
"""
```

### 7. SLO-Based Decision Making

Implement SLO-driven engineering decisions:

**SLO Decision Framework**
```python
class SLODecisionFramework:
    def __init__(self, error_budget_policy):
        self.policy = error_budget_policy
        
    def make_release_decision(self, service, release_risk):
        """Make release decisions based on error budget"""
        budget_status = self.get_error_budget_status(service)
        
        decision_matrix = {
            'healthy': {
                'low_risk': 'approve',
                'medium_risk': 'approve',
                'high_risk': 'review'
            },
            'attention': {
                'low_risk': 'approve',
                'medium_risk': 'review',
                'high_risk': 'defer'
            },
            'warning': {
                'low_risk': 'review',
                'medium_risk': 'defer',
                'high_risk': 'block'
            },
            'critical': {
                'low_risk': 'defer',
                'medium_risk': 'block',
                'high_risk': 'block'
            },
            'exhausted': {
                'low_risk': 'block',
                'medium_risk': 'block',
                'high_risk': 'block'
            }
        }
        
        decision = decision_matrix[budget_status['status']][release_risk]
        
        return {
            'decision': decision,
            'rationale': self._explain_decision(budget_status, release_risk),
            'conditions': self._get_approval_conditions(decision, budget_status),
            'alternative_actions': self._suggest_alternatives(decision, budget_status)
        }
    
    def prioritize_reliability_work(self, service):
        """Prioritize reliability improvements based on SLO gaps"""
        slo_gaps = self.analyze_slo_gaps(service)
        
        priorities = []
        for gap in slo_gaps:
            priority_score = self.calculate_priority_score(gap)
            
            priorities.append({
                'issue': gap['issue'],
                'impact': gap['impact'],
                'effort': gap['estimated_effort'],
                'priority_score': priority_score,
                'recommended_actions': self.recommend_actions(gap)
            })
        
        return sorted(priorities, key=lambda x: x['priority_score'], reverse=True)
    
    def calculate_toil_budget(self, team_size, slo_performance):
        """Calculate how much toil is acceptable based on SLOs"""
        # If meeting SLOs, can afford more toil
        # If not meeting SLOs, need to reduce toil
        
        base_toil_percentage = 50  # Google SRE recommendation
        
        if slo_performance >= 100:
            # Exceeding SLO, can take on more toil
            toil_budget = base_toil_percentage + 10
        elif slo_performance >= 99:
            # Meeting SLO
            toil_budget = base_toil_percentage
        else:
            # Not meeting SLO, reduce toil
            toil_budget = base_toil_percentage - (100 - slo_performance) * 5
        
        return {
            'toil_percentage': max(toil_budget, 20),  # Minimum 20%
            'toil_hours_per_week': (toil_budget / 100) * 40 * team_size,
            'automation_hours_per_week': ((100 - toil_budget) / 100) * 40 * team_size
        }
```

### 8. SLO Templates

Provide SLO templates for common services:

**SLO Template Library**
```python
class SLOTemplates:
    @staticmethod
    def get_api_service_template():
        """SLO template for API services"""
        return {
            'name': 'API Service SLO Template',
            'slos': [
                {
                    'name': 'availability',
                    'description': 'The proportion of successful requests',
                    'sli': {
                        'type': 'ratio',
                        'good_events': 'requests with status != 5xx',
                        'total_events': 'all requests'
                    },
                    'objectives': [
                        {'window': '30d', 'target': 99.9}
                    ]
                },
                {
                    'name': 'latency',
                    'description': 'The proportion of fast requests',
                    'sli': {
                        'type': 'ratio',
                        'good_events': 'requests faster than 500ms',
                        'total_events': 'all requests'
                    },
                    'objectives': [
                        {'window': '30d', 'target': 95.0}
                    ]
                }
            ]
        }
    
    @staticmethod
    def get_data_pipeline_template():
        """SLO template for data pipelines"""
        return {
            'name': 'Data Pipeline SLO Template',
            'slos': [
                {
                    'name': 'freshness',
                    'description': 'Data is processed within SLA',
                    'sli': {
                        'type': 'ratio',
                        'good_events': 'batches processed within 30 minutes',
                        'total_events': 'all batches'
                    },
                    'objectives': [
                        {'window': '7d', 'target': 99.0}
                    ]
                },
                {
                    'name': 'completeness',
                    'description': 'All expected data is processed',
                    'sli': {
                        'type': 'ratio',
                        'good_events': 'records successfully processed',
                        'total_events': 'all records'
                    },
                    'objectives': [
                        {'window': '7d', 'target': 99.95}
                    ]
                }
            ]
        }
```

### 9. SLO Automation

Automate SLO management:

**SLO Automation Tools**
```python
class SLOAutomation:
    def __init__(self):
        self.config = self.load_slo_config()
        
    def auto_generate_slos(self, service_discovery):
        """Automatically generate SLOs for discovered services"""
        services = service_discovery.get_all_services()
        generated_slos = []
        
        for service in services:
            # Analyze service characteristics
            characteristics = self.analyze_service(service)
            
            # Select appropriate template
            template = self.select_template(characteristics)
            
            # Customize based on observed behavior
            customized_slo = self.customize_slo(template, service)
            
            generated_slos.append(customized_slo)
        
        return generated_slos
    
    def implement_progressive_slos(self, service):
        """Implement progressively stricter SLOs"""
        return {
            'phase1': {
                'duration': '1 month',
                'target': 99.0,
                'description': 'Baseline establishment'
            },
            'phase2': {
                'duration': '2 months',
                'target': 99.5,
                'description': 'Initial improvement'
            },
            'phase3': {
                'duration': '3 months',
                'target': 99.9,
                'description': 'Production readiness'
            },
            'phase4': {
                'duration': 'ongoing',
                'target': 99.95,
                'description': 'Excellence'
            }
        }
    
    def create_slo_as_code(self):
        """Define SLOs as code"""
        return '''
# slo_definitions.yaml
apiVersion: slo.dev/v1
kind: ServiceLevelObjective
metadata:
  name: api-availability
  namespace: production
spec:
  service: api-service
  description: API service availability SLO
  
  indicator:
    type: ratio
    counter:
      metric: http_requests_total
      filters:
        - status_code != 5xx
    total:
      metric: http_requests_total
  
  objectives:
    - displayName: 30-day rolling window
      window: 30d
      target: 0.999
      
  alerting:
    burnRates:
      - severity: critical
        shortWindow: 1h
        longWindow: 5m
        burnRate: 14.4
      - severity: warning
        shortWindow: 6h
        longWindow: 30m
        burnRate: 3
        
  annotations:
    runbook: https://runbooks.example.com/api-availability
    dashboard: https://grafana.example.com/d/api-slo
'''
```

### 10. SLO Culture and Governance

Establish SLO culture:

**SLO Governance Framework**
```python
class SLOGovernance:
    def establish_slo_culture(self):
        """Establish SLO-driven culture"""
        return {
            'principles': [
                'SLOs are a shared responsibility',
                'Error budgets drive prioritization',
                'Reliability is a feature',
                'Measure what matters to users'
            ],
            'practices': {
                'weekly_reviews': self.weekly_slo_review_template(),
                'incident_retrospectives': self.slo_incident_template(),
                'quarterly_planning': self.quarterly_slo_planning(),
                'stakeholder_communication': self.stakeholder_report_template()
            },
            'roles': {
                'slo_owner': {
                    'responsibilities': [
                        'Define and maintain SLO definitions',
                        'Monitor SLO performance',
                        'Lead SLO reviews',
                        'Communicate with stakeholders'
                    ]
                },
                'engineering_team': {
                    'responsibilities': [
                        'Implement SLI measurements',
                        'Respond to SLO breaches',
                        'Improve reliability',
                        'Participate in reviews'
                    ]
                },
                'product_owner': {
                    'responsibilities': [
                        'Balance features vs reliability',
                        'Approve error budget usage',
                        'Set business priorities',
                        'Communicate with customers'
                    ]
                }
            }
        }
    
    def create_slo_review_process(self):
        """Create structured SLO review process"""
        return '''
# Weekly SLO Review Template

## Agenda (30 minutes)

### 1. SLO Performance Review (10 min)
- Current SLO status for all services
- Error budget consumption rate
- Trend analysis

### 2. Incident Review (10 min)
- Incidents impacting SLOs
- Root cause analysis
- Action items

### 3. Decision Making (10 min)
- Release approvals/deferrals
- Resource allocation
- Priority adjustments

## Review Checklist

- [ ] All SLOs reviewed
- [ ] Burn rates analyzed
- [ ] Incidents discussed
- [ ] Action items assigned
- [ ] Decisions documented

## Output Template

### Service: [Service Name]
- **SLO Status**: [Green/Yellow/Red]
- **Error Budget**: [XX%] remaining
- **Key Issues**: [List]
- **Actions**: [List with owners]
- **Decisions**: [List]
'''
```

## Output Format

1. **SLO Framework**: Comprehensive SLO design and objectives
2. **SLI Implementation**: Code and queries for measuring SLIs
3. **Error Budget Tracking**: Calculations and burn rate monitoring
4. **Monitoring Setup**: Prometheus rules and Grafana dashboards
5. **Alert Configuration**: Multi-window multi-burn-rate alerts
6. **Reporting Templates**: Monthly reports and reviews
7. **Decision Framework**: SLO-based engineering decisions
8. **Automation Tools**: SLO-as-code and auto-generation
9. **Governance Process**: Culture and review processes

Focus on creating meaningful SLOs that balance reliability with feature velocity, providing clear signals for engineering decisions and fostering a culture of reliability.
