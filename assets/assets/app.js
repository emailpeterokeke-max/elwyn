// app.js — health + sidebar nav + chat + image, with working listeners

// ===== CONFIG =====
const WORKER_URL = "https://elwyn.emailpeterokeke.workers.dev";
const DEFAULT_MODEL = "gpt-4o";
function currentModel() {
  const sel = document.getElementById("engineSelect");
  return sel?.value || DEFAULT_MODEL;
}

// ===== Health badge =====
(async () => {
  const st = document.getElementById("apiStatus");
  if (!st) return;
  st.textContent = "checking…";
  try {
    const r = await fetch(`${WORKER_URL}/v1/health`, { cache: "no-store" });
    const j = await r.json().catch(() => null);
    st.textContent = j?.ok ? `online (${j.latest || "latest"})` : "error";
  } catch {
    st.textContent = "offline";
  }
})();

// ===== Sidebar switching =====
(() => {
  const view = document.getElementById("view");
  const links = [...document.querySelectorAll(".side-link")];
  if (!view || !links.length) return;
  function show(name) {
    view.querySelectorAll(".panel").forEach(p => p.classList.remove("is-visible"));
    view.querySelector(`[data-panel="${name}"]`)?.classList.add("is-visible");
    links.forEach(b => b.classList.toggle("is-active", b.dataset.view === name));
  }
  links.forEach(b => b.addEventListener("click", () => show(b.dataset.view)));
})();

// ===== Chat =====
(() => {
  const log  = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const box  = document.getElementById("chatBox");
  if (!log || !form || !box) return;

  const hist = JSON.parse(localStorage.getItem("elwyn:chat") || "[]");
  function add(role, text) {
    const d = document.createElement("div");
    d.className = "bubble " + (role === "user" ? "user" : "assistant");
    d.textContent = text;
    log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function save() { localStorage.setItem("elwyn:chat", JSON.stringify(hist)); }
  hist.forEach(m => add(m.role, m.content));

  document.getElementById("clearChat")?.addEventListener("click", () => {
    localStorage.removeItem("elwyn:chat");
    log.innerHTML = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (box.value || "").trim(); if (!text) return;
    box.value = "";
    hist.push({ role: "user", content: text }); add("user", text); save();

    const thinking = document.createElement("div");
    thinking.className = "bubble assistant"; thinking.textContent = "…thinking…";
    log.appendChild(thinking); log.scrollTop = log.scrollHeight;

    try {
      const r = await fetch(`${WORKER_URL}/v1/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: currentModel(), messages: hist })
      });
      const j = await r.json().catch(() => ({}));
      const extra = j.modelUsed ? `\n\n— via ${j.modelUsed}` : "";
      const reply = (j.reply || "(no reply)") + extra;

      thinking.remove();
      hist.push({ role: "assistant", content: reply }); save();
      add("assistant", reply);
    } catch (err) {
      thinking.remove();
      add("assistant", "Server error: " + (err?.message || err));
    }
  });
})();

// ===== Text → Image =====
(() => {
  const form = document.getElementById("imgForm");
  const input = document.getElementById("imgPrompt");
  const out   = document.getElementById("imgOut");
  if (!form || !input || !out) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = (input.value || "").trim(); if (!p) return;
    out.innerHTML = `<div class="muted">Generating…</div>`;
    try {
      const r = await fetch(`${WORKER_URL}/v1/image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p, size: "1024x1024" })
      });
      const j = await r.json().catch(() => ({}));
      if (j?.ok && j.image_b64) {
        const img = new Image();
        img.src = "data:image/png;base64," + j.image_b64;
        img.alt = "generated image";
        img.style.width = "100%";
        out.innerHTML = "";
        out.appendChild(img);
      } else {
        out.innerHTML = `<div class="muted">Error: ${j?.error || "failed"}</div>`;
      }
    } catch (err) {
      out.innerHTML = `<div class="muted">Server error: ${(err?.message || err)}</div>`;
    }
  });
})();

// ===== Placeholders =====
document.getElementById("audForm")?.addEventListener("submit", (e) => {
  e.preventDefault(); document.getElementById("audOut").textContent = "Queued (API wiring next)…";
});
document.getElementById("vidForm")?.addEventListener("submit", (e) => {
  e.preventDefault(); document.getElementById("vidOut").textContent = "Queued (API wiring next)…";
});
