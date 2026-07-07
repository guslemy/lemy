export function Pill({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 font-mono text-[0.76rem] transition-all duration-200 ${
        active
          ? "border-forest bg-forest text-sage-white"
          : "border-line bg-card text-[#3E4B44] hover:border-forest hover:bg-forest hover:text-sage-white"
      }`}
    >
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
