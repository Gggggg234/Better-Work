"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search, Star, X, Maximize2, Minimize2, MapPin, ChevronRight, Sparkles, List } from "lucide-react";
import { MapView } from "@/components/map/MapView";
import type { MapMarker } from "@/components/map/Map";
import { Avatar } from "@/components/Avatar";

type Category = { slug: string; name: string; icon: string };
type Snap = "peek" | "half" | "full";

const BA_CENTER: [number, number] = [-34.6037, -58.3816];
/** Alto visible del panel plegado (por encima de la barra flotante). */
const PEEK = 200;
const TOP_GAP = 12;

/**
 * Inicio estilo app de movilidad: el mapa ocupa toda la pantalla y el
 * contenido vive en un panel que se desliza (plegado / mitad / completo).
 * En escritorio el panel queda fijo a la izquierda.
 *
 * - Los oficios filtran los pines en el lugar (sin salir del mapa).
 * - Tocar un pin muestra la tarjeta del profesional encima del panel.
 * - "Pantalla completa" pliega el panel para ver el mapa entero.
 */
export function HomeMap({
  markers,
  categories,
  header,
  children,
}: {
  markers: MapMarker[];
  categories: Category[];
  /** Encabezado del panel (se puede arrastrar). */
  header: ReactNode;
  children: ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // Sin animación hasta medir: si no, el panel "viaja" desde arriba al cargar.
  const [animate, setAnimate] = useState(false);
  const [snap, setSnap] = useState<Snap>("half");
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; from: number; t: number } | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapMarker | null>(null);

  // Alto disponible (cambia con la barra del navegador en el celular).
  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // El inicio no "scrollea": el mapa y el panel manejan sus propios gestos.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const snapY = useMemo(
    () => ({ full: TOP_GAP, half: Math.round(height * 0.46), peek: Math.max(TOP_GAP, height - PEEK) }),
    [height]
  );
  const y = drag ?? snapY[snap];

  const visible = useMemo(
    () => (category ? markers.filter((m) => m.kind === "company" || m.categorySlug === category) : markers),
    [markers, category]
  );
  const workersShown = visible.filter((m) => m.kind !== "company").length;
  const activeCat = categories.find((c) => c.slug === category);

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = { y: e.clientY, from: y, t: Date.now() };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const s = dragStart.current;
    if (!s) return;
    const next = Math.min(snapY.peek + 40, Math.max(TOP_GAP, s.from + (e.clientY - s.y)));
    setDrag(next);
  }
  function onPointerUp(e: React.PointerEvent) {
    const s = dragStart.current;
    dragStart.current = null;
    if (!s) return;
    const dy = e.clientY - s.y;
    const current = drag ?? s.from;
    setDrag(null);
    // Un toque (sin arrastre) alterna entre plegado y mitad.
    if (Math.abs(dy) < 6) {
      setSnap(snap === "peek" ? "half" : snap === "half" ? "full" : "half");
      return;
    }
    // Gesto rápido: sigue la dirección. Si no, al punto más cercano.
    const v = dy / Math.max(1, Date.now() - s.t);
    const order: Snap[] = ["full", "half", "peek"];
    if (Math.abs(v) > 0.5) {
      const i = order.indexOf(snap);
      setSnap(order[Math.min(2, Math.max(0, i + (v > 0 ? 1 : -1)))]);
      return;
    }
    const nearest = order.reduce((a, b) => (Math.abs(snapY[b] - current) < Math.abs(snapY[a] - current) ? b : a));
    setSnap(nearest);
  }

  function select(m: MapMarker | null) {
    setSelected(m);
    if (m) setSnap("peek");
  }

  const fullMap = snap === "peek";

  return (
    <div
      ref={shellRef}
      className="fixed inset-x-0 bottom-0 top-[calc(60px+env(safe-area-inset-top))] z-[1] overflow-hidden"
    >
      {/* ── Mapa a pantalla completa ── */}
      <div className="absolute inset-0 lg:left-[440px]">
        <MapView
          center={BA_CENTER}
          zoom={12}
          markers={visible}
          locate
          onSelect={select}
          selectedId={selected?.id}
          controlsClassName="top-[118px] right-3"
        />
      </div>

      {/* ── Buscador + oficios flotando sobre el mapa ── */}
      <div className="absolute top-3 inset-x-3 lg:left-[456px] z-[700] pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <form
            action="/search"
            className="flex-1 flex items-center gap-2.5 glass rounded-2xl shadow-float border border-line/70 pl-4 pr-1.5"
          >
            <Search className="w-[18px] h-[18px] text-accent shrink-0" aria-hidden />
            <input
              name="q"
              placeholder="¿Qué necesitás? Plomero, electricista…"
              aria-label="Buscar profesionales"
              className="w-full py-3.5 text-sm font-medium bg-transparent text-fg outline-none placeholder:text-faint"
            />
            {category && <input type="hidden" name="category" value={category} />}
            <button type="submit" className="btn-primary !px-3.5 !py-2 !rounded-xl !text-xs shrink-0">
              Buscar
            </button>
          </form>
          <button
            type="button"
            onClick={() => setSnap(fullMap ? "half" : "peek")}
            aria-label={fullMap ? "Mostrar el panel" : "Ver el mapa completo"}
            title={fullMap ? "Mostrar el panel" : "Ver el mapa completo"}
            className="lg:hidden w-[50px] h-[50px] shrink-0 rounded-2xl glass border border-line/70 shadow-float flex items-center justify-center text-fg hover:text-accent transition"
          >
            {fullMap ? <Minimize2 className="w-5 h-5" aria-hidden /> : <Maximize2 className="w-5 h-5" aria-hidden />}
          </button>
        </div>

        <div className="pointer-events-auto flex gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-1 -mx-3 px-3">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`chip shadow-soft !py-1.5 ${category === null ? "chip-active" : "glass"}`}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                setCategory(category === c.slug ? null : c.slug);
                setSelected(null);
              }}
              className={`chip shadow-soft !py-1.5 ${category === c.slug ? "chip-active" : "glass"}`}
            >
              <span aria-hidden><span className="grayscale">{c.icon}</span></span> {c.name}
            </button>
          ))}
        </div>

        <p className="pointer-events-auto inline-flex items-center gap-1.5 mt-1 rounded-full glass border border-line/70 shadow-soft px-3 py-1 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden />
          {workersShown} {workersShown === 1 ? "profesional" : "profesionales"}
          {activeCat ? ` de ${activeCat.name.toLowerCase()}` : ""} en el mapa
        </p>
      </div>

      {/* ── Vista previa del pin tocado ── */}
      {selected && (
        <div
          className="absolute inset-x-3 z-[900] lg:left-auto lg:right-6 lg:w-[380px] lg:!bottom-6 animate-pop-in"
          style={{ bottom: PEEK + 12 }}
        >
          <PinPreview m={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      {/* ── Panel deslizable (en escritorio: columna fija a la izquierda) ── */}
      <section
        aria-label="Panel de inicio"
        className="absolute inset-x-0 top-0 h-full z-[800] lg:inset-y-4 lg:left-4 lg:right-auto lg:w-[420px] lg:h-auto lg:!transform-none"
        style={{
          // Antes de medir, la mitad en porcentaje (el panel mide lo mismo que el contenedor).
          transform: height ? `translateY(${y}px)` : "translateY(46%)",
          transition: drag === null && animate ? "transform 0.38s cubic-bezier(0.2, 0.9, 0.25, 1)" : "none",
        }}
      >
        <div className="h-full flex flex-col bg-bg rounded-t-[28px] lg:rounded-[28px] shadow-[0_-12px_40px_-12px_rgba(15,17,40,0.35)] border border-line/60 overflow-hidden">
          {/* Zona de arrastre */}
          <div
            className="shrink-0 touch-none cursor-grab active:cursor-grabbing select-none px-5 pt-2.5 pb-3 lg:cursor-default"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="mx-auto h-1.5 w-11 rounded-full bg-line lg:hidden" aria-hidden />
            <div className="mt-3">{header}</div>
          </div>
          {/* El relleno inferior deja ver el final de la lista por encima de la barra flotante. */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 lg:px-5 pb-[var(--sheet-pb)] lg:pb-8"
            style={{ "--sheet-pb": `${Math.max(120, y + 110)}px` } as React.CSSProperties}
          >
            {children}
          </div>
        </div>
      </section>

      {/* Atajo para volver a la lista cuando el mapa está completo */}
      {fullMap && !selected && (
        <button
          type="button"
          onClick={() => setSnap("half")}
          className="lg:hidden absolute left-1/2 -translate-x-1/2 z-[850] btn-dark !rounded-full !py-2.5 shadow-float animate-pop-in"
          style={{ bottom: PEEK + 14 }}
        >
          <List className="w-4 h-4" aria-hidden /> Ver lista
        </button>
      )}
    </div>
  );
}

export function PinPreview({ m, onClose }: { m: MapMarker; onClose: () => void }) {
  const company = m.kind === "company";
  return (
    <div className="card !rounded-3xl p-4 shadow-float">
      <div className="flex items-start gap-3.5">
        {company ? (
          <span className="w-14 h-14 rounded-2xl bg-fg text-bg flex items-center justify-center text-2xl shrink-0"><span className="grayscale">🏢</span></span>
        ) : (
          <Avatar name={m.label} url={m.avatarUrl} size={56} className="!rounded-2xl" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-extrabold truncate">{m.label}</p>
            {m.pro && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-px text-[10px] font-extrabold text-brand-fg">
                <Sparkles className="w-2.5 h-2.5" aria-hidden /> PRO
              </span>
            )}
            {m.kind === "sponsored" && <span className="badge bg-gold/12 text-gold !py-px">Destacado</span>}
          </div>
          {m.sublabel && <p className="text-sm text-muted truncate">{m.sublabel}</p>}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
            {!company &&
              (m.ratingCount ? (
                <span className="inline-flex items-center gap-0.5 font-bold text-fg">
                  <Star className="w-3.5 h-3.5 fill-gold text-gold" aria-hidden />
                  {m.rating?.toFixed(1)} <span className="font-medium text-muted">({m.ratingCount})</span>
                </span>
              ) : (
                <span className="badge badge-accent !py-px">Nuevo</span>
              ))}
            {m.zone && (
              <span className="inline-flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3" aria-hidden /> {m.zone}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-faint hover:bg-surface-2 hover:text-fg shrink-0"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <div className={`grid gap-2 mt-3.5 ${m.href && m.actionHref ? "grid-cols-2" : "grid-cols-1"}`}>
        {m.href && (
          <Link href={m.href} className="btn-secondary !py-2.5">
            {company ? "Ver empresa" : "Ver perfil"}
          </Link>
        )}
        {m.actionHref && (
          <Link href={m.actionHref} className="btn-primary !py-2.5">
            {company ? "Ver empleos" : "Contratar"} <ChevronRight className="w-4 h-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
