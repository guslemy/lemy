import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "rose" | "outline-light";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-forest text-sage-white hover:bg-forest-deep hover:shadow-[0_8px_20px_-8px_rgba(30,58,46,0.5)]",
  ghost:
    "bg-transparent text-forest border border-forest hover:bg-forest hover:text-sage-white",
  rose: "bg-rose-deep text-white hover:bg-[#a86356]",
  "outline-light":
    "bg-transparent text-sage-white border border-white/50 hover:bg-white/10",
};

export function Button({
  href,
  variant = "primary",
  children,
  className = "",
  onClick,
  type = "button",
}: {
  href?: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
