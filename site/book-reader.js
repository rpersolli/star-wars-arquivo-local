import * as pdfjs from './vendor/pdf.mjs';

// A separate reader keeps page-turn gestures away from editable character sheets.
export async function openBook(book, searchInfo, {toast, bytesOf}) {
  const d=document.createElement('dialog');
  d.className='flip-reader';
  d.innerHTML=`<div class="flip-top"><div><span class="eyebrow">HOLOARQUIVO / LEITURA</span><h2></h2></div><button data-close aria-label="Fechar livro">✕</button></div>
    <div class="flip-toolbar"><button data-first aria-label="Primeira página">⇤</button><button data-prev aria-label="Página anterior">❮</button><label>Página <input data-page type="number" min="1" value="1" aria-label="Página do livro"></label><span data-total></span><button data-next aria-label="Próxima página">❯</button><button data-last aria-label="Última página">⇥</button><button data-thumbs aria-expanded="false">▦ Miniaturas</button><label class="spread-choice"><input data-spread type="checkbox" checked> Páginas duplas</label><button data-minus aria-label="Diminuir zoom">−</button><output data-zoom>100%</output><button data-plus aria-label="Aumentar zoom">+</button><button data-fit>Ajustar</button><button data-download>↓ Baixar PDF</button></div>
    <div class="flip-search"><form><input data-query aria-label="Buscar no livro" placeholder="Buscar neste livro…" minlength="2" required><button>Buscar</button></form><span data-found></span><button data-hit-prev aria-label="Resultado anterior" hidden>↑</button><button data-hit-next aria-label="Próximo resultado" hidden>↓</button></div>
    <div class="flip-workspace"><div class="flip-thumbnails" hidden></div><div class="flip-viewport" tabindex="0" aria-label="Páginas do livro. Use as setas ou deslize para virar."><div class="flip-spread"></div></div></div><div class="flip-bottom"><span data-status role="status">Abrindo livro…</span><span>← → virar · deslize no celular · zoom para explorar</span></div>`;
  d.querySelector('h2').textContent=book.title;
  document.body.append(d);d.showModal();
  const $=s=>d.querySelector(s),view=$('.flip-viewport'),spread=$('.flip-spread');
  let doc,loading,closed=false,busy=false,page=searchInfo?.pages?.[0]||1,zoom=1,renderId=0,searchId=0,thumbId=0;
  let hits=searchInfo?.pages||[],term=searchInfo?.term||'',tasks=[],resizeTimer;
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const safe=fn=>async(...args)=>{try{await fn(...args)}catch(e){if(!closed){$('[data-status]').textContent='Não foi possível concluir. '+e.message;toast(e.message)}}};
  const dual=()=>window.innerWidth>=850&&$('[data-spread]').checked;
  const pageList=()=>dual()&&page>1&&page<doc.numPages?[page,page+1]:[page];
  function update(){
    $('[data-page]').value=page;$('[data-total]').textContent='/ '+doc.numPages;
    $('[data-prev]').disabled=$('[data-first]').disabled=page===1;
    $('[data-next]').disabled=$('[data-last]').disabled=pageList().at(-1)>=doc.numPages;
    $('[data-zoom]').textContent=Math.round(zoom*100)+'%';
    $('[data-status]').textContent='Página'+(pageList().length>1?'s ':' ')+pageList().join('–')+' de '+doc.numPages;
  }
  async function paint(){
    if(!doc||closed)return;
    const id=++renderId;tasks.forEach(t=>t.cancel());tasks=[];
    const pages=pageList(),next=document.createElement('div');next.className='flip-spread';
    const availableWidth=Math.max(180,view.clientWidth-40),availableHeight=Math.max(180,view.clientHeight-36);
    for(const n of pages){
      const p=await doc.getPage(n);if(id!==renderId||closed)return;
      const base=p.getViewport({scale:1});
      const scale=Math.min((availableWidth/pages.length)/base.width,availableHeight/base.height)*zoom;
      const v=p.getViewport({scale}),ratio=Math.min(devicePixelRatio||1,2);
      const leaf=document.createElement('div');leaf.className='flip-leaf';leaf.style.width=v.width+'px';leaf.style.height=v.height+'px';
      const c=document.createElement('canvas');c.width=Math.round(v.width*ratio);c.height=Math.round(v.height*ratio);c.style.width=v.width+'px';c.style.height=v.height+'px';c.setAttribute('aria-label','Página '+n);leaf.append(c);next.append(leaf);
      const task=p.render({canvasContext:c.getContext('2d'),viewport:v,transform:[ratio,0,0,ratio,0,0]});tasks.push(task);
      try{await task.promise}catch(e){if(e.name==='RenderingCancelledException')return;throw e}
      if(term){const text=await p.getTextContent();for(const item of text.items){if(!norm(item.str).includes(norm(term)))continue;const tr=pdfjs.Util.transform(v.transform,item.transform),h=Math.hypot(tr[2],tr[3]);const mark=document.createElement('span');mark.className='book-highlight';Object.assign(mark.style,{left:tr[4]+'px',top:(tr[5]-h)+'px',width:item.width*scale+'px',height:h*1.2+'px'});leaf.append(mark)}}
    }
    if(id!==renderId||closed)return;
    spread.replaceChildren(...next.childNodes);update();
  }
  async function go(target,animate=true){
    if(!doc||busy||closed)return;
    const next=Math.min(doc.numPages,Math.max(1,target));if(next===page)return;
    const direction=next>page?1:-1;
    busy=true;let ghost;
    try{
      if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.classList.contains('reduce-motion')&&zoom===1){
        const old=spread.querySelector(direction>0?'.flip-leaf:last-child':'.flip-leaf:first-child');
        if(old){ghost=document.createElement('canvas');const c=old.querySelector('canvas');ghost.width=c.width;ghost.height=c.height;ghost.getContext('2d').drawImage(c,0,0);ghost.className='flip-ghost';const r=old.getBoundingClientRect(),vr=view.getBoundingClientRect();Object.assign(ghost.style,{left:r.left-vr.left+view.scrollLeft+'px',top:r.top-vr.top+view.scrollTop+'px',width:r.width+'px',height:r.height+'px',transformOrigin:direction>0?'left center':'right center'});view.append(ghost)}
      }
      page=next;await paint();
      if(ghost){const a=ghost.animate([{transform:'rotateY(0deg)',filter:'brightness(1)'},{transform:`rotateY(${direction*-88}deg)`,filter:'brightness(.55)'}],{duration:420,easing:'ease-in-out',fill:'forwards'});await a.finished.catch(()=>{})}
      view.scrollTo(0,0);
    } finally{ghost?.remove();busy=false}
  }
  const turn=direction=>go(direction>0?page+pageList().length:(dual()?(page<=2?1:page-2):page-1));
  $('[data-prev]').onclick=safe(()=>turn(-1));$('[data-next]').onclick=safe(()=>turn(1));
  $('[data-first]').onclick=safe(()=>go(1));$('[data-last]').onclick=safe(()=>go(doc.numPages));
  $('[data-page]').onchange=safe(()=>go(Number($('[data-page]').value)||1,false));
  $('[data-spread]').onchange=safe(paint);
  async function setZoom(value){zoom=Math.max(1,Math.min(3,value));view.classList.toggle('zoomed',zoom>1);await paint()}
  $('[data-minus]').onclick=safe(()=>setZoom(zoom-.25));$('[data-plus]').onclick=safe(()=>setZoom(zoom+.25));$('[data-fit]').onclick=safe(()=>setZoom(1));
  d.addEventListener('keydown',e=>{if(e.target.closest('input,button')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();safe(()=>turn(e.key==='ArrowRight'?1:-1))()}});
  let start=null;
  view.onpointerdown=e=>{if(e.button!==0||!doc)return;start={id:e.pointerId,x:e.clientX,y:e.clientY,left:view.scrollLeft,top:view.scrollTop};view.setPointerCapture(e.pointerId)};
  view.onpointermove=e=>{if(start?.id===e.pointerId&&zoom>1){view.scrollLeft=start.left+start.x-e.clientX;view.scrollTop=start.top+start.y-e.clientY}};
  view.onpointerup=e=>{if(start?.id!==e.pointerId)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(zoom===1&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4)safe(()=>turn(dx<0?1:-1))()};view.onpointercancel=()=>start=null;
  function hitsUI(){const i=hits.indexOf(page);$('[data-found]').textContent=hits.length?`${hits.length} páginas encontradas${i>=0?' · resultado '+(i+1):''}`:term?'Nenhuma página encontrada. O PDF pode não conter texto.':'';for(const s of ['[data-hit-prev]','[data-hit-next]'])$(s).hidden=!hits.length}
  $('[data-query]').value=term;hitsUI();
  $('form').onsubmit=safe(async e=>{e.preventDefault();if(!doc)return;const id=++searchId;term=$('[data-query]').value.trim();hits=[];$('[data-found]').textContent='Pesquisando…';for(let i=1;i<=doc.numPages;i++){if(closed||id!==searchId)return;const p=await doc.getPage(i),text=(await p.getTextContent()).items.map(x=>x.str).join(' ');if(norm(text).includes(norm(term)))hits.push(i);if(i%12===0){$('[data-found]').textContent=`Pesquisando ${i}/${doc.numPages}…`;await new Promise(requestAnimationFrame)}}if(hits.length)await go(hits[0],false);await paint();hitsUI()});
  for(const [sel,dir] of [['[data-hit-prev]',-1],['[data-hit-next]',1]])$(sel).onclick=safe(async()=>{const i=hits.indexOf(page);await go(hits[(i+dir+hits.length)%hits.length],false);hitsUI()});
  $('[data-thumbs]').onclick=safe(async()=>{if(!doc)return;const rail=$('.flip-thumbnails');rail.hidden=!rail.hidden;$('[data-thumbs]').setAttribute('aria-expanded',String(!rail.hidden));await paint();const id=++thumbId;if(rail.hidden||rail.childElementCount)return;for(let i=1;i<=doc.numPages;i++){if(closed||id!==thumbId)return;const b=document.createElement('button');b.textContent='Página '+i;b.setAttribute('aria-label','Ir à página '+i);b.onclick=safe(()=>go(i,false));rail.append(b)}const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);safe(async()=>{if(closed)return;const n=Number(entry.target.textContent.replace('Página ','')),p=await doc.getPage(n),v=p.getViewport({scale:110/p.getViewport({scale:1}).width}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;if(!closed)entry.target.prepend(c)})()}},{root:rail,rootMargin:'160px'});rail.querySelectorAll('button').forEach(b=>observer.observe(b));d.addEventListener('close',()=>observer.disconnect(),{once:true})});
  $('[data-download]').onclick=safe(async()=>{if(!doc)return;const bytes=await doc.getData(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));a.download=book.file||book.title+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)});
  const resize=()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(safe(paint),150)};window.addEventListener('resize',resize);
  $('[data-close]').onclick=()=>d.close();
  d.addEventListener('close',()=>{closed=true;++renderId;++searchId;++thumbId;clearTimeout(resizeTimer);window.removeEventListener('resize',resize);tasks.forEach(t=>t.cancel());loading?.destroy();d.remove()},{once:true});
  await safe(async()=>{
    const source=book.local||book.parts?{data:(await bytesOf(book)).slice()}:{url:'books/'+encodeURIComponent(book.file)};
    if(closed)return;
    loading=pdfjs.getDocument({...source,isEvalSupported:false});loading.onProgress=({loaded,total})=>{if(!closed)$('[data-status]').textContent=total?'Carregando livro · '+Math.min(100,Math.round(loaded/total*100))+'%':'Carregando livro…'};
    doc=await loading.promise;if(closed)return;$('[data-page]').max=doc.numPages;await paint();view.focus();
  })();
}
