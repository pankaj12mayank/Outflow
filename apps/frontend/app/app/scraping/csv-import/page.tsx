"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { useParseCSV, useImportCSV } from "@/app/hooks/use-scraping";
import { toast } from "@/app/components/toast";
import { PageError } from "@/app/components/page-state";

type DetectedColumn = {
  name: string;
  sample: string[];
  type: string;
  confidence: number;
};

const fieldOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "name", label: "Full Name" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "company", label: "Company" },
  { value: "website", label: "Website" },
  { value: "job_title", label: "Job Title" },
  { value: "linkedin_url", label: "LinkedIn" },
  { value: "ignore", label: "Ignore Column" },
];

function guessColumnType(name: string): { type: string; confidence: number } {
  const n = name.toLowerCase();
  if (n.includes("email")) return { type: "email", confidence: 0.95 };
  if (n.includes("phone") || n.includes("mobile")) return { type: "phone", confidence: 0.9 };
  if (n.includes("url") || n.includes("website")) return { type: "url", confidence: 0.85 };
  if (n.includes("name")) return { type: "text", confidence: 0.8 };
  if (n.includes("company")) return { type: "text", confidence: 0.75 };
  return { type: "text", confidence: 0.6 };
}

function autoMapColumn(colName: string): string {
  const n = colName.toLowerCase();
  if (n.includes("email")) return "email";
  if (n.includes("phone")) return "phone";
  if (n === "name" || n.includes("full_name")) return "name";
  if (n.includes("first")) return "first_name";
  if (n.includes("last")) return "last_name";
  if (n.includes("company")) return "company";
  if (n.includes("website") || n.includes("url")) return "website";
  if (n.includes("title") || n.includes("job")) return "job_title";
  if (n.includes("linkedin")) return "linkedin_url";
  return "";
}

