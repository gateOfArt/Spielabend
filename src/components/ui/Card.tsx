import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

type CardElement = "article" | "section" | "div";

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  as?: CardElement;
  children: ReactNode;
};

export function Card({
  as: Element = "div",
  children,
  className,
  ...cardProps
}: CardProps) {
  const cardClassName = [styles.card, className].filter(Boolean).join(" ");

  return (
    <Element {...cardProps} className={cardClassName}>
      {children}
    </Element>
  );
}
