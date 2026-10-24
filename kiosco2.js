const kIso=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
let bFecha=kIso(new Date()),bModo='d',bTab='i',bItems=[],kHistItems=[],eId='',eReg={},dSaldo={},dS={},dDet='',dEnt=[];
try{dSaldo=JSON.parse(localStorage.getItem('k_cta')||'{}')}catch(e){}
const num=v=>parseFloat(String(v).replace(',','.'));
const bHora=s=>new Date(s).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const qn=e=>e?String(e.email||'').split('@')[0]:'';
const MOVSEL='id,tipo,cantidad,precio,costo,total,fiado,created_at,k_productos(nombre),k_proveedores(nombre),profiles(email)';

/* ---------- Movimientos: mostrar, editar y borrar (balance y stock) ---------- */
function movItem(x){
const n=x.k_productos?x.k_productos.nombre:'(producto quitado)',w=qn(x.profiles),b={tb:'k_mov',id:x.id,mt:x.tipo,d:x.created_at,n:+x.cantidad,raw:x};
if(x.tipo==='venta')return {...b,k:x.fiado?'f':'i',t:n+' × '+(+x.cantidad)+(x.fiado?' (fiado)':''),s:w,m:+x.total,g:(x.precio-x.costo)*x.cantidad,tipo:'Venta'+(x.fiado?' fiada':'')};
if(x.tipo==='ingreso')return {...b,k:'e',t:'Mercadería: '+n+' × '+(+x.cantidad),s:(x.k_proveedores?x.k_proveedores.nombre+' · ':'')+w,m:+x.total,tipo:'Compra'};
return {...b,k:'a',t:'Ajuste: '+n+' '+(x.cantidad>0?'+':'')+(+x.cantidad),s:w,m:null,tipo:'Ajuste'};
}
function itemHtml(x){
const key=x.tb+':'+x.id;eReg[key]=x;
if(eId===key)return formEdit(x,key);
return `<div class="row"><div style="flex:1"><b>${esc(x.t)}</b><br><small>${bHora(x.d)}${x.s?' · '+esc(x.s):''}</small></div><b style="${x.k==='f'?'color:#999':''}">${x.m==null?'':money(x.m)}</b><button class="x" data-e="ed" data-k="${key}">✏️</button><button class="x" data-e="bo" data-k="${key}">🗑</button></div>`;
}
function formEdit(x,key){
const r=x.raw,f=(i,l,v,ty)=>`<label>${l}</label><input id="${i}" type="${ty||'text'}" ${ty==='number'?'inputmode="decimal" step="any"':''} value="${esc(v)}">`;
let h='<div class="row" style="display:block"><b>Editar</b>';
if(x.tb==='k_mov')h+=f('eQ','Cantidad',r.cantidad,'number')+(x.mt==='ajuste'?'':f('eP',x.mt==='ingreso'?'Costo por unidad ($)':'Precio por unidad ($)',r.precio,'number'));
else if(x.tb==='k_gastos')h+=f('eC','Concepto',r.concepto)+f('eM','Monto ($)',r.monto,'number');
else h+=f('eM','Monto ($)',-r.monto,'number');
if(x.k==='f')h+='<div class="st">Es un fiado: si cambiás el monto, corregí también la deuda en Deudas.</div>';
return h+`<div style="display:flex;gap:8px;margin-top:10px"><button class="chip" data-e="ok" data-k="${key}">Guardar</button><button class="chip" data-e="no">Cancelar</button></div></div>`;
}
async function eClick(e,refrescar){
const a=e.target.dataset.e,key=e.target.dataset.k;if(!a)return;
if(a==='ed'){eId=key;return refrescar(true)}
if(a==='no'){eId='';return refrescar(true)}
if(sinRed())return;
const [tb,id]=key.split(':'),x=eReg[key];let r;
if(a==='bo'){
if(!confirm('¿Borrar este movimiento?'+(tb==='k_mov'?' El stock se corrige solo.':'')+(x&&x.k==='f'?' Es un fiado: corregí también la deuda en Deudas.':'')))return;
r=await sb.from(tb).delete().eq('id',id).select('id');
}else{
let d;
if(tb==='k_mov'){
const q=num($('eQ').value),p=$('eP')?num($('eP').value):0;
if(isNaN(q)||isNaN(p)||p<0||(x.mt==='ajuste'?q===0:q<=0))return alert('Revisá los números.');
d={cantidad:q,precio:p,total:x.mt==='ajuste'?0:q*p};
}else if(tb==='k_gastos'){
const c=$('eC').value.trim(),m=num($('eM').value);
if(!c||!(m>0))return alert('Poné el concepto y el monto.');
d={concepto:c,monto:m};
}else{const m=num($('eM').value);if(!(m>0))return alert('Poné el monto.');d={monto:-m}}
r=await sb.from(tb).update(d).eq('id',id).select('id');
}
if(r.error||!r.data.length)return alert('No se pudo'+(r.error?': '+r.error.message:'.'));
eId='';await kSync();refrescar();
}

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
rg(sb.from('k_mov').select(MOVSEL)),
rg(sb.from('k_gastos').select('id,concepto,monto,created_at')),
rg(sb.from('k_cuenta').select('id,cliente,monto,created_at').lt('monto',0))]);
const er=m.error||g.error||k.error;
if(er){$('bResumen').innerHTML='<div class="st">No se pudo cargar: '+esc(er.message)+'</div>';return}
bItems=m.data.filter(x=>x.tipo!=='ajuste').map(movItem);
g.data.forEach(x=>bItems.push({tb:'k_gastos',id:x.id,k:'e',d:x.created_at,t:'Gasto: '+x.concepto,s:'',m:+x.monto,tipo:'Gasto',n:'',raw:x}));
k.data.forEach(x=>bItems.push({tb:'k_cuenta',id:x.id,k:'i',d:x.created_at,t:'Cobro de deuda: '+x.cliente,s:'',m:-x.monto,tipo:'Cobro de deuda',n:'',raw:x}));
bItems.sort((a,b)=>b.d.localeCompare(a.d));
const S=z=>bItems.filter(x=>x.k===z).reduce((s,x)=>s+x.m,0);
const ing=S('i'),egr=S('e'),fia=S('f'),gan=bItems.filter(x=>x.g!=null).reduce((s,x)=>s+x.g,0),bal=ing-egr;
$('bResumen').innerHTML=`<div style="display:flex;justify-content:space-between;font-size:20px"><span>Balance</span><b style="color:${bal<0?'#c62828':'#1e9e4a'}">${money(bal)}</b></div><div class="two" style="margin-top:12px"><div><small>↗ Ingresos</small><br><b>${money(ing)}</b></div><div><small>↙ Egresos</small><br><b>${money(egr)}</b></div></div><div class="st" style="margin-top:10px">Ganancia de lo vendido: ${money(gan)} · Fiado en el período: ${money(fia)}</div>`;
bLista();
}
function bLista(){
$('bTI').classList.toggle('sel',bTab==='i');$('bTE').classList.toggle('sel',bTab==='e');
$('bLista').innerHTML=bItems.filter(x=>bTab==='i'?x.k!=='e':x.k==='e').map(itemHtml).join('')||'<div class="st">No hay movimientos.</div>';
}
$('bLista').onclick=e=>eClick(e,r=>r===true?bLista():kBal());
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

