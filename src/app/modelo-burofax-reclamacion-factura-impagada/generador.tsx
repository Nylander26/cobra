"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { nifValido } from "@/lib/burofax/schema";
import { trackMeta, trackPixel } from "@/lib/meta/client";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { type BurofaxState, generarBurofax } from "./actions";

// Doce campos. La calculadora pide dos, y esa diferencia lo cambia todo: aquí
// hay varios minutos de trabajo real, buena parte de ellos buscando el NIF y
// el domicilio fiscal de un cliente que no se tienen a mano. De ahí las dos
// decisiones que gobiernan este componente:
//
//   1. Cuatro pasos, no una pantalla larga. Con el grueso del tráfico en móvil,
//      doce campos de una tirada se abandonan enteros.
//   2. Autoguardado en localStorage desde el primer campo. Quien se va a
//      buscar el NIF y vuelve a un formulario vacío no vuelve a empezar.
//
// Y por eso se mide el abandono POR PASO y no solo la conversión final: si
// todo el mundo se cae en "datos del deudor", el problema no es el formulario,
// es que no tienen el dato, y eso pide otra solución, no otro botón.

const ALMACEN = "cobra:burofax:v1";

// El borrador guardado se lee como una fuente externa, no copiándolo a estado
// dentro de un efecto: en el primer render —el de la hidratación— React usa la
// instantánea del servidor (nada guardado) y solo después la del navegador, que
// es justo lo que evita el desajuste de hidratación.
function suscribirse(alCambiar: () => void) {
  window.addEventListener("storage", alCambiar);
  return () => window.removeEventListener("storage", alCambiar);
}

// La instantánea tiene que ser referencialmente estable entre renders o React
// entra en bucle, así que se cachea por el texto crudo del que salió.
let cache: { crudo: string | null; datos: Record<string, string> } | null = null;

function instantaneaNavegador(): string | null {
  try {
    return localStorage.getItem(ALMACEN);
  } catch {
    // Modo privado o almacenamiento bloqueado: se sigue sin autoguardado.
    return null;
  }
}

const instantaneaServidor = () => null;

function datosGuardados(crudo: string | null): Record<string, string> {
  if (!cache || cache.crudo !== crudo) {
    let datos = VACIO;
    try {
      if (crudo) datos = { ...VACIO, ...(JSON.parse(crudo) as object) };
    } catch {
      datos = VACIO;
    }
    cache = { crudo, datos };
  }
  return cache.datos;
}

type Campo = {
  name: string;
  etiqueta: string;
  tipo?: "text" | "date" | "textarea";
  placeholder?: string;
  ayuda?: string;
  inputMode?: "decimal";
  ancho?: "medio" | "completo";
};

