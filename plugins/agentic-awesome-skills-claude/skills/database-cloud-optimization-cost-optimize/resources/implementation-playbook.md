# Cloud Cost Optimization Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Instructions

### 1. Cost Analysis and Visibility

Implement comprehensive cost analysis:

**Cost Analysis Framework**
```python
import boto3
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json

class CloudCostAnalyzer:
    def __init__(self, cloud_provider: str):
        self.provider = cloud_provider
        self.client = self._initialize_client()
        self.cost_data = None
        
    def analyze_costs(self, time_period: int = 30):
        """Comprehensive cost analysis"""
        analysis = {
            'total_cost': self._get_total_cost(time_period),
            'cost_by_service': self._analyze_by_service(time_period),
            'cost_by_resource': self._analyze_by_resource(time_period),
            'cost_trends': self._analyze_trends(time_period),
            'anomalies': self._detect_anomalies(time_period),
            'waste_analysis': self._identify_waste(),
            'optimization_opportunities': self._find_opportunities()
        }
        
        return self._generate_report(analysis)
    
    def _analyze_by_service(self, days: int):
        """Analyze costs by service"""
        if self.provider == 'aws':
            ce = boto3.client('ce')
            
            response = ce.get_cost_and_usage(
                TimePeriod={
                    'Start': (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d'),
                    'End': datetime.now().strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['UnblendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            # Process response
            service_costs = {}
            for result in response['ResultsByTime']:
                for group in result['Groups']:
                    service = group['Keys'][0]
                    cost = float(group['Metrics']['UnblendedCost']['Amount'])
                    
                    if service not in service_costs:
                        service_costs[service] = []
                    service_costs[service].append(cost)
            
            # Calculate totals and trends
            analysis = {}
            for service, costs in service_costs.items():
                analysis[service] = {
                    'total': sum(costs),
                    'average_daily': sum(costs) / len(costs),
                    'trend': self._calculate_trend(costs),
                    'percentage': (sum(costs) / self._get_total_cost(days)) * 100
                }
            
            return analysis
    
    def _identify_waste(self):
        """Identify wasted resources"""
        waste_analysis = {
            'unused_resources': self._find_unused_resources(),
            'oversized_resources': self._find_oversized_resources(),
            'unattached_storage': self._find_unattached_storage(),
            'idle_load_balancers': self._find_idle_load_balancers(),
            'old_snapshots': self._find_old_snapshots(),
            'untagged_resources': self._find_untagged_resources()
        }
        
        total_waste = sum(item['estimated_savings'] 
                         for category in waste_analysis.values() 
                         for item in category)
        
        waste_analysis['total_potential_savings'] = total_waste
        
        return waste_analysis
    
    def _find_unused_resources(self):
        """Find resources with no usage"""
        unused = []
        
        if self.provider == 'aws':
            # Check EC2 instances
            ec2 = boto3.client('ec2')
            cloudwatch = boto3.client('cloudwatch')
            
            instances = ec2.describe_instances(
                Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
            )
            
            for reservation in instances['Reservations']:
                for instance in reservation['Instances']:
                    # Check CPU utilization
                    metrics = cloudwatch.get_metric_statistics(
                        Namespace='AWS/EC2',
                        MetricName='CPUUtilization',
                        Dimensions=[
                            {'Name': 'InstanceId', 'Value': instance['InstanceId']}
                        ],
                        StartTime=datetime.now() - timedelta(days=7),
                        EndTime=datetime.now(),
                        Period=3600,
                        Statistics=['Average']
                    )
                    
                    if metrics['Datapoints']:
                        avg_cpu = sum(d['Average'] for d in metrics['Datapoints']) / len(metrics['Datapoints'])
                        
                        if avg_cpu < 5:  # Less than 5% CPU usage
                            unused.append({
                                'resource_type': 'EC2 Instance',
                                'resource_id': instance['InstanceId'],
                                'reason': f'Average CPU: {avg_cpu:.2f}%',
                                'estimated_savings': self._calculate_instance_cost(instance)
                            })
        
        return unused
```

### 2. Resource Rightsizing

Implement intelligent rightsizing:

