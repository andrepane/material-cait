
const API_URL = "https://magicloops.dev/api/loop/58c97166-933e-4e60-a23a-3d1056aea8c9/run";

// Si tu endpoint requiere auth, mete aquí el token y lo enviamos como Bearer.
// Si NO hace falta, déjalo vacío.
const API_BEARER_TOKEN = ""; // ej: "mlp_xxx..."

const $ = (id) => document.getElementById(id);

const form = $("form");
const statusEl = $("status");
const jsonEl = $("json");
const previewEl = $("preview");
const btnPrint = $("btnPrint");
const btn = $("btn");

let lastPrintableHtml = "";

function csvToArray(str) {
  return (str || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", !!isError);
}

function safeJsonStringify(obj) {
  try { return JSON.stringify(obj, null, 2); }
  catch { return String(obj); }
}

function buildRequestBody() {
  const type = $("type").value;
  const age = Number($("age").value || 0);
  const context = $("context").value;
  const dx = $("dx").value.trim();
  const level = $("level").value;
  const goal = $("goal").value.trim();
  const timeMinutes = Number($("time").value || 45);
  const format = $("format").value;

  const interests = csvToArray($("interests").value);
  const difficulties = csvToArray($("difficulties").value);
  const strengths = csvToArray($("strengths").value);
  const avoid = csvToArray($("avoid").value);

  const freePrompt = $("prompt").value.trim();

  // Body alineado con lo que te propuse para la API:
  return {
    prompt: freePrompt || "",
    parameters: {
      type,
      age_years: age,
      profile: {
        odt_or_dx: dx || "No especificado",
        level,
        strengths,
        difficulties,
        interests
      },
      context,
      goal: goal || "No especificado",
      subgoals: [],
      constraints: {
        time_minutes: timeMinutes,
        materials_available: [],
        family_style: "simple",
        avoid_strategies: avoid,
        tone: "profesional"
      },
      output_format: format,
      variability: {
        variation_id: "A",
        novelty_level: 2
      }
    }
  };
}

async function callApi(body) {
  if (!API_URL || API_URL.includes("PASTE_YOUR")) {
    throw new Error("Falta configurar API_URL en app.js");
  }

  const headers = { "Content-Type": "application/json" };
  if (API_BEARER_TOKEN) headers.Authorization = `Bearer ${API_BEARER_TOKEN}`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch {
    // Algunas plataformas devuelven texto; lo envolvemos.
    data = { ok: res.ok, raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : safeJsonStringify(msg));
  }

  return data;
}

function setPreview(html, css) {
  // Empaquetamos el HTML + CSS de impresión si viene separado
  const full = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Printable</title>
  <style>
    ${css || ""}
  </style>
</head>
<body>
  ${html || ""}
</body>
</html>`.trim();

  previewEl.srcdoc = full;
  lastPrintableHtml = full;
  btnPrint.disabled = !html;
}

function tryExtractPrintable(data) {
  const html = data?.printable?.html_a4 || "";
  const css = data?.printable?.css_print || "";
  if (html) setPreview(html, css);
  else setPreview("", "");
}

btnPrint.addEventListener("click", () => {
  // Imprime el contenido del iframe
  try {
    previewEl.contentWindow.focus();
    previewEl.contentWindow.print();
  } catch {
    alert("No se pudo imprimir. Prueba Ctrl+P dentro de la vista previa.");
  }
});

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  setStatus("");
  btn.disabled = true;
  btnPrint.disabled = true;
  jsonEl.textContent = "{}";
  previewEl.srcdoc = "";
  lastPrintableHtml = "";

  const body = buildRequestBody();

  try {
    setStatus("Generando...");
    const data = await callApi(body);

    jsonEl.textContent = safeJsonStringify(data);
    tryExtractPrintable(data);

    if (data?.ok === false) {
      setStatus("La API respondió ok=false. Revisa el JSON.", true);
    } else {
      setStatus("Listo.");
    }
  } catch (err) {
    setStatus(err?.message || "Error desconocido", true);
  } finally {
    btn.disabled = false;
  }
});
