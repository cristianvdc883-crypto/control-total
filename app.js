const $=id=>document.getElementById(id),K='gasoil_v2';
const SB_URL='https://wzozpqcsypdszueitpzo.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6b3pwcWNzeXBkc3p1ZWl0cHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODg0MzcsImV4cCI6MjEwNzc2NDQzN30.63xT-7SUAUdL4poVnemUFxSFBxBaVW7mRjgpMgZxBfk';
let sb=null;try{sb=supabase.createClient(SB_URL,SB_KEY)}catch(e){}
let regs=load(),thumb='',mes=new Date().toISOString().slice(0,7),perfil=null,pos=null,destino='litros',chipT='litros';
let remoto=JSON.parse(localStorage.getItem('remoto')||'null')||{filas:[],miembros:[]};
regs.forEach(r=>{if(!r.sid){r.sid=crypto.randomUUID();r.ok=0}});
function load(){try{return JSON.parse(localStorage.getItem(K))||[]}catch(e){return[]}}
function persist(){try{localStorage.setItem(K,JSON.stringify(regs));return true}catch(e){alert('No se pudo guardar: sin espacio.');return false}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const st=t=>$('st').textContent=t;
function nowLocal(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
const fmtF=f=>new Date(f).toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'});
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.v));
function show(v){
document.querySelectorAll('section').forEach(s=>s.classList.toggle('hide',s.id!=='v-'+v));
document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
if(v==='plat')pintarPlat();
if(v[0]==='k')kPintar();
if(v==='kbalance')kBal();if(v==='kdeudas')kDeu();if(v==='kstock')kMovs();
if(v==='resumen'){renderRes();sync().then(renderRes)} if(v==='datos'){renderInfo();sync().then(renderInfo)}
}
function openForm(){
$('form').classList.remove('hide');
['litros','equipo','horo','lote','equipoSel'].forEach(i=>$(i).value='');pintarEq();
$('chips').innerHTML='';st('');$('fecha').value=nowLocal();
pos=null;if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>pos={lat:p.coords.latitude,lng:p.coords.longitude},()=>{},{timeout:8000,maximumAge:600000});
}
$('btnFoto').onclick=()=>$('file').click();
$('sinFoto').onclick=()=>{thumb='';openForm();$('prev').classList.add('hide');$('form').scrollIntoView({behavior:'smooth'})};
$('file').onchange=async e=>{
const f=e.target.files[0]; if(!f) return; e.target.value='';
const d=destino;destino='litros';
if(d==='litros')openForm();
const img=new Image(); img.src=URL.createObjectURL(f);
await img.decode().catch(()=>{});
if(d==='litros'){thumb=draw(img,240,false).toDataURL('image/jpeg',0.6);
$('prev').src=thumb;$('prev').classList.remove('hide');
$('form').scrollIntoView({behavior:'smooth'});}
leer(img,d);
};
function draw(img,max,enhance){
const s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');
c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);
if(!enhance)return c;
const d=x.getImageData(0,0,c.width,c.height),p=d.data;
for(let i=0;i<p.length;i+=4){let g=.3*p[i]+.59*p[i+1]+.11*p[i+2];g=g>128?Math.min(255,g*1.3):g*.7;p[i]=p[i+1]=p[i+2]=g}
x.putImageData(d,0,0);
const m=40,o=document.createElement('canvas');o.width=c.width+2*m;o.height=c.height+2*m;
const y=o.getContext('2d');y.fillStyle='#fff';y.fillRect(0,0,o.width,o.height);y.drawImage(c,m,m);
return o;
}
async function ocrTexto(cs){
if(!window.Tesseract) throw new Error('sin motor');
const w=await Tesseract.createWorker('eng');
await w.setParameters({tessedit_char_whitelist:'0123456789.,',tessedit_pageseg_mode:'11'});
let t='';
for(const c of [].concat(cs)){t+='\n'+(await w.recognize(c)).data.text}
await w.terminate();
return t;
}
async function leer(img,d){
const h=d==='horo',tg=h?'horo':'litros';chipT=tg;
st('Leyendo números…');
try{
const t=await ocrTexto([draw(img,900,true),draw(img,450,true)]);
const nums=[...new Set((t.match(/\d+[.,]\d+|\d{2,}/g)||[]).map(s=>parseFloat(s.replace(',','.'))).filter(v=>v>0&&v<(h?100000:5000)))];
if(!nums.length){st('No pude leer números. Cargá los litros a mano.');return}
$(tg).value=h?Math.max(...nums):(nums.find(v=>!Number.isInteger(v))??nums[0]);
$('chips').innerHTML=nums.slice(0,8).map(v=>`<button class="chip" data-v="${v}">${v}</button>`).join('');
st('Revisá: tocá otro número si el de '+(h?'horómetro':'litros')+' es otro.');
}catch(e){st('OCR no disponible (preparalo en Datos con internet). Cargá los litros a mano.')}
}
$('chips').onclick=e=>{if(e.target.dataset.v)$(chipT).value=e.target.dataset.v};
$('leerH').onclick=()=>{destino='horo';$('file').click()};
$('cancel').onclick=()=>$('form').classList.add('hide');
$('guardar').onclick=()=>{
const l=parseFloat($('litros').value),eq=eqLista.length?$('equipoSel').value:$('equipo').value.trim();
if(!(l>0)) return alert('Falta cargar los litros.');
if(!eq) return alert('Falta el equipo.');
if(sitios.length&&!$('sitioSel').value)return alert('Elegí el campo.');
regs.push({id:Date.now(),sid:crypto.randomUUID(),ok:0,sitio_id:$('sitioSel').value||null,eq,l,h:parseFloat($('horo').value)||0,lote:$('lote').value.trim(),f:$('fecha').value||nowLocal(),img:thumb,lat:pos&&pos.lat,lng:pos&&pos.lng});
if(!persist()){regs.pop();return}
$('form').classList.add('hide');render();sync();
};
let mias=[];try{mias=JSON.parse(localStorage.getItem('mias')||'[]')}catch(e){}
function historial(){
const lo=new Map(regs.map(r=>[r.sid,r])),m=new Map(),ok=localStorage.getItem('miasOk');
if(ok)mias.forEach(r=>m.set(r.sid,{...r,img:(lo.get(r.sid)||{}).img}));
regs.forEach(r=>{if(!m.has(r.sid)&&(!r.ok||!ok))m.set(r.sid,r)});
return [...m.values()].sort((a,b)=>b.f.localeCompare(a.f)).slice(0,30);
}
async function bajarMias(){
const {data,error}=await sb.from('cargas').select('sync_id,maquina,litros,horometro,lote,created_at').eq('user_id',perfil.id).order('created_at',{ascending:false}).limit(100);
if(error)return;
mias=data.map(r=>({sid:r.sync_id,eq:r.maquina,l:+r.litros,h:+r.horometro||0,lote:r.lote||'',f:loc(r.created_at),ok:1}));
localStorage.setItem('mias',JSON.stringify(mias));localStorage.setItem('miasOk','1');
regs=regs.filter(r=>!r.ok||mias.some(m=>m.sid===r.sid));persist();
}
function render(){
const opt=a=>[...new Set(a.filter(Boolean))].map(e=>`<option value="${esc(e)}">`).join('');
$('equipos').innerHTML=opt(regs.map(r=>r.eq));$('lotes').innerHTML=opt(regs.map(r=>r.lote));
const rec=historial();
$('lista').innerHTML=rec.length?rec.map(r=>`<div class="row">${r.img?`<img src="${r.img}">`:''}<div style="flex:1"><b>${r.l} L</b> · ${esc(r.eq)}<br><small>${fmtF(r.f)}${r.h?' · '+r.h+' hs':''}${r.lote?' · '+esc(r.lote):''}${r.ok?' · ✔ guardada':' · ⏳ sin subir'}</small></div>${r.ok?'':`<button class="x" data-d="${r.id}">🗑</button>`}</div>`).join(''):'<div class="st">Todavía no hay cargas.</div>';
}
$('lista').onclick=e=>{const id=e.target.dataset.d;if(id&&confirm('¿Borrar esta carga?')){regs=regs.filter(r=>r.id!=id);persist();render()}};
function lph(list){
const c=list.filter(r=>r.h>0).sort((a,b)=>a.h-b.h);if(c.length<2)return '';
const d=c[c.length-1].h-c[0].h;if(d<=0)return '';
return ' · '+(c.slice(1).reduce((a,r)=>a+r.l,0)/d).toFixed(1)+' L/h';
}
function grupo(list,k,vacio){
const m={};list.forEach(r=>(m[r[k]||vacio]=m[r[k]||vacio]||[]).push(r));
return Object.entries(m).sort((a,b)=>sum(b[1])-sum(a[1])).map(([n,l])=>`<div class="row"><div><b>${esc(n)}</b><br><small>${l.length} cargas${k==='eq'?lph(l):''}</small></div><b>${sum(l).toFixed(1)} L</b></div>`).join('')||'<div class="st">Sin datos.</div>';
}
const sum=l=>l.reduce((a,r)=>a+r.l,0);
$('mes').onchange=e=>{mes=e.target.value;renderRes()};
function bajar(texto,tipo,nombre){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([texto],{type:tipo}));a.download=nombre;a.click()}
$('exp').onclick=()=>bajar(JSON.stringify(regs),'application/json','gasoil-backup-'+nowLocal().slice(0,10)+'.json');
$('imp2').onclick=()=>$('imp').click();
$('imp').onchange=async e=>{
const f=e.target.files[0];e.target.value='';if(!f)return;
try{const a=JSON.parse(await f.text());if(!Array.isArray(a))throw 0;
const ids=new Set(regs.map(r=>r.id));let n=0;
a.forEach(r=>{if(r&&r.id&&r.l&&r.eq&&!ids.has(r.id)){r.sid=r.sid||crypto.randomUUID();r.ok=0;regs.push(r);n++}});
persist();render();alert(n+' cargas importadas.')}catch(x){alert('Archivo inválido.')}
};
$('csv').onclick=()=>{
if(!regs.length)return;
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
bajar('fecha,equipo,litros,horometro,lote\n'+regs.map(r=>[r.f,q(r.eq),r.l,r.h||'',q(r.lote||'')].join(',')).join('\n'),'text/csv','gasoil.csv');
};
$('prep').onclick=async()=>{
if(!navigator.onLine) return $('ocrst').textContent='Necesitás internet para este paso.';
$('ocrst').textContent='Descargando motor… puede tardar un minuto.';
try{
const c=document.createElement('canvas');c.width=260;c.height=90;const x=c.getContext('2d');
x.fillStyle='#fff';x.fillRect(0,0,260,90);x.fillStyle='#000';x.font='bold 56px sans-serif';x.fillText('123.4',14,68);
await ocrTexto(c);localStorage.setItem('ocr_ok','1');$('ocrst').textContent='Listo ✔ El OCR ya debería andar sin internet.';
}catch(e){$('ocrst').textContent='No se pudo descargar. Probá de nuevo con mejor señal.'}
};
function renderInfo(){
if(perfil&&perfil.rol==='ADMIN')$('campoInfo').innerHTML=`Campo: <b>${esc(perfil.campo||'')}</b><br>Código para tus maquinistas: <b style="font-size:22px">${esc(perfil.code||'')}</b><br>Usuarios activos: ${remoto.miembros.filter(x=>x&&!x.baja).length}/${perfil.max||3}${pintarMiembros()||''}`;
$('ocrst').textContent=localStorage.getItem('ocr_ok')?'Listo ✔ El OCR ya debería andar sin internet.':'';
$('info').textContent=`${regs.length} cargas guardadas en este celular. Si borrás los datos del navegador, se pierden: hacé backup seguido.`;
}
const aMsg=t=>$('aMsg').textContent=t;
let errSync='';
const loc=d=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,16)};
function panel(){const s=new Set(remoto.filas.map(r=>r.sid));return remoto.filas.concat(regs.filter(r=>!s.has(r.sid)).map(r=>({...r,quien:perfil?perfil.email.split('@')[0]:'yo',sitio:r.sitio_id})))}
async function cargarPerfil(u){
const {data,error}=await sb.from('profiles').select('id,email,rol,campo_id,invite_code,baja,es_dueno,campos!campo_id(nombre,max_devices,modulos)').eq('id',u.id).single();
if(error)throw error;
if(data.baja)throw new Error('El patrón dio de baja tu acceso.');
if(!data.campos)throw new Error('Tu cuenta está vencida o suspendida. Consultá con quien te dio la app.');
perfil={dueno:!!data.es_dueno,id:data.id,email:data.email,rol:data.rol,campo_id:data.campo_id,code:data.invite_code,campo:data.campos&&data.campos.nombre,max:data.campos&&data.campos.max_devices,modulos:(data.campos&&data.campos.modulos)||['gasoil']};
localStorage.setItem('perfil',JSON.stringify(perfil));
}
async function iniciar(u){
await cargarPerfil(u);mostrarApp();sync();
if(navigator.onLine&&!localStorage.getItem('ocr_ok'))$('prep').click();
}
function modoReg(n){
$('aB1').classList.toggle('hide',n!==1);$('aB2').classList.toggle('hide',n!==2);
$('aM1').classList.toggle('sel',n===1);$('aM2').classList.toggle('sel',n===2);
if(n===1)$('aCode').value='';else{$('aAct').value='';$('aCampo').value=''}
$('aMsg').textContent='';
}
$('aNueva').onclick=()=>{$('aForm').classList.toggle('hide');if(!$('aForm').classList.contains('hide'))modoReg(1)};
$('aM1').onclick=()=>modoReg(1);$('aM2').onclick=()=>modoReg(2);
$('aIng').onclick=async()=>{
if(!sb)return aMsg('No cargó el servidor. Abrí la app con señal.');
aMsg('Ingresando…');
const {data,error}=await sb.auth.signInWithPassword({email:$('aMail').value.trim(),password:$('aPass').value});
if(error)return aMsg('Email o contraseña incorrectos (o sin señal).');
try{await iniciar(data.user)}catch(e){aMsg('No se pudo cargar tu perfil: '+(e.message||e))}
};
$('aReg').onclick=async()=>{
if(!sb)return aMsg('No cargó el servidor. Abrí la app con señal.');
const code=$('aCode').value.trim();aMsg('Creando cuenta…');
const {data,error}=await sb.auth.signUp({email:$('aMail').value.trim(),password:$('aPass').value,options:{data:{invite_code:code,campo_nombre:$('aCampo').value.trim(),activation_code:$('aAct').value.trim()}}});
if(error)return aMsg('No se pudo crear la cuenta. '+(code?'Revisá el código de invitación o si el equipo ya llegó a su límite de usuarios. ':'Revisá el código de activación: sirve una sola vez. ')+error.message);
if(!data.session)return aMsg('Revisá tu email para confirmar la cuenta y después ingresá.');
try{await iniciar(data.user)}catch(e){aMsg('Cuenta creada, pero no se pudo cargar el perfil: '+(e.message||e))}
};
const MODS={
gasoil:{n:'Gasoil',t:'⛽ Gasoil Campo',d:'Combustible & stock',c:'#ffe49a',e:'🛢️',listo:1},
kiosco:{n:'Kiosco',t:'🏪 Kiosco',d:'Ventas & productos',c:'#bfe0a8',e:'🏪',listo:1},
taller:{n:'Taller',t:'🔧 Taller',d:'Servicios & reparaciones',c:'#efcbb8',e:'🔧',listo:0},
alquileres:{n:'Alquileres',t:'🏠 Alquileres',d:'Propiedades & contratos',c:'#a9c4ea',e:'🏠',listo:0}};
let modAct='';
function mostrarHub(){
modAct='';
$('tit').textContent='CONTROL TOTAL';
$('rubros').classList.add('hide');
document.querySelector('nav').classList.add('hide');$('navK').classList.add('hide');
const ms=perfil.modulos||['gasoil'];
$('hubGrid').innerHTML=Object.entries(MODS).map(([k,m])=>`<button class="tile${ms.includes(k)&&m.listo?'':' off'}" style="background:${m.c}" data-m="${k}"><span style="font-size:42px">${m.e}</span><br>${m.n}<small>${!m.listo?'Próximamente':ms.includes(k)?m.d:'No habilitado'}</small></button>`).join('')+(perfil.dueno?'<button class="tile" style="background:#e6e0f8" data-m="plat"><span style="font-size:42px">👑</span><br>Plataforma<small>Clientes y cobros</small></button>':'');
show('hub');
}
$('hubGrid').onclick=e=>{
const b=e.target.closest('.tile');if(!b)return;
const k=b.dataset.m;
if(k==='plat'){modAct='plat';$('tit').textContent='👑 Plataforma';$('rubros').classList.remove('hide');document.querySelector('nav').classList.add('hide');$('navK').classList.add('hide');return show('plat')}
const m=MODS[k],ms=perfil.modulos||['gasoil'];
if(!m.listo)return alert('Este rubro todavía no está disponible. Muy pronto.');
if(!ms.includes(k))return alert('Este rubro no está habilitado en tu cuenta. Consultá con quien te dio la app.');
entrarModulo(k);
};
function entrarModulo(k){
modAct=k;
const ms=perfil.modulos||['gasoil'],g=k==='gasoil';
$('tit').textContent=MODS[k].t;
$('rubros').classList.remove('hide');
document.querySelector('nav').classList.toggle('hide',!(g&&perfil.rol==='ADMIN'));
$('navK').classList.toggle('hide',!(k==='kiosco'&&perfil.rol==='ADMIN'));
show(g?'cargar':'kvender');
if(!g)kSync();
}
$('rubros').onclick=mostrarHub;
function mostrarApp(){
const adm=perfil.rol==='ADMIN';
$('hdr').classList.remove('hide');
$('nPlat').classList.toggle('hide',!perfil.dueno);
$('quien').textContent=perfil.email.split('@')[0]+' · '+(adm?'Patrón':'Maquinista');
render();renderEstado();pintarEq();
mostrarHub();
}
function renderEstado(){
const n=regs.filter(r=>!r.ok).length+(typeof kCola!=='undefined'?kCola.length:0);
$('est').textContent=(navigator.onLine?'● En línea':'○ Sin señal')+(n?' · '+n+' sin subir':'')+errSync;
}
async function bajarPanel(){
const [c,p]=await Promise.all([
sb.from('cargas').select('sync_id,maquina,litros,horometro,lote,created_at,user_id,sitio_id').eq('campo_id',perfil.campo_id).order('created_at',{ascending:false}).limit(1000),
sb.from('profiles').select('id,email,nombre,rol,baja').eq('campo_id',perfil.campo_id)]);
if(c.error||p.error){errSync=/fetch|network/i.test(String((c.error||p.error).message))?'':' · ⚠ '+String((c.error||p.error).message).slice(0,40);return}
errSync='';
const m=Object.fromEntries(p.data.map(x=>[x.id,(x.nombre||x.email.split('@')[0])+(x.baja?' (baja)':'')]));
remoto={filas:c.data.map(r=>({sid:r.sync_id,eq:r.maquina,l:+r.litros,h:+r.horometro||0,lote:r.lote||'',f:loc(r.created_at),quien:m[r.user_id]||'?',sitio:r.sitio_id})),miembros:p.data};
localStorage.setItem('remoto',JSON.stringify(remoto));
}
async function sync(){
if(!sb||!perfil||!navigator.onLine)return renderEstado();
try{
const q=await sb.from('profiles').select('baja').eq('id',perfil.id).maybeSingle();
if(q.data&&q.data.baja){alert('El patrón dio de baja tu acceso a este campo.');regs=[];persist();$('salir').click();return}
const cc=await sb.from('campos').select('id,modulos').eq('id',perfil.campo_id).maybeSingle();
if(!cc.error&&!cc.data){errSync=' · ⚠ cuenta vencida o suspendida';renderEstado();return}
if(cc.data&&cc.data.modulos&&JSON.stringify(cc.data.modulos)!==JSON.stringify(perfil.modulos)){perfil.modulos=cc.data.modulos;localStorage.setItem('perfil',JSON.stringify(perfil));if(modAct==='')mostrarHub()}
const pend=regs.filter(r=>!r.ok);
if(pend.length){
const {error}=await sb.from('cargas').upsert(pend.map(r=>({sync_id:r.sid,campo_id:perfil.campo_id,user_id:perfil.id,maquina:r.eq,sitio_id:r.sitio_id||null,litros:r.l,horometro:r.h||null,lote:r.lote||null,lat:r.lat??null,lng:r.lng??null,created_at:new Date(r.f).toISOString()})),{onConflict:'sync_id',ignoreDuplicates:true});
if(!error){pend.forEach(r=>r.ok=1);persist();errSync=''}else errSync=/fetch|network/i.test(String(error.message))?'':' · ⚠ '+String(error.message).slice(0,40);
}
await bajarSitios();
await bajarEquipos();
await bajarMias();
if(perfil.rol==='ADMIN'){await bajarPanel();await bajarStock()}
if((perfil.modulos||[]).includes('kiosco')&&typeof kSync==='function')await kSync();
}catch(e){}
render();renderEstado();
}
$('salir').onclick=async()=>{
const n=regs.filter(r=>!r.ok).length+(typeof kCola!=='undefined'?kCola.length:0);
if(n&&!confirm(n+' cargas todavía no se subieron y se perderían. ¿Salir igual?'))return;
try{await sb.auth.signOut()}catch(e){}
regs=[];persist();perfil=null;remoto={filas:[],miembros:[]};
['perfil','remoto','mias','miasOk','sitios','stock','equipos','sitio','k_prod','k_prov','k_cola'].forEach(k=>localStorage.removeItem(k));mias=[];listaEq=[];sitios=[];stock={};if(typeof kProd!=='undefined'){kProd=[];kProv=[];kCola=[];kCart={}}
$('hdr').classList.add('hide');document.querySelector('nav').classList.add('hide');$('navK').classList.add('hide');show('auth');
};
const lim=(p,ms)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),ms))]);
async function arrancar(){
try{perfil=JSON.parse(localStorage.getItem('perfil')||'null')}catch(e){perfil=null}
if(sb){try{
const {data}=await lim(sb.auth.getSession(),5000);
if(data.session){if(!perfil||perfil.id!==data.session.user.id){if(navigator.onLine)await lim(cargarPerfil(data.session.user),8000);else perfil=null}}
else if(navigator.onLine)perfil=null;
}catch(e){}}
if(perfil){mostrarApp();sync()}else show('auth');
}
addEventListener('online',sync);addEventListener('offline',renderEstado);
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  