**Rightsizing Engine**
```python
class ResourceRightsizer:
    def __init__(self):
        self.utilization_thresholds = {
            'cpu_low': 20,
            'cpu_high': 80,
            'memory_low': 30,
            'memory_high': 85,
            'network_low': 10,
            'network_high': 70
        }
    
    def analyze_rightsizing_opportunities(self):
        """Find rightsizing opportunities"""
        opportunities = {
            'ec2_instances': self._rightsize_ec2(),
            'rds_instances': self._rightsize_rds(),
            'containers': self._rightsize_containers(),
            'lambda_functions': self._rightsize_lambda(),
            'storage_volumes': self._rightsize_storage()
        }
        
        return self._prioritize_opportunities(opportunities)
    
    def _rightsize_ec2(self):
        """Rightsize EC2 instances"""
        recommendations = []
        
        instances = self._get_running_instances()
        
        for instance in instances:
            # Get utilization metrics
            utilization = self._get_instance_utilization(instance['InstanceId'])
            
            # Determine if oversized or undersized
            current_type = instance['InstanceType']
            recommended_type = self._recommend_instance_type(
                current_type, 
                utilization
            )
            
            if recommended_type != current_type:
                current_cost = self._get_instance_cost(current_type)
                new_cost = self._get_instance_cost(recommended_type)
                
                recommendations.append({
                    'resource_id': instance['InstanceId'],
                    'current_type': current_type,
                    'recommended_type': recommended_type,
                    'reason': self._generate_reason(utilization),
                    'current_cost': current_cost,
                    'new_cost': new_cost,
                    'monthly_savings': (current_cost - new_cost) * 730,
                    'effort': 'medium',
                    'risk': 'low' if 'downsize' in self._generate_reason(utilization) else 'medium'
                })
        
        return recommendations
    
    def _recommend_instance_type(self, current_type: str, utilization: Dict):
        """Recommend optimal instance type"""
        # Parse current instance family and size
        family, size = self._parse_instance_type(current_type)
        
        # Calculate required resources
        required_cpu = self._calculate_required_cpu(utilization['cpu'])
        required_memory = self._calculate_required_memory(utilization['memory'])
        
        # Find best matching instance
        instance_catalog = self._get_instance_catalog()
        
        candidates = []
        for instance_type, specs in instance_catalog.items():
            if (specs['vcpu'] >= required_cpu and 
                specs['memory'] >= required_memory):
                candidates.append({
                    'type': instance_type,
                    'cost': specs['cost'],
                    'vcpu': specs['vcpu'],
                    'memory': specs['memory'],
                    'efficiency_score': self._calculate_efficiency_score(
                        specs, required_cpu, required_memory
                    )
                })
        
        # Select best candidate
        if candidates:
            best = sorted(candidates, 
                         key=lambda x: (x['efficiency_score'], x['cost']))[0]
            return best['type']
        
        return current_type
    
    def create_rightsizing_automation(self):
        """Automated rightsizing implementation"""
        return '''
import boto3
from datetime import datetime
import logging

class AutomatedRightsizer:
    def __init__(self):
        self.ec2 = boto3.client('ec2')
        self.cloudwatch = boto3.client('cloudwatch')
        self.logger = logging.getLogger(__name__)
        
    def execute_rightsizing(self, recommendations: List[Dict], dry_run: bool = True):
        """Execute rightsizing recommendations"""
        results = []
        
        for recommendation in recommendations:
            try:
                if recommendation['risk'] == 'low' or self._get_approval(recommendation):
                    result = self._resize_instance(
                        recommendation['resource_id'],
                        recommendation['recommended_type'],
                        dry_run=dry_run
                    )
                    results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to resize {recommendation['resource_id']}: {e}")
                
        return results
    
    def _resize_instance(self, instance_id: str, new_type: str, dry_run: bool):
        """Resize an EC2 instance"""
        # Create snapshot for rollback
        snapshot_id = self._create_snapshot(instance_id)
        
        try:
            # Stop instance
            if not dry_run:
                self.ec2.stop_instances(InstanceIds=[instance_id])
                self._wait_for_state(instance_id, 'stopped')
            
            # Change instance type
            self.ec2.modify_instance_attribute(
                InstanceId=instance_id,
                InstanceType={'Value': new_type},
                DryRun=dry_run
            )
            
            # Start instance
            if not dry_run:
                self.ec2.start_instances(InstanceIds=[instance_id])
                self._wait_for_state(instance_id, 'running')
            
            return {
                'instance_id': instance_id,
                'status': 'success',
                'new_type': new_type,
                'snapshot_id': snapshot_id
            }
            
        except Exception as e:
            # Rollback on failure
            if not dry_run:
                self._rollback_instance(instance_id, snapshot_id)
            raise
'''
```

### 3. Reserved Instances and Savings Plans

Optimize commitment-based discounts:

