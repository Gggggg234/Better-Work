import { NextResponse, type NextRequest } from "next/server";

/**
 * Expone la ruta actual a los Server Components vía la cabecera `x-pathname`.
 *
 * El App Router no da la ruta en un layout de servidor, y la necesitamos para
 * el guard de onboarding (obligar a completar el perfil sin caer en un loop de
 * redirecciones hacia la misma página). El proxy sólo agrega una cabecera: no
 * bloquea ni redirige nada acá. (En Next 16 esta convención se llama `proxy`.)
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Todo menos la API y los assets internos de Next.
  matcher: ["/((?!api|_next).*)"],
};
