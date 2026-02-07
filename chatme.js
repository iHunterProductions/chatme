// chatme.js - Full Multi‑Room Chat.Me
(() => {
  const channels = ["gen1", "gen2", "gen3"];
  let n, cid, ably, lastUser = null, typingUsers = {}, typingTimeout, currentChannel = "gen1", channelObjs = {};

  // Create main UI
  const w = document.createElement("div");
  w.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:#141414;color:#fff;font-family:sans-serif;z-index:999999;display:flex;flex-direction:column";
  
  const hbar = document.createElement("div");
  hbar.style = "padding:12px;border-bottom:1px solid #333;display:flex;align-items:center;position:fixed;top:0;width:100%;z-index:1000;background:#141414;box-sizing:border-box";
  
  const menuBtn = document.createElement("span");
  menuBtn.textContent = "☰";
  menuBtn.style = "cursor:pointer;font-size:20px;margin-right:12px";
  hbar.appendChild(menuBtn);
  
  const title = document.createElement("div");
  title.innerHTML = '<b style="font-size:17px">Chat.Me</b><span style="margin-left:14px;font-size:11px;color:#888">an iHunter Production</span>';
  hbar.appendChild(title);

  const x = document.createElement("span");
  x.textContent = "✕";
  x.style = "cursor:pointer;font-weight:bold;font-size:16px;position:absolute;top:12px;right:12px";
  hbar.appendChild(x);

  const sidebar = document.createElement("div");
  sidebar.style = "width:0;transition:width 0.3s;overflow:hidden;background:#1a1a1a;display:flex;flex-direction:column;position:fixed;top:48px;bottom:0;left:0;z-index:900";
  const sidebarHeader = document.createElement("div");
  sidebarHeader.textContent = "Channels";
  sidebarHeader.style = "padding:12px;border-bottom:1px solid #333;font-weight:bold;font-size:14px";
  sidebar.appendChild(sidebarHeader);
  const sidebarChannels = document.createElement("div");
  sidebar.appendChild(sidebarChannels);

  const chatContainer = document.createElement("div");
  chatContainer.style = "flex:1;margin-top:48px;transition:margin-left 0.3s;display:flex;flex-direction:column;height:calc(100vh - 48px)";
  const u = document.createElement("div"); u.style = "font-size:12px;padding:4px 12px;border-bottom:1px solid #333;color:#aaa";
  const typing = document.createElement("div"); typing.style = "font-size:11px;padding:2px 12px;color:#777;display:none;border-bottom:1px solid #333";
  const m = document.createElement("div"); m.style = "flex:1;overflow:auto;padding:12px;border-bottom:1px solid #333";
  const inputContainer = document.createElement("div"); inputContainer.style = "display:flex;flex-direction:column";
  const i = document.createElement("textarea"); i.placeholder = "Type a message";
  i.style = "border:none;padding:8px;width:100%;outline:none;background:#111;color:#fff;resize:none;overflow:auto;min-height:30px;max-height:90px;border-radius:0;margin-bottom:4px";
  inputContainer.appendChild(i);
  chatContainer.append(u, typing, m, inputContainer);
  w.append(hbar, chatContainer);
  w.insertBefore(sidebar, w.firstChild);
  document.body.appendChild(w);

  const ask = () => new Promise(r => {
    let name = prompt("Enter your name:");
    if (!name) return r(null);
    const tmp = new Ably.Realtime({key:"Kn7TPA.YO3QmA:swcee7vl_UY4zl338XXWvvQ1hwKGwywrljb8ZIJPuoQ"});
    tmp.channels.get("chatme-global").presence.get((_, p) => {
      let taken = p.some(x => x.data?.name?.toLowerCase() === name.toLowerCase());
      tmp.close();
      taken ? (alert("Username in use"), r(ask())) : r(name);
    });
  });

  ask().then(name => {
    if (!name) return;
    n = name;
    cid = n + "-" + Math.random().toString(36).slice(2);
    ably = new Ably.Realtime({key:"Kn7TPA.YO3QmA:swcee7vl_UY4zl338XXWvvQ1hwKGwywrljb8ZIJPuoQ", clientId:cid});

    const handleMsg = msg => {
      let atBottom = m.scrollTop + m.clientHeight >= m.scrollHeight - 20;
      if (lastUser !== msg.data.u) {
        let wrap = document.createElement("div"); wrap.style = "margin-bottom:8px";
        let bubble = document.createElement("div"); bubble.style = "background:#1a1a1a;border-radius:10px;padding:8px 10px;max-width:360px;overflow:auto";
        bubble.innerHTML = `<b>${msg.data.u}</b>: ${msg.data.t}`;
        wrap.appendChild(bubble); m.appendChild(wrap);
      } else {
        let d = document.createElement("div"); d.textContent = msg.data.t; d.style.marginTop = "4px";
        m.lastChild.appendChild(d);
      }
      lastUser = msg.data.u;
      if (atBottom) m.scrollTop = m.scrollHeight;
    };

    const handleTyping = msg => {
      if (msg.data.u !== n) msg.data.t ? typingUsers[msg.data.u] = 1 : delete typingUsers[msg.data.u];
      else typingUsers[n] = msg.data.t ? 1 : 0;
      let names = Object.keys(typingUsers).filter(u => typingUsers[u]);
      typing.textContent = names.length ? names.join(", ") + " is typing…" : "";
      typing.style.display = names.length ? "block" : "none";
    };

    channels.forEach(chan => {
      let c = ably.channels.get("chatme-" + chan);
      channelObjs[chan] = c;
      c.subscribe("msg", handleMsg);
      c.subscribe("typing", handleTyping);
      c.presence.enter({name:n});
      c.presence.subscribe("enter", () => updateSidebar());
      c.presence.subscribe("leave", () => updateSidebar());
    });

    let activeRoom = channelObjs[currentChannel];
    function joinChannel(chan){ currentChannel=chan; activeRoom=channelObjs[chan]; m.innerHTML=""; updateSidebar(); }

    function updateSidebar(){
      sidebarChannels.innerHTML="";
      channels.forEach(chan=>{
        let d = document.createElement("div");
        d.style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #333";
        channelObjs[chan].presence.get((e,p)=>{d.textContent=chan.charAt(0).toUpperCase()+chan.slice(1)+" ("+p.length+")"});
        d.onclick=()=>{sidebar.style.width="0";chatContainer.style.marginLeft="0"; joinChannel(chan)};
        sidebarChannels.appendChild(d);
      });
    }

    joinChannel(currentChannel);
    menuBtn.onclick=()=>{sidebar.style.width=sidebar.style.width==="0px"?"200px":"0px";chatContainer.style.marginLeft=sidebar.style.width==="0px"?"0":"200px"};

    i.addEventListener("input",()=>{
      i.style.height="auto"; i.style.height=Math.min(i.scrollHeight,90)+"px";
      activeRoom.publish("typing",{u:n,t:true});
      clearTimeout(typingTimeout); typingTimeout=setTimeout(()=>activeRoom.publish("typing",{u:n,t:false}),1200)
    });

    i.addEventListener("keydown",e=>{
      if(e.key==="Enter"&&!e.shiftKey&&i.value.trim()){
        activeRoom.publish("msg",{u:n,t:i.value,time:new Date().toLocaleTimeString()});
        i.value=""; i.style.height="auto"; activeRoom.publish("typing",{u:n,t:false}); e.preventDefault()
      }
    });

    x.onclick=()=>{try{Object.values(channelObjs).forEach(c=>c.presence.leave());ably.close()}catch(e){}w.remove()}
  });
})();