**Reservation Optimizer**
```python
class ReservationOptimizer:
    def __init__(self):
        self.usage_history = None
        self.existing_reservations = None
        
    def analyze_reservation_opportunities(self):
        """Analyze opportunities for reservations"""
        analysis = {
            'current_coverage': self._analyze_current_coverage(),
            'usage_patterns': self._analyze_usage_patterns(),
            'recommendations': self._generate_recommendations(),
            'roi_analysis': self._calculate_roi(),
            'risk_assessment': self._assess_commitment_risk()
        }
        
        return analysis
    
    def _analyze_usage_patterns(self):
        """Analyze historical usage patterns"""
        # Get 12 months of usage data
        usage_data = self._get_historical_usage(months=12)
        
        patterns = {
            'stable_workloads': [],
            'variable_workloads': [],
            'seasonal_patterns': [],
            'growth_trends': []
        }
        
        # Analyze each instance family
        for family in self._get_instance_families(usage_data):
            family_usage = self._filter_by_family(usage_data, family)
            
            # Calculate stability metrics
            stability = self._calculate_stability(family_usage)
            
            if stability['coefficient_of_variation'] < 0.1:
                patterns['stable_workloads'].append({
                    'family': family,
                    'average_usage': stability['mean'],
                    'min_usage': stability['min'],
                    'recommendation': 'reserved_instance',
                    'term': '3_year',
                    'payment': 'all_upfront'
                })
            elif stability['coefficient_of_variation'] < 0.3:
                patterns['variable_workloads'].append({
                    'family': family,
                    'average_usage': stability['mean'],
                    'baseline': stability['percentile_25'],
                    'recommendation': 'savings_plan',
                    'commitment': stability['percentile_25']
                })
            
            # Check for seasonal patterns
            if self._has_seasonal_pattern(family_usage):
                patterns['seasonal_patterns'].append({
                    'family': family,
                    'pattern': self._identify_seasonal_pattern(family_usage),
                    'recommendation': 'spot_with_savings_plan_baseline'
                })
        
        return patterns
    
    def _generate_recommendations(self):
        """Generate reservation recommendations"""
        recommendations = []
        
        patterns = self._analyze_usage_patterns()
        current_costs = self._calculate_current_costs()
        
        # Reserved Instance recommendations
        for workload in patterns['stable_workloads']:
            ri_options = self._calculate_ri_options(workload)
            
            for option in ri_options:
                savings = current_costs[workload['family']] - option['total_cost']
                
                if savings > 0:
                    recommendations.append({
                        'type': 'reserved_instance',
                        'family': workload['family'],
                        'quantity': option['quantity'],
                        'term': option['term'],
                        'payment': option['payment_option'],
                        'upfront_cost': option['upfront_cost'],
                        'monthly_cost': option['monthly_cost'],
                        'total_savings': savings,
                        'break_even_months': option['upfront_cost'] / (savings / 36),
                        'confidence': 'high'
                    })
        
        # Savings Plan recommendations
        for workload in patterns['variable_workloads']:
            sp_options = self._calculate_savings_plan_options(workload)
            
            for option in sp_options:
                recommendations.append({
                    'type': 'savings_plan',
                    'commitment_type': option['type'],
                    'hourly_commitment': option['commitment'],
                    'term': option['term'],
                    'estimated_savings': option['savings'],
                    'flexibility': option['flexibility_score'],
                    'confidence': 'medium'
                })
        
        return sorted(recommendations, key=lambda x: x.get('total_savings', 0), reverse=True)
    
    def create_reservation_dashboard(self):
        """Create reservation tracking dashboard"""
        return '''
<!DOCTYPE html>
<html>
<head>
    <title>Reservation & Savings Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard">
        <div class="summary-cards">
            <div class="card">
                <h3>Current Coverage</h3>
                <div class="metric">{coverage_percentage}%</div>
                <div class="sub-metric">On-Demand: ${on_demand_cost}</div>
                <div class="sub-metric">Reserved: ${reserved_cost}</div>
            </div>
            
            <div class="card">
                <h3>Potential Savings</h3>
                <div class="metric">${potential_savings}/month</div>
                <div class="sub-metric">{recommendations_count} opportunities</div>
            </div>
            
            <div class="card">
                <h3>Expiring Soon</h3>
                <div class="metric">{expiring_count} RIs</div>
                <div class="sub-metric">Next 30 days</div>
            </div>
        </div>
        
        <div class="charts">
            <canvas id="coverageChart"></canvas>
            <canvas id="savingsChart"></canvas>
        </div>
        
        <div class="recommendations-table">
            <h3>Top Recommendations</h3>
            <table>
                <tr>
                    <th>Type</th>
                    <th>Resource</th>
                    <th>Term</th>
                    <th>Upfront</th>
                    <th>Monthly Savings</th>
                    <th>ROI</th>
                    <th>Action</th>
                </tr>
                {recommendation_rows}
            </table>
        </div>
    </div>
</body>
</html>
'''
```

### 4. Spot Instance Optimization

Leverage spot instances effectively:

