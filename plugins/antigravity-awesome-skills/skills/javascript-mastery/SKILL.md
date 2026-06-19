---
name: javascript-mastery
description: "33+ essential JavaScript concepts every developer should know, inspired by [33-js-concepts](https://github.com/leonardomso/33-js-concepts)."
risk: unknown
source: community
date_added: "2026-02-27"
---

# 🧠 JavaScript Mastery

> 33+ essential JavaScript concepts every developer should know, inspired by [33-js-concepts](https://github.com/leonardomso/33-js-concepts).

## When to Use This Skill

Use this skill when:

- Explaining JavaScript concepts
- Debugging tricky JS behavior
- Teaching JavaScript fundamentals
- Reviewing code for JS best practices
- Understanding language quirks

---

## 1. Fundamentals

### 1.1 Primitive Types

JavaScript has 7 primitive types:

```javascript
// String
const str = "hello";

// Number (integers and floats)
const num = 42;
const float = 3.14;

// BigInt (for large integers)
const big = 9007199254740991n;

// Boolean
const bool = true;

// Undefined
let undef; // undefined

// Null
const empty = null;

// Symbol (unique identifiers)
const sym = Symbol("description");
```

**Key points**:

- Primitives are immutable
- Passed by value
- `typeof null === "object"` is a historical bug

### 1.2 Type Coercion

JavaScript implicitly converts types:

```javascript
// String coercion
"5" + 3; // "53" (number → string)
"5" - 3; // 2    (string → number)

// Boolean coercion
Boolean(""); // false
Boolean("hello"); // true
Boolean(0); // false
Boolean([]); // true (!)

// Equality coercion
"5" == 5; // true  (coerces)
"5" === 5; // false (strict)
```

**Falsy values** (8 total):
`false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`

### 1.3 Equality Operators

```javascript
// == (loose equality) - coerces types
null == undefined; // true
"1" == 1; // true

// === (strict equality) - no coercion
null === undefined; // false
"1" === 1; // false

// Object.is() - handles edge cases
Object.is(NaN, NaN); // true (NaN === NaN is false!)
Object.is(-0, 0); // false (0 === -0 is true!)
```

**Rule**: Always use `===` unless you have a specific reason not to.

---

## 2. Scope & Closures

### 2.1 Scope Types

```javascript
// Global scope
var globalVar = "global";

function outer() {
  // Function scope
  var functionVar = "function";

  if (true) {
    // Block scope (let/const only)
    let blockVar = "block";
    const alsoBlock = "block";
    var notBlock = "function"; // var ignores blocks!
  }
}
```

### 2.2 Closures

A closure is a function that remembers its lexical scope:

```javascript
function createCounter() {
  let count = 0; // "closed over" variable

  return {
    increment() {
      return ++count;
    },
    decrement() {
      return --count;
    },
    getCount() {
      return count;
    },
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getCount(); // 2
```

**Common use cases**:

- Data privacy (module pattern)
- Function factories
- Partial application
- Memoization

### 2.3 var vs let vs const

```javascript
// var - function scoped, hoisted, can redeclare
var x = 1;
var x = 2; // OK

// let - block scoped, hoisted (TDZ), no redeclare
let y = 1;
// let y = 2; // Error!

// const - like let, but can't reassign
const z = 1;
// z = 2; // Error!

// BUT: const objects are mutable
const obj = { a: 1 };
obj.a = 2; // OK
obj.b = 3; // OK
```

---

## 3. Functions & Execution

### 3.1 Call Stack

```javascript
function first() {
  console.log("first start");
  second();
  console.log("first end");
}

function second() {
  console.log("second");
}

first();
// Output:
// "first start"
// "second"
// "first end"
```

Stack overflow example:

```javascript
function infinite() {
  infinite(); // No base case!
}
infinite(); // RangeError: Maximum call stack size exceeded
```

### 3.2 Hoisting

```javascript
// Variable hoisting
console.log(a); // undefined (hoisted, not initialized)
var a = 5;

console.log(b); // ReferenceError (TDZ)
let b = 5;

// Function hoisting
sayHi(); // Works!
function sayHi() {
  console.log("Hi!");
}

// Function expressions don't hoist
sayBye(); // TypeError
var sayBye = function () {
  console.log("Bye!");
};
```

### 3.3 this Keyword

```javascript
// Global context
console.log(this); // window (browser) or global (Node)

// Object method
const obj = {
  name: "Alice",
  greet() {
    console.log(this.name); // "Alice"
  },
};

// Arrow functions (lexical this)
const obj2 = {
  name: "Bob",
  greet: () => {
    console.log(this.name); // undefined (inherits outer this)
  },
};

// Explicit binding
function greet() {
  console.log(this.name);
}
greet.call({ name: "Charlie" }); // "Charlie"
greet.apply({ name: "Diana" }); // "Diana"
const bound = greet.bind({ name: "Eve" });
bound(); // "Eve"
```

---

## 4. Event Loop & Async

### 4.1 Event Loop

```javascript
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

console.log("4");

// Output: 1, 4, 3, 2
// Why? Microtasks (Promises) run before macrotasks (setTimeout)
```

**Execution order**:

1. Synchronous code (call stack)
2. Microtasks (Promise callbacks, queueMicrotask)
3. Macrotasks (setTimeout, setInterval, I/O)

### 4.2 Callbacks

```javascript
// Callback pattern
function fetchData(callback) {
  setTimeout(() => {
    callback(null, { data: "result" });
  }, 1000);
}

// Error-first convention
fetchData((error, result) => {
  if (error) {
    console.error(error);
    return;
  }
  console.log(result);
});

// Callback hell (avoid this!)
getData((data) => {
  processData(data, (processed) => {
    saveData(processed, (saved) => {
      notify(saved, () => {
        // 😱 Pyramid of doom
      });
    });
  });
});
```

### 4.3 Promises

```javascript
// Creating a Promise
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve("Success!");
    // or: reject(new Error("Failed!"));
  }, 1000);
});

// Consuming Promises
promise
  .then((result) => console.log(result))
  .catch((error) => console.error(error))
  .finally(() => console.log("Done"));

// Promise combinators
Promise.all([p1, p2, p3]); // All must succeed
Promise.allSettled([p1, p2]); // Wait for all, get status
Promise.race([p1, p2]); // First to settle
Promise.any([p1, p2]); // First to succeed
```

### 4.4 async/await

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch");
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Error:", error);
    throw error; // Re-throw for caller to handle
  }
}

