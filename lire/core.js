(function (root) {
  'use strict';
  const books = root.BV_BOOKS;
  const versions = ['1MG1865','KJV','KJF'];
  const editions = {'1MG1865':'BAIBOLY MALAGASY 1865',KJV:'KING JAMES VERSION 1769',KJF:'BIBLE KING JAMES EN FRANÇAIS'};
  const bookName = (book,version) => book[({KJV:'en',KJF:'fr','1MG1865':'mg'})[version]||'mg'];
  const allCounts = book => Array.from({length:Math.max(...Object.values(book.counts).map(c=>c.length))},(_,i)=>Math.max(...Object.values(book.counts).map(c=>c[i]||0)));
  const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const key = s => fold(s.normalize('NFKC')).replace(/[\s.\-’'\u200b\ufeff]/g, '');
  const exactKey = s => fold(s.normalize('NFKC').replace(/^([IVX]+)\./i,'$1 ')).replace(/[.\-’'\u200b\ufeff]/g,'').replace(/\s+/g,' ').trim();
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lookup = new Map();
  const exactLookup = new Map();
  const aliases = new Set();
  for (const book of books) for (const alias of book.aliases) {
    lookup.set(key(alias), book.id);
    exactLookup.set(exactKey(alias), book.id);
    aliases.add(alias);
    aliases.add(fold(alias));
    aliases.add(alias.normalize('NFD'));
    if (/^(III|II|I)(?=\s|[A-Z])/.test(alias)) aliases.add(alias.replace(/^(III|II|I)/,n=>({I:'Ⅰ',II:'Ⅱ',III:'Ⅲ'})[n]));
  }
  const space = '[\\s\\u200b\\ufeff]*';
  const namePattern = alias => {
    const prefix=alias.match(/^([123]|III|II|I|Ⅰ|Ⅱ|Ⅲ)(?=\s|[A-Z])/);
    const rest=prefix?alias.slice(prefix[0].length).trimStart():alias;
    const spelling=[...rest.normalize('NFC')].map(char=>char===char.normalize('NFD')?escape(char):`(?:${escape(char)}|${escape(char.normalize('NFD'))})`).join('');
    return (prefix?escape(prefix[0])+`\\.?${space}`:'')+spelling.replace(/ /g,space).replace(/['’]/g,"['’]");
  };
  const names = [...aliases].sort((a,b)=>b.length-a.length).map(namePattern).join('|');
  const digit = '[0-9０-９]';
  const dash = '[-‐‑‒–—―−﹣－]';
  const range = `(?:${space}${dash}${space}|\\s+(?:à|a|to|through)\\s+)`;
  const verseMarker = '(?:versets?|verses?|vv?\\.?)';
  const chapterMarker = '(?:chapitres?|chapters?|chap\\.?|ch\\.?)';
  // In a reference list, the numeral of the next book belongs to that book:
  // Zechariah 14:4–5; 1 Thessalonians 4:16–18 must not become "...; 1".
  const numberedNames=[...new Set([...aliases].filter(alias=>/^[123]/.test(alias)).map(namePattern))].join('|');
  const notNextBook=`(?!(?:${numberedNames})\\.?${space}(?:${digit}|${chapterMarker}))`;
  const number = `${notNextBook}${digit}{1,3}`, verse = `${number}[a-d]?`;
  const separator = `(?:${space}[:：∶.,．]${space}|${space}${verseMarker}${space})`;
  const endpointSeparator = `(?:${space}[:：∶,]${space}|[.．](?=${digit})|${space}${verseMarker}${space})`;
  // An adjacent dot can separate verses (Jn 3,16.18), but a sentence-ending
  // period followed by a space must not eat the next numbered book.
  const list = `(?:${space},${space}|[.．](?=${digit})|\\s+(?:et|and)\\s+)`;
  const verseList = `${verse}(?:${range}${verse})?(?:${list}${verse}(?:${range}${verse})?)*`;
  const following = '(?:[fs]{1,2}\\.?)?';
  const chapterVerses = `${number}${separator}${verse}(?:${range}(?:${number}${endpointSeparator})?${verse})?(?:${list}${verse}(?:${range}${verse})?)*${following}`;
  const section = `${space}(?:[;,]|et|and)${space}`;
  const suffix = `${chapterVerses}(?:${section}(?:${chapterVerses}|${verseList}${following}))*`;
  const chapterList = `${number}(?:${range}${number})?(?:${space}[;,]${space}${number}(?:${range}${number})?)*`;
  const body = `(?:${chapterMarker}${space})?(?:${suffix}|${verseList}${following}|${chapterList})`;
  // A colon introducing a quotation is punctuation. Only punctuation followed
  // by another number is a numeric continuation that must not be cut short.
  const continuation = `${space}(?:${dash}+|[:：∶,;]|[.．](?=${digit}))${space}(?:[:：∶.,]${space})*${notNextBook}${digit}`;
  const pattern = `(?<![\\p{L}\\p{N}\\p{M}])(${names})\\.?${space}(${body})(?![\\p{L}\\p{N}\\p{M}]|${continuation})`;
  const entry = new RegExp(`^(${names})\\.?${space}(${body})$`,'iu');
  const chapterWord = new RegExp(chapterMarker,'giu');
  function valid(ref, version) {
    const book = books[ref?.book-1];
    if (!book || !Array.isArray(ref.parts) || ref.parts.length > 180) return false;
    const counts = version ? book.counts[version] : allCounts(book);
    if(!counts)return false;
    return ref.parts.length > 0 && ref.parts.every(p=>Number.isInteger(p.chapter)&&p.chapter>0&&p.chapter<=counts.length&&Number.isInteger(p.from)&&Number.isInteger(p.to)&&p.from>=1&&p.to>=p.from&&p.to<=counts[p.chapter-1]);
  }
  function parse(text) {
    if (typeof text!=='string'||text.length>1000) return null;
    const match = text.trim().match(entry);
    if (!match) return null;
    // Keep the distinction between I Sa (1 Samuel) and Isa (Isaiah).
    const book = exactLookup.get(exactKey(match[1]))||lookup.get(key(match[1]));
    const explicitChapter=new RegExp(`^${chapterMarker}`,'iu').test(match[2]);
    let body = match[2].normalize('NFKC').replace(/[\u200b\ufeff]/g,'')
      .replace(/[‐‑‒–—―−﹣－]/g,'-').replace(/∶/g,':')
      .replace(/\s+(?:à|a|to|through)\s+/gi,'-').replace(/\s+(?:et|and)\s+/gi,',')
      .replace(chapterWord,'').replace(new RegExp(verseMarker,'giu'),':').replace(/\s/g,'');
    const counts=allCounts(books[book-1]);
    if(counts.length===1&&!explicitChapter&&!body.includes(':')&&(!/^1[.,]/.test(body)))body='1:'+body.replace(/;/g,',');
    if(!/[:.]/.test(body)&&(explicitChapter||/^\d+-/.test(body)))body=body.replace(/,/g,';');
    const parts=[];
    // In comma chapter/verse notation, dots are verse-list separators:
    // Jn 3,16.18. A comma before 4:1 in colon notation starts a new chapter.
    const commaNotation=/^\d+,/.test(body);
    const sections=body.split(commaNotation?/;/:/;|,(?=\d+[:.])/);
    let chapter,wholeChapter=false;
    for(const section of sections) {
      const chapters=section.match(/^(\d+)(?:-(\d+))?$/);
      if(chapters){
        const first=+chapters[1],last=+(chapters[2]||chapters[1]);
        if(chapter!==undefined&&!wholeChapter){parts.push({chapter:parts.at(-1).chapter,from:first,to:last});continue;}
        if(!first||last<first||last>counts.length)return null;
        if(chapter===undefined){chapter=first;wholeChapter=true;}
        for(let c=first;c<=last;c++)parts.push({chapter:c,from:1,to:counts[c-1]});
        continue;
      }
      const m = section.match(/^(\d+)[:.,](\d+)[a-d]?(?:-(?:(\d+)[:.,])?(\d+)[a-d]?)?((?:[,.]\d+[a-d]?(?:-\d+[a-d]?)?)*)([fs]{1,2}\.?)?$/i);
      if (!m) return null;
      const startChapter=+m[1];
      if (!startChapter || startChapter>counts.length) return null;
      if(chapter===undefined){chapter=startChapter;wholeChapter=!m[2];}
      const currentChapter=startChapter;
      const endChapter=+(m[3]||currentChapter), end=+(m[4]||m[2]);
      if (endChapter<currentChapter||endChapter>counts.length||(endChapter===currentChapter&&end<+m[2])) return null;
      for(let c=currentChapter;c<=endChapter;c++) parts.push({chapter:c,from:c===currentChapter?+m[2]:1,to:c===endChapter?end:counts[c-1]});
      if(m[5]) for(const s of m[5].slice(1).split(/[,.]/)) { const [from,to]=s.replace(/[a-d]/gi,'').split('-').map(Number); parts.push({chapter:endChapter,from,to:to||from}); }
      if(m[6]){const last=parts.at(-1);last.to=m[6].replace('.','').length===1?last.to+1:counts[last.chapter-1];}
    }
    const ref={book,chapter,parts,wholeChapter};
    return valid(ref)?ref:null;
  }
  function scan(text) {
    const matches=[];
    for(const m of text.matchAll(new RegExp(pattern,'giu'))) {
      if(/(?<![\p{L}\p{N}:])\d+[ \t]+$/u.test(text.slice(Math.max(0,m.index-12),m.index)))continue;
      const ref=parse(m[0]);
      if(ref) matches.push({index:m.index,text:m[0],ref});
    }
    return matches;
  }
  function label(ref,version='1MG1865') {
    const name=bookName(books[ref.book-1],version);
    if(ref.wholeChapter) return name+' '+ref.parts.map(p=>p.chapter).join(', ');
    return name+' '+ref.parts.map(p=>`${p.chapter}:${p.from}${p.to!==p.from?'-'+p.to:''}`).join('; ');
  }
  function glob(word,pattern) {
    let w=0,p=0,star=-1,mark=0;
    while(w<word.length) {
      if(pattern[p]==='?'||pattern[p]===word[w]) {w++;p++;}
      else if(pattern[p]==='*') {star=p++;mark=w;}
      else if(star!==-1) {p=star+1;w=++mark;}
      else return false;
    }
    while(pattern[p]==='*') p++;
    return p===pattern.length;
  }
  function compileQuery(query) {
    if(typeof query!=='string'||query.length>240)throw Error('Limitez la recherche à 240 caractères.');
    const tokens=[],terms=[];
    const fail=detail=>{throw Error('Recherche invalide : '+detail);};
    const symbols={'&':'AND','|':'OR','^':'XOR','!':'NOT'};
    for(let i=0;i<query.length;){
      if(/\s/u.test(query[i])){i++;continue;}
      const c=query[i];
      if(c==='('||c===')'){tokens.push({kind:c});i++;continue;}
      if(symbols[c]){tokens.push({kind:symbols[c]});i++;if(c!=='!'&&query[i]===c)i++;continue;}
      let value='',phrase=false;
      const close={'"':'"','“':'”','«':'»'}[c];
      if(close){
        phrase=true;const start=++i;
        while(i<query.length&&query[i]!==close)i++;
        if(i===query.length)fail('fermez les guillemets de l’expression.');
        value=query.slice(start,i++).trim();
      }else{
        const start=i;
        while(i<query.length&&!/[\s()&|^!"“«]/u.test(query[i]))i++;
        value=query.slice(start,i);
        const keyword=value.toUpperCase();
        if(['AND','OR','XOR','NOT'].includes(keyword)){tokens.push({kind:keyword});continue;}
      }
      if(!/[\p{L}\p{N}]/u.test(value))fail('saisissez un mot ou une expression entre les opérateurs.');
      const term={value:fold(value),phrase,id:terms.length};
      terms.push(term);tokens.push({kind:'TERM',term});
      if(terms.length>32)fail('limitez la recherche à 32 mots ou expressions.');
    }
    if(!tokens.length)throw Error('Saisissez au moins un mot à rechercher.');
    let cursor=0;
    const peek=()=>tokens[cursor]?.kind;
    const binary=(op,left,right)=>({op,left,right});
    function primary(depth=0){
      if(depth>32)fail('réduisez le nombre de parenthèses ou de négations imbriquées.');
      if(peek()==='NOT'){cursor++;return {op:'NOT',child:primary(depth+1)};}
      if(peek()==='('){
        cursor++;const node=or(depth+1);
        if(peek()!==')')fail('fermez la parenthèse.');
        cursor++;return node;
      }
      if(peek()!=='TERM')fail('un mot est attendu'+(peek()?' avant '+peek():' après le dernier opérateur')+'.');
      return {op:'TERM',term:tokens[cursor++].term};
    }
    function and(depth){
      let node=primary(depth);
      while(peek()==='AND'||['TERM','NOT','('].includes(peek())){
        if(peek()==='AND')cursor++;
        node=binary('AND',node,primary(depth));
      }
      return node;
    }
    function xor(depth){let node=and(depth);while(peek()==='XOR'){cursor++;node=binary('XOR',node,and(depth));}return node;}
    function or(depth){let node=xor(depth);while(peek()==='OR'){cursor++;node=binary('OR',node,xor(depth));}return node;}
    const tree=or(0);
    if(cursor!==tokens.length)fail('parenthèse fermante sans ouverture.');
    const positives=new Set();
    function positive(node,negated=false){
      if(node.op==='TERM'){if(!negated)positives.add(node.term);return;}
      if(node.op==='NOT'){positive(node.child,!negated);return;}
      positive(node.left,negated);positive(node.right,negated);
    }
    positive(tree);
    const context=text=>{const normalized=fold(text);return {normalized,words:[...normalized.matchAll(/[\p{L}\p{N}]+/gu)],memo:new Map()};};
    const wordMatches=(word,term)=>/[*?]/.test(term.value)?glob(word,term.value):word===term.value;
    function termMatches(term,c){
      if(!c.memo.has(term.id))c.memo.set(term.id,term.phrase?c.normalized.includes(term.value):c.words.some(w=>wordMatches(w[0],term)));
      return c.memo.get(term.id);
    }
    function evaluate(node,c){
      if(node.op==='TERM')return termMatches(node.term,c);
      if(node.op==='NOT')return !evaluate(node.child,c);
      if(node.op==='AND')return evaluate(node.left,c)&&evaluate(node.right,c);
      if(node.op==='OR')return evaluate(node.left,c)||evaluate(node.right,c);
      return evaluate(node.left,c)!==evaluate(node.right,c);
    }
    function ranges(text){
      const c=context(text),folded=[];
      for(const term of positives){
        if(term.phrase){
          let start=0,index;
          while((index=c.normalized.indexOf(term.value,start))!==-1){folded.push([index,index+term.value.length]);start=index+1;}
        }else for(const word of c.words)if(wordMatches(word[0],term))folded.push([word.index,word.index+word[0].length]);
      }
      if(!folded.length)return [];
      // Preserve original UTF-16 positions, including accents and combining marks.
      // No normalized text is ever substituted into the Bible's displayed wording.
      const starts=[],ends=[];let offset=0;
      for(const char of String(text)){
        const part=fold(char);
        for(let i=0;i<part.length;i++){starts.push(offset);ends.push(offset+char.length);}
        if(!part&&ends.length)ends[ends.length-1]=offset+char.length;
        offset+=char.length;
      }
      const ordered=folded.map(([from,to])=>[starts[from],ends[to-1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),merged=[];
      for(const range of ordered){
        const last=merged.at(-1);
        if(last&&range[0]<=last[1])last[1]=Math.max(last[1],range[1]);else merged.push(range);
      }
      return merged;
    }
    return {matches:text=>evaluate(tree,context(text)),ranges};
  }
  function queryPredicate(query) {return compileQuery(query).matches;}
  root.BV={books,versions,editions,bookName,fold,parse,scan,valid,label,queryPredicate,compileQuery};
})(globalThis);
