const KEY='sw-galaxy-map-v1';
const TYPES={place:['●','Local'],mission:['◆','Missão'],danger:['▲','Perigo'],base:['⬡','Base'],route:['➜','Rota'],secret:['✦','Segredo']};
export function mountMap(app,{toast,confirmAction}){
  app.innerHTML=`<div class="eyebrow">CARTOGRAFIA / SUA CAMPANHA</div><h1>A galáxia, do seu jeito.</h1><p class="sub">Trace rotas, registre descobertas e marque os próximos destinos da sua mesa.</p>
  <div class="map-toolbar" role="group" aria-label="Ferramentas do mapa">
    <div class="map-tool-group"><button data-tool="pan" aria-pressed="true">✋ Mover</button><button data-tool="pen" aria-pressed="false">✎ Lápis</button><button data-tool="line" aria-pressed="false">╱ Linha</button><button data-tool="rect" aria-pressed="false">▭ Retângulo</button><button data-tool="circle" aria-pressed="false">◯ Círculo</button><button data-tool="text" aria-pressed="false">T Texto</button><button data-tool="marker" aria-pressed="false">◆ Marcador</button><button data-tool="select" aria-pressed="false">↖ Selecionar</button><button data-tool="erase" aria-pressed="false">⌫ Borracha</button></div>
    <div class="map-tool-group"><label>Cor <input id="map-color" type="color" value="#ffd166"></label><label>Traço <input id="map-width" type="range" min="2" max="18" value="4"></label><label>Significado <select id="map-type">${Object.entries(TYPES).map(([k,[icon,label]])=>`<option value="${k}">${icon} ${label}</option>`).join('')}</select></label><label>Texto / nome <input id="map-label" maxlength="100" placeholder="Ex.: Base da Aliança"></label><button id="map-apply">Aplicar ao selecionado</button></div>
    <div class="map-tool-group"><button id="map-undo" disabled>↶ Desfazer</button><button id="map-redo" disabled>↷ Refazer</button><button id="map-remove" disabled>Remover selecionado</button><button id="map-out" aria-label="Diminuir zoom do mapa">−</button><output id="map-zoom">100%</output><button id="map-in" aria-label="Aumentar zoom do mapa">+</button><button id="map-fit">Ajustar mapa</button></div>
  </div>
  <div class="map-viewport"><canvas id="galaxy-canvas" tabindex="0" aria-label="Mapa da galáxia editável. Escolha uma ferramenta e desenhe com mouse ou toque."></canvas></div>
  <div class="map-footer"><p id="map-status" role="status">Carregando mapa…</p><div class="map-legend">${Object.values(TYPES).map(([icon,label])=>`<span>${icon} ${label}</span>`).join('')}</div></div>
  <div class="actions"><button id="map-save" class="primary">Salvar mapa</button><button id="map-png">↓ Baixar imagem PNG</button><button id="map-backup">↓ Backup editável</button><button id="map-import">↑ Importar backup</button><input id="map-file" type="file" accept="application/json,.json" hidden><button id="map-clear">Remover todas as marcações</button></div><p class="meta">Salvamento automático neste navegador. Compartilhe o PNG para mostrar o mapa ou o backup para continuar a edição em outro aparelho. A imagem original é preservada.</p><details class="map-object-list"><summary>Marcações e desenhos <span id="map-count"></span></summary><div id="map-objects"></div></details>`;
  const $=s=>app.querySelector(s),canvas=$('#galaxy-canvas'),ctx=canvas.getContext('2d'),view=$('.map-viewport'),bg=new Image();
  let objects=[],undo=[],redo=[],tool='pan',selected=-1,gesture=null,draft=null,zoom=1,base=1,ready=false,saveTimer;
  try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)objects=validate(saved)}catch{toast('O backup local do mapa não pôde ser lido. Importe uma cópia, se necessário.')}
  function validate(data){
    if(data?.version!==1||!Array.isArray(data.objects)||data.objects.length>3000)throw Error('Backup de mapa inválido.');
    const result=structuredClone(data.objects);
    for(const o of result){if(!['pen','line','rect','circle','text','marker'].includes(o.type)||!/^#[a-f0-9]{6}$/i.test(o.color)||!Number.isFinite(o.width)||o.width<1||o.width>30||!Array.isArray(o.points)||o.points.length<1||o.points.length>30000||o.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>20000||Math.abs(p.y)>20000)||typeof o.label!=='string'||o.label.length>100||(o.type==='marker'&&!TYPES[o.kind]))throw Error('O backup contém uma marcação inválida.')}
    return result;
  }
  const safe=fn=>async(...args)=>{try{await fn(...args)}catch(e){toast(e.message)}};
  function status(text){$('#map-status').textContent=text}
  function snapshot(){undo.push(JSON.stringify(objects));if(undo.length>40)undo.shift();redo=[]}
  function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,objects}));status('Salvo neste aparelho · '+objects.length+' marcações')}catch{status('Não foi possível salvar. Baixe o backup para preservar suas marcações.')}}
  function change(){clearTimeout(saveTimer);save();refresh();draw()}
  function refresh(){
    $('#map-undo').disabled=!undo.length;$('#map-redo').disabled=!redo.length;$('#map-remove').disabled=selected<0;$('#map-apply').disabled=selected<0;
    $('#map-count').textContent='('+objects.length+')';const list=$('#map-objects');list.replaceChildren();
    objects.forEach((o,i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+(o.type==='marker'?TYPES[o.kind][1]:({pen:'Desenho',line:'Linha',rect:'Retângulo',circle:'Círculo',text:'Texto'}[o.type]))+(o.label?' · '+o.label:'');b.setAttribute('aria-pressed',String(i===selected));b.onclick=()=>{selected=i;setTool('select');loadFields();refresh();draw()};list.append(b)})
  }
  function paintObject(c,o,selection=false){
    const a=o.points[0],b=o.points.at(-1);c.save();c.strokeStyle=c.fillStyle=o.color;c.lineWidth=o.width;c.lineCap='round';c.lineJoin='round';c.font='600 18px system-ui';c.shadowColor='#000';c.shadowBlur=o.type==='marker'||o.type==='text'?5:0;c.beginPath();
    if(o.type==='pen'||o.type==='line'){c.moveTo(a.x,a.y);for(const p of o.points)c.lineTo(p.x,p.y);if(o.points.length===1)c.lineTo(a.x+.1,a.y);c.stroke()}
    if(o.type==='rect')c.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
    if(o.type==='circle'){c.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(.1,Math.abs(b.x-a.x)/2),Math.max(.1,Math.abs(b.y-a.y)/2),0,0,2*Math.PI);c.stroke()}
    if(o.type==='text'){c.font=`600 ${14+o.width*2}px system-ui`;c.strokeStyle='#07121b';c.lineWidth=3;c.strokeText(o.label,a.x,a.y);c.fillText(o.label,a.x,a.y)}
    if(o.type==='marker'){c.fillStyle='#081726';c.arc(a.x,a.y,18,0,2*Math.PI);c.fill();c.strokeStyle=o.color;c.lineWidth=2;c.stroke();c.fillStyle=o.color;c.font='bold 21px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(TYPES[o.kind][0],a.x,a.y);c.textAlign='left';c.font='600 17px system-ui';c.strokeStyle='#081726';c.lineWidth=4;c.strokeText(o.label||TYPES[o.kind][1],a.x+26,a.y);c.fillText(o.label||TYPES[o.kind][1],a.x+26,a.y)}
    if(selection){const box=bounds(o);c.shadowBlur=0;c.strokeStyle='#fff';c.lineWidth=2;c.setLineDash([5,5]);c.strokeRect(box.x-7,box.y-7,box.w+14,box.h+14)}c.restore();
  }
  function draw(){if(!ready)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bg,0,0);objects.forEach((o,i)=>paintObject(ctx,o,i===selected));if(draft)paintObject(ctx,draft)}
  function fit(reset=false){if(!ready)return;if(reset)zoom=1;base=Math.min((view.clientWidth-16)/bg.naturalWidth,1);canvas.style.width=bg.naturalWidth*base*zoom+'px';canvas.style.height=bg.naturalHeight*base*zoom+'px';$('#map-zoom').textContent=Math.round(zoom*100)+'%';if(reset)view.scrollTo(0,0)}
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*canvas.width,y:(e.clientY-r.top)/r.height*canvas.height}}
  function bounds(o){const xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y);let x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;if(o.type==='text'){w=o.label.length*(14+o.width*2)*.6;h=14+o.width*2;y-=h}if(o.type==='marker'){x-=18;y-=18;w=44+(o.label||TYPES[o.kind][1]).length*11;h=36}return{x,y,w,h}}
  function distance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
  function hit(p){for(let i=objects.length-1;i>=0;i--){const o=objects[i],b=bounds(o),t=Math.max(8,12/(base*zoom));if(o.type==='pen'||o.type==='line'){if(o.points.length===1&&distance(p,o.points[0],o.points[0])<t)return i;for(let j=1;j<o.points.length;j++)if(distance(p,o.points[j-1],o.points[j])<t+o.width/2)return i}else if(p.x>=b.x-t&&p.x<=b.x+b.w+t&&p.y>=b.y-t&&p.y<=b.y+b.h+t)return i}return -1}
  function loadFields(){if(selected<0)return;const o=objects[selected];$('#map-label').value=o.label;$('#map-color').value=o.color;$('#map-width').value=o.width;if(o.kind)$('#map-type').value=o.kind}
  function setTool(value){tool=value;app.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));canvas.style.cursor=tool==='pan'?'grab':tool==='select'?'default':'crosshair';status(({pan:'Arraste para mover o mapa.',select:'Toque numa marcação para selecionar e arraste para mover.',erase:'Toque num desenho ou marcador para remover. Use Desfazer para recuperar.',text:'Digite o texto acima e toque no mapa.',marker:'Escolha o significado, digite o nome e toque no mapa.'}[tool])||'Arraste sobre o mapa para desenhar.')}
  app.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
  canvas.onpointerdown=e=>{
    if(!ready||gesture||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=point(e);
    if(tool==='pan'){gesture={id:e.pointerId,p,clientX:e.clientX,clientY:e.clientY,left:view.scrollLeft,top:view.scrollTop};return}
    if(tool==='erase'){const i=hit(p);if(i>=0){snapshot();objects.splice(i,1);selected=-1;change()}return}
    if(tool==='select'){selected=hit(p);loadFields();if(selected>=0)gesture={id:e.pointerId,p,original:structuredClone(objects[selected]),moved:false};refresh();draw();return}
    const label=$('#map-label').value.trim();if(tool==='text'&&!label){toast('Digite o texto antes de colocá-lo no mapa.');$('#map-label').focus();return}
    const o={type:tool,color:$('#map-color').value,width:Number($('#map-width').value),label,kind:$('#map-type').value,points:[p]};
    if(tool==='text'||tool==='marker'){snapshot();objects.push(o);selected=-1;change();return}
    draft=o;gesture={id:e.pointerId,p};draw();
  };
  canvas.onpointermove=e=>{if(!gesture||e.pointerId!==gesture.id)return;const p=point(e);if(tool==='pan'){view.scrollLeft=gesture.left+gesture.clientX-e.clientX;view.scrollTop=gesture.top+gesture.clientY-e.clientY;return}if(tool==='select'&&selected>=0){if(!gesture.moved){snapshot();gesture.moved=true}objects[selected].points=gesture.original.points.map(q=>({x:q.x+p.x-gesture.p.x,y:q.y+p.y-gesture.p.y}));draw();return}if(draft){if(tool==='pen'){if(distance(p,draft.points.at(-1),draft.points.at(-1))>1)draft.points.push(p)}else draft.points=[gesture.p,p];draw()}};
  function finish(e){if(!gesture||e.pointerId!==gesture.id)return;if(draft){snapshot();objects.push(draft);draft=null;selected=-1;change()}else if(gesture.moved)change();gesture=null}
  canvas.onpointerup=finish;canvas.onpointercancel=finish;
  $('#map-apply').onclick=()=>{if(selected<0)return;snapshot();Object.assign(objects[selected],{color:$('#map-color').value,width:Number($('#map-width').value),label:$('#map-label').value.trim(),kind:$('#map-type').value});change()};
  $('#map-remove').onclick=()=>{if(selected<0)return;snapshot();objects.splice(selected,1);selected=-1;change()};
  $('#map-undo').onclick=()=>{if(!undo.length)return;redo.push(JSON.stringify(objects));objects=JSON.parse(undo.pop());selected=-1;change()};
  $('#map-redo').onclick=()=>{if(!redo.length)return;undo.push(JSON.stringify(objects));objects=JSON.parse(redo.pop());selected=-1;change()};
  canvas.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'#map-redo':'#map-undo').click()}if(e.key==='Delete')$('#map-remove').click()};
  for(const [id,step] of [['#map-in',.5],['#map-out',-.5]])$(id).onclick=()=>{zoom=Math.max(1,Math.min(6,zoom+step));fit()};$('#map-fit').onclick=()=>fit(true);
  $('#map-save').onclick=()=>{clearTimeout(saveTimer);save()};
  function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}
  $('#map-png').onclick=()=>{if(!ready)return;const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d');c.drawImage(bg,0,0);objects.forEach(o=>paintObject(c,o));out.toBlob(blob=>{if(blob)download(blob,'mapa-da-campanha.png')},'image/png')};
  $('#map-backup').onclick=()=>download(new Blob([JSON.stringify({version:1,objects},null,2)],{type:'application/json'}),'mapa-da-campanha.json');
  $('#map-import').onclick=()=>$('#map-file').click();$('#map-file').onchange=safe(async e=>{const f=e.target.files[0];if(!f)return;if(f.size>15*1024*1024)throw Error('Backup muito grande (máximo 15 MB).');const next=validate(JSON.parse(await f.text()));if(!await confirmAction('Substituir as marcações pelo backup? Você poderá desfazer esta ação.'))return;snapshot();objects=next;selected=-1;change();e.target.value=''});
  $('#map-clear').onclick=async()=>{if(!objects.length)return;if(!await confirmAction('Remover todas as marcações? A imagem original será mantida e você poderá desfazer.'))return;snapshot();objects=[];selected=-1;change()};
  bg.onload=()=>{ready=true;canvas.width=bg.naturalWidth;canvas.height=bg.naturalHeight;fit(true);draw();refresh();status(objects.length+' marcações · escolha uma ferramenta para começar.')};bg.onerror=()=>status('Não foi possível carregar a imagem do mapa. Recarregue a página.');bg.src='assets/galaxy-map.png?v=1.0.1.1';
  const observer=new ResizeObserver(()=>fit());observer.observe(view);
  return ()=>{clearTimeout(saveTimer);save();observer.disconnect();bg.onload=null};
}