**Spot Instance Manager**
```python
class SpotInstanceOptimizer:
    def __init__(self):
        self.spot_advisor = self._init_spot_advisor()
        self.interruption_handler = None
        
    def identify_spot_opportunities(self):
        """Identify workloads suitable for spot"""
        workloads = self._analyze_workloads()
        
        spot_candidates = {
            'batch_processing': [],
            'dev_test': [],
            'stateless_apps': [],
            'ci_cd': [],
            'data_processing': []
        }
        
        for workload in workloads:
            suitability = self._assess_spot_suitability(workload)
            
            if suitability['score'] > 0.7:
                spot_candidates[workload['type']].append({
                    'workload': workload['name'],
                    'current_cost': workload['cost'],
                    'spot_savings': workload['cost'] * 0.7,  # ~70% savings
                    'interruption_tolerance': suitability['interruption_tolerance'],
                    'recommended_strategy': self._recommend_spot_strategy(workload)
                })
        
        return spot_candidates
    
    def _recommend_spot_strategy(self, workload):
        """Recommend spot instance strategy"""
        if workload['interruption_tolerance'] == 'high':
            return {
                'strategy': 'spot_fleet_diverse',
                'instance_pools': 10,
                'allocation_strategy': 'capacity-optimized',
                'on_demand_base': 0,
                'spot_percentage': 100
            }
        elif workload['interruption_tolerance'] == 'medium':
            return {
                'strategy': 'mixed_instances',
                'on_demand_base': 25,
                'spot_percentage': 75,
                'spot_allocation': 'lowest-price'
            }
        else:
            return {
                'strategy': 'spot_with_fallback',
                'primary': 'spot',
                'fallback': 'on-demand',
                'checkpointing': True
            }
    
    def create_spot_configuration(self):
        """Create spot instance configuration"""
        return '''
# Terraform configuration for Spot instances
resource "aws_spot_fleet_request" "processing_fleet" {
  iam_fleet_role = aws_iam_role.spot_fleet.arn
  
  allocation_strategy = "diversified"
  target_capacity     = 100
  valid_until        = timeadd(timestamp(), "168h")
  
  # Define multiple launch specifications for diversity
  dynamic "launch_specification" {
    for_each = var.spot_instance_types
    
    content {
      instance_type     = launch_specification.value
      ami              = var.ami_id
      key_name         = var.key_name
      subnet_id        = var.subnet_ids[launch_specification.key % length(var.subnet_ids)]
      
      weighted_capacity = var.instance_weights[launch_specification.value]
      spot_price       = var.max_spot_prices[launch_specification.value]
      
      user_data = base64encode(templatefile("${path.module}/spot-init.sh", {
        interruption_handler = true
        checkpoint_s3_bucket = var.checkpoint_bucket
      }))
      
      tags = {
        Name = "spot-processing-${launch_specification.key}"
        Type = "spot"
      }
    }
  }
  
  # Interruption handling
  lifecycle {
    create_before_destroy = true
  }
}

# Spot interruption handler
resource "aws_lambda_function" "spot_interruption_handler" {
  filename         = "spot-handler.zip"
  function_name    = "spot-interruption-handler"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handler.main"
  runtime         = "python3.9"
  
  environment {
    variables = {
      CHECKPOINT_BUCKET = var.checkpoint_bucket
      SNS_TOPIC_ARN    = aws_sns_topic.spot_interruptions.arn
    }
  }
}
'''
```

### 5. Storage Optimization

Optimize storage costs:

**Storage Optimizer**
```python
class StorageOptimizer:
    def analyze_storage_costs(self):
        """Comprehensive storage analysis"""
        analysis = {
            'ebs_volumes': self._analyze_ebs_volumes(),
            's3_buckets': self._analyze_s3_buckets(),
            'snapshots': self._analyze_snapshots(),
            'lifecycle_opportunities': self._find_lifecycle_opportunities(),
            'compression_opportunities': self._find_compression_opportunities()
        }
        
        return analysis
    
    def _analyze_s3_buckets(self):
        """Analyze S3 bucket costs and optimization"""
        s3 = boto3.client('s3')
        cloudwatch = boto3.client('cloudwatch')
        
        buckets = s3.list_buckets()['Buckets']
        bucket_analysis = []
        
        for bucket in buckets:
            bucket_name = bucket['Name']
            
            # Get storage metrics
            metrics = self._get_s3_metrics(bucket_name)
            
            # Analyze storage classes
            storage_class_distribution = self._get_storage_class_distribution(bucket_name)
            
            # Calculate optimization potential
            optimization = self._calculate_s3_optimization(
                bucket_name,
                metrics,
                storage_class_distribution
            )
            
            bucket_analysis.append({
                'bucket_name': bucket_name,
                'total_size_gb': metrics['size_gb'],
                'total_objects': metrics['object_count'],
                'current_cost': metrics['monthly_cost'],
                'storage_classes': storage_class_distribution,
                'optimization_recommendations': optimization['recommendations'],
                'potential_savings': optimization['savings']
            })
        
        return bucket_analysis
    
    def create_lifecycle_policies(self):
        """Create S3 lifecycle policies"""
        return '''
import boto3
from datetime import datetime

class S3LifecycleManager:
    def __init__(self):
        self.s3 = boto3.client('s3')
        
    def create_intelligent_lifecycle(self, bucket_name: str, access_patterns: Dict):
        """Create lifecycle policy based on access patterns"""
        
        rules = []
        
        # Intelligent tiering for unknown access patterns
        if access_patterns.get('unpredictable'):
            rules.append({
                'ID': 'intelligent-tiering',
                'Status': 'Enabled',
                'Transitions': [{
                    'Days': 1,
                    'StorageClass': 'INTELLIGENT_TIERING'
                }]
            })
        
        # Standard lifecycle for predictable patterns
        if access_patterns.get('predictable'):
            rules.append({
                'ID': 'standard-lifecycle',
                'Status': 'Enabled',
                'Transitions': [
                    {
                        'Days': 30,
                        'StorageClass': 'STANDARD_IA'
                    },
                    {
                        'Days': 90,
                        'StorageClass': 'GLACIER'
                    },
                    {
                        'Days': 180,
                        'StorageClass': 'DEEP_ARCHIVE'
                    }
                ]
            })
        
        # Delete old versions
        rules.append({
            'ID': 'delete-old-versions',
            'Status': 'Enabled',
            'NoncurrentVersionTransitions': [
                {
                    'NoncurrentDays': 30,
                    'StorageClass': 'GLACIER'
                }
            ],
            'NoncurrentVersionExpiration': {
                'NoncurrentDays': 90
            }
        })
        
        # Apply lifecycle configuration
        self.s3.put_bucket_lifecycle_configuration(
            Bucket=bucket_name,
            LifecycleConfiguration={'Rules': rules}
        )
        
        return rules
    
    def optimize_ebs_volumes(self):
        """Optimize EBS volume types and sizes"""
        ec2 = boto3.client('ec2')
        
        volumes = ec2.describe_volumes()['Volumes']
        optimizations = []
        
        for volume in volumes:
            # Analyze volume metrics
            iops_usage = self._get_volume_iops_usage(volume['VolumeId'])
            throughput_usage = self._get_volume_throughput_usage(volume['VolumeId'])
            
            current_type = volume['VolumeType']
            recommended_type = self._recommend_volume_type(
                iops_usage,
                throughput_usage,
                volume['Size']
            )
            
            if recommended_type != current_type:
                optimizations.append({
                    'volume_id': volume['VolumeId'],
                    'current_type': current_type,
                    'recommended_type': recommended_type,
                    'reason': self._get_optimization_reason(
                        current_type,
                        recommended_type,
                        iops_usage,
                        throughput_usage
                    ),
                    'monthly_savings': self._calculate_volume_savings(
                        volume,
                        recommended_type
                    )
                })
        
        return optimizations
'''
```

