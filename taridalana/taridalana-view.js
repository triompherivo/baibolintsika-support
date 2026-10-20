(() => {
  'use strict';
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function mount(root,{loadDocument,readPassage,onSelect,language='fr'}={}){
    root.classList.add('td-view');root.innerHTML=`<header class="td-hero"><div><p class="td-eyebrow">TARI-DALANA · UNE PAROLE POUR LA SEMAINE</p><h2>Lire. Méditer.<br><em>Grandir ensemble.</em></h2></div><span class="td-seal">Baibolintsika<span>Verse</span></span></header><div class="td-toolbar"><label>Les Taridalana<select class="td-archives" aria-label="Choisir un Taridalana"></select></label><label>Bible des références<select class="td-bible"><option value="1MG1865">1MG1865 · Malagasy</option><option value="KJF">KJF · Français</option><option value="KJV">KJV · English</option></select></label><div class="td-size"><button class="td-smaller" aria-label="Réduire le texte">A−</button><button class="td-larger" aria-label="Agrandir le texte">A+</button></div><button class="td-copy">Copier le lien ↗</button></div><p class="td-notice" role="status" aria-live="polite"></p><div class="td-document-meta"></div><div class="td-progress" aria-hidden="true"><span></span></div><div class="td-layout"><aside><details class="td-toc-box"><summary>Dans cette méditation</summary><nav class="td-toc" aria-label="Sommaire du Taridalana"></nav></details><p class="td-reference-note">Les références soulignées ouvrent la Bible. Cliquez une image pour l’agrandir.</p></aside><article class="td-paper" aria-label="Texte du Taridalana"></article></div>`;
    const mg=language==='mg';if(mg){const labels={'TARI-DALANA · UNE PAROLE POUR LA SEMAINE':'TARI-DALANA · TENY HO AN’NY HERINANDRO','Lire. Méditer.':'Mamaky. Misaintsaina.','Grandir ensemble.':'Miara-mitombo amin’ny finoana.','Les Taridalana':'Tari-dalana','Bible des références':'Baiboly','Copier le lien ↗':'Adikao ny rohy ↗','Dans cette méditation':'Votoatin’ny tari-dalana','Les références soulignées ouvrent la Bible. Cliquez une image pour l’agrandir.':'Tsindrio ny andininy misy tsipika raha hamaky Baiboly. Tsindrio ny sary raha hanalehibe azy.'};const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode())if(labels[n.textContent])n.textContent=labels[n.textContent];}
    const $=selector=>root.querySelector(selector);let index={schema:1,documents:[]},current,ticket=0,size=20,modal,referenceTicket=0,referenceTrigger;
    function status(text,error=false){$('.td-notice').textContent=text;$('.td-notice').classList.toggle('td-error',error);}
    async function show(id){
      const next=++ticket;status(mg?'Manokatra ny tari-dalana…':'Ouverture du Taridalana…');
      try{
        const entry=index.documents.find(d=>d.id===id);if(!entry)throw Error('Ce Taridalana n’est pas dans l’index.');
        const doc=await loadDocument(entry);if(next!==ticket)return;
        if(doc.id!==entry.id||typeof doc.source!=='string')throw Error('Document Taridalana invalide.');
        current=doc;$('.td-archives').value=id;
        const parsed=new Date(doc.date+'T12:00:00Z'),date=mg?`${parsed.getUTCDate()} ${['Janoary','Febroary','Martsa','Aprily','Mey','Jona','Jolay','Aogositra','Septambra','Oktobra','Novambra','Desambra'][parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`:new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(parsed);
        $('.td-document-meta').textContent=`${date} · Cycle ${['','I','II','III'][doc.cycle]||doc.cycle} · ${doc.filename}`;
        const stats=BVTaridalanaRender.render(doc.source,$('.td-paper'),{toc:$('.td-toc'),onReference:openReference});
        status(mg?`${stats.references} andinin-tSoratra Masina · ${stats.videos} horonan-tsary · ${stats.images} sary`:`${stats.references} références bibliques · ${stats.videos} vidéo${stats.videos>1?'s':''} · ${stats.images} illustration${stats.images>1?'s':''}`);
        $('.td-copy').disabled=Boolean(doc.local);$('.td-copy').title=doc.local?'Publiez ce document pour obtenir son lien public.':'';
        onSelect?.(doc);return doc;
      }catch(error){status(error.message,true);}
    }
    function setIndex(value){index=BVTaridalana.validateIndex(value);const selected=$('.td-archives').value;$('.td-archives').replaceChildren(...[...index.documents].sort((a,b)=>b.date.localeCompare(a.date)).map(doc=>{const o=node('option',`${doc.local?'● Brouillon · ':''}${doc.date} · ${doc.title}`);o.value=doc.id;return o;}));if(index.documents.some(d=>d.id===selected))$('.td-archives').value=selected;}
    function createModal(){
      modal=node('dialog');modal.className='td-passage-dialog';modal.innerHTML='<header><h3></h3><button aria-label="Fermer la lecture">×</button></header><div class="td-passage-body" aria-live="polite"></div><footer><a target="_blank" rel="noopener noreferrer">Ouvrir cette lecture ↗</a></footer>';modal.querySelector('button').onclick=()=>modal.close();modal.onclose=()=>{referenceTicket++;referenceTrigger?.focus({preventScroll:true});};root.append(modal);
    }
    async function openReference(ref,anchor){
      if(!modal)createModal();const request=++referenceTicket,version=$('.td-bible').value;referenceTrigger=anchor;
      modal.querySelector('h3').textContent=BV.label(ref,version);modal.querySelector('a').href=BVShare.passageURL(ref,version);if(mg){modal.querySelector('button').setAttribute('aria-label','Hidio');modal.querySelector('a').textContent='Vakio ny andininy ↗';}
      const body=modal.querySelector('.td-passage-body');body.replaceChildren(node('p',mg?'Eo am-pikarakarana…':'Chargement…'));if(!modal.open)modal.showModal();
      try{const result=await readPassage(ref,version);if(request!==referenceTicket)return;body.replaceChildren(...result.rows.map(row=>{const p=node('p'),n=node('sup',row.chapter+':'+row.verse);p.append(n,document.createTextNode(row.text));return p;}));if(result.missing?.length)body.append(node('p','Versets absents de cette édition : '+result.missing.join(', ')));}catch(error){if(request===referenceTicket)body.replaceChildren(node('p',error.message));}
    }
    $('.td-archives').onchange=()=>show($('.td-archives').value);
    $('.td-smaller').onclick=()=>{size=Math.max(16,size-2);root.style.setProperty('--td-size',size+'px');};$('.td-larger').onclick=()=>{size=Math.min(32,size+2);root.style.setProperty('--td-size',size+'px');};
    $('.td-copy').onclick=async()=>{try{await navigator.clipboard.writeText(current.facebookSchema===1?BVTaridalana.base+'p/'+current.id+'/':BVTaridalana.link(current.id));status(mg?'Voaray ny rohy. Azonao zaraina.':'Lien du Taridalana copié.');}catch{status('Copiez le lien depuis la barre d’adresse.',true);}};
    return {setIndex,show,status,get current(){return current;}};
  }
  const books=new Map();async function publicPassage(ref,version){
    const key=version+'/'+ref.book;if(!books.has(key))books.set(key,(async()=>{const r=await fetch(BVShare.base+`data/${version}/${ref.book}.json.gz`);if(!r.ok)throw Error('Lecture biblique indisponible.');const bytes=new Uint8Array(await r.arrayBuffer());return bytes[0]===31&&bytes[1]===139?new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json():JSON.parse(new TextDecoder().decode(bytes));})().catch(e=>{books.delete(key);throw e;}));
    const book=await books.get(key),rows=[];for(const chapter of [...new Set(ref.parts.map(p=>p.chapter))])for(const [verse,text]of book[chapter]||[])if(ref.wholeChapter||ref.parts.some(p=>p.chapter===chapter&&verse>=p.from&&verse<=p.to))rows.push({chapter,verse,text});return {rows};
  }
  async function fetchJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Le catalogue Taridalana n’est pas disponible. Réessayez plus tard.');return r.json();}
  globalThis.BVTaridalanaView={mount,publicPassage,fetchJSON};
})();
