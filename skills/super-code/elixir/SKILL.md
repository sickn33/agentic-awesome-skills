---
name: elixir
description: "Language-specific super-code guidelines for elixir."
risk: safe
source: community
date_added: "2026-06-16"
---
# Elixir / Erlang: Idiomatic Efficiency Reference

## Table of Contents
1. [Pattern Matching & Guards](#patterns)
2. [Pipe Operator & Transforms](#pipes)
3. [Processes & OTP](#otp)
4. [Error Handling](#errors)
5. [Collections & Enum](#collections)
6. [Structs & Protocols](#structs)
7. [Anti-patterns specific to Elixir/Erlang](#antipatterns)

---

## 1. Pattern Matching & Guards {#patterns}

```elixir
# ❌ Extracting with Map.get then checking
value = Map.get(map, :key)
if value != nil do
  process(value)
end

# ✅ — pattern match directly
case map do
  %{key: value} -> process(value)
  _ -> :noop
end
# or with if:
if value = map[:key], do: process(value)
```

```elixir
# ❌ Nested case for multiple conditions
case fetch_user(id) do
  {:ok, user} ->
    case validate(user) do
      {:ok, valid_user} -> save(valid_user)
      {:error, reason} -> {:error, reason}
    end
  {:error, reason} -> {:error, reason}
end

# ✅ — with clause
with {:ok, user} <- fetch_user(id),
     {:ok, valid_user} <- validate(user) do
  save(valid_user)
end
```

```elixir
# ❌ if/else for known shapes
def area(shape) do
  if shape.type == :circle do
    :math.pi() * shape.radius * shape.radius
  else
    shape.width * shape.height
  end
end

# ✅ — multi-clause function with pattern match
def area(%{type: :circle, radius: r}), do: :math.pi() * r * r
def area(%{type: :rect, width: w, height: h}), do: w * h
```

```elixir
# ❌ Checking type at runtime
def process(x) do
  if is_integer(x) and x > 0 do
    x * 2
  end
end

# ✅ — guard clause
def process(x) when is_integer(x) and x > 0, do: x * 2
def process(_), do: {:error, :invalid_input}
```

---

## 2. Pipe Operator & Transforms {#pipes}

```elixir
# ❌ Nested function calls
String.trim(String.downcase(String.replace(input, ~r/\s+/, " ")))

# ✅
input
|> String.replace(~r/\s+/, " ")
|> String.downcase()
|> String.trim()
```

```elixir
# ❌ Pipe into anonymous function awkwardly
data
|> (fn x -> x * 2 end).()

# ✅ — use then/1 or named function
data
|> then(&(&1 * 2))
# or better: extract a named function
data |> double()
```

```elixir
# ❌ Single-step pipe (no gain in readability)
result = list |> Enum.count()

# ✅ — direct call for single operation
result = Enum.count(list)
```

**Pipe when 2+ transforms. Direct call for single operation. First arg flows through pipe.**

---

## 3. Processes & OTP {#otp}

```elixir
# ❌ Raw spawn for stateful process
pid = spawn(fn -> loop(%{count: 0}) end)
send(pid, {:increment})

# ✅ — GenServer for stateful processes
defmodule Counter do
  use GenServer

  def start_link(init \\ 0), do: GenServer.start_link(__MODULE__, init)
  def increment(pid), do: GenServer.call(pid, :increment)

  @impl true
  def init(count), do: {:ok, count}

  @impl true
  def handle_call(:increment, _from, count), do: {:reply, count + 1, count + 1}
end
```

```elixir
# ❌ Spawning without linking (orphan process on crash)
spawn(fn -> do_work() end)

# ✅ — Task for fire-and-forget with supervision
Task.start(fn -> do_work() end)
# or for awaitable result:
task = Task.async(fn -> do_work() end)
result = Task.await(task)
```

```elixir
# ❌ Manual process registry
Process.register(self(), :my_worker)

# ✅ — use Registry or named GenServer
{:ok, _} = Registry.start_link(keys: :unique, name: MyRegistry)
GenServer.start_link(Worker, arg, name: {:via, Registry, {MyRegistry, :my_worker}})
```

```elixir
# ❌ try/catch in GenServer (breaks supervision)
def handle_call(:work, _from, state) do
  try do
    result = risky_operation()
    {:reply, result, state}
  catch
    _ -> {:reply, :error, state}
  end
end

# ✅ — let it crash; supervisor restarts
def handle_call(:work, _from, state) do
  result = risky_operation()
  {:reply, result, state}
end
```

**"Let it crash" — supervisors handle recovery. Don't defensively catch inside GenServers.**

---

## 4. Error Handling {#errors}

```elixir
# ❌ Raising for expected failures
def find_user(id) do
  case Repo.get(User, id) do
    nil -> raise "User not found"
    user -> user
  end
end

# ✅ — tagged tuples for expected outcomes
def find_user(id) do
  case Repo.get(User, id) do
    nil -> {:error, :not_found}
    user -> {:ok, user}
  end
end
```

```elixir
# ❌ Ignoring error tuple
{:ok, result} = might_fail()  # crashes on {:error, _}

# ✅ — handle both cases
case might_fail() do
  {:ok, result} -> process(result)
  {:error, reason} -> Logger.error("Failed: #{inspect(reason)}")
end
```

```elixir
# ❌ String errors
{:error, "something went wrong"}

# ✅ — atom or struct errors (matchable, cheap)
{:error, :timeout}
{:error, %ValidationError{field: :email, reason: :invalid_format}}
```

```elixir
# ❌ Deep nesting of ok/error checks
case step1() do
  {:ok, a} ->
    case step2(a) do
      {:ok, b} ->
        case step3(b) do
          {:ok, c} -> {:ok, c}
          error -> error
        end
      error -> error
    end
  error -> error
end

# ✅
with {:ok, a} <- step1(),
     {:ok, b} <- step2(a),
     {:ok, c} <- step3(b) do
  {:ok, c}
else
  {:error, reason} -> {:error, reason}
end
```

---

## 5. Collections & Enum {#collections}

```elixir
# ❌ Multiple passes when one suffices
items
|> Enum.filter(&(&1.active))
|> Enum.map(&(&1.name))

# ✅ — for comprehension when filter + transform
for %{active: true, name: name} <- items, do: name
```

```elixir
# ❌ Enum.count for empty check (traverses whole list)
if Enum.count(list) == 0, do: :empty

# ✅
if Enum.empty?(list), do: :empty
# or pattern match:
case list do
  [] -> :empty
  _ -> :has_items
end
```

```elixir
# ❌ Building map with Enum.reduce when Map.new works
Enum.reduce(users, %{}, fn user, acc -> Map.put(acc, user.id, user) end)

# ✅
Map.new(users, &{&1.id, &1})
```

```elixir
# ❌ Enum on large dataset (eager — builds intermediate lists)
huge_list
|> Enum.map(&transform/1)
|> Enum.filter(&valid?/1)
|> Enum.take(10)

# ✅ — Stream for lazy evaluation
huge_list
|> Stream.map(&transform/1)
|> Stream.filter(&valid?/1)
|> Enum.take(10)
```

**Use `Stream` when chaining transforms on large/infinite collections. `Enum` for small or final step.**

---

## 6. Structs & Protocols {#structs}

```elixir
# ❌ Plain map for domain entities
user = %{name: "Alice", email: "a@b.com", age: 30}
# typo in key goes unnoticed: user.emaail

# ✅ — struct enforces keys
defmodule User do
  @enforce_keys [:name, :email]
  defstruct [:name, :email, age: 0]
end
user = %User{name: "Alice", email: "a@b.com"}
```

```elixir
# ❌ Protocol with only one implementation (over-abstraction)
defprotocol Renderable do
  def render(data)
end
defimpl Renderable, for: HtmlPage do ... end

# ✅ — just a function until you need polymorphism
def render(%HtmlPage{} = page), do: ...
```

```elixir
# ❌ Updating nested struct manually
updated = %{user | address: %{user.address | city: "NYC"}}

# ✅
updated = put_in(user.address.city, "NYC")
# or Kernel.update_in/3 for transforms
```

---

## 7. Anti-patterns specific to Elixir/Erlang {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `spawn` without link/monitor | `Task.start_link` or `GenServer` |
| `try/catch` inside GenServer | let it crash; supervisor restarts |
| String error reasons | atom or struct errors |
| `Enum.count(x) == 0` | `Enum.empty?(x)` or `match?([], x)` |
| Mutable-style accumulator | `Enum.reduce` / recursion |
| `if/else` chain on data shape | multi-clause function + pattern match |
| Nested `case` for ok/error | `with` expression |
| `IO.inspect` left in prod | `Logger` with levels |
| Single-step pipe | direct function call |
| `Enum` on huge/infinite data | `Stream` |
| Raw PID passing | named processes / Registry |
| Boolean returns for success/fail | `{:ok, val}` / `{:error, reason}` tuples |
| `length(list) > 0` (O(n)) | pattern match `[_ | _]` |
| Shared mutable state via ETS without wrapper | GenServer or Agent as access layer |


