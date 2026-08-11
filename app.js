
const D = window.HBT_DATA;
const byId = id => D.players.find(p => p.id === id);
const fmt = n => Number(n || 0).toLocaleString();
const ordinal = n => n + (n===1?'st':n===2?'nd':n===3?'rd':'th');
function prettyCourseName(name){
  return String(name||'Course').replace(/\s*-\s*/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
}

function avatar(p, cls='mini-photo'){
  if(p.photo) return `<img class="${cls}" src="${p.photo}" alt="${p.last}">`;
  return `<div class="${cls} placeholder">${p.initials}</div>`;
}
function photoBig(p){
  if(p.photo) return `<img class="big-avatar" src="${p.photo}" alt="${p.last}">`;
  return `<div class="placeholder-big">${p.initials}</div>`;
}
function playerHistory(p){
  return Array.isArray(p?.history)?p.history:[];
}

function handicapTrend(p){
  return playerHistory(p)
    .filter(r=>Number.isFinite(Number(r.hcp)) && Number(r.hcp)>0 && r.iso)
    .map(r=>({date:r.date,iso:r.iso,value:Number(r.hcp)}));
}

function handicapLast20(p){
  // Authoritative current handicap calculation comes directly from the
  // player's SC DIFF worksheet. Do not reconstruct the eight counting
  // differentials from HC history; the workbook's COUNTS column is source of truth.
  return (Array.isArray(p?.scDiff)?p.scDiff:[])
    .filter(r=>Number.isInteger(Number(r.rd)) && Number.isFinite(Number(r.score)) && Number.isFinite(Number(r.diff)))
    .map(r=>({
      rd:Number(r.rd),
      date:r.date,
      iso:r.iso,
      course:r.course,
      score:Number(r.score),
      diff:Number(r.diff),
      counts:r.counts===true
    }))
    .sort((a,b)=>b.rd-a.rd);
}

function currentHcp(p){
  const trend=handicapTrend(p);
  const latest=trend.at(-1);
  return latest?Number(latest.value):0;
}

function hcpArrow(p){
  const trend=handicapTrend(p);
  if(trend.length<2) return '';
  const prev=Number(trend[trend.length-2].value);
  const curr=Number(trend[trend.length-1].value);
  if(!Number.isFinite(prev)||!Number.isFinite(curr)) return '';
  if(curr<prev-0.005) return '<span class="hcp-arrow hcp-down" aria-label="Handicap decreased">▼</span>';
  if(curr>prev+0.005) return '<span class="hcp-arrow hcp-up" aria-label="Handicap increased">▲</span>';
  return '';
}

function seasonMetricsFor(playerId){
  const results=player2026RoundOrder().map(round=>{
    const row=(D.rounds?.[round]||[]).find(r=>r.id===playerId);
    return row && row.gross!=null ? {round,...row} : null;
  }).filter(Boolean);
  const nums=key=>results.map(r=>r[key]).filter(v=>v!==null && v!==undefined && v!=='').map(Number).filter(Number.isFinite);
  const mean=vals=>vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  const grosses=nums('gross');
  const finishes=nums('fin');
  return {
    rounds:results.length,
    wins:results.filter(r=>Number(r.fin)===1).length,
    top3:results.filter(r=>Number.isFinite(Number(r.fin)) && Number(r.fin)<=3).length,
    avgFinish:mean(finishes),
    avgGross:mean(grosses),
    lowGross:grosses.length?Math.min(...grosses):null,
    avgToPar:mean(nums('plus')),
    putts:mean(nums('putts')),
    gir:mean(nums('gir')),
    driving:mean(nums('driving')),
    bestAdjusted:(()=>{const v=nums('adj');return v.length?Math.min(...v):null;})(),
    results
  };
}

function seasonMetricValue(p,metric){
  return seasonMetricsFor(p.id)?.[metric] ?? null;
}

function seasonRanked(metric,dir='max'){
  return D.players.map(player=>({player,value:seasonMetricValue(player,metric)}))
    .sort((a,b)=>{
      const av=Number(a.value), bv=Number(b.value);
      const af=Number.isFinite(av), bf=Number.isFinite(bv);
      if(!af && !bf) return a.player.last.localeCompare(b.player.last);
      if(!af) return 1;
      if(!bf) return -1;
      return dir==='max' ? (bv-av || a.player.last.localeCompare(b.player.last)) : (av-bv || a.player.last.localeCompare(b.player.last));
    });
}

function leader(metric,dir='max'){
  return seasonRanked(metric,dir)[0]?.player;
}

function metricRank(playerId,metric,dir='max'){
  return seasonRanked(metric,dir).findIndex(x=>x.player.id===playerId)+1;
}

function seasonStandingFor(playerId){
  return currentSeasonStandings().find(x=>x.player.id===playerId)||null;
}

function droppedPointRounds(playerId,labs){
  const format=D.seasonFormat||{};
  const dropCount=Number(format.droppedRegularRounds??2);
  const vals=labs
    .filter(r=>/^R(?:[1-9]|1[0-6])$/.test(r))
    .map((r,i)=>({r,i,v:Number(roundPoints(r,playerId))}))
    .filter(x=>Number.isFinite(x.v));
  vals.sort((a,b)=>a.v-b.v || a.i-b.i);
  return new Set(vals.slice(0,dropCount).map(x=>x.r));
}

function seasonConfig(){
  const f=D.seasonFormat||{};
  const regularPoints=[...(f.regularPointsByFinish||[1000,850,700,600,500,400])];
  const championship=f.championship||{};
  const rawCards=Array.isArray(championship.cards)&&championship.cards.length
    ? championship.cards
    : [
        {id:'CH1',name:'Front Nine'},
        {id:'CH2',name:'Back Nine'},
        {id:'CH3',name:'18-Hole Total'}
      ];

  return {
    regularRounds:Number(f.regularRounds||16),
    drops:Number(f.droppedRegularRounds??2),
    regularPoints,
    mc:{
      id:f.midseason?.id||'MC',
      name:f.midseason?.name||'Midseason Classic',
      points:[...(f.midseason?.pointsByFinish||regularPoints.map(v=>v*2))]
    },
    ch:{
      id:championship.id||'CH',
      name:championship.name||'HBT Championship',
      cards:rawCards.map((card,i)=>({
        id:card.id||`CH${i+1}`,
        name:card.name||['Front Nine','Back Nine','18-Hole Total'][i]||`Card ${i+1}`,
        points:[...(card.pointsByFinish||regularPoints)]
      }))
    }
  };
}

function pointScaleForRound(roundId){
  const f=seasonConfig();
  if(/^R(?:[1-9]|1[0-6])$/.test(roundId)) return f.regularPoints;
  if(roundId===f.mc.id) return f.mc.points;
  const chCard=f.ch.cards.find(card=>card.id===roundId);
  return chCard?.points||null;
}

function roundPoints(roundId,playerId){
  const rows=D.rounds?.[roundId]||[];
  const complete=rows.some(row=>row.gross!==null && row.gross!==undefined && Number.isFinite(Number(row.gross)));
  if(!complete) return null;

  const row=rows.find(r=>r.id===playerId);
  if(!row || row.gross===null || row.gross===undefined || !Number.isFinite(Number(row.gross))) return 0;

  const finish=Number(row.fin);
  const scale=pointScaleForRound(roundId);
  if(!scale || !Number.isInteger(finish) || finish<1 || finish>scale.length) return 0;
  return Number(scale[finish-1]);
}

function pointRoundComplete(roundId){
  const rows=D.rounds?.[roundId]||[];
  return rows.some(row=>row.gross!==null && row.gross!==undefined && Number.isFinite(Number(row.gross)));
}

function seasonRegularRoundIds(){
  const f=seasonConfig();
  return Array.from({length:f.regularRounds},(_,i)=>`R${i+1}`);
}

function seasonPointOrder(){
  const f=seasonConfig();
  const regular=seasonRegularRoundIds();
  return [...regular.slice(0,10),f.mc.id,...regular.slice(10),...f.ch.cards.map(c=>c.id)];
}

function completedSeasonPointRounds(){
  return seasonPointOrder().filter(pointRoundComplete);
}

function seasonEventCounts(){
  const f=seasonConfig();
  const regularComplete=seasonRegularRoundIds().filter(pointRoundComplete).length;
  const mcComplete=pointRoundComplete(f.mc.id)?1:0;
  const chComplete=f.ch.cards.length && f.ch.cards.every(c=>pointRoundComplete(c.id)) ? 1 : 0;
  return {
    complete:regularComplete+mcComplete+chComplete,
    total:f.regularRounds+2
  };
}

function countedRegularPoints(values){
  const f=seasonConfig();
  const clean=values.filter(v=>Number.isFinite(Number(v))).map(Number).sort((a,b)=>a-b);
  if(!clean.length) return 0;
  const drops=Math.min(f.drops,clean.length);
  return clean.slice(drops).reduce((sum,v)=>sum+v,0);
}

function currentRegularPointValues(playerId){
  return seasonRegularRoundIds()
    .filter(pointRoundComplete)
    .map(r=>Number(roundPoints(r,playerId)))
    .filter(Number.isFinite);
}

function seasonCurrentPoints(playerId){
  const f=seasonConfig();
  let total=countedRegularPoints(currentRegularPointValues(playerId));

  if(pointRoundComplete(f.mc.id)){
    const v=Number(roundPoints(f.mc.id,playerId));
    if(Number.isFinite(v)) total+=v;
  }

  f.ch.cards.forEach(card=>{
    if(pointRoundComplete(card.id)){
      const v=Number(roundPoints(card.id,playerId));
      if(Number.isFinite(v)) total+=v;
    }
  });

  return total;
}

function currentSeasonStandings(){
  return D.players
    .map(player=>({player,points:seasonCurrentPoints(player.id)}))
    .sort((a,b)=>b.points-a.points || a.player.last.localeCompare(b.player.last))
    .map((x,i)=>({...x,pos:i+1}));
}

function remainingSeasonEvents(){
  const f=seasonConfig();
  const regular=seasonRegularRoundIds().filter(r=>!pointRoundComplete(r));
  return {
    regular,
    mc:pointRoundComplete(f.mc.id)?null:f.mc.id,
    ch:f.ch.cards.filter(card=>!pointRoundComplete(card.id))
  };
}

function finalSeasonPoints(playerId,{regularFuture=[],mcFuture=null,chFuture={}}={}){
  const f=seasonConfig();
  const regular=[...currentRegularPointValues(playerId),...regularFuture.map(Number)];
  let total=countedRegularPoints(regular);

  if(pointRoundComplete(f.mc.id)){
    const v=Number(roundPoints(f.mc.id,playerId));
    if(Number.isFinite(v)) total+=v;
  }else if(Number.isFinite(Number(mcFuture))){
    total+=Number(mcFuture);
  }

  f.ch.cards.forEach(card=>{
    if(pointRoundComplete(card.id)){
      const v=Number(roundPoints(card.id,playerId));
      if(Number.isFinite(v)) total+=v;
    }else{
      const future=Number(chFuture?.[card.id]);
      if(Number.isFinite(future)) total+=future;
    }
  });

  return total;
}

function maxPointNotTaken(points,ownPlace){
  return Math.max(...points.filter((_,i)=>i!==ownPlace-1));
}

function ownFinishGuaranteesTitle(playerId,{regularPlaces=[],mcPlace=null,chPlaces={}}={}){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const chFuture=Object.fromEntries(rem.ch.map(card=>{
    const place=chPlaces?.[card.id]||6;
    return [card.id,card.points[place-1]];
  }));

  const candidate=finalSeasonPoints(playerId,{
    regularFuture:regularPlaces.map(place=>f.regularPoints[place-1]),
    mcFuture:rem.mc?f.mc.points[(mcPlace||6)-1]:null,
    chFuture
  });

  return D.players.filter(p=>p.id!==playerId).every(rival=>{
    const rivalRegular=rem.regular.map((_,i)=>
      maxPointNotTaken(f.regularPoints,regularPlaces[i]||6)
    );
    const rivalMC=rem.mc?maxPointNotTaken(f.mc.points,mcPlace||6):null;
    const rivalCH=Object.fromEntries(rem.ch.map(card=>{
      const place=chPlaces?.[card.id]||6;
      return [card.id,maxPointNotTaken(card.points,place)];
    }));
    const rivalMax=finalSeasonPoints(rival.id,{
      regularFuture:rivalRegular,
      mcFuture:rivalMC,
      chFuture:rivalCH
    });
    return candidate>rivalMax;
  });
}

function titleClinched(playerId){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const candidateMin=finalSeasonPoints(playerId,{
    regularFuture:rem.regular.map(()=>f.regularPoints[5]),
    mcFuture:rem.mc?f.mc.points[5]:null,
    chFuture:Object.fromEntries(rem.ch.map(card=>[card.id,card.points[5]]))
  });

  return D.players.filter(p=>p.id!==playerId).every(rival=>{
    const rivalMax=finalSeasonPoints(rival.id,{
      regularFuture:rem.regular.map(()=>f.regularPoints[0]),
      mcFuture:rem.mc?f.mc.points[0]:null,
      chFuture:Object.fromEntries(rem.ch.map(card=>[card.id,card.points[0]]))
    });
    return candidateMin>rivalMax;
  });
}

const TITLE_RACE_PERMS=(()=>{
  const src=[1,2,3,4,5];
  const out=[];
  const walk=(arr,left)=>{
    if(!left.length){out.push(arr);return;}
    left.forEach((x,i)=>walk([...arr,x],[...left.slice(0,i),...left.slice(i+1)]));
  };
  walk([],src);
  return out;
})();

function canWinTitleIfSweeps(playerId){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const candidateMax=finalSeasonPoints(playerId,{
    regularFuture:rem.regular.map(()=>f.regularPoints[0]),
    mcFuture:rem.mc?f.mc.points[0]:null,
    chFuture:Object.fromEntries(rem.ch.map(card=>[card.id,card.points[0]]))
  });

  const rivals=D.players.filter(p=>p.id!==playerId);
  const specialEvents=[
    ...(rem.mc?[{id:rem.mc,points:f.mc.points}]:[]),
    ...rem.ch.map(card=>({id:card.id,points:card.points}))
  ];

  if(!rem.regular.length && !specialEvents.length){
    return rivals.every(r=>seasonCurrentPoints(r.id)<=candidateMax);
  }

  // The exact late-season search is intentionally bounded. With the HBT
  // format there are at most two droppable regular rounds plus the three
  // Championship cards left once the title race matters. Earlier in the
  // season, retain the conservative no-false-elimination behavior.
  if(rem.regular.length>2 || rem.regular.length+specialEvents.length>5){
    const rivalMinFuture=(rival)=>finalSeasonPoints(rival.id,{
      regularFuture:rem.regular.map(()=>f.regularPoints.at(-1)),
      mcFuture:rem.mc?f.mc.points.at(-1):null,
      chFuture:Object.fromEntries(rem.ch.map(card=>[card.id,card.points.at(-1)]))
    });
    return !rivals.some(r=>rivalMinFuture(r)>candidateMax);
  }

  const permutationCache=new Map();
  const permutationsFor=(points)=>{
    const key=points.join(',');
    if(permutationCache.has(key)) return permutationCache.get(key);
    const target=points.slice(1).sort((a,b)=>a-b);
    const perms=TITLE_RACE_PERMS
      .map(perm=>perm.map(placeIndex=>points[placeIndex]))
      .sort((a,b)=>{
        const distance=(perm)=>perm.reduce((sum,pts,i)=>sum+Math.abs(pts-target[i]),0);
        return distance(a)-distance(b);
      });
    permutationCache.set(key,perms);
    return perms;
  };
  const regularPerms=permutationsFor(f.regularPoints);
  const assignedRegular=Object.fromEntries(rivals.map(r=>[r.id,[]]));
  const seenRegularBases=new Set();
  const specialMemo=new Map();

  const specialFeasible=(rawThresholds,eventIndex=0)=>{
    const thresholds=[...rawThresholds].sort((a,b)=>a-b);
    if(eventIndex>=specialEvents.length) return thresholds.every(v=>v>=-1e-9);

    const remaining=specialEvents.slice(eventIndex);
    const minNeeded=remaining.reduce((sum,event)=>sum+Math.min(...event.points.slice(1)),0);
    if(thresholds.some(v=>v<minNeeded-1e-9)) return false;

    const totalNeeded=remaining.reduce((sum,event)=>sum+event.points.slice(1).reduce((a,b)=>a+b,0),0);
    if(thresholds.reduce((a,b)=>a+b,0)<totalNeeded-1e-9) return false;

    const key=`${eventIndex}|${thresholds.map(v=>Math.round(v*1000)/1000).join(',')}`;
    if(specialMemo.has(key)) return specialMemo.get(key);

    const event=specialEvents[eventIndex];
    const eventPerms=permutationsFor(event.points);

    for(const perm of eventPerms){
      const next=thresholds.map((v,i)=>v-perm[i]);
      if(next.some(v=>v<-1e-9)) continue;
      if(specialFeasible(next,eventIndex+1)){
        specialMemo.set(key,true);
        return true;
      }
    }

    specialMemo.set(key,false);
    return false;
  };

  const testRegularBase=()=>{
    const base=rivals.map(r=>finalSeasonPoints(r.id,{
      regularFuture:assignedRegular[r.id],
      mcFuture:null,
      chFuture:{}
    }));
    const baseKey=base.map(v=>Math.round(v*1000)/1000).join('|');
    if(seenRegularBases.has(baseKey)) return false;
    seenRegularBases.add(baseKey);
    const thresholds=base.map(v=>candidateMax-v);
    return specialFeasible(thresholds,0);
  };

  const searchRegular=(idx)=>{
    if(idx>=rem.regular.length) return testRegularBase();

    for(const perm of regularPerms){
      rivals.forEach((r,i)=>assignedRegular[r.id].push(perm[i]));
      if(searchRegular(idx+1)){
        rivals.forEach(r=>assignedRegular[r.id].pop());
        return true;
      }
      rivals.forEach(r=>assignedRegular[r.id].pop());
    }
    return false;
  };

  return searchRegular(0);
}

function titleGuaranteePath(playerId){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const regularPlaces=rem.regular.map(()=>1);
  const mcPlace=rem.mc?1:null;

  if(rem.ch.length){
    const combos=[];
    const walk=(idx,current)=>{
      if(idx===rem.ch.length){
        const chPlaces=Object.fromEntries(rem.ch.map((card,i)=>[card.id,current[i]]));
        const pointTotal=rem.ch.reduce((sum,card,i)=>sum+card.points[current[i]-1],0);
        const placeTotal=current.reduce((a,b)=>a+b,0);
        combos.push({chPlaces,pointTotal,placeTotal});
        return;
      }
      for(let place=6;place>=1;place--) walk(idx+1,[...current,place]);
    };
    walk(0,[]);
    combos.sort((a,b)=>a.pointTotal-b.pointTotal || b.placeTotal-a.placeTotal);

    for(const combo of combos){
      if(ownFinishGuaranteesTitle(playerId,{
        regularPlaces,
        mcPlace,
        chPlaces:combo.chPlaces
      })){
        return {regularPlaces,mcPlace,chPlaces:combo.chPlaces};
      }
    }
    return null;
  }

  return ownFinishGuaranteesTitle(playerId,{regularPlaces,mcPlace,chPlaces:{}})
    ? {regularPlaces,mcPlace,chPlaces:{}}
    : null;
}

function titleRaceMaxPoints(playerId){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  return finalSeasonPoints(playerId,{
    regularFuture:rem.regular.map(()=>f.regularPoints[0]),
    mcFuture:rem.mc?f.mc.points[0]:null,
    chFuture:Object.fromEntries(rem.ch.map(card=>[card.id,card.points[0]]))
  });
}

function championshipCardLabel(id){
  if(id==='CH1') return 'Championship front nine';
  if(id==='CH2') return 'Championship back nine';
  if(id==='CH3') return 'Championship 18-hole total';
  return id;
}

function championshipGuaranteeText(id,place){
  const label=championshipCardLabel(id);
  if(place===1) return `win the ${label}`;
  return `finish ${ordinal(place)} or better on the ${label}`;
}

function championshipCombinationGuaranteeText(chPlaces){
  const places=Object.values(chPlaces||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if(places.length!==3) return null;
  const [a,b,c]=places;

  if(a===1 && b===1){
    if(c===1) return 'win all three HBT Championship cards';
    return `win two of the three HBT Championship cards and finish ${ordinal(c)} or better in the other`;
  }
  if(a===1){
    if(b===c) return `win one HBT Championship card and finish ${ordinal(b)} or better in the other two`;
    return `win one HBT Championship card, finish ${ordinal(b)} or better in another, and ${ordinal(c)} or better in the third`;
  }
  if(a===b && b===c) return `finish ${ordinal(a)} or better on all three HBT Championship cards`;
  if(a===b) return `finish ${ordinal(a)} or better on two HBT Championship cards and ${ordinal(c)} or better on the third`;
  return `finish ${ordinal(a)} or better on one HBT Championship card, ${ordinal(b)} or better on another, and ${ordinal(c)} or better on the third`;
}

function titleRaceActionText(){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const actions=[];
  rem.regular.forEach(id=>actions.push(id));
  if(rem.mc) actions.push('the Midseason Classic');

  if(rem.ch.length===f.ch.cards.length && rem.ch.length===3){
    actions.push('all three HBT Championship cards');
  }else{
    rem.ch.forEach(card=>actions.push(`the ${championshipCardLabel(card.id)}`));
  }

  if(!actions.length) return 'the completed season';
  if(actions.length===1) return actions[0];
  if(actions.length===2) return `${actions[0]} and ${actions[1]}`;
  return `${actions.slice(0,-1).join(', ')}, and ${actions.at(-1)}`;
}

function buildTitleRace(){
  const f=seasonConfig();
  const standings=currentSeasonStandings();
  const leader=standings[0];
  const rem=remainingSeasonEvents();
  const map={};

  standings.forEach(entry=>{
    const p=entry.player;
    const gap=Math.max(0,leader.points-entry.points);

    if(titleClinched(p.id)){
      map[p.id]={
        status:'clinched',
        label:'CLINCHED',
        blurb:`${p.first} has mathematically clinched the HBT season championship. The remaining results cannot change the title.`
      };
      return;
    }

    const guarantee=titleGuaranteePath(p.id);
    if(guarantee){
      const pieces=[];
      if(rem.regular.length===1) pieces.push(`win ${rem.regular[0]}`);
      else if(rem.regular.length>1) pieces.push(`win ${rem.regular.join(' and ')}`);
      if(rem.mc) pieces.push('win the Midseason Classic');
      if(rem.ch.length===f.ch.cards.length && rem.ch.length===3){
        const championshipCombo=championshipCombinationGuaranteeText(guarantee.chPlaces);
        if(championshipCombo) pieces.push(championshipCombo);
      }else{
        rem.ch.forEach(card=>{
          pieces.push(championshipGuaranteeText(card.id,guarantee.chPlaces?.[card.id]||6));
        });
      }

      const guaranteeText=pieces.length===1?pieces[0]:
        pieces.length===2?`${pieces[0]}, then ${pieces[1]}`:
        `${pieces.slice(0,-1).join(', ')}, and ${pieces.at(-1)}`;

      const intro=gap===0
        ? `${p.first} leads the standings.`
        : `${p.first} is ${fmt(gap)} points behind ${leader.player.first}.`;

      map[p.id]={
        status:'controls',
        label:'CONTROLS DESTINY',
        blurb:`${p.first} controls his own destiny in the HBT title race. ${intro} A clean guaranteed path is to ${guaranteeText}. Do that and the HBT title is his regardless of the other results.`
      };
      return;
    }

    const alive=canWinTitleIfSweeps(p.id);
    if(alive){
      const gapText=gap===0?'is in the lead':`is ${fmt(gap)} points back`;
      map[p.id]={
        status:'needs-help',
        label:'NEEDS HELP',
        blurb:`${p.first} needs help to win the HBT title, but is still mathematically alive. He ${gapText}. Even winning ${titleRaceActionText()} would not make the title automatic, so he needs the leaders to give back points along the way.`
      };
      return;
    }

    map[p.id]={
      status:'eliminated',
      label:'ELIMINATED',
      blurb:`${p.first} has been mathematically eliminated from the HBT title race. Even winning ${titleRaceActionText()} would max him out at ${fmt(titleRaceMaxPoints(p.id))} points, and there is no remaining finish combination that gets him the title.`
    };
  });

  return map;
}

function recordBand(){
  const low=seasonRanked('lowGross','min')[0], wins=seasonRanked('wins','max')[0], drive=seasonRanked('driving','max')[0], avg=seasonRanked('avgToPar','min')[0];
  return `<div class="record-band">
    <div><div class="rlabel">Low round</div><div class="rval">${low.value}</div><small>${low.player.last}</small></div>
    <div><div class="rlabel">Most wins</div><div class="rval">${wins.value}</div><small>${wins.player.last}</small></div>
    <div><div class="rlabel">Driving leader</div><div class="rval">${Number(drive.value).toFixed(1)}%</div><small>${drive.player.last}</small></div>
    <div><div class="rlabel">Best avg +/-</div><div class="rval">+${Number(avg.value).toFixed(1)}</div><small>${avg.player.last}</small></div>
  </div>`;
}
function trendSvg(points,label='Handicap'){
  const pts=points.filter(p=>p.value!==null&&p.value!==undefined);
  if(pts.length<2) return `<div class="caption">Not enough data for trend.</div>`;

  const w=720,h=430,left=50,right=20,top=30,bottom=40;
  const vals=pts.map(p=>Number(p.value));
  let min=Math.min(...vals), max=Math.max(...vals);
  if(max-min<1){ max+=.5; min-=.5; }

  const padRange=Math.max((max-min)*.06,.18);
  min=Math.max(0,min-padRange);
  max=max+padRange;
  const range=max-min;

  const x0=left, x1=w-right, y0=top, y1=h-bottom;
  const xy=pts.map((p,i)=>{
    const x=x0+i*(x1-x0)/(pts.length-1);
    const y=y0+(max-Number(p.value))*(y1-y0)/range;
    return [x,y,p];
  });

  const d=xy.map((a,i)=>(i?'L':'M')+a[0].toFixed(1)+' '+a[1].toFixed(1)).join(' ');
  const ticks=5;
  let tickSvg='';
  for(let i=0;i<ticks;i++){
    const v=max-i*(range/(ticks-1));
    const y=y0+i*((y1-y0)/(ticks-1));
    tickSvg+=`<line class="trend-grid" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"></line>`;
    tickSvg+=`<text class="trend-y-label" x="${x0-7}" y="${y+3}" text-anchor="end">${v.toFixed(1)}</text>`;
  }

  const first=pts[0],last=pts[pts.length-1];
  return `<svg class="trend" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    ${tickSvg}
    <line class="axis" x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}"></line>
    <line class="axis" x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}"></line>
    <path d="${d}"></path>
    <circle cx="${xy[0][0]}" cy="${xy[0][1]}" r="4" fill="var(--gold)"></circle>
    <circle cx="${xy[xy.length-1][0]}" cy="${xy[xy.length-1][1]}" r="4" fill="var(--g)"></circle>
    <text x="${x0}" y="${h-12}">${first.date}</text>
    <text x="${x1-64}" y="${h-12}">${last.date}</text>
  </svg>`;
}
function leaderboardGapText(points,leaderPoints){
  const gap=Math.max(0,Number(leaderPoints)-Number(points));
  if(gap<0.5) return 'In the lead';
  return `${fmt(gap)} pts behind`;
}

function home(){
  const standings=currentSeasonStandings();
  const L=standings[0].player;
  const titleRace=buildTitleRace();
  const latestRoundId=completedSeasonPointRounds().at(-1) || seasonPointOrder()[0];
  const rr=(D.rounds[latestRoundId]||[]).filter(x=>x.gross!=null).sort((a,b)=>(a.fin??99)-(b.fin??99));
  const labs=completedSeasonPointRounds();
  const futurePointRows=seasonPointOrder().filter(r=>!labs.includes(r));
  const leadGap=standings.length>1?standings[0].points-standings[1].points:0;
  const fireRounds=labs.slice(-3);
  const fireRank=D.players.map(p=>({
    player:p,
    points:fireRounds.reduce((sum,r)=>sum+Number(roundPoints(r,p.id)||0),0)
  })).sort((a,b)=>b.points-a.points);
  const hot=fireRank[0];
  const statWeekEntry=seasonRanked('gir','max')[0];
  const statWeek=statWeekEntry.player;
  const pointsPlayers=standings.map(entry=>entry.player);

  // League Pulse pull quotes are derived from the current 2026 scorecards,
  // so their numbers stay current after weekly data syncs.
  const anthonyPulse=playerSeason2026FromRounds('am');
  const anthonyBottomTwo=anthonyPulse.results.filter(r=>r.fin===5 || r.fin===6).length;
  const anthonyExtremeFinishes=anthonyPulse.wins+anthonyBottomTwo;

  const scottPuttingRank=metricRank('ss','putts','min');
  const scottDrivingRank=metricRank('ss','driving','max');
  const scottGirRank=metricRank('ss','gir','max');
  const scottGirPhrase=scottGirRank===D.players.length?'dead last':ordinal(scottGirRank);

  // Season best/worst gross rounds: compare standard 9-hole league rounds only.
  const nineHoleRoundIds=seasonRegularRoundIds().filter(id=>(D.rounds[id]||[]).some(r=>r.gross!=null));
  const seasonGrossRounds=[];
  nineHoleRoundIds.forEach(roundId=>{
    (D.rounds[roundId]||[]).forEach(row=>{
      if(row.gross!=null){
        seasonGrossRounds.push({round:roundId,row,player:byId(row.id)});
      }
    });
  });
  seasonGrossRounds.sort((a,b)=>a.row.gross-b.row.gross);
  const seasonBestRound=seasonGrossRounds[0];
  const seasonWorstRound=seasonGrossRounds[seasonGrossRounds.length-1];

  // Most recent course record: latest completed round matching a current HBT course record.
  const roundCourseMap=Object.fromEntries(Object.entries(D.roundMeta||{})
    .filter(([id,m])=>/^R(?:[1-9]|1[0-6])$/.test(id) && m?.course)
    .map(([id,m])=>[id,m.course]));
  const roundDateMap=Object.fromEntries(Object.entries(D.roundMeta||{})
    .filter(([id,m])=>m?.date)
    .map(([id,m])=>[id,new Date(`${m.date}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})]));
  const latestMeta=D.roundMeta?.[latestRoundId]||{};
  const latestCourseName=latestMeta.course||roundCourseMap[latestRoundId];
  const latestRoundCourse=D.courses.find(c=>c.name===latestCourseName)||{tees:latestMeta.tees,rating:latestMeta.rating,nineRating:(Number(latestMeta.rating)||0)/2,slope:latestMeta.slope};
  const latestRoundParRow=rr.find(r=>Number.isFinite(Number(r.gross))&&Number.isFinite(Number(r.plus)));
  const latestRoundPar=latestRoundParRow?Number(latestRoundParRow.gross)-Number(latestRoundParRow.plus):null;
  const latestRoundRating=latestRoundPar!=null && latestRoundPar>40?latestRoundCourse?.rating:latestRoundCourse?.nineRating;
  let recentCourseRecord=null;
  seasonRegularRoundIds().filter(id=>pointRoundComplete(id)).reverse().some(roundId=>{
    const course=courseBook().find(c=>c.name===roundCourseMap[roundId]);
    if(!course) return false;
    const hits=(D.rounds[roundId]||[]).filter(r=>r.gross!=null && Number(r.gross)<=Number(course.record));
    if(!hits.length) return false;
    hits.sort((a,b)=>a.gross-b.gross);
    recentCourseRecord={
      round:roundId,
      course,
      player:byId(hits[0].id),
      score:hits[0].gross,
      date:roundDateMap[roundId]
    };
    return true;
  });


  return `<section class="hero home-editorial-hero">
    <video id="homeHeroVideo" class="hero-bg-video" autoplay muted loop playsinline webkit-playsinline preload="auto" disablepictureinpicture controlslist="nodownload noplaybackrate nofullscreen" aria-hidden="true">
      <source src="assets/hero-golf.mp4" type="video/mp4">
    </video>
        <div class="hero-bottom-gradient" aria-hidden="true"></div>
<div class="hero-video-treatment" aria-hidden="true"></div>
    
    <div class="hero-in home-hero-in">
      <div class="hero-title-wrap hero-event-lockup">
        <div class="hero-event-date">September 10th to 13th</div>
        <div class="hero-event-title">HBT Championship</div>
        <div class="hero-event-location">Orlando, Florida</div>
      </div>
      <div class="hero-score-divider" aria-hidden="true"></div>
      <div class="hero-status hero-status-clean">
        <span>${seasonEventCounts().complete} of ${seasonEventCounts().total} events complete</span>
        <div class="hero-status-rotator">
          <span id="heroStatusText">${L.last} leads · ${fmt(standings[0].points)} pts</span>
        </div>
      </div>

    </div>
  </section>

  <section class="page home-main">
    <section class="premium-section">
      <div class="premium-kicker">2026 Season</div>
      <h2 class="premium-title">Leaderboard.</h2>
      <p class="leaderboard-title-race-help">Click a player to see their path to the HBT Championship.</p>
      <div class="leaderboard-stack title-race-leaderboard">
        ${standings.map(entry=>{
          const p=entry.player;
          const race=titleRace[p.id];
          return `<div class="leaderboard-entry reveal" data-title-race-entry="${p.id}">
            <div class="leaderboard-row title-race-row"
              data-title-race-toggle="${p.id}"
              role="button"
              tabindex="0"
              aria-expanded="false"
              aria-controls="title-race-detail-${p.id}"
              aria-label="Show ${p.first} ${p.last}'s path to the HBT Championship">
              <div class="leaderboard-pos">${entry.pos}</div>
              <span class="player-avatar-link">${avatar(p)}</span>
              <div class="leaderboard-player-copy">
                <div class="leaderboard-name">${p.first} ${p.last}</div>
                <div class="leaderboard-meta">${leaderboardGapText(entry.points,standings[0].points)}</div>
                
              </div>
              <div class="leaderboard-points"><b>${fmt(entry.points)}</b><span>Points</span></div>
              <div class="title-race-card-affordance" aria-hidden="true">
                <span class="title-race-card-chevron">⌄</span>
              </div>
            </div>
            <div class="title-race-detail"
              id="title-race-detail-${p.id}"
              data-title-race-detail="${p.id}"
              aria-hidden="true">
              <div class="title-race-detail-kicker">Path to the HBT Title</div>
              <p>${race.blurb}</p>
            </div>
          </div>`;
        }).join('')}
      </div>
    </section>

    <section class="premium-section reveal">
      <div class="premium-kicker">Season Summary</div>
      <h2 class="premium-title">2026 Points</h2>
      <p class="premium-copy">Lowest two regular season scores are dropped.</p>
      <div class="tablebox home-points compact-points" style="margin-top:22px">
        <table>
          <thead><tr><th>Rd</th>${pointsPlayers.map(p=>`<th>${p.initials}</th>`).join('')}</tr></thead>
          <tbody>
            ${labs.map(r=>`<tr><td class="pname">${r}</td>${pointsPlayers.map(p=>{
              const drops=droppedPointRounds(p.id,labs);
              const val=roundPoints(r,p.id);
              const cls=drops.has(r)?'dropped-point':'';
              return `<td class="${cls}">${val??'—'}</td>`;
            }).join('')}</tr>`).join('')}
            ${futurePointRows.map(r=>`<tr class="future-points-row"><td class="pname">${r}</td>${pointsPlayers.map(()=>'<td>—</td>').join('')}</tr>`).join('')}
            <tr class="leadrow points-total-row"><td class="pname">TOT</td>${pointsPlayers.map(p=>`<td class="pts">${fmt(seasonCurrentPoints(p.id))}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="premium-section reveal latest-home">
      <div class="premium-kicker">Latest Event - ${latestRoundId==='MC'?'Midseason Classic':latestRoundId==='CH1'?'HBT Championship · Front Nine':latestRoundId==='CH2'?'HBT Championship · Back Nine':latestRoundId==='CH3'?'HBT Championship · 18-Hole Total':`Round ${latestRoundId.replace('R','')}`}</div>
      <h2 class="premium-title">${prettyCourseName(latestCourseName)}.</h2>
      <div class="home-latest-meta-row">
        <div class="round-course-meta home-round-course-meta">
          <span class="round-tee-meta">
            <span class="tee-color-dot" data-tee="${latestRoundCourse?.tees||''}" aria-hidden="true"></span>
            <span>${latestRoundCourse?.tees||'—'}</span>
          </span>
          <span>${typeof latestRoundRating==='number'?latestRoundRating.toFixed(2):'—'} | ${latestRoundCourse?.slope??'—'}</span>
          <span>PAR ${latestRoundPar??'—'}</span>
        </div>
      </div>
      <div class="card home-latest-scorecard" style="margin-top:20px">
        <div class="tablebox home-scorecard" style="border:0">
          <table><thead><tr><th>Fin</th><th>Player</th><th>Gross</th><th>+/-</th><th>HCP</th><th>Adj</th></tr></thead><tbody>
          ${rr.map(r=>{let p=byId(r.id);return `<tr class="${r.fin===1?'leadrow':''}">
            <td class="pos">${r.fin}</td><td><b>${p.last}</b></td><td>${r.gross}</td><td>+${r.plus}</td><td>${Number(r.hcp).toFixed(2)}</td><td class="pts">${Number(r.adj).toFixed(2)}</td>
          </tr>`}).join('')}
          </tbody></table>
        </div>
      </div>
      <div class="home-latest-scorecards-link">
        <a href="#rounds" class="text-link">View all scorecards →</a>
      </div>
    </section>

    
  
    <section class="premium-section reveal around-tour">
      <div class="premium-kicker">League pulse</div>
      <h2 class="premium-title">Around the Tour.</h2>

      <div class="tour-editorial-grid">

        <article class="tour-story stat-week-card">
          <div class="stat-week-copy">
            <div class="tour-stat-kicker">Stat of the Week</div>
            <div class="tour-story-name">${statWeek.first} ${statWeek.last}</div>
            <div class="tour-story-display">${Number(statWeekEntry.value).toFixed(1)}%</div>
            <div class="tour-story-unit">GREENS IN REGULATION</div>
            <div class="tour-story-note">Best GIR rate in the league this season</div>
          </div>
          <div class="stat-week-headshot" aria-hidden="true">${photoBig(statWeek)}</div>
        </article>

        <blockquote class="league-pulse-quote">
          <p>“Anthony has ${anthonyPulse.wins} wins…and ${anthonyBottomTwo} finishes of 5th or 6th. In ${anthonyExtremeFinishes} of ${anthonyPulse.results.length} events, he’s either won or finished in the bottom two.”</p>
        </blockquote>

        <div class="tour-duo-grid">
          <article class="tour-story detail-stat-card">
            <div class="tour-stat-kicker">Low Round of 2026</div>
            <div class="tour-story-display">${seasonBestRound.row.gross}</div>
            <div class="detail-stat-player">${seasonBestRound.player.first} ${seasonBestRound.player.last}</div>
            <div class="detail-stat-course">${roundCourseMap[seasonBestRound.round]?.replace('FOREST PARK - ','Forest Park · ').replace('TAPAWINGO - ','Tapawingo · ')||seasonBestRound.round}</div>
            <div class="tour-story-note">${roundDateMap[seasonBestRound.round]||seasonBestRound.round}</div>
          </article>

          ${recentCourseRecord?`<article class="tour-story detail-stat-card">
            <div class="tour-stat-kicker">Most Recent Course Record</div>
            <div class="tour-story-display">${recentCourseRecord.score}</div>
            <div class="detail-stat-player">${recentCourseRecord.player.first} ${recentCourseRecord.player.last}</div>
            <div class="detail-stat-course">${recentCourseRecord.course.name.replace('FOREST PARK - ','Forest Park · ').replace('TAPAWINGO - ','Tapawingo · ')}</div>
            <div class="tour-story-note">${recentCourseRecord.date}</div>
          </article>`:''}
        </div>

        <blockquote class="league-pulse-quote">
          <p>“Scott ranks ${ordinal(scottPuttingRank)} in putting and ${ordinal(scottDrivingRank)} in fairways hit…but ${scottGirPhrase} in GIR. Apparently the green is the least important part of his strategy.”</p>
        </blockquote>

        <article class="tour-story stat-week-card tour-story-fire fire-feature-card dark-green">
          <div class="stat-week-headshot fire-feature-headshot" aria-hidden="true">${photoBig(hot.player)}</div>
          <div class="stat-week-copy fire-feature-copy">
            <div class="tour-stat-kicker gold-text">Who's on Fire 🔥</div>
            <div class="tour-story-name">${hot.player.first} ${hot.player.last}</div>
            <div class="tour-story-display">${fmt(hot.points)}</div>
            <div class="tour-story-unit">PTS · LAST 3 EVENTS</div>
          </div>
        </article>

      </div>
    </section>

  </section>`;
}

function leaderboard(){
  const labs=completedSeasonPointRounds();
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">2026 season</div><h1>Leaderboard</h1></div><p>Season points, current HBT handicap, wins and gap to the leader.</p></div>
  <div class="tablebox"><table><thead><tr><th>Pos</th><th>Player</th><th>HCP</th><th>Wins</th><th>Points</th><th>Gap</th></tr></thead><tbody>
  ${currentSeasonStandings().map((entry,i)=>{const p=entry.player;return `<tr class="${i===0?'leadrow':''}"><td class="pos">${entry.pos}</td><td><div style="display:flex;align-items:center;gap:10px">${avatar(p)}<div><div class="pname">${p.last}</div><div class="sub">${p.initials}</div></div></div></td><td>${currentHcp(p).toFixed(2)}${hcpArrow(p)}</td><td>${playerSeason2026FromRounds(p.id).wins}</td><td class="pts">${fmt(entry.points)}</td><td>${i?'−'+fmt(currentSeasonStandings()[0].points-entry.points):'—'}</td></tr>`}).join('')}
  </tbody></table></div>
  <div class="section-spacer"></div><div class="pagehead"><div><div class="eyebrow">Round by round</div><h1 style="font-size:48px">Points ledger</h1></div></div>
  <div class="tablebox mobile-ledger"><table><thead><tr><th>Round</th>${['jb','cd','tf','rg','am','ss'].map(id=>`<th>${byId(id).initials}</th>`).join('')}</tr></thead><tbody>
  ${labs.map(r=>`<tr><td class="pname">${r}</td>${['jb','cd','tf','rg','am','ss'].map(id=>`<td>${roundPoints(r,id)??''}</td>`).join('')}</tr>`).join('')}
  <tr class="leadrow"><td class="pname">TOTAL</td>${['jb','cd','tf','rg','am','ss'].map(id=>`<td class="pts">${fmt(seasonCurrentPoints(id))}</td>`).join('')}</tr>
  </tbody></table></div></section>`;
}

function rounds(){
  const f=seasonConfig();
  const completed=seasonPointOrder()
    .filter(id=>(D.rounds?.[id]||[]).some(x=>x.gross!=null))
    .map(id=>({
      id,
      name:id===f.mc.id?f.mc.name:(f.ch.cards.find(card=>card.id===id)?.name||id)
    }))
    .reverse();

  const courseByRound=Object.fromEntries(Object.entries(D.roundMeta||{}).filter(([id,m])=>m?.course).map(([id,m])=>[id,m.course]));


  const years=[2026,2025,2024,2023,2022,2021];

  const blankScorecard=(label)=>`
    <section class="card round-scorecard blank-scorecard">
      <div class="round-scorecard-header">
        <div class="round-scorecard-header-top">
          <div class="round-scorecard-title-block">
            <div class="eyebrow">${label}</div>
            <h3>Course Name</h3>
            <div class="round-course-meta">
              <span class="round-tee-meta">
                <span class="tee-color-dot" aria-hidden="true"></span>
                <span>—</span>
              </span>
              <span>— | —</span>
              <span>PAR —</span>
            </div>
          </div>
        </div>
      </div>
      <div class="round-scorecard-table">
        <table>
          <thead><tr><th>Fin</th><th>Player</th><th>Gross</th><th>HCP</th><th>Adj</th></tr></thead>
          <tbody>
            ${Array.from({length:6},(_,i)=>`<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;

  const render2026=()=>`
    <div class="rounds-list scorecards-list">
      ${completed.map(s=>{
        const rr=D.rounds[s.id]
          .filter(x=>x.gross!=null)
          .sort((a,b)=>(a.fin??99)-(b.fin??99));
        const winner=rr.length?byId(rr[0].id):null;
        const courseName=courseByRound[s.id]||s.id;
        const specialCourseMeta={
          'CRESCENT FARMS - STALLION':{
            name:'CRESCENT FARMS - STALLION',
            tees:'—',
            rating:70.8,
            nineRating:35.4,
            slope:128
          }
        };
        const course=D.courses.find(c=>c.name===courseName)||specialCourseMeta[courseName];
        const parRow=rr.find(r=>Number.isFinite(Number(r.gross))&&Number.isFinite(Number(r.plus)));
        const par=parRow?Number(parRow.gross)-Number(parRow.plus):null;
        const is18=par!==null && par>40;
        const rating=course?(is18?course.rating:course.nineRating):null;

        return `<section class="card round-scorecard reveal">
          <div class="round-scorecard-header">
            <div class="round-scorecard-header-top">
              <div class="round-scorecard-title-block">
                <div class="eyebrow">${s.id==='MC'?(s.name||'Midseason Classic'):s.id==='CH1'?'CH1 · Front Nine':s.id==='CH2'?'CH2 · Back Nine':s.id==='CH3'?'CH3 · 18-Hole Total':s.id}</div>
                <h3>${prettyCourseName(courseName)}</h3>
                <div class="round-course-meta">
                  <span class="round-tee-meta">
                    <span class="tee-color-dot" data-tee="${course?.tees||''}" aria-hidden="true"></span>
                    <span>${course?.tees||'—'}</span>
                  </span>
                  <span>${typeof rating==='number'?rating.toFixed(2):'—'} | ${course?.slope??'—'}</span>
                  <span>PAR ${par??'—'}</span>
                </div>
              </div>
              ${winner?`<span class="badge gold">Winner · ${winner.last}</span>`:''}
            </div>
          </div>
          <div class="round-scorecard-table">
            <table>
              <thead><tr><th>Fin</th><th>Player</th><th>Gross</th><th>HCP</th><th>Adj</th></tr></thead>
              <tbody>
                ${rr.map(r=>{
                  const p=byId(r.id);
                  return `<tr class="${r.fin===1?'leadrow':''}">
                    <td class="pos">${r.fin??'—'}</td>
                    <td class="player-cell">${p.last}</td>
                    <td>${r.gross}</td>
                    <td>${Number(r.hcp).toFixed(2)}</td>
                    <td class="pts">${Number(r.adj).toFixed(2)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </section>`;
      }).join('')}
    </div>`;

  const renderBlankYear=(year)=>`
    <div class="rounds-list scorecards-list">
      ${Array.from({length:18},(_,i)=>{
        const label=i<16?`R${i+1}`:i===16?'Midseason Classic':'HBT Championship';
        return blankScorecard(label);
      }).join('')}
    </div>`;

  return `<section class="page scorecards-page">
    <div class="pagehead scorecards-pagehead">
      <div>
        <div class="eyebrow">Season Archive</div>
        <h1>Scorecards</h1>
      </div>
      <p>Click on year to view scorecard records.</p>
    </div>

    <div class="scorecard-year-wrap" aria-label="Scorecard seasons">
      <div class="scorecard-year-nav" id="scorecardYearNav">
        ${years.map(y=>`
          <button class="scorecard-year ${y===2026?'active':''}"
                  type="button"
                  data-scorecard-year="${y}"
                  aria-current="${y===2026?'page':'false'}">
            <span>${String(y).slice(-2)}’</span>
            <small>${y===2026?'Current':'Season'}</small>
          </button>`).join('')}
      </div>
    </div>

    <div class="scorecard-year-stage">
      ${years.map(y=>`
        <section class="scorecard-year-panel ${y===2026?'active':''}" data-scorecard-panel="${y}">
          ${y===2026?render2026():renderBlankYear(y)}
        </section>`).join('')}
    </div>
  </section>`;
}
function scorecardTable(roundId){
  const rr=D.rounds[roundId].filter(x=>x.gross!=null).sort((a,b)=>a.fin-b.fin);
  return `<div class="tablebox mobile-scorecard" style="border:0"><table><thead><tr><th>Fin</th><th>Player</th><th>Gross</th><th>+/-</th><th>HCP</th><th>Adjusted</th></tr></thead><tbody>${rr.map(r=>{let p=byId(r.id);return `<tr class="${r.fin===1?'leadrow':''}"><td class="pos">${r.fin}</td><td><div style="display:flex;gap:10px;align-items:center">${avatar(p)}<b>${p.last}</b></div></td><td>${r.gross}</td><td>+${r.plus}</td><td>${Number(r.hcp).toFixed(2)}</td><td class="pts">${Number(r.adj).toFixed(2)}</td></tr>`}).join('')}</tbody></table></div>`;
}

function players(){
  const field=currentSeasonStandings();
  const p=field[0]?.player||D.players[0];
  return `<section class="page players-hub-page">
    <div class="pagehead players-pagehead">
      <div><div class="eyebrow">The Field</div><h1>Players</h1></div>
      <p>Select a player to view their 2026 statistics, handicap history and career records.</p>
    </div>

    <div class="player-head-nav" id="playerHeadNav">
      ${field.map((entry,i)=>{
        const pl=entry.player;
        return `<button type="button" class="player-head-button ${i===0?'active':''}" data-player-id="${pl.id}" aria-current="${i===0?'page':'false'}">
          ${avatar(pl)}
          <span class="player-head-place">${ordinal(entry.pos)}</span>
        </button>`;
      }).join('')}
    </div>

    <div id="playerHubContent">${playerPageContent(p.id)}</div>
  </section>`;
}

function shortCourseName(name){
  if(!name) return '';
  return String(name)
    .replace(/\s*-\s*/g,' ')
    .toLowerCase()
    .replace(/\b\w/g,c=>c.toUpperCase())
    .replace('Golf Club','GC');
}

function handicapCalculator(p){
  return `<div class="card"><div class="pad"><div class="eyebrow">Handicap calculator</div><h2 class="display" style="font-size:42px;margin:6px 0">Best 8 of last 20 rounds</h2><p class="caption">Green checks show the eight score differentials currently counting toward ${p.last}'s HBT handicap.</p></div>
  <div class="tablebox mobile-calculator" style="border:0"><table class="calculator"><thead><tr><th>Rd</th><th>Date</th><th>Course</th><th>Counts</th><th>Score</th><th>SC Diff</th></tr></thead><tbody>
    ${handicapLast20(p).map(r=>`<tr class="${r.counts?'leadrow':''}"><td>${r.rd}</td><td>${r.date}</td><td>${shortCourseName(r.course)}</td><td class="counts">${r.counts?'<span class="count-badge">✓</span>':''}</td><td>${r.score}</td><td>${r.diff.toFixed(2)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

function careerScoreRows(p){
  return playerHistory(p).filter(r=>Number.isFinite(Number(r.gross)) && r.course);
}

function courseBook(){
  return D.courses.map(course=>{
    const personal=D.players.map(player=>{
      const scores=careerScoreRows(player)
        .filter(r=>r.course===course.name)
        .map(r=>Number(r.gross))
        .filter(Number.isFinite);
      return scores.length?{id:player.id,score:Math.min(...scores)}:null;
    }).filter(Boolean).sort((a,b)=>a.score-b.score || byId(a.id).last.localeCompare(byId(b.id).last));
    const record=personal.length?personal[0].score:null;
    const holders=record==null?[]:personal.filter(x=>x.score===record).map(x=>byId(x.id).last);
    return {...course,record,holders,personal};
  });
}

function careerStats(p){
  const scored=careerScoreRows(p);
  const grosses=scored.map(r=>Number(r.gross)).filter(Number.isFinite);
  const diffs=scored.map(r=>Number(r.diff)).filter(Number.isFinite);
  const hcps=playerHistory(p).map(r=>Number(r.hcp)).filter(v=>Number.isFinite(v)&&v>0);
  const records=courseBook().filter(c=>c.holders.includes(p.last)).length;
  return {
    rounds:scored.length,
    lowGross:grosses.length?Math.min(...grosses):null,
    avgGross:grosses.length?grosses.reduce((a,b)=>a+b,0)/grosses.length:null,
    lowestHcp:hcps.length?Math.min(...hcps):null,
    bestDiff:diffs.length?Math.min(...diffs):null,
    courseRecords:records
  };
}

function playerBestRounds(playerId){
  const p=byId(playerId);
  return careerScoreRows(p)
    .filter(r=>Number.isFinite(Number(r.diff)))
    .sort((a,b)=>Number(a.diff)-Number(b.diff) || Number(a.gross)-Number(b.gross) || String(a.iso).localeCompare(String(b.iso)))
    .slice(0,10)
    .map(r=>({course:r.course,date:r.date,gross:Number(r.gross),diff:Number(r.diff)}));
}

function leagueHistory(){
  const all=D.players.flatMap(player=>careerScoreRows(player).map(r=>({...r,player})));
  const withDiff=all.filter(r=>Number.isFinite(Number(r.diff)));
  const nineHole=all.filter(r=>Number.isFinite(Number(r.nineRating)) && Number(r.nineRating)>0);
  const rankRows=(rows,key,dir='asc')=>rows.slice().sort((a,b)=>{
    const av=Number(a[key]),bv=Number(b[key]);
    return dir==='asc'?(av-bv || a.player.last.localeCompare(b.player.last)):(bv-av || a.player.last.localeCompare(b.player.last));
  }).slice(0,15).map((r,i)=>({rank:i+1,player:r.player.last,stat:Number(r[key]),course:shortCourseName(r.course),date:r.date}));

  const allowed=new Set(D.courses.map(c=>c.name));
  const hardest=D.courses.map(c=>{
    const rows=nineHole.filter(r=>r.course===c.name && allowed.has(r.course));
    const grosses=rows.map(r=>Number(r.gross)).filter(Number.isFinite);
    return grosses.length?{course:shortCourseName(c.name),avg:grosses.reduce((a,b)=>a+b,0)/grosses.length,rounds:grosses.length}:null;
  }).filter(Boolean).sort((a,b)=>b.avg-a.avg).map((r,i)=>({rank:i+1,...r}));

  return {
    bestRounds:rankRows(withDiff,'diff','asc'),
    lowestGross:rankRows(nineHole,'gross','asc'),
    worstRounds:rankRows(nineHole,'gross','desc'),
    hardestCourses:hardest
  };
}

function player2026RoundOrder(){
  const regular=seasonRegularRoundIds();
  const f=seasonConfig();
  return [...regular.slice(0,10),f.mc.id,...regular.slice(10),...f.ch.cards.map(card=>card.id)]
    .filter(round=>(D.rounds?.[round]||[]).some(r=>r.gross!=null));
}

function playerResultRoundLabel(round){
  // Tables use the official abbreviation MC for the Midseason Classic.
  return round;
}

function playerResultPointsKey(round){
  return round;
}

function playerSeason2026FromRounds(playerId){
  const results=player2026RoundOrder().map(round=>{
    const row=(D.rounds[round]||[]).find(r=>r.id===playerId);
    if(!row || row.gross==null) return null;
    return {
      round,
      gross:Number(row.gross),
      adj:row.adj==null?null:Number(row.adj),
      fin:row.fin==null?null:Number(row.fin),
      plus:row.plus==null?null:Number(row.plus),
      hcp:row.hcp==null?null:Number(row.hcp),
      points:roundPoints(round,playerId)??0
    };
  }).filter(Boolean);
  return {...seasonMetricsFor(playerId),results};
}

function playerPageContent(id){
  const p=byId(id)||currentSeasonStandings()[0]?.player||D.players[0];
  const s=playerSeason2026FromRounds(p.id);
  const c=careerStats(p);
  const standing=seasonStandingFor(p.id)||{pos:'—',points:0};
  const seasonHcpPoints=handicapTrend(p).filter(x=>String(x.iso||'').startsWith('2026-'));
  const seasonStartHcp=seasonHcpPoints.length?Number(seasonHcpPoints[0].value):currentHcp(p);
  const seasonHcpChange=currentHcp(p)-seasonStartHcp;
  const seasonHcpChangeText=`${seasonHcpChange>0?'+':''}${seasonHcpChange.toFixed(2)}`;

  const seasonCards = `
    <div class="season-card-grid">
      <div class="card pad"><div class="kicker">2026 Position</div><div class="metric">${standing.pos}</div><div class="caption">${ordinal(standing.pos)} of 6</div></div>
      <div class="card pad"><div class="kicker">Average Finish</div><div class="metric">${s.avgFinish?.toFixed(2)??'—'}</div><div class="caption">2026 season</div></div>
      <div class="card pad"><div class="kicker">Average to Par</div><div class="metric">+${Number(s.avgToPar).toFixed(1)}</div><div class="caption">2026 season</div></div>
      <div class="card pad dark handicap-change-card"><div class="kicker">2026 Handicap Change</div><div class="metric">${seasonHcpChangeText}</div><div class="caption">Since first 2026 index</div></div>
    </div>`;

  const resultStrip = `
    <div class="season-result-strip">
      ${s.results.map(r=>`<div class="finish-pill ${r.fin===1?'win':(r.fin<=3?'top3':'')}"><b>${r.fin}${r.fin===1?'st':r.fin===2?'nd':r.fin===3?'rd':'th'}</b><span>${playerResultRoundLabel(r.round)}</span></div>`).join('')}
    </div>`;

  const seasonTable = `
    <div class="season-history tablebox">
      <table><thead><tr><th>Round</th><th>Gross</th><th>Adj</th><th>Finish</th><th>Points</th></tr></thead><tbody>
      ${s.results.map(r=>`<tr class="${r.fin===1?'leadrow':''}"><td class="pname">${playerResultRoundLabel(r.round)}</td><td>${r.gross}</td><td>${r.adj!==null?r.adj.toFixed(2):'—'}</td><td>${r.fin??'—'}</td><td class="pts">${r.points??0}</td></tr>`).join('')}
      </tbody></table>
    </div>`;

  const careerCards = `
    <div class="career-card-grid">
      <div class="card pad"><div class="kicker">Career Rounds</div><div class="metric">${c.rounds}</div><div class="caption">All historical rounds available</div></div>
      <div class="card pad"><div class="kicker">Career Low Gross</div><div class="metric">${c.lowGross??'—'}</div><div class="caption">Best recorded score</div></div>
      <div class="card pad"><div class="kicker">Lowest HBT Handicap</div><div class="metric">${c.lowestHcp!==null?c.lowestHcp.toFixed(2):'—'}</div><div class="caption">Lowest recorded index</div></div>
      <div class="card pad dark course-records-held"><div class="kicker">Course Records Held</div><div class="metric">${c.courseRecords}</div><div class="caption">Current HBT course records</div></div>
    </div>`;

  const bestCareerRounds=playerBestRounds(p.id);
  const bestCareerRoundsTable = `
    <div class="card player-best-rounds-card">
      <div class="tablebox player-best-rounds-table">
        <table>
          <thead><tr class="green-header"><th>Rank</th><th>Course</th><th>Date</th><th>Gross</th><th>Diff</th></tr></thead>
          <tbody>
            ${bestCareerRounds.map((r,i)=>`<tr>
              <td class="pos">${i+1}</td>
              <td class="pname">${shortCourseName(r.course)}</td>
              <td>${r.date}</td>
              <td>${r.gross}</td>
              <td class="pts">${Number(r.diff).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  return `<div class="player-hub-content">

    <div class="profilehero premium-profile reveal">
      ${photoBig(p)}
      <div class="profile-name-block"><h1>${p.first} ${p.last}</h1><p>${ordinal(standing.pos)} place · ${fmt(standing.points)} points</p></div>
    </div>
    <div class="profile-headline-stats reveal">
      <div class="profile-headline-stat"><b>${fmt(standing.points)}</b><span>2026 Points</span></div>
      <div class="profile-headline-stat"><b>${s.wins}</b><span>2026 Wins</span></div>
      <div class="profile-headline-stat profile-hcp-stat"><b>${currentHcp(p).toFixed(2)}<span class="profile-large-hcp-arrow">${hcpArrow(p)}</span></b><span>HBT Handicap</span></div>
    </div>

    <section class="player-section reveal">
      <div class="player-section-head">
        <span class="section-label">2026 Season</span>
        <h2>2026 Performance</h2>
        <p>Only results and statistics from the current 2026 HBT season.</p>
      </div>
      ${seasonCards}
      <div class="section-spacer"></div>
      <div class="card pad">
        <div class="kicker">2026 Results</div>
        <h3 class="display" style="font-size:30px;margin:6px 0 12px">Round-by-round finishes</h3>
        ${resultStrip}
      </div>
      <div class="section-spacer"></div>
      ${seasonTable}
    </section>

    <section class="player-section reveal">
      <div class="player-section-head">
        <span class="section-label">2026 Season</span>
        <h2>2026 Statistics</h2>
        <p>Current-season GIR, driving accuracy and putting, with the player's rank among all six HBT golfers.</p>
      </div>
      <div class="player-2026-stats">
        <div class="player-2026-stat">
          <div><div class="stat-name">Greens in Regulation</div><div class="stat-rank">${ordinal(metricRank(p.id,'gir','max'))} of 6</div></div>
          <div><div class="stat-value">${Number(s.gir).toFixed(1)}%</div><div class="stat-progress"><i data-width="${Math.min(Number(s.gir)*2,100)}"></i></div></div>
        </div>
        <div class="player-2026-stat">
          <div><div class="stat-name">Driving Accuracy</div><div class="stat-rank">${ordinal(metricRank(p.id,'driving','max'))} of 6</div></div>
          <div><div class="stat-value">${Number(s.driving).toFixed(1)}%</div><div class="stat-progress"><i data-width="${Math.min(Number(s.driving),100)}"></i></div></div>
        </div>
        <div class="player-2026-stat">
          <div><div class="stat-name">Putts per 9</div><div class="stat-rank">${ordinal(metricRank(p.id,'putts','min'))} of 6</div></div>
          <div><div class="stat-value">${Number(s.putts).toFixed(2)}</div><div class="stat-progress"><i data-width="${Math.min((Number(s.putts)/20)*100,100)}"></i></div></div>
        </div>
      </div>
    </section>

    <section class="player-section reveal">
      <div class="player-section-head handicap">
        <span class="section-label">HBT Handicap</span>
        <h2>Handicap History & Calculation</h2>
        <p>Handicap data can span multiple seasons. It is intentionally separated from 2026-only statistics.</p>
      </div>
      <div class="handicap-moment reveal">
        <div class="hcp-number"><span>${currentHcp(p).toFixed(2)}</span><span class="history-mini-arrow">${hcpArrow(p)}</span></div>
        <div class="hcp-label">Current HBT Handicap</div>
      </div>
      <div class="hc-grid">
        <div class="card trend-card reveal">
          <div class="eyebrow">Handicap trend</div>
          
          ${trendSvg(handicapTrend(p),p.last+' HCP')}
        </div>
        ${handicapCalculator(p)}
      </div>
    </section>

    <section class="player-section reveal">
      <div class="player-section-head career">
        <span class="section-label">Career · All-Time</span>
        <h2>Career Statistics</h2>
        <p>Calculated from all historical scoring and handicap data currently available in the HBT workbook.</p>
      </div>
      ${careerCards}
    </section>

    <section class="player-section player-best-rounds-section reveal">
      <div class="player-section-head career">
        <h2>Top 10 Best Rounds Ever</h2>
        <p>Ranked by score differential, with gross score shown for context.</p>
      </div>
      ${bestCareerRoundsTable}
    </section>
  </div>`;
}

function playerPage(id){ return playerPageContent(id); }

function handicaps(){
  const ranked=[...D.players].sort((a,b)=>currentHcp(a)-currentHcp(b));

  const detailFor=p=>`
    <div class="handicap-accordion-detail" id="hcp-detail-${p.id}" data-handicap-detail="${p.id}" aria-hidden="true">
      <div class="handicap-accordion-detail-inner">
        <div class="hc-grid handicap-page-hc-grid">
          <div class="card trend-card handicap-page-trend-card">
            <div class="eyebrow">Handicap trend</div>
            ${trendSvg(handicapTrend(p),p.last+' HCP')}
          </div>
          ${handicapCalculator(p)}
        </div>
      </div>
    </div>`;

  return `<section class="page handicaps-page">
    <div class="pagehead">
      <div><div class="eyebrow">Handicap center</div><h1>HBT Handicaps</h1></div>
      <p>Tap a player to view handicap history and the current calculation.</p>
    </div>

    <div class="handicap-accordion-list">
      ${ranked.map((p,i)=>`
        <div class="handicap-accordion-item">
          <button
            type="button"
            class="card statcard handicap-accordion-trigger"
            data-handicap-player="${p.id}"
            aria-expanded="false"
            aria-controls="hcp-detail-${p.id}">
            <div class="statrow" style="border-top:0">
              <div class="rank">${i+1}</div>
              ${avatar(p)}
              <div class="handicap-row-player">
                <b>${p.last}</b>
                <div class="sub handicap-expand-copy"><span class="expand-copy-open">Click to expand</span><span class="expand-copy-close">Click to collapse</span></div>
              </div>
              <div class="value handicap-value-left-arrow">
                <span class="handicap-arrow-left">${hcpArrow(p)}</span>
                <span>${currentHcp(p).toFixed(2)}</span>
              </div>
              <span class="handicap-expand-indicator" aria-hidden="true"></span>
            </div>
          </button>
          ${detailFor(p)}
        </div>`).join('')}
    </div>

    <div class="section-spacer handicap-compare-spacer"></div>

    <div class="card">
      <div class="pad">
        <div class="eyebrow">Handicap comparison chart</div>
        <h2 class="display" style="font-size:42px;margin:6px 0">Head-to-head strokes</h2>
        <p class="caption">Positive values mean the row player gives strokes to the column player; negative values mean the row player receives strokes.</p>
      </div>
      ${compareChart()}
    </div>
  </section>`;
}
function compareChart(){
  const order=['jb','cd','tf','rg','am','ss'].map(byId).filter(Boolean);
  const rows=[['v',...order.map(p=>p.initials)],...order.map(rowP=>[
    rowP.initials,
    ...order.map(colP=>rowP.id===colP.id?'-':Number((currentHcp(colP)-currentHcp(rowP)).toFixed(2)))
  ])];
  return `<div class="mobile-compare" style="padding:0 18px 22px"><div class="compare-grid">${rows.map((row,r)=>row.map((v,c)=>{
    let cls=(r===0||c===0)?'compare-head':(v==='-'?'compare-zero':(Number(v)>0?'compare-pos':'compare-neg'));
    return `<div class="compare-cell ${cls}">${v===null?'':(typeof v==='number'?v.toFixed(2):v)}</div>`;
  }).join('')).join('')}</div></div>`;
}

function statLeadText(metric,leader,runnerUp){
  const gap=Math.abs(Number(leader.value)-Number(runnerUp.value));
  if(metric==='gir' || metric==='driving'){
    const n=gap.toFixed(1).replace(/\.0$/,'');
    return `Leading by ${n} ${Number(n)===1?'point':'points'}`;
  }
  if(metric==='wins'){
    const n=Math.round(gap);
    return `Leading by ${n} ${n===1?'win':'wins'}`;
  }
  if(metric==='putts'){
    const n=gap.toFixed(2).replace(/0$/,'').replace(/\.0$/,'');
    return `Leading by ${n} ${Number(n)===1?'stroke':'strokes'}`;
  }
  if(metric==='avgToPar'){
    const n=gap.toFixed(1).replace(/\.0$/,'');
    return `Leading by ${n} ${Number(n)===1?'stroke':'strokes'}`;
  }
  if(metric==='lowGross'){
    const n=Math.round(gap);
    return `Leading by ${n} ${n===1?'stroke':'strokes'}`;
  }
  return '';
}

function rankedCard(metric,title,format,dir='max'){
  const arr=seasonRanked(metric,dir);
  const leader=arr[0];
  const runnerUp=arr[1];
  const rest=arr.slice(1);
  const leadText=statLeadText(metric,leader,runnerUp);
  return `<div class="card statcard reveal stats-table-reveal">
    <div class="stat-feature">
      <div class="stat-header"><div class="eyebrow">${title}</div></div>
      <div class="statrow statrow-leader"><div class="rank">1</div>${avatar(leader.player)}<div class="stat-player-name"><b>${leader.player.last}</b><div class="sub stat-lead-margin">${leadText}</div></div><div class="value">${format(leader.value)}</div></div>
    </div>
    ${rest.map((entry,i)=>`<div class="statrow"><div class="rank">${i+2}</div>${avatar(entry.player)}<div class="stat-player-name"><b>${entry.player.last}</b></div><div class="value">${format(entry.value)}</div></div>`).join('')}
  </div>`;
}


function leagueRoundHistoryTable(title,subtitle,rows,statLabel,statFormat){
  const leader=rows[0];
  const rest=rows.slice(1);
  const playerFor=row=>D.players.find(p=>p.last===row.player);

  const roundRow=(r,i,leaderRow=false)=>{
    const p=playerFor(r);
    return `<div class="statrow ${leaderRow?'statrow-leader':''} league-history-statrow">
      <div class="rank">${r.rank}</div>
      ${p?avatar(p):'<div class="history-avatar-placeholder"></div>'}
      <div class="stat-player-name history-stat-copy">
        <b>${r.player}</b>
        <div class="sub stat-lead-margin history-stat-meta">${r.course} · ${r.date}</div>
      </div>
      <div class="value history-stat-value">${statFormat(r.stat)}</div>
    </div>`;
  };

  return `<div class="card statcard reveal stats-table-reveal league-statcard">
    <div class="stat-feature">
      <div class="stat-header">
        <div class="eyebrow">${title}</div>
        <div class="sub league-stat-description">${subtitle}</div>
      </div>
      ${roundRow(leader,0,true)}
    </div>
    ${rest.map((r,i)=>roundRow(r,i+1,false)).join('')}
  </div>`;
}

function hardestCoursesTable(rows){
  const leader=rows[0];
  const rest=rows.slice(1);

  const courseRow=(r,leaderRow=false)=>`<div class="statrow ${leaderRow?'statrow-leader':''} league-history-statrow hardest-course-statrow">
    <div class="rank">${r.rank}</div>
    <div class="stat-player-name history-stat-copy">
      <b>${r.course}</b>
      <div class="sub stat-lead-margin history-stat-meta">${r.rounds} recorded rounds</div>
    </div>
    <div class="value history-stat-value">${Number(r.avg).toFixed(2)}</div>
  </div>`;

  return `<div class="card statcard reveal stats-table-reveal league-statcard">
    <div class="stat-feature">
      <div class="stat-header">
        <div class="eyebrow">Hardest Courses</div>
        <div class="sub league-stat-description">Average gross score across regular HBT 9-hole courses.</div>
      </div>
      ${courseRow(leader,true)}
    </div>
    ${rest.map(r=>courseRow(r,false)).join('')}
  </div>`;
}

function stats(){
  const history=leagueHistory();
  const seasonStats=`<div class="statgrid">${rankedCard('gir','Greens in Regulation',v=>v.toFixed(1)+'%')}${rankedCard('driving','Driving Accuracy',v=>v.toFixed(1)+'%')}${rankedCard('putts','Putting',v=>v.toFixed(2),'min')}${rankedCard('avgToPar','Average to Par',v=>'+'+v.toFixed(1),'min')}${rankedCard('wins','Season Wins',v=>String(v))}${rankedCard('lowGross','Low Gross Round',v=>String(v),'min')}</div>`;

  const leagueStats=`<div class="statgrid league-statgrid">
    ${leagueRoundHistoryTable(
      'Best Rounds All Time',
      '15 lowest scoring differentials in HBT history.',
      history.bestRounds,
      'Diff',
      v=>Number(v).toFixed(2)
    )}
    ${leagueRoundHistoryTable(
      'Lowest Gross Scores All Time',
      '15 lowest gross scores from 9-hole rounds.',
      history.lowestGross,
      'Gross',
      v=>String(v)
    )}
    ${leagueRoundHistoryTable(
      'Worst Rounds All Time',
      '15 highest gross scores from 9-hole rounds.',
      history.worstRounds,
      'Gross',
      v=>String(v)
    )}
    ${hardestCoursesTable(history.hardestCourses)}
  </div>`;

  return `<section class="page stats-page">
    <div class="pagehead stats-pagehead">
      <div>
        <div class="eyebrow">League Analytics</div>
        <h1 id="statsPageTitle">2026 Stats</h1>
        <p class="stats-view-instruction">Select between 2026 stats and historical league stats.</p>
      </div>
    </div>

    <div class="stats-view-toggle" role="tablist" aria-label="Stats view">
      <button type="button" class="stats-view-button active" data-stats-view="season" role="tab" aria-selected="true">2026 Stats</button>
      <button type="button" class="stats-view-button" data-stats-view="league" role="tab" aria-selected="false">League Stats</button>
    </div>

    <div class="stats-view-panel active" data-stats-panel="season">${seasonStats}</div>
    <div class="stats-view-panel" data-stats-panel="league">${leagueStats}</div>
  </section>`;
}

function records(){
  const prettyCourse=name=>String(name||'Course')
    .replace(/\s*-\s*/g,' ')
    .toLowerCase()
    .split(/\s+/)
    .map(word=>word ? word.charAt(0).toUpperCase()+word.slice(1) : word)
    .join(' ');

  const courses=courseBook().sort((a,b)=>
    prettyCourse(a.name).localeCompare(prettyCourse(b.name))
  );

  return `<section class="page records-page">
    <div class="pagehead stats-pagehead">
      <div>
        <div class="eyebrow">Course book</div>
        <h1>Course Records</h1>
        <p class="records-page-note">All-time HBT records and personal bests.</p>
      </div>
    </div>

    <div class="coursegrid records-grid">
      ${courses.map(c=>`<article class="card statcard record-course-card reveal">
        <div class="course-img ${c.imageClass||''}"></div>

        <div class="stat-header record-card-header">
          <h2>${prettyCourse(c.name)}</h2>
          <div class="record-meta-badge-row">
            <div class="round-course-meta record-course-meta">
              <span class="round-tee-meta">
                <span class="tee-color-dot" data-tee="${c.tees||''}" aria-hidden="true"></span>
                <span>${c.tees||'—'}</span>
              </span>
              <span>${typeof c.nineRating==='number'?c.nineRating.toFixed(2):'—'} | ${c.slope||'—'}</span>
              <span>PAR ${c.par??'—'}</span>
            </div>

            <span class="badge gold record-holder-badge">
              ${c.holders.length>1?'Holders':'Holder'} · ${c.holders.join(' & ')}
            </span>
          </div>
        </div>

        <div class="record-rank-header" aria-hidden="true">
          <span>Rank</span><span></span><span>Player</span><span>Best</span>
        </div>

        ${c.personal.slice(0,6).map((x,i)=>{
          const p=byId(x.id);
          const isRecord=Number(x.score)===Number(c.record);
          return `<div class="statrow record-statrow">
            <div class="rank">${i+1}</div>
            ${avatar(p)}
            <div class="stat-player-name"><b>${p.last}</b></div>
            <div class="value record-best-value">${x.score}</div>
          </div>`;
        }).join('')}
      </article>`).join('')}
    </div>
  </section>`;
}

function render(){
  const h=location.hash.slice(1)||'home';
  document.body.classList.toggle('home-route',h==='home');

  let html;
  if(h==='home') html=home();
  else if(h==='rounds') html=rounds();
  else if(h==='players') html=players();
  else if(h.startsWith('player/')) html=playerPage(h.split('/')[1]);
  else if(h==='handicaps') html=handicaps();
  else if(h==='stats') html=stats();
  else if(h==='records') html=records();
  else html=home();

  document.querySelector('#app').innerHTML=html;
  window.scrollTo(0,0);
}




function initTitleRaceAccordions(){
  const root=document.querySelector('.title-race-leaderboard');
  if(!root) return;

  const entries=[...root.querySelectorAll('[data-title-race-entry]')];
  const closeAll=()=>{
    entries.forEach(entry=>{
      entry.classList.remove('is-open');
      const trigger=entry.querySelector('[data-title-race-toggle]');
      const detail=entry.querySelector('[data-title-race-detail]');
      if(trigger) trigger.setAttribute('aria-expanded','false');
      if(detail) detail.setAttribute('aria-hidden','true');
    });
  };

  entries.forEach(entry=>{
    const trigger=entry.querySelector('[data-title-race-toggle]');
    const detail=entry.querySelector('[data-title-race-detail]');
    if(!trigger || !detail) return;

    const toggle=()=>{
      const alreadyOpen=entry.classList.contains('is-open');
      closeAll();
      if(alreadyOpen) return;
      entry.classList.add('is-open');
      trigger.setAttribute('aria-expanded','true');
      detail.setAttribute('aria-hidden','false');
    };

    trigger.addEventListener('click',toggle);
    trigger.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        toggle();
      }
    });
  });
}


function initScorecardYearNav(){
  const root=document.querySelector('.scorecards-page');
  if(!root) return;

  const buttons=[...root.querySelectorAll('button[data-scorecard-year]')];
  const panels=[...root.querySelectorAll('[data-scorecard-panel]')];
  if(!buttons.length || !panels.length) return;

  const years=buttons.map(btn=>Number(btn.dataset.scorecardYear));
  let currentYear=Number(buttons.find(btn=>btn.classList.contains('active'))?.dataset.scorecardYear)||2026;

  const showYear=(year)=>{
    year=Number(year);
    if(!years.includes(year)) return;
    currentYear=year;

    buttons.forEach(btn=>{
      const active=Number(btn.dataset.scorecardYear)===currentYear;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-current',active?'page':'false');
    });

    panels.forEach(panel=>{
      panel.classList.toggle('active',Number(panel.dataset.scorecardPanel)===currentYear);
    });
  };

  buttons.forEach(btn=>{
    btn.type='button';
    btn.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      showYear(btn.dataset.scorecardYear);
    };
  });

  showYear(currentYear);
}


function initPlayerHeadNav(){
  const root=document.querySelector('.players-hub-page');
  if(!root) return;
  const buttons=[...root.querySelectorAll('[data-player-id]')];
  const content=root.querySelector('#playerHubContent');
  if(!buttons.length || !content) return;

  const showPlayer=(id)=>{
    const p=byId(id);
    if(!p) return;
    buttons.forEach(btn=>{
      const active=btn.dataset.playerId===id;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-current',active?'page':'false');
    });
    content.innerHTML=playerPageContent(id);
    initPremiumMotion();
  };

  buttons.forEach(btn=>{
    btn.onclick=(e)=>{
      e.preventDefault();
      e.stopPropagation();
      showPlayer(btn.dataset.playerId);
    };
  });
}


function initHandicapAccordions(){
  const root=document.querySelector('.handicaps-page');
  if(!root) return;

  const triggers=[...root.querySelectorAll('[data-handicap-player]')];
  const details=[...root.querySelectorAll('[data-handicap-detail]')];
  if(!triggers.length) return;

  const closeAll=()=>{
    triggers.forEach(btn=>{
      btn.classList.remove('is-open');
      btn.setAttribute('aria-expanded','false');
    });
    details.forEach(detail=>{
      detail.classList.remove('is-open');
      detail.setAttribute('aria-hidden','true');
    });
  };

  triggers.forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();

      const id=btn.dataset.handicapPlayer;
      const alreadyOpen=btn.getAttribute('aria-expanded')==='true';

      closeAll();
      if(alreadyOpen) return;

      btn.classList.add('is-open');
      btn.setAttribute('aria-expanded','true');

      const detail=root.querySelector(`[data-handicap-detail="${id}"]`);
      if(detail){
        detail.classList.add('is-open');
        detail.setAttribute('aria-hidden','false');
      }
    });
  });
}


function initStatsViewToggle(){
  const root=document.querySelector('.stats-page');
  if(!root) return;

  const buttons=[...root.querySelectorAll('[data-stats-view]')];
  const panels=[...root.querySelectorAll('[data-stats-panel]')];
  const title=root.querySelector('#statsPageTitle');
  if(!buttons.length || !panels.length) return;

  const show=view=>{
    buttons.forEach(btn=>{
      const active=btn.dataset.statsView===view;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected',active?'true':'false');
    });
    panels.forEach(panel=>{
      panel.classList.toggle('active',panel.dataset.statsPanel===view);
    });
    if(title) title.textContent=view==='league'?'Historical League Stats':'2026 Stats';

    if(view==='league'){
      requestAnimationFrame(()=>initPremiumMotion());
    }
  };

  buttons.forEach(btn=>{
    btn.addEventListener('click',()=>show(btn.dataset.statsView));
  });

  show('season');
}

function initPremiumMotion(){
  const reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals=document.querySelectorAll('.reveal');
  if(reduce){
    reveals.forEach(el=>el.classList.add('is-visible'));
  }else if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          entry.target.querySelectorAll('.stat-progress i').forEach(bar=>{
            bar.style.width=(bar.dataset.width||0)+'%';
          });
          io.unobserve(entry.target);
        }
      });
    },{threshold:.12,rootMargin:'0px 0px -30px 0px'});
    reveals.forEach(el=>io.observe(el));
  }else{
    reveals.forEach(el=>el.classList.add('is-visible'));
  }

  document.querySelectorAll('.stat-progress i').forEach(bar=>{
    const parent=bar.closest('.reveal');
    if(!parent) bar.style.width=(bar.dataset.width||0)+'%';
  });
}


let heroStatusTimer=null;

function initHeroStatusRotation(){
  if(heroStatusTimer){
    clearInterval(heroStatusTimer);
    heroStatusTimer=null;
  }

  const el=document.querySelector('#heroStatusText');
  if(!el || !D.players || !D.players.length) return;

  const ordered=currentSeasonStandings();
  const leader=ordered[0];
  let index=0;

  const labels=ordered.map((entry,i)=>{
    const p=entry.player;
    if(i===0) return `${p.last} leads · ${fmt(entry.points)} pts`;
    const gap=leader.points-entry.points;
    return `${p.last} · ${fmt(gap)} behind`;
  });

  const showNext=()=>{
    index=(index+1)%labels.length;
    el.classList.add('is-changing');

    setTimeout(()=>{
      el.textContent=labels[index];
      el.classList.remove('is-changing');
    },420);
  };

  heroStatusTimer=setInterval(showNext,2800);
}









function ensureHeroVideoPlayback(){
  const video=document.getElementById('homeHeroVideo');
  if(!video) return;

  video.removeAttribute('controls');
  video.controls=false;
  video.muted=true;
  video.defaultMuted=true;
  video.autoplay=true;
  video.loop=true;
  video.playsInline=true;
  video.setAttribute('muted','');
  video.setAttribute('autoplay','');
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');

  const tryPlay=()=>{
    try{
      const p=video.play();
      if(p && typeof p.catch==='function'){
        p.catch(()=>{});
      }
    }catch(e){}
  };

  // Try immediately and again at each ready state Safari commonly uses.
  tryPlay();
  ['loadedmetadata','loadeddata','canplay','canplaythrough'].forEach(evt=>{
    video.addEventListener(evt,tryPlay,{once:true});
  });

  // Retry when returning to the page/app.
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden) tryPlay();
  });
  window.addEventListener('pageshow',tryPlay);

  // If iOS still blocks it, the first user interaction silently starts it.
  const unlock=()=>{
    tryPlay();
    window.removeEventListener('touchstart',unlock);
    window.removeEventListener('pointerdown',unlock);
  };
  window.addEventListener('touchstart',unlock,{passive:true});
  window.addEventListener('pointerdown',unlock,{passive:true});
}



