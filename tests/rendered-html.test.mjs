import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mantém a estrutura visual do Portal", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /<html lang="pt-BR">/i);
  assert.match(page, /^"use client";/);
  assert.match(page, /label: "Dashboard"/);
  assert.match(page, /label: "Registro"/);
  assert.match(page, /label: "Catálogo"/);
  assert.match(page, /label: "Usuários"/);
  assert.match(page, /currentUser\.role === "administrador"/);
  assert.match(page, /role="dialog"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 960px\)/);
  assert.doesNotMatch(page, /\.\.\/Backend|SUPABASE_URL|SUPABASE_KEY/);
});
