import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerUser, getUserByEmail, getUser } from "./auth";
import {
  insertCategorySchema,
  insertAssetSchema,
  insertAdUserSchema,
  ASSET_STATUSES,
} from "@shared/schema";
import { loginSchema, registerSchema, type UserRole } from "@shared/models/auth";
import { z } from "zod";
import { isLdapConfigured, syncAllUsers, testConnection as testLdapConnection, getLdapConfig, getUserRole } from "./ldap";

function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userRole = (req.user.role as UserRole) || "user";
    const isAdmin = req.user.isAdmin;
    
    if (isAdmin || allowedRoles.includes(userRole)) {
      return next();
    }
    
    return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
  };
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userRole = (req.user.role as UserRole) || "user";
  if (req.user.isAdmin || userRole === "admin") {
    return next();
  }
  
  return res.status(403).json({ message: "Forbidden: Admin access required" });
}

function canWrite(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userRole = (req.user.role as UserRole) || "user";
  if (userRole === "readonly") {
    return res.status(403).json({ message: "Forbidden: Read-only access" });
  }
  
  return next();
}

function getClientInfo(req: Request) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || "unknown",
    userAgent: req.get("user-agent") || "unknown",
  };
}

function getUserInfo(req: Request) {
  const user = req.user;
  return {
    userId: user?.id || null,
    userName: user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : user?.email || "System",
  };
}

function getChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  for (const key of Object.keys(newData)) {
    if (oldData[key] !== newData[key]) {
      changes.push({
        field: key,
        oldValue: oldData[key],
        newValue: newData[key],
      });
    }
  }

  return changes;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await registerUser(
        data.email,
        data.password,
        data.firstName,
        data.lastName
      );

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in after registration" });
        }
        res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    try {
      loginSchema.parse(req.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
    }

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((sessionErr) => {
        res.json({ success: true });
      });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = await getUser(req.user!.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "category",
        entityId: category.id,
        action: "create",
        userId,
        userName,
        newData: category as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getCategory(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Category not found" });
      }

      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, data);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "category",
        entityId: req.params.id,
        action: "update",
        userId,
        userName,
        previousData: existing as Record<string, unknown>,
        newData: category as Record<string, unknown>,
        changes: getChanges(existing as Record<string, unknown>, data as Record<string, unknown>),
        ipAddress,
        userAgent,
      });

      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getCategory(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Category not found" });
      }

      const deleted = await storage.deleteCategory(req.params.id);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "category",
        entityId: req.params.id,
        action: "delete",
        userId,
        userName,
        previousData: existing as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Assets
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssetsWithRelations();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertAssetSchema.parse(req.body);

      const existingAsset = await storage.getAssetByTag(data.assetTag);
      if (existingAsset) {
        return res.status(400).json({ message: "Asset tag already exists" });
      }

      const asset = await storage.createAsset(data);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "asset",
        entityId: asset.id,
        action: "create",
        userId,
        userName,
        newData: asset as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getAsset(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const data = insertAssetSchema.partial().parse(req.body);

      if (data.assetTag && data.assetTag !== existing.assetTag) {
        const existingAsset = await storage.getAssetByTag(data.assetTag);
        if (existingAsset) {
          return res.status(400).json({ message: "Asset tag already exists" });
        }
      }

      const asset = await storage.updateAsset(req.params.id, data);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "asset",
        entityId: req.params.id,
        action: "update",
        userId,
        userName,
        previousData: existing as Record<string, unknown>,
        newData: asset as Record<string, unknown>,
        changes: getChanges(existing as Record<string, unknown>, data as Record<string, unknown>),
        ipAddress,
        userAgent,
      });

      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating asset:", error);
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getAsset(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const deleted = await storage.deleteAsset(req.params.id);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "asset",
        entityId: req.params.id,
        action: "delete",
        userId,
        userName,
        previousData: existing as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // AD Users
  app.get("/api/ad-users", async (req, res) => {
    try {
      const users = await storage.getAdUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching AD users:", error);
      res.status(500).json({ message: "Failed to fetch AD users" });
    }
  });

  app.get("/api/ad-users/:id", async (req, res) => {
    try {
      const user = await storage.getAdUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching AD user:", error);
      res.status(500).json({ message: "Failed to fetch AD user" });
    }
  });

  app.post("/api/ad-users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertAdUserSchema.parse(req.body);
      const user = await storage.createAdUser(data);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "user",
        entityId: user.id,
        action: "create",
        userId,
        userName,
        newData: user as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating AD user:", error);
      res.status(500).json({ message: "Failed to create AD user" });
    }
  });

  app.patch("/api/ad-users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getAdUser(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "User not found" });
      }

      const data = insertAdUserSchema.partial().parse(req.body);
      const user = await storage.updateAdUser(req.params.id, data);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "user",
        entityId: req.params.id,
        action: "update",
        userId,
        userName,
        previousData: existing as Record<string, unknown>,
        newData: user as Record<string, unknown>,
        changes: getChanges(existing as Record<string, unknown>, data as Record<string, unknown>),
        ipAddress,
        userAgent,
      });

      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating AD user:", error);
      res.status(500).json({ message: "Failed to update AD user" });
    }
  });

  app.delete("/api/ad-users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getAdUser(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "User not found" });
      }

      const deleted = await storage.deleteAdUser(req.params.id);

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      await storage.createAuditLog({
        entityType: "user",
        entityId: req.params.id,
        action: "delete",
        userId,
        userName,
        previousData: existing as Record<string, unknown>,
        ipAddress,
        userAgent,
      });

      res.json({ success: deleted });
    } catch (error) {
      console.error("Error deleting AD user:", error);
      res.status(500).json({ message: "Failed to delete AD user" });
    }
  });

  app.post("/api/ad-users/sync", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      if (!isLdapConfigured()) {
        await storage.createAuditLog({
          entityType: "system",
          entityId: "ad-sync",
          action: "sync",
          userId,
          userName,
          newData: { action: "AD Sync triggered (LDAP not configured - simulated)" },
          ipAddress,
          userAgent,
        });
        return res.json({ 
          success: true, 
          message: "AD sync simulated (LDAP not configured). Configure LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, and LDAP_BIND_PASSWORD to enable real sync.",
          synced: 0,
          created: 0,
          updated: 0,
        });
      }

      const ldapUsers = await syncAllUsers();
      const config = getLdapConfig()!;
      
      let created = 0;
      let updated = 0;

      for (const ldapUser of ldapUsers) {
        const existingUser = await storage.getAdUserByEmail(ldapUser.email);
        
        const userData = {
          employeeId: ldapUser.employeeId || ldapUser.sAMAccountName,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          department: ldapUser.department || null,
          title: ldapUser.title || null,
          manager: ldapUser.manager || null,
          officeLocation: ldapUser.officeLocation || null,
          phone: ldapUser.phone || null,
          isActive: true,
        };

        if (existingUser) {
          await storage.updateAdUser(existingUser.id, userData);
          updated++;
        } else {
          await storage.createAdUser(userData);
          created++;
        }
      }

      await storage.createAuditLog({
        entityType: "system",
        entityId: "ad-sync",
        action: "sync",
        userId,
        userName,
        newData: { 
          action: "AD Sync completed", 
          totalUsers: ldapUsers.length,
          created,
          updated,
        },
        ipAddress,
        userAgent,
      });

      res.json({ 
        success: true, 
        message: `AD sync completed. ${created} users created, ${updated} users updated.`,
        synced: ldapUsers.length,
        created,
        updated,
      });
    } catch (error: any) {
      console.error("Error syncing AD:", error);
      res.status(500).json({ message: `Failed to sync AD: ${error.message}` });
    }
  });

  app.get("/api/ldap/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const configured = isLdapConfigured();
      if (!configured) {
        return res.json({
          configured: false,
          message: "LDAP not configured. Set LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, and LDAP_BIND_PASSWORD environment variables.",
        });
      }
      
      const result = await testLdapConnection();
      res.json({
        configured: true,
        connected: result.success,
        message: result.message,
        userCount: result.userCount,
      });
    } catch (error: any) {
      res.status(500).json({ 
        configured: isLdapConfigured(),
        connected: false,
        message: `Error testing LDAP connection: ${error.message}`,
      });
    }
  });

  // Audit Logs
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Import
  app.post("/api/import", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { rows, categoryId } = req.body;

      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ message: "Invalid import data" });
      }

      const { userId, userName } = getUserInfo(req);
      const { ipAddress, userAgent } = getClientInfo(req);

      let success = 0;
      let failed = 0;

      for (const row of rows) {
        try {
          if (!row.assetTag || !row.name) {
            failed++;
            continue;
          }

          const existingAsset = await storage.getAssetByTag(row.assetTag);
          if (existingAsset) {
            failed++;
            continue;
          }

          const status = row.status && ASSET_STATUSES.includes(row.status) ? row.status : "active";

          const assetData = {
            assetTag: row.assetTag,
            name: row.name,
            description: row.description || null,
            categoryId: categoryId || null,
            status,
            manufacturer: row.manufacturer || null,
            model: row.model || null,
            serialNumber: row.serialNumber || null,
            location: row.location || null,
            purchaseCost: row.purchaseCost || null,
            notes: row.notes || null,
          };

          const asset = await storage.createAsset(assetData);

          await storage.createAuditLog({
            entityType: "asset",
            entityId: asset.id,
            action: "create",
            userId,
            userName,
            newData: { ...asset, source: "import" } as Record<string, unknown>,
            ipAddress,
            userAgent,
          });

          success++;
        } catch (error) {
          console.error("Error importing row:", error);
          failed++;
        }
      }

      await storage.createAuditLog({
        entityType: "system",
        entityId: "import",
        action: "import",
        userId,
        userName,
        newData: { totalRows: rows.length, success, failed },
        ipAddress,
        userAgent,
      });

      res.json({ success, failed, total: rows.length });
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  return httpServer;
}