### 6. Network Cost Optimization

Reduce network transfer costs:

**Network Cost Optimizer**
```python
class NetworkCostOptimizer:
    def analyze_network_costs(self):
        """Analyze network transfer costs"""
        analysis = {
            'data_transfer_costs': self._analyze_data_transfer(),
            'nat_gateway_costs': self._analyze_nat_gateways(),
            'load_balancer_costs': self._analyze_load_balancers(),
            'vpc_endpoint_opportunities': self._find_vpc_endpoint_opportunities(),
            'cdn_optimization': self._analyze_cdn_usage()
        }
        
        return analysis
    
    def _analyze_data_transfer(self):
        """Analyze data transfer patterns and costs"""
        transfers = {
            'inter_region': self._get_inter_region_transfers(),
            'internet_egress': self._get_internet_egress(),
            'inter_az': self._get_inter_az_transfers(),
            'vpc_peering': self._get_vpc_peering_transfers()
        }
        
        recommendations = []
        
        # Analyze inter-region transfers
        if transfers['inter_region']['monthly_gb'] > 1000:
            recommendations.append({
                'type': 'region_consolidation',
                'description': 'Consider consolidating resources in fewer regions',
                'current_cost': transfers['inter_region']['monthly_cost'],
                'potential_savings': transfers['inter_region']['monthly_cost'] * 0.8
            })
        
        # Analyze internet egress
        if transfers['internet_egress']['monthly_gb'] > 10000:
            recommendations.append({
                'type': 'cdn_implementation',
                'description': 'Implement CDN to reduce origin egress',
                'current_cost': transfers['internet_egress']['monthly_cost'],
                'potential_savings': transfers['internet_egress']['monthly_cost'] * 0.6
            })
        
        return {
            'current_costs': transfers,
            'recommendations': recommendations
        }
    
    def create_network_optimization_script(self):
        """Script to implement network optimizations"""
        return '''
#!/usr/bin/env python3
import boto3
from collections import defaultdict

class NetworkOptimizer:
    def __init__(self):
        self.ec2 = boto3.client('ec2')
        self.cloudwatch = boto3.client('cloudwatch')
        
    def optimize_nat_gateways(self):
        """Consolidate and optimize NAT gateways"""
        # Get all NAT gateways
        nat_gateways = self.ec2.describe_nat_gateways()['NatGateways']
        
        # Group by VPC
        vpc_nat_gateways = defaultdict(list)
        for nat in nat_gateways:
            if nat['State'] == 'available':
                vpc_nat_gateways[nat['VpcId']].append(nat)
        
        optimizations = []
        
        for vpc_id, nats in vpc_nat_gateways.items():
            if len(nats) > 1:
                # Check if consolidation is possible
                traffic_analysis = self._analyze_nat_traffic(nats)
                
                if traffic_analysis['can_consolidate']:
                    optimizations.append({
                        'vpc_id': vpc_id,
                        'action': 'consolidate_nat',
                        'current_count': len(nats),
                        'recommended_count': traffic_analysis['recommended_count'],
                        'monthly_savings': (len(nats) - traffic_analysis['recommended_count']) * 45
                    })
        
        return optimizations
    
    def implement_vpc_endpoints(self):
        """Implement VPC endpoints for AWS services"""
        services_to_check = ['s3', 'dynamodb', 'ec2', 'sns', 'sqs']
        vpc_list = self.ec2.describe_vpcs()['Vpcs']
        
        implementations = []
        
        for vpc in vpc_list:
            vpc_id = vpc['VpcId']
            
            # Check existing endpoints
            existing = self._get_existing_endpoints(vpc_id)
            
            for service in services_to_check:
                if service not in existing:
                    # Check if service is being used
                    if self._is_service_used(vpc_id, service):
                        # Create VPC endpoint
                        endpoint = self._create_vpc_endpoint(vpc_id, service)
                        
                        implementations.append({
                            'vpc_id': vpc_id,
                            'service': service,
                            'endpoint_id': endpoint['VpcEndpointId'],
                            'estimated_savings': self._estimate_endpoint_savings(vpc_id, service)
                        })
        
        return implementations
    
    def optimize_cloudfront_distribution(self):
        """Optimize CloudFront for cost reduction"""
        cloudfront = boto3.client('cloudfront')
        
        distributions = cloudfront.list_distributions()
        optimizations = []
        
        for dist in distributions.get('DistributionList', {}).get('Items', []):
            # Analyze distribution patterns
            analysis = self._analyze_distribution(dist['Id'])
            
            if analysis['optimization_potential']:
                optimizations.append({
                    'distribution_id': dist['Id'],
                    'recommendations': [
                        {
                            'action': 'adjust_price_class',
                            'current': dist['PriceClass'],
                            'recommended': analysis['recommended_price_class'],
                            'savings': analysis['price_class_savings']
                        },
                        {
                            'action': 'optimize_cache_behaviors',
                            'cache_improvements': analysis['cache_improvements'],
                            'savings': analysis['cache_savings']
                        }
                    ]
                })
        
        return optimizations
'''
```

