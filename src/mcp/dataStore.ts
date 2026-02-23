import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TabName, SheetRow } from "../types/sheets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
import {
  initialMeta,
  initialRules,
  initialDataModel,
  initialFeatures,
  initialDesign,
  initialScreens,
  initialErrors,
} from "../data/initialData.js";

type SheetData = Record<TabName, SheetRow[]>;

const VALID_TABS: TabName[] = [
  "meta", "rules", "dataModel", "features", "design", "screens", "errors",
];

let _rowIdCounter = 0;

function genId(): string {
  return `row-${++_rowIdCounter}`;
}

function initializeRowCounter(data: SheetData): void {
  let maxId = 0;
  for (const tab of VALID_TABS) {
    for (const row of data[tab]) {
      const match = row.id.match(/^row-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
  }
  _rowIdCounter = Math.max(maxId, 1000);
}

export class DataStore {
  private data: SheetData;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.join(PROJECT_ROOT, "sindri-data.json");
    this.data = this.load();
    initializeRowCounter(this.data);
    console.error(`[Sindri MCP] Data loaded from ${this.filePath}`);
  }

  private load(): SheetData {
    if (fs.existsSync(this.filePath)) {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw) as SheetData;
    }
    const seed: SheetData = {
      meta: initialMeta,
      rules: initialRules,
      dataModel: initialDataModel,
      features: initialFeatures,
      design: initialDesign,
      screens: initialScreens,
      errors: initialErrors,
    };
    this.saveRaw(seed);
    return seed;
  }

  private saveRaw(data: SheetData): void {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private save(): void {
    this.saveRaw(this.data);
  }

  getTabData(tab: TabName): SheetRow[] {
    return this.data[tab] ?? [];
  }

  getAllData(): SheetData {
    return { ...this.data };
  }

  addRow(tab: TabName, rowData: Record<string, string>): SheetRow {
    const newRow = { id: genId(), ...rowData } as unknown as SheetRow;
    this.data[tab] = [...this.data[tab], newRow];
    this.save();
    return newRow;
  }

  updateRow(tab: TabName, id: string, updates: Record<string, string>): boolean {
    const rows = this.data[tab];
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.data[tab][index] = { ...rows[index], ...updates } as SheetRow;
    this.save();
    return true;
  }

  deleteRow(tab: TabName, id: string): boolean {
    const before = this.data[tab].length;
    this.data[tab] = this.data[tab].filter((r) => r.id !== id);
    if (this.data[tab].length === before) return false;
    this.save();
    return true;
  }

  findRow(tab: TabName, identifier: Record<string, string>): SheetRow | undefined {
    const tabData = this.data[tab];
    return tabData.find((row) => {
      const r = row as unknown as Record<string, unknown>;
      return Object.entries(identifier).every(
        ([key, val]) =>
          String(r[key] ?? "").toLowerCase() === String(val).toLowerCase()
      );
    });
  }
}
