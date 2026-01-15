import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Link2,
  Sparkles,
} from "lucide-react";
import { ASSET_FIELDS } from "@shared/schema";
import type { Category } from "@shared/schema";

type ImportStep = "upload" | "mapping" | "preview" | "importing" | "complete";

interface ParsedData {
  headers: string[];
  rows: string[][];
}

interface FieldMapping {
  [spreadsheetColumn: string]: string;
}

interface MappingSuggestion {
  field: string;
  confidence: number;
}

const SIMILARITY_THRESHOLD = 0.4;

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[_\-\s]/g, "");
  const s2 = str2.toLowerCase().replace(/[_\-\s]/g, "");

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  let matches = 0;
  const shorter = s1.length < s2.length ? s1 : s2;
  const longer = s1.length < s2.length ? s2 : s1;

  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }

  return matches / longer.length;
}

function suggestMapping(header: string): MappingSuggestion {
  let bestMatch = { field: "", confidence: 0 };

  for (const field of ASSET_FIELDS) {
    const labelSim = calculateSimilarity(header, field.label);
    const keySim = calculateSimilarity(header, field.key);
    const maxSim = Math.max(labelSim, keySim);

    if (maxSim > bestMatch.confidence) {
      bestMatch = { field: field.key, confidence: maxSim };
    }
  }

  return bestMatch.confidence >= SIMILARITY_THRESHOLD ? bestMatch : { field: "", confidence: 0 };
}

function StepIndicator({ currentStep, steps }: { currentStep: ImportStep; steps: ImportStep[] }) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              index < currentIndex
                ? "bg-primary text-primary-foreground"
                : index === currentIndex
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentIndex ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ImportPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mappings, setMappings] = useState<FieldMapping>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");

  const parseCSV = useCallback((text: string): ParsedData => {
    const lines = text.split("\n").filter((line) => line.trim());
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      return values;
    });

    return { headers, rows };
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = e.target.files?.[0];
      if (!uploadedFile) return;

      if (!uploadedFile.name.endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }

      setFile(uploadedFile);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        setParsedData(data);

        const autoMappings: FieldMapping = {};
        data.headers.forEach((header) => {
          const suggestion = suggestMapping(header);
          if (suggestion.field) {
            autoMappings[header] = suggestion.field;
          }
        });
        setMappings(autoMappings);

        setStep("mapping");
      };
      reader.readAsText(uploadedFile);
    },
    [parseCSV, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        const fakeEvent = {
          target: { files: [droppedFile] },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileUpload(fakeEvent);
      }
    },
    [handleFileUpload]
  );

  const importMutation = useMutation({
    mutationFn: async (data: { rows: Record<string, string>[]; categoryId?: string }) => {
      return apiRequest("POST", "/api/import", data);
    },
    onSuccess: (data: any) => {
      setImportResults({ success: data.success || 0, failed: data.failed || 0 });
      setStep("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      setStep("preview");
    },
  });

  const handleImport = () => {
    if (!parsedData) return;

    setStep("importing");
    setImportProgress(0);

    const mappedRows = parsedData.rows.map((row) => {
      const mappedRow: Record<string, string> = {};
      parsedData.headers.forEach((header, index) => {
        const targetField = mappings[header];
        if (targetField) {
          mappedRow[targetField] = row[index] || "";
        }
      });
      return mappedRow;
    });

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    importMutation.mutate({
      rows: mappedRows,
      categoryId: selectedCategoryId !== "none" ? selectedCategoryId : undefined,
    });
  };

  const resetImport = () => {
    setStep("upload");
    setFile(null);
    setParsedData(null);
    setMappings({});
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    setSelectedCategoryId("none");
  };

  const steps: ImportStep[] = ["upload", "mapping", "preview", "importing", "complete"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Data</h1>
        <p className="text-muted-foreground">
          Upload a spreadsheet to bulk import assets
        </p>
      </div>

      <StepIndicator currentStep={step} steps={steps} />

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Spreadsheet</CardTitle>
            <CardDescription>
              Upload a CSV file containing your asset data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                data-testid="input-file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      CSV files only
                    </p>
                  </div>
                  <Button type="button" variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Select File
                  </Button>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && parsedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Map Columns
                </CardTitle>
                <CardDescription>
                  Map your spreadsheet columns to asset fields
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3 w-3" />
                Auto-mapped {Object.keys(mappings).length} fields
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Default Category (optional)</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-[300px]" data-testid="select-import-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Spreadsheet Column</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Map To Field</TableHead>
                    <TableHead>Sample Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.headers.map((header, index) => {
                    const suggestion = suggestMapping(header);
                    const currentMapping = mappings[header];

                    return (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentMapping || "skip"}
                            onValueChange={(value) =>
                              setMappings({
                                ...mappings,
                                [header]: value === "skip" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger
                              className={`w-[200px] ${
                                suggestion.confidence > 0.7 && currentMapping
                                  ? "border-green-500"
                                  : ""
                              }`}
                              data-testid={`select-mapping-${index}`}
                            >
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Skip this column</SelectItem>
                              {ASSET_FIELDS.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                  {field.required && " *"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {parsedData.rows[0]?.[index] || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetImport}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={() => setStep("preview")} data-testid="button-continue-preview">
                Continue to Preview
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview Import</CardTitle>
            <CardDescription>
              Review the data before importing ({parsedData.rows.length} rows)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {ASSET_FIELDS.filter((f) =>
                      Object.values(mappings).includes(f.key)
                    ).map((field) => (
                      <TableHead key={field.key}>{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {ASSET_FIELDS.filter((f) =>
                        Object.values(mappings).includes(f.key)
                      ).map((field) => {
                        const headerIndex = parsedData.headers.findIndex(
                          (h) => mappings[h] === field.key
                        );
                        return (
                          <TableCell key={field.key}>
                            {headerIndex >= 0 ? row[headerIndex] : "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedData.rows.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing 5 of {parsedData.rows.length} rows
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back to Mapping
              </Button>
              <Button onClick={handleImport} data-testid="button-start-import">
                Import {parsedData.rows.length} Assets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">Importing Assets...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we process your data
                </p>
              </div>
              <Progress value={importProgress} className="w-[300px]" />
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">Import Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your assets have been imported successfully
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {importResults.success}
                  </p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                {importResults.failed > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-500">
                      {importResults.failed}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetImport}>
                  Import More
                </Button>
                <Button asChild>
                  <a href="/assets">View Assets</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
