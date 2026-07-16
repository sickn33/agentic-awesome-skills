# Code Explanation and Analysis Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Instructions

### 1. Code Comprehension Analysis

Analyze the code to determine complexity and structure:

**Code Complexity Assessment**
```python
import ast
import re
from typing import Dict, List, Tuple

class CodeAnalyzer:
    def analyze_complexity(self, code: str) -> Dict:
        """
        Analyze code complexity and structure
        """
        analysis = {
            'complexity_score': 0,
            'concepts': [],
            'patterns': [],
            'dependencies': [],
            'difficulty_level': 'beginner'
        }
        
        # Parse code structure
        try:
            tree = ast.parse(code)
            
            # Analyze complexity metrics
            analysis['metrics'] = {
                'lines_of_code': len(code.splitlines()),
                'cyclomatic_complexity': self._calculate_cyclomatic_complexity(tree),
                'nesting_depth': self._calculate_max_nesting(tree),
                'function_count': len([n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]),
                'class_count': len([n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)])
            }
            
            # Identify concepts used
            analysis['concepts'] = self._identify_concepts(tree)
            
            # Detect design patterns
            analysis['patterns'] = self._detect_patterns(tree)
            
            # Extract dependencies
            analysis['dependencies'] = self._extract_dependencies(tree)
            
            # Determine difficulty level
            analysis['difficulty_level'] = self._assess_difficulty(analysis)
            
        except SyntaxError as e:
            analysis['parse_error'] = str(e)
            
        return analysis
    
    def _identify_concepts(self, tree) -> List[str]:
        """
        Identify programming concepts used in the code
        """
        concepts = []
        
        for node in ast.walk(tree):
            # Async/await
            if isinstance(node, (ast.AsyncFunctionDef, ast.AsyncWith, ast.AsyncFor)):
                concepts.append('asynchronous programming')
            
            # Decorators
            elif isinstance(node, ast.FunctionDef) and node.decorator_list:
                concepts.append('decorators')
            
            # Context managers
            elif isinstance(node, ast.With):
                concepts.append('context managers')
            
            # Generators
            elif isinstance(node, ast.Yield):
                concepts.append('generators')
            
            # List/Dict/Set comprehensions
            elif isinstance(node, (ast.ListComp, ast.DictComp, ast.SetComp)):
                concepts.append('comprehensions')
            
            # Lambda functions
            elif isinstance(node, ast.Lambda):
                concepts.append('lambda functions')
            
            # Exception handling
            elif isinstance(node, ast.Try):
                concepts.append('exception handling')
                
        return list(set(concepts))
```

### 2. Visual Explanation Generation

Create visual representations of code flow:

**Flow Diagram Generation**
```python
class VisualExplainer:
    def generate_flow_diagram(self, code_structure):
        """
        Generate Mermaid diagram showing code flow
        """
        diagram = "```mermaid\nflowchart TD\n"
        
        # Example: Function call flow
        if code_structure['type'] == 'function_flow':
            nodes = []
            edges = []
            
            for i, func in enumerate(code_structure['functions']):
                node_id = f"F{i}"
                nodes.append(f"    {node_id}[{func['name']}]")
                
                # Add function details
                if func.get('parameters'):
                    nodes.append(f"    {node_id}_params[/{', '.join(func['parameters'])}/]")
                    edges.append(f"    {node_id}_params --> {node_id}")
                
                # Add return value
                if func.get('returns'):
                    nodes.append(f"    {node_id}_return[{func['returns']}]")
                    edges.append(f"    {node_id} --> {node_id}_return")
                
                # Connect to called functions
                for called in func.get('calls', []):
                    called_id = f"F{code_structure['function_map'][called]}"
                    edges.append(f"    {node_id} --> {called_id}")
            
            diagram += "\n".join(nodes) + "\n"
            diagram += "\n".join(edges) + "\n"
            
        diagram += "```"
        return diagram
    
    def generate_class_diagram(self, classes):
        """
        Generate UML-style class diagram
        """
        diagram = "```mermaid\nclassDiagram\n"
        
        for cls in classes:
            # Class definition
            diagram += f"    class {cls['name']} {{\n"
            
            # Attributes
            for attr in cls.get('attributes', []):
                visibility = '+' if attr['public'] else '-'
                diagram += f"        {visibility}{attr['name']} : {attr['type']}\n"
            
            # Methods
            for method in cls.get('methods', []):
                visibility = '+' if method['public'] else '-'
                params = ', '.join(method.get('params', []))
                diagram += f"        {visibility}{method['name']}({params}) : {method['returns']}\n"
            
            diagram += "    }\n"
            
            # Relationships
            if cls.get('inherits'):
                diagram += f"    {cls['inherits']} <|-- {cls['name']}\n"
            
            for composition in cls.get('compositions', []):
                diagram += f"    {cls['name']} *-- {composition}\n"
            
        diagram += "```"
        return diagram
