# API Mocking Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Detailed Steps

### 1. Mock Server Setup

Create comprehensive mock server infrastructure:

**Mock Server Framework**

```python
from typing import Dict, List, Any, Optional
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, Request, Response
import uvicorn

class MockAPIServer:
    def __init__(self, config: Dict[str, Any]):
        self.app = FastAPI(title="Mock API Server")
        self.routes = {}
        self.middleware = []
        self.state_manager = StateManager()
        self.scenario_manager = ScenarioManager()

    def setup_mock_server(self):
        """Setup comprehensive mock server"""
        # Configure middleware
        self._setup_middleware()

        # Load mock definitions
        self._load_mock_definitions()

        # Setup dynamic routes
        self._setup_dynamic_routes()

        # Initialize scenarios
        self._initialize_scenarios()

        return self.app

    def _setup_middleware(self):
        """Configure server middleware"""
        @self.app.middleware("http")
        async def add_mock_headers(request: Request, call_next):
            response = await call_next(request)
            response.headers["X-Mock-Server"] = "true"
            response.headers["X-Mock-Scenario"] = self.scenario_manager.current_scenario
            return response

        @self.app.middleware("http")
        async def simulate_latency(request: Request, call_next):
            # Simulate network latency
            latency = self._calculate_latency(request.url.path)
            await asyncio.sleep(latency / 1000)  # Convert to seconds
            response = await call_next(request)
            return response

        @self.app.middleware("http")
        async def track_requests(request: Request, call_next):
            # Track request for verification
            self.state_manager.track_request({
                'method': request.method,
                'path': str(request.url.path),
                'headers': dict(request.headers),
                'timestamp': datetime.now()
            })
            response = await call_next(request)
            return response

    def _setup_dynamic_routes(self):
        """Setup dynamic route handling"""
        @self.app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
        async def handle_mock_request(path: str, request: Request):
            # Find matching mock
            mock = self._find_matching_mock(request.method, path, request)

            if not mock:
                return Response(
                    content=json.dumps({"error": "No mock found for this endpoint"}),
                    status_code=404,
                    media_type="application/json"
                )

            # Process mock response
            response_data = await self._process_mock_response(mock, request)

            return Response(
                content=json.dumps(response_data['body']),
                status_code=response_data['status'],
                headers=response_data['headers'],
                media_type="application/json"
            )

    async def _process_mock_response(self, mock: Dict[str, Any], request: Request):
        """Process and generate mock response"""
        # Check for conditional responses
        if mock.get('conditions'):
            for condition in mock['conditions']:
                if self._evaluate_condition(condition, request):
                    return await self._generate_response(condition['response'], request)

        # Use default response
        return await self._generate_response(mock['response'], request)

    def _generate_response(self, response_template: Dict[str, Any], request: Request):
        """Generate response from template"""
        response = {
            'status': response_template.get('status', 200),
            'headers': response_template.get('headers', {}),
            'body': self._process_response_body(response_template['body'], request)
        }

        # Apply response transformations
        if response_template.get('transformations'):
            response = self._apply_transformations(response, response_template['transformations'])

        return response
```

### 2. Request/Response Stubbing

Implement flexible stubbing system:

**Stubbing Engine**

