"use client";

import { useActionState, useState } from "react";
import { registerAccountAction } from "@/app/register/actions";
import {
  initialRegistrationActionState,
  type RegistrationAction,
} from "@/domain/registration";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import styles from "./RegisterForm.module.css";

export type RegisterFormProps = {
  action?: RegistrationAction;
};

export function RegisterForm({
  action = registerAccountAction,
}: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialRegistrationActionState,
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className={styles.form}>
      <Input
        id="displayName"
        name="displayName"
        label="Anzeigename"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        autoComplete="nickname"
        minLength={2}
        maxLength={40}
        error={state.fieldErrors.displayName?.[0]}
        disabled={isPending}
        required
      />

      <Input
        id="email"
        name="email"
        label="E-Mail-Adresse"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        maxLength={254}
        error={state.fieldErrors.email?.[0]}
        disabled={isPending}
        required
      />

      <div className={styles.passwordField}>
        <Input
          id="password"
          name="password"
          label="Passwort"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          aria-describedby="password-guidance"
          error={state.fieldErrors.password?.[0]}
          disabled={isPending}
          required
        />
        <p id="password-guidance" className={styles.guidance}>
          Mindestens 12 Zeichen.
        </p>
      </div>

      {state.status === "error" ? (
        <p className={styles.feedback} role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p className={styles.feedback} role="status">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Konto wird erstellt …" : "Konto erstellen"}
      </Button>
    </form>
  );
}
