import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "name"
>;

export type InputProps = NativeInputProps & {
  id: string;
  name: string;
  label: string;
  error?: string;
};

export function Input({
  id,
  name,
  label,
  error,
  className,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...inputProps
}: InputProps) {
  const hasError = Boolean(error);
  const errorId = `${id}-error`;
  const descriptionIds = [describedBy, hasError ? errorId : undefined]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const inputClassName = [styles.input, className].filter(Boolean).join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        name={name}
        className={inputClassName}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={hasError ? true : ariaInvalid}
      />
      {hasError ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
