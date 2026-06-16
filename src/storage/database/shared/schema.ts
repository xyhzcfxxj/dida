import { pgTable, serial, timestamp, varchar, text, boolean, jsonb, index, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 系统健康检查表（禁止删除）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 任务分类表
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 20 }).notNull().default("#3B82F6"),
    icon: varchar("icon", { length: 50 }).default("folder"),
    sort_order: serial("sort_order"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("categories_user_id_idx").on(table.user_id),
    index("categories_sort_order_idx").on(table.sort_order),
  ]
);

// 待办事项表
export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
    due_date: timestamp("due_date", { withTimezone: true }),
    reminder_time: timestamp("reminder_time", { withTimezone: true }),
    is_completed: boolean("is_completed").notNull().default(false),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    sort_order: serial("sort_order"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("todos_user_id_idx").on(table.user_id),
    index("todos_category_id_idx").on(table.category_id),
    index("todos_status_idx").on(table.status),
    index("todos_priority_idx").on(table.priority),
    index("todos_due_date_idx").on(table.due_date),
    index("todos_is_completed_idx").on(table.is_completed),
    index("todos_user_status_idx").on(table.user_id, table.status),
  ]
);

// 扣子自动生成规则表
export const todoRules = pgTable(
  "todo_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    trigger_type: varchar("trigger_type", { length: 20 }).notNull().default("manual"), // time, event, manual
    trigger_config: jsonb("trigger_config").default(sql`'{}'::jsonb`),
    template: text("template").notNull(),
    target_category_id: uuid("target_category_id").references(() => categories.id, { onDelete: "set null" }),
    default_priority: varchar("default_priority", { length: 20 }).default("medium"),
    is_active: boolean("is_active").notNull().default(true),
    last_triggered_at: timestamp("last_triggered_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("todo_rules_user_id_idx").on(table.user_id),
    index("todo_rules_is_active_idx").on(table.is_active),
    index("todo_rules_trigger_type_idx").on(table.trigger_type),
  ]
);

// 类型导出
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type Todo = typeof todos.$inferSelect;
export type InsertTodo = typeof todos.$inferInsert;
export type TodoRule = typeof todoRules.$inferSelect;
export type InsertTodoRule = typeof todoRules.$inferInsert;