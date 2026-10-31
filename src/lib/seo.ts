import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * SEO local: páginas públicas por oficio (/servicios/plomeria) y por oficio +
 * ciudad (/servicios/plomeria/berisso).
 *
 * Las de ciudad existen sólo si hay profesionales reales ahí: nada de páginas
 * vacías generadas en masa, que Google trata como contenido de relleno. El
 * texto de cada oficio vive acá; una categoría nueva del admin sin texto
 * propio usa el genérico.
 */

/** "Lomas de Zamora" → "lomas-de-zamora". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Nombre público del profesional: "Pablo Pérez Gómez" → "Pablo P." (las páginas se indexan). */
export function publicName(name: string): string {
  const [first, surname] = name.trim().split(/\s+/);
  return surname ? `${first} ${surname[0].toUpperCase()}.` : first;
}

/** Serializa JSON-LD escapando `<` para que no pueda cerrar el <script>. */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export type Faq = { q: string; a: string };

export type TradeCopy = {
  singular: string; // "plomero"
  plural: string; //   "plomeros"
  intro: string;
  tasks: string[];
  faq: Faq[];
};

const COPY: Record<string, TradeCopy> = {
  albanileria: {
    singular: "albañil",
    plural: "albañiles",
    intro:
      "Desde un revoque hasta una ampliación: contá qué necesitás, sumá fotos y recibí el presupuesto de un albañil de tu zona antes de pagar nada.",
    tasks: [
      "Revoques, enduidos y reparación de paredes",
      "Contrapisos, carpetas y colocación de cerámicos",
      "Arreglo de humedad y filtraciones",
      "Construcción de paredes, tabiques y medianeras",
      "Ampliaciones y remodelaciones",
      "Reparación de veredas y patios",
    ],
    faq: [
      {
        q: "¿El albañil pone los materiales?",
        a: "Depende de cada profesional. En el presupuesto te aclara si los materiales están incluidos o si los comprás vos, así sabés el costo total antes de aceptar.",
      },
    ],
  },
  pintura: {
    singular: "pintor",
    plural: "pintores",
    intro:
      "Pintá tu casa, departamento o local con un pintor de tu zona. Mandá fotos de los ambientes y recibí un presupuesto claro antes de pagar.",
    tasks: [
      "Pintura de interiores y exteriores",
      "Preparación de paredes: enduido y lijado",
      "Pintura de rejas, puertas y aberturas",
      "Tratamiento de manchas de humedad",
      "Impermeabilización de techos y terrazas",
      "Pintura de locales y oficinas",
    ],
    faq: [
      {
        q: "¿Cómo se calcula el presupuesto de pintura?",
        a: "Cada pintor lo arma según los metros, el estado de las paredes y la pintura a usar. Si adjuntás fotos y medidas en el pedido, el presupuesto llega más preciso.",
      },
    ],
  },
  electricidad: {
    singular: "electricista",
    plural: "electricistas",
    intro:
      "Cortes, enchufes que no andan, tableros o una instalación nueva: encontrá un electricista cerca tuyo y acordá el presupuesto antes de que empiece.",
    tasks: [
      "Reparación de cortes y fallas eléctricas",
      "Instalación de enchufes, llaves y luminarias",
      "Cambio de tableros, disyuntores y térmicas",
      "Instalación de ventiladores de techo y aires acondicionados",
      "Cableado de instalaciones nuevas",
      "Puesta a tierra",
    ],
    faq: [
      {
        q: "Me quedé sin luz, ¿puedo pedir un electricista urgente?",
        a: "Sí. Al pedir marcá «Lo necesito YA»: tu pedido le aparece primero y destacado al profesional. El recargo por urgencia es para el profesional.",
      },
    ],
  },
  plomeria: {
    singular: "plomero",
    plural: "plomeros",
    intro:
      "Pérdidas, canillas, destapaciones o un baño nuevo: pedile presupuesto gratis a un plomero de tu zona y elegí con calificaciones reales.",
    tasks: [
      "Reparación de pérdidas de agua",
      "Destapación de cañerías, piletas e inodoros",
      "Cambio de canillas, griferías y flexibles",
      "Instalación y reparación de termotanques",
      "Instalación de sanitarios y baños completos",
      "Arreglo de mochilas y depósitos",
    ],
    faq: [
      {
        q: "Tengo una pérdida de agua, ¿me atienden en el día?",
        a: "Podés marcar tu pedido como urgente con «Lo necesito YA»: el plomero lo ve primero y destacado. El recargo por urgencia es para el profesional.",
      },
    ],
  },
  carpinteria: {
    singular: "carpintero",
    plural: "carpinteros",
    intro:
      "Muebles a medida, placares o arreglos de puertas: describí el trabajo, adjuntá medidas o un plano y recibí el presupuesto de un carpintero de tu zona.",
    tasks: [
      "Muebles a medida y placares",
      "Reparación y ajuste de puertas y ventanas",
      "Bajo mesadas y muebles de cocina",
      "Restauración de muebles",
      "Decks y pérgolas de madera",
      "Colocación de pisos flotantes y zócalos",
    ],
    faq: [
      {
        q: "¿Puedo mandar un diseño o un plano?",
        a: "Sí. En el pedido podés adjuntar fotos, planos y documentos en PDF: el carpintero los ve antes de pasarte el presupuesto.",
      },
    ],
  },
  tecnicos: {
    singular: "técnico",
    plural: "técnicos",
    intro:
      "Electrodomésticos, aires acondicionados o equipos que dejaron de andar: encontrá un técnico de tu zona y conocé el presupuesto antes de que empiece.",
    tasks: [
      "Reparación de lavarropas y heladeras",
      "Instalación y service de aire acondicionado",
      "Reparación de calefones, calefactores y termotanques",
      "Arreglo de electrodomésticos chicos",
      "Instalación de equipos y artefactos",
      "Mantenimiento preventivo",
    ],
    faq: [
      {
        q: "¿El técnico me cobra la visita para diagnosticar?",
        a: "Cada técnico define sus condiciones y te las aclara en el presupuesto, antes de que aceptes.",
      },
    ],
  },
  programacion: {
    singular: "programador",
    plural: "programadores",
    intro:
      "Una página web, una app o automatizar algo de tu negocio: describí el proyecto y compará presupuestos de programadores.",
    tasks: [
      "Páginas web y tiendas online",
      "Aplicaciones web y móviles",
      "Automatización de tareas y planillas",
      "Integraciones y APIs",
      "Mantenimiento y arreglo de sitios existentes",
      "Asesoramiento técnico",
    ],
    faq: [
      {
        q: "¿Cómo sé que el programador cumple?",
        a: "Antes de elegir ves sus calificaciones de clientes reales y sus trabajos realizados. Acordá por el chat entregas parciales y el momento del pago.",
      },
    ],
  },
  clases: {
    singular: "profesor particular",
    plural: "profesores particulares",
    intro:
      "Apoyo escolar, idiomas, música o preparación de exámenes: encontrá un profesor particular de tu zona, presencial o a distancia.",
    tasks: [
      "Apoyo escolar primario y secundario",
      "Matemática, física y química",
      "Inglés y otros idiomas",
      "Preparación de exámenes e ingresos",
      "Clases de música e instrumentos",
      "Clases para adultos",
    ],
    faq: [
      {
        q: "¿Las clases pueden ser a distancia?",
        a: "Sí, si el profesor trabaja a distancia: cada perfil indica si atiende presencial, remoto o ambos.",
      },
    ],
  },
  diseno: {
    singular: "diseñador",
    plural: "diseñadores",
    intro:
      "Logos, identidad de marca, piezas para redes o interiores: contá tu idea, sumá referencias y recibí el presupuesto de un diseñador.",
    tasks: [
      "Logos e identidad de marca",
      "Piezas para redes sociales",
      "Diseño de folletos, tarjetas y carteles",
      "Diseño de interiores",
      "Edición de fotos y video",
      "Diseño de presentaciones",
    ],
    faq: [
      {
        q: "¿Puedo mandar referencias de lo que busco?",
        a: "Sí. Adjuntá imágenes o documentos al pedido: el diseñador los ve antes de pasarte el presupuesto.",
      },
    ],
  },
  limpieza: {
    singular: "persona de limpieza",
    plural: "personal de limpieza",
    intro:
      "Limpieza de casas, departamentos, oficinas o final de obra: pedí presupuesto a profesionales de limpieza de tu zona.",
    tasks: [
      "Limpieza general de casas y departamentos",
      "Limpieza de oficinas y locales",
      "Limpieza de final de obra",
      "Limpieza profunda de cocinas y baños",
      "Limpieza de vidrios",
      "Limpieza por mudanza",
    ],
    faq: [
      {
        q: "¿Los productos de limpieza están incluidos?",
        a: "Lo define cada profesional y lo aclara en el presupuesto, así sabés qué incluye antes de aceptar.",
      },
    ],
  },
  jardineria: {
    singular: "jardinero",
    plural: "jardineros",
    intro:
      "Corte de pasto, poda o un jardín nuevo: encontrá un jardinero de tu zona y recibí el presupuesto antes de pagar.",
    tasks: [
      "Corte de pasto y bordeado",
      "Poda de árboles y cercos",
      "Diseño y armado de jardines",
      "Mantenimiento periódico",
      "Instalación de riego",
      "Limpieza de terrenos",
    ],
    faq: [
      {
        q: "¿Puedo contratar un mantenimiento cada semana?",
        a: "Sí: coordinalo con el profesional por el chat. Cada visita se pide como un trabajo y queda en tu historial.",
      },
    ],
  },
  mudanzas: {
    singular: "fletero",
    plural: "fletes y mudanzas",
    intro:
      "Mudanzas, fletes o traslado de muebles: contá qué hay que mover y desde dónde, y recibí el presupuesto de un fletero de tu zona.",
    tasks: [
      "Mudanzas de casas y departamentos",
      "Fletes y traslados de muebles",
      "Embalaje y desarme de muebles",
      "Retiro de electrodomésticos",
      "Mudanzas de oficinas",
      "Traslados en el día",
    ],
    faq: [
      {
        q: "¿Cómo saben cuánto lugar necesito?",
        a: "Adjuntá fotos de lo que hay que mover y detallalo en el pedido: con eso el profesional te pasa un presupuesto más preciso.",
      },
    ],
  },
};

