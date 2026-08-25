import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const safeText = (value: FormDataEntryValue | null, max: number) => String(value || "").trim().slice(0, max);
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "suggestion";
const encodeBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 9 * 1024 * 1024) return json({ error: "Submission is too large" }, 413);

  try {
    const form = await req.formData();
    if (safeText(form.get("website"), 100)) return json({ ok: true });
    const type = safeText(form.get("type"), 50);
    const reporter = safeText(form.get("reporter"), 80);
    const subject = safeText(form.get("subject"), 160);
    const details = safeText(form.get("details"), 5000);
    const page = safeText(form.get("page"), 600);
    if (!reporter || !subject || details.length < 10 || !page) return json({ error: "Please complete all required fields" }, 400);

    const createdAt = Number(form.get("form_started_at") || 0);
    if (createdAt && Date.now() - createdAt < 1800) return json({ error: "Please review the suggestion before sending" }, 429);

    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const serviceKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const githubToken = Deno.env.get("GITHUB_FEEDBACK_TOKEN");
    if (!serviceKey || !supabaseUrl || !githubToken) return json({ error: "Feedback service is not configured" }, 503);

    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)))).map(v => v.toString(16).padStart(2, "0")).join("");
    const supabase = createClient(supabaseUrl, serviceKey);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase.from("guide_feedback_submissions").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
    if ((count || 0) >= 5) return json({ error: "Too many suggestions. Please try again later." }, 429);

    const submittedAt = new Date();
    const stamp = submittedAt.toISOString().replace(/[:.]/g, "-");
    const folder = `submissions/${submittedAt.toISOString().slice(0, 10).replace(/-/g, "/")}/${stamp}-${slugify(subject)}`;
    let screenshotPath = "";
    const screenshot = form.get("screenshot");
    if (screenshot instanceof File && screenshot.size) {
      if (screenshot.size > 8 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(screenshot.type)) return json({ error: "Invalid screenshot" }, 400);
      const extension = screenshot.type === "image/png" ? "png" : screenshot.type === "image/webp" ? "webp" : "jpg";
      screenshotPath = `${folder}/screenshot.${extension}`;
      const upload = await fetch(`https://api.github.com/repos/yakiryakirh/kaiokenms-guide-feedback/contents/${screenshotPath}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Add screenshot for ${subject}`, content: encodeBase64(new Uint8Array(await screenshot.arrayBuffer())) }),
      });
      if (!upload.ok) throw new Error(`Screenshot upload failed: ${upload.status}`);
    }

    const screenshotLink = screenshotPath ? `https://github.com/yakiryakirh/kaiokenms-guide-feedback/blob/main/${screenshotPath}` : "None";
    const issueBody = [`## Suggestion`, ``, `- **Submitted:** ${submittedAt.toISOString()}`, `- **From:** ${reporter}`, `- **Type:** ${type || "General"}`, `- **Page:** ${page}`, `- **Screenshot:** ${screenshotLink}`, ``, `## Requested change`, ``, details].join("\n");
    const issue = await fetch("https://api.github.com/repos/yakiryakirh/kaiokenms-guide-feedback/issues", {
      method: "POST",
      headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ title: `[${type || "Suggestion"}] ${subject}`, body: issueBody }),
    });
    if (!issue.ok) throw new Error(`Issue creation failed: ${issue.status}`);
    const issueData = await issue.json();
    await supabase.from("guide_feedback_submissions").insert({ ip_hash: ipHash, reporter_name: reporter, feedback_type: type, subject, page_url: page, github_issue_number: issueData.number });
    return json({ ok: true, reference: issueData.number });
  } catch (error) {
    console.error("guide-feedback", error instanceof Error ? error.message : error);
    return json({ error: "Suggestion could not be sent. Please try again." }, 500);
  }
});

