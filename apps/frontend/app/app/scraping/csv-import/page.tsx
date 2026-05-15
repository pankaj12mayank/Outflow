"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

const detectedColumns = [
  { name: "email", sample: ["john@acme.com", "sarah@tech.io"], type: "email", confidence: 0.95 },
  { name: "name", sample: ["John Smith", "Sarah Chen"], type: "text", confidence: 0.8 },
  { name: "company", sample: ["Acme Corp", "TechStart"], type: "text", confidence: 0.75 },
  { name: "phone", sample: ["+1 415 555 0123", "+1 212 555 0456"], type: "phone", confidence: 0.9 },
  { name: "website", sample: ["acme.com", "tech.io"], type: "url", confidence: 0.85 },
];

const fieldOptions = [
  { value: "email", label: "Email", icon: "mail" },
  { value: "phone", label: "Phone", icon: "phone" },
  { value: "name", label: "Full Name", icon: "user" },
  { value: "first_name", label: "First Name", icon: "user" },
  { value: "last_name", label: "Last Name", icon: "user" },
  { value: "company", label: "Company", icon: "building" },
  { value: "website", label: "Website", icon: "globe" },
  { value: "address", label: "Address", icon: "mapPin" },
  { value: "city", label: "City", icon: "mapPin" },
  { value: "state", label: "State", icon: "mapPin" },
  { value: "country", label: "Country", icon: "mapPin" },
  { value: "linkedin_url", label: "LinkedIn", icon: "linkedin" },
  { value: "job_title", label: "Job Title", icon: "briefcase" },
  { value: "ignore", label: "Ignore Column", icon: "x" },
];

const samplePreview = [
  { email: "john@acme.com", name: "John Smith", company: "Acme Corp", phone: "+1 415 555 0123" },
  { email: "sarah@tech.io", name: "Sarah Chen", company: "TechStart", phone: "+1 212 555 0456" },
  { email: "mike@cloud.co", name: "Mike Johnson", company: "CloudNine", phone: "+1 650 555 0789" },
];

export default function CSVImportPage() {
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      setFileName(files[0].name);
      setTotalRows(542); // Simulated
      setStep("mapping");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0].name.endsWith('.csv')) {
      setFileName(files[0].name);
      setTotalRows(542);
      setStep("mapping");
    }
  };

  const handleMappingChange = (column: string, field: string) => {
    setMappings((prev) => ({ ...prev, [column]: field }));
  };

  const canProceed = Object.keys(mappings).length >= 1 && 
    Object.values(mappings).some(v => v !== "ignore");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
          Scraping
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white">CSV Import</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-4">
        {["upload", "mapping", "preview", "import"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s
                  ? "bg-purple-600 text-white"
                  : i < ["upload", "mapping", "preview", "import"].indexOf(step)
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-gray-400"
              )}
            >
              {i < ["upload", "mapping", "preview", "import"].indexOf(step) ? (
                <Check className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className={cn(step === s ? "text-white" : "text-gray-400")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 3 && <ChevronRight className="w-4 h-4 text-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <h2 className="text-xl font-bold mb-6">Upload CSV File</h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all",
              isDragging
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/10 hover:border-white/20"
            )}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                Drag and drop your CSV file here
              </p>
              <p className="text-sm text-gray-400 mb-4">
                or click to browse
              </p>
              <Button variant="outline">Browse Files</Button>
            </label>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Supported formats: CSV, TSV. Max file size: 10MB</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Mapping */}
      {step === "mapping" && fileName && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Map Columns</h2>
              <p className="text-sm text-gray-400">
                {fileName} • {totalRows.toLocaleString()} rows detected
              </p>
            </div>
            <Button variant="outline" onClick={() => setStep("upload")}>
              Change File
            </Button>
          </div>

          <div className="space-y-4">
            {detectedColumns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5"
              >
                <div className="w-48">
                  <div className="font-medium">{col.name}</div>
                  <div className="text-xs text-gray-400">
                    Samples: {col.sample.join(", ")}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>

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

                <Badge
                  className={cn(
                    "text-xs",
                    col.type === "email" && "bg-purple-500/10 text-purple-400",
                    col.type === "phone" && "bg-green-500/10 text-green-400",
                    col.type === "url" && "bg-blue-500/10 text-blue-400",
                    col.type === "text" && "bg-gray-500/10 text-gray-400"
                  )}
                >
                  {col.type} ({Math.round(col.confidence * 100)}%)
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Back
            </Button>
            <Button
              disabled={!canProceed}
              onClick={() => setStep("preview")}
              className="gap-2"
            >
              Preview Import
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Preview */}
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
                  {Object.keys(samplePreview[0]).map((col) => (
                    <th key={col} className="text-left p-3 font-medium text-gray-400">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samplePreview.map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="p-3">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span>
                Ready to import {totalRows} rows with {Object.keys(mappings).filter(k => mappings[k] !== "ignore").length} fields mapped
              </span>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Sample
            </Button>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Back
            </Button>
            <Button
              onClick={() => setStep("importing")}
              className="gap-2"
            >
              Start Import
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 4: Importing */}
      {step === "importing" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/5 to-transparent text-center"
        >
          <Loader2 className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Importing Leads...</h2>
          <p className="text-gray-400 mb-6">
            Processing {totalRows.toLocaleString()} rows
          </p>

          <div className="max-w-md mx-auto">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: "65%" }}
              />
            </div>
            <span className="text-sm text-gray-400">65% complete • 352 rows processed</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}