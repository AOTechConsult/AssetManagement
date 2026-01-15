import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// Asset Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  icon: text("icon").default("folder"),
  color: text("color").default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  assets: many(assets),
}));

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Active Directory Users (simulated)
export const adUsers = pgTable("ad_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: text("employee_id").unique(),
  displayName: text("display_name").notNull(),
  email: text("email").unique(),
  department: text("department"),
  title: text("title"),
  manager: text("manager"),
  officeLocation: text("office_location"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const adUsersRelations = relations(adUsers, ({ many }) => ({
  assets: many(assets),
}));

export const insertAdUserSchema = createInsertSchema(adUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertAdUser = z.infer<typeof insertAdUserSchema>;
export type AdUser = typeof adUsers.$inferSelect;

// Assets
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetTag: text("asset_tag").unique().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  assignedUserId: varchar("assigned_user_id").references(() => adUsers.id),
  status: text("status").default("active").notNull(),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: timestamp("purchase_date"),
  purchaseCost: text("purchase_cost"),
  warrantyExpiry: timestamp("warranty_expiry"),
  location: text("location"),
  notes: text("notes"),
  customFields: jsonb("custom_fields").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_assets_category").on(table.categoryId),
  index("idx_assets_user").on(table.assignedUserId),
  index("idx_assets_status").on(table.status),
]);

export const assetsRelations = relations(assets, ({ one, many }) => ({
  category: one(categories, {
    fields: [assets.categoryId],
    references: [categories.id],
  }),
  assignedUser: one(adUsers, {
    fields: [assets.assignedUserId],
    references: [adUsers.id],
  }),
  auditLogs: many(auditLogs),
}));

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(),
  userId: varchar("user_id"),
  userName: text("user_name"),
  previousData: jsonb("previous_data").$type<Record<string, unknown>>(),
  newData: jsonb("new_data").$type<Record<string, unknown>>(),
  changes: jsonb("changes").$type<Array<{ field: string; oldValue: unknown; newValue: unknown }>>(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_user").on(table.userId),
  index("idx_audit_created").on(table.createdAt),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  asset: one(assets, {
    fields: [auditLogs.entityId],
    references: [assets.id],
  }),
}));

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Import Templates (for saving header mappings)
export const importTemplates = pgTable("import_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mappings: jsonb("mappings").$type<Record<string, string>>().notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertImportTemplateSchema = createInsertSchema(importTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImportTemplate = z.infer<typeof insertImportTemplateSchema>;
export type ImportTemplate = typeof importTemplates.$inferSelect;

// Asset statuses enum
export const ASSET_STATUSES = [
  "active",
  "inactive", 
  "maintenance",
  "retired",
  "disposed",
  "lost",
  "stolen",
] as const;

export type AssetStatus = typeof ASSET_STATUSES[number];

// Standard asset fields for import mapping
export const ASSET_FIELDS = [
  { key: "assetTag", label: "Asset Tag", required: true },
  { key: "name", label: "Name", required: true },
  { key: "description", label: "Description", required: false },
  { key: "manufacturer", label: "Manufacturer", required: false },
  { key: "model", label: "Model", required: false },
  { key: "serialNumber", label: "Serial Number", required: false },
  { key: "purchaseDate", label: "Purchase Date", required: false },
  { key: "purchaseCost", label: "Purchase Cost", required: false },
  { key: "warrantyExpiry", label: "Warranty Expiry", required: false },
  { key: "location", label: "Location", required: false },
  { key: "status", label: "Status", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

export type AssetFieldKey = typeof ASSET_FIELDS[number]["key"];
