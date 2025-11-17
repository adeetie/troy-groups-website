
window.TGX = Object.assign({
  calendlyUrl: "https://calendly.com/reach-aditibajpai/30min",
  tyMsg: "thankyou-message.html",
  tyMeet: "thankyou-meeting.html",
  defaultTab: (document.body.dataset.scheduleDefault || "meeting").toLowerCase()
}, window.TGX || {});


const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));


let FS_ACTIVE = false;
let resizeBound = null;
let footMO = null;   
let footRO = null;   

document.addEventListener("DOMContentLoaded", () => {
  injectFocusStyles();     
  initTabs();
  initMsgForm();
  initCalendly();
  activateDefaultTab();
});


function injectFocusStyles(){
  if (document.getElementById("tg-cal-focus-css")) return;
  const css = `
    body.cal-focus .tg-schedule{ display:block !important; grid-template-columns:1fr !important; }
    body.cal-focus .tg-visual{ display:none !important; }
    body.cal-focus .tg-copy{ display:none !important; }
    body.cal-focus .tg-top-tabs{ display:none !important; }

    body.cal-focus .tg-pane{
      max-width:1200px !important; width:100% !important;
      margin:0 auto !important; padding-left:0 !important; padding-right:0 !important;
    }
    body.cal-focus .tg-cal-card{
      max-width:1200px !important; width:100% !important;
      margin:0 auto !important; padding:0 !important; box-shadow:none !important; border:0 !important;
    }

    body.cal-focus #cal-slot{
      width:100% !important;
      min-height:calc(100vh - var(--tg-header,80px) - var(--tg-footer,280px)) !important;
      margin:0 auto !important;
      padding-bottom:24px !important;
      box-sizing:border-box !important;
    }
    body.cal-focus #cal-slot > div,
    body.cal-focus #cal-slot iframe{
      width:100% !important; height:100% !important; display:block !important; border:0 !important;
    }
  `;
  const style = document.createElement("style");
  style.id = "tg-cal-focus-css";
  style.textContent = css;
  document.head.appendChild(style);
}


