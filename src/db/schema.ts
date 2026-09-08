import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp as pgTimestamp,
} from "drizzle-orm/pg-core";

// All instants are stored as timestamptz. Comparing a timestamp-without-tz
// column against now() reinterprets the stored value in the session timezone,
// which silently breaks scheduling queries (e.g. "reminders due now").
// timestamptz keeps absolute instants unambiguous.
const timestamp = (name: string) => pgTimestamp(name, { withTimezone: true });

// ---------------------------------------------------------------------------
// Better-Auth tables (user/session/account/verification)
// `user` extended with sender data: reminders go out in the freelancer's name.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  senderName: text("sender_name"),
  emailSignature: text("email_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Rate limiting de Better-Auth (storage: "database"): una fila por clave
// (IP + ruta). En serverless el storage en memoria es por instancia y no
// frena un ataque distribuido entre instancias; la BD sí. lastRequest en ms.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key"),
  count: integer("count"),
  lastRequest: bigint("last_request", { mode: "number" }),
});

// Limitador propio de ventana fija para server actions (p. ej. el formulario
// de soporte, que dispara emails). Una fila por clave lógica ("support:userId").
export const appRateLimits = pgTable("app_rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at").notNull(),
});

// ---------------------------------------------------------------------------
// Cobra domain
// ---------------------------------------------------------------------------

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "overdue",
  "paid",
  "written_off",
]);

export const reminderTone = pgEnum("reminder_tone", [
  "friendly",
  "neutral",
  "firm",
  "final",
]);

export const domainStatus = pgEnum("domain_status", [
  "pending",
  "verified",
  "failed",
]);

export const plan = pgEnum("plan", ["free", "autonomo", "estudio"]);

// Una "marca" (Estudio: hasta N) = empresa + remitente. Todo usuario tiene una
// marca por defecto (su propia identidad), creada al primer uso. Los
// recordatorios de una factura salen con el remitente de su marca.
export const brands = pgTable(
  "brands",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // nombre comercial
    senderName: text("sender_name"), // "De:" en el correo; fallback user.name
    replyTo: text("reply_to"), // fallback user.email
    signature: text("signature"),
    logoUrl: text("logo_url"),
    // Toggle por marca: texto plano "personal" vs plantilla HTML con logo.
    htmlEmails: boolean("html_emails").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("brands_user_idx").on(t.userId)],
);

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // null = marca por defecto del usuario (filas antiguas y planes de 1 marca).
    brandId: text("brand_id").references(() => brands.id, {
      onDelete: "set null",
    }),
    company: text("company").notNull(),
    contactName: text("contact_name"),
    billingEmail: text("billing_email").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("clients_user_idx").on(t.userId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    // Cents. Avoids float rounding on money.
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    issuedAt: timestamp("issued_at").notNull(),
    dueAt: timestamp("due_at").notNull(),
    status: invoiceStatus("status").notNull().default("draft"),
    pdfUrl: text("pdf_url"),
    sequenceId: text("sequence_id").references(() => sequences.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("invoices_user_idx").on(t.userId),
    index("invoices_status_idx").on(t.status),
  ],
);

export const sequences = pgTable(
  "sequences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("sequences_user_idx").on(t.userId)],
);

