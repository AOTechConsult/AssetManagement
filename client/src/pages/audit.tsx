import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import type { AuditLog } from "@shared/schema";

const ACTION_BADGES: Record<string, { class: string; icon: React.ElementType }> = {
  create: { class: "bg-green-500/10 text-green-600", icon: CheckCircle },
  update: { class: "bg-blue-500/10 text-blue-600", icon: RefreshCw },
  delete: { class: "bg-red-500/10 text-red-600", icon: XCircle },
};

function ChangeDetailDialog({
  log,
  open,
  onOpenChange,
}: {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            {log.action.charAt(0).toUpperCase() + log.action.slice(1)} action on {log.entityType}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                <p className="mt-1">
                  {log.createdAt
                    ? format(new Date(log.createdAt), "PPpp")
                    : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">User</p>
                <p className="mt-1">{log.userName || "System"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Action</p>
                <Badge className={ACTION_BADGES[log.action]?.class || "bg-gray-500/10"}>
                  {log.action}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entity</p>
                <p className="mt-1 capitalize">{log.entityType}</p>
              </div>
              {log.ipAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                  <p className="mt-1 font-mono text-sm">{log.ipAddress}</p>
                </div>
              )}
            </div>

            {log.changes && log.changes.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Changes</p>
                <div className="space-y-2">
                  {log.changes.map((change, idx) => (
                    <div key={idx} className="rounded-md border p-3">
                      <p className="text-sm font-medium capitalize">{change.field}</p>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Previous</p>
                          <p className="mt-1 text-sm font-mono bg-red-500/5 p-2 rounded">
                            {String(change.oldValue) || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">New</p>
                          <p className="mt-1 text-sm font-mono bg-green-500/5 p-2 rounded">
                            {String(change.newValue) || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {log.newData && log.action === "create" && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Created Data</p>
                <pre className="text-sm font-mono bg-muted p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(log.newData, null, 2)}
                </pre>
              </div>
            )}

            {log.previousData && log.action === "delete" && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Deleted Data</p>
                <pre className="text-sm font-mono bg-muted p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(log.previousData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all changes to your assets and data</p>
        </div>
        <Button variant="outline" data-testid="button-export-audit">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-audit"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-filter-action">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-filter-entity">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="asset">Assets</SelectItem>
                  <SelectItem value="category">Categories</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const ActionIcon = ACTION_BADGES[log.action]?.icon || Clock;
                    return (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell className="font-mono text-sm">
                          {log.createdAt
                            ? format(new Date(log.createdAt), "MMM d, yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell>{log.userName || "System"}</TableCell>
                        <TableCell>
                          <Badge className={ACTION_BADGES[log.action]?.class || "bg-gray-500/10"}>
                            <ActionIcon className="mr-1.5 h-3 w-3" />
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.entityType}</TableCell>
                        <TableCell className="font-mono text-sm">{log.entityId.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(log)}
                            data-testid={`button-view-audit-${log.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No audit logs found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || actionFilter !== "all" || entityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Changes to assets will be logged here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangeDetailDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}
