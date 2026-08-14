import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "outlined";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  outlined: styles.outlined,
};

export function Button({
  variant = "primary",
  type = "button",
  className,
  ...buttonProps
}: ButtonProps) {
  const buttonClassName = [
    styles.button,
    variantStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button {...buttonProps} type={type} className={buttonClassName} />;
}
