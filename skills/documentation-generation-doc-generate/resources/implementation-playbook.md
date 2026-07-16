# Automated Documentation Generation Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Instructions

Generate comprehensive documentation by analyzing the codebase and creating the following artifacts:

### 1. **API Documentation**
- Extract endpoint definitions, parameters, and responses from code
- Generate OpenAPI/Swagger specifications
- Create interactive API documentation (Swagger UI, Redoc)
- Include authentication, rate limiting, and error handling details

### 2. **Architecture Documentation**
- Create system architecture diagrams (Mermaid, PlantUML)
- Document component relationships and data flows
- Explain service dependencies and communication patterns
- Include scalability and reliability considerations

### 3. **Code Documentation**
- Generate inline documentation and docstrings
- Create README files with setup, usage, and contribution guidelines
- Document configuration options and environment variables
- Provide troubleshooting guides and code examples

### 4. **User Documentation**
- Write step-by-step user guides
- Create getting started tutorials
- Document common workflows and use cases
- Include accessibility and localization notes

### 5. **Documentation Automation**
- Configure CI/CD pipelines for automatic doc generation
- Set up documentation linting and validation
- Implement documentation coverage checks
- Automate deployment to hosting platforms

### Quality Standards

Ensure all generated documentation:
- Is accurate and synchronized with current code
- Uses consistent terminology and formatting
- Includes practical examples and use cases
- Is searchable and well-organized
- Follows accessibility best practices

## Reference Examples

### Example 1: Code Analysis for Documentation

**API Documentation Extraction**
```python
import ast
from typing import Dict, List

class APIDocExtractor:
    def extract_endpoints(self, code_path):
        """Extract API endpoints and their documentation"""
        endpoints = []

        with open(code_path, 'r') as f:
            tree = ast.parse(f.read())

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                for decorator in node.decorator_list:
                    if self._is_route_decorator(decorator):
                        endpoint = {
                            'method': self._extract_method(decorator),
                            'path': self._extract_path(decorator),
                            'function': node.name,
                            'docstring': ast.get_docstring(node),
                            'parameters': self._extract_parameters(node),
                            'returns': self._extract_returns(node)
                        }
                        endpoints.append(endpoint)
        return endpoints

    def _extract_parameters(self, func_node):
        """Extract function parameters with types"""
        params = []
        for arg in func_node.args.args:
            param = {
                'name': arg.arg,
                'type': ast.unparse(arg.annotation) if arg.annotation else None,
                'required': True
            }
            params.append(param)
        return params
```

**Schema Extraction**
```python
def extract_pydantic_schemas(file_path):
    """Extract Pydantic model definitions for API documentation"""
    schemas = []

    with open(file_path, 'r') as f:
        tree = ast.parse(f.read())

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            if any(base.id == 'BaseModel' for base in node.bases if hasattr(base, 'id')):
                schema = {
                    'name': node.name,
                    'description': ast.get_docstring(node),
                    'fields': []
                }

                for item in node.body:
                    if isinstance(item, ast.AnnAssign):
                        field = {
                            'name': item.target.id,
                            'type': ast.unparse(item.annotation),
                            'required': item.value is None
                        }
                        schema['fields'].append(field)
                schemas.append(schema)
    return schemas
```

### Example 2: OpenAPI Specification Generation

**OpenAPI Template**
```yaml
openapi: 3.0.0
info:
  title: ${API_TITLE}
  version: ${VERSION}
  description: |
    ${DESCRIPTION}

    ## Authentication
    ${AUTH_DESCRIPTION}

servers:
  - url: https://api.example.com/v1
    description: Production server

security:
  - bearerAuth: []

paths:
  /users:
    get:
      summary: List all users
      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time
```

### Example 3: Architecture Diagrams

