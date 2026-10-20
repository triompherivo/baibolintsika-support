(() => {
  'use strict';
  const id=new URL(location.href).searchParams.get('v');if(!/^[A-Za-z0-9_-]{6,20}$/.test(id||'')){document.body.textContent='Cette vidéo n’est pas disponible.';return;}
  const frame=document.createElement('iframe');frame.title='Vidéo YouTube du Taridalana';frame.src='https://www.youtube-nocookie.com/embed/'+id+'?'+new URLSearchParams({rel:0,origin:location.origin});frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;document.body.append(frame);
})();
