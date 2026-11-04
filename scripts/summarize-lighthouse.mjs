import { appendFile, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(process.argv[2] ?? "lighthouse-reports");
const files = (await readdir(directory)).filter((file) => file.endsWith(".report.json")).sort();
if (files.length !== 6) throw new Error(`Expected six production Lighthouse reports; found ${files.length}.`);
const summaries = [];
for (const file of files) {
  const report = JSON.parse(await readFile(resolve(directory, file), "utf8"));
  if (report.runtimeError) throw new Error(`${file}: ${report.runtimeError.message}`);
  summaries.push({
    report: file,
    url: report.finalDisplayedUrl ?? report.finalUrl,
    version: report.lighthouseVersion,
    profile: report.configSettings.formFactor,
    scores: Object.fromEntries(Object.entries(report.categories).map(([name, category]) => [name, Math.round(category.score * 100)])),
    metrics: Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"].map((name) => [name, report.audits[name].numericValue])),
    findings: Object.values(report.audits).filter((audit) => audit.score !== null && audit.score < 1).map((audit) => ({ id: audit.id, title: audit.title, score: audit.score, displayValue: audit.displayValue, impact: audit.details?.impact, items: audit.details?.items?.slice(0, 5) })),
  });
}
const markdown = [
  "| Production page | Profile | Performance | Accessibility | Best practices | SEO |",
  "| --- | --- | ---: | ---: | ---: | ---: |",
  ...summaries.map((item) => `| ${item.report.replace(/\.report\.json$/, "")} | ${item.profile} | ${item.scores.performance} | ${item.scores.accessibility} | ${item.scores["best-practices"]} | ${item.scores.seo} |`),
].join("\n") + "\n";
await writeFile(resolve(directory, "summary.json"), JSON.stringify(summaries, null, 2) + "\n");
await writeFile(resolve(directory, "summary.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(markdown);
console.log(JSON.stringify(summaries, null, 2));
