/***********************
 * CONFIG
 ***********************/
const API_URL = "https://magicloops.dev/api/loop/fe9a0b9d-8b5c-43d0-8554-3ed8a32f095a/run";

const HTML_GENERATOR_PROMPT = String.raw`Eres un generador de material imprimible para logopedia.
Tu tarea es recibir un JSON con parámetros y devolver SIEMPRE HTML A4 listo para imprimir con tarjetas (3x4) que contengan los elementos solicitados.
La salida debe ser solo HTML completo, con <html>, <head>, <style> y <body>.

Requisitos de salida:
- Debe ser HTML válido para imprimir en A4 sin cortar contenido.
- Incluye CSS dentro de <style> para cuadrícula 3 columnas x 4 filas.
- Cada tarjeta debe tener un borde visible y un tamaño uniforme.
- No mezcles texto plano sin formato; todo dentro de HTML.
- Nada de JSON ni texto adicional fuera de la etiqueta html.

Parámetros esperados (JSON input):
{
  "age_years": number,
  "dx": string,
  "goal": string,
  "theme": string,
  "material_type": string, // "tarjetas"
  "items_count": number
}

Lógica:
1. Usa el campo "theme" y "goal" para crear un título.
2. Genera exactamente items_count tarjetas.
3. Si no hay suficientes datos de items, usa listas de ejemplo relacionadas con goal/theme.
4. No devuelvas nada que no sea HTML válido.

Salida:
Devuelve exclusivamente HTML completo.`;

/***********************
 * HELPERS
 ***********************/
const $ = (id) => document.getElementById(id);

const form = $("form");
const statusEl = $("status");
const previewEl = $("preview");
const btnPrint = $("btnPrint");
const btn = $("btn");
const jsonEl = $("json");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", !!isError);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeLines(rawText) {
  const t = String(rawText || "").trim().replace(/^"+|"+$/g, "").trim();
  return t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function linesToCards(lines) {
  let title = "Material imprimible";
  let items = lines;

  if (lines.length && lines[0].length <= 90) {
    if (lines[0].includes(":") || lines[0].toLowerCase().includes("actividades")) {
      title = lines[0];
      items = lines.slice(1);
    }
  }

  if (!items.length) return { title, items: [] };

  return { title, items };
}

function normalizeHtmlResponse(raw) {
  const text = String(raw || "").trim();

  const fenced = text.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : text;

  if (candidate.toLowerCase().includes("<html")) return candidate;

  return "";
}

/***********************
 * BUILD A4 HTML (3x4 CARDS)
 ***********************/
function buildA4CardsHtml(title, items, columns = 3, rows = 4) {
  const totalSlots = columns * rows;
  const filled = items.slice(0, totalSlots);

  while (filled.length < totalSlots) filled.push("");

  const cardsHtml = filled.map((text) => {
    const safe = escapeHtml(text || "");
    return `
      <div class="card">
        <div class="card-inner">
          <div class="card-text">${safe || "&nbsp;"}</div>
        </div>
      </div>
    `.trim();
  }).join("");

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111; }
    .page { padding: 0; }
    .title {
      font-size: 14pt;
      font-weight: 700;
      margin: 0 0 10mm 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      gap: 6mm;
    }
    .card {
      border: 1px solid #222;
      border-radius: 4mm;
      height: 48mm;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
      page-break-inside: avoid;
      outline: 0.2mm dashed rgba(0,0,0,.25);
      outline-offset: -2mm;
    }
    .card-inner {
      padding: 6mm;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
    }
    .card-text {
      font-size: 16pt;
      font-weight: 700;
      line-height: 1.1;
      word-break: break-word;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="grid">
      ${cardsHtml}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/***********************
 * API CALL (TEXT)
 ***********************/
async function callApi(body) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  return text;
}

/***********************
 * BUILD REQUEST BODY
 ***********************/
function buildRequestBody() {
  const extraPrompt = $("prompt").value?.trim();

  return {
    prompt: extraPrompt ? `${HTML_GENERATOR_PROMPT}\n\nNotas extra del usuario:\n${extraPrompt}` : HTML_GENERATOR_PROMPT,
    parameters: {
      age_years: Number($("age").value || 4),
      dx: $("dx").value || "TEL",
      goal: $("goal").value || "Trabajar /p/ inicial",
      theme: ($("interests").value || "animales").split(",")[0].trim() || "animales",
      material_type: "tarjetas",
      items_count: 12
    }
  };
}

/***********************
 * RENDER / PRINT
 ***********************/
function renderInIframe(htmlDoc) {
  previewEl.srcdoc = htmlDoc;
  btnPrint.disabled = false;
}

btnPrint.addEventListener("click", () => {
  try {
    previewEl.contentWindow.focus();
    previewEl.contentWindow.print();
  } catch {
    alert("No se pudo imprimir. Abre la vista previa y usa Ctrl+P.");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  setStatus("Generando...");
  btn.disabled = true;
  btnPrint.disabled = true;
  previewEl.srcdoc = "";

  try {
    const body = buildRequestBody();
    const raw = await callApi(body);
    jsonEl.textContent = raw;

    const htmlFromApi = normalizeHtmlResponse(raw);
    if (htmlFromApi) {
      renderInIframe(htmlFromApi);
      setStatus("Listo (HTML A4 generado por la API).");
      return;
    }

    const lines = normalizeLines(raw);
    const { title, items } = linesToCards(lines);
    if (!items.length) throw new Error("La API no devolvió contenido imprimible.");

    renderInIframe(buildA4CardsHtml(title, items, 3, 4));
    setStatus("Listo (convertido a A4 desde texto).");
  } catch (err) {
    setStatus(err.message || "Error desconocido", true);
  } finally {
    btn.disabled = false;
  }
});
