"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteAccountAction } from "@/server/actions/profile";
import { cn } from "@/lib/utils";

export function DeleteAccountSection() {
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isMatch = confirmation === "ELIMINAR";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await deleteAccountAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Server action completed — sign out and redirect
      await signOut({ callbackUrl: "/" });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-destructive">Esta acción es irreversible</p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>· Tu cuenta quedará desactivada de inmediato.</li>
            <li>· Tus datos personales serán anonimizados.</li>
            <li>· No podrás recuperar el acceso con este email.</li>
            <li>· Podés crear una cuenta nueva con el mismo email después.</li>
          </ul>
        </div>
      </div>

      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="confirmation">
            Para confirmar, escribí{" "}
            <span className="font-mono font-semibold text-destructive">ELIMINAR</span>
          </label>
          <input
            autoComplete="off"
            className={cn(
              "h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
              error && "border-destructive",
            )}
            id="confirmation"
            name="confirmation"
            onChange={(e) => {
              setConfirmation(e.target.value);
              setError(null);
            }}
            placeholder="ELIMINAR"
            type="text"
            value={confirmation}
          />
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

        <SubmitButton
          className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white"
          fixedBottom={false}
          isPending={!isMatch || isPending}
        >
          Eliminar mi cuenta
        </SubmitButton>
      </form>
    </div>
  );
}
