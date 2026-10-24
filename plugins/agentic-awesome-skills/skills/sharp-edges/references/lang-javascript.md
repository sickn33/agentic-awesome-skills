# JavaScript / TypeScript Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Loose Equality Coercion

```javascript
// DANGEROUS: == coerces types unpredictably
"0" == false   // true
"" == false    // true
"" == 0        // true
[] == false    // true
[] == ![]      // true (wat)
null == undefined  // true

// Security implications:
if (userRole == "admin") {  // What if userRole is 0?
    grantAdmin();
}
0 == "admin"  // false, but...
0 == ""       // true
```

**Fix**: Always use `===` for strict equality.

## Prototype Pollution

```javascript
// DANGEROUS: Merging untrusted objects
function merge(target, source) {
    for (let key in source) {
        target[key] = source[key];  // Includes __proto__!
    }
}

// Attacker sends: {"__proto__": {"isAdmin": true}}
merge({}, JSON.parse(userInput));

// This shallow merge changes the prototype of its returned target, not every object.
const changed = {};
merge(changed, JSON.parse('{"__proto__":{"isAdmin":true}}'));
changed.isAdmin  // true through the target prototype; ({ }).isAdmin remains undefined.

// Also via constructor.prototype
// {"constructor": {"prototype": {"isAdmin": true}}}
```

**Fix**:
```javascript
// Check for dangerous keys
const dangerous = ['__proto__', 'constructor', 'prototype'];
if (dangerous.includes(key)) continue;

// Or use Object.create(null) for dictionary objects
const dict = Object.create(null);  // No prototype chain

// Or use Map instead of objects
const map = new Map();
```

## Regular Expression DoS (ReDoS)

```javascript
// DANGEROUS: Catastrophic backtracking
const regex = /^(a+)+$/;
regex.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaa!");
// Exponential time - freezes the event loop

// Dangerous patterns:
// - Nested quantifiers: (a+)+, (a*)*
// - Overlapping alternatives: (a|a)+
// - Greedy quantifiers with overlap: .*.*

// Illustrative regex shapes, not an attributed CVE reproduction:
/\s*(;|\s)\s*/  // Fine
/^(a|aa)+$/    // Potential catastrophic backtracking on a sufficiently long nonmatching suffix
```

**Detection**: Look for nested quantifiers or overlapping alternatives in regex.

## parseInt Without Radix

```javascript
// DANGEROUS: Behavior varies
parseInt("08");      // 8 (modern JS), was 0 in ES3 (octal)
parseInt("0x10");    // 16 - hex prefix always recognized
parseInt("10", 0);   // 10: radix 0 requests standard prefix inference
parseInt("10", 1);   // NaN - radix 1 invalid

// DANGEROUS: Unexpected results
parseInt("123abc");  // 123 - stops at first non-digit
parseInt("abc123");  // NaN - starts with non-digit
```

**Fix**: Always specify radix: `parseInt("08", 10)`

## This Binding

```javascript
// DANGEROUS: 'this' depends on how function is called
const obj = {
    value: 42,
    getValue: function() { return this.value; }
};

obj.getValue();           // 42
const fn = obj.getValue;
fn();                     // Strict mode: accessing this.value throws because this is undefined; non-strict behavior differs.

// DANGEROUS: In callbacks
setTimeout(obj.getValue, 100);  // 'this' is global/undefined

// DANGEROUS: In event handlers
button.addEventListener('click', obj.getValue);  // 'this' is button
```

**Fix**: Use arrow functions or `.bind()`.

## Array Methods That Mutate

```javascript
// These MUTATE the original array:
arr.push(x);      // Adds to end
arr.pop();        // Removes from end
arr.shift();      // Removes from start
arr.unshift(x);   // Adds to start
arr.splice(i, n); // Removes/inserts
arr.sort();       // Sorts IN PLACE
arr.reverse();    // Reverses IN PLACE
arr.fill(x);      // Fills IN PLACE

// These return NEW arrays:
arr.slice();
arr.concat();
arr.map();
arr.filter();

// DANGEROUS: Sorting numbers
[1, 10, 2].sort();  // [1, 10, 2] - string comparison!
// Fix: [1, 10, 2].sort((a, b) => a - b);  // [1, 2, 10]
```

