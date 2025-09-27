// app.js v3 — proxy via /api, visible version, inline debug

const VERSION = "v3";
const WORKER_URL = "/api";
const DEFAULT_MODEL = "latest";
const $ = (id) => document.getElementById(id);

function currentModel() {
  const sel = $("engineSelect");
  return sel?.value || DEFAULT_MODEL;
}

// Show version in status chip suffix so we know THIS file is live
function setStatus(text, cls) {
  const st = $("apiStatus");
  if (!st) return;
  st.textContent = `${text} • ${VERSION}`;
  st.classList.remove("ok","err");
  if (cls) st.classList.add(cls);
}

// ===== Health =====
(async () => {
  setStatus("checking…");
  try {
    const r = await fetch(`${WORKER_URL}/v1/health?cb=${Date.now()}`, { cache:"no-store" });
    const raw = await r.text();
    let j; try { j = JSON.parse(raw); } catch {}
    if (j?.ok) setStatus(`online (${j.latest || "latest"})`, "ok");
    else setStatus(`error (${r.status})`, "err");
    // also print to console for quick sanity
    console.log("HEALTH RAW:", raw);
  } catch (e) {
    setStatus("offline", "err");
    console.error("HEALTH FAILED:", e);
  }
})();

// ===== Sidebar switching =====
(() => {
  const view = $("view");
  const links = [...document.querySelectorAll(".side-link")];
  if (!view || !links.length) return;
  function show(name){
    view.querySelectorAll(".panel").forEach(p=>p.classList.remove("is-visible"));
    view.querySelector(`[data-panel="${name}"]`)?.classList.add("is-visible");
    links.forEach(b=>b.classList.toggle("is-active", b.dataset.view === name));
  }
  links.forEach(b=>b.addEventListener("click", ()=>show(b.dataset.view)));
})();

// ===== Chat =====
(() => {
  const log  = $("chatLog");
  const form = $("chatForm");
  const box  = $("chatBox");
  if (!log || !form || !box) return;

  const hist = JSON.parse(localStorage.getItem("elwyn:chat") || "[]");
  const add  = (role, text) => { const d=document.createElement("div"); d.className="bubble "+(role==="user"?"user":"assistant"); d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; };
  const save = () => localStorage.setItem("elwyn:chat", JSON.stringify(hist));
  hist.forEach(m => add(m.role, m.content));

  $("clearChat")?.addEventListener("click", () => { localStorage.removeItem("elwyn:chat"); log.innerHTML=""; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (box.value || "").trim(); if (!text) return;
    box.value = ""; hist.push({ role:"user", content:text }); add("user", text); save();
    const thinking = document.createElement("div"); thinking.className="bubble assistant"; thinking.textContent="…thinking…";
    log.appendChild(thinking); log.scrollTop = log.scrollHeight;

    try {
      const r = await fetch(`${WORKER_URL}/v1/chat`, {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ model: currentModel(), messages: hist })
      });
      const raw = await r.text();
      let j; try { j = JSON.parse(raw); } catch {}
      const extra = j?.modelUsed ? `\n\n— via ${j.modelUsed}` : "";
      const reply = j?.ok ? (j.reply || "(no reply)") + extra : `Error (${r.status}): ${j?.error || raw}`;
      thinking.remove(); hist.push({ role:"assistant", content: reply }); save(); add("assistant", reply);
      console.log("CHAT RAW:", raw);
    } catch (err) {
      thinking.remove(); add("assistant", "Network error: "+(err?.message || err));
      console.error("CHAT FAILED:", err);
    }
  });
})();

// ===== Text → Image =====
(() => {
  const form = $("imgForm");
  const input = $("imgPrompt");
  const out   = $("imgOut");
  if (!form || !input || !out) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = (input.value || "").trim(); if (!p) return;
    out.innerHTML = `<div class="muted">Generating…</div>`;
    try {
      const r = await fetch(`${WORKER_URL}/v1/image`, {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ prompt:p, size:"1024x1024" })
      });
      const raw = await r.text();
      let j; try { j = JSON.parse(raw); } catch {}
      if (j?.ok && j.image_b64) {
        const img = new Image();
        img.src = "data:image/png;base64," + j.image_b64;
        img.alt = "generated image";
        img.style.width = "100%";
        out.innerHTML = ""; out.appendChild(img);
      } else {
        out.innerHTML = `<div class="muted">Error (${r.status}): ${j?.error || raw}</div>`;
      }
      console.log("IMAGE RAW:", raw);
    } catch (err) {
      out.innerHTML = `<div class="muted">Network error: ${(err?.message || err)}</div>`;
      console.error("IMAGE FAILED:", err);
    }
  });
})();