```

### 3. Step-by-Step Explanation

Break down complex code into digestible steps:

**Progressive Explanation**
```python
def generate_step_by_step_explanation(self, code, analysis):
    """
    Create progressive explanation from simple to complex
    """
    explanation = {
        'overview': self._generate_overview(code, analysis),
        'steps': [],
        'deep_dive': [],
        'examples': []
    }
    
    # Level 1: High-level overview
    explanation['overview'] = f"""
## What This Code Does

{self._summarize_purpose(code, analysis)}

**Key Concepts**: {', '.join(analysis['concepts'])}
**Difficulty Level**: {analysis['difficulty_level'].capitalize()}
"""
    
    # Level 2: Step-by-step breakdown
    if analysis.get('functions'):
        for i, func in enumerate(analysis['functions']):
            step = f"""
### Step {i+1}: {func['name']}

**Purpose**: {self._explain_function_purpose(func)}

**How it works**:
"""
            # Break down function logic
            for j, logic_step in enumerate(self._analyze_function_logic(func)):
                step += f"{j+1}. {logic_step}\n"
            
            # Add visual flow if complex
            if func['complexity'] > 5:
                step += f"\n{self._generate_function_flow(func)}\n"
            
            explanation['steps'].append(step)
    
    # Level 3: Deep dive into complex parts
    for concept in analysis['concepts']:
        deep_dive = self._explain_concept(concept, code)
        explanation['deep_dive'].append(deep_dive)
    
    return explanation

def _explain_concept(self, concept, code):
    """
    Explain programming concept with examples
    """
    explanations = {
        'decorators': '''
## Understanding Decorators

Decorators are a way to modify or enhance functions without changing their code directly.

**Simple Analogy**: Think of a decorator like gift wrapping - it adds something extra around the original item.

**How it works**:
```python
# This decorator:
@timer
def slow_function():
    time.sleep(1)

# Is equivalent to:
def slow_function():
    time.sleep(1)
slow_function = timer(slow_function)
```

**In this code**: The decorator is used to {specific_use_in_code}
''',
        'generators': '''
## Understanding Generators

Generators produce values one at a time, saving memory by not creating all values at once.

**Simple Analogy**: Like a ticket dispenser that gives one ticket at a time, rather than printing all tickets upfront.

**How it works**:
```python
# Generator function
def count_up_to(n):
    i = 0
    while i < n:
        yield i  # Produces one value and pauses
        i += 1

# Using the generator
for num in count_up_to(5):
    print(num)  # Prints 0, 1, 2, 3, 4
```

**In this code**: The generator is used to {specific_use_in_code}
'''
    }
    
    return explanations.get(concept, f"Explanation for {concept}")
