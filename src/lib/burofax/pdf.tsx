import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CartaBurofax } from "./texto";

// El documento que el usuario lleva a Correos. Se compone con las fuentes
// estándar del PDF (Helvetica/Times), sin embeber ninguna: son las catorce que
// todo visor entiende, cubren los acentos y el euro, y evitan cargar ficheros
// de fuente dentro de una función serverless.
//
// La estética es deliberadamente sobria y anónima. Un requerimiento formal con
// el logotipo de una startup encima pierde autoridad, así que Cobra aparece
// una sola vez, al pie y en gris: la carta es del usuario, no nuestra.

const TINTA = "#12241C";
const GRAFITO = "#3A4A42";
const SUAVE = "#6B7A72";
const LINEA = "#C9D2CB";

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.5,
    color: GRAFITO,
  },
  cabecera: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderBottomColor: TINTA,
    paddingBottom: 8,
  },
  titulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: TINTA,
  },
  fecha: { fontSize: 9.5, color: SUAVE },
  partes: { flexDirection: "row", marginTop: 22, gap: 28 },
  parte: { flex: 1 },
  etiqueta: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 1,
    color: SUAVE,
    marginBottom: 4,
  },
  parteNombre: { fontFamily: "Times-Bold", fontSize: 10.5, color: TINTA },
  linea: { fontSize: 9.5 },
  asunto: {
    marginTop: 22,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: LINEA,
    fontFamily: "Times-Bold",
    fontSize: 10.5,
    color: TINTA,
  },
  parrafo: { marginTop: 11, textAlign: "justify" },
  tabla: {
    marginTop: 18,
    borderTopWidth: 0.5,
    borderTopColor: LINEA,
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: LINEA,
    paddingVertical: 7,
    gap: 16,
  },
  concepto: { flex: 1, fontSize: 9.5, color: TINTA },
  nota: { fontSize: 8, color: SUAVE, marginTop: 1 },
  importe: { fontFamily: "Times-Roman", fontSize: 10, color: TINTA },
  filaTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 9,
    gap: 16,
  },
  totalEtiqueta: { fontFamily: "Times-Bold", fontSize: 10.5, color: TINTA },
  totalImporte: { fontFamily: "Times-Bold", fontSize: 12, color: TINTA },
  semestres: { marginTop: 8, fontSize: 8, color: SUAVE },
  firma: { marginTop: 30 },
  firmaLinea: {
    marginTop: 34,
    width: 190,
    borderTopWidth: 0.5,
    borderTopColor: LINEA,
    paddingTop: 5,
  },
  pie: {
    position: "absolute",
    bottom: 30,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: LINEA,
    paddingTop: 7,
    fontSize: 7.5,
    color: SUAVE,
    lineHeight: 1.4,
  },
});

function BurofaxDoc({ carta }: { carta: CartaBurofax }) {
  return (
    <Document
      title={carta.asunto}
      author={carta.firma[0]}
      subject="Requerimiento fehaciente de pago"
      language="es-ES"
    >
      <Page size="A4" style={s.page}>
        <View style={s.cabecera}>
          <Text style={s.titulo}>REQUERIMIENTO FEHACIENTE DE PAGO</Text>
          <Text style={s.fecha}>{carta.fecha}</Text>
        </View>

        <View style={s.partes}>
          <View style={s.parte}>
            <Text style={s.etiqueta}>REMITENTE</Text>
            {carta.remitente.map((l, i) => (
              <Text key={l} style={i === 0 ? s.parteNombre : s.linea}>
                {l}
              </Text>
            ))}
          </View>
          <View style={s.parte}>
            <Text style={s.etiqueta}>DESTINATARIO</Text>
            {carta.destinatario.map((l, i) => (
              <Text key={l} style={i === 0 ? s.parteNombre : s.linea}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        <Text style={s.asunto}>{carta.asunto}</Text>

        {carta.parrafos.map((p) => (
          <Text key={p.slice(0, 40)} style={s.parrafo}>
            {p}
          </Text>
        ))}

        <View style={s.tabla}>
          {carta.desglose.conceptos.map((c) => (
            <View key={c.etiqueta} style={s.fila}>
              <View style={s.concepto}>
                <Text>{c.etiqueta}</Text>
                {c.nota ? <Text style={s.nota}>{c.nota}</Text> : null}
              </View>
              <Text style={s.importe}>{c.valor}</Text>
            </View>
          ))}
          <View style={s.filaTotal}>
            <Text style={s.totalEtiqueta}>{carta.desglose.totalEtiqueta}</Text>
            <Text style={s.totalImporte}>{carta.desglose.total}</Text>
          </View>
          {carta.interes.segments.length > 0 && (
            <Text style={s.semestres}>
              Detalle del interés por semestre:{" "}
              {carta.interes.segments
                .map(
                  (seg) =>
                    `${seg.periodo}, ${seg.tipo.toLocaleString("es-ES")} % anual, ${seg.dias} ${seg.dias === 1 ? "día" : "días"}`,
                )
                .join(" · ")}
              .
            </Text>
          )}
        </View>

        <Text style={[s.parrafo, s.firma]}>{carta.despedida}</Text>

        <View style={s.firmaLinea}>
          {carta.firma.map((l, i) => (
            <Text key={l} style={i === 0 ? s.parteNombre : s.linea}>
              {l}
            </Text>
          ))}
        </View>

        <Text style={s.pie} fixed>
          Documento generado con Cobra (micobra.es) para su envío por burofax
          con certificación de texto y acuse de recibo. Su contenido no
          constituye asesoramiento jurídico.
        </Text>
      </Page>
    </Document>
  );
}

export async function generarPdfBurofax(carta: CartaBurofax): Promise<Buffer> {
  return renderToBuffer(<BurofaxDoc carta={carta} />);
}
