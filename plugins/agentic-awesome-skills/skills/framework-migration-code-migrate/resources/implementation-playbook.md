# Code Migration Assistant Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Code Migration Assistant

You are a code migration expert specializing in transitioning codebases between frameworks, languages, versions, and platforms. Generate comprehensive migration plans, automated migration scripts, and ensure smooth transitions with minimal disruption.

## Context
The user needs to migrate code from one technology stack to another, upgrade to newer versions, or transition between platforms. Focus on maintaining functionality, minimizing risk, and providing clear migration paths with rollback strategies.

## Requirements
$ARGUMENTS

## Instructions

### 1. Migration Assessment

Analyze the current codebase and migration requirements:

**Migration Analyzer**
```python
import os
import json
import ast
import re
from pathlib import Path
from collections import defaultdict

class MigrationAnalyzer:
    def __init__(self, source_path, target_tech):
        self.source_path = Path(source_path)
        self.target_tech = target_tech
        self.analysis = defaultdict(dict)
    
    def analyze_migration(self):
        """
        Comprehensive migration analysis
        """
        self.analysis['source'] = self._analyze_source()
        self.analysis['complexity'] = self._assess_complexity()
        self.analysis['dependencies'] = self._analyze_dependencies()
        self.analysis['risks'] = self._identify_risks()
        self.analysis['effort'] = self._estimate_effort()
        self.analysis['strategy'] = self._recommend_strategy()
        
        return self.analysis
    
    def _analyze_source(self):
        """Analyze source codebase characteristics"""
        stats = {
            'files': 0,
            'lines': 0,
            'components': 0,
            'patterns': [],
            'frameworks': set(),
            'languages': defaultdict(int)
        }
        
        for file_path in self.source_path.rglob('*'):
            if file_path.is_file() and not self._is_ignored(file_path):
                stats['files'] += 1
                ext = file_path.suffix
                stats['languages'][ext] += 1
                
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    stats['lines'] += len(content.splitlines())
                    
                    # Detect frameworks and patterns
                    self._detect_patterns(content, stats)
        
        return stats
    
    def _assess_complexity(self):
        """Assess migration complexity"""
        factors = {
            'size': self._calculate_size_complexity(),
            'architectural': self._calculate_architectural_complexity(),
            'dependency': self._calculate_dependency_complexity(),
            'business_logic': self._calculate_logic_complexity(),
            'data': self._calculate_data_complexity()
        }
        
        overall = sum(factors.values()) / len(factors)
        
        return {
            'factors': factors,
            'overall': overall,
            'level': self._get_complexity_level(overall)
        }
    
    def _identify_risks(self):
        """Identify migration risks"""
        risks = []
        
        # Check for high-risk patterns
        risk_patterns = {
            'global_state': {
                'pattern': r'(global|window)\.\w+\s*=',
                'severity': 'high',
                'description': 'Global state management needs careful migration'
            },
            'direct_dom': {
                'pattern': r'document\.(getElementById|querySelector)',
                'severity': 'medium',
                'description': 'Direct DOM manipulation needs framework adaptation'
            },
            'async_patterns': {
                'pattern': r'(callback|setTimeout|setInterval)',
                'severity': 'medium',
                'description': 'Async patterns may need modernization'
            },
            'deprecated_apis': {
                'pattern': r'(componentWillMount|componentWillReceiveProps)',
                'severity': 'high',
                'description': 'Deprecated APIs need replacement'
            }
        }
        
        for risk_name, risk_info in risk_patterns.items():
            occurrences = self._count_pattern_occurrences(risk_info['pattern'])
            if occurrences > 0:
                risks.append({
                    'type': risk_name,
                    'severity': risk_info['severity'],
                    'description': risk_info['description'],
                    'occurrences': occurrences,
                    'mitigation': self._suggest_mitigation(risk_name)
                })
        
        return sorted(risks, key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['severity']])
```

### 2. Migration Planning

