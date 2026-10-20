(() => {
  'use strict';
  const root=document.getElementById('taridalana-app');
  const view=BVTaridalanaView.mount(root,{loadDocument:entry=>BVTaridalanaView.fetchJSON('documents/'+entry.id+'.json?v='+entry.sourceHash),readPassage:BVTaridalanaView.publicPassage,onSelect:doc=>{document.title=doc.title+' — Taridalana · BaibolintsikaVerse';history.replaceState(null,'',location.pathname+'?'+new URLSearchParams({id:doc.id}));}});
  (async()=>{try{
    const [index,data]=await Promise.all([BVTaridalanaView.fetchJSON('index.json?ts='+Date.now()),BVTaridalanaView.fetchJSON('../lire/data/calendars.json')]);
    BVTaridalana.validateIndex(index);view.setIndex(index);
    const params=new URLSearchParams(location.search);if(params.getAll('id').length>1)throw Error('Lien Taridalana ambigu.');
    const id=params.get('id')||BVTaridalana.current(index,BVCalendar.localDay(),BVCalendar.create(data))?.id;
    if(!id)throw Error('Aucun Taridalana publié pour le moment.');BVTaridalana.link(id);await view.show(id);
  }catch(error){view.status(error.message,true);}})();
})();
