import Link from "next/link";

/**
 * Marca oficial de Better Work: el ícono BW (logo real) + wordmark.
 * Un único lugar para la identidad en toda la app.
 */
export function Brand({
  href,
  size = "md",
  showText = true,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const box = size === "lg" ? "w-10 h-10" : size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const text = size === "lg" ? "text-xl" : "text-lg";

  const inner = (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Better Work" className={`${box} rounded-[22%] object-cover shrink-0`} />
      {showText && <span className={`font-bold tracking-tight text-fg ${text}`}>Better Work</span>}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {inner}
      </Link>
    );
  }
  return inner;
}
