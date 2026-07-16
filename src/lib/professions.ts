/**
 * Base de profesiones y oficios con sus especialidades. Alimenta el
 * autocompletado del registro del trabajador y los chips de especialidades.
 * Cada entrada opcionalmente mapea a una categoría del sistema (por slug)
 * para clasificar al trabajador automáticamente.
 */
export type Profession = {
  name: string;
  categorySlug?: string;
  specialties: string[];
};

export const PROFESSIONS: Profession[] = [
  { name: "Albañil", categorySlug: "albanileria", specialties: ["Revoques", "Cerámicos", "Durlock", "Contrapisos", "Mampostería", "Pequeñas obras", "Refacciones"] },
  { name: "Maestro mayor de obra", categorySlug: "albanileria", specialties: ["Dirección de obra", "Ampliaciones", "Obra nueva", "Refacciones", "Planos"] },
  { name: "Yesero", categorySlug: "albanileria", specialties: ["Cielorrasos", "Molduras", "Enlucido", "Durlock"] },
  { name: "Pintor", categorySlug: "pintura", specialties: ["Interiores", "Exteriores", "Impermeabilización", "Empapelado", "Látex", "Esmalte", "Frentes"] },
  { name: "Electricista", categorySlug: "electricidad", specialties: ["Instalaciones", "Reparaciones", "Tableros", "Cableado", "Iluminación", "Urgencias 24 hs"] },
  { name: "Electricista industrial", categorySlug: "electricidad", specialties: ["Tableros", "Motores", "Automatización", "Mantenimiento", "Media tensión"] },
  { name: "Electricista domiciliario", categorySlug: "electricidad", specialties: ["Instalaciones", "Tomas", "Iluminación", "Térmicas", "Disyuntores"] },
  { name: "Plomero", categorySlug: "plomeria", specialties: ["Destapaciones", "Termotanques", "Pérdidas", "Griferías", "Cloacas", "Tanques de agua", "Urgencias 24 hs"] },
  { name: "Gasista matriculado", categorySlug: "plomeria", specialties: ["Instalaciones de gas", "Calefones", "Estufas", "Certificaciones", "Detección de fugas"] },
  { name: "Carpintero", categorySlug: "carpinteria", specialties: ["Muebles a medida", "Restauración", "Aberturas", "Placards", "Cocinas", "Decks"] },
  { name: "Carpintero de obra", categorySlug: "carpinteria", specialties: ["Encofrados", "Techos", "Estructuras", "Entrepisos"] },
  { name: "Herrero", categorySlug: "carpinteria", specialties: ["Rejas", "Portones", "Estructuras", "Soldadura", "Barandas", "Escaleras"] },
  { name: "Técnico en refrigeración", categorySlug: "tecnicos", specialties: ["Aires acondicionados", "Split", "Heladeras", "Cámaras", "Service", "Instalación"] },
  { name: "Técnico en electrodomésticos", categorySlug: "tecnicos", specialties: ["Lavarropas", "Heladeras", "Microondas", "Hornos", "Service"] },
  { name: "Técnico en computación", categorySlug: "tecnicos", specialties: ["Reparación de PC", "Notebooks", "Redes", "Formateo", "Recuperación de datos"] },
  { name: "Técnico en celulares", categorySlug: "tecnicos", specialties: ["Cambio de pantalla", "Baterías", "Software", "Microsoldadura"] },
  { name: "Cerrajero", categorySlug: "tecnicos", specialties: ["Aperturas", "Cambio de cerraduras", "Llaves", "Urgencias 24 hs", "Seguridad"] },
  { name: "Programador", categorySlug: "programacion", specialties: ["Sitios web", "E-commerce", "Apps móviles", "Backend", "Automatizaciones", "Bases de datos"] },
  { name: "Desarrollador web", categorySlug: "programacion", specialties: ["Landing pages", "Tiendas online", "Sistemas a medida", "WordPress", "React"] },
  { name: "Diseñador gráfico", categorySlug: "diseno", specialties: ["Branding", "Redes sociales", "Packaging", "Logotipos", "Editorial", "Flyers"] },
  { name: "Diseñador UX/UI", categorySlug: "diseno", specialties: ["Apps", "Sitios web", "Prototipos", "Investigación", "Design systems"] },
  { name: "Community manager", categorySlug: "diseno", specialties: ["Redes sociales", "Contenido", "Campañas", "Publicidad", "Estrategia"] },
  { name: "Profesor particular", categorySlug: "clases", specialties: ["Matemática", "Física", "Química", "Lengua", "Historia", "Primaria", "Secundaria"] },
  { name: "Profesor de inglés", categorySlug: "clases", specialties: ["Conversación", "Exámenes internacionales", "Business", "Niños", "Adultos"] },
  { name: "Profesor de música", categorySlug: "clases", specialties: ["Guitarra", "Piano", "Canto", "Batería", "Teoría musical"] },
  { name: "Personal trainer", categorySlug: "clases", specialties: ["Funcional", "Musculación", "A domicilio", "Online", "Nutrición deportiva"] },
  { name: "Empleada doméstica", categorySlug: "limpieza", specialties: ["Casas", "Departamentos", "Planchado", "Cocina", "Por hora", "Por jornada"] },
  { name: "Personal de limpieza", categorySlug: "limpieza", specialties: ["Casas", "Oficinas", "Fin de obra", "Vidrios", "Alfombras", "Consorcios"] },
  { name: "Jardinero", categorySlug: "jardineria", specialties: ["Poda", "Corte de césped", "Paisajismo", "Riego", "Mantenimiento", "Desmalezado"] },
  { name: "Fletero", categorySlug: "mudanzas", specialties: ["Fletes", "Mudanzas", "Embalaje", "Cargas", "Traslados"] },
  { name: "Mueblero", categorySlug: "mudanzas", specialties: ["Armado de muebles", "Desarme", "Instalación", "Cocinas", "Placards"] },
  { name: "Techista", categorySlug: "albanileria", specialties: ["Membranas", "Tejas", "Zinguería", "Impermeabilización", "Filtraciones"] },
  { name: "Colocador de pisos", categorySlug: "albanileria", specialties: ["Cerámicos", "Porcelanato", "Flotante", "Vinílico", "Zócalos"] },
  { name: "Vidriero", categorySlug: "tecnicos", specialties: ["Vidrios", "Espejos", "Mamparas", "Blindex", "Cerramientos"] },
  { name: "Tapicero", categorySlug: "carpinteria", specialties: ["Sillones", "Sillas", "Restauración", "Automotor", "Cortinas"] },
  { name: "Fotógrafo", categorySlug: "diseno", specialties: ["Eventos", "Productos", "Retratos", "Inmobiliaria", "Bodas"] },
  { name: "Contador", categorySlug: "clases", specialties: ["Monotributo", "Impuestos", "Balances", "Asesoría", "Sueldos"] },
  { name: "Niñera", categorySlug: "limpieza", specialties: ["Cuidado de niños", "Apoyo escolar", "Por hora", "Fines de semana"] },
  { name: "Cuidador de adultos mayores", categorySlug: "limpieza", specialties: ["Acompañamiento", "Cuidados", "Nocturno", "Internación domiciliaria"] },
  { name: "Soldador", categorySlug: "carpinteria", specialties: ["Estructuras", "Reparaciones", "Acero inoxidable", "Aluminio", "A domicilio"] },
  { name: "Mecánico", categorySlug: "tecnicos", specialties: ["Mecánica general", "Frenos", "Suspensión", "A domicilio", "Diagnóstico"] },
  { name: "Chapista", categorySlug: "tecnicos", specialties: ["Chapa y pintura", "Abolladuras", "Pulido", "Restauración"] },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Sugerencias por prefijo/coincidencia para el autocompletado. */
export function searchProfessions(query: string, limit = 8): Profession[] {
  const q = norm(query);
  if (!q) return PROFESSIONS.slice(0, limit);
  const starts: Profession[] = [];
  const contains: Profession[] = [];
  for (const p of PROFESSIONS) {
    const n = norm(p.name);
    if (n.startsWith(q)) starts.push(p);
    else if (n.includes(q)) contains.push(p);
  }
  return [...starts, ...contains].slice(0, limit);
}

export function findProfession(name: string): Profession | undefined {
  const n = norm(name);
  return PROFESSIONS.find((p) => norm(p.name) === n);
}

/** Especialidades sugeridas para una profesión (vacío si es libre). */
export function specialtiesFor(name: string): string[] {
  return findProfession(name)?.specialties ?? [];
}