Create detailed migration plans:

**Migration Planner**
```python
class MigrationPlanner:
    def create_migration_plan(self, analysis):
        """
        Create comprehensive migration plan
        """
        plan = {
            'phases': self._define_phases(analysis),
            'timeline': self._estimate_timeline(analysis),
            'resources': self._calculate_resources(analysis),
            'milestones': self._define_milestones(analysis),
            'success_criteria': self._define_success_criteria()
        }
        
        return self._format_plan(plan)
    
    def _define_phases(self, analysis):
        """Define migration phases"""
        complexity = analysis['complexity']['overall']
        
        if complexity < 3:
            # Simple migration
            return [
                {
                    'name': 'Preparation',
                    'duration': '1 week',
                    'tasks': [
                        'Setup new project structure',
                        'Install dependencies',
                        'Configure build tools',
                        'Setup testing framework'
                    ]
                },
                {
                    'name': 'Core Migration',
                    'duration': '2-3 weeks',
                    'tasks': [
                        'Migrate utility functions',
                        'Port components/modules',
                        'Update data models',
                        'Migrate business logic'
                    ]
                },
                {
                    'name': 'Testing & Refinement',
                    'duration': '1 week',
                    'tasks': [
                        'Unit testing',
                        'Integration testing',
                        'Performance testing',
                        'Bug fixes'
                    ]
                }
            ]
        else:
            # Complex migration
            return [
                {
                    'name': 'Phase 0: Foundation',
                    'duration': '2 weeks',
                    'tasks': [
                        'Architecture design',
                        'Proof of concept',
                        'Tool selection',
                        'Team training'
                    ]
                },
                {
                    'name': 'Phase 1: Infrastructure',
                    'duration': '3 weeks',
                    'tasks': [
                        'Setup build pipeline',
                        'Configure development environment',
                        'Implement core abstractions',
                        'Setup automated testing'
                    ]
                },
                {
                    'name': 'Phase 2: Incremental Migration',
                    'duration': '6-8 weeks',
                    'tasks': [
                        'Migrate shared utilities',
                        'Port feature modules',
                        'Implement adapters/bridges',
                        'Maintain dual runtime'
                    ]
                },
                {
                    'name': 'Phase 3: Cutover',
                    'duration': '2 weeks',
                    'tasks': [
                        'Complete remaining migrations',
                        'Remove legacy code',
                        'Performance optimization',
                        'Final testing'
                    ]
                }
            ]
    
    def _format_plan(self, plan):
        """Format migration plan as markdown"""
        output = "# Migration Plan\n\n"
        
        # Executive Summary
        output += "## Executive Summary\n\n"
        output += f"- **Total Duration**: {plan['timeline']['total']}\n"
        output += f"- **Team Size**: {plan['resources']['team_size']}\n"
        output += f"- **Risk Level**: {plan['timeline']['risk_buffer']}\n\n"
        
        # Phases
        output += "## Migration Phases\n\n"
        for i, phase in enumerate(plan['phases']):
            output += f"### {phase['name']}\n"
            output += f"**Duration**: {phase['duration']}\n\n"
            output += "**Tasks**:\n"
            for task in phase['tasks']:
                output += f"- {task}\n"
            output += "\n"
        
        # Milestones
        output += "## Key Milestones\n\n"
        for milestone in plan['milestones']:
            output += f"- **{milestone['name']}**: {milestone['criteria']}\n"
        
        return output
```

### 3. Framework Migrations

Handle specific framework migrations:

**React to Vue Migration**
```javascript
class ReactToVueMigrator {
    migrateComponent(reactComponent) {
        // Parse React component
        const ast = parseReactComponent(reactComponent);
        
        // Extract component structure
        const componentInfo = {
            name: this.extractComponentName(ast),
            props: this.extractProps(ast),
            state: this.extractState(ast),
            methods: this.extractMethods(ast),
            lifecycle: this.extractLifecycle(ast),
            render: this.extractRender(ast)
        };
        
        // Generate Vue component
        return this.generateVueComponent(componentInfo);
    }
    
    generateVueComponent(info) {
        return `
