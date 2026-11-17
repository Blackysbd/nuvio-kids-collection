'use strict';
// Node 20+, no third-party packages. Curated catalog lookup via TMDB, not streaming.
const http = require('node:http');
const fs = require('node:fs');
const { URL } = require('node:url');
const titles = JSON.parse(fs.readFileSync(__dirname + '/titles.json', 'utf8'));
const PORT = Number(process.env.PORT || 3000);
const KEY = process.env.TMDB_API_KEY || '';
const TOKEN = process.env.TMDB_READ_ACCESS_TOKEN || '';
const ID = 'org.personal.nuvio.kids.collection';
const categories = Object.entries(titles);
const catalogs = categories.flatMap(([slug, section]) => ['movie','series'].filter(t => section[t === 'movie' ? 'movies' : 'series'].length).map(type => ({type,id:`kids-${type}-${slug}`,name:`${section.name} — ${type === 'movie' ? 'Movies' : 'Shows'}`,extra:[{name:'skip',isRequired:false}],isSearchOnly:true})));
const manifest = {id:ID,version:'1.0.0',name:'My Kids Collection',description:'Eight curated kids catalogues for Nuvio. Discovery and metadata only; no streams.',resources:['catalog','meta'],types:['movie','series'],catalogs};
const cache = new Map();
const ttl = 24*60*60*1000;
const norm = s => (s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
async function tmdb(path, params={}) {
 if (!KEY && !TOKEN) throw new Error('Set TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN on Render');
 const u = new URL('https://api.themoviedb.org/3'+path);
 for (const [k,v] of Object.entries(params)) u.searchParams.set(k,String(v));
 if (KEY) u.searchParams.set('api_key',KEY);
 const r=await fetch(u,{headers:TOKEN?{Authorization:'Bearer '+TOKEN}:undefined,signal:AbortSignal.timeout(12000)});
 if (!r.ok) throw new Error('TMDB HTTP '+r.status);
 return r.json();
}
async function titleToMeta(name,type){
 const ck=`${type}|${name}`; const c=cache.get(ck); if(c&&c.expires>Date.now())return c.value;
 const q=await tmdb(`/search/${type==='movie'?'movie':'tv'}`,{query:name,language:'en-GB',include_adult:'false'});
 const exact=(q.results||[]).filter(x=>norm(x.title||x.name)===norm(name));
 const found=exact.sort((a,b)=>(b.popularity||0)-(a.popularity||0))[0];
 if(!found){cache.set(ck,{expires:Date.now()+ttl,value:null});return null;}
 const id=`tmdb:${found.id}`;
 const m={id,type,name:found.title||found.name,poster:found.poster_path?'https://image.tmdb.org/t/p/w500'+found.poster_path:undefined,background:found.backdrop_path?'https://image.tmdb.org/t/p/w1280'+found.backdrop_path:undefined,description:found.overview||'',releaseInfo:(found.release_date||found.first_air_date||'').slice(0,4)};
 cache.set(ck,{expires:Date.now()+ttl,value:m});return m;
}
async function catalog(type,slug,skip){
 const set=titles[slug]; if(!set)return [];
 const items=set[type==='movie'?'movies':'series'];
 const page=items.slice(skip,skip+20);
 const matched=await Promise.all(page.map(n=>titleToMeta(n,type).catch(()=>null)));
 return matched.filter(Boolean);
}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=300'});res.end(JSON.stringify(data));};
const html=(res,text)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(text);};
const safeSegment=s=>/^[a-z0-9-]+$/.test(s);
const server=http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET')return json(res,405,{error:'GET only'});
  const u=new URL(req.url,'http://localhost');const path=decodeURIComponent(u.pathname);
  if(path==='/health')return json(res,200,{status:'ok',tmdbConfigured:!!(KEY||TOKEN),folders:categories.length});
  if(path==='/manifest.json')return json(res,200,manifest);
  if(path==='/collections.json'){
   const origin=(process.env.PUBLIC_BASE_URL||`https://${req.headers.host||'localhost'}`).replace(/\/$/,'');
   const pack=[{id:'collection-my-kids-eight',title:'Kids',pinToTop:true,showAllTab:false,viewMode:'TABBED_GRID',focusGlowEnabled:false,folders:categories.map(([slug,section])=>({id:'folder-my-kids-'+slug,title:section.name,tileShape:'LANDSCAPE',hideTitle:false,focusGifEnabled:false,catalogSources:['movie','series'].filter(t=>section[t==='movie'?'movies':'series'].length).map(t=>({addonId:ID,catalogId:`kids-${t}-${slug}`,type:t}))}))}];
   return json(res,200,pack);
  }
  const cat=path.match(/^\/catalog\/(movie|series)\/([^/]+)(?:\/([^/]+))?\.json$/);
  if(cat){let [,type,cid,extras]=cat;const match=cid.match(/^kids-(movie|series)-([a-z0-9-]+)$/);if(!match||match[1]!==type||!titles[match[2]])return json(res,200,{metas:[]});const skip=Math.min(Math.max(0,Number(u.searchParams.get('skip') || (extras||'').match(/(?:^|&)skip=(\d+)/)?.[1] || 0)||0),1000);return json(res,200,{metas:await catalog(type,match[2],skip)});}
  const meta=path.match(/^\/meta\/(movie|series)\/tmdb:(\d+)\.json$/);
  if(meta){const [,type,id]=meta;const data=await tmdb(`/${type==='movie'?'movie':'tv'}/${id}`,{language:'en-GB'});return json(res,200,{meta:{id:'tmdb:'+id,type,name:data.title||data.name,poster:data.poster_path?'https://image.tmdb.org/t/p/w500'+data.poster_path:undefined,background:data.backdrop_path?'https://image.tmdb.org/t/p/w1280'+data.backdrop_path:undefined,description:data.overview||'',releaseInfo:(data.release_date||data.first_air_date||'').slice(0,4)}});}
  if(path==='/')return html(res,'<h1>My Kids Collection</h1><p>Install <a href="/manifest.json">addon manifest</a> first, then import <a href="/collections.json">collections JSON</a> via URL.</p><p>TMDB configured: '+!!(KEY||TOKEN)+'</p>');
  return json(res,404,{error:'Not found'});
 }catch(e){console.error(e);return json(res,503,{error:e.message});}
});
if(require.main===module)server.listen(PORT,'0.0.0.0',()=>console.log('Listening on '+PORT));
module.exports={server,manifest,titles};
