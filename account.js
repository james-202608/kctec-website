(function(){
  const style=document.createElement('link');style.rel='stylesheet';style.href=(document.currentScript?.src||'').replace(/account\.js(?:\?.*)?$/,'account.css');document.head.appendChild(style);
  const KEY='kctec-member-profile';
  const isKo=document.documentElement.lang.toLowerCase().startsWith('ko');
  const copy=isKo?{
    title:'회원 등록 · 로그인',lead:'뉴스를 저장하려면 사용자 이름을 등록해 주세요.',name:'사용자 이름',email:'이메일',submit:'등록하고 저장',note:'저장한 뉴스는 이 기기의 사용자 이름으로 다시 확인할 수 있습니다.',close:'닫기'
  }:{
    title:'注册或登录',lead:'收藏新闻前，请先设置您的用户名。',name:'用户名',email:'电子邮箱',submit:'注册并收藏',note:'收藏内容将保存在此设备，并可通过用户名查询。',close:'关闭'
  };
  let pending=null;
  function profile(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
  function safe(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function updateBadge(){
    document.querySelectorAll('.member-badge').forEach(x=>x.remove());
    const p=profile();if(!p)return;
    const host=document.querySelector('.site-locale,.locale-switch');if(!host)return;
    host.insertAdjacentHTML('beforebegin',`<button class="member-badge" type="button" title="${safe(p.email)}"><i>${safe(p.username.slice(0,1).toUpperCase())}</i><span>${safe(p.username)}</span></button>`);
  }
  document.body.insertAdjacentHTML('beforeend',`<div class="account-modal" id="accountModal" aria-hidden="true"><div class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="accountTitle"><button class="account-close" type="button" aria-label="${copy.close}">×</button><span>MEMBER · 회원</span><h2 id="accountTitle">${copy.title}</h2><p>${copy.lead}</p><form><label>${copy.name}<input name="username" autocomplete="username" minlength="2" maxlength="24" required></label><label>${copy.email}<input name="email" type="email" autocomplete="email" required></label><button class="account-submit" type="submit">${copy.submit}</button><small>${copy.note}</small></form></div></div>`);
  const modal=document.getElementById('accountModal');
  const close=()=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true');pending=null};
  modal.querySelector('.account-close').onclick=close;
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  modal.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    const data=new FormData(e.currentTarget),username=data.get('username').trim(),email=data.get('email').trim();
    if(username.length<2||!email)return;
    localStorage.setItem(KEY,JSON.stringify({username,email,createdAt:new Date().toISOString()}));
    updateBadge();const next=pending;close();if(next)next();
  };
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
  window.KCTEC_ACCOUNT={profile,require(callback){if(profile()){callback&&callback();return true}pending=callback||null;modal.classList.add('open');modal.setAttribute('aria-hidden','false');setTimeout(()=>modal.querySelector('[name="username"]').focus(),30);return false}};
  const marketFooter=document.querySelector('.market-footer .shell');
  if(marketFooter)marketFooter.insertAdjacentHTML('beforeend','<div><b>연락처 · 联系电话</b><p><a href="tel:+821027003489">+82 010-2700-3489</a></p></div>');
  const explainer=document.querySelector('.preference-explainer');
  if(explainer){const rows=explainer.querySelectorAll('div>span');if(rows[1])rows[1].innerHTML='<strong>☆ 저장 · 收藏</strong>처음 저장할 때만 사용자 이름 등록 화면이 표시됩니다。';if(rows[2])rows[2].remove()}
  updateBadge();
})();
