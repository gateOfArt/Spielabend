export type LoginActionState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "success" };

export type LoginAction = (
  previousState: LoginActionState,
  formData: FormData,
) => Promise<LoginActionState>;

export const initialLoginActionState: LoginActionState = {
  status: "idle",
};

export type LogoutActionState =
  | { readonly status: "idle" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "success" };

export type LogoutAction = (
  previousState: LogoutActionState,
  formData: FormData,
) => Promise<LogoutActionState>;

export const initialLogoutActionState: LogoutActionState = {
  status: "idle",
};