let retailMenuInitialized=false;

function setRetailMenuOpen(open){
  const trigger=document.getElementById('retailMenuTrigger');
  const panel=document.getElementById('retailMenuPanel');
  if(!trigger || !panel) return;

  trigger.classList.toggle('is-open',open);
  panel.classList.toggle('is-open',open);
  trigger.setAttribute('aria-expanded',open?'true':'false');
  trigger.setAttribute('aria-label',open?'Close menu':'Open menu');
  panel.setAttribute('aria-hidden',open?'false':'true');
  panel.style.display='block';
  panel.style.visibility=open?'visible':'visible';
  panel.style.opacity=open?'1':'0';
  panel.style.pointerEvents=open?'auto':'none';
  document.documentElement.classList.toggle('retail-menu-open',open);
  document.body.classList.toggle('retail-menu-open',open);
}

function closeRetailMenu(){
  setRetailMenuOpen(false);
}

function setupRetailMenu(){
  if(retailMenuInitialized) return;

  const trigger=document.getElementById('retailMenuTrigger');
  const panel=document.getElementById('retailMenuPanel');
  if(!trigger || !panel) return;

  retailMenuInitialized=true;
  setRetailMenuOpen(false);

  trigger.addEventListener('click',()=>{
    const open=trigger.getAttribute('aria-expanded')==='true';
    setRetailMenuOpen(!open);
  });

  panel.querySelectorAll('a').forEach(link=>{
    link.addEventListener('click',()=>closeRetailMenu());
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closeRetailMenu();
  });
}

const baseRender=render;
render=function(){
  baseRender();
  closeRetailMenu();
  requestAnimationFrame(()=>{setupRetailMenu();initTitleRaceAccordions();initScorecardYearNav();initPlayerHeadNav();initHandicapAccordions();initStatsViewToggle();initPremiumMotion();initHeroStatusRotation();ensureHeroVideoPlayback();});
};
window.addEventListener('hashchange',render);
render();
