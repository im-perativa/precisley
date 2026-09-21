interface Props {
  className?: string;
}

/** Wordmark: precisley — white body, accent teal "le". */
export function BrandMark({ className = "" }: Props) {
  return (
    <span className={`brand ${className}`.trim()} aria-label="precisley">
      precis<span className="brand-le">le</span>y
    </span>
  );
}