function initTabs(){
  const tabs = $$(".tg-top-tab");
  const send = $("#tab-send");
  const meet = $("#tab-meeting");
  if (!tabs.length || !send || !meet) return;

  
  const isLoggedIn = () => {
    
    return !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  };
  
  
  const fromSignup = new URLSearchParams(location.search).has('signup');

  const show = (name) => {
    
    if (name === "meeting" && !isLoggedIn() && !fromSignup) {
      location.href = "signup.html";
      return;
    }
    
    const isMeet = name === "meeting";
    tabs.forEach(b => {
      const on = b.dataset.tab === name;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    send.hidden =  isMeet; send.classList.toggle("is-visible", !isMeet);
    meet.hidden = !isMeet; meet.classList.toggle("is-visible",  isMeet);
    document.body.classList.toggle("tab-meet", isMeet);
    document.body.classList.toggle("tab-send", !isMeet);
    exitFocusMode(); 
  };

  tabs.forEach(b => b.addEventListener("click", () => show(b.dataset.tab)));
}

function activateDefaultTab(){
  
  const fromSignup = new URLSearchParams(location.search).has('signup');
  const want = fromSignup ? "meeting" : (window.TGX.defaultTab === "meeting" ? "meeting" : "send");
  const t = document.querySelector(`.tg-top-tab[data-tab="${want}"]`);
  if (t) t.click();
}


function initMsgForm(){
  const f = $("#msgForm");
  if (!f) return;
  f.addEventListener("submit", (e)=>{
    if (!f.checkValidity()){ e.preventDefault(); f.reportValidity(); return; }
    e.preventDefault();
    location.href = window.TGX.tyMsg;
  });
}


function initCalendly(){
  const slot = $("#cal-slot");
  if (!slot) return;

  
  const qs = new URLSearchParams(location.search);
  const prefill = {};
  const first = (qs.get("first") || "").trim();
  const last  = (qs.get("last")  || "").trim();
  const email = (qs.get("email") || "").trim();
  const message = (qs.get("message") || "").trim();
  if (first || last) prefill.name = [first, last].filter(Boolean).join(" ");
  if (email) prefill.email = email;
  if (message) prefill.customAnswers = [{ question: "Notes", answer: message }];

  (function wait(){
    if (window.Calendly && window.Calendly.initInlineWidget){
      slot.innerHTML = "";
      window.Calendly.initInlineWidget({
        url: window.TGX.calendlyUrl,
        parentElement: slot,
        prefill
      });
      ensureIframeFills(slot);
    } else { requestAnimationFrame(wait); }
  })();

  
  window.addEventListener("message", (ev)=>{
    let data = ev.data;
    if (!data) return;
    if (typeof data === "string"){ try { data = JSON.parse(data); } catch {} }
    let evt = data && data.event;
    if (evt === "calendly.message" && data.payload?.event) evt = "calendly."+data.payload.event;
    if (typeof evt !== "string") return;

    const name = evt.toLowerCase();
    console.log("📅 Calendly event detected:", name, data); 
    
    
    
    if (name.includes("event_type_viewed") || 
        name.includes("date_and_time") || 
        name.includes("profile_page_viewed") ||
        name.includes("page_height")) {
      console.log("✅ Focus mode triggered by:", name);
      enterFocusMode();
    }
    if (name.includes("event_scheduled")) {
      console.log("✅ Event scheduled, redirecting...");
      exitFocusMode();
      location.href = window.TGX.tyMeet;
    }
  }, false);
}

function ensureIframeFills(slot){
  const apply = () => {
    const fr = slot.querySelector("iframe");
    if (fr){
      fr.style.width = "100%";
      fr.style.height = "100%";
      fr.style.border = "0";
      fr.style.display = "block";
    }
  };
  new MutationObserver(apply).observe(slot, { childList:true, subtree:true });
  apply();
}


const getHeader = () => document.querySelector("header, .tgx-header");
const getFooter = () => document.getElementById("site-footer") || document.querySelector("footer, .tgx-footer");

function enterFocusMode(){
  if (FS_ACTIVE) { updateFocusSizes(); return; }
  FS_ACTIVE = true;

  
  document.body.classList.add("cal-focus");

  
  updateFocusSizes();

  if (!resizeBound){
    resizeBound = () => updateFocusSizes();
    window.addEventListener("resize", resizeBound);
  }

  
  const host = document.getElementById("site-footer") || document.body;
  if (footMO) footMO.disconnect();
  footMO = new MutationObserver(updateFocusSizes);
  footMO.observe(host, { childList:true, subtree:true });

  const footer = getFooter();
  if (footer && "ResizeObserver" in window){
    if (footRO) footRO.disconnect();
    footRO = new ResizeObserver(updateFocusSizes);
    footRO.observe(footer);
  }

  
  const slot = $("#cal-slot");
  if (slot) slot.scrollIntoView({ behavior: "instant", block: "start" });
}

function exitFocusMode(){
  if (!FS_ACTIVE) return;
  FS_ACTIVE = false;

  document.body.classList.remove("cal-focus");

  if (resizeBound){ window.removeEventListener("resize", resizeBound); resizeBound = null; }
  if (footMO){ footMO.disconnect(); footMO = null; }
  if (footRO){ footRO.disconnect(); footRO = null; }

  
  document.documentElement.style.removeProperty("--tg-header");
  document.documentElement.style.removeProperty("--tg-footer");
}


function updateFocusSizes(){
  const h = getHeader();
  const f = getFooter();
  const hH = h ? Math.round(h.getBoundingClientRect().height) : 0;
  const fH = f ? Math.round(f.getBoundingClientRect().height) : 0;

  document.documentElement.style.setProperty("--tg-header", hH + "px");
  document.documentElement.style.setProperty("--tg-footer", fH + "px");

  
  const fr = $("#cal-slot iframe");
  if (fr){
    fr.style.width = "100%";
    fr.style.height = "100%";
    fr.style.display = "block";
    fr.style.border = "0";
  }
}