const PASOS: { titulo: string; intro: string; campos: Campo[] }[] = [
  {
    titulo: "Tus datos",
    intro:
      "Quien reclama. Tal y como figura en la factura: el burofax te tiene que identificar sin margen de duda.",
    campos: [
      {
        name: "acreedorNombre",
        etiqueta: "Nombre y apellidos o razón social",
        placeholder: "Ana Ruiz Beltrán",
      },
      {
        name: "acreedorNif",
        etiqueta: "NIF / CIF",
        placeholder: "12345678Z",
        ancho: "medio",
      },
      {
        name: "acreedorDomicilio",
        etiqueta: "Tu domicilio",
        tipo: "textarea",
        placeholder: "Calle Mayor 4, 3.º B\n28013 Madrid",
        ayuda: "Calle, número, código postal y localidad.",
      },
    ],
  },
  {
    titulo: "Datos del deudor",
    intro:
      "Quien te debe. El domicilio es la dirección a la que Correos entregará el burofax, así que tiene que ser el fiscal o el social, no el del contacto comercial.",
    campos: [
      {
        name: "deudorNombre",
        etiqueta: "Nombre o razón social",
        placeholder: "Estudio Ejemplo, S.L.",
      },
      {
        name: "deudorNif",
        etiqueta: "NIF / CIF",
        placeholder: "B12345674",
        ancho: "medio",
        ayuda: "Lo tienes en la factura que le emitiste.",
      },
      {
        name: "deudorDomicilio",
        etiqueta: "Domicilio del deudor",
        tipo: "textarea",
        placeholder: "Avenida del Puerto 120\n46022 Valencia",
      },
    ],
  },
  {
    titulo: "La factura",
    intro:
      "La deuda concreta. Una reclamación genérica no acredita qué se reclama: sin estos datos el burofax no interrumpe la prescripción.",
    campos: [
      {
        name: "numero",
        etiqueta: "Número de factura",
        placeholder: "2026-014",
        ancho: "medio",
      },
      {
        name: "importe",
        etiqueta: "Importe total (€)",
        placeholder: "1.250,50",
        inputMode: "decimal",
        ancho: "medio",
        ayuda: "IVA incluido, tal y como se la emitiste.",
      },
      {
        name: "emision",
        etiqueta: "Fecha de emisión",
        tipo: "date",
        ancho: "medio",
      },
      {
        name: "vencimiento",
        etiqueta: "Fecha de vencimiento",
        tipo: "date",
        ancho: "medio",
      },
      {
        name: "concepto",
        etiqueta: "Concepto",
        placeholder: "diseño de identidad corporativa y manual de marca",
        ayuda: "En minúscula: va dentro de una frase de la carta.",
      },
    ],
  },
];

const VACIO: Record<string, string> = {
  acreedorNombre: "",
  acreedorNif: "",
  acreedorDomicilio: "",
  deudorNombre: "",
  deudorNif: "",
  deudorDomicilio: "",
  numero: "",
  importe: "",
  emision: "",
  vencimiento: "",
  concepto: "",
  plazo: "10",
};

const inputClass =
  "w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta outline-none transition placeholder:text-grafito/40 focus:border-cobra focus:ring-1 focus:ring-cobra";

// Validación de paso: la mínima para que nadie avance con un campo vacío y
// descubra en la última pantalla que tiene que retroceder tres. La de verdad
// está en el servidor.
function validarPaso(indice: number, datos: Record<string, string>) {
  const errores: Record<string, string> = {};
  const pedir = (name: string, minimo: number, mensaje: string) => {
    if ((datos[name] ?? "").trim().length < minimo) errores[name] = mensaje;
  };

  if (indice === 0) {
    pedir("acreedorNombre", 2, "Escribe tu nombre o razón social.");
    if (!nifValido(datos.acreedorNif ?? "")) {
      errores.acreedorNif = "Ese NIF no es válido. Revísalo dígito a dígito.";
    }
    pedir("acreedorDomicilio", 10, "Calle, número, código postal y localidad.");
  }

  if (indice === 1) {
    pedir("deudorNombre", 2, "Escribe el nombre o la razón social del deudor.");
    if (!nifValido(datos.deudorNif ?? "")) {
      errores.deudorNif = "Ese NIF no es válido. Lo tienes en tu factura.";
    }
    pedir(
      "deudorDomicilio",
      10,
      "Sin domicilio correcto, Correos no puede entregarlo.",
    );
  }

  if (indice === 2) {
    pedir("numero", 1, "Escribe el número de la factura.");
    pedir("concepto", 3, "Describe brevemente el trabajo facturado.");
    const cents = parseAmountToCents(datos.importe ?? "");
    if (!cents || cents <= 0) errores.importe = "Escribe el importe (1.250,50).";
    if (!datos.emision) errores.emision = "Falta la fecha de emisión.";
    if (!datos.vencimiento) {
      errores.vencimiento = "Falta la fecha de vencimiento.";
    } else {
      const vence = new Date(`${datos.vencimiento}T00:00:00Z`);
      if (vence >= new Date()) {
        errores.vencimiento =
          "Esa factura aún no ha vencido: todavía no hay deuda que reclamar.";
      } else if (datos.emision && datos.vencimiento < datos.emision) {
        errores.vencimiento = "No puede vencer antes de emitirse.";
      }
    }
  }

  return errores;
}