```python
class StubbingEngine:
    def __init__(self):
        self.stubs = {}
        self.matchers = self._initialize_matchers()

    def create_stub(self, method: str, path: str, **kwargs):
        """Create a new stub"""
        stub_id = self._generate_stub_id()

        stub = {
            'id': stub_id,
            'method': method,
            'path': path,
            'matchers': self._build_matchers(kwargs),
            'response': kwargs.get('response', {}),
            'priority': kwargs.get('priority', 0),
            'times': kwargs.get('times', -1),  # -1 for unlimited
            'delay': kwargs.get('delay', 0),
            'scenario': kwargs.get('scenario', 'default')
        }

        self.stubs[stub_id] = stub
        return stub_id

    def _build_matchers(self, kwargs):
        """Build request matchers"""
        matchers = []

        # Path parameter matching
        if 'path_params' in kwargs:
            matchers.append({
                'type': 'path_params',
                'params': kwargs['path_params']
            })

        # Query parameter matching
        if 'query_params' in kwargs:
            matchers.append({
                'type': 'query_params',
                'params': kwargs['query_params']
            })

        # Header matching
        if 'headers' in kwargs:
            matchers.append({
                'type': 'headers',
                'headers': kwargs['headers']
            })

        # Body matching
        if 'body' in kwargs:
            matchers.append({
                'type': 'body',
                'body': kwargs['body'],
                'match_type': kwargs.get('body_match_type', 'exact')
            })

        return matchers

    def match_request(self, request: Dict[str, Any]):
        """Find matching stub for request"""
        candidates = []

        for stub in self.stubs.values():
            if self._matches_stub(request, stub):
                candidates.append(stub)

        # Sort by priority and return best match
        if candidates:
            return sorted(candidates, key=lambda x: x['priority'], reverse=True)[0]

        return None

    def _matches_stub(self, request: Dict[str, Any], stub: Dict[str, Any]):
        """Check if request matches stub"""
        # Check method
        if request['method'] != stub['method']:
            return False

        # Check path
        if not self._matches_path(request['path'], stub['path']):
            return False

        # Check all matchers
        for matcher in stub['matchers']:
            if not self._evaluate_matcher(request, matcher):
                return False

        # Check if stub is still valid
        if stub['times'] == 0:
            return False

        return True

    def create_dynamic_stub(self):
        """Create dynamic stub with callbacks"""
        return '''
class DynamicStub:
    def __init__(self, path_pattern: str):
        self.path_pattern = path_pattern
        self.response_generator = None
        self.state_modifier = None

    def with_response_generator(self, generator):
        """Set dynamic response generator"""
        self.response_generator = generator
        return self

    def with_state_modifier(self, modifier):
        """Set state modification callback"""
        self.state_modifier = modifier
        return self

    async def process_request(self, request: Request, state: Dict[str, Any]):
        """Process request dynamically"""
        # Extract request data
        request_data = {
            'method': request.method,
            'path': request.url.path,
            'headers': dict(request.headers),
            'query_params': dict(request.query_params),
            'body': await request.json() if request.method in ['POST', 'PUT'] else None
        }

        # Modify state if needed
        if self.state_modifier:
            state = self.state_modifier(state, request_data)

        # Generate response
        if self.response_generator:
            response = self.response_generator(request_data, state)
        else:
            response = {'status': 200, 'body': {}}

        return response, state

# Usage example
dynamic_stub = DynamicStub('/api/users/{user_id}')
dynamic_stub.with_response_generator(lambda req, state: {
    'status': 200,
    'body': {
        'id': req['path_params']['user_id'],
        'name': state.get('users', {}).get(req['path_params']['user_id'], 'Unknown'),
        'request_count': state.get('request_count', 0)
    }
}).with_state_modifier(lambda state, req: {
    **state,
    'request_count': state.get('request_count', 0) + 1
})
'''
```

### 3. Dynamic Data Generation

Generate realistic mock data:

**Mock Data Generator**

