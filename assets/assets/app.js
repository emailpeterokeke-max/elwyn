(() => {
(async () => {
const st = document.getElementById("apiStatus");
try {
const r = await fetch(`${https://elwyn.<your-handle>.workers.dev}/v1/health`, { cache:"no-store" });
const j = await r.json().catch(()=>null);
st.textContent = (j && j.ok) ? `online (${j.latest||"latest"})` : "error";
} catch { st.textContent = "offline"; }
})();


// ---------- Chat ----------
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatBox = document.getElementById("chatBox");
const hist = JSON.parse(localStorage.getItem("elwyn:chat")||"[]");
function addBubble(role, text){
const d = document.createElement("div");
d.className = "bubble " + (role==="user"?"user":"assistant");
d.textContent = text;
chatLog.appendChild(d); chatLog.scrollTop = chatLog.scrollHeight;
}
function save(){ localStorage.setItem("elwyn:chat", JSON.stringify(hist)); }
hist.forEach(m=>addBubble(m.role,m.content));


chatForm?.addEventListener("submit", async (e)=>{
e.preventDefault();
const text = (chatBox.value||"").trim(); if(!text) return;
chatBox.value = "";
hist.push({ role:"user", content:text }); addBubble("user", text); save();
addBubble("assistant","…thinking…");


try{
const r = await fetch(`${https://elwyn.<your-handle>.workers.dev}/v1/chat`, {
method:"POST",
headers:{ "content-type": "application/json" },
body: JSON.stringify({ model: currentModel(), messages: hist })
});
const j = await r.json().catch(()=> ({}));
const reply = (j.reply || "(no reply)") + (j.modelUsed ? `\n\n— via ${j.modelUsed}${j.note ? " • "+j.note : ""}` : "");
hist.push({ role:"assistant", content: reply }); save();
addBubble("assistant", reply);
}catch(err){
addBubble("assistant", "Server error: " + (err?.message||err));
}
});


// ---------- Text → Image ----------
const imgForm = document.getElementById("imgForm");
const imgPrompt = document.getElementById("imgPrompt");
const imgOut = document.getElementById("imgOut");
imgForm?.addEventListener("submit", async (e)=>{
e.preventDefault();
const p = (imgPrompt.value||"").trim(); if(!p) return;
imgOut.innerHTML = `<div class="note">Generating…</div>`;
try{
const r = await fetch(`${WORKER_URL}/v1/image`, {
method:"POST",
headers:{ "content-type":"application/json" },
body: JSON.stringify({ prompt: p, size:"1024x1024" })
});
const j = await r.json();
if (j.ok && j.image_b64) {
const img = new Image();
img.src = "data:image/png;base64," + j.image_b64;
img.alt = "generated image";
img.style.width = "100%";
imgOut.innerHTML = ""; imgOut.appendChild(img);
} else {
imgOut.innerHTML = `<div class="note">Error: ${j.error || "failed"}</div>`;
}
}catch(err){ imgOut.innerHTML = `<div class="note">Server error: ${err}`; }
});


// ---------- Placeholders (wired in later steps) ----------
document.getElementById("vidForm")?.addEventListener("submit",(e)=>{ e.preventDefault(); document.getElementById("vidOut").textContent="Queued (API wiring next)…"; });
document.getElementById("audForm")?.addEventListener("submit",(e)=>{ e.preventDefault(); document.getElementById("audOut").textContent="Queued (API wiring next)…"; });
})();
