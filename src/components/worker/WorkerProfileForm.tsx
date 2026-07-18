"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { OptionPills } from "@/components/ui/OptionPills";
import { searchProfessions, specialtiesFor, findProfession } from "@/lib/professions";
import {
  EXPERIENCE_BANDS,
  RADIUS_OPTIONS,
  WORK_MODES,
  DAYS,
  PAY_METHOD_OPTIONS,
  HOURS,
} from "@/lib/worker";

export type WorkerFormInitial = {
  profession: string;
  categoryId: string | null;
  services: string[];
  experience: number;
  bio: string;
  city: string;
  zone: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  schedule: string;
  availableDays: string[];
  workMode: string;
  whatsapp: string;
  phone: string;
  payMethods: string[];
  priceHint: string;
  gallery: string[];
  avatarUrl: string;
  name: string;
  visible: boolean;
};

type Category = { id: string; name: string; slug: string; icon: string };

const DRAFT_KEY = "bw-worker-profile-draft";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-sm">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-primary w-full !py-3.5">
      {pending ? "Guardando…" : "Guardar perfil"}
    </button>
  );
}

export function WorkerProfileForm({
  initial,
  categories,
  action,
}: {
  initial: WorkerFormInitial;
  categories: Category[];
  action: (fd: FormData) => void | Promise<void>;
}) {
  const [profession, setProfession] = useState(initial.profession);
  const [query, setQuery] = useState(initial.profession);
  const [openSug, setOpenSug] = useState(false);
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [services, setServices] = useState<string[]>(initial.services);
  const [customSpec, setCustomSpec] = useState("");
  const [experience, setExperience] = useState<number>(initial.experience);
  const [radiusKm, setRadiusKm] = useState<number>(initial.radiusKm);
  const [days, setDays] = useState<string[]>(initial.availableDays);
  const [workMode, setWorkMode] = useState<string>(initial.workMode || "AMBOS");
  const [payMethods, setPayMethods] = useState<string[]>(initial.payMethods);
  const [lat, setLat] = useState<string>(initial.lat != null ? String(initial.lat) : "");
  const [lng, setLng] = useState<string>(initial.lng != null ? String(initial.lng) : "");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [visible, setVisible] = useState(initial.visible);
  const [keptGallery, setKeptGallery] = useState<string[]>(initial.gallery);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState(0);
  // Campos de texto libre: controlados para poder preservarlos entre pantallas.
  const [bio, setBio] = useState(initial.bio);
  const [city, setCity] = useState(initial.city);
  const [zone, setZone] = useState(initial.zone);
  const [phone, setPhone] = useState(initial.phone);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [priceHint, setPriceHint] = useState(initial.priceHint);

  const [from, to] = useMemo(() => {
    const m = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/.exec(initial.schedule);
    return m ? [m[1], m[2]] : ["08:00", "18:00"];
  }, [initial.schedule]);
  const [timeFrom, setTimeFrom] = useState(from);
  const [timeTo, setTimeTo] = useState(to);

  // Borrador en sessionStorage: mantiene el progreso al navegar a "Cuenta de
  // cobro" y volver (o al usar atrás del navegador). Se limpia al guardar.
  const [ready, setReady] = useState(false);
  // Restaura el borrador guardado. No puede ser un inicializador lazy de
  // useState: sessionStorage no existe en el render del servidor y rompería la
  // hidratación. Por eso se lee al montar y `ready` evita persistir hasta ahí.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (typeof d.profession === "string") { setProfession(d.profession); setQuery(d.profession); }
        if (typeof d.categoryId === "string") setCategoryId(d.categoryId);
        if (Array.isArray(d.services)) setServices(d.services);
        if (typeof d.experience === "number") setExperience(d.experience);
        if (typeof d.radiusKm === "number") setRadiusKm(d.radiusKm);
        if (Array.isArray(d.days)) setDays(d.days);
        if (typeof d.workMode === "string") setWorkMode(d.workMode);
        if (Array.isArray(d.payMethods)) setPayMethods(d.payMethods);
        if (typeof d.lat === "string") setLat(d.lat);
        if (typeof d.lng === "string") setLng(d.lng);
        if (typeof d.visible === "boolean") setVisible(d.visible);
        if (Array.isArray(d.keptGallery)) setKeptGallery(d.keptGallery);
        if (typeof d.timeFrom === "string") setTimeFrom(d.timeFrom);
        if (typeof d.timeTo === "string") setTimeTo(d.timeTo);
        if (typeof d.bio === "string") setBio(d.bio);
        if (typeof d.city === "string") setCity(d.city);
        if (typeof d.zone === "string") setZone(d.zone);
        if (typeof d.phone === "string") setPhone(d.phone);
        if (typeof d.whatsapp === "string") setWhatsapp(d.whatsapp);
        if (typeof d.priceHint === "string") setPriceHint(d.priceHint);
      }
    } catch {
      /* borrador inválido: se ignora */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return; // no persistir hasta haber restaurado el borrador
    const draft = {
      profession, categoryId, services, experience, radiusKm, days, workMode,
      payMethods, lat, lng, visible, keptGallery, timeFrom, timeTo,
      bio, city, zone, phone, whatsapp, priceHint,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [ready, profession, categoryId, services, experience, radiusKm, days, workMode, payMethods, lat, lng, visible, keptGallery, timeFrom, timeTo, bio, city, zone, phone, whatsapp, priceHint]);

  // Envía el formulario y, si el guardado fue exitoso, limpia el borrador.
  async function handleAction(fd: FormData) {
    await action(fd);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* nada */
    }
  }

  const suggestions = useMemo(() => (openSug ? searchProfessions(query, 8) : []), [query, openSug]);
  const specSuggestions = useMemo(() => specialtiesFor(profession), [profession]);
  const catBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c.id])), [categories]);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pickProfession(name: string) {
    setProfession(name);
    setQuery(name);
    setOpenSug(false);
    const prof = findProfession(name);
    if (prof?.categorySlug && catBySlug.has(prof.categorySlug)) {
      setCategoryId(catBySlug.get(prof.categorySlug)!);
    }
  }

  function toggleService(s: string) {
    setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }
  function addCustomSpec() {
    const v = customSpec.trim();
    if (v && !services.includes(v)) setServices((cur) => [...cur, v]);
    setCustomSpec("");
  }

  function locate() {
    if (!navigator.geolocation) return setGeoMsg("Tu navegador no permite geolocalización.");
    setGeoMsg("Obteniendo ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoMsg("Ubicación cargada ✓");
      },
      () => setGeoMsg("No pudimos obtener tu ubicación. Reintentá o cargala manualmente."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <form action={handleAction} className="space-y-8 mt-6">
      {/* Hidden inputs que viajan al server action */}
      <input type="hidden" name="profession" value={profession} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="services" value={services.join(",")} />
      <input type="hidden" name="experience" value={experience} />
      <input type="hidden" name="radiusKm" value={radiusKm} />
      <input type="hidden" name="availableDays" value={JSON.stringify(days)} />
      <input type="hidden" name="workMode" value={workMode} />
      <input type="hidden" name="payMethods" value={payMethods.join(",")} />
      <input type="hidden" name="schedule" value={`${timeFrom}-${timeTo}`} />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="visible" value={visible ? "on" : ""} />
      <input type="hidden" name="galleryKeep" value={JSON.stringify(keptGallery)} />

      {/* Profesión con autocompletado */}
      <Section title="Profesión u oficio" hint="Escribí y elegí de la lista.">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setProfession(e.target.value);
              setOpenSug(true);
            }}
            onFocus={() => setOpenSug(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpenSug(false), 150);
            }}
            placeholder="Ej: Electricista, Plomero, Profesor…"
            className="input"
            autoComplete="off"
          />
          {openSug && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-line bg-surface shadow-lg">
              {suggestions.map((s) => (
                <li key={s.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickProfession(s.name)}
                    className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-surface-2 transition"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {categories.length > 0 && (
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
            <option value="">Categoría (automática)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        )}
      </Section>

      {/* Especialidades */}
      <Section title="Especialidades" hint="Tocá las que ofrecés.">
        <div className="flex flex-wrap gap-2">
          {specSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleService(s)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                services.includes(s) ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
              }`}
            >
              {s}
            </button>
          ))}
          {/* Especialidades personalizadas agregadas por el usuario */}
          {services
            .filter((s) => !specSuggestions.includes(s))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className="rounded-full border border-fg bg-fg text-bg px-3.5 py-1.5 text-sm font-medium"
              >
                {s} ✕
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customSpec}
            onChange={(e) => setCustomSpec(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomSpec();
              }
            }}
            placeholder="Agregar otra especialidad…"
            className="input"
          />
          <button type="button" onClick={addCustomSpec} className="btn-secondary shrink-0">
            Agregar
          </button>
        </div>
      </Section>

      {/* Experiencia */}
      <Section title="Experiencia">
        <OptionPills
          options={EXPERIENCE_BANDS}
          value={experience}
          onChange={(v) => setExperience(v as number)}
          columns={2}
        />
      </Section>

      {/* Zona de trabajo */}
      <Section title="Zona de trabajo" hint="Usamos tu ubicación mientras usás la app; vos elegís el radio.">
        <button type="button" onClick={locate} className="btn-secondary w-full">
          📍 Usar mi ubicación
        </button>
        {geoMsg && <p className="text-xs text-muted">{geoMsg}</p>}
        <OptionPills
          options={RADIUS_OPTIONS}
          value={radiusKm}
          onChange={(v) => setRadiusKm(v as number)}
          columns={3}
        />
      </Section>

      {/* Método de trabajo */}
      <Section title="Modalidad">
        <OptionPills options={WORK_MODES} value={workMode} onChange={(v) => setWorkMode(v as string)} columns={3} />
      </Section>

      {/* Disponibilidad */}
      <Section title="Días disponibles">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))}
              className={`w-12 h-11 rounded-xl border text-sm font-medium transition ${
                days.includes(d) ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </Section>

      {/* Horario */}
      <Section title="Horario">
        <div className="flex items-center gap-2">
          <select value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="input">
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-muted text-sm">a</span>
          <select value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="input">
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* Cobro */}
      <Section title="Cómo cobrás" hint="Los clientes pagan a través de Better Work y vos recibís el neto en tu cuenta.">
        <div className="flex flex-wrap gap-2">
          {PAY_METHOD_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPayMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                payMethods.includes(m) ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:border-fg/40"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-xs text-faint -mt-1">Tu progreso se guarda: podés ir y volver sin perder los datos cargados.</p>
        <div>
          <label className="label">Precios orientativos (opcional)</label>
          <input name="priceHint" value={priceHint} onChange={(e) => setPriceHint(e.target.value)} className="input" placeholder="Desde $8.000 por visita" />
        </div>
      </Section>

      {/* Contacto y presentación */}
      <Section title="Contacto y presentación">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Teléfono</label>
            <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+54 11 …" />
          </div>
          <div>
            <label className="label">WhatsApp (opcional)</label>
            <input name="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input" placeholder="+54 9 11 …" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ciudad</label>
            <input name="city" value={city} onChange={(e) => setCity(e.target.value)} className="input" placeholder="Buenos Aires" />
          </div>
          <div>
            <label className="label">Barrio / Zona</label>
            <input name="zone" value={zone} onChange={(e) => setZone(e.target.value)} className="input" placeholder="Palermo" />
          </div>
        </div>
        <div>
          <label className="label">Descripción (opcional)</label>
          <textarea name="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="input min-h-24" placeholder="Contá cómo trabajás en pocas líneas…" />
        </div>
      </Section>

      {/* Fotos */}
      <Section title="Fotos" hint="Elegí las imágenes desde tu dispositivo.">
        <div className="flex items-center gap-4">
          {avatarPreview || initial.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview ?? initial.avatarUrl}
              alt="Foto de perfil"
              className="w-16 h-16 rounded-full object-cover border border-line shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-fg text-bg flex items-center justify-center font-semibold shrink-0">
              {initial.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <label className="label">Foto de perfil</label>
            <input
              type="file"
              name="avatarFile"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setAvatarPreview(f ? URL.createObjectURL(f) : null);
              }}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-fg file:text-bg file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="label">Galería de trabajos realizados</label>
          {keptGallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {keptGallery.map((url) => (
                <div key={url} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Trabajo" className="aspect-square object-cover rounded-xl border border-line w-full" />
                  <button
                    type="button"
                    onClick={() => setKeptGallery((cur) => cur.filter((u) => u !== url))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-fg text-bg text-xs leading-none opacity-90 hover:opacity-100"
                    aria-label="Quitar foto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            name="galleryFiles"
            accept="image/*"
            multiple
            onChange={(e) => setNewPhotos(e.target.files?.length ?? 0)}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-fg file:text-bg file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer"
          />
          <p className="text-xs text-faint mt-1.5">
            {newPhotos > 0
              ? `${newPhotos} ${newPhotos === 1 ? "foto nueva seleccionada" : "fotos nuevas seleccionadas"} — se suben al guardar.`
              : "Podés seleccionar varias a la vez (hasta 12 en total)."}
          </p>
        </div>
      </Section>

      <label className="flex items-center justify-between gap-2 card p-4 cursor-pointer">
        <span className="text-sm font-medium">Mostrar mi perfil en el mapa y las búsquedas</span>
        <span
          onClick={() => setVisible((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${visible ? "bg-fg" : "bg-line"}`}
          role="switch"
          aria-checked={visible}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-all ${visible ? "left-[22px]" : "left-0.5"}`} />
        </span>
      </label>

      <SubmitButton />
    </form>
  );
}
