import {
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

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
