/***********************
 * CONFIG
 ***********************/
const API_URL = "https://magicloops.dev/api/loop/fe9a0b9d-8b5c-43d0-8554-3ed8a32f095a/run";

/***********************
 * HELPERS
 ***********************/
const $ = (id) => document.getElementById(id);

const form = $("form");
const statusEl = $("status");
const previewEl = $("preview");
const btnPrint = $("btnPrint");
const btn = $("btn");

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", !!isError);
}

/***********************
 * API CALL (HTML ONLY)
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

  // Devuelve HTML directamente
  return {
    ok: true,
    printable: {
      html_a4: text
    }
  };
}

/***********************
 * BUILD REQUEST BODY
 ***********************/
function buildRequestBody() {
  return {
    prompt: $("prompt").value || "Generar material imprimible",
    parameters: {
      age_years: Number($("age").value || 4),
      dx: $("dx").value || "TEL",
      goal: $("goal").value || "Trabajar objetivo logopédico",
      theme: $("interests").value || "general",
      material_type: $("type").value.replace("material_", ""), // tarjetas / tablero / hoja
      items_count: 12
    }
  };
}

/***********************
 * RENDER HTML A4
 ***********************/
function renderPrintable(html) {
  const fullDoc = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Material imprimible</title>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();

  previewEl.srcdoc = fullDoc;
  btnPrint.disabled = false;
}

/***********************
 * EVENTS
 ***********************/
btnPrint.addEventListener("click", () => {
  try {
    previewEl.contentWindow.focus();
    previewEl.contentWindow.print();
  } catch {
    alert("No se pudo imprimir. Usa Ctrl+P dentro de la vista previa.");
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  setStatus("Generando material...");
  btn.disabled = true;
  btnPrint.disabled = true;
  previewEl.srcdoc = "";

  try {
    const body = buildRequestBody();
    const data = await callApi(body);

    if (!data.printable?.html_a4) {
      throw new Error("La API no devolvió HTML imprimible");
    }

    renderPrintable(data.printable.html_a4);
    setStatus("Material generado correctamente.");
  } catch (err) {
    setStatus(err.message || "Error desconocido", true);
  } finally {
    btn.disabled = false;
  }
});