```python
from faker import Faker
import random
from datetime import datetime, timedelta

class MockDataGenerator:
    def __init__(self):
        self.faker = Faker()
        self.templates = {}
        self.generators = self._init_generators()

    def generate_data(self, schema: Dict[str, Any]):
        """Generate data based on schema"""
        if isinstance(schema, dict):
            if '$ref' in schema:
                # Reference to another schema
                return self.generate_data(self.resolve_ref(schema['$ref']))

            result = {}
            for key, value in schema.items():
                if key.startswith('$'):
                    continue
                result[key] = self._generate_field(value)
            return result

        elif isinstance(schema, list):
            # Generate array
            count = random.randint(1, 10)
            return [self.generate_data(schema[0]) for _ in range(count)]

        else:
            return schema

    def _generate_field(self, field_schema: Dict[str, Any]):
        """Generate field value based on schema"""
        field_type = field_schema.get('type', 'string')

        # Check for custom generator
        if 'generator' in field_schema:
            return self._use_custom_generator(field_schema['generator'])

        # Check for enum
        if 'enum' in field_schema:
            return random.choice(field_schema['enum'])

        # Generate based on type
        generators = {
            'string': self._generate_string,
            'number': self._generate_number,
            'integer': self._generate_integer,
            'boolean': self._generate_boolean,
            'array': self._generate_array,
            'object': lambda s: self.generate_data(s)
        }

        generator = generators.get(field_type, self._generate_string)
        return generator(field_schema)

    def _generate_string(self, schema: Dict[str, Any]):
        """Generate string value"""
        # Check for format
        format_type = schema.get('format', '')

        format_generators = {
            'email': self.faker.email,
            'name': self.faker.name,
            'first_name': self.faker.first_name,
            'last_name': self.faker.last_name,
            'phone': self.faker.phone_number,
            'address': self.faker.address,
            'url': self.faker.url,
            'uuid': self.faker.uuid4,
            'date': lambda: self.faker.date().isoformat(),
            'datetime': lambda: self.faker.date_time().isoformat(),
            'password': lambda: self.faker.password()
        }

        if format_type in format_generators:
            return format_generators[format_type]()

        # Check for pattern
        if 'pattern' in schema:
            return self._generate_from_pattern(schema['pattern'])

        # Default string generation
        min_length = schema.get('minLength', 5)
        max_length = schema.get('maxLength', 20)
        return self.faker.text(max_nb_chars=random.randint(min_length, max_length))

    def create_data_templates(self):
        """Create reusable data templates"""
        return {
            'user': {
                'id': {'type': 'string', 'format': 'uuid'},
                'username': {'type': 'string', 'generator': 'username'},
                'email': {'type': 'string', 'format': 'email'},
                'profile': {
                    'type': 'object',
                    'properties': {
                        'firstName': {'type': 'string', 'format': 'first_name'},
                        'lastName': {'type': 'string', 'format': 'last_name'},
                        'avatar': {'type': 'string', 'format': 'url'},
                        'bio': {'type': 'string', 'maxLength': 200}
                    }
                },
                'createdAt': {'type': 'string', 'format': 'datetime'},
                'status': {'type': 'string', 'enum': ['active', 'inactive', 'suspended']}
            },
            'product': {
                'id': {'type': 'string', 'format': 'uuid'},
                'name': {'type': 'string', 'generator': 'product_name'},
                'description': {'type': 'string', 'maxLength': 500},
                'price': {'type': 'number', 'minimum': 0.01, 'maximum': 9999.99},
                'category': {'type': 'string', 'enum': ['electronics', 'clothing', 'food', 'books']},
                'inStock': {'type': 'boolean'},
                'rating': {'type': 'number', 'minimum': 0, 'maximum': 5}
            }
        }

    def generate_relational_data(self):
        """Generate data with relationships"""
        return '''
class RelationalDataGenerator:
    def generate_related_entities(self, schema: Dict[str, Any], count: int):
        """Generate related entities maintaining referential integrity"""
        entities = {}

        # First pass: generate primary entities
        for entity_name, entity_schema in schema['entities'].items():
            entities[entity_name] = []
            for i in range(count):
                entity = self.generate_entity(entity_schema)
                entity['id'] = f"{entity_name}_{i}"
                entities[entity_name].append(entity)

        # Second pass: establish relationships
        for relationship in schema.get('relationships', []):
            self.establish_relationship(entities, relationship)

        return entities

    def establish_relationship(self, entities: Dict[str, List], relationship: Dict):
        """Establish relationships between entities"""
        source = relationship['source']
        target = relationship['target']
        rel_type = relationship['type']

        if rel_type == 'one-to-many':
            for source_entity in entities[source['entity']]:
                # Select random targets
                num_targets = random.randint(1, 5)
                target_refs = random.sample(
                    entities[target['entity']],
                    min(num_targets, len(entities[target['entity']]))
                )
                source_entity[source['field']] = [t['id'] for t in target_refs]

        elif rel_type == 'many-to-one':
            for target_entity in entities[target['entity']]:
                # Select one source
                source_ref = random.choice(entities[source['entity']])
                target_entity[target['field']] = source_ref['id']
'''
```

