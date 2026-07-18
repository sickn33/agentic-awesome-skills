---
name: scala
description: "Language-specific super-code guidelines for scala."
risk: safe
source: community
date_added: "2026-06-16"
---
# Scala: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for scala.

## Table of Contents
1. [Collections & Functional Transforms](#collections)
2. [Pattern Matching](#patterns)
3. [Case Classes & ADTs](#case-classes)
4. [Option & Error Handling](#option)
5. [Implicits & Given/Using](#implicits)
6. [Concurrency](#concurrency)
7. [Anti-patterns specific to Scala](#antipatterns)

---

## 1. Collections & Functional Transforms {#collections}

```scala
// ❌ Imperative accumulation
val result = new ArrayBuffer[String]()
for (item <- items) {
  if (item.isActive) result += item.name.toUpperCase
}

// ✅
val result = items.filter(_.isActive).map(_.name.toUpperCase)
```

```scala
// ❌ Manual grouping
val grouped = mutable.Map[String, List[Item]]()
for (item <- items) {
  grouped(item.category) = grouped.getOrElse(item.category, Nil) :+ item
}

// ✅
val grouped = items.groupBy(_.category)
```

```scala
// ❌ Manual fold when sum/product works
var total = 0
for (o <- orders) total += o.amount

// ✅
val total = orders.map(_.amount).sum
```

```scala
// ❌ Using head on potentially empty collection
val first = items.head // throws on empty

// ✅
val first = items.headOption // returns Option[T]
```

```scala
// ❌ Chaining filter + head for find
val found = items.filter(_.id == targetId).head

// ✅
val found = items.find(_.id == targetId) // returns Option[T]
```

**Use `view` for lazy evaluation on large collections to avoid intermediate allocations.**

---

## 2. Pattern Matching {#patterns}

```scala
// ❌ if-else chain for type dispatch
if (shape.isInstanceOf[Circle]) {
  val c = shape.asInstanceOf[Circle]
  c.radius * c.radius * Math.PI
} else if (shape.isInstanceOf[Rect]) { ... }

// ✅
shape match {
  case Circle(r) => r * r * Math.PI
  case Rect(w, h) => w * h
}
```

```scala
// ❌ Nested match with identical fallthrough
x match {
  case 1 => "low"
  case 2 => "low"
  case 3 => "mid"
  case _ => "high"
}

// ✅
x match {
  case 1 | 2 => "low"
  case 3     => "mid"
  case _     => "high"
}
```

```scala
// ❌ Match to extract then use
val result = opt match {
  case Some(x) => x.toString
  case None    => "N/A"
}

// ✅
val result = opt.map(_.toString).getOrElse("N/A")
// or:
val result = opt.fold("N/A")(_.toString)
```

---

## 3. Case Classes & ADTs {#case-classes}

```scala
// ❌ Regular class for data
class User(val name: String, val age: Int) {
  override def equals(obj: Any): Boolean = ...
  override def hashCode(): Int = ...
  override def toString: String = ...
}

// ✅
case class User(name: String, age: Int)
```

```scala
// ❌ Sealed trait with unrelated case objects
sealed trait Result
case class Success(value: Int) extends Result
case class Failure(error: String) extends Result
case object Unknown extends Result // what does "Unknown" mean?

// ✅ — each variant should carry the data it represents
sealed trait Result[+A]
case class Success[A] (value: A) extends Result[A]
case class Failure(error: Throwable) extends Result[Nothing]
```

```scala
// ❌ (Scala 3) Verbose enum
sealed trait Color
object Color {
  case object Red extends Color
  case object Green extends Color
  case object Blue extends Color
}

// ✅ (Scala 3)
enum Color { case Red, Green, Blue }
```

---

## 4. Option & Error Handling {#option}

```scala
// ❌ Null checks
val name: String = if (user != null) user.name else "Unknown"

// ✅
val name = Option(user).map(_.name).getOrElse("Unknown")
```

```scala
// ❌ .get on Option (defeats the purpose)
val name = userOpt.get // throws if None

// ✅
val name = userOpt.getOrElse("default")
// or: userOpt.map(process).getOrElse(fallback)
// or: userOpt match { case Some(u) => ... case None => ... }
```

```scala
// ❌ Try with .get
val result = Try(parse(input)).get // throws on failure

// ✅
val result = Try(parse(input)) match {
  case Success(v) => v
  case Failure(e) => handleError(e)
}
// or: Try(parse(input)).getOrElse(default)
// or: Try(parse(input)).toEither
```

```scala
// ❌ Using exceptions for expected failures
def findUser(id: String): User = {
  val user = db.query(id)
  if (user == null) throw new NotFoundException(id)
  user
}

// ✅ — Option for absence, Either for expected errors
def findUser(id: String): Option[User] = db.query(id)
// or:
def findUser(id: String): Either[AppError, User]
```

---

## 5. Implicits & Given/Using {#implicits}

```scala
// ❌ (Scala 2) Implicit conversion that hides bugs
implicit def stringToInt(s: String): Int = s.toInt

// ✅ — extension methods instead of implicit conversions
extension (s: String)
  def toIntSafe: Option[Int] = s.toIntOption
```

```scala
// ❌ (Scala 2) Implicit parameter with broad type
def query(sql: String)(implicit conn: Connection): ResultSet

// ✅ (Scala 3)
def query(sql: String)(using conn: Connection): ResultSet
```

```scala
// ❌ Importing implicits from everywhere
import com.lib.implicits._

// ✅ — import only what you need
import com.lib.given
// or specific: import com.lib.{given ExecutionContext}
```

---

## 6. Concurrency {#concurrency}

```scala
// ❌ Thread.sleep in production code
Thread.sleep(5000)

// ✅ — use scheduler / timer abstraction
import scala.concurrent.duration._
system.scheduler.scheduleOnce(5.seconds)(doWork())
```

```scala
// ❌ Blocking inside Future
Future {
  val result = blockingHttpCall() // starves thread pool
  process(result)
}

// ✅
Future {
  blocking { val result = blockingHttpCall() }
  // or use a dedicated blocking ExecutionContext
}
```

```scala
// ❌ Awaiting futures in a loop
for (f <- futures) Await.result(f, Duration.Inf)

// ✅
val all = Future.sequence(futures)
all.map(results => process(results))
```

**Prefer `Future.sequence`/`Future.traverse` over manual await loops.**

---

## 7. Anti-patterns specific to Scala {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `.get` on Option/Try | `.getOrElse` / pattern match |
| `null` | `Option` |
| `isInstanceOf` + `asInstanceOf` | pattern matching |
| Implicit conversions (Scala 2) | extension methods (Scala 3) |
| `var` for accumulation | `val` + functional transforms |
| `return` keyword | last expression is the return value |
| Mutable collections by default | immutable collections |
| `Any` / `AnyRef` parameters | generics with type bounds |
| Deeply nested `for` comprehensions | break into named values |
| Tuple instead of case class | case class for anything with semantic meaning |
| `Await.result` in production | compose with `map`/`flatMap` |




## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
