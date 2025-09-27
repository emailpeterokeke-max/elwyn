// Elwyn AI — App wiring (chat + image). Uses your custom API domain.

// ==== CONFIG ====
const WORKER_URL = "https://api.elwyn.io"; // <- first-party API domain
function currentModel() {
  const sel = document.getElementById("engineSelect");
  return sel?.value || "latest";
}

// ==== Health badge ====
(async () => {
  const st = document.getElementById("apiStatus");
  if (!st) return;
  try {
    const r = await fetch(`${WORKER_URL}/v1/health`, { cache: "no-store" });
    const j = await r.json().catch(() => null);
    st.textContent = j?.ok ? `online (${j.latest || "latest"})` : "error";
  } catch {
    st.textContent = "offline";
  }
})();

// ==== Simple view switcher (sidebar) ====
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

// ==== Chat ====
(() => {
  const chatLog  = document.getElementById("chatLog");
  const chatForm = document.getElementById("chatForm");
  const chatBox  = document.getElementById("chatBox");
  if (!chatForm || !chatLog || !chatBox) return;

  const hist = JSON.parse(localStorage.getItem("elwyn:chat") || "[]");
  function add(role, text) {
    const d = document.createElement("div");
    d.className = "bubble " + (role === "user" ? "user" : "assistant");
    d.textContent = text;
    chatLog.appendChild(d);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function save() { localStorage.setItem("elwyn:chat", JSON.stringify(hist)); }
  hist.forEach(m => add(m.role, m.content));

  document.getElementById("clearChat")?.addEventListener("click", () => {
    localStorage.removeItem("elwyn:chat");
    chatLog.innerHTML = "";
  });

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = (chatBox.value || "").trim(); if (!text) return;
    chatBox.value = "";
    hist.push({ role: "user", content: text }); add("user", text); save();
    const thinking = document.createElement("div");
    thinking.className = "bubble assistant"; thinking.textContent = "…thinking…";
    chatLog.appendChild(thinking); chatLog.scrollTop = chatLog.scrollHeight;

    try {
      const r = await fetch(`${WORKER_URL}/v1/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: currentModel(), messages: hist })
      });
      const j = await r.json().catch(() => ({}));
      const extra = j.modelUsed ? `\n\n— via ${j.modelUsed}${j.note ? " • " + j.note : ""}` : "";
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

// ==== Text → Image ====
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

// ==== Placeholders for upcoming tools ====
document.getElementById("audForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("audOut").textContent = "Queued (API wiring next)…";
});
document.getElementById("vidForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("vidOut").textContent = "Queued (API wiring next)…";
});