export function Generador() {
  const [paso, setPaso] = useState(0);
  const [editado, setEditado] = useState<Record<string, string> | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState<BurofaxState, FormData>(
    generarBurofax,
    {},
  );

  const crudo = useSyncExternalStore(
    suscribirse,
    instantaneaNavegador,
    instantaneaServidor,
  );
  const recuperado = datosGuardados(crudo);
  const datos = editado ?? recuperado;
  const restaurado =
    editado === null && Object.values(recuperado).some((v) => v && v !== "10");

  useEffect(() => {
    if (!editado) return;
    try {
      localStorage.setItem(ALMACEN, JSON.stringify(editado));
    } catch {
      // Perder el autoguardado no puede romper el formulario.
    }
  }, [editado]);

  const total = PASOS.length + 1;

  function avanzar() {
    const fallos = validarPaso(paso, datos);
    setErrores(fallos);
    if (Object.keys(fallos).length > 0) return;

    const siguiente = paso + 1;
    setPaso(siguiente);
    // El dato que decide si esta herramienta vive: dónde se cae la gente.
    track("burofax_paso", { paso: siguiente + 1, de: total });
    if (siguiente === PASOS.length) {
      // Ha llegado a la revisión con los doce campos puestos: eso ya es
      // intención de verdad, y separa el tráfico curioso del que reclama.
      trackPixel("ViewContent", {
        content_name: "generador-burofax",
        content_category: "herramienta",
      });
    }
  }

  function set(name: string, valor: string) {
    setEditado({ ...datos, [name]: valor });
    if (errores[name]) {
      setErrores((previo) =>
        Object.fromEntries(
          Object.entries(previo).filter(([clave]) => clave !== name),
        ),
      );
    }
  }

  if (state.ok && state.pdf) return <Exito state={state} />;

  const enRevision = paso === PASOS.length;
  const actual = PASOS[paso];

  return (
    <div className="rounded-2xl border border-linea bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
          Paso {paso + 1} de {total}
        </p>
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition ${
                i <= paso ? "bg-cobra" : "bg-linea"
              }`}
            />
          ))}
        </div>
      </div>

      {restaurado && paso === 0 && (
        <p className="mt-4 rounded-lg border border-cobra/25 bg-cobra/5 px-3 py-2 text-xs text-grafito">
          Hemos recuperado lo que habías escrito. Sigue por donde lo dejaste.
        </p>
      )}

      {enRevision ? (
        <Revision datos={datos} state={state} pending={pending} action={formAction} alPaso={setPaso} />
      ) : (
        <>
          <h3 className="mt-5 font-display text-xl tracking-tight text-tinta">
            {actual.titulo}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-grafito/80">
            {actual.intro}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {actual.campos.map((campo) => (
              <label
                key={campo.name}
                className={`block space-y-1 ${campo.ancho === "medio" ? "" : "sm:col-span-2"}`}
              >
                <span className="text-sm font-medium text-grafito">
                  {campo.etiqueta}
                </span>
                {campo.tipo === "textarea" ? (
                  <textarea
                    rows={2}
                    value={datos[campo.name] ?? ""}
                    onChange={(e) => set(campo.name, e.target.value)}
                    placeholder={campo.placeholder}
                    className={`${inputClass} resize-y`}
                  />
                ) : (
                  <input
                    type={campo.tipo ?? "text"}
                    inputMode={campo.inputMode}
                    value={datos[campo.name] ?? ""}
                    onChange={(e) => set(campo.name, e.target.value)}
                    placeholder={campo.placeholder}
                    className={inputClass}
                  />
                )}
                {errores[campo.name] ? (
                  <span className="block text-xs text-red-600" role="alert">
                    {errores[campo.name]}
                  </span>
                ) : campo.ayuda ? (
                  <span className="block text-xs text-grafito/60">
                    {campo.ayuda}
                  </span>
                ) : null}
              </label>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {paso > 0 ? (
              <button
                type="button"
                onClick={() => setPaso(paso - 1)}
                className="rounded-lg border border-linea px-4 py-2 text-sm font-medium text-grafito transition hover:border-cobra/40 hover:text-cobra"
              >
                ← Atrás
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={avanzar}
              className="rounded-lg bg-cobra px-5 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
            >
              Continuar →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Revision({
  datos,
  state,
  pending,
  action,
  alPaso,
}: {
  datos: Record<string, string>;
  state: BurofaxState;
  pending: boolean;
  action: (formData: FormData) => void;
  alPaso: (paso: number) => void;
}) {
  const cents = parseAmountToCents(datos.importe ?? "") ?? 0;

  const filas = [
    { etiqueta: "Reclama", valor: datos.acreedorNombre, paso: 0 },
    { etiqueta: "Debe", valor: datos.deudorNombre, paso: 1 },
    {
      etiqueta: "Factura",
      valor: `N.º ${datos.numero} · ${formatCents(cents)} · vencida el ${datos.vencimiento}`,
      paso: 2,
    },
  ];

  return (
    <form action={action}>
      {Object.entries(datos).map(([name, valor]) => (
        <input key={name} type="hidden" name={name} value={valor} />
      ))}
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <h3 className="mt-5 font-display text-xl tracking-tight text-tinta">
        Revisa y descarga
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-grafito/80">
        Comprueba los nombres y el NIF: son los datos que identifican la
        reclamación, y una errata ahí deja la carta sin efecto.
      </p>

      <dl className="mt-5 divide-y divide-linea border-y border-linea">
        {filas.map((fila) => (
          <div
            key={fila.etiqueta}
            className="flex items-start justify-between gap-4 py-3"
          >
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-wide text-grafito/60">
                {fila.etiqueta}
              </dt>
              <dd className="text-sm text-tinta">{fila.valor}</dd>
            </div>
            <button
              type="button"
              onClick={() => alPaso(fila.paso)}
              className="shrink-0 font-mono text-[11px] text-cobra underline decoration-cobra/40 underline-offset-4"
            >
              editar
            </button>
          </div>
        ))}
      </dl>

      <label className="mt-5 block space-y-1">
        <span className="text-sm font-medium text-grafito">
          Tu correo electrónico
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className={inputClass}
        />
        <span className="block text-xs text-grafito/60">
          Te mandamos una copia del PDF por si lo pierdes. La descarga es
          inmediata: no tienes que esperar al correo.
        </span>
      </label>

      {state.errores?.email && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {state.errores.email}
        </p>
      )}
      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => alPaso(PASOS.length - 1)}
          className="rounded-lg border border-linea px-4 py-2 text-sm font-medium text-grafito transition hover:border-cobra/40 hover:text-cobra"
        >
          ← Atrás
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cobra px-5 py-2 text-sm font-medium text-white transition hover:bg-cobra-oscuro disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobra"
        >
          {pending ? "Generando…" : "Descargar el burofax"}
        </button>
      </div>
    </form>
  );
}

function Exito({ state }: { state: BurofaxState }) {
  const { pdf, nombreArchivo, resumen } = state;
  const descargado = useRef(false);

  // El objeto URL se crea y se revoca en el mismo gesto: no vive en estado, así
  // que no hay nada que limpiar si el usuario se va sin volver a descargar.
  function descargar() {
    if (!pdf) return;
    const bytes = Uint8Array.from(atob(pdf), (c) => c.charCodeAt(0));
    const objeto = URL.createObjectURL(
      new Blob([bytes as BlobPart], { type: "application/pdf" }),
    );
    const a = document.createElement("a");
    a.href = objeto;
    a.download = nombreArchivo ?? "burofax.pdf";
    a.click();
    URL.revokeObjectURL(objeto);
  }

  useEffect(() => {
    // La descarga arranca sola: es lo que ha venido a buscar y ya ha hecho
    // clic. El botón de abajo queda para el navegador que la bloquee.
    if (descargado.current) return;
    descargado.current = true;
    descargar();
    // Solo al montar: `descargar` lee props que no cambian en esta pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!resumen) return;
    // El evento que hay que optimizar en Meta: llega con correo y desde el
    // navegador de la sesión del anuncio, así que conserva `_fbp` y `_fbc`.
    void trackMeta("Lead", {
      customData: {
        content_name: "generador-burofax",
        value: resumen.reclamableCents / 100,
        currency: "EUR",
      },
    });
  }, [resumen]);

  return (
    <div className="rounded-2xl border border-cobra/30 bg-white p-6 shadow-[0_1px_2px_rgba(18,36,28,0.06)] sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-cobra">
        Burofax listo
      </p>
      <h3 className="mt-3 font-display text-2xl tracking-tight text-tinta">
        Ya lo tienes descargado
      </h3>
      {resumen && (
        <p className="mt-2 text-sm leading-relaxed text-grafito/80">
          Reclamas <strong className="text-tinta">{resumen.total}</strong> por la
          factura n.º {resumen.numero}: principal, intereses de demora y los 40 €
          de costes de cobro.
        </p>
      )}

      <button
        type="button"
        onClick={descargar}
        className="mt-4 inline-block rounded-lg border border-linea px-4 py-2 text-sm font-medium text-tinta transition hover:border-cobra/40 hover:text-cobra"
      >
        Volver a descargar el PDF
      </button>

      <div className="mt-6 border-t border-linea pt-6">
        <h4 className="font-display text-lg tracking-tight text-tinta">
          Ahora, llévalo a Correos
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed text-grafito/80">
          En cualquier oficina o desde{" "}
          <a
            href="https://www.correos.es/es/es/particulares/enviar/burofax"
            target="_blank"
            rel="noreferrer"
            className="text-cobra underline decoration-cobra/40 underline-offset-4"
          >
            correos.es
          </a>
          . Pide <strong className="text-tinta">certificación de texto</strong> y{" "}
          <strong className="text-tinta">acuse de recibo</strong>: sin esas dos
          cosas es una carta normal y no prueba nada. Cuesta unos 30-45 €.
        </p>
      </div>

      {resumen && (
        <div className="mt-6 rounded-xl bg-tinta p-5 text-marfil sm:p-6">
          <h4 className="font-display text-lg tracking-tight">
            Las tres fechas que empiezan hoy
          </h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-marfil/15 pb-2">
              <dt className="text-marfil/70">Vence el plazo que le has dado</dt>
              <dd className="shrink-0 font-medium">{resumen.venceElPlazo}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-marfil/15 pb-2">
              <dt className="text-marfil/70">Puedes recuperar el IVA desde</dt>
              <dd className="shrink-0 font-medium">{resumen.ivaDesde}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-marfil/70">Último día para recuperarlo</dt>
              <dd className="shrink-0 font-medium">{resumen.ivaHasta}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-marfil/70">
            Te hemos mandado el PDF por correo, y dentro va el enlace para que
            Cobra te avise en cada una de esas fechas y guarde esta factura en
            seguimiento. No hay que crear contraseña: se entra con ese enlace.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-grafito/60">
        Este documento es orientativo y no constituye asesoramiento jurídico. Si
        la deuda es alta o el deudor ya ha discutido la factura, consulta con un
        abogado antes de enviarlo.{" "}
        <Link
          href="/calculadora-intereses-demora"
          className="text-cobra underline decoration-cobra/40 underline-offset-4"
        >
          Ver el detalle del cálculo de intereses
        </Link>
        .
      </p>
    </div>
  );
}