// Parallel execution
async function fetchAll() {
  const [users, posts] = await Promise.all([
    fetch("/api/users"),
    fetch("/api/posts"),
  ]);
  return { users, posts };
}
```

---

## 5. Functional Programming

### 5.1 Higher-Order Functions

Functions that take or return functions:

```javascript
// Takes a function
const numbers = [1, 2, 3];
const doubled = numbers.map((n) => n * 2); // [2, 4, 6]

// Returns a function
function multiply(a) {
  return function (b) {
    return a * b;
  };
}
const double = multiply(2);
double(5); // 10
```

### 5.2 Pure Functions

```javascript
// Pure: same input → same output, no side effects
function add(a, b) {
  return a + b;
}

// Impure: modifies external state
let total = 0;
function addToTotal(value) {
  total += value; // Side effect!
  return total;
}

// Impure: depends on external state
function getDiscount(price) {
  return price * globalDiscountRate; // External dependency
}
```

### 5.3 map, filter, reduce

```javascript
const users = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 },
  { name: "Charlie", age: 35 },
];

// map: transform each element
const names = users.map((u) => u.name);
// ["Alice", "Bob", "Charlie"]

// filter: keep elements matching condition
const adults = users.filter((u) => u.age >= 30);
// [{ name: "Bob", ... }, { name: "Charlie", ... }]

// reduce: accumulate into single value
const totalAge = users.reduce((sum, u) => sum + u.age, 0);
// 90

// Chaining
const result = users
  .filter((u) => u.age >= 30)
  .map((u) => u.name)
  .join(", ");
// "Bob, Charlie"
```

### 5.4 Currying & Composition

```javascript
// Currying: transform f(a, b, c) into f(a)(b)(c)
const curry = (fn) => {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return (...moreArgs) => curried(...args, ...moreArgs);
  };
};