```

### 4. Algorithm Visualization

Visualize algorithm execution:

**Algorithm Step Visualization**
```python
class AlgorithmVisualizer:
    def visualize_sorting_algorithm(self, algorithm_name, array):
        """
        Create step-by-step visualization of sorting algorithm
        """
        steps = []
        
        if algorithm_name == 'bubble_sort':
            steps.append("""
## Bubble Sort Visualization

**Initial Array**: [5, 2, 8, 1, 9]

### How Bubble Sort Works:
1. Compare adjacent elements
2. Swap if they're in wrong order
3. Repeat until no swaps needed

### Step-by-Step Execution:
""")
            
            # Simulate bubble sort with visualization
            arr = array.copy()
            n = len(arr)
            
            for i in range(n):
                swapped = False
                step_viz = f"\n**Pass {i+1}**:\n"
                
                for j in range(0, n-i-1):
                    # Show comparison
                    step_viz += f"Compare [{arr[j]}] and [{arr[j+1]}]: "
                    
                    if arr[j] > arr[j+1]:
                        arr[j], arr[j+1] = arr[j+1], arr[j]
                        step_viz += f"Swap → {arr}\n"
                        swapped = True
                    else:
                        step_viz += "No swap needed\n"
                
                steps.append(step_viz)
                
                if not swapped:
                    steps.append(f"\n✅ Array is sorted: {arr}")
                    break
        
        return '\n'.join(steps)
    
    def visualize_recursion(self, func_name, example_input):
        """
        Visualize recursive function calls
        """
        viz = f"""
## Recursion Visualization: {func_name}

### Call Stack Visualization:
```
{func_name}({example_input})
│
├─> Base case check: {example_input} == 0? No
├─> Recursive call: {func_name}({example_input - 1})
│   │
│   ├─> Base case check: {example_input - 1} == 0? No
│   ├─> Recursive call: {func_name}({example_input - 2})
│   │   │
│   │   ├─> Base case check: 1 == 0? No
│   │   ├─> Recursive call: {func_name}(0)
│   │   │   │
│   │   │   └─> Base case: Return 1
│   │   │
│   │   └─> Return: 1 * 1 = 1
│   │
│   └─> Return: 2 * 1 = 2
│
└─> Return: 3 * 2 = 6
```

**Final Result**: {func_name}({example_input}) = 6
"""
        return viz
```

### 5. Interactive Examples

Generate interactive examples for better understanding:

**Code Playground Examples**
```python
def generate_interactive_examples(self, concept):
    """
    Create runnable examples for concepts
    """
    examples = {
        'error_handling': '''
## Try It Yourself: Error Handling

### Example 1: Basic Try-Except
```python
def safe_divide(a, b):
    try:
        result = a / b
        print(f"{a} / {b} = {result}")
        return result
    except ZeroDivisionError:
        print("Error: Cannot divide by zero!")
        return None
    except TypeError:
        print("Error: Please provide numbers only!")
        return None
    finally:
        print("Division attempt completed")

# Test cases - try these:
safe_divide(10, 2)    # Success case
safe_divide(10, 0)    # Division by zero
safe_divide(10, "2")  # Type error
```

### Example 2: Custom Exceptions
```python
class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

def validate_age(age):
    try:
        age = int(age)
        if age < 0:
            raise ValidationError("Age cannot be negative")
        if age > 150:
            raise ValidationError("Age seems unrealistic")
        return age
    except ValueError:
        raise ValidationError("Age must be a number")

# Try these examples:
try:
    validate_age(25)     # Valid
    validate_age(-5)     # Negative age
    validate_age("abc")  # Not a number
except ValidationError as e:
    print(f"Validation failed: {e}")
```

### Exercise: Implement Your Own
Try implementing a function that:
1. Takes a list of numbers
2. Returns their average
3. Handles empty lists
4. Handles non-numeric values
5. Uses appropriate exception handling
''',
        'async_programming': '''
## Try It Yourself: Async Programming

### Example 1: Basic Async/Await
```python
import asyncio
import time

async def slow_operation(name, duration):
    print(f"{name} started...")
    await asyncio.sleep(duration)
    print(f"{name} completed after {duration}s")
    return f"{name} result"

async def main():
    # Sequential execution (slow)
    start = time.time()
    await slow_operation("Task 1", 2)
    await slow_operation("Task 2", 2)
    print(f"Sequential time: {time.time() - start:.2f}s")
    
    # Concurrent execution (fast)
    start = time.time()
    results = await asyncio.gather(
        slow_operation("Task 3", 2),
        slow_operation("Task 4", 2)
    )
    print(f"Concurrent time: {time.time() - start:.2f}s")
    print(f"Results: {results}")

# Run it:
asyncio.run(main())
```

### Example 2: Real-world Async Pattern
```python
async def fetch_data(url):
    """Simulate API call"""
    await asyncio.sleep(1)  # Simulate network delay
    return f"Data from {url}"

async def process_urls(urls):
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks)
    return results

# Try with different URLs:
urls = ["api.example.com/1", "api.example.com/2", "api.example.com/3"]
results = asyncio.run(process_urls(urls))
print(results)
```
'''
    }
    
    return examples.get(concept, "No example available")