### 4. Mock Scenarios

Implement scenario-based mocking:

**Scenario Manager**

```python
class ScenarioManager:
    def __init__(self):
        self.scenarios = {}
        self.current_scenario = 'default'
        self.scenario_states = {}

    def define_scenario(self, name: str, definition: Dict[str, Any]):
        """Define a mock scenario"""
        self.scenarios[name] = {
            'name': name,
            'description': definition.get('description', ''),
            'initial_state': definition.get('initial_state', {}),
            'stubs': definition.get('stubs', []),
            'sequences': definition.get('sequences', []),
            'conditions': definition.get('conditions', [])
        }

    def create_test_scenarios(self):
        """Create common test scenarios"""
        return {
            'happy_path': {
                'description': 'All operations succeed',
                'stubs': [
                    {
                        'path': '/api/auth/login',
                        'response': {
                            'status': 200,
                            'body': {
                                'token': 'valid_token',
                                'user': {'id': '123', 'name': 'Test User'}
                            }
                        }
                    },
                    {
                        'path': '/api/users/{id}',
                        'response': {
                            'status': 200,
                            'body': {
                                'id': '{id}',
                                'name': 'Test User',
                                'email': 'test@example.com'
                            }
                        }
                    }
                ]
            },
            'error_scenario': {
                'description': 'Various error conditions',
                'sequences': [
                    {
                        'name': 'rate_limiting',
                        'steps': [
                            {'repeat': 5, 'response': {'status': 200}},
                            {'repeat': 10, 'response': {'status': 429, 'body': {'error': 'Rate limit exceeded'}}}
                        ]
                    }
                ],
                'stubs': [
                    {
                        'path': '/api/auth/login',
                        'conditions': [
                            {
                                'match': {'body': {'username': 'locked_user'}},
                                'response': {'status': 423, 'body': {'error': 'Account locked'}}
                            }
                        ]
                    }
                ]
            },
            'degraded_performance': {
                'description': 'Slow responses and timeouts',
                'stubs': [
                    {
                        'path': '/api/*',
                        'delay': 5000,  # 5 second delay
                        'response': {'status': 200}
                    }
                ]
            }
        }

    def execute_scenario_sequence(self):
        """Execute scenario sequences"""
        return '''
class SequenceExecutor:
    def __init__(self):
        self.sequence_states = {}

    def get_sequence_response(self, sequence_name: str, request: Dict):
        """Get response based on sequence state"""
        if sequence_name not in self.sequence_states:
            self.sequence_states[sequence_name] = {'step': 0, 'count': 0}

        state = self.sequence_states[sequence_name]
        sequence = self.get_sequence_definition(sequence_name)

        # Get current step
        current_step = sequence['steps'][state['step']]

        # Check if we should advance to next step
        state['count'] += 1
        if state['count'] >= current_step.get('repeat', 1):
            state['step'] = (state['step'] + 1) % len(sequence['steps'])
            state['count'] = 0

        return current_step['response']

    def create_stateful_scenario(self):
        """Create scenario with stateful behavior"""
        return {
            'shopping_cart': {
                'initial_state': {
                    'cart': {},
                    'total': 0
                },
                'stubs': [
                    {
                        'method': 'POST',
                        'path': '/api/cart/items',
                        'handler': 'add_to_cart',
                        'modifies_state': True
                    },
                    {
                        'method': 'GET',
                        'path': '/api/cart',
                        'handler': 'get_cart',
                        'uses_state': True
                    }
                ],
                'handlers': {
                    'add_to_cart': lambda state, request: {
                        'state': {
                            **state,
                            'cart': {
                                **state['cart'],
                                request['body']['product_id']: request['body']['quantity']
                            },
                            'total': state['total'] + request['body']['price']
                        },
                        'response': {
                            'status': 201,
                            'body': {'message': 'Item added to cart'}
                        }
                    },
                    'get_cart': lambda state, request: {
                        'response': {
                            'status': 200,
                            'body': {
                                'items': state['cart'],
                                'total': state['total']
                            }
                        }
                    }
                }
            }
        }
'''
```

