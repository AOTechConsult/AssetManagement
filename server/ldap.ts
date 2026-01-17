import ldap from "ldapjs";

export interface LdapConfig {
  url: string;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  userSearchFilter: string;
  groupSearchFilter: string;
  adminGroupDN?: string;
  userGroupDN?: string;
  readOnlyGroupDN?: string;
}

export interface LdapUser {
  dn: string;
  employeeId: string;
  displayName: string;
  email: string;
  sAMAccountName: string;
  department?: string;
  title?: string;
  manager?: string;
  officeLocation?: string;
  phone?: string;
  memberOf: string[];
}

export function getLdapConfig(): LdapConfig | null {
  const url = process.env.LDAP_URL;
  const baseDN = process.env.LDAP_BASE_DN;
  const bindDN = process.env.LDAP_BIND_DN;
  const bindPassword = process.env.LDAP_BIND_PASSWORD;

  if (!url || !baseDN || !bindDN || !bindPassword) {
    return null;
  }

  return {
    url,
    baseDN,
    bindDN,
    bindPassword,
    userSearchFilter: process.env.LDAP_USER_FILTER || "(objectClass=user)",
    groupSearchFilter: process.env.LDAP_GROUP_FILTER || "(objectClass=group)",
    adminGroupDN: process.env.LDAP_ADMIN_GROUP_DN,
    userGroupDN: process.env.LDAP_USER_GROUP_DN,
    readOnlyGroupDN: process.env.LDAP_READONLY_GROUP_DN,
  };
}

export function isLdapConfigured(): boolean {
  return getLdapConfig() !== null;
}

