(function(root){
  'use strict';
  const base='https://triompherivo.github.io/baibolintsika-support/taridalana/';
  const special={5:'noely',6:'alahmanarnoely',7:'taombaovao',8:'epifania',23:'sampandrofia',24:'paska',31:'pentekosta',32:'trinite',60:'noely2',61:'alakamisymasina',62:'zomamasina',63:'paska2',64:'niakarana',65:'pentekosta2',66:'fetyfilazantsara',67:'fahatsiarovanaolonamasina',68:'alarobianlavenona'};
  // Port direct de TaridalanaNomenclature.kt (Android, table universelle).
  function filename(number,cycle){
    if(!Number.isInteger(number)||number<1||number>68||![1,2,3].includes(cycle))throw Error('Péricope ou cycle invalide.');
    const stem=special[number]||(number<=4?`alah${number}aminadvento`:number<=14?`alah${number-8}manarepifania`:number<=22?`alah${24-number}alohanpaska`:number<=30?`alah${number-24}manarpaska`:`alah${number-32}manartrinite`);
    return `${stem}_${cycle}.txt`;
  }
  function identity(name){
    const clean=String(name).toLowerCase();
    for(let n=1;n<=68;n++)for(let cycle=1;cycle<=3;cycle++)if(filename(n,cycle)===clean)return {tableNumber:n,cycle,filename:clean};
    throw Error('Nom Taridalana inconnu. Utilisez le nom du module Android, par exemple alah20manartrinite_2.txt.');
  }
  const iso=day=>{const p=BVCalendar.civilParts(day);return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;};
  function metadata(name,year,engine){
    const key=identity(name);if(!Number.isInteger(year)||year<1583||year>9999)throw Error('Année invalide.');
    for(let day=BVCalendar.civilDay(year,1,1),end=BVCalendar.civilDay(year+1,1,1);day<end;day++){
      if(engine.upcoming(day).ordinal!==day)continue;const event=engine.celebration(day);
      if(event.tableNumber===key.tableNumber&&event.cycle===key.cycle){
        const date=iso(day),id=date+'-'+key.filename.replace('.txt','').replace(/_/g,'-');
        return {...key,id,date,title:event.title,year,ordinal:day};
      }
    }
    throw Error(`Ce fichier appartient au cycle ${key.cycle}, absent pour cette fête en ${year}. Choisissez l’année correspondante.`);
  }
  const link=id=>{if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]{3,100}$/.test(id))throw Error('Identifiant Taridalana invalide.');return base+'?'+new URLSearchParams({id});};
  function validateIndex(index){
    if(index?.schema!==1||!Array.isArray(index.documents)||index.documents.length>10000)throw Error('Index Taridalana invalide.');
    const ids=new Set();for(const doc of index.documents){link(doc.id);identity(doc.filename);if(ids.has(doc.id)||!/^\d{4}-\d{2}-\d{2}$/.test(doc.date)||typeof doc.title!=='string'||doc.title.length>500||!/^[a-f0-9]{64}$/.test(doc.sourceHash))throw Error('Entrée Taridalana invalide.');ids.add(doc.id);}
    return index;
  }
  function current(index,day,engine){
    const docs=[...validateIndex(index).documents].sort((a,b)=>b.date.localeCompare(a.date));if(!docs.length)return null;
    const next=engine.upcoming(day),expected=filename(next.tableNumber,next.cycle),exact=docs.find(d=>d.filename===expected&&d.date===iso(next.ordinal));
    return exact||docs.find(d=>d.date<=iso(day))||docs.at(-1);
  }
  function youtube(raw){
    try{
      const u=new URL(raw.replace(/&amp;|&#38;/gi,'&'),'https://www.youtube.com');if(!['https:','http:'].includes(u.protocol))return null;
      const host=u.hostname.toLowerCase().replace(/^(www|m|music)\./,''),parts=u.pathname.split('/').filter(Boolean);
      const id=host==='youtu.be'?parts[0]:['youtube.com','youtube-nocookie.com'].includes(host)?(parts[0]==='watch'?u.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null):null;
      return /^[A-Za-z0-9_-]{6,20}$/.test(id||'')?id:null;
    }catch{return null;}
  }
  root.BVTaridalana={base,filename,identity,metadata,iso,link,current,validateIndex,youtube};
})(globalThis);
