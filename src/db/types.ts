export type TransactionType = "income" | "expense";

// Category palette tokens from DESIGN_SYSTEM.md §3. Stored as token names,
// never raw hex.
export type CategoryColor =
  | "yellow"
  | "blue"
  | "green"
  | "red"
  | "purple"
  | "pink"
  | "orange"
  | "teal";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: CategoryColor;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Integer, smallest currency unit. Never a float. */
  amount: number;
  categoryId: string;
  /** Local-time date string, `YYYY-MM-DD`. Never a Date or UTC timestamp. */
  date: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
}

/** Full copy of all user tables — payload of exports and snapshots. */
export interface BackupData {
  categories: Category[];
  transactions: Transaction[];
  settings: Setting[];
}

/** Automatic snapshot taken before every import or restore. Last 3 kept. */
export interface Backup {
  id: string;
  label: string;
  createdAt: number;
  data: BackupData;
}
