import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// El borrador del burofax contiene el nombre, el NIF y el domicilio de un
// tercero —el deudor— que nunca ha visitado Cobra. Vive en la base de datos
// como mucho 72 horas, el tiempo de que su acreedor pulse el enlace desde el
// móvil o desde el portátil, y mientras tanto está cifrado: si el dump de una
// tabla se va por donde no debe, ahí no hay datos de nadie.
//
// AES-256-GCM: además de cifrar, autentica. Un borrador manipulado no
// descifra, revienta — que es exactamente lo que se quiere de un dato que
// acaba convertido en una factura dentro de una cuenta.

const ALGORITMO = "aes-256-gcm";
const IV_BYTES = 12; // el tamaño que recomienda GCM
const TAG_BYTES = 16;

function clave(): Buffer {
  const bruta = process.env.BUROFAX_PAYLOAD_KEY;
  if (!bruta) {
    throw new Error(
      "Falta BUROFAX_PAYLOAD_KEY: 32 bytes en base64. Genérala con `openssl rand -base64 32`.",
    );
  }
  const key = Buffer.from(bruta, "base64");
  if (key.length !== 32) {
    throw new Error(
      `BUROFAX_PAYLOAD_KEY debe tener 32 bytes tras decodificar base64 (tiene ${key.length}).`,
    );
  }
  return key;
}

export function cifrar(valor: unknown): { cifrado: string; iv: string } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITMO, clave(), iv);
  const datos = Buffer.concat([
    cipher.update(JSON.stringify(valor), "utf8"),
    cipher.final(),
  ]);
  // El tag va pegado al final del ciphertext para no necesitar una tercera
  // columna: siempre mide 16 bytes, así que se separa sin ambigüedad.
  return {
    cifrado: Buffer.concat([datos, cipher.getAuthTag()]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function descifrar<T>(cifrado: string, iv: string): T {
  const bruto = Buffer.from(cifrado, "base64");
  const datos = bruto.subarray(0, bruto.length - TAG_BYTES);
  const tag = bruto.subarray(bruto.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITMO, clave(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(tag);
  const claro = Buffer.concat([decipher.update(datos), decipher.final()]);
  return JSON.parse(claro.toString("utf8")) as T;
}
