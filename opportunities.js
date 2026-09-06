window.KCTEC_OPPORTUNITIES=[
 {id:'KR-CN-2026-001',from:'KR',sector:'新材料',title:'韩国高科技防潮材料进入中国',need:'寻找中国电子、建筑材料代理商及项目合作方',scale:'区域代理与项目供应',stage:'合作方征集中',tags:['PCB材料','防潮技术','中国渠道']},
 {id:'KR-CN-2026-002',from:'KR',sector:'健康美丽',title:'韩国化妆品与医疗美容项目合作',need:'寻找中国品牌运营、渠道销售及合规服务伙伴',scale:'品牌与渠道合作',stage:'资料审核中',tags:['化妆品','医疗美容','品牌代理']},
 {id:'KR-CN-2026-003',from:'KR',sector:'食品消费',title:'韩国宠物食品寻找中国经销网络',need:'寻找具备进口、仓配及电商渠道的中国合作方',scale:'全国及重点城市',stage:'开放报名',tags:['宠物食品','进口','电商']},
 {id:'CN-KR-2026-004',from:'CN',sector:'工程建设',title:'中国LED工程企业寻找韩国合作方',need:'寻找韩国工程承包、城市亮化与产品认证伙伴',scale:'项目制合作',stage:'初步洽谈',tags:['LED','工程','韩国市场']},
 {id:'CN-KR-2026-005',from:'CN',sector:'能源投资',title:'中国新能源项目对接韩国技术与资本',need:'寻找储能、材料、设备及产业投资合作方',scale:'联合投资与技术合作',stage:'需求确认中',tags:['新能源','投资','储能']},
 {id:'CN-KR-2026-006',from:'CN',sector:'制造能力',title:'中国电缆与工业制造能力进入韩国供应链',need:'寻找韩国采购商、认证机构和长期供应链伙伴',scale:'批量采购与OEM',stage:'合作方征集中',tags:['电缆','OEM','供应链']}
];
(function(){
 const host=document.getElementById('opportunityList');if(!host)return;let side='ALL';
 function draw(){const rows=KCTEC_OPPORTUNITIES.filter(x=>side==='ALL'||x.from===side);host.innerHTML=rows.map(x=>`<article class="opp-card"><div class="opp-meta"><b>${x.id}</b><span>${x.stage}</span></div><small>${x.from==='KR'?'韩国 → 中国':'中国 → 韩国'} · ${x.sector}</small><h2>${x.title}</h2><p><strong>合作需求</strong>${x.need}</p><p><strong>项目规模</strong>${x.scale}</p><div>${x.tags.map(t=>`<em>${t}</em>`).join('')}</div><button data-interest="${x.id}">我对这个项目感兴趣 <span>관심 프로젝트 ↗</span></button></article>`).join('')}
 document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{side=b.dataset.side;document.querySelectorAll('[data-side]').forEach(x=>x.classList.toggle('active',x===b));draw()});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-interest]');if(!b)return;KCTEC_ACCOUNT.require(()=>{localStorage.setItem(`kctec-opportunity-${b.dataset.interest}`,'1');b.innerHTML='已提交兴趣 ✓ <span>센터에서 연락드리겠습니다</span>';b.classList.add('sent')})});draw();
})();
