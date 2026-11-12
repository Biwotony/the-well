import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("falls back to the private app shell without triggering an index redirect", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/app-shell.html" ? "app" : "missing", {
            status: url.pathname === "/app-shell.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/flow/step-two?source=share", "/app-shell.html"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("emits the files required by Sites packaging", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/client/app-shell.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/server/wrangler.json", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});

test("runs the Worker before every static asset so routes and headers stay consistent", async () => {
  const config = JSON.parse(await readFile(new URL("../worker/wrangler.json", import.meta.url), "utf8"));
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.not_found_handling, "none");
});

test("deployment packaging removes index.html so the root reaches the Worker", async () => {
  const script = await readFile(new URL("../scripts/prepare-sites-build.mjs", import.meta.url), "utf8");
  const packageManifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(script, /process\.argv\.includes\("--deployment"\)/);
  assert.match(script, /if \(deploymentMode\) rmSync\(index\)/);
  assert.equal(packageManifest.scripts["build:sites"], "pnpm build && node scripts/prepare-sites-build.mjs --deployment");
});

test("keeps the protected technical preview out of search indexes", async () => {
  const [index, robots] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/robots.txt", import.meta.url), "utf8"),
  ]);

  assert.match(index, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/);
  assert.match(robots, /User-agent: \*\s+Disallow: \//);
});

test("adds security headers to both assets and app-route fallbacks", async () => {
  for (const pathname of ["/assets/site.js", "/studio"]) {
    const response = await worker.fetch(
      new Request("https://example.test" + pathname, { headers: { accept: "text/html" } }),
      { ASSETS: { fetch: async (request) =>
        new Response("body", { status: new URL(request.url).pathname === "/studio" ? 404 : 200 }) } },
    );
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  }
});

test("adds the same security headers when the host serves a static asset first", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /\/\*/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /Content-Security-Policy: frame-ancestors 'none'/);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
});
