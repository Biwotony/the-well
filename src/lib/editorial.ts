import { getSupabaseClient } from "./supabase";

export type EditorialQueueItem = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "in_review";
  origin: "human" | "agent";
  updatedAt: string;
};

type EditorialQueueRow = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "in_review";
  origin: "human" | "agent";
  updated_at: string;
};

export async function loadEditorialQueue(): Promise<EditorialQueueItem[]> {
  const supabase = await getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("story_series")
    .select("id,title,summary,status,origin,updated_at")
    .in("status", ["draft", "in_review"])
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) throw new Error("The editorial queue could not be loaded.");

  return ((data ?? []) as EditorialQueueRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    origin: row.origin,
    updatedAt: row.updated_at,
  }));
}

export async function publishEditorialItem(itemId: string) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Connect Supabase before publishing content.");

  const { data, error } = await supabase
    .from("story_series")
    .update({ status: "published" })
    .eq("id", itemId)
    .eq("status", "in_review")
    .select("id,status")
    .maybeSingle();

  if (error) throw new Error("Publication was rejected. Confirm the item is in review and your editor session is current.");
  if (!data) throw new Error("No in-review item was published. Refresh the queue and try again.");
  return data;
}
