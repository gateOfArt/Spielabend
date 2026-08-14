"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  initialLoginActionState,
  type LoginAction,
} from "@/domain/authentication";
import styles from "./LoginForm.module.css";

export type LoginFormProps = {
  action?: LoginAction;
};

export function LoginForm({ action = loginAction }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialLoginActionState,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className={styles.form}>
      <Input
        id="email"
        name="email"
        label="E-Mail-Adresse"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        maxLength={254}
        disabled={isPending}
        required
      />

      <Input
        id="password"
        name="password"
        label="Passwort"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        maxLength={128}
        disabled={isPending}
        required
      />

      {state.status === "error" ? (
        <p className={styles.feedback} role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Anmeldung läuft …" : "Anmelden"}
      </Button>
    </form>
  );
}