/** Preguntas comunes a todos los oficios (describen cómo funciona Better Work). */
const SHARED_FAQ: Faq[] = [
  {
    q: "¿Cuánto cuesta?",
    a: "Lo define cada profesional. Pedir es gratis: te pasan un presupuesto y lo podés aceptar, pedir cambios o rechazar. Better Work no te cobra nada por contratar.",
  },
  {
    q: "¿Cómo le pago al profesional?",
    a: "Directo al profesional, en efectivo o por transferencia, como acuerden. El trabajo empieza y termina con códigos de 4 dígitos, así queda registrado que se hizo.",
  },
  {
    q: "¿Cómo sé que el profesional es confiable?",
    a: "Cada perfil muestra calificaciones de clientes reales, trabajos realizados y su rango. Las calificaciones son mutuas y sólo se dejan después de un trabajo terminado.",
  },
];

/** Texto del oficio, o uno genérico para categorías sin texto propio. */
export function tradeCopy(category: { slug: string; name: string }): TradeCopy {
  const own = COPY[category.slug];
  const base: TradeCopy = own ?? {
    singular: `profesional de ${category.name.toLowerCase()}`,
    plural: `profesionales de ${category.name.toLowerCase()}`,
    intro: `Encontrá profesionales de ${category.name.toLowerCase()} cerca tuyo. Contá qué necesitás y recibí un presupuesto antes de pagar.`,
    tasks: [],
    faq: [],
  };
  return { ...base, faq: [...base.faq, ...SHARED_FAQ] };
}