### 5. Contract Testing

Implement contract-based mocking:

**Contract Testing Framework**

```python
class ContractMockServer:
    def __init__(self):
        self.contracts = {}
        self.validators = self._init_validators()

    def load_contract(self, contract_path: str):
        """Load API contract (OpenAPI, AsyncAPI, etc.)"""
        with open(contract_path, 'r') as f:
            contract = yaml.safe_load(f)

        # Parse contract
        self.contracts[contract['info']['title']] = {
            'spec': contract,
            'endpoints': self._parse_endpoints(contract),
            'schemas': self._parse_schemas(contract)
        }

    def generate_mocks_from_contract(self, contract_name: str):
        """Generate mocks from contract specification"""
        contract = self.contracts[contract_name]
        mocks = []

        for path, methods in contract['endpoints'].items():
            for method, spec in methods.items():
                mock = self._create_mock_from_spec(path, method, spec)
                mocks.append(mock)

        return mocks

    def _create_mock_from_spec(self, path: str, method: str, spec: Dict):
        """Create mock from endpoint specification"""
        mock = {
            'method': method.upper(),
            'path': self._convert_path_to_pattern(path),
            'responses': {}
        }

        # Generate responses for each status code
        for status_code, response_spec in spec.get('responses', {}).items():
            mock['responses'][status_code] = {
                'status': int(status_code),
                'headers': self._get_response_headers(response_spec),
                'body': self._generate_response_body(response_spec)
            }

        # Add request validation
        if 'requestBody' in spec:
            mock['request_validation'] = self._create_request_validator(spec['requestBody'])

        return mock

    def validate_against_contract(self):
        """Validate mock responses against contract"""
        return '''
class ContractValidator:
    def validate_response(self, contract_spec, actual_response):
        """Validate response against contract"""
        validation_results = {
            'valid': True,
            'errors': []
        }

        # Find response spec for status code
        response_spec = contract_spec['responses'].get(
            str(actual_response['status']),
            contract_spec['responses'].get('default')
        )

        if not response_spec:
            validation_results['errors'].append({
                'type': 'unexpected_status',
                'message': f"Status {actual_response['status']} not defined in contract"
            })
            validation_results['valid'] = False
            return validation_results

        # Validate headers
        if 'headers' in response_spec:
            header_errors = self.validate_headers(
                response_spec['headers'],
                actual_response['headers']
            )
            validation_results['errors'].extend(header_errors)

        # Validate body schema
        if 'content' in response_spec:
            body_errors = self.validate_body(
                response_spec['content'],
                actual_response['body']
            )
            validation_results['errors'].extend(body_errors)

        validation_results['valid'] = len(validation_results['errors']) == 0
        return validation_results

    def validate_body(self, content_spec, actual_body):
        """Validate response body against schema"""
        errors = []

        # Get schema for content type
        schema = content_spec.get('application/json', {}).get('schema')
        if not schema:
            return errors

        # Validate against JSON schema
        try:
            validate(instance=actual_body, schema=schema)
        except ValidationError as e:
            errors.append({
                'type': 'schema_validation',
                'path': e.json_path,
                'message': e.message
            })

        return errors
'''
```

### 6. Performance Testing

Create performance testing mocks:

**Performance Mock Server**