## Type Coercion in Operations

```javascript
// DANGEROUS: + is overloaded for concatenation
"5" + 3     // "53" (string)
5 + "3"     // "53" (string)
5 - "3"     // 2 (number)
"5" - 3     // 2 (number)

// DANGEROUS: Comparison with type coercion
"10" > "9"  // false (string comparison: "1" < "9")
"10" > 9    // true (numeric comparison)
```

## eval and Dynamic Code

```javascript
// DANGEROUS: eval executes arbitrary code
eval(userInput);

// DANGEROUS: Function constructor
new Function(userInput)();

// DANGEROUS: setTimeout/setInterval with string
setTimeout(userInput, 1000);  // Executes as code!

// DANGEROUS: Template injection
const template = userInput;  // "${process.exit()}"
eval(`\`${template}\``);
```

## Object Property Access

```javascript
// DANGEROUS: Bracket notation with user input
const obj = { admin: false };
const key = userInput;  // Could be "__proto__", "constructor", etc.
obj[key] = true;  // Attacker-controlled property write; assigning primitive true to __proto__ does not itself pollute a prototype.

// DANGEROUS: in operator checks prototype chain
"toString" in {}  // true - inherited from Object.prototype

// Fix: Use hasOwnProperty
({}).hasOwnProperty("toString")  // false
Object.hasOwn({}, "toString")    // false (ES2022)
```

## Async/Await Pitfalls

```javascript
// DANGEROUS: Unhandled promise rejection
async function riskyOperation() {
    throw new Error("oops");
}
riskyOperation();  // Unhandled rejection - may crash Node.js

// DANGEROUS: Missing await
async function process() {
    validateInput();  // Forgot await - validation not complete!
    doSensitiveOperation();
}

// DANGEROUS: Sequential when parallel is possible
async function slow() {
    const a = await fetchA();  // Waits
    const b = await fetchB();  // Then waits
    return a + b;
}

// Better: parallel
async function fast() {
    const [a, b] = await Promise.all([fetchA(), fetchB()]);
    return a + b;
}
```

## JSON Parse Issues

```javascript
// DANGEROUS: __proto__ in JSON
JSON.parse('{"__proto__": {"isAdmin": true}}');
// Creates object with __proto__ key, but doesn't pollute

// However, if merged into another object:
Object.assign({}, JSON.parse(userInput));
// Can pollute if userInput has __proto__

// DANGEROUS: Large numbers lose precision
JSON.parse('{"id": 9007199254740993}');
// id becomes 9007199254740992 (precision loss)
```

## TypeScript-Specific

```typescript
// DANGEROUS: Type assertions bypass checking
const user = userData as Admin;  // No runtime check!
user.adminMethod();  // Runtime error if not actually Admin

// DANGEROUS: any escapes type system
function process(data: any) {
    data.whatever();  // No type checking
}

// DANGEROUS: Non-null assertion
function greet(name: string | null) {
    console.log(name!.toUpperCase());  // Crash if null!
}

// DANGEROUS: Type guards can lie
function isAdmin(user: User): user is Admin {
    return true;  // Wrong! TypeScript trusts this
}
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `==` instead of `===` | Type coercion bugs |
| `obj[userInput]` | Prototype pollution |
| `/__proto__|constructor|prototype/` in merge | Pollution vectors |
| `(a+)+`, `(.*)+` in regex | ReDoS |
| `parseInt(x)` without radix | Parsing inconsistency |
| `eval(`, `Function(`, `setTimeout(string` | Code execution |
| `.sort()` on numbers without comparator | String sort |
| `as Type` assertions | Runtime type mismatch |
| `!` non-null assertion | Null pointer crash |
| Missing `await` before async call | Race condition |
