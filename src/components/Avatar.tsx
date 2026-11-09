/** Valor estable por nombre: cada persona tiene siempre su mismo tono de gris. */
export function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function avatarInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  url,
  size = 40,
  className = "",
  ring = false,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
  /** Aro blanco (para avatares sobre fondos de color o superpuestos). */
  ring?: boolean;
}) {
  const ringCls = ring ? "ring-[3px] ring-surface" : "";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={`rounded-full object-cover shrink-0 ${ringCls} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const hue = avatarHue(name);
  return (
    <div
      className={`rounded-full text-white flex items-center justify-center font-bold shrink-0 select-none ${ringCls} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(0 0% ${38 + (hue % 18)}%), hsl(0 0% ${14 + (hue % 14)}%))`,
      }}
      aria-label={name}
    >
      {avatarInitials(name)}
    </div>
  );
}