```python
class PerformanceMockServer:
    def __init__(self):
        self.performance_profiles = {}
        self.metrics_collector = MetricsCollector()

    def create_performance_profile(self, name: str, config: Dict):
        """Create performance testing profile"""
        self.performance_profiles[name] = {
            'latency': config.get('latency', {'min': 10, 'max': 100}),
            'throughput': config.get('throughput', 1000),  # requests per second
            'error_rate': config.get('error_rate', 0.01),  # 1% errors
            'response_size': config.get('response_size', {'min': 100, 'max': 10000})
        }

    async def simulate_performance(self, profile_name: str, request: Request):
        """Simulate performance characteristics"""
        profile = self.performance_profiles[profile_name]

        # Simulate latency
        latency = random.uniform(profile['latency']['min'], profile['latency']['max'])
        await asyncio.sleep(latency / 1000)

        # Simulate errors
        if random.random() < profile['error_rate']:
            return self._generate_error_response()

        # Generate response with specified size
        response_size = random.randint(
            profile['response_size']['min'],
            profile['response_size']['max']
        )

        response_data = self._generate_data_of_size(response_size)

        # Track metrics
        self.metrics_collector.record({
            'latency': latency,
            'response_size': response_size,
            'timestamp': datetime.now()
        })

        return response_data

    def create_load_test_scenarios(self):
        """Create load testing scenarios"""
        return {
            'gradual_load': {
                'description': 'Gradually increase load',
                'stages': [
                    {'duration': 60, 'target_rps': 100},
                    {'duration': 120, 'target_rps': 500},
                    {'duration': 180, 'target_rps': 1000},
                    {'duration': 60, 'target_rps': 100}
                ]
            },
            'spike_test': {
                'description': 'Sudden spike in traffic',
                'stages': [
                    {'duration': 60, 'target_rps': 100},
                    {'duration': 10, 'target_rps': 5000},
                    {'duration': 60, 'target_rps': 100}
                ]
            },
            'stress_test': {
                'description': 'Find breaking point',
                'stages': [
                    {'duration': 60, 'target_rps': 100},
                    {'duration': 60, 'target_rps': 500},
                    {'duration': 60, 'target_rps': 1000},
                    {'duration': 60, 'target_rps': 2000},
                    {'duration': 60, 'target_rps': 5000},
                    {'duration': 60, 'target_rps': 10000}
                ]
            }
        }

    def implement_throttling(self):
        """Implement request throttling"""
        return '''
class ThrottlingMiddleware:
    def __init__(self, max_rps: int):
        self.max_rps = max_rps
        self.request_times = deque()

    async def __call__(self, request: Request, call_next):
        current_time = time.time()

        # Remove old requests
        while self.request_times and self.request_times[0] < current_time - 1:
            self.request_times.popleft()

        # Check if we're over limit
        if len(self.request_times) >= self.max_rps:
            return Response(
                content=json.dumps({
                    'error': 'Rate limit exceeded',
                    'retry_after': 1
                }),
                status_code=429,
                headers={'Retry-After': '1'}
            )

        # Record this request
        self.request_times.append(current_time)

        # Process request
        response = await call_next(request)
        return response
'''
```

### 7. Mock Data Management

Manage mock data effectively:

**Mock Data Store**

```python
class MockDataStore:
    def __init__(self):
        self.collections = {}
        self.indexes = {}

    def create_collection(self, name: str, schema: Dict = None):
        """Create a new data collection"""
        self.collections[name] = {
            'data': {},
            'schema': schema,
            'counter': 0
        }

        # Create default index on 'id'
        self.create_index(name, 'id')

    def insert(self, collection: str, data: Dict):
        """Insert data into collection"""
        collection_data = self.collections[collection]

        # Validate against schema if exists
        if collection_data['schema']:
            self._validate_data(data, collection_data['schema'])

        # Generate ID if not provided
        if 'id' not in data:
            collection_data['counter'] += 1
            data['id'] = str(collection_data['counter'])

        # Store data
        collection_data['data'][data['id']] = data

        # Update indexes
        self._update_indexes(collection, data)

        return data['id']

    def query(self, collection: str, filters: Dict = None):
        """Query collection with filters"""
        collection_data = self.collections[collection]['data']

        if not filters:
            return list(collection_data.values())

        # Use indexes if available
        if self._can_use_index(collection, filters):
            return self._query_with_index(collection, filters)

        # Full scan
        results = []
        for item in collection_data.values():
            if self._matches_filters(item, filters):
                results.append(item)

        return results

    def create_relationships(self):
        """Define relationships between collections"""
        return '''
class RelationshipManager:
    def __init__(self, data_store: MockDataStore):
        self.store = data_store
        self.relationships = {}

    def define_relationship(self,
                          source_collection: str,
                          target_collection: str,
                          relationship_type: str,
                          foreign_key: str):
        """Define relationship between collections"""
        self.relationships[f"{source_collection}->{target_collection}"] = {
            'type': relationship_type,
            'source': source_collection,
            'target': target_collection,
            'foreign_key': foreign_key
        }

    def populate_related_data(self, entity: Dict, collection: str, depth: int = 1):
        """Populate related data for entity"""
        if depth <= 0:
            return entity

        # Find relationships for this collection
        for rel_key, rel in self.relationships.items():
            if rel['source'] == collection:
                # Get related data
                foreign_id = entity.get(rel['foreign_key'])
                if foreign_id:
                    related = self.store.get(rel['target'], foreign_id)
                    if related:
                        # Recursively populate
                        related = self.populate_related_data(
                            related,
                            rel['target'],
                            depth - 1
                        )
                        entity[rel['target']] = related

        return entity

    def cascade_operations(self, operation: str, collection: str, entity_id: str):
        """Handle cascade operations"""
        if operation == 'delete':
            # Find dependent relationships
            for rel in self.relationships.values():
                if rel['target'] == collection:
                    # Delete dependent entities
                    dependents = self.store.query(
                        rel['source'],
                        {rel['foreign_key']: entity_id}
                    )
                    for dep in dependents:
                        self.store.delete(rel['source'], dep['id'])
'''
```

