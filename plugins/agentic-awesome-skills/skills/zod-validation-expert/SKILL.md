---
name: zod-validation-expert
description: "Expert in Zod — TypeScript-first schema validation. Covers parsing, custom errors, refinements, type inference, and integration with React Hook Form, Next.js, and tRPC."
risk: safe
source: community
date_added: "2026-03-05"
---

# Zod Validation Expert

You are a production-grade Zod expert. You help developers build type-safe schema definitions and validation logic. You master Zod fundamentals (primitives, objects, arrays, records), type inference (`z.infer`), complex validations (`.refine`, `.superRefine`), transformations (`.transform`), and integrations across the modern TypeScript ecosystem (React Hook Form, Next.js API Routes / App Router Actions, tRPC, and environment variables).

## When to Use This Skill

- Use when defining TypeScript validation schemas for API inputs or forms
- Use when setting up environment variable validation (`process.env`)
- Use when integrating Zod with React Hook Form (`@hookform/resolvers/zod`)
- Use when extracting or inferring TypeScript types from runtime validation schemas
- Use when writing complex validation rules (e.g., cross-field validation, async validation)
- Use when transforming input data (e.g., string to Date, string to number coercion)
- Use when standardizing error message formatting

## Core Concepts

### Why Zod?

Zod eliminates the duplication of writing a TypeScript interface *and* a runtime validation schema. You define the schema once, and Zod infers the static TypeScript type. Note that Zod is for **parsing, not just validation**. `safeParse` and `parse` return clean, typed data, stripping out unknown keys by default.

## Schema Definition & Inference

### Primitives & Coercion

```typescript
import { z } from "zod";

// Basic primitives
const stringSchema = z.string().min(3).max(255);
const numberSchema = z.number().int().positive();
const dateSchema = z.date();

// Coercion (automatically casting inputs before validation)
// Highly useful for FormData in Next.js Server Actions or URL queries
const ageSchema = z.coerce.number().min(18); // "18" -> 18
const activeSchema = z.coerce.boolean(); // "true" -> true
const dobSchema = z.coerce.date(); // "2020-01-01" -> Date object
```

### Objects & Type Inference

```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(20),
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER", "GUEST"]).default("USER"),
  age: z.number().min(18).optional(), // Can be omitted
  website: z.string().url().nullable(), // Can be null
  tags: z.array(z.string()).min(1), // Array with at least 1 item
});

// Infer the TypeScript type directly from the schema
// No need to write a separate `interface User { ... }`
export type User = z.infer<typeof UserSchema>;
```

### Advanced Types

```typescript
// Records (Objects with dynamic keys but specific value types)
const envSchema = z.record(z.string(), z.string()); // Record<string, string>

// Unions (OR)
const idSchema = z.union([z.string(), z.number()]); // string | number
// Or simpler:
const idSchema2 = z.string().or(z.number());

// Discriminated Unions (Type-safe switch cases)
const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), id: z.string() }),
  z.object({ type: z.literal("update"), id: z.string(), data: z.any() }),
  z.object({ type: z.literal("delete"), id: z.string() }),
]);
```

## Parsing & Validation

### parse vs safeParse

```typescript
const schema = z.string().email();

// ❌ parse: Throws a ZodError if validation fails
try {
  const email = schema.parse("invalid-email");
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error(err.issues);
  }
}

// ✅ safeParse: Returns a result object (No try/catch needed)
const result = schema.safeParse("user@example.com");

if (!result.success) {
  // TypeScript narrows result to SafeParseError
  console.log(result.error.format()); 
  // Early return or throw domain error
} else {
  // TypeScript narrows result to SafeParseSuccess
  const validEmail = result.data; // Type is `string`
}
```

## Customizing Validation

### Custom Error Messages

```typescript
const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .max(100, { message: "Password is too long" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
  .regex(/[0-9]/, { message: "Password must contain at least one number" });

// Global custom error map (useful for i18n)
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === "string") return { message: "This field must be text" };
  }
  return { message: ctx.defaultError };
});
```

### Refinements (Custom Logic)

```typescript
// Basic refinement
const passwordCheck = z.string().refine((val) => val !== "password123", {
  message: "Password is too weak",
});

// Cross-field validation (e.g., password matching)
const formSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Sets the error on the specific field
});
```

### Transformations

```typescript
// Change data during parsing
const stringToNumber = z.string()
  .transform((val) => parseInt(val, 10))
  .refine((val) => !isNaN(val), { message: "Not a valid integer" });

// Now the inferred type is `number`, not `string`!
type TransformedResult = z.infer<typeof stringToNumber>; // number
```

## Integration Patterns

### React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be 6+ characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginFormValues) => {
    // data is fully typed and validated
    console.log(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      {/* ... */}
    </form>
  );
}
```

### Next.js Server Actions

```typescript
"use server";
import { z } from "zod";

// Coercion is critical here because FormData values are always strings
const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().optional(),
  published: z.coerce.boolean().default(false), // checkbox -> "on" -> true
});

export async function createPost(prevState: any, formData: FormData) {
  // Convert FormData to standard object using Object.fromEntries
  const rawData = Object.fromEntries(formData.entries());
  
  const validatedFields = createPostSchema.safeParse(rawData);
  
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  // Proceed with validated database operation
  const { title, content, published } = validatedFields.data;
  // ...
  return { success: true };
}
```

### Environment Variables

```typescript
// Make environment variables strictly typed and fail-fast
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_KEY: z.string().min(10),
});

// Fails the build immediately if env vars are missing or invalid
const env = envSchema.parse(process.env);

export default env;
```

## Best Practices

- ✅ **Do:** Co-locate schemas alongside the components or API routes that use them to maintain separation of concerns.
- ✅ **Do:** Use `z.infer<typeof Schema>` everywhere instead of maintaining duplicate TypeScript interfaces manually.
- ✅ **Do:** Prefer `safeParse` over `parse` to avoid scattered `try/catch` blocks and leverage TypeScript's control flow narrowing for robust error handling.
- ✅ **Do:** Use `z.coerce` when accepting data from `URLSearchParams` or `FormData`, and be aware that `z.coerce.boolean()` converts standard `"false"`/`"off"` strings unexpectedly without custom preprocessing.
- ✅ **Do:** Use `.flatten()` or `.format()` on `ZodError` objects to easily extract serializable, human-readable errors for frontend consumption.
- ❌ **Don't:** Rely exclusively on `.partial()` for update schemas if field types or constraints differ between creation and update operations; define distinct schemas instead.
- ❌ **Don't:** Forget to pass the `path` option in `.refine()` or `.superRefine()` when performing object-level cross-field validations, otherwise the error won't attach to the correct input field.

## Troubleshooting

**Problem:** `Type instantiation is excessively deep and possibly infinite.`
**Solution:** This occurs with extreme schema recursion (e.g. deeply nested self-referential schemas). Use `z.lazy(() => NodeSchema)` for recursive structures and define the base TypeScript type explicitly instead of solely inferring it.

**Problem:** Empty strings pass validation when using `.optional()`.
**Solution:** `.optional()` permits `undefined`, not empty strings. If an empty string means "no value," use `.or(z.literal(""))` or preprocess it: `z.string().transform(v => v === "" ? undefined : v).optional()`.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
