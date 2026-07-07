import Link from "next/link";

export function Pill({
  active = false,
  children,
  onClick,
  href,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className = `rounded-full border px-4 py-2 font-mono text-[0.76rem] transition-all duration-200 ${
    active
      ? "border-forest bg-forest text-sage-white"
      : "border-line bg-card text-[#3E4B44] hover:border-forest hover:bg-forest hover:text-sage-white"
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-forest/[0.07] px-2.5 py-1 font-mono text-[0.72rem] text-forest">
      {children}
    </span>
  );
}
