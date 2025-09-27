// Elwyn AI — wired to Vercel proxy → Worker (chat, image, tts)

// Use the Vercel host that works on your work Wi-Fi
const WORKER_URL = "https://elwyn-ivory.vercel.app/api";
const BASE = WORKER_URL.replace(/\/$/, "");

// Current model (dropdown optional)
function currentModel() {
  return document.getElementById("engineSelect")?.value || "latest";
}

/* ========== Health ========== */
(async () => {
  const st = document.getElementById("apiStatus");
  if (!st) return;
  st.textContent = "checking…";
  try {
    const r = await fetch(`${BASE}/v1/health`, { cache: "no-store" });
    const j = await r.json().catch(() => null);
    st.textContent = j?.ok ? `online (${j.latest || "latest"})` : "error";
    st.style.color = j?.ok ? "#6bd899" : "#ff8b8b";
  } catch {
    st.textContent = "offline";
    st.style.color = "#ff8b8b";
  }
})();

/* ========== Sidebar views (if present) ========== */
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

/* ========== Chat ========== */
(() => {
  const log  = document.getElementById("chatLog");
  const form = document.getElementById("chatForm");
  const box  = document.getElementById("chatBox");
  if (!form || !log || !box) return;

  const key = "elwyn:chat";
  const hist = JSON.parse(localStorage.getItem(key) || "[]");
  const add = (role, text) => {
    const d = document.createElement("div");
    d.className = "bubble " + (role === "user" ? "user" : "assistant");
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  };
  const save = () => localStorage.setItem(key, JSON.stringify(hist));
  hist.forEach(m => add(m.role, m.content));

  document.getElementById("clearChat")?.addEventListener("click", () => {
    localStorage.removeItem(key);
    log.innerHTML = "";
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = (box.value || "").trim();
    if (!text) return;
    box.value = "";

    hist.push({ role: "user", content: text });
    add("user", text);
    save();

    const thinking = document.createElement("div");
    thinking.className = "bubble assistant";
    thinking.textContent = "…thinking…";
    log.appendChild(thinking);
    log.scrollTop = log.scrollHeight;

    try {
      const r = await fetch(`${BASE}/v1/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: currentModel(), messages: hist }),
      });
      const j = await r.json().catch(() => ({}));
      const extra = j?.modelUsed ? `\n\n— via ${j.modelUsed}${j.note ? " • " + j.note : ""}` : "";
      const reply = (j?.reply || "(no reply)") + extra;

      thinking.remove();
      hist.push({ role: "assistant", content: reply });
      save();
      add("assistant", reply);
    } catch (err) {
      thinking.remove();
      add("assistant", "Server error: " + (err?.message || err));
    }
  });
})();

/* ========== Text → Image ========== */
(() => {
  const form = document.getElementById("imgForm");
  const input = document.getElementById("imgPrompt");
  const out   = document.getElementById("imgOut");
  if (!form || !input || !out) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const p = (input.value || "").trim();
    if (!p) return;

    out.innerHTML = `<div class="muted">Generating…</div>`;
    try {
      const r = await fetch(`${BASE}/v1/image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p, size: "1024x1024" }),
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

/* ========== Text → Sound (TTS) ========== */
(() => {
  const form = document.getElementById("audForm");
  const input = document.getElementById("audPrompt");
  const out   = document.getElementById("audOut");
  const voiceSel = document.getElementById("audVoice"); // optional
  if (!form || !input || !out) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = (input.value || "").trim();
    if (!text) return;

    out.innerHTML = `<div class="muted">Synthesizing…</div>`;
    try {
      const r = await fetch(`${BASE}/v1/tts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, voice: voiceSel?.value || "alloy", format: "mp3" }),
      });
      const j = await r.json().catch(() => ({}));
      if (j?.ok && j.audio_b64) {
        const src = `data:audio/${j.format};base64,${j.audio_b64}`;
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = src;

        const a = document.createElement("a");
        a.href = src;
        a.download = `elwyn-tts.${j.format}`;
        a.textContent = "Download audio";

        out.innerHTML = "";
        out.appendChild(audio);
        out.appendChild(document.createElement("br"));
        out.appendChild(a);
      } else {
        out.innerHTML = `<div class="muted">Error: ${j?.error || "failed"}</div>`;
      }
    } catch (err) {
      out.innerHTML = `<div class="muted">Server error: ${(err?.message || err)}</div>`;
    }
  });
})();