<template>
${this.convertJSXToTemplate(info.render)}
</template>

<script>
export default {
    name: '${info.name}',
    props: ${this.convertProps(info.props)},
    data() {
        return ${this.convertState(info.state)}
    },
    methods: ${this.convertMethods(info.methods)},
    ${this.convertLifecycle(info.lifecycle)}
}
</script>

<style scoped>
/* Component styles */
</style>
`;
    }
    
    convertJSXToTemplate(jsx) {
        // Convert JSX to Vue template syntax
        let template = jsx;
        
        // Convert className to class
        template = template.replace(/className=/g, 'class=');
        
        // Convert onClick to @click
        template = template.replace(/onClick={/g, '@click="');
        template = template.replace(/on(\w+)={this\.(\w+)}/g, '@$1="$2"');
        
        // Convert conditional rendering
        template = template.replace(/{(\w+) && (.+?)}/g, '<template v-if="$1">$2</template>');
        template = template.replace(/{(\w+) \? (.+?) : (.+?)}/g, 
            '<template v-if="$1">$2</template><template v-else>$3</template>');
        
        // Convert map iterations
        template = template.replace(
            /{(\w+)\.map\(\((\w+), (\w+)\) => (.+?)\)}/g,
            '<template v-for="($2, $3) in $1" :key="$3">$4</template>'
        );
        
        return template;
    }
    
    convertLifecycle(lifecycle) {
        const vueLifecycle = {
            'componentDidMount': 'mounted',
            'componentDidUpdate': 'updated',
            'componentWillUnmount': 'beforeDestroy',
            'getDerivedStateFromProps': 'computed'
        };
        
        let result = '';
        for (const [reactHook, vueHook] of Object.entries(vueLifecycle)) {
            if (lifecycle[reactHook]) {
                result += `${vueHook}() ${lifecycle[reactHook].body},\n`;
            }
        }
        
        return result;
    }
}
```

### 4. Language Migrations

Handle language version upgrades:

**Python 2 to 3 Migration**
```python
class Python2to3Migrator:
    def __init__(self):
        self.transformations = {
            'print_statement': self.transform_print,
            'unicode_literals': self.transform_unicode,
            'division': self.transform_division,
            'imports': self.transform_imports,
            'iterators': self.transform_iterators,
            'exceptions': self.transform_exceptions
        }
    
    def migrate_file(self, file_path):
        """Migrate single Python file from 2 to 3"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Parse AST
        try:
            tree = ast.parse(content)
        except SyntaxError:
            # Try with 2to3 lib for syntax conversion first
            content = self._basic_syntax_conversion(content)
            tree = ast.parse(content)
        
        # Apply transformations
        transformer = Python3Transformer()
        new_tree = transformer.visit(tree)
        
        # Generate new code
        return astor.to_source(new_tree)
    
    def transform_print(self, content):
        """Transform print statements to functions"""
        # Simple regex for basic cases
        content = re.sub(
            r'print\s+([^(].*?)$',
            r'print(\1)',
            content,
            flags=re.MULTILINE
        )
        
        # Handle print with >>
        content = re.sub(
            r'print\s*>>\s*(\w+),\s*(.+?)$',
            r'print(\2, file=\1)',
            content,
            flags=re.MULTILINE
        )
        
        return content
    
    def transform_unicode(self, content):
        """Handle unicode literals"""
        # Remove u prefix from strings
        content = re.sub(r'u"([^"]*)"', r'"\1"', content)
        content = re.sub(r"u'([^']*)'", r"'\1'", content)
        
        # Convert unicode() to str()
        content = re.sub(r'\bunicode\(', 'str(', content)
        
        return content
    
    def transform_iterators(self, content):
        """Transform iterator methods"""
        replacements = {
            '.iteritems()': '.items()',
            '.iterkeys()': '.keys()',
            '.itervalues()': '.values()',
            'xrange': 'range',
            '.has_key(': ' in '
        }
        
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        return content

class Python3Transformer(ast.NodeTransformer):
    """AST transformer for Python 3 migration"""
    
    def visit_Raise(self, node):
        """Transform raise statements"""
        if node.exc and node.cause:
            # raise Exception, args -> raise Exception(args)
            if isinstance(node.cause, ast.Str):
                node.exc = ast.Call(
                    func=node.exc,
                    args=[node.cause],
                    keywords=[]
                )
                node.cause = None
        
        return node
    
    def visit_ExceptHandler(self, node):
        """Transform except clauses"""
        if node.type and node.name:
            # except Exception, e -> except Exception as e
            if isinstance(node.name, ast.Name):
                node.name = node.name.id
        
        return node
```