### 7. Container Cost Optimization

Optimize container workloads:

**Container Cost Optimizer**
```python
class ContainerCostOptimizer:
    def optimize_ecs_costs(self):
        """Optimize ECS/Fargate costs"""
        return {
            'cluster_optimization': self._optimize_clusters(),
            'task_rightsizing': self._rightsize_tasks(),
            'scheduling_optimization': self._optimize_scheduling(),
            'fargate_spot': self._implement_fargate_spot()
        }
    
    def _rightsize_tasks(self):
        """Rightsize ECS tasks"""
        ecs = boto3.client('ecs')
        cloudwatch = boto3.client('cloudwatch')
        
        clusters = ecs.list_clusters()['clusterArns']
        recommendations = []
        
        for cluster in clusters:
            # Get services
            services = ecs.list_services(cluster=cluster)['serviceArns']
            
            for service in services:
                # Get task definition
                service_detail = ecs.describe_services(
                    cluster=cluster,
                    services=[service]
                )['services'][0]
                
                task_def = service_detail['taskDefinition']
                
                # Analyze resource utilization
                utilization = self._analyze_task_utilization(cluster, service)
                
                # Generate recommendations
                if utilization['cpu']['average'] < 30 or utilization['memory']['average'] < 40:
                    recommendations.append({
                        'cluster': cluster,
                        'service': service,
                        'current_cpu': service_detail['cpu'],
                        'current_memory': service_detail['memory'],
                        'recommended_cpu': int(service_detail['cpu'] * 0.7),
                        'recommended_memory': int(service_detail['memory'] * 0.8),
                        'monthly_savings': self._calculate_task_savings(
                            service_detail,
                            utilization
                        )
                    })
        
        return recommendations
    
    def create_k8s_cost_optimization(self):
        """Kubernetes cost optimization"""
        return '''
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-optimization-config
data:
  vertical-pod-autoscaler.yaml: |
    apiVersion: autoscaling.k8s.io/v1
    kind: VerticalPodAutoscaler
    metadata:
      name: app-vpa
    spec:
      targetRef:
        apiVersion: apps/v1
        kind: Deployment
        name: app-deployment
      updatePolicy:
        updateMode: "Auto"
      resourcePolicy:
        containerPolicies:
        - containerName: app
          minAllowed:
            cpu: 100m
            memory: 128Mi
          maxAllowed:
            cpu: 2
            memory: 2Gi
  
  cluster-autoscaler-config.yaml: |
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: cluster-autoscaler
    spec:
      template:
        spec:
          containers:
          - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
            name: cluster-autoscaler
            command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=priority
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/cluster-name
            - --scale-down-enabled=true
            - --scale-down-unneeded-time=10m
            - --scale-down-utilization-threshold=0.5
  
  spot-instance-handler.yaml: |
    apiVersion: apps/v1
    kind: DaemonSet
    metadata:
      name: aws-node-termination-handler
    spec:
      selector:
        matchLabels:
          app: aws-node-termination-handler
      template:
        spec:
          containers:
          - name: aws-node-termination-handler
            image: amazon/aws-node-termination-handler:v1.13.0
            env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: ENABLE_SPOT_INTERRUPTION_DRAINING
              value: "true"
            - name: ENABLE_SCHEDULED_EVENT_DRAINING
              value: "true"
'''
```

### 8. Serverless Cost Optimization

Optimize serverless workloads:

