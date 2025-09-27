// app.js — uses /api proxy; shows detailed errors in #debug

// ===== CONFIG =====
const WORKER_URL = "/api";
const DEFAULT_MODEL = "latest";
const $ = (id) => document.getElementById(id);

// ===== Health badge (+debug) =====
(async () => {
  const st = $("apiStatus");
  const dbg = $("debug");
  if (!st) return;
  st.textContent = "checking…";
  try {
    const res = await fetch(`${WORKER_URL}/v1/health?cb=${Date.now()}`, { cache: "no-store" });
    const text = await res.text();
    let j; try { j = JSON.parse(text); } catch { j = null; }
    if (j?.ok) {
      st.textContent = `online (${j.latest || "latest"})`;
      st.classList.add("ok");
      dbg && (dbg.textContent = JSON.stringify(j, null, 2));
    } else {
      st.textContent = "error";
      st.classList.add("err");
      dbg && (dbg.textContent = `Health non-ok. Status ${res.status}\n\n${text}`);
    }
  } catch (e) {
    st.textContent = "offline";
    st.classList.add("err");
    $("debug") && (dbg.textContent = `Health fetch failed: ${e}`);
  }
})();

function currentModel() {
  const sel = document.getElementById("engineSelect");
  return sel?.value || DEFAULT_MODEL;
}

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
  const log  = $("chatLog");
  const form = $("chatForm");
  const box  = $("chatBox");
  const dbg  = $("debug");
  if (!log || !form || !box) return;

  const hist = JSON.parse(localStorage.getItem("elwyn:chat") || "[]");
  const add = (role, text) => { const d=document.createElement("div"); d.className="bubble "+(role==="user"?"user":"assistant"); d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; };
  const save = () => localStorage.setItem("elwyn:chat", JSON.stringify(hist));
  hist.forEach(m => add(m.role, m.content));

  $("clearChat")?.addEventListener("click", () => { localStorage.removeItem("elwyn:chat"); log.innerHTML = ""; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (box.value || "").trim(); if (!text) return;
    box.value = ""; hist.push({ role: "user", content: text }); add("user", text); save();

    const thinking = document.createElement("div");
    thinking.className = "bubble assistant"; thinking.textContent = "…thinking…";
    log.appendChild(thinking); log.scrollTop = log.scrollHeight;

    try {
      const r = await fetch(`${WORKER_URL}/v1/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: currentModel(), messages: hist })
      });
      const raw = await r.text();
      let j; try { j = JSON.parse(raw); } catch { j = null; }
      const extra = j?.modelUsed ? `\n\n— via ${j.modelUsed}` : "";
      const reply = j?.ok ? (j.reply || "(no reply)") + extra : `Error (${r.status}): ${j?.error || raw}`;

      thinking.remove();
      hist.push({ role: "assistant", content: reply }); save(); add("assistant", reply);
      dbg && (dbg.textContent = j ? JSON.stringify(j, null, 2) : raw);
    } catch (err) {
      thinking.remove();
      add("assistant", "Network error: " + (err?.message || err));
      dbg && (dbg.textContent = "Chat fetch failed: " + (err?.message || err));
    }
  });
})();

// ===== Text → Image =====
(() => {
  const form = $("imgForm");
  const input = $("imgPrompt");
  const out   = $("imgOut");
  const dbg   = $("debug");
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
      const raw = await r.text();
      let j; try { j = JSON.parse(raw); } catch { j = null; }
      if (j?.ok && j.image_b64) {
        const img = new Image();
        img.src = "data:image/png;base64," + j.image_b64;
        img.alt = "generated image";
        img.style.width = "100%";
        out.innerHTML = "";
        out.appendChild(img);
      } else {
        out.innerHTML = `<div class="muted">Error (${r.status}): ${j?.error || raw}</div>`;
      }
      dbg && (dbg.textContent = j ? JSON.stringify(j, null, 2) : raw);
    } catch (err) {
      out.innerHTML = `<div class="muted">Network error: ${(err?.message || err)}</div>`;
      dbg && (dbg.textContent = "Image fetch failed: " + (err?.message || err));
    }
  });
})();
