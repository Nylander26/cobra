type Props = {
  className?: string;
  title?: string;
};

// Marca de Cobra: una "C" que se enrosca en espiral (la cobra enroscada
// guardando la moneda). Hereda color vía currentColor.
export function CobraMark({ className, title = "Cobra" }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <path
        d="M 41 24 A 17 17 0 0 0 7 24 A 14 14 0 0 0 35 24 A 11 11 0 0 0 13 24"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="23" cy="24" r="2.7" fill="currentColor" />
    </svg>
  );
}
