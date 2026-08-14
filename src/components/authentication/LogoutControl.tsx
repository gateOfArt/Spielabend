"use client";

import { useActionState } from "react";
import { logoutAction } from "@/app/logout/actions";
import { Button } from "@/components/ui/Button";
import {
  initialLogoutActionState,
  type LogoutAction,
} from "@/domain/authentication";
import styles from "./LogoutControl.module.css";

export type LogoutControlProps = {
  action?: LogoutAction;
};

export function LogoutControl({ action = logoutAction }: LogoutControlProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialLogoutActionState,
  );

  return (
    <form action={formAction} className={styles.form}>
      <Button type="submit" variant="outlined" disabled={isPending}>
        {isPending ? "Abmeldung läuft …" : "Abmelden"}
      </Button>
      {state.status === "error" ? (
        <p className={styles.feedback} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