export const sequenceSteps = pgTable(
  "sequence_steps",
  {
    id: text("id").primaryKey(),
    sequenceId: text("sequence_id")
      .notNull()
      .references(() => sequences.id, { onDelete: "cascade" }),
    // Days relative to due date: -3 (before), 0 (day of), +7, +15...
    offsetDays: integer("offset_days").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    tone: reminderTone("tone").notNull().default("neutral"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sequence_steps_sequence_idx").on(t.sequenceId)],
);

// Materialized when the invoice is created; the hourly cron only queries
// "scheduled_at <= now AND sent_at IS NULL". Simple, idempotent, debuggable.
export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    sequenceStepId: text("sequence_step_id")
      .notNull()
      .references(() => sequenceSteps.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at").notNull(),
    sentAt: timestamp("sent_at"),
    openedAt: timestamp("opened_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("reminders_due_idx").on(t.scheduledAt, t.sentAt)],
);

export const emailDomains = pgTable(
  "email_domains",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    status: domainStatus("status").notNull().default("pending"),
    resendDomainId: text("resend_domain_id"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("email_domains_user_idx").on(t.userId)],
);

// Audit trail: reminder_sent, reminder_opened, invoice_paid, email_bounced...
export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    invoiceId: text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    reminderId: text("reminder_id").references(() => reminders.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_user_idx").on(t.userId, t.createdAt)],
);

// One row per user. Absence (or plan="free") means the free tier. Stripe fields
// are filled by the checkout flow + webhook.
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  plan: plan("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Correo capturado por una herramienta pública (hoy, la calculadora de
// intereses). Tabla propia y no `events` por dos razones: allí `user_id` es
// NOT NULL y aquí, por definición, todavía no hay cuenta —ese es justo el
// punto de un lead—, y porque el importe calculado es la cualificación del
// contacto, no un dato de auditoría.
export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    // Único: si la misma persona vuelve a calcular, se actualiza su fila. Dos
    // filas del mismo correo contarían como dos leads y falsearían el coste
    // por lead de la campaña.
    email: text("email").notNull().unique(),
    source: text("source").notNull(),
    // Lo que acababa de calcular. Un impago de 8.000 € y otro de 200 € no son
    // el mismo contacto aunque los dos dejen el correo.
    amountCents: integer("amount_cents"),
    claimableCents: integer("claimable_cents"),
    dueDate: timestamp("due_date"),
    // De qué anuncio vino, con la misma forma que `Campana` de @/lib/meta.
    campana: jsonb("campana"),
    // Se rellenan cuando el lead acaba abriendo cuenta: es lo que convierte la
    // tabla en un embudo medible y no en una lista de correos suelta.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    convertedAt: timestamp("converted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);

// ---------------------------------------------------------------------------
// Generador de burofax
// ---------------------------------------------------------------------------

// El burofax que alguien acaba de generar en la web pública, guardado el
// tiempo justo para que pueda reclamarlo desde otro dispositivo: genera el PDF
// en el móvil y abre el enlace del correo en el portátil.
//
// Contiene datos personales de un tercero —el deudor— que nunca ha visitado
// Cobra, así que el payload va cifrado (AES-256-GCM, src/lib/burofax/crypto.ts)
// y la fila se borra al reclamarla o al caducar. Antes de que el usuario deje
// su correo no se escribe nada aquí: hasta ese momento el flujo es anónimo de
// verdad y los datos del deudor viven solo en su navegador.
export const burofaxDrafts = pgTable(
  "burofax_drafts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    payload: text("payload").notNull(),
    iv: text("iv").notNull(),
    // Lo que viaja en el enlace del correo y en el botón de la página de
    // éxito. Es el mismo para los dos: quien pulse en cualquiera de ellos
    // acaba en la misma cuenta en vez de crear dos registros.
    claimToken: text("claim_token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    claimedAt: timestamp("claimed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("burofax_drafts_expira_idx").on(t.expiresAt)],
);

export const ownerAlertKind = pgEnum("owner_alert_kind", [
  // Vence el plazo que la carta le dio al deudor para pagar.
  "burofax_plazo",
  // Se abre la ventana para modificar la base imponible y recuperar el IVA.
  "iva_apertura",
  // Se cierra esa ventana. Pasada, el IVA adelantado no se recupera.
  "iva_cierre",
  // Ha pasado un mes desde el plazo sin noticias: toca decidir si monitorio.
  "monitorio",
  // Se acerca de nuevo la prescripción interrumpida por este burofax.
  "prescripcion",
]);

// Avisos que Cobra le manda AL USUARIO sobre sus propios plazos legales.
//
// Tabla aparte de `reminders` a propósito, y esto no es duplicación: los
// recordatorios escriben al DEUDOR en nombre del usuario y desde su dominio.
// Un aviso que se colara por ese camino le mandaría a alguien que acaba de
// recibir un burofax un correo que su acreedor no ha visto. La separación
// física de las tablas y de los envíos es lo que hace ese error imposible.
export const ownerAlerts = pgTable(
  "owner_alerts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    kind: ownerAlertKind("kind").notNull(),
    scheduledAt: timestamp("scheduled_at").notNull(),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("owner_alerts_due_idx").on(t.scheduledAt, t.sentAt),
    index("owner_alerts_user_idx").on(t.userId),
  ],
);