/* ---------- Historial de stock (ingresos y ajustes) ---------- */
async function kMovs(){
if(!navigator.onLine){$('kHist').innerHTML='<div class="st">El historial necesita señal.</div>';return}
const {data,error}=await sb.from('k_mov').select(MOVSEL).eq('campo_id',perfil.campo_id).in('tipo',['ingreso','ajuste']).order('created_at',{ascending:false}).limit(40);
if(error){$('kHist').innerHTML='<div class="st">No se pudo cargar: '+esc(error.message)+'</div>';return}
kHistItems=data.map(movItem);kHistPintar();
}
function kHistPintar(){$('kHist').innerHTML=kHistItems.map(itemHtml).join('')||'<div class="st">Todavía no hay movimientos.</div>'}
$('kHist').onclick=e=>eClick(e,r=>r===true?kHistPintar():kMovs());

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
$('dLista').innerHTML=L.map(([c,v])=>{
const det=dDet===c?`<div style="margin-top:8px">${dEnt.map(x=>`<div class="row"><div style="flex:1"><small>${bHora(x.created_at)}${x.nota?' · '+esc(x.nota):''}</small></div><b style="color:${x.monto>0?'#c62828':'#1e9e4a'}">${money(x.monto)}</b><button class="x" data-d="ee" data-i="${x.id}">✏️</button><button class="x" data-d="eb" data-i="${x.id}">🗑</button></div>`).join('')}<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="chip" data-d="ren" data-c="${esc(c)}">Renombrar cliente</button><button class="chip" data-d="del" data-c="${esc(c)}">Borrar cliente</button></div></div>`:'';
return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><b>${esc(c)}</b><b style="color:${v>0?'#c62828':'#1e9e4a'}">${money(v)}</b></div><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><button class="chip" data-d="pago" data-c="${esc(c)}">Registrar pago</button><button class="chip" data-d="mas" data-c="${esc(c)}">＋ Fiado</button><button class="chip" data-d="det" data-c="${esc(c)}">${dDet===c?'Ocultar':'Detalle'}</button></div>${det}</div>`}).join('')||'<div class="st">Nadie te debe.</div>';
}
async function dAbrir(c){
if(!navigator.onLine){alert('Necesitás señal para ver el detalle.');return}
const {data,error}=await sb.from('k_cuenta').select('id,monto,nota,created_at').eq('campo_id',perfil.campo_id).eq('cliente',c).order('created_at',{ascending:false}).limit(100);
if(error)return alert('No se pudo: '+error.message);
dDet=c;dEnt=data;dPintar();
}
async function dCambio(q,cierra){
const r=await q.select('id');
if(r.error||!r.data.length)return alert('No se pudo'+(r.error?': '+r.error.message:'.'));
const c=dDet;if(cierra)dDet='';
await kDeu();if(c&&!cierra)await dAbrir(c);
}
function dCola(cli,monto,nota){
kCola.push({sid:crypto.randomUUID(),tipo:'cuenta',cliente:cli,monto,nota,f:kAhora()});
kGuardarCola();dPintar();renderEstado();kSync().then(kDeu);
}
$('dLista').onclick=async e=>{
const d=e.target.dataset.d,c=e.target.dataset.c,i=e.target.dataset.i;if(!d)return;
if(d==='det')return dDet===c?(dDet='',dPintar()):dAbrir(c);
if(d==='pago'||d==='mas'){
const v=kNum(prompt(d==='pago'?'¿Cuánto pagó '+c+'?':'¿Cuánto se le fía a '+c+'?',d==='pago'?Math.max(0,Math.round(dS[c]||0)):''));
if(!(v>0))return;
return dCola(c,d==='pago'?-v:v,d==='pago'?'Pago':'Fiado');
}
if(sinRed())return;
const q=()=>sb.from('k_cuenta');
if(d==='ee'){
const x=dEnt.find(y=>y.id===i),m=kNum(prompt('Monto:',Math.abs(x.monto)));
if(!(m>0))return;
const n=prompt('Nota:',x.nota||'');if(n===null)return;
return dCambio(q().update({monto:x.monto<0?-m:m,nota:n.trim()||null}).eq('id',i));
}
if(d==='eb'){if(!confirm('¿Borrar este movimiento de la deuda?'))return;return dCambio(q().delete().eq('id',i))}
if(d==='ren'){
const n=(prompt('Nuevo nombre para '+c+':',c)||'').trim();
if(!n||n===c)return;
return dCambio(q().update({cliente:n}).eq('campo_id',perfil.campo_id).eq('cliente',c),true);
}
if(d==='del'){
if(!confirm('¿Borrar a '+c+' y todo su historial de deuda?'))return;
return dCambio(q().delete().eq('campo_id',perfil.campo_id).eq('cliente',c),true);
}
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
  
