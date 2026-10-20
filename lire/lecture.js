(() => {
  'use strict';
  const $=id=>document.getElementById(id),books=new Map();
  let state,calendarPromise,serial=0,popupSerial=0,popupTrigger,copyText='',size=22;
  const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  function notice(text='',error=false){$('notice').textContent=text;$('notice').classList.toggle('error',error);}
  async function getJSON(path){const response=await fetch(path);if(!response.ok)throw Error('La lecture n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.');return response.json();}
  function calendar(){if(!calendarPromise)calendarPromise=getJSON('data/calendars.json').then(BVCalendar.create).catch(error=>{calendarPromise=null;throw error;});return calendarPromise;}
  function getBook(book,version){
    const key=version+'/'+book;
    if(!books.has(key))books.set(key,(async()=>{
      const response=await fetch(`data/${version}/${book}.json.gz`);if(!response.ok)throw Error('Le texte biblique est indisponible. Vérifiez votre connexion et réessayez.');
      const bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes[0]===31&&bytes[1]===139){
        if(typeof DecompressionStream==='undefined')throw Error('Mettez votre navigateur à jour pour ouvrir cette lecture.');
        return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    })().catch(error=>{books.delete(key);throw error;}));
    return books.get(key);
  }
  async function passage(ref,version){
    const book=await getBook(ref.book,version),rows=[],missing=[];
    for(const chapter of [...new Set(ref.parts.map(p=>p.chapter))]){
      const verses=book[chapter]||[];
      for(const [verse,text]of verses)if(ref.wholeChapter||ref.parts.some(p=>p.chapter===chapter&&verse>=p.from&&verse<=p.to))rows.push({chapter,verse,text});
      if(!ref.wholeChapter)for(const p of ref.parts.filter(p=>p.chapter===chapter))for(let v=p.from;v<=p.to;v++)if(!verses.some(row=>row[0]===v))missing.push(chapter+':'+v);
    }
    return {rows,missing};
  }
  function renderRows(target,result){
    target.replaceChildren();let last;
    const multi=new Set(result.rows.map(row=>row.chapter)).size>1;
    for(const row of result.rows){
      if(multi&&last!==row.chapter){const h=node('h2','Chapitre '+row.chapter);h.className='chapter-break';target.append(h);}last=row.chapter;
      const p=node('p');p.className='verse';p.dataset.verse=row.chapter+':'+row.verse;p.append(node('sup',String(row.verse)),document.createTextNode(row.text));target.append(p);
    }
    if(result.missing.length){const p=node('p','Versets absents de cette édition : '+result.missing.join(', ')+'. Numérotation d’origine conservée.');p.className='credit';target.append(p);}
  }
  function currentURL(){return state.kind==='passage'?BVShare.passageURL(state.ref,state.version):BVShare.pericopeURL({ordinal:state.ordinal},state.version);}
  function dateLabel(day){const p=BVCalendar.civilParts(day);return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(p.year,p.month-1,p.day,12)));}
  async function render(next,{updateURL=true}={}){
    const ticket=++serial;popupSerial++;if($('passage-dialog').open)$('passage-dialog').close();notice('Chargement de la lecture…');
    let title,subtitle,result,event;
    if(next.kind==='passage'){title=BV.label(next.ref,next.version);subtitle=BV.editions[next.version];result=await passage(next.ref,next.version);}
    else{
      const engine=await calendar();if(engine.upcoming(next.ordinal).ordinal!==next.ordinal)throw Error('Cette date ne correspond pas à un événement de la Péricope.');
      event=engine.celebration(next.ordinal);title=event.title;subtitle=dateLabel(event.ordinal);
    }
    if(ticket!==serial)return;state=next;$('version').value=next.version;$('welcome').hidden=true;$('reading').hidden=false;$('reference').textContent=title;$('edition').textContent=subtitle;$('kind').textContent=next.kind==='passage'?'UN PASSAGE À MÉDITER':'PÉRICOPE UNIVERSELLE';document.title=title+' — BaibolintsikaVerse';
    $('verses').hidden=next.kind!=='passage';$('pericope').hidden=next.kind!=='pericope';
    $('credit').textContent=next.version==='KJF'?'King James Française — KJF (traduction Nadine Stratford).':'';
    if(result){renderRows($('verses'),result);copyText=title+' ('+next.version+')\n'+result.rows.map(r=>r.verse+'. '+r.text).join('\n');}
    if(event){
      const colors={white:'Blanc',green:'Vert',purple:'Violet',red:'Rouge',black:'Noir'};
      $('pericope-meta').textContent=`Nº ${event.tableNumber} · Cycle ${['','I','II','III'][event.cycle]} · ${colors[event.color]||'Liturgique'}`;
      $('pericope-subtitle').textContent=event.subtitle||'';
      $('collect-text').replaceChildren(...event.collect.split(/\n\s*\n/).map(text=>node('p',text)));
      const engine=await calendar();
      $('readings').replaceChildren(...event.readings.map(reading=>{
        const row=node('div');row.className='reading';row.append(node('span',reading.title));const ref=engine.reading(reading.reference);
        if(ref){const link=node('a',reading.reference);link.href=BVShare.passageURL(ref,next.version);link.onclick=e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();openPassage(ref,link);}};row.append(link);}else row.append(node('span',reading.reference));return row;
      }));
      copyText=title+'\n'+subtitle+'\n\nVAVAKA KOLEKTA\n'+event.collect+'\n\n'+event.readings.map(r=>r.title+' : '+r.reference).join('\n');
    }
    if(updateURL){const url=new URL(currentURL());history.replaceState(null,'',location.pathname+'?'+url.searchParams);}
    notice();
  }
  async function openPassage(ref,trigger){
    const request=++popupSerial;popupTrigger=trigger;$('passage-title').textContent=BV.label(ref,state.version);$('passage-body').replaceChildren(node('p','Chargement…'));$('passage-link').href=BVShare.passageURL(ref,state.version);$('passage-dialog').showModal();
    try{const result=await passage(ref,state.version);if(request===popupSerial)renderRows($('passage-body'),result);}catch(error){if(request===popupSerial)$('passage-body').replaceChildren(node('p',error.message));}
  }
  $('passage-close').onclick=()=>$('passage-dialog').close();$('passage-dialog').addEventListener('close',()=>{popupSerial++;popupTrigger?.focus({preventScroll:true});});
  async function clipboard(text){try{await navigator.clipboard.writeText(text);}catch{const input=node('textarea',text);input.style.cssText='position:fixed;opacity:0';document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw Error('Copie indisponible : copiez le lien depuis la barre d’adresse.');}}
  const run=fn=>async()=>{try{await fn();}catch(error){notice(error.message,true);}};
  $('copy-link').onclick=run(async()=>{await clipboard(currentURL());notice('Lien copié. Vous pouvez le joindre à votre carte.');});
  $('copy-text').onclick=run(async()=>{await clipboard(copyText);notice('Texte copié.');});
  $('native-share').hidden=typeof navigator.share!=='function';$('native-share').onclick=run(async()=>{try{await navigator.share({title:document.title,url:currentURL()});}catch(error){if(error.name!=='AbortError')throw error;}});
  $('version').onchange=run(async()=>{if(state)await render({...state,version:$('version').value});});
  for(const [id,direction]of [['smaller',-1],['larger',1]])$(id).onclick=()=>{size=Math.max(16,Math.min(34,size+direction*2));document.documentElement.style.setProperty('--verse-size',size+'px');$('smaller').disabled=size===16;$('larger').disabled=size===34;};
  $('entry').onsubmit=e=>{e.preventDefault();run(async()=>{const ref=BV.parse($('query').value.trim());if(!ref)throw Error('Référence invalide. Exemple : Matthieu 5:11-19.');await render({kind:'passage',ref,version:$('version').value});$('reference').scrollIntoView({block:'start'});})();};
  function welcome(){
    $('welcome').hidden=false;notice();const examples=[['Matthieu 5:11–19','Un passage complet, neuf versets à lire et à méditer.',BVShare.passageURL(BV.parse('Matthieu 5:11-19'),'KJF')],['Jaona 3:16','Un verset en malagasy, avec choix des trois éditions.',BVShare.passageURL(BV.parse('Jean 3:16'),'1MG1865')],['Péricope du 25 octobre 2026','Vavaka Kolekta et toutes les lectures de ce dimanche.',BVShare.pericopeURL({ordinal:BVCalendar.civilDay(2026,10,25)},'1MG1865')]];
    $('examples').replaceChildren(...examples.map(([title,description,url])=>{const a=node('a',title);a.href=url;a.append(node('small',description));return a;}));
  }
  (async()=>{try{if(!location.search){welcome();return;}await render(BVShare.parse(location.href),{updateURL:false});}catch(error){welcome();notice(error.message,true);}})();
})();
