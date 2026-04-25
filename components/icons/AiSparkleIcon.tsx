import type { SVGProps } from "react";

interface Props extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * AI sparkle icon — a 4-point star flanked by two small "+" sparkles.
 * Sourced from the Figma design; uses currentColor so it can pick up
 * shimmer / muted text colors via CSS.
 */
export function AiSparkleIcon({ size = 13, className, ...rest }: Props) {
  const height = (size * 14) / 13;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 13 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...rest}
    >
      <path
        d="M10.999 1.591C11.1232 1.73875 11.2594 1.87506 11.4062 1.99921C11.2593 2.12382 11.1233 2.26021 11 2.40741C10.8759 2.25993 10.7395 2.12412 10.5928 2.00018C10.7399 1.87537 10.8755 1.73848 10.999 1.591Z"
        stroke="currentColor"
        strokeWidth={1.71429}
      />
      <path
        d="M5.56047 0.999939C5.3949 0.999939 5.22932 1.08971 5.14654 1.29918L4.95337 1.86775C4.23589 3.93253 2.74574 5.57837 0.814064 6.3564L0.289751 6.56587C-0.0965838 6.71549 -0.0965838 7.28405 0.289751 7.43367L0.814064 7.64314C2.71814 8.42117 4.23589 10.0371 4.95337 12.1318L5.14654 12.7004C5.22932 12.9098 5.3949 12.9996 5.56047 12.9996C5.72604 12.9996 5.89161 12.9098 5.9744 12.7004L6.16757 12.1318C6.88505 10.067 8.3752 8.42117 10.3069 7.64314L10.8312 7.43367C11.2175 7.28405 11.2175 6.71549 10.8312 6.56587L10.3069 6.3564C8.40279 5.57837 6.88505 3.96245 6.16757 1.86775L5.9744 1.29918C5.89161 1.08971 5.72604 0.999939 5.56047 0.999939Z"
        fill="currentColor"
      />
      <path
        d="M10.999 11.5909C11.1232 11.7386 11.2594 11.8749 11.4062 11.9991C11.2593 12.1237 11.1233 12.2601 11 12.4073C10.8759 12.2598 10.7395 12.124 10.5928 12.0001C10.7399 11.8752 10.8755 11.7384 10.999 11.5909Z"
        stroke="currentColor"
        strokeWidth={1.71429}
      />
    </svg>
  );
}
