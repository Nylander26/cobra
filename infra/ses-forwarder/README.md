# Reenvío de soporte@micobra.es

SES no reenvía correo por sí solo. La regla de recepción guarda el mensaje crudo
en S3 y dispara la Lambda de `index.mjs`, que lo lee y lo reenvía al buzón
personal.

Todo vive en **eu-west-1 (Irlanda)**, que es donde está la cuenta de SES. La
recepción de SES solo existe en algunas regiones y la del MX tiene que ser esta
misma.

## Variables de la Lambda

| Variable | Ejemplo | Qué es |
|---|---|---|
| `MAIL_BUCKET` | `cobra-correo-entrante` | Bucket donde SES deja el mensaje |
| `MAIL_PREFIX` | `soporte/` | Prefijo de la acción S3 de la regla; con barra final |
| `FORWARD_FROM` | `soporte@micobra.es` | Remitente del reenvío. Tiene que estar verificado en SES |
| `FORWARD_TO` | tu buzón personal | Destino |

Runtime Node.js 20 o superior: el SDK v3 viene incluido y no hay que empaquetar
dependencias. Sube `index.mjs` tal cual y pon el handler en `index.handler`.
Timeout de 30 s.

## Permisos

La Lambda necesita `s3:GetObject` sobre `arn:aws:s3:::<bucket>/<prefijo>*` y
**`ses:SendRawEmail`** sobre `*`. Aunque el código llame a `SendEmailCommand`,
el mensaje va en `Content.Raw` y IAM lo autoriza como `ses:SendRawEmail`: con
solo `ses:SendEmail` la Lambda falla con `AccessDeniedException`. El rol que
crea la consola al vuelo trae únicamente permisos de logs, así que esta política
hay que añadirla a mano.

El bucket necesita una policy que deje escribir a SES: principal
`ses.amazonaws.com`, acción `s3:PutObject`, y una condición
`aws:SourceAccount` con tu número de cuenta para que no pueda escribirte el SES
de otro.

## Por qué se reescribe el `From`

Un reenvío que conserva el remitente original sale de una IP de AWS que no está
en el SPF del dominio de quien escribió. Gmail lo lee como suplantación y lo
manda a spam o lo descarta. Por eso el `From` pasa a una dirección verificada
nuestra y el remitente real viaja en `Reply-To`. La firma DKIM original se
elimina: cubre cabeceras que estamos cambiando, así que dejarla puesta garantiza
un fallo de verificación.

## Sandbox

Mientras la región esté en sandbox, SES solo envía a direcciones verificadas.
El buzón de destino tiene que estar verificado como identidad, o el reenvío
falla aunque la recepción funcione. Salir del sandbox se pide desde
**Account dashboard → Request production access**.
