import type { TabName, SheetRow } from "./sheets.js";

export type WsEventType =
  | "connected"
  | "row_added"
  | "row_updated"
  | "row_deleted";

export interface WsConnectedEvent {
  type: "connected";
  sheetId: string;
  timestamp: number;
}

export interface WsRowAddedEvent {
  type: "row_added";
  sheetId: string;
  tab: TabName;
  row: SheetRow;
  userId: string;
  timestamp: number;
}

export interface WsRowUpdatedEvent {
  type: "row_updated";
  sheetId: string;
  tab: TabName;
  rowId: string;
  updates: Record<string, string>;
  userId: string;
  timestamp: number;
}

export interface WsRowDeletedEvent {
  type: "row_deleted";
  sheetId: string;
  tab: TabName;
  rowId: string;
  userId: string;
  timestamp: number;
}

export type WsEvent =
  | WsConnectedEvent
  | WsRowAddedEvent
  | WsRowUpdatedEvent
  | WsRowDeletedEvent;
