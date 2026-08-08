# Form Patterns

## Library: {{FORM_LIBRARY}}

{{FORM_LIBRARY_DESCRIPTION}}

## Form Structure

```tsx
{
  {
    FORM_EXAMPLE;
  }
}
```

## Rules

{{FORM_RULES}}

## Validation

{{VALIDATION_SECTION}}

## Errors

{{ERROR_SECTION}}

## Generation Rules

- **FORM_LIBRARY**: "react-hook-form", "formik", "TanStack Form", or "Manual (controlled inputs)".
- **FORM_LIBRARY_DESCRIPTION**: One sentence about how forms are handled in the project.
- **FORM_EXAMPLE**: Real example from the project. Read an existing form and adapt. Include: hook import, register/control, handleSubmit, errors, submit handler.
- **FORM_RULES**:
  - **react-hook-form**:
    - `useForm<T>()` with generic type for the form schema.
    - `register("fieldName")` for simple inputs, `control` + `Controller` for custom components.
    - `formState: { errors, isSubmitting }` for state.
    - If using Zod resolver: `zodResolver(schema)` in `useForm`.
    - Do not mix `useState` with react-hook-form — use `watch()` or `getValues()`.
  - **formik**:
    - `useFormik<T>()` or `<Formik>` component.
    - `validationSchema` for Yup/Zod.
    - `handleChange`, `handleBlur`, `handleSubmit`.
  - **Manual**:
    - `useState` per field.
    - Manual validation in `handleSubmit`.
    - No form library.
- **VALIDATION_SECTION**: If using Zod/Yup/Valibot validation:
  - Where schemas live (`lib/schemas/`, `src/validations/`).
  - How they integrate with the form.
  - Whether they are shared between client and server.
- **ERROR_SECTION**: How errors are displayed:
  - Inline below the field.
  - Toast / sonner for server errors.
  - Messages in the project's language based on i18n detection.
