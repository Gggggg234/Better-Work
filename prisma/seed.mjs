import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const CATEGORIES = [
  ["Albañilería", "🧱"],
  ["Pintura", "🎨"],
  ["Electricidad", "⚡"],
  ["Plomería", "🚿"],
  ["Carpintería", "🪚"],
  ["Técnicos", "🔧"],
  ["Programación", "💻"],
  ["Clases", "📚"],
  ["Diseño", "✏️"],
  ["Limpieza", "🧹"],
  ["Jardinería", "🌿"],
  ["Mudanzas", "📦"],
];

// Trabajadores de ejemplo alrededor de Buenos Aires.
const WORKERS = [
  ["Carlos Medina", "Albañil", "Albañilería", -34.588, -58.43, "Palermo", 12, 87, 4.9, "Construcción en seco, revoques, colocación de cerámicos. Trabajo prolijo y con garantía.", ["Revoques", "Cerámicos", "Durlock", "Pequeñas obras"], 5000],
  ["Luis Fernández", "Pintor", "Pintura", -34.6, -58.42, "Almagro", 8, 54, 4.7, "Pintura de interiores y exteriores. Presupuesto sin cargo.", ["Interiores", "Exteriores", "Impermeabilización"], 4000],
  ["Marta Suárez", "Electricista matriculada", "Electricidad", -34.61, -58.39, "Balvanera", 15, 132, 4.8, "Electricista matriculada. Instalaciones nuevas, tableros, urgencias 24 hs.", ["Instalaciones", "Tableros", "Urgencias 24 hs"], 8000],
  ["Jorge Paredes", "Plomero", "Plomería", -34.62, -58.44, "Caballito", 20, 210, 4.9, "Plomería general, destapaciones, termotanques. Más de 20 años de experiencia.", ["Destapaciones", "Termotanques", "Pérdidas"], 7000],
  ["Ana Gutiérrez", "Carpintera", "Carpintería", -34.59, -58.45, "Villa Crespo", 10, 45, 4.6, "Muebles a medida, restauración y colocación de aberturas.", ["Muebles a medida", "Restauración", "Aberturas"], 6000],
  ["Diego Romano", "Técnico en refrigeración", "Técnicos", -34.57, -58.44, "Belgrano", 9, 76, 4.5, "Instalación y service de aires acondicionados y heladeras.", ["Split", "Heladeras", "Service"], 9000],
  ["Sofía Blanco", "Desarrolladora web", "Programación", -34.603, -58.381, "San Nicolás", 7, 38, 5.0, "Sitios web, tiendas online y apps a medida. Trabajo remoto o presencial.", ["Sitios web", "E-commerce", "Apps"], 15000],
  ["Pablo Ortiz", "Profesor de matemática", "Clases", -34.63, -58.4, "San Cristóbal", 11, 95, 4.8, "Clases de matemática y física para secundaria y CBC. Online o a domicilio.", ["Matemática", "Física", "CBC"], 6000],
  ["Valentina Ríos", "Diseñadora gráfica", "Diseño", -34.585, -58.4, "Recoleta", 6, 29, 4.7, "Identidad de marca, redes y packaging. Portfolio a pedido.", ["Branding", "Redes", "Packaging"], 12000],
  ["Rosa Díaz", "Limpieza por hora", "Limpieza", -34.64, -58.42, "Boedo", 5, 68, 4.6, "Limpieza de casas, oficinas y fin de obra. Por hora o por jornada.", ["Casas", "Oficinas", "Fin de obra"], 3500],
  ["Miguel Torres", "Jardinero", "Jardinería", -34.56, -58.46, "Núñez", 14, 51, 4.4, "Mantenimiento de jardines, poda y paisajismo.", ["Poda", "Césped", "Paisajismo"], 5000],
  ["Hernán López", "Mudanzas y fletes", "Mudanzas", -34.615, -58.37, "San Telmo", 10, 120, 4.5, "Fletes y mudanzas con ayudantes. Zona CABA y GBA.", ["Mudanzas", "Fletes", "Embalaje"], 10000],
];

