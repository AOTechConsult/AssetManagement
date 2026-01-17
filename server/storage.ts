import {
  categories,
  assets,
  auditLogs,
  adUsers,
  importTemplates,
  type Category,
  type InsertCategory,
  type Asset,
  type InsertAsset,
  type AuditLog,
  type InsertAuditLog,
  type AdUser,
  type InsertAdUser,
  type ImportTemplate,
  type InsertImportTemplate,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, like, or } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(data: InsertCategory): Promise<Category>;
  updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Assets
  getAssets(): Promise<Asset[]>;
  getAssetsWithRelations(): Promise<(Asset & { category?: Category; assignedUser?: AdUser })[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(data: InsertAsset): Promise<Asset>;
  updateAsset(id: string, data: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  getAssetByTag(assetTag: string): Promise<Asset | undefined>;

  // Audit Logs
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;

  // AD Users
  getAdUsers(): Promise<AdUser[]>;
  getAdUser(id: string): Promise<AdUser | undefined>;
  getAdUserByEmail(email: string): Promise<AdUser | undefined>;
  createAdUser(data: InsertAdUser): Promise<AdUser>;
  updateAdUser(id: string, data: Partial<InsertAdUser>): Promise<AdUser | undefined>;
  deleteAdUser(id: string): Promise<boolean>;

  // Import Templates
  getImportTemplates(): Promise<ImportTemplate[]>;
  createImportTemplate(data: InsertImportTemplate): Promise<ImportTemplate>;

  // Stats
  getStats(): Promise<{
    totalAssets: number;
    activeAssets: number;
    totalCategories: number;
    totalUsers: number;
    recentChanges: number;
    assetsInMaintenance: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(data: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(data).returning();
    return category;
  }

  async updateCategory(id: string, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  // Assets
  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async getAssetsWithRelations(): Promise<(Asset & { category?: Category; assignedUser?: AdUser })[]> {
    const allAssets = await db.select().from(assets).orderBy(desc(assets.createdAt));
    const allCategories = await db.select().from(categories);
    const allUsers = await db.select().from(adUsers);

    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return allAssets.map((asset) => ({
      ...asset,
      category: asset.categoryId ? categoryMap.get(asset.categoryId) : undefined,
      assignedUser: asset.assignedUserId ? userMap.get(asset.assignedUserId) : undefined,
    }));
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async getAssetByTag(assetTag: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.assetTag, assetTag));
    return asset;
  }

  async createAsset(data: InsertAsset): Promise<Asset> {
    const [asset] = await db.insert(assets).values(data).returning();
    return asset;
  }

  async updateAsset(id: string, data: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return asset;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id)).returning();
    return result.length > 0;
  }

  // Audit Logs
  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data as any).returning();
    return log;
  }

  // AD Users
  async getAdUsers(): Promise<AdUser[]> {
    return await db.select().from(adUsers).orderBy(adUsers.displayName);
  }

  async getAdUser(id: string): Promise<AdUser | undefined> {
    const [user] = await db.select().from(adUsers).where(eq(adUsers.id, id));
    return user;
  }

  async getAdUserByEmail(email: string): Promise<AdUser | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(adUsers).where(eq(adUsers.email, email));
    return user;
  }

  async createAdUser(data: InsertAdUser): Promise<AdUser> {
    const [user] = await db.insert(adUsers).values(data).returning();
    return user;
  }

  async updateAdUser(id: string, data: Partial<InsertAdUser>): Promise<AdUser | undefined> {
    const [user] = await db
      .update(adUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(adUsers.id, id))
      .returning();
    return user;
  }

  async deleteAdUser(id: string): Promise<boolean> {
    const result = await db.delete(adUsers).where(eq(adUsers.id, id)).returning();
    return result.length > 0;
  }

  // Import Templates
  async getImportTemplates(): Promise<ImportTemplate[]> {
    return await db.select().from(importTemplates).orderBy(desc(importTemplates.createdAt));
  }

  async createImportTemplate(data: InsertImportTemplate): Promise<ImportTemplate> {
    const [template] = await db.insert(importTemplates).values(data).returning();
    return template;
  }

  // Stats
  async getStats() {
    const [assetStats] = await db
      .select({
        totalAssets: sql<number>`count(*)::int`,
        activeAssets: sql<number>`count(*) filter (where ${assets.status} = 'active')::int`,
        assetsInMaintenance: sql<number>`count(*) filter (where ${assets.status} = 'maintenance')::int`,
      })
      .from(assets);

    const [categoryStats] = await db
      .select({ totalCategories: sql<number>`count(*)::int` })
      .from(categories);

    const [userStats] = await db
      .select({ totalUsers: sql<number>`count(*)::int` })
      .from(adUsers);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentStats] = await db
      .select({ recentChanges: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(sql`${auditLogs.createdAt} >= ${sevenDaysAgo}`);

    return {
      totalAssets: assetStats?.totalAssets || 0,
      activeAssets: assetStats?.activeAssets || 0,
      totalCategories: categoryStats?.totalCategories || 0,
      totalUsers: userStats?.totalUsers || 0,
      recentChanges: recentStats?.recentChanges || 0,
      assetsInMaintenance: assetStats?.assetsInMaintenance || 0,
    };
  }
}

export const storage = new DatabaseStorage();
