let kProd=[],kProv=[],kCola=[],kCart={},kEdit='',kEditP='',kFiltro='';
try{
kProd=JSON.parse(localStorage.getItem('k_prod')||'[]');
kProv=JSON.parse(localStorage.getItem('k_prov')||'[]');
kCola=JSON.parse(localStorage.getItem('k_cola')||'[]');
}catch(e){}
const money=n=>'$ '+Math.round(n).toLocaleString('es-AR');
const kGuardarCola=()=>{try{localStorage.setItem('k_cola',JSON.stringify(kCola))}catch(e){alert('No hay espacio para guardar.')}};
const kStock=p=>p.stock+kCola.filter(o=>o.pid===p.id).reduce((s,o)=>s+(o.tipo==='venta'?-o.cant:o.cant),0);
const kNum=v=>{const n=parseFloat(String(v).replace(',','.'));return n>=0?n:NaN};
const kWa=t=>{const d=String(t||'').replace(/\D/g,'');return d.startsWith('54')?d:'549'+d.replace(/^0+/,'')};
const kAhora=()=>new Date().toISOString();

async function kSync(){
if(!sb||!perfil||!navigator.onLine||!(perfil.modulos||[]).includes('kiosco'))return;
try{
if(kCola.length){
const {error}=await sb.from('k_mov').upsert(kCola.map(o=>({sync_id:o.sid,campo_id:perfil.campo_id,user_id:perfil.id,producto_id:o.pid,tipo:o.tipo,cantidad:o.cant,precio:o.precio,total:o.total,proveedor_id:o.prov||null,created_at:o.f})),{onConflict:'sync_id',ignoreDuplicates:true});
if(!error){kCola=[];kGuardarCola()}
else if(!/fetch|network/i.test(String(error.message)))errSync=' · ⚠ '+String(error.message).slice(0,40);
}
const a=await sb.from('k_productos').select('id,nombre,costo,precio,stock,minimo').eq('campo_id',perfil.campo_id).eq('activo',true).order('nombre');
if(!a.error){kProd=a.data.map(x=>({id:x.id,nombre:x.nombre,costo:+x.costo,precio:+x.precio,stock:+x.stock,minimo:+x.minimo}));localStorage.setItem('k_prod',JSON.stringify(kProd))}
const b=await sb.from('k_proveedores').select('id,nombre,telefono,nota').eq('campo_id',perfil.campo_id).order('nombre');
if(!b.error){kProv=b.data;localStorage.setItem('k_prov',JSON.stringify(kProv))}
}catch(e){}
kPintar();renderEstado();
}

function kPintar(){
if(!perfil)return;
const q=kFiltro.toLowerCase(),adm=perfil.rol==='ADMIN';
const ids=Object.keys(kCart).filter(i=>kCart[i]>0&&kProd.some(p=>p.id===i));
const tot=ids.reduce((s,i)=>s+kCart[i]*kProd.find(p=>p.id===i).precio,0);
$('kCarro').classList.toggle('hide',!ids.length);
$('kCarro').innerHTML=ids.length?ids.map(i=>{const p=kProd.find(x=>x.id===i);return `<div class="row"><div style="flex:1"><b>${esc(p.nombre)}</b><br><small>${kCart[i]} × ${money(p.precio)}</small></div><button class="chip" data-c="-" data-i="${i}">−</button><b>${money(kCart[i]*p.precio)}</b><button class="chip" data-c="+" data-i="${i}">＋</button></div>`}).join('')+`<div style="display:flex;gap:8px;margin-top:10px"><button class="big" data-c="ok" style="flex:1;padding:16px;font-size:20px">Cobrar ${money(tot)}</button><button class="sec" data-c="no" style="width:auto;margin-top:0;padding:0 14px">Vaciar</button></div>`:'';
$('kLista').innerHTML=kProd.filter(p=>p.nombre.toLowerCase().includes(q)).map(p=>{const s=kStock(p);return `<div class="row" data-v="${p.id}"><div style="flex:1"><b>${esc(p.nombre)}</b><br><small>${money(p.precio)} · stock <span style="${s<=p.minimo?'color:#c62828;font-weight:700':''}">${s}</span></small></div><b style="font-size:22px">＋</b></div>`}).join('')||`<div class="st">Todavía no hay productos${adm?'. Cargalos en Stock':''}.</div>`;
if(!adm)return;
const fila=p=>{const s=kStock(p);return `<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><b>${esc(p.nombre)}</b><b style="${s<=p.minimo?'color:#c62828':''}">${s}</b></div><small>Costo ${money(p.costo)} · Venta ${money(p.precio)} · aviso en ${p.minimo}</small><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap"><button class="chip" data-k="in" data-i="${p.id}">＋ Ingreso</button><button class="chip" data-k="aj" data-i="${p.id}">Ajustar</button><button class="chip" data-k="ed" data-i="${p.id}">✏️</button></div></div>`};
$('kBajo').innerHTML=kProd.filter(p=>kStock(p)<=p.minimo).map(fila).join('')||'<div class="st">Nada por reponer.</div>';
$('kProds').innerHTML=kProd.map(fila).join('')||'<div class="st">Todavía no hay productos.</div>';
$('kProvs').innerHTML=kProv.map(v=>{const t=(v.telefono||'').replace(/\D/g,'');return `<div class="row" style="display:block"><b>${esc(v.nombre)}</b><br><small>${esc(v.telefono||'sin teléfono')}${v.nota?' · '+esc(v.nota):''}</small><div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">${t?`<a class="chip" href="tel:+${kWa(v.telefono)}" style="text-decoration:none;color:var(--tx)">📞 Llamar</a><a class="chip" href="https://wa.me/${kWa(v.telefono)}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--tx)">💬 WhatsApp</a>`:''}<button class="chip" data-k="pe" data-i="${v.id}">✏️</button><button class="chip" data-k="pb" data-i="${v.id}">🗑</button></div></div>`}).join('')||'<div class="st">Todavía no hay proveedores.</div>';
}