### 5. API Migration

Migrate between API paradigms:

**REST to GraphQL Migration**
```javascript
class RESTToGraphQLMigrator {
    constructor(restEndpoints) {
        this.endpoints = restEndpoints;
        this.schema = {
            types: {},
            queries: {},
            mutations: {}
        };
    }
    
    generateGraphQLSchema() {
        // Analyze REST endpoints
        this.analyzeEndpoints();
        
        // Generate type definitions
        const typeDefs = this.generateTypeDefs();
        
        // Generate resolvers
        const resolvers = this.generateResolvers();
        
        return { typeDefs, resolvers };
    }
    
    analyzeEndpoints() {
        for (const endpoint of this.endpoints) {
            const { method, path, response, params } = endpoint;
            
            // Extract resource type
            const resourceType = this.extractResourceType(path);
            
            // Build GraphQL type
            if (!this.schema.types[resourceType]) {
                this.schema.types[resourceType] = this.buildType(response);
            }
            
            // Map to GraphQL operations
            if (method === 'GET') {
                this.addQuery(resourceType, path, params);
            } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
                this.addMutation(resourceType, path, params, method);
            }
        }
    }
    
    generateTypeDefs() {
        let schema = 'type Query {\n';
        
        // Add queries
        for (const [name, query] of Object.entries(this.schema.queries)) {
            schema += `  ${name}${this.generateArgs(query.args)}: ${query.returnType}\n`;
        }
        
        schema += '}\n\ntype Mutation {\n';
        
        // Add mutations
        for (const [name, mutation] of Object.entries(this.schema.mutations)) {
            schema += `  ${name}${this.generateArgs(mutation.args)}: ${mutation.returnType}\n`;
        }
        
        schema += '}\n\n';
        
        // Add types
        for (const [typeName, fields] of Object.entries(this.schema.types)) {
            schema += `type ${typeName} {\n`;
            for (const [fieldName, fieldType] of Object.entries(fields)) {
                schema += `  ${fieldName}: ${fieldType}\n`;
            }
            schema += '}\n\n';
        }
        
        return schema;
    }
    
    generateResolvers() {
        const resolvers = {
            Query: {},
            Mutation: {}
        };
        
        // Generate query resolvers
        for (const [name, query] of Object.entries(this.schema.queries)) {
            resolvers.Query[name] = async (parent, args, context) => {
                // Transform GraphQL args to REST params
                const restParams = this.transformArgs(args, query.paramMapping);
                
                // Call REST endpoint
                const response = await fetch(
                    this.buildUrl(query.endpoint, restParams),
                    { method: 'GET' }
                );
                
                return response.json();
            };
        }
        
        // Generate mutation resolvers
        for (const [name, mutation] of Object.entries(this.schema.mutations)) {
            resolvers.Mutation[name] = async (parent, args, context) => {
                const { input } = args;
                
                const response = await fetch(
                    mutation.endpoint,
                    {
                        method: mutation.method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(input)
                    }
                );
                
                return response.json();
            };
        }
        
        return resolvers;
    }
}
```

### 6. Database Migration

Migrate between database systems:

**SQL to NoSQL Migration**
```python
class SQLToNoSQLMigrator:
    def __init__(self, source_db, target_db):
        self.source = source_db
        self.target = target_db
        self.schema_mapping = {}
    
    def analyze_schema(self):
        """Analyze SQL schema for NoSQL conversion"""
        tables = self.get_sql_tables()
        
        for table in tables:
            # Get table structure
            columns = self.get_table_columns(table)
            relationships = self.get_table_relationships(table)
            
            # Design document structure
            doc_structure = self.design_document_structure(
                table, columns, relationships
            )
            
            self.schema_mapping[table] = doc_structure
        
        return self.schema_mapping
    
    def design_document_structure(self, table, columns, relationships):
        """Design NoSQL document structure from SQL table"""
        structure = {
            'collection': self.to_collection_name(table),
            'fields': {},
            'embedded': [],
            'references': []
        }
        
        # Map columns to fields
        for col in columns:
            structure['fields'][col['name']] = {
                'type': self.map_sql_type_to_nosql(col['type']),
                'required': not col['nullable'],
                'indexed': col.get('is_indexed', False)
            }
        
        # Handle relationships
        for rel in relationships:
            if rel['type'] == 'one-to-one' or self.should_embed(rel):
                structure['embedded'].append({
                    'field': rel['field'],
                    'collection': rel['related_table']
                })
            else:
                structure['references'].append({
                    'field': rel['field'],
                    'collection': rel['related_table'],
                    'type': rel['type']
                })
        
        return structure
    
    def generate_migration_script(self):
        """Generate migration script"""
        script = """
import asyncio
from datetime import datetime

class DatabaseMigrator:
    def __init__(self, sql_conn, nosql_conn):
        self.sql = sql_conn
        self.nosql = nosql_conn
        self.batch_size = 1000
        
    async def migrate(self):
        start_time = datetime.now()
        
        # Create indexes
        await self.create_indexes()
        
        # Migrate data
        for table, mapping in schema_mapping.items():
            await self.migrate_table(table, mapping)
        
        # Verify migration
        await self.verify_migration()
        
        elapsed = datetime.now() - start_time
        print(f"Migration completed in {elapsed}")
    
    async def migrate_table(self, table, mapping):
        print(f"Migrating {table}...")
        
        total_rows = await self.get_row_count(table)
        migrated = 0
        
        async for batch in self.read_in_batches(table):
            documents = []
            
            for row in batch:
                doc = self.transform_row_to_document(row, mapping)
                
                # Handle embedded documents
                for embed in mapping['embedded']:
                    related_data = await self.fetch_related(
                        row, embed['field'], embed['collection']
                    )
                    doc[embed['field']] = related_data
                
                documents.append(doc)
            
            # Bulk insert
            await self.nosql[mapping['collection']].insert_many(documents)
            
            migrated += len(batch)
            progress = (migrated / total_rows) * 100
            print(f"  Progress: {progress:.1f}% ({migrated}/{total_rows})")
    
    def transform_row_to_document(self, row, mapping):
        doc = {}
        
        for field, config in mapping['fields'].items():
            value = row.get(field)
            
            # Type conversion
            if value is not None:
                doc[field] = self.convert_value(value, config['type'])
            elif config['required']:
                doc[field] = self.get_default_value(config['type'])
        
        # Add metadata
        doc['_migrated_at'] = datetime.now()
        doc['_source_table'] = mapping['collection']
        
        return doc
"""
        return script
```

### 7. Testing Strategy

Ensure migration correctness:

**Migration Testing Framework**
```python
class MigrationTester:
    def __init__(self, original_app, migrated_app):
        self.original = original_app
        self.migrated = migrated_app
        self.test_results = []
    
    def run_comparison_tests(self):
        """Run side-by-side comparison tests"""
        test_suites = [
            self.test_functionality,
            self.test_performance,
            self.test_data_integrity,
            self.test_api_compatibility,
            self.test_user_flows
        ]
        
        for suite in test_suites:
            results = suite()
            self.test_results.extend(results)
        
        return self.generate_report()
    
    def test_functionality(self):
        """Test functional equivalence"""
        results = []
        
        test_cases = self.generate_test_cases()
        
        for test in test_cases:
            original_result = self.execute_on_original(test)
            migrated_result = self.execute_on_migrated(test)
            
            comparison = self.compare_results(
                original_result, 
                migrated_result
            )
            
            results.append({
                'test': test['name'],
                'status': 'PASS' if comparison['equivalent'] else 'FAIL',
                'details': comparison['details']
            })
        
        return results
    
    def test_performance(self):
        """Compare performance metrics"""
        metrics = ['response_time', 'throughput', 'cpu_usage', 'memory_usage']
        results = []
        
        for metric in metrics:
            original_perf = self.measure_performance(self.original, metric)
            migrated_perf = self.measure_performance(self.migrated, metric)
            
            regression = ((migrated_perf - original_perf) / original_perf) * 100
            
            results.append({
                'metric': metric,
                'original': original_perf,
                'migrated': migrated_perf,
                'regression': regression,
                'acceptable': abs(regression) <= 10  # 10% threshold
            })
        
        return results
```

### 8. Rollback Planning

Implement safe rollback strategies:

```python
class RollbackManager:
    def create_rollback_plan(self, migration_type):
        """Create comprehensive rollback plan"""
        plan = {
            'triggers': self.define_rollback_triggers(),
            'procedures': self.define_rollback_procedures(migration_type),
            'verification': self.define_verification_steps(),
            'communication': self.define_communication_plan()
        }
        
        return self.format_rollback_plan(plan)
    
    def define_rollback_triggers(self):
        """Define conditions that trigger rollback"""
        return [
            {
                'condition': 'Critical functionality broken',
                'threshold': 'Any P0 feature non-functional',
                'detection': 'Automated monitoring + user reports'
            },
            {
                'condition': 'Performance degradation',
                'threshold': '>50% increase in response time',
                'detection': 'APM metrics'
            },
            {
                'condition': 'Data corruption',
                'threshold': 'Any data integrity issues',
                'detection': 'Data validation checks'
            },
            {
                'condition': 'High error rate',
                'threshold': '>5% error rate increase',
                'detection': 'Error tracking system'
            }
        ]
    
    def define_rollback_procedures(self, migration_type):
        """Define step-by-step rollback procedures"""
        if migration_type == 'blue_green':
            return self._blue_green_rollback()
        elif migration_type == 'canary':
            return self._canary_rollback()
        elif migration_type == 'feature_flag':
            return self._feature_flag_rollback()
        else:
            return self._standard_rollback()
    
    def _blue_green_rollback(self):
        return [
            "1. Verify green environment is problematic",
            "2. Update load balancer to route 100% to blue",
            "3. Monitor blue environment stability",
            "4. Notify stakeholders of rollback",
            "5. Begin root cause analysis",
            "6. Keep green environment for debugging"
        ]
```

### 9. Migration Automation

Create automated migration tools:

```python
def create_migration_cli():
    """Generate CLI tool for migration"""
    return '''
#!/usr/bin/env python3
import click
import json
from pathlib import Path

@click.group()
def cli():
    """Code Migration Tool"""
    pass

@cli.command()
@click.option('--source', required=True, help='Source directory')
@click.option('--target', required=True, help='Target technology')
@click.option('--output', default='migration-plan.json', help='Output file')
def analyze(source, target, output):
    """Analyze codebase for migration"""
    analyzer = MigrationAnalyzer(source, target)
    analysis = analyzer.analyze_migration()
    
    with open(output, 'w') as f:
        json.dump(analysis, f, indent=2)
    
    click.echo(f"Analysis complete. Results saved to {output}")

@cli.command()
@click.option('--plan', required=True, help='Migration plan file')
@click.option('--phase', help='Specific phase to execute')
@click.option('--dry-run', is_flag=True, help='Simulate migration')
def migrate(plan, phase, dry_run):
    """Execute migration based on plan"""
    with open(plan) as f:
        migration_plan = json.load(f)
    
    migrator = CodeMigrator(migration_plan)
    
    if dry_run:
        click.echo("Running migration in dry-run mode...")
        results = migrator.dry_run(phase)
    else:
        click.echo("Executing migration...")
        results = migrator.execute(phase)
    
    # Display results
    for result in results:
        status = "✓" if result['success'] else "✗"
        click.echo(f"{status} {result['task']}: {result['message']}")

@cli.command()
@click.option('--original', required=True, help='Original codebase')
@click.option('--migrated', required=True, help='Migrated codebase')
def test(original, migrated):
    """Test migration results"""
    tester = MigrationTester(original, migrated)
    results = tester.run_comparison_tests()
    
    # Display test results
    passed = sum(1 for r in results if r['status'] == 'PASS')
    total = len(results)
    
    click.echo(f"\\nTest Results: {passed}/{total} passed")
    
    for result in results:
        if result['status'] == 'FAIL':
            click.echo(f"\\n❌ {result['test']}")
            click.echo(f"   {result['details']}")

if __name__ == '__main__':
    cli()
'''
```

### 10. Progress Monitoring

Track migration progress:

```python
class MigrationMonitor:
    def __init__(self, migration_id):
        self.migration_id = migration_id
        self.metrics = defaultdict(list)
        self.checkpoints = []
    
    def create_dashboard(self):
        """Create migration monitoring dashboard"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <title>Migration Dashboard - {self.migration_id}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .metric-card {{
            background: #f5f5f5;
            padding: 20px;
            margin: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .progress-bar {{
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
        }}
        .progress-fill {{
            height: 100%;
            background: #4CAF50;
            transition: width 0.5s;
        }}
    </style>
</head>
<body>
    <h1>Migration Progress Dashboard</h1>
    
    <div class="metric-card">
        <h2>Overall Progress</h2>
        <div class="progress-bar">
            <div class="progress-fill" style="width: {self.calculate_progress()}%"></div>
        </div>
        <p>{self.calculate_progress()}% Complete</p>
    </div>
    
    <div class="metric-card">
        <h2>Phase Status</h2>
        <canvas id="phaseChart"></canvas>
    </div>
    
    <div class="metric-card">
        <h2>Migration Metrics</h2>
        <canvas id="metricsChart"></canvas>
    </div>
    
    <div class="metric-card">
        <h2>Recent Activities</h2>
        <ul id="activities">
            {self.format_recent_activities()}
        </ul>
    </div>
    
    <script>
        // Update dashboard every 30 seconds
        setInterval(() => location.reload(), 30000);
        
        // Phase chart
        new Chart(document.getElementById('phaseChart'), {{
            type: 'doughnut',
            data: {self.get_phase_chart_data()}
        }});
        
        // Metrics chart
        new Chart(document.getElementById('metricsChart'), {{
            type: 'line',
            data: {self.get_metrics_chart_data()}
        }});
    </script>
</body>
</html>
"""
```

## Output Format

1. **Migration Analysis**: Comprehensive analysis of source codebase
2. **Risk Assessment**: Identified risks with mitigation strategies
3. **Migration Plan**: Phased approach with timeline and milestones
4. **Code Examples**: Automated migration scripts and transformations
5. **Testing Strategy**: Comparison tests and validation approach
6. **Rollback Plan**: Detailed procedures for safe rollback
7. **Progress Tracking**: Real-time migration monitoring
8. **Documentation**: Migration guide and runbooks

Focus on minimizing disruption, maintaining functionality, and providing clear paths for successful code migration with comprehensive testing and rollback strategies.