**System Architecture (Mermaid)**
```mermaid
graph TB
    subgraph "Frontend"
        UI[React UI]
        Mobile[Mobile App]
    end

    subgraph "API Gateway"
        Gateway[Kong/nginx]
        Auth[Auth Service]
    end

    subgraph "Microservices"
        UserService[User Service]
        OrderService[Order Service]
        PaymentService[Payment Service]
    end

    subgraph "Data Layer"
        PostgresMain[(PostgreSQL)]
        Redis[(Redis Cache)]
        S3[S3 Storage]
    end

    UI --> Gateway
    Mobile --> Gateway
    Gateway --> Auth
    Gateway --> UserService
    Gateway --> OrderService
    OrderService --> PaymentService
    UserService --> PostgresMain
    UserService --> Redis
    OrderService --> PostgresMain
```

**Component Documentation**
```markdown
## User Service

**Purpose**: Manages user accounts, authentication, and profiles

**Technology Stack**:
- Language: Python 3.11
- Framework: FastAPI
- Database: PostgreSQL
- Cache: Redis
- Authentication: JWT

**API Endpoints**:
- `POST /users` - Create new user
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user
- `POST /auth/login` - User login

**Configuration**:
```yaml
user_service:
  port: 8001
  database:
    host: postgres.internal
    name: users_db
  jwt:
    secret: ${JWT_SECRET}
    expiry: 3600
```
```

### Example 4: README Generation

**README Template**
```markdown
# ${PROJECT_NAME}

${BADGES}

${SHORT_DESCRIPTION}

## Features

${FEATURES_LIST}

## Installation

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Redis 6+

### Using pip

```bash
pip install ${PACKAGE_NAME}
```

### From source

```bash
git clone https://github.com/${GITHUB_ORG}/${REPO_NAME}.git
cd ${REPO_NAME}
pip install -e .
```

## Quick Start

```python
${QUICK_START_CODE}
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| DATABASE_URL | PostgreSQL connection string | - | Yes |
| REDIS_URL | Redis connection string | - | Yes |
| SECRET_KEY | Application secret key | - | Yes |

## Development

```bash
# Clone and setup
git clone https://github.com/${GITHUB_ORG}/${REPO_NAME}.git
cd ${REPO_NAME}
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Start development server
python manage.py runserver
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=your_package
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ${LICENSE} License - see the LICENSE file for details.
```

### Example 5: Function Documentation Generator

```python
import inspect

def generate_function_docs(func):
    """Generate comprehensive documentation for a function"""
    sig = inspect.signature(func)
    params = []
    args_doc = []

    for param_name, param in sig.parameters.items():
        param_str = param_name
        if param.annotation != param.empty:
            param_str += f": {param.annotation.__name__}"
        if param.default != param.empty:
            param_str += f" = {param.default}"
        params.append(param_str)
        args_doc.append(f"{param_name}: Description of {param_name}")

    return_type = ""
    if sig.return_annotation != sig.empty:
        return_type = f" -> {sig.return_annotation.__name__}"

    doc_template = f'''
def {func.__name__}({", ".join(params)}){return_type}:
    """
    Brief description of {func.__name__}

    Args:
        {chr(10).join(f"        {arg}" for arg in args_doc)}

    Returns:
        Description of return value

    Examples:
        >>> {func.__name__}(example_input)
        expected_output
    """
'''
    return doc_template
```

### Example 6: User Guide Template

```markdown
# User Guide

## Getting Started

### Creating Your First ${FEATURE}

1. **Navigate to the Dashboard**

   Click on the ${FEATURE} tab in the main navigation menu.

2. **Click "Create New"**

   You'll find the "Create New" button in the top right corner.

3. **Fill in the Details**

   - **Name**: Enter a descriptive name
   - **Description**: Add optional details
   - **Settings**: Configure as needed

4. **Save Your Changes**

   Click "Save" to create your ${FEATURE}.

### Common Tasks

#### Editing ${FEATURE}

1. Find your ${FEATURE} in the list
2. Click the "Edit" button
3. Make your changes
4. Click "Save"

#### Deleting ${FEATURE}

> ⚠️ **Warning**: Deletion is permanent and cannot be undone.

1. Find your ${FEATURE} in the list
2. Click the "Delete" button
3. Confirm the deletion

### Troubleshooting

| Error | Meaning | Solution |
|-------|---------|----------|
| "Name required" | The name field is empty | Enter a name |
| "Permission denied" | You don't have access | Contact admin |
| "Server error" | Technical issue | Try again later |
```

