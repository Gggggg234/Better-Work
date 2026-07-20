/**
 * Detección de plataforma para guiar la instalación de la PWA.
 *
 * Cada sistema instala distinto y algunos directamente no dejan: acá se decide
 * qué instrucciones mostrar. Todo se calcula del userAgent, así que sólo corre
 * en el cliente.
 */

export type Platform = "ios" | "android" | "desktop";

export type InstallInfo = {
  platform: Platform;
  /** Navegador embebido (Instagram, Facebook, etc.): no puede instalar PWAs. */
  inApp: boolean;
  /** El navegador soporta instalar una PWA de alguna forma. */
  installable: boolean;
  title: string;
  steps: string[];
  /** Nota extra (ej.: "sólo funciona en Safari"). */
  note?: string;
};

function detectInApp(ua: string): boolean {
  // Webviews más comunes donde "Agregar a inicio" no existe.
  return /FBAN|FBAV|Instagram|Line\/|Twitter|WhatsApp|TikTok|Snapchat|Pinterest|MicroMessenger/i.test(ua);
}

export function detectInstall(): InstallInfo {
  const ua = navigator.userAgent;
  const inApp = detectInApp(ua);

  // iPadOS moderno se hace pasar por Mac: se detecta por el touch.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const isAndroid = /Android/.test(ua);
  const platform: Platform = isIOS ? "ios" : isAndroid ? "android" : "desktop";

  if (inApp) {
    return {
      platform,
      inApp: true,
      installable: false,
      title: "Abrí Better Work en tu navegador",
      steps: [
        "Estás viendo esto dentro de otra app (Instagram, Facebook, etc.).",
        isIOS
          ? "Tocá los tres puntos (···) y elegí “Abrir en el navegador” o “Abrir en Safari”."
          : "Tocá los tres puntos (⋮) y elegí “Abrir en Chrome” o “Abrir en el navegador”.",
        "Ya en el navegador, volvé a tocar “Descargar aplicación”.",
      ],
      note: "Desde acá adentro no se puede instalar la app.",
    };
  }

  if (isIOS) {
    return {
      platform: "ios",
      inApp: false,
      installable: true,
      title: "Instalar en iPhone o iPad",
      steps: [
        "Tocá el botón Compartir (el cuadrado con la flecha hacia arriba ↑).",
        "Deslizá y elegí “Agregar a inicio”.",
        "Confirmá con “Agregar” arriba a la derecha.",
      ],
      note: "En iPhone la instalación se hace desde Safari.",
    };
  }

  if (isAndroid) {
    return {
      platform: "android",
      inApp: false,
      installable: true,
      title: "Instalar en Android",
      steps: [
        "Tocá el menú del navegador (los tres puntos ⋮ arriba a la derecha).",
        "Elegí “Instalar aplicación” o “Agregar a pantalla principal”.",
        "Confirmá con “Instalar”.",
      ],
    };
  }

  return {
    platform: "desktop",
    inApp: false,
    installable: true,
    title: "Instalar en tu computadora",
    steps: [
      "Mirá el borde derecho de la barra de direcciones: tocá el ícono de instalar (una pantalla con una flecha).",
      "O abrí el menú del navegador (⋮) y elegí “Instalar Better Work”.",
      "Confirmá con “Instalar”.",
    ],
    note: "Funciona en Chrome, Edge y otros navegadores compatibles.",
  };
}
