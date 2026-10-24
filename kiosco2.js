const kIso=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
let bFecha=kIso(new Date()),bModo='d',bTab='i',bItems=[],dSaldo={},dS={};
try{dSaldo=JSON.parse(localStorage.getItem('k_cta')||'{}')}catch(e){}
const bHora=s=>new Date(s).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

/* ---------- Balance ---------- */
function bRango(){
const a=new Date(bFecha+'T00:00:00'),b=new Date(a);
if(bModo==='d')b.setDate(b.getDate()+1);else{a.setDate(1);b.setTime(a.getTime());b.setMonth(b.getMonth()+1)}
return [a.toISOString(),b.toISOString()];
}
async function kBal(){
$('bFecha').value=bFecha;
$('bDia').classList.toggle('sel',bModo==='d');$('bMes').classList.toggle('sel',bModo==='m');
if(!navigator.onLine){$('bResumen').innerHTML='<div class="st">El balance necesita señal.</div>';$('bLista').innerHTML='';return}
$('bResumen').innerHTML='<div class="st">Cargando…</div>';
await kSync();
const [d,h]=bRango(),c=perfil.campo_id;
const rg=q=>q.eq('campo_id',c).gte('created_at',d).lt('created_at',h).order('created_at',{ascending:false}).limit(1000);
const [m,g,k]=await Promise.all([
rg(sb.from('k_mov').select('tipo,cantidad,precio,costo,total,fiado,created_at,k_productos(nombre),k_proveedores(nombre),profiles(email)')),
rg(sb.from('k_gastos').select('concepto,monto,created_at')),
rg(sb.from('k_cuenta').select('cliente,monto,created_at').lt('monto',0))]);
const er=m.error||g.error||k.error;
if(er){$('bResumen').innerHTML='<div class="st">No se pudo cargar: '+esc(er.message)+'</div>';return}
const q=e=>e?String(e.email||'').split('@')[0]:'';
bItems=[];
m.data.forEach(x=>{
const n=x.k_productos?x.k_productos.nombre:'(producto quitado)',w=q(x.profiles),t=+x.total;
if(x.tipo==='venta')bItems.push({k:x.fiado?'f':'i',d:x.created_at,t:n+' × '+(+x.cantidad)+(x.fiado?' (fiado)':''),s:w,m:t,g:(x.precio-x.costo)*x.cantidad,tipo:'Venta'+(x.fiado?' fiada':''),n:+x.cantidad});
else if(x.tipo==='ingreso')bItems.push({k:'e',d:x.created_at,t:'Mercadería: '+n+' × '+(+x.cantidad),s:(x.k_proveedores?x.k_proveedores.nombre+' · ':'')+w,m:t,tipo:'Compra',n:+x.cantidad});
});
g.data.forEach(x=>bItems.push({k:'e',d:x.created_at,t:'Gasto: '+x.concepto,s:'',m:+x.monto,tipo:'Gasto',n:''}));
k.data.forEach(x=>bItems.push({k:'i',d:x.created_at,t:'Cobro de deuda: '+x.cliente,s:'',m:-x.monto,tipo:'Cobro de deuda',n:''}));
bItems.sort((a,b)=>b.d.localeCompare(a.d));
const S=z=>bItems.filter(x=>x.k===z).reduce((s,x)=>s+x.m,0);
const ing=S('i'),egr=S('e'),fia=S('f'),gan=bItems.filter(x=>x.g!=null).reduce((s,x)=>s+x.g,0),bal=ing-egr;
$('bResumen').innerHTML=`<div style="display:flex;justify-content:space-between;font-size:20px"><span>Balance</span><b style="color:${bal<0?'#c62828':'#1e9e4a'}">${money(bal)}</b></div><div class="two" style="margin-top:12px"><div><small>↗ Ingresos</small><br><b>${money(ing)}</b></div><div><small>↙ Egresos</small><br><b>${money(egr)}</b></div></div><div class="st" style="margin-top:10px">Ganancia de lo vendido: ${money(gan)} · Fiado en el período: ${money(fia)}</div>`;
bLista();
}
function bLista(){
$('bTI').classList.toggle('sel',bTab==='i');$('bTE').classList.toggle('sel',bTab==='e');
$('bLista').innerHTML=bItems.filter(x=>bTab==='i'?x.k!=='e':x.k==='e').map(x=>`<div class="row"><div style="flex:1"><b>${esc(x.t)}</b><br><small>${bHora(x.d)}${x.s?' · '+esc(x.s):''}</small></div><b style="${x.k==='f'?'color:#999':''}">${money(x.m)}</b></div>`).join('')||'<div class="st">No hay movimientos.</div>';
}
const bMover=n=>{const a=new Date(bFecha+'T00:00:00');if(bModo==='d')a.setDate(a.getDate()+n);else a.setMonth(a.getMonth()+n);bFecha=kIso(a);kBal()};
$('bPrev').onclick=()=>bMover(-1);$('bNext').onclick=()=>bMover(1);
$('bFecha').onchange=e=>{if(e.target.value){bFecha=e.target.value;kBal()}};
$('bDia').onclick=()=>{bModo='d';kBal()};$('bMes').onclick=()=>{bModo='m';kBal()};
$('bTI').onclick=()=>{bTab='i';bLista()};$('bTE').onclick=()=>{bTab='e';bLista()};
$('bGasto').onclick=()=>{
$('bForm').innerHTML='<div class="card"><h3 style="margin-top:0">Nuevo gasto</h3><label>Concepto</label><input id="xC" placeholder="Ej: Luz, alquiler, bolsas…" autocomplete="off"><label>Monto ($)</label><input id="xM" type="number" inputmode="decimal"><div style="display:flex;gap:8px;margin-top:12px"><button class="chip" data-b="ok">Guardar</button><button class="chip" data-b="no">Cancelar</button></div></div>';
window.scrollTo(0,document.body.scrollHeight);
};
$('bForm').onclick=e=>{
const b=e.target.dataset.b;if(!b)return;
if(b==='ok'){
const c=$('xC').value.trim(),m=kNum($('xM').value);
if(!c||!(m>0))return alert('Poné el concepto y el monto.');
kCola.push({sid:crypto.randomUUID(),tipo:'gasto',concepto:c,monto:m,f:kAhora()});
kGuardarCola();renderEstado();kSync().then(kBal);
}
$('bForm').innerHTML='';
};
$('bCsv').onclick=()=>{
if(!bItems.length)return alert('No hay movimientos en este período.');
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
const t='fecha,tipo,detalle,cantidad,monto,quien\n'+bItems.map(x=>[x.d,q(x.tipo),q(x.t),x.n,x.m,q(x.s)].join(',')).join('\n');
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+t],{type:'text/csv'}));
a.download='kiosco-'+bFecha+(bModo==='m'?'-mes':'')+'.csv';a.click();
};

