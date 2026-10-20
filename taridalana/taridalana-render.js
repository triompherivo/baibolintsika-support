(() => {
  'use strict';
  const tags=new Set('P DIV SPAN H1 H2 H3 H4 H5 H6 STRONG B EM I U S DEL SUB SUP BR HR BLOCKQUOTE UL OL LI TABLE THEAD TBODY TR TD TH FIGURE FIGCAPTION A IMG PRE CODE DETAILS SUMMARY'.split(' '));
  const dropped=new Set('SCRIPT STYLE NOSCRIPT OBJECT EMBED FORM INPUT BUTTON TEXTAREA SELECT SVG MATH TEMPLATE LINK META HEAD'.split(' '));
  const colors={red:'#be403c',green:'#267853',purple:'#8053a1',blue:'#2767b1',yellow:'#9a6c13',cyan:'#087e8b'};
  const custom={CR:'red',CG:'green',CP:'purple',CB:'blue',CY:'yellow',CC:'cyan'};
  const node=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function safeURL(value,image=false){
    if(image&&/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value)&&value.length<12000000)return value;
    try{const u=new URL(value);return u.protocol==='https:'||(!image&&['http:','mailto:'].includes(u.protocol))?u.href:null;}catch{return null;}
  }
  function video(id){
    const card=node('figure');card.className='td-video';card.dataset.video=id;
    const play=node('button','▶ Lire la vidéo YouTube');play.type='button';play.className='td-play';
    const fallback=node('a','Ouvrir dans YouTube ↗');fallback.href='https://www.youtube.com/watch?v='+id;fallback.target='_blank';fallback.rel='noopener noreferrer';
    play.onclick=()=>{const frame=node('iframe');frame.title='Vidéo YouTube';
      // In a WebExtension, a small HTTPS viewer supplies YouTube's required
      // HTTPS referrer. It has no access to the studio or the native publisher.
      frame.src=globalThis.browser?.runtime?.sendMessage?BVTaridalana.base+'video.html?'+new URLSearchParams({v:id}):'https://www.youtube-nocookie.com/embed/'+id+'?'+new URLSearchParams({rel:0,origin:location.origin});
      frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';play.replaceWith(frame);};
    card.append(play,fallback);return card;
  }
  function style(source,target){
    for(const property of ['color','background-color','font-weight','font-style','text-decoration','text-align','font-size']){
      let value=source.style?.getPropertyValue(property);if(!value||/[{};@]|url\s*\(|expression\s*\(|var\s*\(/i.test(value))continue;
      if(property==='color')value=colors[value.toLowerCase()]||value;
      if(property==='font-size'){if(!/^(?:[1-3]?[0-9](?:\.\d+)?px|[0-3](?:\.\d+)?em|[0-3](?:\.\d+)?rem|(?:[5-9]\d|[12]\d\d)%)$/.test(value))continue;}
      if(CSS.supports(property,value))target.style.setProperty(property,value);
    }
  }
  function convert(source){
    if(source.nodeType===Node.TEXT_NODE)return document.createTextNode(source.data);
    if(source.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
    const tag=source.tagName;if(dropped.has(tag))return document.createDocumentFragment();
    if(tag==='IFRAME'){const id=BVTaridalana.youtube(source.getAttribute('src')||'');return id?video(id):node('span');}
    if(tag==='A'){const id=BVTaridalana.youtube(source.getAttribute('href')||'');if(id)return video(id);}
    const target=node(custom[tag]?'span':tag==='N'?'em':tags.has(tag)?tag.toLowerCase():'span');
    style(source,target);if(custom[tag])target.style.color=colors[custom[tag]];
    if(tag==='FONT'&&source.getAttribute('color')){const value=source.getAttribute('color');if(CSS.supports('color',value))target.style.color=colors[value]||value;}
    if(tag==='A'){const href=safeURL(source.getAttribute('href')||'');if(href){target.href=href;target.target='_blank';target.rel='noopener noreferrer';}}
    if(tag==='IMG'){
      const url=safeURL(source.getAttribute('src')||'',true);if(!url)return node('span','[Image non disponible]');
      target.src=url;target.alt=source.getAttribute('alt')||'Illustration du Taridalana';target.loading='lazy';target.decoding='async';target.className='td-image';target.tabIndex=0;target.setAttribute('role','button');target.setAttribute('aria-label','Agrandir l’illustration');
      const open=()=>{const modal=node('dialog');modal.className='td-image-dialog';const close=node('button','Fermer ×'),img=node('img');img.src=url;img.alt=target.alt;close.onclick=()=>modal.close();modal.append(close,img);document.body.append(modal);modal.onclose=()=>{modal.remove();target.focus();};modal.showModal();};target.onclick=open;target.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();open();}};
    }
    if(['TD','TH'].includes(tag)){const colspan=Number(source.getAttribute('colspan'));if(colspan>0&&colspan<=10)target.colSpan=colspan;}
    if(['ql-align-center','ql-align-right','ql-align-justify'].some(c=>source.classList.contains(c)))target.style.textAlign=source.className.match(/ql-align-(center|right|justify)/)[1];
    for(const child of source.childNodes)target.append(convert(child));return target;
  }
  function highlight(article,onReference){
    // Même analyseur BV.scan que l’extension, citations réparties sur balises incluses.
    const blocks=[...article.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,td,th,blockquote')].filter(n=>!n.querySelector('p,li,td,th,blockquote'));
    for(const block of blocks){
      const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('a,button,pre,code')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
      let text='',segments=[],item;while(item=walker.nextNode()){segments.push({node:item,start:text.length,end:text.length+item.length});text+=item.data;}
      const matches=BV.scan(text);
      for(const match of matches.reverse()){
        const first=segments.find(s=>s.end>match.index),end=match.index+match.text.length,last=segments.find(s=>s.end>=end);
        if(!first||!last)continue;const range=document.createRange();range.setStart(first.node,match.index-first.start);range.setEnd(last.node,end-last.start);
        const anchor=node('a');anchor.className='td-reference';anchor.href=BVShare.passageURL(match.ref,'1MG1865');anchor.setAttribute('aria-label',match.text+' — lire avec BaibolintsikaVerse');anchor.append(range.extractContents());range.insertNode(anchor);
        anchor.onclick=e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onReference(match.ref,anchor);}};
      }
    }
  }
  function render(source,article,{toc,onReference}={}){
    if(typeof source!=='string'||source.length>8000000)throw Error('Fichier Taridalana trop volumineux (8 Mo maximum).');
    const html=/<(?:!doctype|html|p\b|h[1-6]\b|div\b|iframe\b|img\b|c[rgbpyc]\b|strong\b|b\b)/i.test(source)?source:source.split(/\n\s*\n/).map(p=>'<p>'+p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')+'</p>').join('');
    const parsed=new DOMParser().parseFromString(html,'text/html');article.replaceChildren(...[...parsed.body.childNodes].map(convert));
    // Quelques anciens titres contiennent uniquement le rond vert : les garder sans entrée vide au sommaire.
    const headings=[...article.querySelectorAll('h1,h2,h3')].filter(h=>h.textContent.replace(/[\s🟢🔺️🔻]/gu,'').length>2);
    if(toc){toc.replaceChildren(...headings.map((h,i)=>{h.id='td-section-'+i;const a=node('a',h.textContent);a.href='#'+h.id;a.onclick=e=>{e.preventDefault();h.scrollIntoView({behavior:'smooth',block:'start'});};return a;}));}
    if(onReference)highlight(article,onReference);
    return {headings:headings.length,references:article.querySelectorAll('.td-reference').length,videos:article.querySelectorAll('.td-video').length,images:article.querySelectorAll('img').length};
  }
  globalThis.BVTaridalanaRender={render};
})();
