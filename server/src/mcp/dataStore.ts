import { EventEmitter } from "node:events";
import { eq, and, sql, max } from "drizzle-orm";
import { db } from "../db/connection.js";
import { rows } from "../db/schema.js";
import type { TabName, SheetRow } from "../../../src/types/sheets.js";
import type { WsEvent } from "../../../src/types/ws.js";

const VALID_TABS: TabName[] = [
  "meta",
  "rules",
  "dataModel",
  "features",
  "design",
  "screens",
  "errors",
];

export class PostgresDataStore extends EventEmitter {
  private rowIdCounter = 0;
  private initialized = false;

  constructor(
    private sheetId: string,
    private userId: string,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // row-XXXX 패턴에서 최대 카운터 값 추출
    const allRows = await db
      .select({ id: rows.id })
      .from(rows)
      .where(eq(rows.sheetId, this.sheetId));

    let maxId = 1000;
    for (const row of allRows) {
      const match = row.id.match(/^row-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    }
    this.rowIdCounter = maxId;
    this.initialized = true;
  }

  private genId(): string {
    return `row-${++this.rowIdCounter}`;
  }

  private toSheetRow(row: { id: string; data: Record<string, string> }): SheetRow {
    return { id: row.id, ...row.data } as unknown as SheetRow;
  }

  async getTabData(tab: TabName): Promise<SheetRow[]> {
    const result = await db
      .select()
      .from(rows)
      .where(and(eq(rows.sheetId, this.sheetId), eq(rows.tab, tab)))
      .orderBy(rows.sortOrder);

    return result.map((r) => this.toSheetRow({ id: r.id, data: r.data }));
  }

  async getAllData(): Promise<Record<TabName, SheetRow[]>> {
    const allRows = await db
      .select()
      .from(rows)
      .where(eq(rows.sheetId, this.sheetId))
      .orderBy(rows.tab, rows.sortOrder);

    const data = Object.fromEntries(
      VALID_TABS.map((tab) => [tab, [] as SheetRow[]]),
    ) as Record<TabName, SheetRow[]>;

    for (const r of allRows) {
      const tab = r.tab as TabName;
      if (data[tab]) {
        data[tab].push(this.toSheetRow({ id: r.id, data: r.data }));
      }
    }

    return data;
  }

  async addRow(
    tab: TabName,
    rowData: Record<string, string>,
  ): Promise<SheetRow> {
    await this.initialize();

    const id = this.genId();

    // 현재 탭의 최대 sortOrder 조회
    const maxResult = await db
      .select({ maxOrder: max(rows.sortOrder) })
      .from(rows)
      .where(and(eq(rows.sheetId, this.sheetId), eq(rows.tab, tab)));

    const nextOrder = (maxResult[0]?.maxOrder ?? -1) + 1;

    await db.insert(rows).values({
      id,
      sheetId: this.sheetId,
      tab,
      data: rowData,
      sortOrder: nextOrder,
    });

    const newRow = this.toSheetRow({ id, data: rowData });

    this.emit("change", {
      type: "row_added",
      sheetId: this.sheetId,
      tab,
      row: newRow,
      userId: this.userId,
      timestamp: Date.now(),
    } satisfies WsEvent);

    return newRow;
  }

  async updateRow(
    tab: TabName,
    id: string,
    updates: Record<string, string>,
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(rows)
      .where(and(eq(rows.id, id), eq(rows.sheetId, this.sheetId)))
      .limit(1);

    if (existing.length === 0) return false;

    const currentData = existing[0].data;
    const newData = { ...currentData, ...updates };

    await db
      .update(rows)
      .set({ data: newData, updatedAt: new Date() })
      .where(eq(rows.id, id));

    this.emit("change", {
      type: "row_updated",
      sheetId: this.sheetId,
      tab,
      rowId: id,
      updates,
      userId: this.userId,
      timestamp: Date.now(),
    } satisfies WsEvent);

    return true;
  }

  async deleteRow(tab: TabName, id: string): Promise<boolean> {
    const result = await db
      .delete(rows)
      .where(and(eq(rows.id, id), eq(rows.sheetId, this.sheetId)))
      .returning({ id: rows.id });

    if (result.length === 0) return false;

    this.emit("change", {
      type: "row_deleted",
      sheetId: this.sheetId,
      tab,
      rowId: id,
      userId: this.userId,
      timestamp: Date.now(),
    } satisfies WsEvent);

    return true;
  }

  async findRow(
    tab: TabName,
    identifier: Record<string, string>,
  ): Promise<SheetRow | undefined> {
    const tabData = await this.getTabData(tab);
    return tabData.find((row) => {
      const r = row as unknown as Record<string, unknown>;
      return Object.entries(identifier).every(
        ([key, val]) =>
          String(r[key] ?? "").toLowerCase() === String(val).toLowerCase(),
      );
    });
  }
}
