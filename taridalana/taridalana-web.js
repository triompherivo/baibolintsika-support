(() => {
  'use strict';
  const root=document.getElementById('taridalana-app');
  const view=BVTaridalanaView.mount(root,{language:'mg',loadDocument:entry=>BVTaridalanaView.fetchJSON(BVTaridalana.base+'documents/'+entry.id+'.json?v='+entry.sourceHash),readPassage:BVTaridalanaView.publicPassage,onSelect:doc=>{document.title=doc.title+' — Taridalana · BaibolintsikaVerse';for(const n of root.querySelectorAll('.td-play'))n.textContent='▶ Hijery ny toriteny';for(const n of root.querySelectorAll('.td-video>a'))n.textContent='Sokafy ao amin’ny YouTube ↗';history.replaceState(null,'',doc.facebookSchema===1?BVTaridalana.base+'p/'+doc.id+'/':BVTaridalana.base+'?'+new URLSearchParams({id:doc.id}));}});
  (async()=>{try{
    const [index,data]=await Promise.all([BVTaridalanaView.fetchJSON(BVTaridalana.base+'index.json?ts='+Date.now()),BVTaridalanaView.fetchJSON(BVShare.base+'data/calendars.json')]);
    BVTaridalana.validateIndex(index);view.setIndex(index);
    const params=new URLSearchParams(location.search);if(params.getAll('id').length>1)throw Error('Lien Taridalana ambigu.');
    const id=params.get('id')||document.querySelector('meta[name="td-document-id"]')?.content||BVTaridalana.current(index,BVCalendar.localDay(),BVCalendar.create(data))?.id;
    if(!id)throw Error('Aucun Taridalana publié pour le moment.');BVTaridalana.link(id);await view.show(id);
  }catch(error){view.status(error.message,true);}})();
})();
