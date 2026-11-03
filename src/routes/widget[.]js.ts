import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS } from "@/lib/cors";

// GET /widget.js -> self-contained embeddable chat bubble for GGUF model widgets.
// Usage: <script src=".../widget.js" data-widget-id="UUID" defer></script>
const SCRIPT = String.raw`(function(){
  var s=document.currentScript||document.querySelector('script[data-widget-id]');
  if(!s)return;var id=s.getAttribute('data-widget-id');if(!id)return;
  var api=new URL(s.src).origin+'/api/public/widget/'+id;
  fetch(api).then(function(r){return r.ok?r.json():null}).then(function(cfg){
    if(!cfg)return;var c=cfg.primary_color||'#2563eb',dark=cfg.theme==='dark';
    var bg=dark?'#111827':'#ffffff',fg=dark?'#f9fafb':'#111827',mut=dark?'#1f2937':'#f3f4f6';
    var root=document.createElement('div');root.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:system-ui,sans-serif';
    var btn=document.createElement('button');btn.setAttribute('aria-label','Open chat');btn.innerHTML='&#128172;';
    btn.style.cssText='width:56px;height:56px;border-radius:50%;border:0;background:'+c+';color:#fff;font-size:24px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)';
    var box=document.createElement('div');box.style.cssText='display:none;flex-direction:column;width:min(360px,calc(100vw - 40px));height:min(520px,calc(100vh - 110px));background:'+bg+';color:'+fg+';border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);overflow:hidden;margin-bottom:12px';
    var head=document.createElement('div');head.textContent=cfg.title||'AI Assistant';head.style.cssText='padding:14px 16px;background:'+c+';color:#fff;font-weight:600';
    var list=document.createElement('div');list.style.cssText='flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:14px;line-height:1.45';
    var form=document.createElement('form');form.style.cssText='display:flex;gap:6px;padding:10px;border-top:1px solid '+mut;
    var inp=document.createElement('input');inp.placeholder='Type a message...';inp.style.cssText='flex:1;padding:9px 11px;border-radius:8px;border:1px solid '+mut+';background:'+mut+';color:'+fg+';font-size:14px;outline:none';
    var send=document.createElement('button');send.type='submit';send.textContent='Send';send.style.cssText='padding:0 14px;border:0;border-radius:8px;background:'+c+';color:#fff;cursor:pointer';
    form.appendChild(inp);form.appendChild(send);box.appendChild(head);box.appendChild(list);box.appendChild(form);
    root.appendChild(box);root.appendChild(btn);document.body.appendChild(root);
    var msgs=[];
    function bubble(role,text){var d=document.createElement('div');d.textContent=text;
      d.style.cssText='max-width:85%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word;'+(role==='user'?'align-self:flex-end;background:'+c+';color:#fff':'align-self:flex-start;background:'+mut+';color:'+fg);
      list.appendChild(d);list.scrollTop=list.scrollHeight;return d;}
    if(cfg.greeting)bubble('assistant',cfg.greeting);
    if(!cfg.online)bubble('assistant','(This assistant is offline right now.)');
    btn.onclick=function(){var o=box.style.display==='flex';box.style.display=o?'none':'flex';btn.innerHTML=o?'&#128172;':'&#10005;';if(!o)inp.focus();};
    form.onsubmit=function(e){e.preventDefault();var t=inp.value.trim();if(!t)return;inp.value='';send.disabled=true;
      bubble('user',t);msgs.push({role:'user',content:t});var out=bubble('assistant','...'),acc='';
      fetch(api+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:msgs.slice(-20)})}).then(function(r){
        if(!r.ok)return r.json().then(function(j){throw new Error(j.message||'Error '+r.status)});
        var rd=r.body.getReader(),dec=new TextDecoder(),buf='';
        function pump(){return rd.read().then(function(x){if(x.done)return;buf+=dec.decode(x.value,{stream:true});
          var lines=buf.split('\n');buf=lines.pop();lines.forEach(function(l){l=l.trim();if(l.indexOf('data:')!==0)return;var p=l.slice(5).trim();if(p==='[DONE]')return;
            try{var d=JSON.parse(p).choices[0].delta.content;if(d){acc+=d;out.textContent=acc;list.scrollTop=list.scrollHeight;}}catch(_){}});return pump();});}
        return pump();
      }).then(function(){if(!acc)out.textContent='(no reply)';msgs.push({role:'assistant',content:acc});})
      .catch(function(err){out.textContent='Sorry: '+err.message;}).finally(function(){send.disabled=false;});};
  }).catch(function(){});
})();`;

export const Route = createFileRoute("/widget.js")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SCRIPT, {
          headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=300", ...CORS_HEADERS },
        }),
    },
  },
});