/* ---------- Vender ---------- */
$('kBuscar').oninput=e=>{kFiltro=e.target.value;kPintar()};
$('kLista').onclick=e=>{const r=e.target.closest('[data-v]');if(!r)return;kCart[r.dataset.v]=(kCart[r.dataset.v]||0)+1;kPintar()};
$('kCarro').onclick=e=>{
const c=e.target.dataset.c,i=e.target.dataset.i;if(!c)return;
if(c==='+')kCart[i]++;else if(c==='-')kCart[i]=Math.max(0,kCart[i]-1);else if(c==='no')kCart={};else if(c==='ok')return kCobrar();
kPintar();
};
function kCobrar(){
const ids=Object.keys(kCart).filter(i=>kCart[i]>0&&kProd.some(p=>p.id===i));
if(!ids.length)return;
let tot=0;
ids.forEach(i=>{const p=kProd.find(x=>x.id===i),t=p.precio*kCart[i];tot+=t;kCola.push({sid:crypto.randomUUID(),pid:i,tipo:'venta',cant:kCart[i],precio:p.precio,total:t,f:kAhora()})});
kGuardarCola();kCart={};
$('kMsg').textContent='✔ Venta guardada: '+money(tot);setTimeout(()=>$('kMsg').textContent='',4000);
kPintar();renderEstado();kSync();
}