async function main() {
  const pass = await bcrypt.hash("demo1234", 10);

  // Reglas del estimador de publicidad (editables desde el panel Super Admin).
  for (const [key, value] of [
    ["ad_impressions_per_1000", "140"],
    ["ad_view_rate", "8"],
    ["ad_min_budget", "3000"],
  ]) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  // Planes de empresa. Los trabajadores no pagan membresía.
  const PLANS = [
    {
      key: "STARTER", name: "Starter", order: 1, price: 15000,
      tagline: "Para empezar a contratar",
      jobPostLimit: 3, applicantLimit: 10, searchBoost: 0,
      analytics: false, verifiedBadge: false, featuredHome: false, prioritySupport: false,
    },
    {
      key: "BUSINESS", name: "Business", order: 2, price: 35000,
      tagline: "Para empresas que contratan seguido",
      jobPostLimit: 10, applicantLimit: 50, searchBoost: 0.15,
      analytics: true, verifiedBadge: true, featuredHome: false, prioritySupport: false,
    },
    {
      key: "ENTERPRISE", name: "Enterprise", order: 3, price: 75000,
      tagline: "Máxima visibilidad y sin límites",
      jobPostLimit: -1, applicantLimit: -1, searchBoost: 0.3,
      analytics: true, verifiedBadge: true, featuredHome: true, prioritySupport: true,
    },
  ];
  for (const plan of PLANS) {
    await db.plan.upsert({ where: { key: plan.key }, create: plan, update: {} });
  }

  const catByName = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const [name, icon] = CATEGORIES[i];
    const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");
    const cat = await db.category.upsert({
      where: { slug },
      create: { name, slug, icon, order: i },
      update: {},
    });
    catByName[name] = cat;
  }

  await db.user.upsert({
    where: { email: "admin@betterwork.app" },
    create: { email: "admin@betterwork.app", name: "Administración", role: "ADMIN", passwordHash: pass, emailVerified: new Date() },
    update: {},
  });

  const client = await db.user.upsert({
    where: { email: "cliente@demo.com" },
    create: { email: "cliente@demo.com", name: "María Pérez", role: "CLIENT", passwordHash: pass, phone: "+54 11 5555-1234", emailVerified: new Date() },
    update: {},
  });
  const companyUser = await db.user.upsert({
    where: { email: "empresa@demo.com" },
    create: { email: "empresa@demo.com", name: "Constructora Delta", role: "COMPANY", passwordHash: pass, emailVerified: new Date() },
    update: {},
  });
  const planUntil = new Date(Date.now() + 30 * 86400000);
  const company = await db.companyProfile.upsert({
    where: { userId: companyUser.id },
    create: {
      userId: companyUser.id,
      companyName: "Constructora Delta",
      description: "Empresa constructora con 25 años en el mercado. Obras residenciales y comerciales.",
      industry: "Construcción",
      city: "Buenos Aires",
      lat: -34.598,
      lng: -58.42,
      verified: true,
      planKey: "BUSINESS",
      planActiveUntil: planUntil,
    },
    // La empresa demo tiene el plan Business activo (para que aparezca y publique).
    update: { planKey: "BUSINESS", planActiveUntil: planUntil },
  });

  const workerUsers = [];
  for (const [name, profession, catName, lat, lng, zone, exp, jobs, rating, bio, services, price] of WORKERS) {
    const email = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".") + "@demo.com";
    const u = await db.user.upsert({
      where: { email },
      create: { email, name, role: "WORKER", passwordHash: pass, phone: "+54 11 4444-0000", emailVerified: new Date() },
      update: {},
    });
    await db.workerProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        profession,
        bio,
        experience: exp,
        categoryId: catByName[catName].id,
        services: JSON.stringify(services),
        city: "Buenos Aires",
        zone,
        lat,
        lng,
        radiusKm: 20,
        schedule: "08:00-19:00",
        availableDays: JSON.stringify(["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]),
        workMode: "AMBOS",
        whatsapp: "+54 9 11 4444-0000",
        payMethods: JSON.stringify(["Efectivo", "Transferencia", "Mercado Pago"]),
        priceHint: `Desde $${price.toLocaleString("es-AR")} por visita`,
        verified: jobs > 60,
        jobsDone: jobs,
        ratingAvg: rating,
        ratingCount: Math.round(jobs * 0.8),
      },
      // Completar los campos nuevos también en perfiles ya existentes.
      update: {
        radiusKm: 20,
        schedule: "08:00-19:00",
        availableDays: JSON.stringify(["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]),
        workMode: "AMBOS",
      },
    });
    workerUsers.push(u);
  }

  // Un trabajo completado de ejemplo con reseñas.
  const existingJob = await db.job.findFirst({ where: { clientId: client.id } });
  if (!existingJob) {
    const job = await db.job.create({
      data: {
        clientId: client.id,
        workerId: workerUsers[3].id,
        title: "Arreglo de pérdida en cocina",
        description: "Pérdida de agua debajo de la mesada.",
        address: "Av. Rivadavia 4800, Caballito",
        lat: -34.618,
        lng: -58.437,
        price: 45000,
        status: "COMPLETED",
        startCode: "1111",
        endCode: "2222",
        acceptedAt: new Date(Date.now() - 3 * 86400000),
        startedAt: new Date(Date.now() - 2 * 86400000),
        completedAt: new Date(Date.now() - 2 * 86400000),
      },
    });
    await db.review.create({
      data: {
        jobId: job.id, raterId: client.id, ratedId: workerUsers[3].id,
        stars: 5, punctuality: 5, quality: 5, communication: 5, compliance: 5,
        comment: "Excelente trabajo, muy prolijo y puntual.",
      },
    });
    await db.review.create({
      data: {
        jobId: job.id, raterId: workerUsers[3].id, ratedId: client.id,
        stars: 5, comment: "Muy buena clienta, todo claro desde el inicio.",
      },
    });
  }

  // Ofertas laborales de la empresa.
  const existingOffer = await db.jobOffer.findFirst({ where: { companyId: company.id } });
  if (!existingOffer) {
    await db.jobOffer.create({
      data: {
        companyId: company.id,
        title: "Oficial albañil para obra en Palermo",
        description: "Buscamos oficial albañil con experiencia en obra nueva. Jornada completa, inicio inmediato.",
        categoryId: catByName["Albañilería"].id,
        city: "Buenos Aires",
        modality: "Presencial",
        salary: "$900.000 - $1.200.000 / mes",
        promotedUntil: new Date(Date.now() + 15 * 86400000),
      },
    });
    await db.jobOffer.create({
      data: {
        companyId: company.id,
        title: "Electricista para mantenimiento de edificios",
        description: "Mantenimiento eléctrico de consorcios. Matrícula excluyente.",
        categoryId: catByName["Electricidad"].id,
        city: "Buenos Aires",
        modality: "Presencial",
        salary: "A convenir",
      },
    });
  }

  // Trabajador destacado (publicidad demo) y una empresa destacada.
  await db.workerProfile.updateMany({
    where: { userId: workerUsers[0].id },
    data: { sponsoredUntil: new Date(Date.now() + 7 * 86400000) },
  });
  await db.companyProfile.update({
    where: { id: company.id },
    data: { sponsoredUntil: new Date(Date.now() + 15 * 86400000), sponsorBoost: 0.25 },
  });

  // Publicaciones de ejemplo en el feed.
  const postCount = await db.post.count();
  if (postCount === 0) {
    await db.post.create({
      data: {
        authorId: workerUsers[3].id,
        kind: "WORK_DONE",
        content: "Terminamos la instalación de un termotanque en Caballito. Cliente feliz y todo funcionando 💧🔧",
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
    });
    await db.post.create({
      data: {
        authorId: workerUsers[1].id,
        kind: "TIP",
        content: "Consejo: antes de pintar, lijá y limpiá bien la pared. El acabado se nota muchísimo. 🎨",
        createdAt: new Date(Date.now() - 5 * 3600000),
      },
    });
    await db.post.create({
      data: {
        authorId: companyUser.id,
        kind: "HIRING",
        content: "En Constructora Delta buscamos oficiales albañiles para obra en Palermo. Postulate desde nuestras ofertas.",
        sponsoredUntil: new Date(Date.now() + 15 * 86400000),
        createdAt: new Date(Date.now() - 8 * 3600000),
      },
    });
  }

  console.log("Seed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