```

### 6. Design Pattern Explanation

Explain design patterns found in code:

**Pattern Recognition and Explanation**
```python
class DesignPatternExplainer:
    def explain_pattern(self, pattern_name, code_example):
        """
        Explain design pattern with diagrams and examples
        """
        patterns = {
            'singleton': '''
## Singleton Pattern

### What is it?
The Singleton pattern ensures a class has only one instance and provides global access to it.

### When to use it?
- Database connections
- Configuration managers
- Logging services
- Cache managers

### Visual Representation:
```mermaid
classDiagram
    class Singleton {
        -instance: Singleton
        -__init__()
        +getInstance(): Singleton
    }
    Singleton --> Singleton : returns same instance
```

### Implementation in this code:
{code_analysis}

### Benefits:
✅ Controlled access to single instance
✅ Reduced namespace pollution
✅ Permits refinement of operations

### Drawbacks:
❌ Can make unit testing difficult
❌ Violates Single Responsibility Principle
❌ Can hide dependencies

### Alternative Approaches:
1. Dependency Injection
2. Module-level singleton
3. Borg pattern
''',
            'observer': '''
## Observer Pattern

### What is it?
The Observer pattern defines a one-to-many dependency between objects so that when one object changes state, all dependents are notified.

### When to use it?
- Event handling systems
- Model-View architectures
- Distributed event handling

### Visual Representation:
```mermaid
classDiagram
    class Subject {
        +attach(Observer)
        +detach(Observer)
        +notify()
    }
    class Observer {
        +update()
    }
    class ConcreteSubject {
        -state
        +getState()
        +setState()
    }
    class ConcreteObserver {
        -subject
        +update()
    }
    Subject <|-- ConcreteSubject
    Observer <|-- ConcreteObserver
    ConcreteSubject --> Observer : notifies
    ConcreteObserver --> ConcreteSubject : observes
```

### Implementation in this code:
{code_analysis}

### Real-world Example:
```python
# Newsletter subscription system
class Newsletter:
    def __init__(self):
        self._subscribers = []
        self._latest_article = None
    
    def subscribe(self, subscriber):
        self._subscribers.append(subscriber)
    
    def unsubscribe(self, subscriber):
        self._subscribers.remove(subscriber)
    
    def publish_article(self, article):
        self._latest_article = article
        self._notify_subscribers()
    
    def _notify_subscribers(self):
        for subscriber in self._subscribers:
            subscriber.update(self._latest_article)

class EmailSubscriber:
    def __init__(self, email):
        self.email = email
    
    def update(self, article):
        print(f"Sending email to {self.email}: New article - {article}")
```
'''
        }
        
        return patterns.get(pattern_name, "Pattern explanation not available")
