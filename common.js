const cfg = window.CASA_IRATI_CONFIG;
if (!cfg || !cfg.url || cfg.url.includes('TU-PROYECTO') || !cfg.key || cfg.key.includes('TU_PUBLISHABLE')) {
  document.body.insertAdjacentHTML('afterbegin','<div style="background:#fff2cf;padding:14px;text-align:center;color:#5b4314">Configura primero la URL y la clave pública en <strong>config.js</strong>.</div>');
}
const db = window.supabase.createClient(cfg.url, cfg.key);
const euros = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const show = (id,msg,error=false) => { const el=document.getElementById(id);el.textContent=msg;el.className='message'+(error?' error':''); };
