import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import { blogPosts } from "../../db/schema.js";
import { eq } from "drizzle-orm";

async function requireAdmin(req: Request): Promise<Response | null> {
  const user = await getUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const roles: string[] = user.app_metadata?.roles ?? [];
  if (!roles.includes("admin")) return new Response("Forbidden", { status: 403 });
  return null;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method;

  if (method === "GET") {
    const user = await getUser(req);
    const isAdmin = (user?.app_metadata?.roles ?? []).includes("admin");
    const rows = isAdmin
      ? await db.select().from(blogPosts).orderBy(blogPosts.createdAt)
      : await db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(blogPosts.createdAt);
    return Response.json(rows);
  }

  const authError = await requireAdmin(req);
  if (authError) return authError;

  if (method === "POST") {
    const { title, content, excerpt, category, author, published } = await req.json();
    if (!title || !content || !author) return new Response("title, content, and author are required", { status: 422 });
    const slug = slugify(title) + "-" + Date.now();
    const [row] = await db
      .insert(blogPosts)
      .values({ title, slug, content, excerpt, category, author, published })
      .returning();
    return Response.json(row, { status: 201 });
  }

  if (method === "PUT") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return new Response("id is required", { status: 422 });
    const body = await req.json();
    const [row] = await db
      .update(blogPosts)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return Response.json(row);
  }

  if (method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return new Response("id is required", { status: 422 });
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/blog",
};
