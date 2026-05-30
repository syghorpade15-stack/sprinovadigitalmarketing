import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import { faqs } from "../../db/schema.js";
import { eq } from "drizzle-orm";

async function requireAdmin(req: Request): Promise<Response | null> {
  const user = await getUser(req);
  if (!user) return new Response("Unauthorized", { status: 401 });
  const roles: string[] = user.app_metadata?.roles ?? [];
  if (!roles.includes("admin")) return new Response("Forbidden", { status: 403 });
  return null;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method;

  if (method === "GET") {
    // Public: list published FAQs, or all for admin
    const user = await getUser(req);
    const isAdmin = (user?.app_metadata?.roles ?? []).includes("admin");
    const rows = isAdmin
      ? await db.select().from(faqs).orderBy(faqs.createdAt)
      : await db.select().from(faqs).where(eq(faqs.published, true)).orderBy(faqs.createdAt);
    return Response.json(rows);
  }

  const authError = await requireAdmin(req);
  if (authError) return authError;

  if (method === "POST") {
    const { question, answer, category, published } = await req.json();
    if (!question || !answer) return new Response("question and answer are required", { status: 422 });
    const [row] = await db.insert(faqs).values({ question, answer, category, published }).returning();
    return Response.json(row, { status: 201 });
  }

  if (method === "PUT") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return new Response("id is required", { status: 422 });
    const body = await req.json();
    const [row] = await db.update(faqs).set({ ...body, updatedAt: new Date() }).where(eq(faqs.id, id)).returning();
    return Response.json(row);
  }

  if (method === "DELETE") {
    const id = Number(url.searchParams.get("id"));
    if (!id) return new Response("id is required", { status: 422 });
    await db.delete(faqs).where(eq(faqs.id, id));
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/faqs",
};