/** "plomeros" → "Plomeros". */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type PublicWorker = {
  id: string;
  name: string;
  avatarUrl: string | null;
  profession: string;
  city: string;
  zone: string;
  ratingAvg: number;
  ratingCount: number;
  jobsDone: number;
  verified: boolean;
  pro: boolean;
  priceHint: string | null;
};

export type CityGroup = { slug: string; name: string; count: number };

/**
 * Sólo aparecen profesionales que eligieron ser visibles, con el perfil
 * completo y la cuenta activa.
 */
const listedWorker = {
  visible: true,
  profession: { not: "Sin definir" },
  user: { suspended: false },
} satisfies Prisma.WorkerProfileWhereInput;

/** Categorías activas con cuántos profesionales visibles tiene cada una. */
export const getTradeIndex = cache(async () => {
  const categories = await db.category.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, icon: true },
  });
  const counts = await db.workerProfile.groupBy({
    by: ["categoryId"],
    where: listedWorker,
    _count: true,
  });
  const byCat = new Map(counts.map((c) => [c.categoryId, c._count]));
  return categories.map((c) => ({ ...c, workers: byCat.get(c.id) ?? 0 }));
});

/** Un oficio con sus profesionales listados y las ciudades donde hay alguno. */
export const getTrade = cache(async (slug: string) => {
  const category = await db.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, icon: true, active: true },
  });
  if (!category || !category.active) return null;

  const rows = await db.workerProfile.findMany({
    where: { ...listedWorker, categoryId: category.id },
    orderBy: [{ ratingAvg: "desc" }, { jobsDone: "desc" }],
    take: 200,
    select: {
      id: true,
      userId: true,
      profession: true,
      city: true,
      zone: true,
      ratingAvg: true,
      ratingCount: true,
      jobsDone: true,
      verified: true,
      priceHint: true,
      proUntil: true,
      user: { select: { name: true, avatarUrl: true } },
    },
  });

  const workers = rows.map(
    (w): PublicWorker & { citySlug: string } => ({
      id: w.userId,
      name: publicName(w.user.name),
      avatarUrl: w.user.avatarUrl,
      profession: w.profession,
      city: w.city.trim(),
      zone: w.zone.trim(),
      ratingAvg: w.ratingAvg,
      ratingCount: w.ratingCount,
      jobsDone: w.jobsDone,
      verified: w.verified,
      pro: !!w.proUntil && w.proUntil > new Date(),
      priceHint: w.priceHint,
      citySlug: slugify(w.city),
    })
  );
  // Los Pro primero (beneficio de la suscripción); dentro de cada grupo, por calificación.
  workers.sort((a, b) => Number(b.pro) - Number(a.pro));

  // Ciudades con al menos un profesional. El nombre visible es la primera
  // escritura encontrada (la ciudad es texto libre en el perfil).
  const cityMap = new Map<string, CityGroup>();
  for (const w of workers) {
    if (!w.citySlug) continue;
    const g = cityMap.get(w.citySlug);
    if (g) g.count++;
    else cityMap.set(w.citySlug, { slug: w.citySlug, name: w.city, count: 1 });
  }
  const cities = [...cityMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { category, workers, cities, copy: tradeCopy(category) };
});
