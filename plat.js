let CL=[],CD=[],PG=[],pagoId='',fechaId='',AJ={precio:16,tipo:'oficial'},COT=null;
try{COT=JSON.parse(localStorage.getItem('cot')||'null')}catch(e){}
const peso=n=>'$ '+Math.round(n).toLocaleString('es-AR');
const dd=s=>new Date(s).toLocaleDateString('es-AR');
const iso=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)};
const baseDe=c=>{const h=iso(new Date());return c&&c.vence&&c.vence>h?c.vence:h};
const sumDias=(b,d)=>{const x=new Date(b+'T00:00:00');x.setDate(x.getDate()+d);return iso(x)};
const difDias=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);
function formFecha(c){
return `<div style="margin-top:8px"><label style="margin-top:0">Vence el</label><input id="fV" type="date" value="${c.vence||''}"><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="chip" data-a="fechaOk" data-c="${c.campo_id}">Guardar fecha</button><button class="chip" data-a="fechaSin" data-c="${c.campo_id}">Sin vencimiento</button><button class="chip" data-a="fechaNo">Cancelar</button></div></div>`;
}
const montoDe=d=>COT?Math.round(AJ.precio*COT.v*d/30/100)*100:0;
const hint=d=>COT?`USD ${(AJ.precio*d/30).toFixed(2)} × $ ${COT.v.toLocaleString('es-AR')}`:'Sin cotización: escribí el monto a mano.';
async function traerCot(){
try{const r=await fetch('https://dolarapi.com/v1/dolares/'+AJ.tipo),j=await r.json();
if(!(j.venta>0))return false;
COT={v:j.venta,f:new Date().toISOString()};localStorage.setItem('cot',JSON.stringify(COT));return true}catch(e){return false}
}
function resumenPrecio(){
$('aResumen').textContent=COT?`USD ${AJ.precio} × $ ${COT.v.toLocaleString('es-AR')} = ${peso(montoDe(30))} por mes (dólar ${AJ.tipo}, ${dd(COT.f)})`:'Traé la cotización de hoy o escribila a mano.';
}
async function pintarPlat(){
if(!perfil||!perfil.dueno||!navigator.onLine)return;
const [a,b,p,j]=await Promise.all([sb.rpc('dueno_clientes'),sb.rpc('dueno_codigos'),sb.rpc('dueno_pagos',{p_limit:200}),sb.rpc('dueno_ajustes')]);
const er=a.error||b.error||p.error||j.error;
if(er)return alert('No se pudo cargar: '+er.message);
CL=a.data;CD=b.data;PG=p.data;
j.data.forEach(x=>{if(x.clave==='precio_usd')AJ.precio=parseFloat(x.valor);if(x.clave==='tipo_dolar')AJ.tipo=x.valor});
$('aPrecio').value=AJ.precio;$('aTipo').value=AJ.tipo;
await traerCot();$('aCot').value=COT?COT.v:'';
renderPlat();
}
function formPago(id){
return `<div style="margin-top:8px"><label style="margin-top:0">Monto cobrado ($)</label><input id="gM" type="number" inputmode="decimal"><div class="st" id="gH"></div><div class="two"><div><label>Medio</label><select id="gD"><option>Transferencia</option><option>MercadoPago</option><option>Efectivo</option><option>Otro</option></select></div><div><label>Días que paga</label><input id="gN" type="number" value="30"></div></div><label>Vence el</label><input id="gV" type="date"><label>Nota (opcional)</label><input id="gT"><div style="display:flex;gap:8px;margin-top:10px"><button class="chip" data-a="pagoOk" data-c="${id}">Guardar pago</button><button class="chip" data-a="pagoNo">Cancelar</button></div></div>`;
}
function renderPlat(){
resumenPrecio();
$('pCodigos').innerHTML=CD.map(c=>`<div class="row"><div><b style="font-size:18px">${esc(c.codigo)}</b><br><small>${c.max_devices} usuarios · ${c.dias?c.dias+' días':'sin vencimiento'}</small></div><button class="chip" data-k="${esc(c.codigo)}">Copiar</button></div>`).join('')||'<div class="st">No hay códigos sin usar.</div>';
const hoy=new Date();hoy.setHours(0,0,0,0);
const falta=c=>Math.round((new Date(c.vence+'T00:00:00')-hoy)/864e5);
const pv=CL.filter(c=>c.vence&&falta(c)<=7).sort((x,y)=>x.vence.localeCompare(y.vence));
$('pVence').innerHTML=pv.map(c=>{const f=falta(c);return `<div class="row"><div><b>${esc(c.nombre)}</b><br><small>${esc(c.patron||'')}</small></div><b style="${f<0?'color:#c62828':''}">${f<0?'vencido hace '+(-f)+' d':f===0?'vence hoy':'en '+f+' d'}</b></div>`}).join('')||'<div class="st">Nadie vence en los próximos 7 días.</div>';
$('pClientes').innerHTML=CL.map(c=>`<div class="row" style="display:block"><div style="display:flex;justify-content:space-between"><b>${esc(c.nombre)}</b><small style="font-weight:700;color:${!c.activo?'#777':(c.vence&&falta(c)<0)?'#c62828':'#1e9e4a'}">${!c.activo?'SUSPENDIDO':(c.vence&&falta(c)<0)?'VENCIDO':'AL DÍA'}</small></div><small>${esc(c.patron||'')} · ${c.usuarios}/${c.max_devices} usuarios · ${c.vence?'vence '+dd(c.vence+'T00:00:00'):'sin vencimiento'}${COT?' · a cobrar '+peso(montoDe(30)):''}</small><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="chip" data-a="pago" data-c="${c.campo_id}">＋ Pago</button><button class="chip" data-a="${c.activo?'suspender':'reactivar'}" data-c="${c.campo_id}">${c.activo?'Suspender':'Reactivar'}</button><button class="chip" data-a="fecha" data-c="${c.campo_id}">Vence el…</button><button class="chip" data-a="usuarios" data-c="${c.campo_id}">Usuarios</button></div><div style="margin-top:6px"><small>Rubros:</small> ${['gasoil','kiosco'].map(m=>`<button class="chip" style="${(c.modulos||['gasoil']).includes(m)?'background:#1e9e4a;color:#fff':''}" data-a="mod" data-m="${m}" data-c="${c.campo_id}">${m}</button>`).join(' ')}</div>${pagoId===c.campo_id?formPago(c.campo_id):''}${fechaId===c.campo_id?formFecha(c):''}</div>`).join('')||'<div class="st">Todavía no hay clientes.</div>';
const n=new Date();
const tm=PG.filter(x=>{const d=new Date(x.creado);return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()}).reduce((s,x)=>s+ +x.monto,0);
$('pTotal').textContent='Cobrado este mes: '+peso(tm);
if(pagoId&&$('gN')){const base=baseDe(CL.find(x=>x.campo_id===pagoId));
const act=d=>{$('gM').value=montoDe(d);$('gH').textContent=hint(d)};
const d0=parseInt($('gN').value)||30;$('gV').value=sumDias(base,d0);act(d0);
$('gN').oninput=()=>{const d=parseInt($('gN').value)||0;if(d>0)$('gV').value=sumDias(base,d);act(d)};
$('gV').oninput=()=>{const d=difDias(base,$('gV').value);if(d>0){$('gN').value=d;act(d)}}}
$('pPagos').innerHTML=PG.slice(0,50).map(x=>`<div class="row"><div style="flex:1"><b>${peso(+x.monto)}</b> · ${esc(x.campo)}<br><small>${esc(x.medio)} · +${x.dias} días${x.usd?' · USD '+(+x.usd).toFixed(2)+' a $ '+(+x.cotizacion).toLocaleString('es-AR'):''} · ${dd(x.creado)}${x.nota?' · '+esc(x.nota):''}</small></div><button class="x" data-x="${x.id}">🗑</button></div>`).join('')||'<div class="st">Todavía no hay pagos.</div>';
}
$('pCrear').onclick=async()=>{
if(sinRed())return;
const {data,error}=await sb.rpc('dueno_crear_codigo',{p_max:parseInt($('pMax').value),p_dias:parseInt($('pDias').value)||0});
if(error)return alert('No se pudo: '+error.message);
try{await navigator.clipboard.writeText(data)}catch(e){}
alert('Código creado: '+data);pintarPlat();
};
$('pCodigos').onclick=async e=>{
const k=e.target.dataset.k;if(!k)return;
try{await navigator.clipboard.writeText(k);alert('Copiado: '+k)}catch(x){prompt('Copiá el código:',k)}
};
$('pClientes').onclick=async e=>{
const a=e.target.dataset.a,c=e.target.dataset.c;if(!a)return;
if(a==='pago'){if(navigator.onLine){await traerCot();$('aCot').value=COT?COT.v:''}pagoId=c;fechaId='';return renderPlat()}
if(a==='pagoNo'){pagoId='';return renderPlat()}
if(a==='fecha'){fechaId=c;pagoId='';return renderPlat()}
if(a==='fechaNo'){fechaId='';return renderPlat()}
if(sinRed())return;
if(a==='mod'){
const cl=CL.find(x=>x.campo_id===c),m=e.target.dataset.m;
let ms=cl.modulos||['gasoil'];ms=ms.includes(m)?ms.filter(x=>x!==m):[...ms,m];
if(!ms.length)return alert('Tiene que quedar al menos un rubro.');
const {error}=await sb.rpc('dueno_modulos',{p_id:c,p_modulos:ms});
if(error)return alert('No se pudo: '+error.message);
return pintarPlat();
}
if(a==='pagoOk'){
const m=parseFloat($('gM').value),d=parseInt($('gN').value);
const v=$('gV').value;if(!(m>=0)||!(d>0)||!v)return alert('Poné el monto, los días y la fecha.');
const {error}=await sb.rpc('dueno_registrar_pago',{p_campo:c,p_monto:m,p_medio:$('gD').value,p_dias:d,p_nota:$('gT').value,p_usd:COT?AJ.precio*d/30:null,p_cot:COT?COT.v:null,p_vence:v});
if(error)return alert('No se pudo: '+error.message);
pagoId='';return pintarPlat();
}
if(a==='fechaOk'||a==='fechaSin'){
const f=a==='fechaSin'?null:$('fV').value;
if(a==='fechaOk'&&!f)return alert('Elegí una fecha.');
const {error}=await sb.rpc('dueno_cliente',{p_id:c,p_accion:'fecha',p_fecha:f});
if(error)return alert('No se pudo: '+error.message);
fechaId='';return pintarPlat();
}
let v=null;
if(a==='dias'){v=parseInt(prompt('¿Cuántos días sumar a la suscripción?','30'));if(!(v>0))return}
if(a==='usuarios'){v=parseInt(prompt('Cantidad máxima de usuarios:','3'));if(!(v>0))return}
if(a==='suspender'&&!confirm('¿Suspender este cliente? Nadie de su campo podrá usar la app.'))return;
const {error}=await sb.rpc('dueno_cliente',{p_id:c,p_accion:a,p_valor:v});
if(error)return alert('No se pudo: '+error.message);
pintarPlat();
};
$('pPagos').onclick=async e=>{
const x=e.target.dataset.x;
if(!x||sinRed()||!confirm('¿Anular este pago? Se le restan los días al vencimiento del cliente.'))return;
const {error}=await sb.rpc('dueno_anular_pago',{p_id:x});
if(error)return alert('No se pudo: '+error.message);
pintarPlat();
};
$('aPrecio').oninput=()=>{AJ.precio=parseFloat($('aPrecio').value)||0;resumenPrecio()};
$('aCot').oninput=()=>{const v=parseFloat($('aCot').value);if(v>0){COT={v,f:new Date().toISOString()};localStorage.setItem('cot',JSON.stringify(COT))}resumenPrecio()};
$('aTraer').onclick=async()=>{
AJ.tipo=$('aTipo').value;
if(!await traerCot())alert('No se pudo traer la cotización. Escribila a mano.');
$('aCot').value=COT?COT.v:'';renderPlat();
};
$('aGuardar').onclick=async()=>{
if(sinRed())return;
const p=parseFloat($('aPrecio').value);if(!(p>0))return alert('Poné el precio en dólares.');
AJ.precio=p;AJ.tipo=$('aTipo').value;
const r1=await sb.rpc('dueno_set_ajuste',{p_clave:'precio_usd',p_valor:String(p)});
const r2=await sb.rpc('dueno_set_ajuste',{p_clave:'tipo_dolar',p_valor:AJ.tipo});
if(r1.error||r2.error)return alert('No se pudo: '+(r1.error||r2.error).message);
await traerCot();$('aCot').value=COT?COT.v:'';renderPlat();alert('Guardado.');
};
  
