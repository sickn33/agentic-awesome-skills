---
name: ruby
description: "Language-specific super-code guidelines for ruby."
risk: safe
source: community
date_added: "2026-06-16"
---
# Ruby: Idiomatic Efficiency Reference

## Table of Contents
1. [Enumerable & Collections](#enumerable)
2. [Blocks, Procs & Lambdas](#blocks)
3. [String Handling](#strings)
4. [Error Handling](#errors)
5. [Classes & Modules](#classes)
6. [Ruby Idioms](#idioms)
7. [Anti-patterns specific to Ruby](#antipatterns)

---

## 1. Enumerable & Collections {#enumerable}

```ruby
# ❌ Manual accumulation
result = []
items.each do |item|
  result << item.name.upcase if item.active?
end

# ✅
result = items.select(&:active?).map { |i| i.name.upcase }
```

```ruby
# ❌ Manual grouping
grouped = {}
items.each do |item|
  grouped[item.category] ||= []
  grouped[item.category] << item
end

# ✅
grouped = items.group_by(&:category)
```

```ruby
# ❌ Manual sum
total = 0
orders.each { |o| total += o.amount }

# ✅
total = orders.sum(&:amount)
```

```ruby
# ❌ Checking existence then accessing
if hash.key?(key)
  value = hash[key]
end

# ✅
value = hash[key] # returns nil if missing
# or with default:
value = hash.fetch(key, default_value)
# or raising on missing:
value = hash.fetch(key) # raises KeyError
```

**Prefer `map`/`select`/`reject`/`sum` over manual loops. Use `&:method` for single-method blocks.**

---

## 2. Blocks, Procs & Lambdas {#blocks}

```ruby
# ❌ Explicit block-to-proc conversion when unnecessary
items.map { |item| item.to_s }

# ✅
items.map(&:to_s)
```

```ruby
# ❌ Proc.new when lambda is safer (arity check + return behavior)
handler = Proc.new { |x| x * 2 }

# ✅
handler = ->(x) { x * 2 }
```

```ruby
# ❌ Multi-line block with { }
items.map { |item|
  result = transform(item)
  validate(result)
  result
}

# ✅ — do/end for multi-line, { } for single-line
items.map do |item|
  result = transform(item)
  validate(result)
  result
end
```

---

## 3. String Handling {#strings}

```ruby
# ❌ String concatenation in loop
result = ""
items.each { |i| result += i.name + ", " }

# ✅
result = items.map(&:name).join(", ")
```

```ruby
# ❌ String concatenation for assembly
greeting = "Hello, " + name + "! You have " + count.to_s + " messages."

# ✅
greeting = "Hello, #{name}! You have #{count} messages."
```

```ruby
# ❌ Mutable string where frozen is fine (Ruby 3+ encourages frozen)
SEPARATOR = ", "

# ✅
SEPARATOR = ", ".freeze
# or add `# frozen_string_literal: true` at file top
```

**Use heredocs (`<<~HEREDOC`) for multi-line strings. `<<~` strips indentation.**

---

## 4. Error Handling {#errors}

```ruby
# ❌ Rescuing Exception (catches EVERYTHING including SignalException, SystemExit)
begin
  risky
rescue Exception => e
  log(e)
end

# ✅ — rescue StandardError (the default)
begin
  risky
rescue StandardError => e
  log(e)
  raise
end
# or just: rescue => e (same as StandardError)
```

```ruby
# ❌ Using rescue as flow control
begin
  value = hash.fetch(key)
rescue KeyError
  value = default
end

# ✅
value = hash.fetch(key, default)
```

```ruby
# ❌ Inline rescue hiding errors
result = dangerous_operation rescue nil

# ✅ — inline rescue only for truly trivial fallbacks
result = Integer(input) rescue nil  # acceptable for parsing
```

---

## 5. Classes & Modules {#classes}

```ruby
# ❌ Manual accessors
class User
  def name
    @name
  end
  def name=(value)
    @name = value
  end
end

# ✅
class User
  attr_accessor :name
end
```

```ruby
# ❌ Deep inheritance for shared behavior
class Animal; end
class Pet < Animal; end
class Dog < Pet; end

# ✅ — mixins for shared behavior, inheritance for "is-a"
module Trainable
  def train = puts("Training #{name}")
end

class Dog
  include Trainable
  attr_reader :name
  def initialize(name) = @name = name
end
```

```ruby
# ❌ Class with only class methods (namespace via class)
class MathUtils
  def self.square(x) = x * x
  def self.cube(x) = x ** 3
end

# ✅
module MathUtils
  module_function
  def square(x) = x * x
  def cube(x) = x ** 3
end
```

---

## 6. Ruby Idioms {#idioms}

```ruby
# ❌ Explicit boolean return
def active?
  if status == :active
    true
  else
    false
  end
end

# ✅
def active? = status == :active
```

```ruby
# ❌ nil check before method call
if user && user.name
  puts user.name
end

# ✅ (Ruby 2.3+)
puts user&.name if user&.name
# or with safe navigation:
user&.name&.then { |n| puts n }
```

```ruby
# ❌ Conditional assignment verbosely
if @cache.nil?
  @cache = expensive_compute
end

# ✅
@cache ||= expensive_compute
```

```ruby
# ❌ Multiple assignment from array manually
first = arr[0]
second = arr[1]

# ✅
first, second = arr
```

---

## 7. Anti-patterns specific to Ruby {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `rescue Exception` | `rescue StandardError` |
| `for x in collection` | `collection.each` |
| Manual `attr_reader`/`writer` | `attr_accessor` / `attr_reader` |
| `class` for pure namespace | `module` |
| String concatenation with `+` | string interpolation `#{}` |
| `if !condition` | `unless condition` |
| `== true` / `== false` | truthy/falsy check directly |
| `and`/`or` for control flow | `&&`/`||` (different precedence) |
| `return` at end of method | implicit return (last expression) |
| Monkey-patching core classes in production | refinements or wrapper |
| `eval` / `send` for known methods | direct method call |