### 8. Testing Framework Integration

Integrate with popular testing frameworks:

**Testing Integration**

```python
class TestingFrameworkIntegration:
    def create_jest_integration(self):
        """Jest testing integration"""
        return '''
// jest.mock.config.js
import { MockServer } from './mockServer';

const mockServer = new MockServer();

beforeAll(async () => {
    await mockServer.start({ port: 3001 });

    // Load mock definitions
    await mockServer.loadMocks('./mocks/*.json');

    // Set default scenario
    await mockServer.setScenario('test');
});

afterAll(async () => {
    await mockServer.stop();
});

beforeEach(async () => {
    // Reset mock state
    await mockServer.reset();
});

// Test helper functions
export const setupMock = async (stub) => {
    return await mockServer.addStub(stub);
};

export const verifyRequests = async (matcher) => {
    const requests = await mockServer.getRequests(matcher);
    return requests;
};

// Example test
describe('User API', () => {
    it('should fetch user details', async () => {
        // Setup mock
        await setupMock({
            method: 'GET',
            path: '/api/users/123',
            response: {
                status: 200,
                body: { id: '123', name: 'Test User' }
            }
        });

        // Make request
        const response = await fetch('http://localhost:3001/api/users/123');
        const user = await response.json();

        // Verify
        expect(user.name).toBe('Test User');

        // Verify mock was called
        const requests = await verifyRequests({ path: '/api/users/123' });
        expect(requests).toHaveLength(1);
    });
});
'''

    def create_pytest_integration(self):
        """Pytest integration"""
        return '''
# conftest.py
import pytest
from mock_server import MockServer
import asyncio

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def mock_server(event_loop):
    server = MockServer()
    await server.start(port=3001)
    yield server
    await server.stop()

@pytest.fixture(autouse=True)
async def reset_mocks(mock_server):
    await mock_server.reset()
    yield
    # Verify no unexpected calls
    unmatched = await mock_server.get_unmatched_requests()
    assert len(unmatched) == 0, f"Unmatched requests: {unmatched}"

# Test utilities
class MockBuilder:
    def __init__(self, mock_server):
        self.server = mock_server
        self.stubs = []

    def when(self, method, path):
        self.current_stub = {
            'method': method,
            'path': path
        }
        return self

    def with_body(self, body):
        self.current_stub['body'] = body
        return self

    def then_return(self, status, body=None, headers=None):
        self.current_stub['response'] = {
            'status': status,
            'body': body,
            'headers': headers or {}
        }
        self.stubs.append(self.current_stub)
        return self

    async def setup(self):
        for stub in self.stubs:
            await self.server.add_stub(stub)

# Example test
@pytest.mark.asyncio
async def test_user_creation(mock_server):
    # Setup mocks
    mock = MockBuilder(mock_server)
    mock.when('POST', '/api/users') \
        .with_body({'name': 'New User'}) \
        .then_return(201, {'id': '456', 'name': 'New User'})

    await mock.setup()

    # Test code here
    response = await create_user({'name': 'New User'})
    assert response['id'] == '456'
'''
```

