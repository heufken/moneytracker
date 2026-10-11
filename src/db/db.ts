import Dexie, { type EntityTable } from "dexie";
import type { Category, Setting, Transaction } from "./types";

export class MoneyTrackerDB extends Dexie {
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("moneytracker");
    this.version(1).stores({
      categories: "id, name, type",
      transactions: "id, date, type, categoryId",
      settings: "key",
    });
  }
}

export const db = new MoneyTrackerDB();

// Default categories + currency per PRD (v1). Colors per DESIGN_SYSTEM.md §3.
db.on("populate", () => {
  db.categories.bulkPut([
    { id: "cat-salary", name: "Salary", type: "income", color: "teal" },
    { id: "cat-freelance", name: "Freelance", type: "income", color: "purple" },
    { id: "cat-food", name: "Food", type: "expense", color: "red" },
    { id: "cat-transport", name: "Transport", type: "expense", color: "blue" },
    { id: "cat-bills", name: "Bills", type: "expense", color: "orange" },
    { id: "cat-fun", name: "Fun", type: "expense", color: "pink" },
  ]);
  db.settings.put({ key: "currency", value: "IDR" });
});
