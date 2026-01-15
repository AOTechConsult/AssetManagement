import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  FolderTree,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Category, InsertCategory } from "@shared/schema";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!category;

  const [formData, setFormData] = useState<Partial<InsertCategory>>({
    name: category?.name || "",
    description: category?.description || "",
    color: category?.color || COLORS[0],
    icon: category?.icon || "folder",
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InsertCategory>) => {
      return apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Category created successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertCategory>) => {
      return apiRequest("PATCH", `/api/categories/${category?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Success", description: "Category updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Category" : "Add New Category"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the category details below"
              : "Create a new category to organize assets"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Laptops"
                required
                data-testid="input-category-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Category description..."
                data-testid="input-category-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-md border-2 transition-all ${
                      formData.color === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                    data-testid={`button-color-${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-category">
              {isPending ? "Saving..." : isEditing ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Category deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedCategory(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-muted-foreground">Organize assets into categories</p>
        </div>
        <Button onClick={handleAdd} data-testid="button-add-category">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted mb-2" />
                    <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="hover-elevate" data-testid={`card-category-${category.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <FolderTree
                        className="h-5 w-5"
                        style={{ color: category.color || "#3b82f6" }}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {category.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-menu-category-${category.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(category)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deleteMutation.mutate(category.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderTree className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No categories yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Create categories to organize your assets
            </p>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      )}

      <CategoryFormDialog
        category={selectedCategory}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