const add = curry((a, b, c) => a + b + c);
add(1)(2)(3); // 6
add(1, 2)(3); // 6
add(1)(2, 3); // 6

// Composition: combine functions
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((acc, fn) => fn(acc), x);

const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((acc, fn) => fn(acc), x);

const addOne = (x) => x + 1;
const double = (x) => x * 2;

const addThenDouble = compose(double, addOne);
addThenDouble(5); // 12 = (5 + 1) * 2

const doubleThenAdd = pipe(double, addOne);
doubleThenAdd(5); // 11 = (5 * 2) + 1
```

---

## 6. Objects & Prototypes

### 6.1 Prototypal Inheritance

```javascript
// Prototype chain
const animal = {
  speak() {
    console.log("Some sound");
  },
};

const dog = Object.create(animal);
dog.bark = function () {
  console.log("Woof!");
};

dog.speak(); // "Some sound" (inherited)
dog.bark(); // "Woof!" (own method)

// ES6 Classes (syntactic sugar)
class Animal {
  speak() {
    console.log("Some sound");
  }
}

class Dog extends Animal {
  bark() {
    console.log("Woof!");
  }
}
```

### 6.2 Object Methods

```javascript
const obj = { a: 1, b: 2 };

// Keys, values, entries
Object.keys(obj); // ["a", "b"]
Object.values(obj); // [1, 2]
Object.entries(obj); // [["a", 1], ["b", 2]]

// Shallow copy
const copy = { ...obj };
const copy2 = Object.assign({}, obj);

// Freeze (immutable)
const frozen = Object.freeze({ x: 1 });
frozen.x = 2; // Silently fails (or throws in strict mode)

// Seal (no add/delete, can modify)
const sealed = Object.seal({ x: 1 });
sealed.x = 2; // OK
sealed.y = 3; // Fails
delete sealed.x; // Fails
```

---

## 7. Modern JavaScript (ES6+)

### 7.1 Destructuring

```javascript
// Array destructuring
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// Object destructuring
const { name, age, city = "Unknown" } = { name: "Alice", age: 25 };
// name = "Alice", age = 25, city = "Unknown"

// Renaming
const { name: userName } = { name: "Bob" };
// userName = "Bob"

// Nested
const {
  address: { street },
} = { address: { street: "123 Main" } };
```

### 7.2 Spread & Rest

```javascript
// Spread: expand iterable
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]

const obj1 = { a: 1 };
const obj2 = { ...obj1, b: 2 }; // { a: 1, b: 2 }

// Rest: collect remaining
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3, 4); // 10
```

### 7.3 Modules

```javascript
// Named exports
export const PI = 3.14159;
export function square(x) {
  return x * x;
}

// Default export
export default class Calculator {}

// Importing
import Calculator, { PI, square } from "./math.js";
import * as math from "./math.js";

// Dynamic import
const module = await import("./dynamic.js");
```

### 7.4 Optional Chaining & Nullish Coalescing

```javascript
// Optional chaining (?.)
const user = { address: { city: "NYC" } };
const city = user?.address?.city; // "NYC"
const zip = user?.address?.zip; // undefined (no error)
const fn = user?.getName?.(); // undefined if no method

// Nullish coalescing (??)
const value = null ?? "default"; // "default"
const zero = 0 ?? "default"; // 0 (not nullish!)
const empty = "" ?? "default"; // "" (not nullish!)

// Compare with ||
const value2 = 0 || "default"; // "default" (0 is falsy)
```

---

## Quick Reference Card

| Concept        | Key Point                         |
| :------------- | :-------------------------------- |
| `==` vs `===`  | Always use `===`                  |
| `var` vs `let` | Prefer `let`/`const`              |
| Closures       | Function + lexical scope          |
| `this`         | Depends on how function is called |
| Event loop     | Microtasks before macrotasks      |
| Pure functions | Same input → same output          |
| Prototypes     | `__proto__` → prototype chain     |
| `??` vs `\|\|` | `??` only checks null/undefined   |

---

## Resources

- [33 JS Concepts](https://github.com/leonardomso/33-js-concepts)
- [JavaScript.info](https://javascript.info/)
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
