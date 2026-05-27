import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LogInIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import * as z from "zod";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/auth-service";
import { setAuthToken } from "@/lib/auth/token-store";

const loginFormSchema = z.object({
  userCode: z.string().min(1, "login.validation.userCodeRequired"),
  password: z.string().min(1, "login.validation.passwordRequired"),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage() {
  const { t } = useTranslation(["auth", "common"]);
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      userCode: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const token = await login(values);
      setAuthToken(token);

      await navigate({
        to: search.redirect ?? "/dashboard",
        replace: true,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("login.feedback.failed", { ns: "auth" });

      toast.error(message);
    }
  }

  return (
    <main className="flex min-h-svh flex-col bg-muted/30">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>
      <section className="flex flex-1 items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-sm">
          <CardHeader className="gap-3">
            <p className="text-sm text-muted-foreground">
              {t("brand.standardScaffold", { ns: "common" })}
            </p>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("login.title", { ns: "auth" })}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("login.description", { ns: "auth" })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="userCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-user-code">
                        {t("login.userCode", { ns: "auth" })}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="login-user-code"
                        aria-invalid={fieldState.invalid}
                        autoComplete="username"
                        placeholder={t("login.userCodePlaceholder", { ns: "auth" })}
                      />
                      {fieldState.invalid ? (
                        <FieldError>
                          {t(fieldState.error?.message ?? "login.validation.userCodeRequired", {
                            ns: "auth",
                          })}
                        </FieldError>
                      ) : null}
                    </Field>
                  )}
                />
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="login-password">
                        {t("login.password", { ns: "auth" })}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="login-password"
                        aria-invalid={fieldState.invalid}
                        autoComplete="current-password"
                        placeholder={t("login.passwordPlaceholder", { ns: "auth" })}
                        type="password"
                      />
                      {fieldState.invalid ? (
                        <FieldError>
                          {t(fieldState.error?.message ?? "login.validation.passwordRequired", {
                            ns: "auth",
                          })}
                        </FieldError>
                      ) : null}
                    </Field>
                  )}
                />
              </FieldGroup>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <LogInIcon data-icon="inline-start" />
                {form.formState.isSubmitting
                  ? t("login.submitting", { ns: "auth" })
                  : t("login.submit", { ns: "auth" })}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
