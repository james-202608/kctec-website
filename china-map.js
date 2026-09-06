(function(){
  const groups={
    northeast:{ko:'동북',cn:'东北',provinces:['辽宁省','吉林省','黑龙江省']},
    north:{ko:'화북',cn:'华北',provinces:['北京市','天津市','河北省','山西省','内蒙古自治区','山东省']},
    southeast:{ko:'동남',cn:'东南',provinces:['上海市','江苏省','浙江省','安徽省','福建省','江西省','台湾省','河南省','湖北省','湖南省','广东省','广西壮族自治区','海南省','香港特别行政区','澳门特别行政区']},
    southwest:{ko:'서남',cn:'西南',provinces:['重庆市','四川省','贵州省','云南省','西藏自治区']},
    northwest:{ko:'서북',cn:'西北',provinces:['陕西省','甘肃省','青海省','宁夏回族自治区','新疆维吾尔自治区']}
  };
  const provinceGroup={}; Object.entries(groups).forEach(([key,g])=>g.provinces.forEach(p=>provinceGroup[p]=key));
  function project(point){return[(point[0]-72)*9.4,(54-point[1])*9.4]}
  function ringPath(ring){return ring.map((p,i)=>`${i?'L':'M'}${project(p)[0].toFixed(1)},${project(p)[1].toFixed(1)}`).join('')+'Z'}
  function geometryPath(geometry){const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;return polygons.map(poly=>poly.map(ringPath).join('')).join('')}
  function shortName(name){if(name==='台湾省')return '台湾省';return name.replace(/维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市/g,'')}
  async function render(){
    const host=document.getElementById('chinaRegionMap'),legend=document.getElementById('regionLegend'); if(!host||!legend)return;
    try{
      const source=(document.currentScript&&document.currentScript.src)||'';
      const data=await fetch(new URL('china.json',source)).then(r=>{if(!r.ok)throw new Error('map');return r.json()});
      host.innerHTML=`<svg class="china-map-svg" viewBox="0 0 600 360" role="img" aria-label="중국 성별 지도 · 中国省份地图">${data.features.map(f=>{const n=f.properties.name,g=provinceGroup[n]||'';return `<path class="china-province" tabindex="0" role="button" aria-label="${shortName(n)}" data-province="${n}" data-region="${g}" d="${geometryPath(f.geometry)}"><title>${n}</title></path>`}).join('')}</svg>`;
      legend.innerHTML=Object.entries(groups).map(([key,g])=>`<button class="region" type="button" data-region="${key}" aria-pressed="false"><b>${g.ko} · ${g.cn}</b><small>${g.provinces.map(shortName).join('、')}</small></button>`).join('');
      window.KCTEC_CHINA_REGIONS={groups,shortName};
      document.dispatchEvent(new CustomEvent('china-map-ready'));
    }catch(e){host.innerHTML='<span class="map-loading">지도를 불러오지 못했습니다. 새로고침해 주세요.</span>'}
  }
  render();
})();