/* ---------- Stock (patrón) ---------- */
function kFormHtml(){
if(!kEdit)return '';
const [t,id]=kEdit.split(':'),p=kProd.find(x=>x.id===id)||{};
const f=(i,l,v,ty)=>`<label>${l}</label><input id="${i}" type="${ty||'text'}" ${ty==='number'?'inputmode="decimal" step="any"':''} value="${esc(v==null?'':v)}">`;
let h='<div class="card"><h3 style="margin-top:0">';
if(t==='n')h+='Producto nuevo</h3>'+f('kN','Nombre','')+f('kC','Costo ($)','','number')+f('kP','Precio de venta ($)','','number')+f('kS','Stock inicial','','number')+f('kM','Avisar cuando queden…','','number');
else if(t==='e')h+='Editar '+esc(p.nombre)+'</h3>'+f('kN','Nombre',p.nombre)+f('kC','Costo ($)',p.costo,'number')+f('kP','Precio de venta ($)',p.precio,'number')+f('kM','Avisar cuando queden…',p.minimo,'number');
else h+='Ingreso de '+esc(p.nombre)+'</h3>'+f('kQ','Cantidad que entra','','number')+f('kC','Costo por unidad ($)',p.costo,'number')+'<label>Proveedor (opcional)</label><select id="kV"><option value="">—</option>'+kProv.map(v=>`<option value="${v.id}">${esc(v.nombre)}</option>`).join('')+'</select>';
return h+`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="chip" data-k="ok">Guardar</button>${t==='e'?'<button class="chip" data-k="quitar">Quitar producto</button>':''}<button class="chip" data-k="no">Cancelar</button></div></div>`;
}
function kAbrir(s){kEdit=s;$('kForm').innerHTML=kFormHtml();window.scrollTo(0,0)}
$('kNuevo').onclick=()=>kAbrir('n');
$('kProds').onclick=$('kBajo').onclick=e=>{
const k=e.target.dataset.k,i=e.target.dataset.i;if(!k)return;
if(k==='ed')return kAbrir('e:'+i);
if(k==='in')return kAbrir('i:'+i);
const p=kProd.find(x=>x.id===i),v=kNum(prompt('Cantidad real que hay ahora de '+p.nombre+':',kStock(p)));
if(isNaN(v))return;
const d=v-kStock(p);if(!d)return;
kCola.push({sid:crypto.randomUUID(),pid:i,tipo:'ajuste',cant:d,precio:0,total:0,f:kAhora()});
kGuardarCola();kPintar();kSync();
};
$('kForm').onclick=async e=>{
const k=e.target.dataset.k;if(!k)return;
if(k==='no'){kEdit='';$('kForm').innerHTML='';return}
const [t,id]=kEdit.split(':');
if(k==='quitar'){
if(!confirm('¿Quitar este producto? Deja de aparecer en las ventas.')||sinRed())return;
const {error}=await sb.from('k_productos').update({activo:false}).eq('id',id);
if(error)return alert('No se pudo: '+error.message);
kEdit='';$('kForm').innerHTML='';return kSync();
}
if(t==='i'){
const q=kNum($('kQ').value),c=kNum($('kC').value);
if(!(q>0)||isNaN(c))return alert('Poné la cantidad y el costo.');
kCola.push({sid:crypto.randomUUID(),pid:id,tipo:'ingreso',cant:q,precio:c,total:q*c,prov:$('kV').value||null,f:kAhora()});
kGuardarCola();kEdit='';$('kForm').innerHTML='';kPintar();return kSync();
}
if(sinRed())return;
const n=$('kN').value.trim(),c=kNum($('kC').value),p=kNum($('kP').value),m=kNum($('kM').value||0);
if(!n||isNaN(c)||isNaN(p)||isNaN(m))return alert('Poné nombre, costo y precio.');
if(t==='n'){
const {data,error}=await sb.from('k_productos').insert({campo_id:perfil.campo_id,nombre:n,costo:c,precio:p,minimo:m}).select('id').single();
if(error)return alert('No se pudo: '+(error.code==='23505'?'ya existe un producto con ese nombre.':error.message));
const s=kNum($('kS').value||0);
if(s>0){kCola.push({sid:crypto.randomUUID(),pid:data.id,tipo:'ajuste',cant:s,precio:c,total:s*c,f:kAhora()});kGuardarCola()}
}else{
const {error}=await sb.from('k_productos').update({nombre:n,costo:c,precio:p,minimo:m}).eq('id',id);
if(error)return alert('No se pudo: '+(error.code==='23505'?'ya existe un producto con ese nombre.':error.message));
}
kEdit='';$('kForm').innerHTML='';kSync();
};

/* ---------- Proveedores (patrón) ---------- */
function kFormP(){
if(!kEditP)return '';
const v=kProv.find(x=>x.id===kEditP)||{};
return `<div class="card"><h3 style="margin-top:0">${v.id?'Editar proveedor':'Proveedor nuevo'}</h3><label>Nombre</label><input id="pN" value="${esc(v.nombre||'')}"><label>Teléfono (con código de área, sin 0 ni 15)</label><input id="pT" type="tel" inputmode="tel" placeholder="Ej: 3511234567" value="${esc(v.telefono||'')}"><label>Nota (qué vende, días de visita…)</label><input id="pO" value="${esc(v.nota||'')}"><div style="display:flex;gap:8px;margin-top:12px"><button class="chip" data-k="ok">Guardar</button><button class="chip" data-k="no">Cancelar</button></div></div>`;
}
$('kNuevoP').onclick=()=>{kEditP='n';$('kFormP').innerHTML=kFormP();window.scrollTo(0,0)};
$('kFormP').onclick=async e=>{
const k=e.target.dataset.k;if(!k)return;
if(k==='no'){kEditP='';$('kFormP').innerHTML='';return}
const n=$('pN').value.trim();if(!n)return alert('Poné el nombre.');
if(sinRed())return;
const d={nombre:n,telefono:$('pT').value.trim()||null,nota:$('pO').value.trim()||null};
const r=kEditP==='n'?await sb.from('k_proveedores').insert({campo_id:perfil.campo_id,...d}):await sb.from('k_proveedores').update(d).eq('id',kEditP);
if(r.error)return alert('No se pudo: '+r.error.message);
kEditP='';$('kFormP').innerHTML='';kSync();
};
$('kProvs').onclick=async e=>{
const k=e.target.dataset.k,i=e.target.dataset.i;if(!k)return;
if(k==='pe'){kEditP=i;$('kFormP').innerHTML=kFormP();return window.scrollTo(0,0)}
const v=kProv.find(x=>x.id===i);
if(!confirm('¿Borrar a '+v.nombre+'?')||sinRed())return;
const {error}=await sb.from('k_proveedores').delete().eq('id',i);
if(error)return alert('No se pudo: '+error.message);
kSync();
};
  