function createClient(config: LdapConfig): Promise<ldap.Client> {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({
      url: config.url,
      timeout: 10000,
      connectTimeout: 10000,
    });

    client.on("error", (err) => {
      reject(err);
    });

    client.bind(config.bindDN, config.bindPassword, (err) => {
      if (err) {
        client.destroy();
        reject(err);
      } else {
        resolve(client);
      }
    });
  });
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<LdapUser | null> {
  const config = getLdapConfig();
  if (!config) {
    throw new Error("LDAP not configured");
  }

  let client: ldap.Client | null = null;

  try {
    client = await createClient(config);

    const userDN = await findUserDN(client, config, username);
    if (!userDN) {
      return null;
    }

    await new Promise<void>((resolve, reject) => {
      client!.bind(userDN, password, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    client.destroy();
    client = await createClient(config);

    const user = await getUserDetails(client, config, userDN);
    return user;
  } catch (error) {
    console.error("LDAP authentication error:", error);
    return null;
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

async function findUserDN(
  client: ldap.Client,
  config: LdapConfig,
  username: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const searchFilter = `(&${config.userSearchFilter}(|(sAMAccountName=${username})(userPrincipalName=${username})(mail=${username})))`;

    client.search(
      config.baseDN,
      {
        filter: searchFilter,
        scope: "sub",
        attributes: ["dn"],
      },
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        let userDN: string | null = null;

        res.on("searchEntry", (entry) => {
          userDN = entry.dn.toString();
        });

        res.on("error", (err) => {
          reject(err);
        });

        res.on("end", () => {
          resolve(userDN);
        });
      }
    );
  });
}

async function getUserDetails(
  client: ldap.Client,
  config: LdapConfig,
  userDN: string
): Promise<LdapUser | null> {
  return new Promise((resolve, reject) => {
    client.search(
      userDN,
      {
        scope: "base",
        attributes: [
          "employeeID",
          "displayName",
          "mail",
          "sAMAccountName",
          "department",
          "title",
          "manager",
          "physicalDeliveryOfficeName",
          "telephoneNumber",
          "memberOf",
        ],
      },
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        let user: LdapUser | null = null;

        res.on("searchEntry", (entry) => {
          const entryAny = entry as any;
          const attrs = entryAny.ppiAttributes || entry.attributes;
          const getAttribute = (name: string): string => {
            const attr = attrs?.find?.((a: any) => a.type === name);
            if (attr?.values?.[0]) return attr.values[0];
            const entryObj = entryAny.object || entryAny.pojo?.attributes || {};
            return entryObj[name] || "";
          };

          const getMemberOf = (): string[] => {
            const attr = attrs?.find?.((a: any) => a.type === "memberOf");
            if (attr?.values) return attr.values;
            const entryObj = entryAny.object || entryAny.pojo?.attributes || {};
            const memberOf = entryObj.memberOf;
            if (Array.isArray(memberOf)) return memberOf;
            if (memberOf) return [memberOf];
            return [];
          };

          user = {
            dn: userDN,
            employeeId: getAttribute("employeeID"),
            displayName: getAttribute("displayName"),
            email: getAttribute("mail"),
            sAMAccountName: getAttribute("sAMAccountName"),
            department: getAttribute("department"),
            title: getAttribute("title"),
            manager: getAttribute("manager"),
            officeLocation: getAttribute("physicalDeliveryOfficeName"),
            phone: getAttribute("telephoneNumber"),
            memberOf: getMemberOf(),
          };
        });

        res.on("error", (err) => {
          reject(err);
        });

        res.on("end", () => {
          resolve(user);
        });
      }
    );
  });
}

export async function syncAllUsers(): Promise<LdapUser[]> {
  const config = getLdapConfig();
  if (!config) {
    throw new Error("LDAP not configured");
  }

  let client: ldap.Client | null = null;

  try {
    client = await createClient(config);

    return new Promise((resolve, reject) => {
      const users: LdapUser[] = [];
      const searchFilter = `(&${config.userSearchFilter}(!(userAccountControl:1.2.840.113556.1.4.803:=2)))`;

      client!.search(
        config.baseDN,
        {
          filter: searchFilter,
          scope: "sub",
          attributes: [
            "dn",
            "employeeID",
            "displayName",
            "mail",
            "sAMAccountName",
            "department",
            "title",
            "manager",
            "physicalDeliveryOfficeName",
            "telephoneNumber",
            "memberOf",
          ],
          paged: true,
        },
        (err, res) => {
          if (err) {
            reject(err);
            return;
          }

          res.on("searchEntry", (entry) => {
            const entryAny = entry as any;
            const attrs = entryAny.ppiAttributes || entry.attributes;
            const getAttribute = (name: string): string => {
              const attr = attrs?.find?.((a: any) => a.type === name);
              if (attr?.values?.[0]) return attr.values[0];
              const entryObj = entryAny.object || entryAny.pojo?.attributes || {};
              return entryObj[name] || "";
            };

            const getMemberOf = (): string[] => {
              const attr = attrs?.find?.((a: any) => a.type === "memberOf");
              if (attr?.values) return attr.values;
              const entryObj = entryAny.object || entryAny.pojo?.attributes || {};
              const memberOf = entryObj.memberOf;
              if (Array.isArray(memberOf)) return memberOf;
              if (memberOf) return [memberOf];
              return [];
            };

            const user: LdapUser = {
              dn: entry.dn.toString(),
              employeeId: getAttribute("employeeID"),
              displayName: getAttribute("displayName"),
              email: getAttribute("mail"),
              sAMAccountName: getAttribute("sAMAccountName"),
              department: getAttribute("department"),
              title: getAttribute("title"),
              manager: getAttribute("manager"),
              officeLocation: getAttribute("physicalDeliveryOfficeName"),
              phone: getAttribute("telephoneNumber"),
              memberOf: getMemberOf(),
            };

            if (user.displayName && (user.email || user.sAMAccountName)) {
              users.push(user);
            }
          });

          res.on("error", (err) => {
            reject(err);
          });

          res.on("end", () => {
            resolve(users);
          });
        }
      );
    });
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

export function getUserRole(
  user: LdapUser,
  config: LdapConfig
): "admin" | "user" | "readonly" {
  const memberOfLower = user.memberOf.map((g) => g.toLowerCase());

  if (config.adminGroupDN) {
    if (memberOfLower.some((g) => g.includes(config.adminGroupDN!.toLowerCase()))) {
      return "admin";
    }
  }

  if (config.readOnlyGroupDN) {
    if (memberOfLower.some((g) => g.includes(config.readOnlyGroupDN!.toLowerCase()))) {
      return "readonly";
    }
  }

  return "user";
}

export async function testConnection(): Promise<{ success: boolean; message: string; userCount?: number }> {
  const config = getLdapConfig();
  if (!config) {
    return { success: false, message: "LDAP not configured. Set LDAP_URL, LDAP_BASE_DN, LDAP_BIND_DN, and LDAP_BIND_PASSWORD environment variables." };
  }

  let client: ldap.Client | null = null;

  try {
    client = await createClient(config);
    
    const users = await syncAllUsers();
    
    return {
      success: true,
      message: `Successfully connected to LDAP server. Found ${users.length} users.`,
      userCount: users.length,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to connect to LDAP: ${error.message}`,
    };
  } finally {
    if (client) {
      client.destroy();
    }
  }
}
