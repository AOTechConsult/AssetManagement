import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  FolderTree,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Asset, Category, AdUser, AuditLog } from "@shared/schema";

interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  totalCategories: number;
  totalUsers: number;
  recentChanges: number;
  assetsInMaintenance: number;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp
              className={`h-3 w-3 ${trend.isPositive ? "text-green-500" : "text-red-500"}`}
            />
            <span
              className={`text-xs ${trend.isPositive ? "text-green-500" : "text-red-500"}`}
            >
              {trend.isPositive ? "+" : ""}{trend.value}% from last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityItem({
  action,
  entityType,
  userName,
  createdAt,
}: {
  action: string;
  entityType: string;
  userName: string | null;
  createdAt: string | null;
}) {
  const getActionIcon = () => {
    switch (action) {
      case "create":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "update":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "delete":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = () => {
    switch (action) {
      case "create":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Created</Badge>;
      case "update":
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Updated</Badge>;
      case "delete":
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <div className="flex items-center gap-4 py-3">
      {getActionIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{entityType}</span>
          {getActionBadge()}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          by {userName || "System"} {createdAt && `• ${new Date(createdAt).toLocaleDateString()}`}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentLogs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", { limit: 5 }],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your IT asset inventory
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assets"
          value={stats?.totalAssets ?? 0}
          description={`${stats?.activeAssets ?? 0} active`}
          icon={Package}
          loading={statsLoading}
        />
        <StatCard
          title="Categories"
          value={stats?.totalCategories ?? 0}
          description="Asset categories"
          icon={FolderTree}
          loading={statsLoading}
        />
        <StatCard
          title="AD Users"
          value={stats?.totalUsers ?? 0}
          description="Synced from Active Directory"
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="In Maintenance"
          value={stats?.assetsInMaintenance ?? 0}
          description="Assets under maintenance"
          icon={AlertTriangle}
          loading={statsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest changes to your assets</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentLogs && recentLogs.length > 0 ? (
              <div className="divide-y">
                {recentLogs.map((log) => (
                  <RecentActivityItem
                    key={log.id}
                    action={log.action}
                    entityType={log.entityType}
                    userName={log.userName}
                    createdAt={log.createdAt?.toString() ?? null}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Changes to assets will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assets by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {categories && categories.length > 0 ? (
              <div className="space-y-3">
                {categories.slice(0, 6).map((category) => (
                  <div key={category.id} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color || "#3b82f6" }}
                    />
                    <span className="flex-1 text-sm">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      0 assets
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderTree className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No categories yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create categories to organize assets
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
