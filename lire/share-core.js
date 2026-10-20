(function(root){
  'use strict';
  const base='https://triompherivo.github.io/baibolintsika-support/lire/';
  function edition(version){if(!root.BV.versions.includes(version))throw Error('Édition biblique inconnue.');return version;}
  function passageURL(ref,version='1MG1865'){
    edition(version);if(!root.BV.valid(ref))throw Error('Référence à partager invalide.');
    const url=new URL(base);url.search=new URLSearchParams({ref:root.BV.label(ref,'KJF'),version});return url.href;
  }
  function isoDay(ordinal){
    if(!Number.isInteger(ordinal))throw Error('Date Péricope invalide.');
    const p=root.BVCalendar.civilParts(ordinal);
    if(p.year<1583||p.year>9999)throw Error('Date Péricope hors limites.');
    return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  }
  function pericopeURL(event,version='1MG1865'){
    const url=new URL(base);url.search=new URLSearchParams({pericope:isoDay(event?.ordinal),version:edition(version)});return url.href;
  }
  function parse(input){
    const url=new URL(input,base),params=url.searchParams,version=edition(params.get('version')||'1MG1865');
    if(['ref','pericope','version'].some(name=>params.getAll(name).length>1))throw Error('Lien de lecture ambigu.');
    const reference=params.get('ref'),date=params.get('pericope');
    if(reference&&date)throw Error('Choisissez un passage ou une Péricope dans le lien.');
    if(date!==null){
      const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);if(!m)throw Error('Date du lien invalide.');
      const ordinal=root.BVCalendar.civilDay(+m[1],+m[2],+m[3]);
      if(isoDay(ordinal)!==date)throw Error('Date du lien invalide.');
      return {kind:'pericope',ordinal,version};
    }
    if(reference===null)throw Error('Ce lien ne contient pas de passage à lire.');
    const ref=root.BV.parse(reference);if(!ref||!root.BV.valid(ref))throw Error('Référence du lien invalide.');
    return {kind:'passage',ref,version};
  }
  root.BVShare={base,passageURL,pericopeURL,isoDay,parse};
})(globalThis);