### Example 7: Interactive API Playground

**Swagger UI Setup**
```html
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@latest/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>

    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@latest/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "/api/openapi.json",
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [SwaggerUIBundle.presets.apis],
                layout: "StandaloneLayout"
            });
        }
    </script>
</body>
</html>
```

**Code Examples Generator**
```python
def generate_code_examples(endpoint):
    """Generate code examples for API endpoints in multiple languages"""
    examples = {}

    # Python
    examples['python'] = f'''
import requests

url = "https://api.example.com{endpoint['path']}"
headers = {{"Authorization": "Bearer YOUR_API_KEY"}}

response = requests.{endpoint['method'].lower()}(url, headers=headers)
print(response.json())
'''

    # JavaScript
    examples['javascript'] = f'''
const response = await fetch('https://api.example.com{endpoint['path']}', {{
    method: '{endpoint['method']}',
    headers: {{'Authorization': 'Bearer YOUR_API_KEY'}}
}});

const data = await response.json();
console.log(data);
'''

    # cURL
    examples['curl'] = f'''
curl -X {endpoint['method']} https://api.example.com{endpoint['path']} \\
    -H "Authorization: Bearer YOUR_API_KEY"
'''

    return examples
```

### Example 8: Documentation CI/CD

**GitHub Actions Workflow**
```yaml
name: Generate Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'api/**'

jobs:
  generate-docs:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        pip install -r requirements-docs.txt
        npm install -g @redocly/cli

    - name: Generate API documentation
      run: |
        python scripts/generate_openapi.py > docs/api/openapi.json
        redocly build-docs docs/api/openapi.json -o docs/api/index.html

    - name: Generate code documentation
      run: sphinx-build -b html docs/source docs/build

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs/build
```

### Example 9: Documentation Coverage Validation

```python
import ast
import glob

class DocCoverage:
    def check_coverage(self, codebase_path):
        """Check documentation coverage for codebase"""
        results = {
            'total_functions': 0,
            'documented_functions': 0,
            'total_classes': 0,
            'documented_classes': 0,
            'missing_docs': []
        }

        for file_path in glob.glob(f"{codebase_path}/**/*.py", recursive=True):
            module = ast.parse(open(file_path).read())

            for node in ast.walk(module):
                if isinstance(node, ast.FunctionDef):
                    results['total_functions'] += 1
                    if ast.get_docstring(node):
                        results['documented_functions'] += 1
                    else:
                        results['missing_docs'].append({
                            'type': 'function',
                            'name': node.name,
                            'file': file_path,
                            'line': node.lineno
                        })

                elif isinstance(node, ast.ClassDef):
                    results['total_classes'] += 1
                    if ast.get_docstring(node):
                        results['documented_classes'] += 1
                    else:
                        results['missing_docs'].append({
                            'type': 'class',
                            'name': node.name,
                            'file': file_path,
                            'line': node.lineno
                        })

        # Calculate coverage percentages
        results['function_coverage'] = (
            results['documented_functions'] / results['total_functions'] * 100
            if results['total_functions'] > 0 else 100
        )
        results['class_coverage'] = (
            results['documented_classes'] / results['total_classes'] * 100
            if results['total_classes'] > 0 else 100
        )

        return results
```

## Output Format

1. **API Documentation**: OpenAPI spec with interactive playground
2. **Architecture Diagrams**: System, sequence, and component diagrams
3. **Code Documentation**: Inline docs, docstrings, and type hints
4. **User Guides**: Step-by-step tutorials
5. **Developer Guides**: Setup, contribution, and API usage guides
6. **Reference Documentation**: Complete API reference with examples
7. **Documentation Site**: Deployed static site with search functionality

Focus on creating documentation that is accurate, comprehensive, and easy to maintain alongside code changes.
