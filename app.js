/* Pure calculation core, also exported for dependency-free Node tests. */
function calculate(s) {
  const n = key => { const raw = s[key]; if (raw === '' || raw == null) throw Error('Complete all required numeric fields.'); const value = Number(raw); if (!Number.isFinite(value)) throw Error('Use finite numeric values.'); return value; };
  const entry = n('entry'), leverage = s.leveraged ? n('leverage') : 1;
  if (entry <= 0) throw Error('Entry price must be greater than zero.');
  if (leverage < 1 || leverage > 1000) throw Error('Leverage must be between 1× and 1,000×.');
  let margin, quantity;
  if (s.sizing === 'quantity') { quantity = n('quantity'); margin = quantity * entry / leverage; } else { margin = n('margin'); quantity = margin * leverage / entry; }
  if (margin <= 0 || quantity <= 0) throw Error('Margin and asset quantity must be greater than zero.');
  const sign = s.direction === 'short' ? -1 : 1;
  let exit;
  if (s.mode === 'prices') exit = n('exit');
  else { const movement = n('movement') / 100 * (s.mode === 'roi' ? sign / leverage : 1); exit = entry * (1 + movement); }
  if (exit <= 0) throw Error('This scenario produces a zero or negative exit price. Enter a valid price or movement.');
  const notional = quantity * entry, gross = quantity * (exit - entry) * sign;
  const feeRate = s.fees ? n('feeRate') : 0;
  if (feeRate < 0 || feeRate > 100) throw Error('Fee rate must be between 0% and 100% per side.');
  const fees = (notional + quantity * exit) * feeRate / 100, net = gross - fees;
  const result = {entry, exit, leverage, margin, quantity, notional, gross, fees, net, roi:net/margin*100, grossRoi:gross/margin*100, movement:(exit/entry-1)*100, balance:margin+net};
  if (Object.values(result).some(v => !Number.isFinite(v))) throw Error('Values are too large to calculate safely. Reduce the position size.');
  result.liquidation = net <= -margin;
  return result;
}
if (typeof module !== 'undefined') module.exports = {calculate};
if (typeof document !== 'undefined') (() => {
  const KEY = 'position-calculator-v1';
  const defaults = {mode:'change',direction:'long',margin:'50',entry:'100',exit:'105',leveraged:true,leverage:'20',movement:'2',sizing:'margin',quantity:'10',fees:false,feeRate:'0.05',theme:'dark',presets:{leverage:[1,5,10,20,50,100],change:[-5,-2,2,5,10],roi:[-50,-20,20,50,100]}};
  let state = structuredClone(defaults), storageOK = true, result = null;
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && typeof saved === 'object') { for (const key of Object.keys(defaults)) if (key !== 'presets' && typeof saved[key] === typeof defaults[key]) state[key] = saved[key]; for (const key of ['leverage','change','roi']) if (Array.isArray(saved.presets?.[key])) state.presets[key] = saved.presets[key].filter(v => typeof v === 'number' && Number.isFinite(v) && (key !== 'leverage' || (v >= 1 && v <= 1000))).slice(0,20); } } catch {storageOK=false;}
  if (!['change','roi','prices'].includes(state.mode)) state.mode='change';
  if (!['long','short'].includes(state.direction)) state.direction='long';
  if (!['margin','quantity'].includes(state.sizing)) state.sizing='margin';
  function normalizeLeverage(value){return value.trim()==='' || Number(value)<1 ? '1' : value;}
  state.leverage=normalizeLeverage(state.leverage);
  const $ = id => document.getElementById(id);
  const numeric = ['margin','entry','exit','leverage','movement','quantity','feeRate'];
  const money = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
  const price = v => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:8}).format(v);
  const signed = (v, suffix='') => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2})}${suffix}`;
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}}
  function presets(id,key){$(id).replaceChildren(...state.presets[key].map(v=>{const b=document.createElement('button');b.textContent=key==='leverage'?`${v}×`:`${v>0?'+':''}${v}%`;b.classList.toggle('active',Number(state[key==='leverage'?'leverage':'movement'])===v);b.onclick=()=>{state[key==='leverage'?'leverage':'movement']=String(v);sync();render();save();};return b;}));}
  function sync(){numeric.forEach(k=>$(k).value=state[k]);['leveraged','fees'].forEach(k=>$(k).checked=state[k]);$('sizing').value=state.sizing;document.body.classList.toggle('light',state.theme==='light');$('theme').textContent=state.theme==='light'?'Dark mode':'Light mode';}
  function render(){
    document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===state.mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    document.querySelectorAll('[data-direction]').forEach(b=>{const active=b.dataset.direction===state.direction;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
    $('movement-field').hidden=state.mode==='prices';$('exit-field').hidden=state.mode!=='prices';$('quantity-field').hidden=state.sizing!=='quantity';$('margin').disabled=state.sizing==='quantity';$('leverage').disabled=!state.leveraged;$('feeRate').disabled=!state.fees;
    $('movement-label').innerHTML=`${state.mode==='roi'?'Target ROI':'Price change'} <small>%</small>`;
    $('mode-hint').textContent=state.mode==='roi'?'Target ROI is before fees. Net ROI includes enabled trading fees.':'Signed market movement: a falling price is negative for both directions.';
    $('leverage-caption').textContent=state.leveraged?'':'Off · 1×';
    presets('leverage-presets','leverage');$('leverage-presets').querySelectorAll('button').forEach(b=>b.disabled=!state.leveraged);presets('movement-presets',state.mode==='roi'?'roi':'change');
    $('error').hidden=true;$('warning').hidden=true;$('copy').disabled=false;
    try {result=calculate(state);}catch(e){result=null;$('error').textContent=e.message;$('error').hidden=false;$('pnl').textContent='—';$('roi').textContent='—';$('profit-label').textContent='CHECK INPUTS';$('entry-result').textContent='—';$('exit-result').textContent='—';$('position-label').textContent='—';$('metrics').replaceChildren();document.querySelector('.results').className='results neutral';$('copy').disabled=true;return;}
    document.querySelector('.results').className=`results ${result.net<0?'loss':result.net===0?'neutral':''}`;
    $('pnl').textContent=`${result.net>0?'+':result.net<0?'−':''}${money(Math.abs(result.net))}`;$('roi').textContent=signed(result.roi,'%');$('profit-label').textContent=result.liquidation?'THEORETICAL LOSS':result.net<0?'LOSS':result.net>0?'PROFIT':'BREAK EVEN';
    $('position-label').textContent=`${state.direction.toUpperCase()} · ${result.leverage}×`;$('entry-result').textContent=price(result.entry);$('exit-result').textContent=price(result.exit);
    const metrics=[['Position notional',money(result.notional)],['Initial margin',money(result.margin)],['Price movement',signed(result.movement,'%')],['Asset quantity',result.quantity.toLocaleString('en-US',{maximumFractionDigits:8})],['Gross PnL',`${result.gross>0?'+':''}${money(result.gross)}`],['Gross ROI (before fees)',signed(result.grossRoi,'%')],['Estimated trading fees',money(result.fees)],['Margin + PnL (theoretical)',money(result.balance)]];
    $('metrics').replaceChildren(...metrics.map(([label,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);return row;}));
    if(result.liquidation){$('warning').hidden=false;$('warning').textContent='Liquidation risk: theoretical loss reaches or exceeds the initial isolated margin. This exit scenario is not an executable outcome; liquidation may occur earlier. An exact liquidation price requires exchange maintenance-margin rules.';}
    else if(!storageOK){$('warning').hidden=false;$('warning').textContent='Device storage is unavailable. Calculations work, but changes may not persist after closing.';}
  }
  numeric.forEach(k=>$(k).addEventListener('input',()=>{state[k]=$(k).value;save();render();}));
  // Leverage is only snapped to a valid value once editing is done, so the field can be cleared and retyped.
  $('leverage').addEventListener('change',()=>{state.leverage=normalizeLeverage($('leverage').value);$('leverage').value=state.leverage;save();render();});
  ['leveraged','fees'].forEach(k=>$(k).onchange=()=>{state[k]=$(k).checked;save();render();});
  $('sizing').onchange=()=>{if(result){if($('sizing').value==='quantity')state.quantity=String(result.quantity);else state.margin=String(result.margin);}state.sizing=$('sizing').value;save();sync();render();};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(result){state.movement=String(b.dataset.mode==='roi'?result.grossRoi:result.movement);state.exit=String(result.exit);}state.mode=b.dataset.mode;save();sync();render();});
  document.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>{state.direction=b.dataset.direction;save();render();});
  $('theme').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';save();sync();};
  $('reset').onclick=()=>{const presets=state.presets,theme=state.theme;state={...structuredClone(defaults),presets,theme};save();sync();render();$('copy-status').textContent='';};
  $('copy').onclick=async()=>{if(!result)return;const lines=[`Position: ${state.direction.toUpperCase()} · ${result.leverage}×`, `Net PnL: ${money(result.net)}`,`Net ROI: ${signed(result.roi,'%')}`,`Entry: ${price(result.entry)}`,`Estimated exit: ${price(result.exit)}`,...Array.from($('metrics').children).map(row=>`${row.firstChild.textContent}: ${row.lastChild.textContent}`),'Theoretical estimate; funding and slippage excluded.',...(result.liquidation?[$('warning').textContent]:[])];const text=lines.join('\n');try{await navigator.clipboard.writeText(text);$('copy-status').textContent='Copied';}catch{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();const copied=document.execCommand('copy');area.remove();$('copy-status').textContent=copied?'Copied':'Copy unavailable in this browser';}};
  function validPreset(v,key){return Number.isFinite(v)&&(key!=='leverage'||(v>=1&&v<=1000));}
  function editPresets(){
    const key=$('preset-kind').value,list=state.presets[key],container=$('preset-list');
    container.replaceChildren(...list.map((v,i)=>{
      const row=document.createElement('div'),input=document.createElement('input'),handle=document.createElement('button'),remove=document.createElement('button');
      row.dataset.index=i;
      input.type='number';input.step='any';input.value=v;input.setAttribute('aria-label',`Preset ${i+1}`);
      input.onchange=()=>{const next=Number(input.value);if(input.value===''||!validPreset(next,key)){input.value=list[i];$('preset-error').textContent='Enter a finite number; leverage must be 1–1,000.';return;}list[i]=next;save();render();};
      handle.type='button';handle.className='drag-handle';handle.textContent='⠿';handle.setAttribute('aria-label',`Drag preset ${i+1} to reorder`);handle.title='Drag to reorder, or use Up and Down arrow keys';handle.setAttribute('aria-describedby','reorder-help');
      handle.onkeydown=e=>{
        if(!['ArrowUp','ArrowDown'].includes(e.key))return;
        e.preventDefault();const target=i+(e.key==='ArrowUp'?-1:1);
        if(target<0||target>=list.length)return;
        [list[i],list[target]]=[list[target],list[i]];save();render();editPresets();
        container.children[target].querySelector('.drag-handle').focus();
        $('reorder-status').textContent=`Preset moved to position ${target+1}.`;
      };
      handle.onpointerdown=e=>{
        if(e.button!==0)return;
        e.preventDefault();handle.focus();handle.setPointerCapture(e.pointerId);row.classList.add('dragging');
        const move=event=>{
          const bounds=container.getBoundingClientRect();
          if(event.clientY<bounds.top+30)container.scrollTop-=18;
          if(event.clientY>bounds.bottom-30)container.scrollTop+=18;
          const others=Array.from(container.children).filter(item=>item!==row);
          const before=others.find(item=>{const rect=item.getBoundingClientRect();return event.clientY<rect.top+rect.height/2;});
          if(row.nextElementSibling!==(before||null)){
            container.insertBefore(row,before||null);
            // Moving a captured node requires renewing pointer capture.
            handle.setPointerCapture(event.pointerId);
          }
        };
        const finish=event=>{
          handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);
          if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
          const order=Array.from(container.children).map(item=>Number(item.dataset.index));
          const target=order.indexOf(i),values=order.map(index=>list[index]);list.splice(0,list.length,...values);
          save();render();editPresets();container.children[target].querySelector('.drag-handle').focus();
          $('reorder-status').textContent=`Preset moved to position ${target+1}.`;
        };
        const cancel=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);editPresets();};
        handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);
      };
      remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Delete preset ${i+1}`);remove.onclick=()=>{list.splice(i,1);save();editPresets();render();};
      row.append(handle,input,remove);return row;
    }));
  }
  function openPresets(key){$('preset-kind').value=key;$('preset-error').textContent='';$('new-preset').value='';editPresets();$('preset-dialog').showModal();}
  $('customize-leverage').onclick=()=>openPresets('leverage');
  $('customize-movement').onclick=()=>openPresets(state.mode==='roi'?'roi':'change');
  $('manage').onclick=()=>openPresets('leverage');$('close-dialog').onclick=()=>$('preset-dialog').close();$('preset-kind').onchange=()=>{ $('preset-error').textContent='';editPresets();};
  $('add-preset').onsubmit=e=>{e.preventDefault();const key=$('preset-kind').value,v=Number($('new-preset').value);if(!validPreset(v,key)||state.presets[key].length>=20){$('preset-error').textContent='Use a valid value (leverage 1–1,000), with at most 20 presets.';return;}state.presets[key].push(v);$('new-preset').value='';$('preset-error').textContent='';save();editPresets();render();};
  sync();render();
})();
