export type RegistrationField = "displayName" | "email" | "password";

export type RegistrationFieldErrors = Partial<
  Record<RegistrationField, readonly string[]>
>;

export type RegistrationActionState =
  | {
      status: "idle";
      fieldErrors: RegistrationFieldErrors;
    }
  | {
      status: "error";
      fieldErrors: RegistrationFieldErrors;
      message: string;
    }
  | {
      status: "success";
      fieldErrors: RegistrationFieldErrors;
      message: string;
    };

export type RegistrationAction = (
  previousState: RegistrationActionState,
  formData: FormData,
) => Promise<RegistrationActionState>;

export const initialRegistrationActionState: RegistrationActionState = {
  status: "idle",
  fieldErrors: {},
};
