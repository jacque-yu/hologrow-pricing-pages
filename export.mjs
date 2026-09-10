import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
const out=new URL('./docs/',import.meta.url).pathname;
const origin='https://hologrow.github.io/hologrow-pricing-pages';
const source=process.env.HOLOGROW_SOURCE_DIR;
if(!source) throw new Error('Set HOLOGROW_SOURCE_DIR to the built Hologrow source directory.');
const base='/hologrow-pricing-pages';
const assets=new Set();
const routes={'/zh/pricing':'/pricing-zh.html','/zh/contact-sales':'/contact-sales-zh.html','/pricing':'/pricing-en.html','/contact-sales':'/contact-sales-en.html'};
function asset(v){if(!v)return v; if(v.startsWith('/_next/image?'))v=new URL(v,'http://localhost').searchParams.get('url');if(v.startsWith('/')&&!v.startsWith('//'))assets.add(v);return v;}
for(const [route,file] of Object.entries(routes)){
 const zh=route.startsWith('/zh/'); const html=await (await fetch('http://localhost:3092'+route,{headers:{'accept-language':zh?'zh':'en','user-agent':'Googlebot'}})).text();const $=load(html);
 $('script:not([type="application/ld+json"]),link[as="script"],link[as="image"],link[rel="preload"][as="fetch"]').remove();
 $('link[rel="stylesheet"],link[as="font"]').each((i,e)=>asset($(e).attr('href')));
 $('img').each((i,e)=>{const el=$(e);el.attr('src',asset(el.attr('src')));el.removeAttr('srcset').removeAttr('data-nimg');});
 $('[style]').each((i,e)=>{const el=$(e);el.attr('style',el.attr('style').replace(/url\(["']?([^"')]+)["']?\)/g,(m,u)=>'url("'+asset(u)+'")'));});
 $('a[href]').each((i,e)=>{const el=$(e),href=el.attr('href'); if(href.startsWith('/')){const u=new URL(href,'https://hologrow.ai');el.attr('href',routes[u.pathname]?routes[u.pathname]+u.search+u.hash:u.href);}});
 $('link[rel="canonical"]').attr('href',origin+file);
 $('meta[property="og:url"]').attr('content',origin+file);
 $('link[hreflang]').each((i,e)=>{const el=$(e);const u=new URL(el.attr('href')); if(routes[u.pathname])el.attr('href',origin+routes[u.pathname]);});
 $('script[type="application/ld+json"]').each((i,e)=>{const el=$(e);let text=el.text();for(const [r,f] of Object.entries(routes).sort((a,b)=>b[0].length-a[0].length))text=text.replaceAll('https://hologrow.ai'+r,origin+f);el.text(text);});
 // Use a native language selector in the standalone HTML.
 const lang=$('[aria-label="Choose language"]').length ? $('[aria-label="Choose language"]') : $('header div').filter((i,e)=>($(e).attr('class')||'').includes('w-[5.5rem]'));lang.replaceWith(`<select aria-label="${zh?'选择语言':'Choose language'}" class="static-language"><option value="${file.includes('contact-sales')?'/contact-sales-zh.html':'/pricing-zh.html'}" ${zh?'selected':''}>中文</option><option value="${file.includes('contact-sales')?'/contact-sales-en.html':'/pricing-en.html'}" ${zh?'':'selected'}>English</option></select>`);
 $('button').each((i,e)=>{const el=$(e);if(el.attr('type')==='submit')return;const t=el.text().trim();if(t==='产品'||t==='Products'||t==='Product')el.replaceWith(`<a href="https://hologrow.ai/${zh?'zh':''}">${t}</a>`);else if(t==='资源'||t==='Resources')el.replaceWith(`<a href="https://docs.hologrow.ai/">${t}</a>`);else if(el.attr('aria-label')==='Open menu')el.replaceWith(`<details class="static-menu"><summary aria-label="${zh?'打开菜单':'Open menu'}">☰</summary><nav><a href="${zh?'/pricing-zh.html':'/pricing-en.html'}">${zh?'定价':'Pricing'}</a><a href="${zh?'/contact-sales-zh.html':'/contact-sales-en.html'}">${zh?'联系销售':'Contact sales'}</a><a href="https://hologrow.ai/${zh?'zh':''}">${zh?'首页':'Home'}</a></nav></details>`);});
 const form=$('#contact-sales form');if(form.length){form.attr('data-static-form','');form.find('button[type="submit"]').attr('disabled','').text(zh?'静态展示，暂未开放提交':'Static preview — submissions unavailable');form.append(`<p role="note" style="margin-top:12px;font-size:13px;color:#53635b">${zh?'此页面为静态 HTML 展示，表单尚未连接收件服务。':'This static HTML page is not connected to a submission service.'}</p>`);}
 $('head').append('<style>.static-language{border:1px solid #dfe3df;background:white;border-radius:8px;padding:10px;color:#173e36}.static-menu{position:relative}.static-menu summary{cursor:pointer;padding:8px;list-style:none}.static-menu nav{position:absolute;right:0;top:100%;min-width:150px;z-index:99;background:white;border:1px solid #ddd;border-radius:10px;padding:12px}.static-menu nav a{display:block;padding:8px}</style>');
 $('body').append('<script>document.querySelectorAll(".static-language").forEach(e=>e.addEventListener("change",()=>location.href=e.value));document.querySelectorAll("[data-static-form]").forEach(e=>e.addEventListener("submit",x=>x.preventDefault()));</script>');
 $('a[href],link[href],img[src],option[value]').each((i,e)=>{const el=$(e);for(const attr of ['href','src','value']){const v=el.attr(attr);if(v?.startsWith('/')&&!v.startsWith('//'))el.attr(attr,base+v);}});
 $('[style]').each((i,e)=>{const el=$(e);el.attr('style',el.attr('style').replaceAll('url("/','url("'+base+'/'));});
 await fs.mkdir(path.dirname(out+file),{recursive:true});await fs.writeFile(out+file,$.html());
}
for(const url of assets){const target=out+decodeURIComponent(url.split('?')[0]);await fs.mkdir(path.dirname(target),{recursive:true});let data;if(url.startsWith('/_next/static/'))data=await fs.readFile(source+'/.next/static/'+decodeURIComponent(url.slice('/_next/static/'.length)));else data=await fs.readFile(source+'/public'+decodeURIComponent(url));await fs.writeFile(target,data);if(url.endsWith('.css')){for(const m of data.toString().matchAll(/url\(["']?([^"')]+)["']?\)/g)){if(m[1].startsWith('data:')||m[1].startsWith('http'))continue;const resolved=new URL(m[1], 'http://localhost'+url).pathname;assets.add(resolved);}}}
for(const url of assets){if(url.endsWith('.css')){const f=out+decodeURIComponent(url);let css=await fs.readFile(f,'utf8');css=css.replace(/url\((["']?)\/(?!\/)/g, 'url($1'+base+'/');await fs.writeFile(f,css);}}
await fs.writeFile(out+'/.nojekyll','');
await fs.copyFile(out+'/pricing-zh.html',out+'/index.html');
await fs.writeFile(out+'/robots.txt','User-agent: *\nAllow: /\n');
console.log('Exported four localized pages and '+assets.size+' local assets.');
