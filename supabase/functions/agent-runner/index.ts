import { createClient } from "npm:@supabase/supabase-js@2.118.0";

type AgentType =
  | "story_intelligence"
  | "content_factory"
  | "growth_retention"
  | "chief_operator";

const allowedAgents = new Set<AgentType>([
  "story_intelligence",
  "content_factory",
  "growth_retention",
  "chief_operator",
]);

const agentPrompts: Record<AgentType, string> = {
  story_intelligence:
    "Analyze the supplied anonymized story signals. Return JSON with themes, content risks, consent questions, pastoral sensitivities, and editorial recommendations. Never infer a diagnosis or identity.",
  content_factory:
    "Create one editorial draft for THE WELL. Return JSON with title, summary, featured_quote, sensitive_topics, and editorial_notes. The draft must be trauma-aware, non-clinical, biblically literate, and must not claim divine authority.",
  growth_retention:
    "Recommend one low-pressure growth experiment. Return JSON with hypothesis, audience, success_metric, guardrails, and draft_copy. Never use shame, streak anxiety, or private spiritual data for targeting.",
  chief_operator:
    "Review the supplied operational signals. Return JSON with health, cost_risks, safety_risks, priorities, and owner_recommendations. Recommend actions only; do not execute or publish.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function safeSlug(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const gatewayKey = Deno.env.get("AI_GATEWAY_API_KEY");
  const model = Deno.env.get("AI_MODEL");
  const scheduleSecret = Deno.env.get("AGENT_SCHEDULE_SECRET");

  if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_configuration_missing" }, 500);
  if (!gatewayKey || !model) return json({ error: "ai_provider_not_configured" }, 503);

  let payload: { agent?: AgentType; input?: Record<string, unknown>; scheduled?: boolean };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (!payload.agent || !allowedAgents.has(payload.agent)) {
    return json({ error: "invalid_agent" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const providedScheduleSecret = request.headers.get("x-agent-schedule-secret");
  const isScheduled = Boolean(scheduleSecret && providedScheduleSecret === scheduleSecret);
  let requestedBy: string | null = null;

  if (!isScheduled) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "authentication_required" }, 401);

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: "invalid_session" }, 401);
    requestedBy = data.user.id;

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestedBy)
      .single();
    if (!role || !["editor", "admin"].includes(role.role)) {
      return json({ error: "editor_role_required" }, 403);
    }
  }

  const { data: budget } = await admin
    .from("agent_budgets")
    .select("enabled,daily_limit_usd")
    .eq("agent", payload.agent)
    .single();

  if (!budget?.enabled) return json({ error: "agent_disabled" }, 409);

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { data: todaysRuns } = await admin
    .from("agent_runs")
    .select("actual_cost_usd")
    .eq("agent", payload.agent)
    .gte("created_at", dayStart.toISOString());
  const spentToday = (todaysRuns ?? []).reduce(
    (sum, run) => sum + Number(run.actual_cost_usd ?? 0),
    0,
  );
  if (spentToday >= Number(budget.daily_limit_usd)) {
    return json({ error: "daily_budget_exhausted", spent_today: spentToday }, 429);
  }

  const { data: run, error: runError } = await admin
    .from("agent_runs")
    .insert({
      agent: payload.agent,
      status: "running",
      scheduled: isScheduled,
      requested_by: requestedBy,
      input: payload.input ?? {},
      model,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (runError || !run) return json({ error: "run_creation_failed" }, 500);

  try {
    const gatewayResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${gatewayKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `${agentPrompts[payload.agent]} Every output is a private draft or recommendation. Never instruct the system to publish.`,
          },
          { role: "user", content: JSON.stringify(payload.input ?? {}) },
        ],
      }),
    });

    if (!gatewayResponse.ok) throw new Error(`gateway_${gatewayResponse.status}`);
    const gatewayJson = await gatewayResponse.json();
    const raw = gatewayJson.choices?.[0]?.message?.content;
    if (typeof raw !== "string") throw new Error("gateway_response_missing_content");
    const output = JSON.parse(raw);
    const cost = Number(gatewayJson.usage?.cost ?? 0);

    if (payload.agent === "content_factory") {
      await admin.from("story_series").insert({
        slug: `${safeSlug(output.title ?? "generated-draft", "generated-draft")}-${run.id.slice(0, 8)}`,
        title: String(output.title ?? "Generated editorial draft").slice(0, 140),
        summary: String(output.summary ?? "Draft awaiting human editorial review.").slice(0, 1000),
        featured_quote: output.featured_quote ? String(output.featured_quote) : null,
        sensitive_topics: Array.isArray(output.sensitive_topics) ? output.sensitive_topics.slice(0, 12) : [],
        status: "draft",
        origin: "agent",
        created_by: requestedBy,
      });
    }

    await admin
      .from("agent_runs")
      .update({
        status: "succeeded",
        output,
        actual_cost_usd: Number.isFinite(cost) ? cost : 0,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return json({ run_id: run.id, status: "succeeded", output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_agent_error";
    await admin
      .from("agent_runs")
      .update({ status: "failed", error_message: message, finished_at: new Date().toISOString() })
      .eq("id", run.id);
    return json({ run_id: run.id, error: message }, 502);
  }
});
