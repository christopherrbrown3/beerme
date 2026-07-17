import { type ComponentProps, type ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
} & ComponentProps<'input'>;

export function FormField({ label, hint, error, id, ...inputProps }: FormFieldProps) {
  const inputId = id ?? inputProps.name;
  const descriptionId = `${inputId}-description`;

  return (
    <label className="form-field" htmlFor={inputId}>
      <span className="form-field__label">{label}</span>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? descriptionId : undefined}
      />
      {(error || hint) && (
        <span
          id={descriptionId}
          className={
            error ? 'form-field__message form-field__message--error' : 'form-field__message'
          }
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}