**Serverless Optimizer**
```python
class ServerlessOptimizer:
    def optimize_lambda_costs(self):
        """Optimize Lambda function costs"""
        lambda_client = boto3.client('lambda')
        cloudwatch = boto3.client('cloudwatch')
        
        functions = lambda_client.list_functions()['Functions']
        optimizations = []
        
        for function in functions:
            # Analyze function performance
            analysis = self._analyze_lambda_function(function)
            
            # Memory optimization
            if analysis['memory_optimization_possible']:
                optimizations.append({
                    'function_name': function['FunctionName'],
                    'type': 'memory_optimization',
                    'current_memory': function['MemorySize'],
                    'recommended_memory': analysis['optimal_memory'],
                    'estimated_savings': analysis['memory_savings']
                })
            
            # Timeout optimization
            if analysis['timeout_optimization_possible']:
                optimizations.append({
                    'function_name': function['FunctionName'],
                    'type': 'timeout_optimization',
                    'current_timeout': function['Timeout'],
                    'recommended_timeout': analysis['optimal_timeout'],
                    'risk_reduction': 'prevents unnecessary charges from hanging functions'
                })
        
        return optimizations
    
    def implement_lambda_cost_controls(self):
        """Implement Lambda cost controls"""
        return '''
import json
import boto3
from datetime import datetime

def lambda_cost_controller(event, context):
    """Lambda function to monitor and control Lambda costs"""
    
    cloudwatch = boto3.client('cloudwatch')
    lambda_client = boto3.client('lambda')
    
    # Get current month costs
    costs = get_current_month_lambda_costs()
    
    # Check against budget
    budget_limit = float(os.environ.get('MONTHLY_BUDGET', '1000'))
    
    if costs > budget_limit * 0.8:  # 80% of budget
        # Implement cost controls
        high_cost_functions = identify_high_cost_functions()
        
        for func in high_cost_functions:
            # Reduce concurrency
            lambda_client.put_function_concurrency(
                FunctionName=func['FunctionName'],
                ReservedConcurrentExecutions=max(
                    1, 
                    int(func['CurrentConcurrency'] * 0.5)
                )
            )
            
            # Alert
            send_cost_alert(func, costs, budget_limit)
    
    # Implement provisioned concurrency optimization
    optimize_provisioned_concurrency()
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'current_costs': costs,
            'budget_limit': budget_limit,
            'actions_taken': len(high_cost_functions)
        })
    }

def optimize_provisioned_concurrency():
    """Optimize provisioned concurrency based on usage patterns"""
    functions = get_functions_with_provisioned_concurrency()
    
    for func in functions:
        # Analyze invocation patterns
        patterns = analyze_invocation_patterns(func['FunctionName'])
        
        if patterns['predictable']:
            # Schedule provisioned concurrency
            create_scheduled_scaling(
                func['FunctionName'],
                patterns['peak_hours'],
                patterns['peak_concurrency']
            )
        else:
            # Consider removing provisioned concurrency
            if patterns['avg_cold_starts'] < 10:  # per minute
                remove_provisioned_concurrency(func['FunctionName'])
'''
```

### 9. Cost Allocation and Tagging

Implement cost allocation strategies:

**Cost Allocation Manager**
```python
class CostAllocationManager:
    def implement_tagging_strategy(self):
        """Implement comprehensive tagging strategy"""
        return {
            'required_tags': [
                {'key': 'Environment', 'values': ['prod', 'staging', 'dev', 'test']},
                {'key': 'CostCenter', 'values': 'dynamic'},
                {'key': 'Project', 'values': 'dynamic'},
                {'key': 'Owner', 'values': 'dynamic'},
                {'key': 'Department', 'values': 'dynamic'}
            ],
            'automation': self._create_tagging_automation(),
            'enforcement': self._create_tag_enforcement(),
            'reporting': self._create_cost_allocation_reports()
        }
    
    def _create_tagging_automation(self):
        """Automate resource tagging"""
        return '''
import boto3
from datetime import datetime

class AutoTagger:
    def __init__(self):
        self.tag_policies = self.load_tag_policies()
        
    def auto_tag_resources(self, event, context):
        """Auto-tag resources on creation"""
        
        # Parse CloudTrail event
        detail = event['detail']
        event_name = detail['eventName']
        
        # Map events to resource types
        if event_name.startswith('Create'):
            resource_arn = self.extract_resource_arn(detail)
            
            if resource_arn:
                # Determine tags
                tags = self.determine_tags(detail)
                
                # Apply tags
                self.apply_tags(resource_arn, tags)
                
                # Log tagging action
                self.log_tagging(resource_arn, tags)
    
    def determine_tags(self, event_detail):
        """Determine tags based on context"""
        tags = []
        
        # User-based tags
        user_identity = event_detail.get('userIdentity', {})
        if 'userName' in user_identity:
            tags.append({
                'Key': 'Creator',
                'Value': user_identity['userName']
            })
        
        # Time-based tags
        tags.append({
            'Key': 'CreatedDate',
            'Value': datetime.now().strftime('%Y-%m-%d')
        })
        
        # Environment inference
        if 'prod' in event_detail.get('sourceIPAddress', ''):
            env = 'prod'
        elif 'dev' in event_detail.get('sourceIPAddress', ''):
            env = 'dev'
        else:
            env = 'unknown'
            
        tags.append({
            'Key': 'Environment',
            'Value': env
        })
        
        return tags
    
    def create_cost_allocation_dashboard(self):
        """Create cost allocation dashboard"""
        return """
        SELECT 
            tags.environment,
            tags.department,
            tags.project,
            SUM(costs.amount) as total_cost,
            SUM(costs.amount) / SUM(SUM(costs.amount)) OVER () * 100 as percentage
        FROM 
            aws_costs costs
        JOIN 
            resource_tags tags ON costs.resource_id = tags.resource_id
        WHERE 
            costs.date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY 
            tags.environment,
            tags.department,
            tags.project
        ORDER BY 
            total_cost DESC
        """
'''
```