export default function CSVImportPage() {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [columns, setColumns] = useState<DetectedColumn[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{ imported: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseMutation = useParseCSV();
  const importMutation = useImportCSV();

  const processFile = useCallback(
    async (selected: File) => {
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        toast.error("Invalid file", "Please upload a .csv file.");
        return;
      }
      setFile(selected);
      setFileName(selected.name);
      setImportResult(null);

      try {
        const data = await parseMutation.mutateAsync(selected);
        const cols = (data.columns as string[]) || [];
        const preview = (data.preview as Record<string, string>[]) || [];
        setTotalRows(data.total_rows ?? preview.length);
        setPreviewRows(preview);

        const detected: DetectedColumn[] = cols.map((name) => {
          const { type, confidence } = guessColumnType(name);
          const sample = preview
            .slice(0, 2)
            .map((row) => String(row[name] ?? ""))
            .filter(Boolean);
          return { name, sample, type, confidence };
        });
        setColumns(detected);

        const auto: Record<string, string> = {};
        cols.forEach((name) => {
          const mapped = autoMapColumn(name);
          if (mapped) auto[name] = mapped;
        });
        setMappings(auto);
        setStep("mapping");
      } catch (e: any) {
        toast.error("Parse failed", e?.response?.data?.detail || e?.message || "Could not parse CSV");
        setFile(null);
        setFileName(null);
      }
    },
    [parseMutation]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) processFile(files[0]);
    },
    [processFile]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const handleMappingChange = (column: string, field: string) => {
    setMappings((prev) => ({ ...prev, [column]: field }));
  };

  const canProceed =
    Object.keys(mappings).length >= 1 && Object.values(mappings).some((v) => v && v !== "ignore");

  const handleImport = async () => {
    if (!file) return;
    setStep("importing");
    const mappingsArr = Object.entries(mappings)
      .filter(([, field]) => field && field !== "ignore")
      .map(([csv_column, field]) => ({ csv_column, field }));

    try {
      const data = await importMutation.mutateAsync({
        file,
        mappings: mappingsArr,
        options: { skip_duplicates: true },
      });
      setImportResult({
        imported: data.imported ?? data.total ?? 0,
        total: data.total ?? totalRows,
      });
      setStep("done");
      toast.success("Import complete", `${data.imported ?? 0} leads imported.`);
    } catch (e: any) {
      setStep("preview");
      toast.error("Import failed", e?.response?.data?.detail || e?.message || "Unknown error");
    }
  };

  const previewColumns =
    previewRows.length > 0 ? Object.keys(previewRows[0]) : columns.map((c) => c.name);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
          Scraping
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">CSV Import</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {(["upload", "mapping", "preview", "importing", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s
                  ? "bg-purple-600 text-white"
                  : ["upload", "mapping", "preview", "importing", "done"].indexOf(step) > i
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-gray-400"
              )}
            >
              {["upload", "mapping", "preview", "importing", "done"].indexOf(step) > i ? (
                <Check className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn(step === s ? "text-white" : "text-gray-400", "capitalize")}>{s}</span>
            {i < 4 && <ChevronRight className="w-4 h-4 text-gray-600" />}
          </div>
        ))}
      </div>

      {step === "upload" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <h2 className="text-xl font-bold mb-6">Upload CSV File</h2>

          {parseMutation.isError && (
            <PageError
              message={(parseMutation.error as any)?.response?.data?.detail || "Failed to parse CSV."}
            />
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all",
              isDragging ? "border-purple-500 bg-purple-500/10" : "border-white/10 hover:border-white/20"
            )}
          >
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className={cn("cursor-pointer", parseMutation.isPending && "pointer-events-none")}>
              {parseMutation.isPending ? (
                <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              )}
              <p className="text-lg font-medium mb-2">Drag and drop your CSV file here</p>
              <p className="text-sm text-gray-400 mb-4">or click to browse</p>
              <Button variant="outline" type="button">
                Browse Files
              </Button>
            </label>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Uses POST /api/v1/scraping/csv/parse and /csv/import</span>
            </div>
          </div>
        </motion.div>
      )}

      {step === "mapping" && fileName && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold">Map Columns</h2>
              <p className="text-sm text-gray-400">
                {fileName} • {totalRows.toLocaleString()} rows detected
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStep("upload");
                setFile(null);
                setFileName(null);
              }}
            >
              Change File
            </Button>
          </div>

          <div className="space-y-4">
            {columns.map((col) => (
              <div key={col.name} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-full sm:w-48">
                  <div className="font-medium">{col.name}</div>
                  <div className="text-xs text-gray-400">Samples: {col.sample.join(", ") || "—"}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 hidden sm:block" />
                <div className="flex-1">
                  <select
                    value={mappings[col.name] || ""}
                    onChange={(e) => handleMappingChange(col.name, e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white"
                  >
                    <option value="">Select field...</option>
                    {fieldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Badge className="bg-purple-500/10 text-purple-400 text-xs shrink-0">
                  {col.type} ({Math.round(col.confidence * 100)}%)
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button disabled={!canProceed} onClick={() => setStep("preview")} className="gap-2">
              Preview Import
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === "preview" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <h2 className="text-xl font-bold mb-6">Preview Import</h2>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {previewColumns.map((col) => (
                    <th key={col} className="text-left p-3 font-medium text-gray-400">
                      {col}
                      {mappings[col] && mappings[col] !== "ignore" && (
                        <span className="block text-xs text-purple-400">→ {mappings[col]}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {previewColumns.map((col) => (
                      <td key={col} className="p-3">
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span>
                Ready to import {totalRows} rows ({Object.values(mappings).filter((v) => v && v !== "ignore").length}{" "}
                fields mapped)
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Back
            </Button>
            <Button onClick={handleImport} className="gap-2">
              Start Import
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {step === "importing" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent text-center"
        >
          <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Importing Leads...</h2>
          <p className="text-gray-400">Processing {totalRows.toLocaleString()} rows via API</p>
        </motion.div>
      )}

      {step === "done" && importResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl border border-green-500/20 bg-green-500/10 text-center"
        >
          <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Import Complete</h2>
          <p className="text-gray-300 mb-6">
            Imported {importResult.imported} of {importResult.total} rows
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Import Another
            </Button>
            <Link href="/app/leads">
              <Button>View Leads</Button>
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