```

### 7. Common Pitfalls and Best Practices

Highlight potential issues and improvements:

**Code Review Insights**
```python
def analyze_common_pitfalls(self, code):
    """
    Identify common mistakes and suggest improvements
    """
    issues = []
    
    # Check for common Python pitfalls
    pitfall_patterns = [
        {
            'pattern': r'except:',
            'issue': 'Bare except clause',
            'severity': 'high',
            'explanation': '''
## ⚠️ Bare Except Clause

**Problem**: `except:` catches ALL exceptions, including system exits and keyboard interrupts.

**Why it's bad**:
- Hides programming errors
- Makes debugging difficult
- Can catch exceptions you didn't intend to handle

**Better approach**:
```python
# Bad
try:
    risky_operation()
except:
    print("Something went wrong")

# Good
try:
    risky_operation()
except (ValueError, TypeError) as e:
    print(f"Expected error: {e}")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise
```
'''
        },
        {
            'pattern': r'def.*\(\s*\):.*global',
            'issue': 'Global variable usage',
            'severity': 'medium',
            'explanation': '''
## ⚠️ Global Variable Usage

**Problem**: Using global variables makes code harder to test and reason about.

**Better approaches**:
1. Pass as parameter
2. Use class attributes
3. Use dependency injection
4. Return values instead

**Example refactor**:
```python
# Bad
count = 0
def increment():
    global count
    count += 1

# Good
class Counter:
    def __init__(self):
        self.count = 0
    
    def increment(self):
        self.count += 1
        return self.count
```
'''
        }
    ]
    
    for pitfall in pitfall_patterns:
        if re.search(pitfall['pattern'], code):
            issues.append(pitfall)
    
    return issues
```

### 8. Learning Path Recommendations

Suggest resources for deeper understanding:

**Personalized Learning Path**
```python
def generate_learning_path(self, analysis):
    """
    Create personalized learning recommendations
    """
    learning_path = {
        'current_level': analysis['difficulty_level'],
        'identified_gaps': [],
        'recommended_topics': [],
        'resources': []
    }
    
    # Identify knowledge gaps
    if 'async' in analysis['concepts'] and analysis['difficulty_level'] == 'beginner':
        learning_path['identified_gaps'].append('Asynchronous programming fundamentals')
        learning_path['recommended_topics'].extend([
            'Event loops',
            'Coroutines vs threads',
            'Async/await syntax',
            'Concurrent programming patterns'
        ])
    
    # Add resources
    learning_path['resources'] = [
        {
            'topic': 'Async Programming',
            'type': 'tutorial',
            'title': 'Async IO in Python: A Complete Walkthrough',
            'url': 'https://realpython.com/async-io-python/',
            'difficulty': 'intermediate',
            'time_estimate': '45 minutes'
        },
        {
            'topic': 'Design Patterns',
            'type': 'book',
            'title': 'Head First Design Patterns',
            'difficulty': 'beginner-friendly',
            'format': 'visual learning'
        }
    ]
    
    # Create structured learning plan
    learning_path['structured_plan'] = f"""
## Your Personalized Learning Path

### Week 1-2: Fundamentals
- Review basic concepts: {', '.join(learning_path['recommended_topics'][:2])}
- Complete exercises on each topic
- Build a small project using these concepts

### Week 3-4: Applied Learning
- Study the patterns in this codebase
- Refactor a simple version yourself
- Compare your approach with the original

### Week 5-6: Advanced Topics
- Explore edge cases and optimizations
- Learn about alternative approaches
- Contribute to open source projects using these patterns

### Practice Projects:
1. **Beginner**: {self._suggest_beginner_project(analysis)}
2. **Intermediate**: {self._suggest_intermediate_project(analysis)}
3. **Advanced**: {self._suggest_advanced_project(analysis)}
"""
    
    return learning_path
```

## Output Format

1. **Complexity Analysis**: Overview of code complexity and concepts used
2. **Visual Diagrams**: Flow charts, class diagrams, and execution visualizations
3. **Step-by-Step Breakdown**: Progressive explanation from simple to complex
4. **Interactive Examples**: Runnable code samples to experiment with
5. **Common Pitfalls**: Issues to avoid with explanations
6. **Best Practices**: Improved approaches and patterns
7. **Learning Resources**: Curated resources for deeper understanding
8. **Practice Exercises**: Hands-on challenges to reinforce learning

Focus on making complex code accessible through clear explanations, visual aids, and practical examples that build understanding progressively.