### 9. Mock Server Deployment

Deploy mock servers:

**Deployment Configuration**

```yaml
# docker-compose.yml for mock services
version: "3.8"

services:
  mock-api:
    build:
      context: .
      dockerfile: Dockerfile.mock
    ports:
      - "3001:3001"
    environment:
      - MOCK_SCENARIO=production
      - MOCK_DATA_PATH=/data/mocks
    volumes:
      - ./mocks:/data/mocks
      - ./scenarios:/data/scenarios
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mock-admin:
    build:
      context: .
      dockerfile: Dockerfile.admin
    ports:
      - "3002:3002"
    environment:
      - MOCK_SERVER_URL=http://mock-api:3001
    depends_on:
      - mock-api


# Kubernetes deployment
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mock-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mock-server
  template:
    metadata:
      labels:
        app: mock-server
    spec:
      containers:
        - name: mock-server
          image: mock-server:latest
          ports:
            - containerPort: 3001
          env:
            - name: MOCK_SCENARIO
              valueFrom:
                configMapKeyRef:
                  name: mock-config
                  key: scenario
          volumeMounts:
            - name: mock-definitions
              mountPath: /data/mocks
      volumes:
        - name: mock-definitions
          configMap:
            name: mock-definitions
```

### 10. Mock Documentation

Generate mock API documentation:

**Documentation Generator**

````python
class MockDocumentationGenerator:
    def generate_documentation(self, mock_server):
        """Generate comprehensive mock documentation"""
        return f"""
# Mock API Documentation

## Overview
{self._generate_overview(mock_server)}

## Available Endpoints
{self._generate_endpoints_doc(mock_server)}

## Scenarios
{self._generate_scenarios_doc(mock_server)}

## Data Models
{self._generate_models_doc(mock_server)}

## Usage Examples
{self._generate_examples(mock_server)}

## Configuration
{self._generate_config_doc(mock_server)}
"""

    def _generate_endpoints_doc(self, mock_server):
        """Generate endpoint documentation"""
        doc = ""
        for endpoint in mock_server.get_endpoints():
            doc += f"""
### {endpoint['method']} {endpoint['path']}

**Description**: {endpoint.get('description', 'No description')}

**Request**:
```json
{json.dumps(endpoint.get('request_example', {}), indent=2)}
````

**Response**:

```json
{json.dumps(endpoint.get('response_example', {}), indent=2)}
```

**Scenarios**:
{self.\_format_endpoint_scenarios(endpoint)}
"""
return doc

    def create_interactive_docs(self):
        """Create interactive API documentation"""
        return '''

<!DOCTYPE html>
<html>
<head>
    <title>Mock API Interactive Documentation</title>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: "/api/mock/openapi.json",
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                tryItOutEnabled: true,
                requestInterceptor: (request) => {
                    request.headers['X-Mock-Scenario'] = 
                        document.getElementById('scenario-select').value;
                    return request;
                }
            });
        }
    </script>
    
    <div class="scenario-selector">
        <label>Scenario:</label>
        <select id="scenario-select">
            <option value="default">Default</option>
            <option value="error">Error Conditions</option>
            <option value="slow">Slow Responses</option>
        </select>
    </div>
</body>
</html>
'''
```

## Output Format

1. **Mock Server Setup**: Complete mock server implementation
2. **Stubbing Configuration**: Flexible request/response stubbing
3. **Data Generation**: Realistic mock data generation
4. **Scenario Definitions**: Comprehensive test scenarios
5. **Contract Testing**: Contract-based mock validation
6. **Performance Simulation**: Performance testing capabilities
7. **Data Management**: Mock data storage and relationships
8. **Testing Integration**: Framework integration examples
9. **Deployment Guide**: Mock server deployment configurations
10. **Documentation**: Auto-generated mock API documentation

Focus on creating flexible, realistic mock services that enable efficient development, thorough testing, and reliable API simulation for all stages of the development lifecycle.