/* ---------- Deudas (fiados) ---------- */
async function kDeu(){
if(navigator.onLine){
const {data,error}=await sb.from('k_cuenta').select('cliente,monto').eq('campo_id',perfil.campo_id).limit(5000);
if(!error){dSaldo={};data.forEach(x=>dSaldo[x.cliente]=(dSaldo[x.cliente]||0)+ +x.monto);localStorage.setItem('k_cta',JSON.stringify(dSaldo))}
}
dPintar();
}
function dPintar(){
dS={...dSaldo};
kCola.filter(o=>o.tipo==='cuenta').forEach(o=>dS[o.cliente]=(dS[o.cliente]||0)+o.monto);
const L=Object.entries(dS).filter(([,v])=>Math.abs(v)>=1).sort((a,b)=>b[1]-a[1]);
$('dTotal').textContent='Te deben '+money(L.filter(([,v])=>v>0).reduce((t,[,v])=>t+v,0));
$('dLista').innerHTML=L.map(([c,v])=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><b>${esc(c)}</b><b style="color:${v>0?'#c62828':'#1e9e4a'}">${money(v)}</b></div><div style="display:flex;gap:8px;margin-top:6px"><button class="chip" data-d="pago" data-c="${esc(c)}">Registrar pago</button><button class="chip" data-d="mas" data-c="${esc(c)}">＋ Fiado</button></div></div>`).join('')||'<div class="st">Nadie te debe.</div>';
}
function dCola(cli,monto,nota){
kCola.push({sid:crypto.randomUUID(),tipo:'cuenta',cliente:cli,monto,nota,f:kAhora()});
kGuardarCola();dPintar();renderEstado();kSync().then(kDeu);
}
$('dLista').onclick=e=>{
const d=e.target.dataset.d,c=e.target.dataset.c;if(!d)return;
const v=kNum(prompt(d==='pago'?'¿Cuánto pagó '+c+'?':'¿Cuánto se le fía a '+c+'?',d==='pago'?Math.max(0,Math.round(dS[c]||0)):''));
if(!(v>0))return;
dCola(c,d==='pago'?-v:v,d==='pago'?'Pago':'Fiado');
};
$('dNueva').onclick=()=>{
$('dForm').innerHTML=`<div class="card"><h3 style="margin-top:0">Nueva deuda</h3><label>Cliente</label><input id="dC" list="dNombres" autocomplete="off"><datalist id="dNombres">${Object.keys(dS).map(n=>`<option value="${esc(n)}">`).join('')}</datalist><label>Monto ($)</label><input id="dM" type="number" inputmode="decimal"><label>Nota (opcional)</label><input id="dN"><div style="display:flex;gap:8px;margin-top:12px"><button class="chip" data-d="ok">Guardar</button><button class="chip" data-d="no">Cancelar</button></div></div>`;
};
$('dForm').onclick=e=>{
const d=e.target.dataset.d;if(!d)return;
if(d==='ok'){
const c=$('dC').value.trim(),m=kNum($('dM').value);
if(!c||!(m>0))return alert('Poné el cliente y el monto.');
dCola(c,m,$('dN').value.trim()||'Deuda anterior');
}
$('dForm').innerHTML='';
};
  
