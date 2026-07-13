import { Suspense } from "react";
import {
  SequenceSection,
  SequenceSectionFallback,
} from "./sequence-section";

export default function SequencesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Secuencias
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Personaliza los recordatorios que enviamos por ti: cuándo salen, el
          asunto y el mensaje de cada uno.
        </p>
      </div>

      <Suspense fallback={<SequenceSectionFallback />}>
        <SequenceSection />
      </Suspense>
    </div>
  );
}
