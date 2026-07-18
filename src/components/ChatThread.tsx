"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format";

type Msg = {
  id: string;
  senderId: string;
  type: string;
  content: string;
  meta: string;
  createdAt: string;
};

function Bubble({ m, mine }: { m: Msg; mine: boolean }) {
  const meta = (() => {
    try {
      return JSON.parse(m.meta);
    } catch {
      return {};
    }
  })();

  const base = `max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm animate-fade-up ${
    mine ? "bg-fg text-bg rounded-br-md" : "bg-surface-2 text-fg rounded-bl-md"
  }`;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={base}>
        {m.type === "IMAGE" && meta.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.url} alt="Imagen" className="rounded-lg max-h-56 mb-1" />
        )}
        {m.type === "FILE" && meta.url && (
          <a href={meta.url} target="_blank" rel="noreferrer" className="underline font-medium">
            📎 {meta.filename || "Archivo adjunto"}
          </a>
        )}
        {m.type === "LOCATION" && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${meta.lat}&mlon=${meta.lng}#map=17/${meta.lat}/${meta.lng}`}
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            📍 Ubicación compartida
          </a>
        )}
        {m.type === "BUDGET" && (
          <div className={`rounded-lg p-2.5 mb-1 ${mine ? "bg-bg/10" : "bg-surface border border-line"}`}>
            <p className="text-xs uppercase tracking-wide opacity-70">Presupuesto</p>
            <p className="text-lg font-bold">{formatMoney(meta.amount ?? 0)}</p>
            {meta.detail && <p className="text-xs opacity-80">{meta.detail}</p>}
          </div>
        )}
        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
        <p className={`text-[10px] mt-1 ${mine ? "text-bg/50" : "text-faint"}`}>
          {new Date(m.createdAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export function ChatThread({ conversationId, meId }: { conversationId: string; meId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${conversationId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    } catch {
      /* red intermitente: se reintenta en el próximo poll */
    }
  }, [conversationId]);

  useEffect(() => {
    // Suscripción a un sistema externo (la API): la primera carga es inmediata
    // y el resto por intervalo. El setState ocurre recién al resolver el fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (messages.length !== countRef.current) {
      countRef.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function send(payload: { type: string; content?: string; meta?: Record<string, unknown> }) {
    setSending(true);
    setMenu(false);
    try {
      await fetch(`/api/chat/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await load();
    } finally {
      setSending(false);
    }
  }

  function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    setText("");
    send({ type: "TEXT", content });
  }

  function sendImage() {
    const url = prompt("Pegá la URL de la imagen:");
    if (url) send({ type: "IMAGE", meta: { url } });
  }

  function sendFile() {
    const url = prompt("Pegá la URL del archivo:");
    if (!url) return;
    const filename = prompt("Nombre del archivo (opcional):") ?? "";
    send({ type: "FILE", meta: { url, filename } });
  }

  function sendLocation() {
    if (!navigator.geolocation) return alert("Tu navegador no permite geolocalización.");
    navigator.geolocation.getCurrentPosition(
      (pos) => send({ type: "LOCATION", meta: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => alert("No pudimos obtener tu ubicación.")
    );
  }

  function sendBudget() {
    const amount = parseFloat(prompt("Monto del presupuesto ($):") ?? "");
    if (!Number.isFinite(amount)) return;
    const detail = prompt("Detalle (opcional):") ?? "";
    send({ type: "BUDGET", meta: { amount, detail } });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {messages.length === 0 && (
          <p className="text-center text-sm text-faint mt-8">Todavía no hay mensajes. ¡Escribí el primero!</p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} m={m} mine={m.senderId === meId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {menu && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap animate-fade-up">
          <button onClick={sendImage} className="chip">🖼 Foto</button>
          <button onClick={sendLocation} className="chip">📍 Ubicación</button>
          <button onClick={sendFile} className="chip">📎 Archivo</button>
          <button onClick={sendBudget} className="chip">💰 Presupuesto</button>
        </div>
      )}

      <form onSubmit={sendText} className="flex items-center gap-2 border-t border-line bg-bg px-3 py-2.5">
        <button
          type="button"
          onClick={() => setMenu((v) => !v)}
          className="w-9 h-9 rounded-full bg-surface-2 text-lg leading-none hover:bg-line transition shrink-0"
          aria-label="Adjuntar"
        >
          +
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribí un mensaje…"
          className="input flex-1"
        />
        <button disabled={sending || !text.trim()} className="btn-primary shrink-0 !rounded-full !px-4">
          Enviar
        </button>
      </form>
    </div>
  );
}
