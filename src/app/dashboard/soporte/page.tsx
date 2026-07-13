import { SupportForm } from "./support-form";

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Soporte
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          ¿Una idea para Cobra o algo que no funciona? Escríbenos y te
          respondemos a tu correo.
        </p>
      </div>

      <SupportForm />
    </div>
  );
}
