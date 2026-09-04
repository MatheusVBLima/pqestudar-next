import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fetchBrazilMunicipalities, IBGE_MUNICIPALITIES_ENDPOINT, MUNICIPALITIES_ERROR_MESSAGE } from "./brazil-locations.ts";

const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json" },
});

test("uses the current official IBGE municipalities-by-UF endpoint", async () => {
  let requested = "";
  const municipalities = await fetchBrazilMunicipalities("CE", undefined, async (url) => {
    requested = String(url);
    return jsonResponse([{ id: 2304400, nome: "Fortaleza" }]);
  });
  assert.equal(requested, `${IBGE_MUNICIPALITIES_ENDPOINT}/CE/municipios?orderBy=nome`);
  assert.deepEqual(municipalities, [{ id: 2304400, nome: "Fortaleza" }]);
});

test("falls back to the official local IBGE snapshot when the endpoint returns rejected HTML", async () => {
  const calls = [];
  const municipalities = await fetchBrazilMunicipalities("PE", undefined, async (url) => {
    calls.push(String(url));
    if (calls.length === 1) return new Response("<html>Request Rejected</html>", { status: 200, headers: { "content-type": "text/html" } });
    return jsonResponse({ source: "IBGE DTB 2024", referenceDate: "2024-12-31", municipalities: { PE: [{ id: 2611606, nome: "Recife" }] } });
  });
  assert.deepEqual(municipalities, [{ id: 2611606, nome: "Recife" }]);
  assert.equal(calls[1], "/data/ibge-municipalities-2024.json");
});

test("returns a friendly error only when both official sources are unavailable", async () => {
  await assert.rejects(
    fetchBrazilMunicipalities("BA", undefined, async () => { throw new TypeError("Failed to fetch"); }),
    (error) => error instanceof Error && error.message === MUNICIPALITIES_ERROR_MESSAGE,
  );
});

test("retry is a new request and can recover after a prior failure", async () => {
  let online = false;
  const request = async () => {
    if (!online) throw new TypeError("Failed to fetch");
    return jsonResponse([{ id: 2927408, nome: "Salvador" }]);
  };
  await assert.rejects(fetchBrazilMunicipalities("BA", undefined, request));
  online = true;
  assert.deepEqual(await fetchBrazilMunicipalities("BA", undefined, request), [{ id: 2927408, nome: "Salvador" }]);
});

test("the bundled official snapshot covers Ceará, Pernambuco, Bahia and all UFs", async () => {
  const snapshot = JSON.parse(await readFile(new URL("../../public/data/ibge-municipalities-2024.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(snapshot.municipalities).length, 27);
  assert.equal(Object.values(snapshot.municipalities).flat().length, 5571);
  assert.ok(snapshot.municipalities.CE.some((item) => item.id === 2304400 && item.nome === "Fortaleza"));
  assert.ok(snapshot.municipalities.PE.some((item) => item.id === 2611606 && item.nome === "Recife"));
  assert.ok(snapshot.municipalities.BA.some((item) => item.id === 2927408 && item.nome === "Salvador"));
});
