import { connection } from "next/server";

// Lectura del reloj por-request, deliberadamente fuera de todo componente.
//
// `Date.now()` en el cuerpo de un render es impuro: con Cache Components el
// árbol puede prerenderizarse en el build y congelar esa hora para siempre,
// y el compilador de React lo rechaza. `connection()` declara que lo que
// viene detrás depende de la petición, así que ese subárbol se resuelve en
// cada visita — de ahí que quien la llame tenga que estar bajo <Suspense>.
export async function ahora(): Promise<number> {
  await connection();
  return Date.now();
}
