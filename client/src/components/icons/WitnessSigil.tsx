type WitnessSigilProps = {
  size?: number;
  className?: string;
  title?: string;
};

/**
 * The Living Nexus Witness Sigil.
 *
 * Two acknowledgement marks hold a witnessed record at the center. The host
 * surface owns color and interaction state; this mark intentionally carries no
 * relationship state of its own.
 */
export function WitnessSigil({ size = 16, className, title }: WitnessSigilProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      className={className}
    >
      {title && <title>{title}</title>}
      <path
        d="M4.25 5.25L8.75 12L4.25 18.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.75 5.25L15.25 12L19.75 18.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.75L15 12L12 16.25L9 12L12 7.75Z"
        fill="currentColor"
      />
      <path
        d="M12 3.25V5.1M12 18.9V20.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
