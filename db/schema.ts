import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const faqs = pgTable("faqs", {
  id: serial().primaryKey(),
  question: text().notNull(),
  answer: text().notNull(),
  category: text().default("General"),
  published: boolean().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial().primaryKey(),
  title: text().notNull(),
  slug: text().notNull().unique(),
  excerpt: text().default(""),
  content: text().notNull(),
  category: text().default("General"),
  author: text().notNull(),
  published: boolean().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
