(function(root){
  'use strict';
  const DAY=86400000,mod=(n,d)=>((n%d)+d)%d;
  const utcDate=day=>new Date(day*DAY+12*3600000);
  function civilDay(year,month,day){const date=new Date(0);date.setUTCFullYear(year,month-1,day);date.setUTCHours(12,0,0,0);return Math.floor(date.getTime()/DAY);}
  function localDay(date=new Date()){return civilDay(date.getFullYear(),date.getMonth()+1,date.getDate());}
  function jerusalemDay(date=new Date()){
    const parts=new Intl.DateTimeFormat('en-US-u-ca-gregory',{timeZone:'Asia/Jerusalem',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(date);
    const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return civilDay(+values.year,+values.month,+values.day);
  }
  function civilYear(value,era){
    const year=Number(value),max=era==='BC'?3925:2100;
    if(!Number.isInteger(year)||year<1||year>max)throw Error(`Saisissez une année de 1 à ${max} ${era==='BC'?'BC':'AD'}.`);
    return era==='BC'?1-year:year;
  }
  const yearLabel=year=>year<=0?`${1-year} BC`:`${year} AD`;
  const weekday=day=>mod(day+4,7);
  function civilParts(day){
    // Foundation's Gregorian Calendar used by the source widget has the 1582
    // cutover. Preserve its historical civil labels instead of JS ISO dates.
    if(day>=-141427){const d=utcDate(day);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()};}
    const c=day+2440588+32082,d=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*d/4),m=Math.floor((5*e+2)/153);
    return {year:d-4800+Math.floor(m/10),month:m+3-12*Math.floor(m/10),day:e-Math.floor((153*m+2)/5)+1};
  }
  function create(data){
    if(data.schema!==2||!Array.isArray(data.starts)||data.pericopeRows?.length!==68)throw Error('Les données de calendrier sont invalides.');
    const starts=new Map(data.starts),range=data.dssRange;
    const pericopes=new Map(data.pericopeRows.map(row=>[row.number,row]));
    function year(year){
      if(!Number.isInteger(year)||year<range[0]||year>range[1])throw Error('Année hors limites : 3925 BC à 2100 AD.');
      const start=starts.get(year)-1,next=starts.get(year+1)-1;
      return {year,am:year+3925,start,next,leap:next-start===371};
    }
    function dss(day){
      // Binary search also handles 1 BC (astronomical 0) without a civil year 0.
      let lo=0,hi=data.starts.length-1;
      while(lo<hi){const middle=Math.ceil((lo+hi)/2);if(data.starts[middle][1]-1<=day)lo=middle;else hi=middle-1;}
      const model=year(data.starts[lo][0]);
      if(day<model.start||day>=model.next)throw Error('Date hors de la période DSS disponible.');
      const offset=day-model.start;
      let value;
      if(offset>=364)value={kind:'leap',month:12,day:offset-363};
      else{
        const season=Math.floor(offset/91),within=offset%91;
        value=within===0?{kind:'tekufah',season,month:season*3,day:0}:
          {kind:'month',month:season*3+Math.floor((within-1)/30),day:(within-1)%30+1};
      }
      const feasts=value.kind==='month'?data.feasts[`${value.month}:${value.day}`]||[]:value.kind==='tekufah'?data.tekufah[value.season]:[];
      const events=feasts.map(event=>({...event}));
      if(weekday(day)===6)events.push({title:'Shabbat',accent:'sacred'});
      const label=value.kind==='month'?`${data.shortMonths[value.month]} ${value.day}`:value.kind==='tekufah'?`Tekufah ${data.shortMonths[value.month]}`:`Semaine intercalaire ${value.day}`;
      return {...value,ordinal:day,year:model.year,am:model.am,label,events};
    }
    function month(yearNumber,index){
      const model=year(yearNumber);
      if(!Number.isInteger(index)||index<0||index>=(model.leap?13:12))throw Error('Mois DSS indisponible.');
      const first=index===12?model.start+364:model.start+Math.floor(index/3)*91+1+(index%3)*30;
      const begin=index<12&&index%3===0?first-1:first;
      const end=index===12?model.next-1:first+29;
      return {index,year:yearNumber,am:model.am,title:index===12?'SEMAINE INTERCALAIRE':data.months[index],days:Array.from({length:end-begin+1},(_,i)=>dss(begin+i))};
    }
    // Port of PerikopaFLMEngine: the 68 universal rows stay independent of dates.
    // Only the feast date and cycle are calculated for the requested civil year.
    const plans=new Map(),roles=['T.T. / Leksiona','Epis. / Leksiona','Filz (III)','Toriteny','Epistily (III)','Filz (I)','Epistily (I)'];
    const colorNames={Maitso:'green',Volomparasy:'purple',Mena:'red',Fotsy:'white'};
    const nextSunday=day=>day+(weekday(day)===0?7:7-weekday(day));
    const previousSunday=day=>day-(weekday(day)===0?7:weekday(day));
    function plan(number){
      if(plans.has(number))return plans.get(number);
      const a=mod(number,19),b=Math.floor(number/100),c=mod(number,100);
      const d=mod(a*19+b-Math.floor(b/4)-Math.floor((b-Math.floor((b+8)/25)+1)/3)+15,30);
      const e=mod(Math.floor(c/4)*2+mod(b,4)*2+32-d-mod(c,4),7);
      const f=d+e-Math.floor((e*22+d*11+a)/451)*7+114;
      const easter=civilDay(number,Math.floor(f/31),mod(f,31)+1),christmas=civilDay(number,12,25);
      const value={easter,advent:previousSunday(christmas)-21,
        special:new Set([civilDay(number,1,1),civilDay(number,11,1),christmas,christmas+1,
          ...[-46,-3,-2,1,39,50].map(offset=>easter+offset)])};
      plans.set(number,value);return value;
    }
    function pericopeParts(day){
      const value=civilParts(day);
      if(!Number.isInteger(day)||value.year<1583||value.year>9999)throw Error('Date Péricope hors limites : 1583 à 9999 AD.');
      return value;
    }
    function universalEntry(tableNumber,cycle,{alternate=tableNumber===60,christmas=tableNumber===5}={}){
      const row=pericopes.get(tableNumber);
      if(!row||![1,2,3].includes(cycle))throw Error('Péricope ou cycle indisponible.');
      const source=row.references;
      let references;
      if(tableNumber===68)references=[source[2],source[1],source[1],source[0],source[3],'',''];
      else if(christmas)references=['Lio. 2:1-14','Heb. 1:1-5','Heb. 1:1-5','','Jao. 3:16','Jao. 3:16',''];
      else references=({1:[0,1,4,2,3,6,5],2:[0,3,6,4,5,2,1],3:[0,5,2,6,1,4,3]})[cycle].map(index=>source[index]||'');
      let collect=row.collect.replace(/\\r\\n|\\n|\\r/g,'\n').replace(/\\t/g,'\t');
      const variants=collect.split('|');if(alternate&&variants.length>1)collect=cycle===1?variants[0]:variants[1];
      return {tableNumber,title:row.title,subtitle:row.subtitle,color:colorNames[row.color]||'unknown',cycle,
        collect:collect.trim(),readings:references.map((reference,role)=>({role,title:roles[role],reference:reference.trim()})).filter(reading=>reading.reference)};
    }
    function countSundays(from,through){
      let count=0;
      for(let day=from;day<=through;day++)if(weekday(day)===0){
        const p=civilParts(day);
        if(!((p.month===12&&p.day===25)||(p.month===11&&p.day===1)||(p.month===1&&p.day===1)))count++;
      }
      return count;
    }
    function celebration(day){
      const p=pericopeParts(day),y=p.year,{easter,advent,special}=plan(y),november=civilDay(y,11,1);
      let from=advent,offset=0;
      if(day<advent){
        if(day<easter-63){from=civilDay(y,1,1);offset=7;}
        else if(day<november){from=easter-63;offset=14;}
        else{from=november;offset=countSundays(easter,previousSunday(november))+22;}
      }else if(day>civilDay(y,12,25)){from=civilDay(y,12,26);offset=5;}
      let number=countSundays(from,day)+offset,alternate=false,christmas=false;
      if(day===civilDay(y,1,1))number=7;
      else if(day===civilDay(y,12,25)){number=5;christmas=true;}
      else if(day===civilDay(y,12,26)){number=60;alternate=true;}
      else if(day===easter-46)number=68;
      else if(day===easter-3)number=61;
      else if(day===easter-2)number=62;
      else if(day===easter+1)number=63;
      else if(day===easter+39)number=64;
      else if(day===easter+50)number=65;
      else if(day===november)number=67;
      else if(day===nextSunday(november))number=66;
      else if(number===5&&p.month===12&&p.day>25){number=weekday(day)===0?6:60;alternate=true;}
      const liturgicalYear=day<advent?y-1:y,cycle=mod(liturgicalYear-2021,3)+1;
      return {ordinal:day,...universalEntry(number,cycle,{alternate,christmas}),isSpecialDay:special.has(day)};
    }
    function upcoming(day=localDay()){
      const p=pericopeParts(day),sunday=nextSunday(day);
      if(weekday(day)===0||plan(p.year).special.has(day))return celebration(day);
      for(let candidate=day+1;candidate<sunday;candidate++){
        const year=civilParts(candidate).year;
        if(plan(year).special.has(candidate))return celebration(candidate);
      }
      return celebration(sunday);
    }
    function adjacent(day,direction){
      if(direction!==-1&&direction!==1)throw Error('Direction de navigation invalide.');
      for(let candidate=day+direction;Math.abs(candidate-day)<=7;candidate+=direction){
        const p=civilParts(candidate);
        if(p.year<1583||p.year>9999)return null;
        if(weekday(candidate)===0||plan(p.year).special.has(candidate))return celebration(candidate);
      }
      return null;
    }
    function reading(reference,bible=root.BV){
      if(!reference)return null;
      const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f.\s’']/g,'').toLowerCase();
      const match=reference.match(/^(.+?)\s+(\d.*)$/);
      if(!match)return bible.parse(reference);
      const found=Object.entries(data.pericopeBookAliases||{}).find(([alias])=>normalize(alias)===normalize(match[1]));
      return bible.parse(found?bible.books[found[1]-1].mg+' '+match[2]:reference);
    }
    return {year,dss,month,upcoming,celebration,adjacent,universalEntry,reading,data};
  }
  root.BVCalendar={create,civilDay,localDay,jerusalemDay,civilYear,yearLabel,weekday,utcDate,civilParts};
})(globalThis);