### 10. Cost Monitoring and Alerts

Implement proactive cost monitoring:

**Cost Monitoring System**
```python
class CostMonitoringSystem:
    def setup_cost_alerts(self):
        """Setup comprehensive cost alerting"""
        alerts = []
        
        # Budget alerts
        alerts.extend(self._create_budget_alerts())
        
        # Anomaly detection
        alerts.extend(self._create_anomaly_alerts())
        
        # Threshold alerts
        alerts.extend(self._create_threshold_alerts())
        
        # Forecast alerts
        alerts.extend(self._create_forecast_alerts())
        
        return alerts
    
    def _create_anomaly_alerts(self):
        """Create anomaly detection alerts"""
        ce = boto3.client('ce')
        
        # Create anomaly monitor
        monitor = ce.create_anomaly_monitor(
            AnomalyMonitor={
                'MonitorName': 'ServiceCostMonitor',
                'MonitorType': 'DIMENSIONAL',
                'MonitorDimension': 'SERVICE'
            }
        )
        
        # Create anomaly subscription
        subscription = ce.create_anomaly_subscription(
            AnomalySubscription={
                'SubscriptionName': 'CostAnomalyAlerts',
                'Threshold': 100.0,  # Alert on anomalies > $100
                'Frequency': 'DAILY',
                'MonitorArnList': [monitor['MonitorArn']],
                'Subscribers': [
                    {
                        'Type': 'EMAIL',
                        'Address': 'team@company.com'
                    },
                    {
                        'Type': 'SNS',
                        'Address': 'arn:aws:sns:us-east-1:123456789012:cost-alerts'
                    }
                ]
            }
        )
        
        return [monitor, subscription]
    
    def create_cost_dashboard(self):
        """Create executive cost dashboard"""
        return '''
<!DOCTYPE html>
<html>
<head>
    <title>Cloud Cost Dashboard</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        .metric-card {
            background: #f5f5f5;
            padding: 20px;
            margin: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert { color: #d32f2f; }
        .warning { color: #f57c00; }
        .success { color: #388e3c; }
    </style>
</head>
<body>
    <div id="dashboard">
        <h1>Cloud Cost Optimization Dashboard</h1>
        
        <div class="summary-row">
            <div class="metric-card">
                <h3>Current Month Spend</h3>
                <div class="metric">${current_spend}</div>
                <div class="trend ${spend_trend_class}">${spend_trend}% vs last month</div>
            </div>
            
            <div class="metric-card">
                <h3>Projected Month End</h3>
                <div class="metric">${projected_spend}</div>
                <div class="budget-status">Budget: ${budget}</div>
            </div>
            
            <div class="metric-card">
                <h3>Optimization Opportunities</h3>
                <div class="metric">${total_savings_identified}</div>
                <div class="count">{opportunity_count} recommendations</div>
            </div>
            
            <div class="metric-card">
                <h3>Realized Savings</h3>
                <div class="metric">${realized_savings_mtd}</div>
                <div class="count">YTD: ${realized_savings_ytd}</div>
            </div>
        </div>
        
        <div class="charts-row">
            <div id="spend-trend-chart"></div>
            <div id="service-breakdown-chart"></div>
            <div id="optimization-progress-chart"></div>
        </div>
        
        <div class="recommendations-section">
            <h2>Top Optimization Recommendations</h2>
            <table id="recommendations-table">
                <thead>
                    <tr>
                        <th>Priority</th>
                        <th>Service</th>
                        <th>Recommendation</th>
                        <th>Monthly Savings</th>
                        <th>Effort</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${recommendation_rows}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // Real-time updates
        setInterval(updateDashboard, 60000);
        
        // Initialize charts
        initializeCharts();
    </script>
</body>
</html>
'''
```

## Output Format

1. **Cost Analysis Report**: Comprehensive breakdown of current cloud costs
2. **Optimization Recommendations**: Prioritized list of cost-saving opportunities
3. **Implementation Scripts**: Automated scripts for implementing optimizations
4. **Monitoring Dashboards**: Real-time cost tracking and alerting
5. **ROI Calculations**: Detailed savings projections and payback periods
6. **Risk Assessment**: Analysis of risks associated with each optimization
7. **Implementation Roadmap**: Phased approach to cost optimization
8. **Best Practices Guide**: Long-term cost management strategies

Focus on delivering immediate cost savings while establishing sustainable cost optimization practices that maintain performance and reliability standards.
