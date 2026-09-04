import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
const output = process.argv[3] ?? "public/data/ibge-municipalities-2024.json";
if (!input) throw new Error("Usage: node scripts/generate-ibge-municipalities.mjs <content.xml> [output.json]");

const stateCodes = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF",
};
const decode = (value) => value
  .replace(/<[^>]+>/g, "")
  .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"').replaceAll("&apos;", "'").trim();
const xml = readFileSync(input, "utf8");
const result = Object.fromEntries(Object.values(stateCodes).map((code) => [code, []]));
for (const row of xml.matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/g)) {
  const cells = [...row[1].matchAll(/<table:table-cell\b[^>]*>([\s\S]*?)<\/table:table-cell>/g)]
    .map((cell) => decode(cell[1]));
  const stateCode = stateCodes[Number(cells[0])];
  const id = Number(cells[7]);
  const nome = cells[8];
  if (stateCode && Number.isInteger(id) && nome) result[stateCode].push({ id, nome });
}
for (const municipalities of Object.values(result)) municipalities.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
const count = Object.values(result).reduce((total, municipalities) => total + municipalities.length, 0);
if (count !== 5571) throw new Error(`Expected 5571 municipalities/district-equivalent entries, received ${count}`);
writeFileSync(output, `${JSON.stringify({ source: "IBGE DTB 2024", referenceDate: "2024-12-31", municipalities: result })}\n`, "utf8");
console.log(JSON.stringify({ output, states: Object.keys(result).length, municipalities: count }));
