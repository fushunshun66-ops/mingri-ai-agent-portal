import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const enricherJs = fs.readFileSync(path.join(__dirname, "_orderResultEnricher.js.txt"), "utf8");
const enricherTest = fs.readFileSync(path.join(__dirname, "_orderResultEnricher.test.js.txt"), "utf8");

fs.writeFileSync(path.join(root, "src/normalizers/orderResultEnricher.js"), enricherJs, "utf8");
fs.writeFileSync(path.join(root, "src/normalizers/__tests__/orderResultEnricher.test.js"), enricherTest, "utf8");
console.log("done");
