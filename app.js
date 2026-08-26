
const D = window.HBT_DATA;
const byId = id => D.players.find(p => p.id === id);
const fmt = n => Number(n || 0).toLocaleString();
const ordinal = n => n + (n===1?'st':n===2?'nd':n===3?'rd':'th');

function avatar(p, cls='mini-photo'){
  if(p.photo) return `<img class="${cls}" src="${p.photo}" alt="${p.last}">`;
  return `<div class="${cls} placeholder">${p.initials}</div>`;
}
function photoBig(p){
  if(p.photo) return `<img class="big-avatar" src="${p.photo}" alt="${p.last}">`;
  return `<div class="placeholder-big">${p.initials}</div>`;
}
function leader(metric, dir='max'){
  return [...D.players].sort((a,b)=>dir==='max'?b[metric]-a[metric]:a[metric]-b[metric])[0];
}
function metricRank(playerId,metric,dir='max'){
  const arr=[...D.players].sort((a,b)=>dir==='max'?b[metric]-a[metric]:a[metric]-b[metric]);
  return arr.findIndex(p=>p.id===playerId)+1;
}


function hcpArrow(p){
  const trend=p?.hc?.trend||[];
  if(trend.length<2) return '';
  const prev=Number(trend[trend.length-2].value);
  const curr=Number(trend[trend.length-1].value);
  if(!Number.isFinite(prev)||!Number.isFinite(curr)) return '';
  if(curr<prev-0.005) return '<span class="hcp-arrow hcp-down" aria-label="Handicap decreased">▼</span>';
  if(curr>prev+0.005) return '<span class="hcp-arrow hcp-up" aria-label="Handicap increased">▲</span>';
  return '';
}

function droppedPointRounds(playerId,labs){
  const format=D.seasonFormat||{};
  const dropCount=Number(format.droppedRegularRounds??2);
  const vals=labs
    .filter(r=>/^R(?:[1-9]|1[0-6])$/.test(r))
    .map((r,i)=>({r,i,v:Number(D.pointsByRound?.[r]?.[playerId])}))
    .filter(x=>Number.isFinite(x.v));
  vals.sort((a,b)=>a.v-b.v || a.i-b.i);
  return new Set(vals.slice(0,dropCount).map(x=>x.r));
}

function seasonConfig(){
  const f=D.seasonFormat||{};
  const regularPoints=[...(f.regularPointsByFinish||[1000,850,700,600,500,400])];
  const chRaw=f.championship||{};
  const defaultChampionshipResults=[
    {id:'CH-F9',name:'Championship Front 9',short:'CH F9'},
    {id:'CH-B9',name:'Championship Back 9',short:'CH B9'},
    {id:'CH-MAJOR',name:'Championship Major Result',short:'CH Maj'}
  ];
  const chResults=(Array.isArray(chRaw.results)&&chRaw.results.length?chRaw.results:defaultChampionshipResults)
    .map((result,i)=>({
      id:result.id||defaultChampionshipResults[i]?.id||`CH-${i+1}`,
      name:result.name||defaultChampionshipResults[i]?.name||`Championship Result ${i+1}`,
      short:result.short||defaultChampionshipResults[i]?.short||`CH ${i+1}`,
      points:[...(result.pointsByFinish||chRaw.pointsByFinishPerResult||chRaw.pointsByFinish||regularPoints)]
    }));

  return {
    regularRounds:Number(f.regularRounds||16),
    drops:Number(f.droppedRegularRounds??2),
    regularPoints,
    mc:{
      id:f.midseason?.id||'MC',
      name:f.midseason?.name||'Midseason Classic',
      points:[...(f.midseason?.pointsByFinish||[2000,1700,1400,1200,1000,800])]
    },
    ch:{
      id:chRaw.id||'CH',
      name:chRaw.name||'HBT Championship',
      results:chResults
    }
  };
}

function pointRoundComplete(roundId){
  const row=D.pointsByRound?.[roundId]||{};
  return Object.values(row).some(v=>v!==null && v!==undefined && Number.isFinite(Number(v)));
}

function seasonRegularRoundIds(){
  const f=seasonConfig();
  return Array.from({length:f.regularRounds},(_,i)=>`R${i+1}`);
}

function seasonPointRoundOrder(){
  const f=seasonConfig();
  const regular=seasonRegularRoundIds();
  return [
    ...regular.slice(0,10),
    f.mc.id,
    ...regular.slice(10),
    ...f.ch.results.map(r=>r.id)
  ];
}

function pointRoundDisplayLabel(roundId){
  const f=seasonConfig();
  if(roundId===f.mc.id) return 'MC';
  const ch=f.ch.results.find(r=>r.id===roundId);
  return ch?.short||roundId;
}

// Display-only Championship aggregation. The Championship still has three
// independent scoring results for title-race math and final season totals,
// but points ledgers show one CH row equal to Front 9 + Back 9 + Major Result.
function championshipAggregatePoints(playerId){
  const f=seasonConfig();
  const separate=f.ch.results
    .map(result=>D.pointsByRound?.[result.id]?.[playerId])
    .filter(v=>v!==null && v!==undefined && Number.isFinite(Number(v)))
    .map(Number);
  if(separate.length) return separate.reduce((sum,v)=>sum+v,0);

  const legacy=D.pointsByRound?.[f.ch.id]?.[playerId];
  return legacy!==null && legacy!==undefined && Number.isFinite(Number(legacy))
    ? Number(legacy)
    : null;
}

function seasonPointsDisplayRows(){
  const f=seasonConfig();
  const regular=seasonRegularRoundIds();
  const rows=[
    ...regular.slice(0,10).map(id=>({id,label:id,type:'round'})),
    {id:f.mc.id,label:'MC',type:'round'},
    ...regular.slice(10).map(id=>({id,label:id,type:'round'})),
    {id:f.ch.id,label:'CH',type:'championship'}
  ];

  return rows.map(row=>{
    if(row.type==='championship'){
      const anySeparate=f.ch.results.some(result=>pointRoundComplete(result.id));
      const legacyComplete=pointRoundComplete(f.ch.id);
      return {...row,complete:anySeparate||legacyComplete};
    }
    return {...row,complete:pointRoundComplete(row.id)};
  });
}

function displayPointsValue(row,playerId){
  if(row.type==='championship') return championshipAggregatePoints(playerId);
  const value=D.pointsByRound?.[row.id]?.[playerId];
  return value===null || value===undefined || !Number.isFinite(Number(value)) ? null : Number(value);
}

function championshipComplete(){
  const f=seasonConfig();
  return f.ch.results.length>0 && f.ch.results.every(r=>pointRoundComplete(r.id));
}

function completedSeasonEventCount(){
  const f=seasonConfig();
  const regularDone=seasonRegularRoundIds().filter(pointRoundComplete).length;
  const mcDone=pointRoundComplete(f.mc.id)?1:0;
  const chDone=championshipComplete()?1:0;
  return regularDone+mcDone+chDone;
}

function completedSeasonPointRounds(){
  return seasonPointRoundOrder().filter(pointRoundComplete);
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
    .map(r=>Number(D.pointsByRound?.[r]?.[playerId]))
    .filter(Number.isFinite);
}

function seasonCurrentPoints(playerId){
  const f=seasonConfig();
  let total=countedRegularPoints(currentRegularPointValues(playerId));

  if(pointRoundComplete(f.mc.id)){
    const v=Number(D.pointsByRound?.[f.mc.id]?.[playerId]);
    if(Number.isFinite(v)) total+=v;
  }

  let championshipLinesFound=false;
  f.ch.results.forEach(result=>{
    if(pointRoundComplete(result.id)){
      championshipLinesFound=true;
      const v=Number(D.pointsByRound?.[result.id]?.[playerId]);
      if(Number.isFinite(v)) total+=v;
    }
  });

  // Backward compatibility only: use the old aggregate CH row if no separate
  // Championship result lines exist in the imported snapshot.
  if(!championshipLinesFound && pointRoundComplete(f.ch.id)){
    const legacy=Number(D.pointsByRound?.[f.ch.id]?.[playerId]);
    if(Number.isFinite(legacy)) total+=legacy;
  }

  return total;
}

function currentSeasonStandings(){
  return D.players
    .map(player=>({player,points:seasonCurrentPoints(player.id)}))
    .sort((a,b)=>b.points-a.points || Number(a.player.pos)-Number(b.player.pos))
    .map((x,i)=>({...x,pos:i+1}));
}

function remainingSeasonEvents(){
  const f=seasonConfig();
  const regular=seasonRegularRoundIds().filter(r=>!pointRoundComplete(r));
  const chResults=f.ch.results.filter(r=>!pointRoundComplete(r.id));
  return {
    regular,
    mc:pointRoundComplete(f.mc.id)?null:f.mc.id,
    ch:chResults.length?f.ch.id:null,
    chResults
  };
}

function normalizeChampionshipFuture(chFuture){
  if(!chFuture) return {};
  if(Array.isArray(chFuture)){
    const f=seasonConfig();
    return Object.fromEntries(f.ch.results.map((r,i)=>[r.id,chFuture[i]]));
  }
  if(typeof chFuture==='object') return chFuture;
  return {};
}

function finalSeasonPoints(playerId,{regularFuture=[],mcFuture=null,chFuture=null}={}){
  const f=seasonConfig();
  const regular=[...currentRegularPointValues(playerId),...regularFuture.map(Number)];
  let total=countedRegularPoints(regular);

  if(pointRoundComplete(f.mc.id)){
    const v=Number(D.pointsByRound?.[f.mc.id]?.[playerId]);
    if(Number.isFinite(v)) total+=v;
  }else if(Number.isFinite(Number(mcFuture))){
    total+=Number(mcFuture);
  }

  const futureMap=normalizeChampionshipFuture(chFuture);
  let championshipLinesFound=false;
  f.ch.results.forEach(result=>{
    if(pointRoundComplete(result.id)){
      championshipLinesFound=true;
      const v=Number(D.pointsByRound?.[result.id]?.[playerId]);
      if(Number.isFinite(v)) total+=v;
    }else{
      const v=Number(futureMap[result.id]);
      if(Number.isFinite(v)) total+=v;
    }
  });

  if(!championshipLinesFound && !Object.keys(futureMap).length && pointRoundComplete(f.ch.id)){
    const legacy=Number(D.pointsByRound?.[f.ch.id]?.[playerId]);
    if(Number.isFinite(legacy)) total+=legacy;
  }

  return total;
}

function maxPointNotTaken(points,ownPlace){
  return Math.max(...points.filter((_,i)=>i!==ownPlace-1));
}

function ownFinishGuaranteesTitle(playerId,{regularPlaces=[],mcPlace=null,chPlaces=[]}={}){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const candidateCH=Object.fromEntries(rem.chResults.map((result,i)=>{
    const place=chPlaces[i]||6;
    return [result.id,result.points[place-1]];
  }));

  const candidate=finalSeasonPoints(playerId,{
    regularFuture:regularPlaces.map(place=>f.regularPoints[place-1]),
    mcFuture:rem.mc?f.mc.points[(mcPlace||6)-1]:null,
    chFuture:candidateCH
  });

  return D.players.filter(p=>p.id!==playerId).every(rival=>{
    const rivalRegular=rem.regular.map((_,i)=>
      maxPointNotTaken(f.regularPoints,regularPlaces[i]||6)
    );
    const rivalMC=rem.mc?maxPointNotTaken(f.mc.points,mcPlace||6):null;
    const rivalCH=Object.fromEntries(rem.chResults.map((result,i)=>[
      result.id,
      maxPointNotTaken(result.points,chPlaces[i]||6)
    ]));
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
  const candidateCH=Object.fromEntries(rem.chResults.map(result=>[
    result.id,
    result.points.at(-1)
  ]));
  const candidateMin=finalSeasonPoints(playerId,{
    regularFuture:rem.regular.map(()=>f.regularPoints.at(-1)),
    mcFuture:rem.mc?f.mc.points.at(-1):null,
    chFuture:candidateCH
  });

  return D.players.filter(p=>p.id!==playerId).every(rival=>{
    const rivalCH=Object.fromEntries(rem.chResults.map(result=>[
      result.id,
      result.points[0]
    ]));
    const rivalMax=finalSeasonPoints(rival.id,{
      regularFuture:rem.regular.map(()=>f.regularPoints[0]),
      mcFuture:rem.mc?f.mc.points[0]:null,
      chFuture:rivalCH
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
  const candidateCH=Object.fromEntries(rem.chResults.map(result=>[
    result.id,
    result.points[0]
  ]));
  const candidateMax=finalSeasonPoints(playerId,{
    regularFuture:rem.regular.map(()=>f.regularPoints[0]),
    mcFuture:rem.mc?f.mc.points[0]:null,
    chFuture:candidateCH
  });

  const rivals=D.players.filter(p=>p.id!==playerId);
  const remainingEvents=[
    ...rem.regular.map(id=>({id,type:'regular',points:f.regularPoints})),
    ...(rem.mc?[{id:rem.mc,type:'mc',points:f.mc.points}]:[]),
    ...rem.chResults.map(result=>({id:result.id,type:'ch',points:result.points}))
  ];

  if(!remainingEvents.length){
    return rivals.every(r=>candidateMax>=seasonCurrentPoints(r.id));
  }

  if(remainingEvents.length>3){
    const obviousElimination=rivals.some(r=>{
      const rivalCH=Object.fromEntries(rem.chResults.map(result=>[
        result.id,
        result.points.at(-1)
      ]));
      const rivalMin=finalSeasonPoints(r.id,{
        regularFuture:rem.regular.map(()=>f.regularPoints.at(-1)),
        mcFuture:rem.mc?f.mc.points.at(-1):null,
        chFuture:rivalCH
      });
      return rivalMin>candidateMax;
    });
    return !obviousElimination;
  }

  let matchIndex=remainingEvents.findIndex(e=>e.type==='ch');
  if(matchIndex<0) matchIndex=remainingEvents.findIndex(e=>e.type==='mc');
  const matchEvent=matchIndex>=0?remainingEvents.splice(matchIndex,1)[0]:null;

  const assignedRegular=Object.fromEntries(rivals.map(r=>[r.id,[]]));
  const assignedMC=Object.fromEntries(rivals.map(r=>[r.id,null]));
  const assignedCH=Object.fromEntries(rivals.map(r=>[r.id,{}]));

  const assignEvent=(event,perm)=>{
    rivals.forEach((r,i)=>{
      const pts=event.points[perm[i]];
      if(event.type==='regular') assignedRegular[r.id].push(pts);
      else if(event.type==='mc') assignedMC[r.id]=pts;
      else assignedCH[r.id][event.id]=pts;
    });
  };
  const unassignEvent=(event)=>{
    rivals.forEach(r=>{
      if(event.type==='regular') assignedRegular[r.id].pop();
      else if(event.type==='mc') assignedMC[r.id]=null;
      else delete assignedCH[r.id][event.id];
    });
  };

  const rivalBase=(r)=>finalSeasonPoints(r.id,{
    regularFuture:assignedRegular[r.id],
    mcFuture:assignedMC[r.id],
    chFuture:assignedCH[r.id]
  });

  const matchPossible=()=>{
    if(!matchEvent){
      return rivals.every(r=>rivalBase(r)<=candidateMax);
    }

    // The candidate is sweeping, so the five rivals are filling places 2–6.
    const thresholds=rivals.map(r=>candidateMax-rivalBase(r)).sort((a,b)=>a-b);
    const available=matchEvent.points.slice(1).sort((a,b)=>a-b);
    return available.every((pts,i)=>pts<=thresholds[i]+1e-9);
  };

  const search=(idx)=>{
    if(idx>=remainingEvents.length) return matchPossible();
    const event=remainingEvents[idx];
    for(const perm of TITLE_RACE_PERMS){
      assignEvent(event,perm);
      if(search(idx+1)){unassignEvent(event);return true;}
      unassignEvent(event);
    }
    return false;
  };

  return search(0);
}

function titleGuaranteePath(playerId){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const regularPlaces=rem.regular.map(()=>1);
  const mcPlace=rem.mc?1:null;

  if(rem.chResults.length){
    const combos=[];
    const walk=(arr)=>{
      if(arr.length===rem.chResults.length){
        if(ownFinishGuaranteesTitle(playerId,{regularPlaces,mcPlace,chPlaces:arr})){
          const earned=arr.reduce((sum,place,i)=>sum+rem.chResults[i].points[place-1],0);
          combos.push({places:[...arr],earned});
        }
        return;
      }
      for(let place=1;place<=6;place++) walk([...arr,place]);
    };
    walk([]);
    if(!combos.length) return null;

    // Choose the weakest performance that still guarantees the title.
    combos.sort((a,b)=>
      a.earned-b.earned ||
      b.places.reduce((x,y)=>x+y,0)-a.places.reduce((x,y)=>x+y,0)
    );
    return {regularPlaces,mcPlace,chPlaces:combos[0].places};
  }

  return ownFinishGuaranteesTitle(playerId,{regularPlaces,mcPlace,chPlaces:[]})
    ? {regularPlaces,mcPlace,chPlaces:[]}
    : null;
}

function titleRaceMaxPoints(playerId){
  const f=seasonConfig();
  const rem=remainingSeasonEvents();
  const chFuture=Object.fromEntries(rem.chResults.map(result=>[
    result.id,
    result.points[0]
  ]));
  return finalSeasonPoints(playerId,{
    regularFuture:rem.regular.map(()=>f.regularPoints[0]),
    mcFuture:rem.mc?f.mc.points[0]:null,
    chFuture
  });
}

function titleRaceActionText(){
  const rem=remainingSeasonEvents();
  const actions=[];
  if(rem.regular.length===1) actions.push(rem.regular[0]);
  else if(rem.regular.length>1) actions.push(rem.regular.join(' and '));
  if(rem.mc) actions.push('the Midseason Classic');
  if(rem.chResults.length===3) actions.push('all three HBT Championship results');
  else if(rem.chResults.length) actions.push(rem.chResults.map(r=>r.name).join(', '));
  if(!actions.length) return 'the completed season';
  if(actions.length===1) return actions[0];
  if(actions.length===2) return `${actions[0]} and ${actions[1]}`;
  return `${actions.slice(0,-1).join(', ')}, and ${actions.at(-1)}`;
}

function championshipGuaranteeText(places){
  if(!places?.length) return '';
  const sorted=[...places].sort((a,b)=>a-b);
  if(places.length===3 && sorted[0]===1 && sorted[1]===1){
    const other=sorted[2];
    return other===1
      ? 'sweep the Front 9, Back 9, and Major Result'
      : `win any two of the three Championship results and finish ${ordinal(other)} or better in the other`;
  }
  const f=seasonConfig();
  return places.map((place,i)=>{
    const name=f.ch.results[i]?.name?.replace('Championship ','')||`Result ${i+1}`;
    return place===1?`win the ${name}`:`finish ${ordinal(place)} or better in the ${name}`;
  }).join(', ');
}

function missedRegularRounds(playerId){
  return seasonRegularRoundIds().filter(roundId=>{
    const row=(D.rounds?.[roundId]||[]).find(r=>r.id===playerId);
    return !row || row.gross==null;
  });
}

function buildTitleRace(){
  const standings=currentSeasonStandings();
  const leader=standings[0];
  const rem=remainingSeasonEvents();
  const map={};

  standings.forEach(entry=>{
    const p=entry.player;
    const gap=Math.max(0,leader.points-entry.points);
    const missed=missedRegularRounds(p.id);

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
      const path=championshipGuaranteeText(guarantee.chPlaces);
      let intro=gap===0
        ? `${p.first} leads the standings by ${fmt(standings[0].points-standings[1].points)} points.`
        : `${p.first} sits just ${fmt(gap)} points behind ${leader.player.first}.`;

      if(p.id==='cd'){
        intro=`Corey leads by a microscopic ${fmt(standings[0].points-standings[1].points)} points, which is unfortunately enough for him to act like he has already won something.`;
      }else if(p.id==='tf'){
        intro=`Tony is only ${fmt(gap)} points back and arrives in Orlando with the title completely within reach.`;
      }

      map[p.id]={
        status:'controls',
        label:'CONTROLS DESTINY',
        blurb:`${intro} Because the Championship has three separate 1,000-point result lines, his clean guaranteed path is to ${path}. Do that and nobody else can catch him.`
      };
      return;
    }

    const alive=canWinTitleIfSweeps(p.id);
    if(alive){
      const max=titleRaceMaxPoints(p.id);
      let blurb=`${p.first} is ${fmt(gap)} points back but still alive. A sweep of the Championship's Front 9, Back 9, and Major Result would take him to ${fmt(max)} points, but he still needs the leaders to give some points back.`;

      if(p.id==='am'){
        blurb=`Anthony is ${fmt(gap)} points off the lead and still has a very real path. A full three-result Championship sweep gets him to ${fmt(max)} points; from there he needs Corey and Tony to stumble somewhere across the Front 9, Back 9, or Major Result.`;
      }else if(p.id==='rg'){
        blurb=`Rick is ${fmt(gap)} points back, so subtlety is over. He needs a huge Championship—ideally piling up wins across all three result lines—and some cooperation from the guys ahead of him. His ceiling is ${fmt(max)} points.`;
      }else if(p.id==='ss'){
        blurb=`Scott is ${fmt(gap)} points behind, but three separate Championship payouts keep the door cracked open. He can still reach ${fmt(max)} with a sweep; anything less means he needs an increasingly ridiculous amount of help above him.`;
      }

      map[p.id]={
        status:'needs-help',
        label:'NEEDS HELP',
        blurb
      };
      return;
    }

    let eliminated=`${p.first} has been mathematically eliminated from the HBT title race. Even sweeping all three Championship results would max him out at ${fmt(titleRaceMaxPoints(p.id))} points.`;
    if(p.id==='jb'){
      const mia=missed.length?` He was MIA for ${missed.join(' and ')}, which did not help the math.`:'';
      eliminated=`Josh is out of the title race, but the ending is a lot less cruel than the standings make it look.${mia} Even a perfect 3,000-point Championship sweep would top him out at ${fmt(titleRaceMaxPoints(p.id))}, so Orlando is about stealing some wins and ruining somebody else's weekend.`;
    }

    map[p.id]={
      status:'eliminated',
      label:'ELIMINATED',
      blurb:eliminated
    };
  });

  return map;
}

function recordBand(){
  const low=leader('lowGross','min'), wins=leader('wins'), drive=leader('driving'), avg=leader('avgToPar','min');
  return `<div class="record-band">
    <div><div class="rlabel">Low round</div><div class="rval">${low.lowGross}</div><small>${low.last}</small></div>
    <div><div class="rlabel">Most wins</div><div class="rval">${wins.wins}</div><small>${wins.last}</small></div>
    <div><div class="rlabel">Driving leader</div><div class="rval">${drive.driving.toFixed(1)}%</div><small>${drive.last}</small></div>
    <div><div class="rlabel">Best avg +/-</div><div class="rval">+${avg.avgToPar.toFixed(1)}</div><small>${avg.last}</small></div>
  </div>`;
}
function trendChart(points,label='Handicap'){
  const pts=points.filter(p=>p.value!==null&&p.value!==undefined).map(p=>({
    date:p.date||'',
    iso:p.iso||'',
    value:Number(p.value)
  })).filter(p=>Number.isFinite(p.value));
  if(pts.length<2) return `<div class="caption">Not enough data for trend.</div>`;

  const encoded=encodeURIComponent(JSON.stringify(pts));
  const first=pts[0], last=pts[pts.length-1];
  const accessible=`${label} trend from ${first.date} at ${first.value.toFixed(2)} to ${last.date} at ${last.value.toFixed(2)}. Hover or tap the chart for exact values.`;

  return `<div class="hbt-hc-chart" data-trend-chart data-points="${encoded}" data-label="${label}">
    <canvas class="hbt-hc-canvas" role="img" aria-label="${accessible}"></canvas>
    <div class="hbt-hc-tooltip" data-trend-tooltip aria-hidden="true">
      <span class="hbt-hc-tooltip-date"></span>
      <strong class="hbt-hc-tooltip-value"></strong>
    </div>
  </div>`;
}

function leaderboardGapText(points,leaderPoints){
  const gap=Math.max(0,Number(leaderPoints)-Number(points));
  if(gap<0.5) return 'In the lead';
  return `${fmt(gap)} pts behind`;
}

function golfScoreResult(score,par){
  const s=Number(score);
  const p=Number(par);
  if(!Number.isFinite(s)||!Number.isFinite(p)) return {cls:'',label:'Score'};
  const d=s-p;
  if(d<=-3) return {cls:'golf-score-albatross',label:'Albatross or better'};
  if(d===-2) return {cls:'golf-score-eagle',label:'Eagle'};
  if(d===-1) return {cls:'golf-score-birdie',label:'Birdie'};
  if(d===0) return {cls:'golf-score-par',label:'Par'};
  if(d===1) return {cls:'golf-score-bogey',label:'Bogey'};
  if(d===2) return {cls:'golf-score-double-bogey',label:'Double bogey'};
  if(d===3) return {cls:'golf-score-double-bogey',label:'Triple bogey'};
  return {cls:'golf-score-double-bogey',label:`${d} over par`};
}

function golfScoreMark(score,par){
  if(score==null || score==='') return '<span class="golf-score-mark golf-score-empty">—</span>';
  const result=golfScoreResult(score,par);
  return `<span class="golf-score-mark ${result.cls}" aria-label="${result.label}: ${score}">${score}</span>`;
}

function latestRoundLabel(roundId){
  if(!roundId) return 'Latest Event';
  if(roundId==='MC') return 'Midseason Classic';
  if(roundId==='CH') return 'HBT Championship';
  const m=String(roundId).match(/^R(\d+)$/i);
  return m?`Round ${m[1]}`:String(roundId);
}

function latestCourseDisplayName(name){
  return String(name||'Latest Course').replace(/\s+-\s+/g,' ').trim();
}

function home(){
  const standings=currentSeasonStandings();
  const L=standings[0].player;
  const titleRace=buildTitleRace();
  const latestScorecard=D.latestScorecard||null;
  const latestRoundId=latestScorecard?.roundId||D.latestRound?.id||'R16';
  const latestScorecardRows=[...(latestScorecard?.players||[])].sort((a,b)=>Number(a.finish)-Number(b.finish));
  const latestHoleCount=Math.max(0,Number(latestScorecard?.holesPlayed)||0);
  const latestHoleNumbers=Array.from({length:latestHoleCount},(_,i)=>i+1);
  const labs=completedSeasonPointRounds();
  const pointsDisplayRows=seasonPointsDisplayRows();
  const leadGap=standings.length>1?standings[0].points-standings[1].points:0;
  const girLeader=[...D.players].sort((a,b)=>b.gir-a.gir)[0];
  const drivingLeader=[...D.players].sort((a,b)=>b.driving-a.driving)[0];
  const puttingLeader=[...D.players].sort((a,b)=>a.putts-b.putts)[0];
  const race=D.players;
  const roundsPlayed=Object.values(D.rounds).filter(r=>r.some(x=>x.gross!=null)).length;
  const roundsRemaining=Math.max(16-roundsPlayed,0);
  const fireRounds=labs.slice(-3);
  const fireRank=D.players.map(p=>({
    player:p,
    points:fireRounds.reduce((sum,r)=>sum+Number(D.pointsByRound[r]?.[p.id]||0),0)
  })).sort((a,b)=>b.points-a.points);
  const hot=fireRank[0];
  const statWeek=[...D.players].sort((a,b)=>b.gir-a.gir)[0];

  // Season best/worst gross rounds: compare standard 9-hole league rounds only.
  const nineHoleRoundIds=Object.keys(D.rounds).filter(id=>id!=='MC');
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
  const roundCourseMap=Object.fromEntries(
    Object.entries(D.roundMeta||{})
      .filter(([id,m])=>/^R(?:[1-9]|1[0-6])$/.test(id) && m?.course)
      .map(([id,m])=>[id,String(m.course).toUpperCase()])
  );
  const roundDateMap=Object.fromEntries(
    Object.entries(D.roundMeta||{})
      .filter(([id,m])=>/^R(?:[1-9]|1[0-6])$/.test(id) && m?.date)
      .map(([id,m])=>[
        id,
        new Date(`${m.date}T12:00:00`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})
      ])
  );
  const latestCourseKey=String(latestScorecard?.course||roundCourseMap[latestRoundId]||'').toUpperCase();
  const latestRoundCourse=D.courses.find(c=>String(c.name||'').toUpperCase()===latestCourseKey);
  const latestRoundPar=Number.isFinite(Number(latestScorecard?.totalPar))?Number(latestScorecard.totalPar):null;
  const latestRoundRating=Number.isFinite(Number(latestScorecard?.rating))
    ? Number(latestScorecard.rating)
    : Number(latestRoundCourse?.nineRating);
  const latestRoundSlope=latestScorecard?.slope??latestRoundCourse?.slope;
  const latestRoundTees=String(latestScorecard?.tees||latestRoundCourse?.tees||'').toUpperCase();
  const latestRoundCourseDisplay=latestCourseDisplayName(latestScorecard?.course||D.latestRound?.course||roundCourseMap[latestRoundId]||'Latest Course');
  let recentCourseRecord=null;
  Object.keys(roundCourseMap).reverse().some(roundId=>{
    const course=D.courses.find(c=>c.name===roundCourseMap[roundId]);
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
        <span>${completedSeasonEventCount()} of ${seasonConfig().regularRounds+2} events complete</span>
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
      <p class="premium-copy">Lowest 2 regular-season scores are dropped. MC always counts. The Championship is shown as one CH line equal to each player's combined Front 9, Back 9 and Major Result points.</p>
      <div class="tablebox home-points compact-points" style="margin-top:22px">
        <table>
          <thead><tr><th>Rd</th>${D.players.map(p=>`<th>${p.initials}</th>`).join('')}</tr></thead>
          <tbody>
            ${pointsDisplayRows.map(row=>`<tr class="${row.complete?'':'future-points-row'}"><td class="pname">${row.label}</td>${D.players.map(p=>{
              const drops=droppedPointRounds(p.id,labs);
              const val=displayPointsValue(row,p.id);
              const cls=row.type==='round' && drops.has(row.id)?'dropped-point':'';
              return `<td class="${cls}">${val??'—'}</td>`;
            }).join('')}</tr>`).join('')}
            <tr class="leadrow points-total-row"><td class="pname">TOT</td>${D.players.map(p=>`<td class="pts">${fmt(seasonCurrentPoints(p.id))}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="premium-section reveal latest-home">
      <div class="premium-kicker">Latest Event - ${latestRoundLabel(latestRoundId)}</div>
      <h2 class="premium-title">${latestRoundCourseDisplay}.</h2>
      <div class="home-latest-meta-row">
        <div class="round-course-meta home-round-course-meta">
          <span class="round-tee-meta">
            <span class="tee-color-dot" data-tee="${latestRoundTees||''}" aria-hidden="true"></span>
            <span>${latestRoundTees||'—'}</span>
          </span>
          <span>${Number.isFinite(Number(latestRoundRating))?Number(latestRoundRating).toFixed(2):'—'} | ${latestRoundSlope??'—'}</span>
          <span>PAR ${latestRoundPar??'—'}</span>
        </div>
      </div>
      <div class="card home-latest-scorecard masters-latest-card" style="margin-top:20px">
        <div class="latest-scorecard-scroll" role="region" aria-label="${latestRoundLabel(latestRoundId)} scorecard" tabindex="0">
          <table class="masters-latest-scorecard" data-hole-count="${latestHoleCount}" style="--latest-scorecard-min:${Math.max(636,330+(latestHoleCount*34))}px">
            <thead>
              <tr class="latest-scorecard-heading-row">
                <th class="latest-finish-col latest-double-head" scope="col" rowspan="2" title="Finish">FIN</th>
                <th class="latest-player-col latest-double-head" scope="col" rowspan="2">PLAYER</th>
                ${latestHoleNumbers.map(h=>`<th class="latest-hole-col" scope="col">${h}</th>`).join('')}
                <th class="latest-total-col" scope="col" title="Total score">TOT</th>
                <th class="latest-to-par-col latest-double-head" scope="col" rowspan="2" title="Score to par">+/-</th>
                <th class="latest-hdp-col latest-double-head" scope="col" rowspan="2" title="HBT Handicap">HDC</th>
                <th class="latest-adj-col latest-double-head" scope="col" rowspan="2">ADJ</th>
              </tr>
              <tr class="latest-par-head-row">
                ${latestHoleNumbers.map((h,i)=>`<th class="latest-hole-col" scope="col" aria-label="Hole ${h} par">${latestScorecard?.par?.[i]??'—'}</th>`).join('')}
                <th class="latest-total-col" scope="col" aria-label="Total par">${latestRoundPar??'—'}</th>
              </tr>
            </thead>
            <tbody>
              ${latestScorecardRows.map(r=>{
                const p=byId(r.id);
                const playerLabel=p?`${p.first} ${p.last}`:(r.name||r.id||'Player');
                const playerDisplay=playerLabel;
                const mobilePlayerDisplay=p?p.initials:String(playerLabel).trim().split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,3).toUpperCase();
                const toPar=Number(r.parPlusMinus);
                const toParDisplay=Number.isFinite(toPar)?(toPar>0?`+${toPar}`:String(toPar)):'—';
                const hdpDisplay=Number.isFinite(Number(r.hdp))?Number(r.hdp).toFixed(2):'—';
                const adjDisplay=Number.isFinite(Number(r.adj))?Number(r.adj).toFixed(2):'—';
                return `<tr class="latest-player-row ${Number(r.finish)===1?'latest-winner-row':''}">
                  <td class="latest-finish-col latest-score-finish">${r.finish??'—'}</td>
                  <th class="latest-player-col" scope="row" title="${playerLabel}"><span class="latest-player-name-full">${playerDisplay}</span><span class="latest-player-name-mobile">${mobilePlayerDisplay}</span></th>
                  ${latestHoleNumbers.map((h,i)=>`<td class="latest-hole-col">${golfScoreMark(r.scores?.[i],latestScorecard?.par?.[i])}</td>`).join('')}
                  <td class="latest-total-col latest-score-total">${r.total??'—'}</td>
                  <td class="latest-to-par-col latest-score-to-par">${toParDisplay}</td>
                  <td class="latest-hdp-col">${hdpDisplay}</td>
                  <td class="latest-adj-col latest-score-adj">${adjDisplay}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="latest-scorecard-legend" aria-label="Golf scorecard scoring marks">
        <span><i class="golf-score-mark golf-score-birdie" aria-hidden="true"></i> Birdie</span>
        <span><i class="golf-score-mark golf-score-eagle" aria-hidden="true"></i> Eagle</span>
        <span><i class="golf-score-mark golf-score-bogey" aria-hidden="true"></i> Bogey</span>
        <span><i class="golf-score-mark golf-score-double-bogey" aria-hidden="true"></i> Double+</span>
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
            <div class="tour-story-display">${statWeek.gir.toFixed(1)}%</div>
            <div class="tour-story-unit">GREENS IN REGULATION</div>
            <div class="tour-story-note">Best GIR rate in the league this season</div>
          </div>
          <div class="stat-week-headshot" aria-hidden="true">${photoBig(statWeek)}</div>
        </article>

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
  const pointsDisplayRows=seasonPointsDisplayRows();
  const playerOrder=[...D.players].sort((a,b)=>a.pos-b.pos).map(p=>p.id);
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">2026 season</div><h1>Leaderboard</h1></div><p>Season points, current HBT handicap, wins and gap to the leader.</p></div>
  <div class="tablebox"><table><thead><tr><th>Pos</th><th>Player</th><th>HCP</th><th>Wins</th><th>Points</th><th>Gap</th></tr></thead><tbody>
  ${D.players.map((p,i)=>`<tr class="${i===0?'leadrow':''}"><td class="pos">${p.pos}</td><td><div style="display:flex;align-items:center;gap:10px">${avatar(p)}<div><div class="pname">${p.last}</div><div class="sub">${p.initials}</div></div></div></td><td>${p.hcp.toFixed(2)}${hcpArrow(p)}</td><td>${playerSeason2026FromRounds(p.id).wins}</td><td class="pts">${fmt(p.points)}</td><td>${i?'−'+fmt(D.players[0].points-p.points):'—'}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="section-spacer"></div><div class="pagehead"><div><div class="eyebrow">Round by round</div><h1 style="font-size:48px">Points ledger</h1></div></div>
  <div class="tablebox mobile-ledger"><table><thead><tr><th>Round</th>${playerOrder.map(id=>`<th>${byId(id).initials}</th>`).join('')}</tr></thead><tbody>
  ${pointsDisplayRows.map(row=>`<tr class="${row.complete?'':'future-points-row'}"><td class="pname">${row.label}</td>${playerOrder.map(id=>{const val=displayPointsValue(row,id);return `<td>${val??'—'}</td>`;}).join('')}</tr>`).join('')}
  <tr class="leadrow"><td class="pname">TOTAL</td>${playerOrder.map(id=>`<td class="pts">${fmt(byId(id).points)}</td>`).join('')}</tr>
  </tbody></table></div></section>`;
}

function rounds(){
  const completed=D.roundSummaries
    .filter(s=>D.rounds[s.id].some(x=>x.gross!=null))
    .slice()
    .reverse();


  const prettyCourse=name=>String(name||'Course')
    .replace(/\s*-\s*/g,' ')
    .toLowerCase()
    .replace(/\b\w/g,c=>c.toUpperCase());

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
        const meta=D.roundMeta?.[s.id]||{};
        const courseName=meta.course||s.id;
        const course=D.courses.find(c=>c.name===courseName);
        const parRow=rr.find(r=>Number.isFinite(Number(r.gross))&&Number.isFinite(Number(r.plus)));
        const fallbackPar=parRow?Number(parRow.gross)-Number(parRow.plus):null;
        const par=Number.isFinite(Number(meta.par))?Number(meta.par):fallbackPar;
        const rating=Number.isFinite(Number(meta.rating))
          ? Number(meta.rating)
          : (par!==null && par>40?course?.rating:course?.nineRating);
        const slope=meta.slope??course?.slope;
        const tees=meta.tees||course?.tees||'—';

        return `<section class="card round-scorecard reveal">
          <div class="round-scorecard-header">
            <div class="round-scorecard-header-top">
              <div class="round-scorecard-title-block">
                <div class="eyebrow">${s.id==='MC'?(s.name||'Midseason Classic'):s.id}</div>
                <h3>${prettyCourse(courseName)}</h3>
                <div class="round-course-meta">
                  <span class="round-tee-meta">
                    <span class="tee-color-dot" data-tee="${tees}" aria-hidden="true"></span>
                    <span>${tees}</span>
                  </span>
                  <span>${Number.isFinite(Number(rating))?Number(rating).toFixed(2):'—'} | ${slope??'—'}</span>
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
  const rankedPlayers=[...D.players].sort((a,b)=>a.pos-b.pos);
  const p=rankedPlayers[0];
  return `<section class="page players-hub-page">
    <div class="pagehead players-pagehead">
      <div><div class="eyebrow">The Field</div><h1>Players</h1></div>
      <p>Select a player to view their 2026 statistics, handicap history and career records.</p>
    </div>

    <div class="player-head-nav" id="playerHeadNav">
      ${rankedPlayers.map((pl,i)=>`
        <button type="button" class="player-head-button ${i===0?'active':''}" data-player-id="${pl.id}" aria-current="${i===0?'page':'false'}">
          ${avatar(pl)}
          <span class="player-head-place">${ordinal(pl.pos)}</span>
        </button>`).join('')}
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
    ${p.hc.last20.map((r,i)=>`<tr class="${r.counts?'leadrow':''}"><td>${20-i}</td><td>${r.date}</td><td>${shortCourseName(r.course)}</td><td class="counts">${r.counts?'<span class="count-badge">✓</span>':''}</td><td>${r.score}</td><td>${r.diff.toFixed(2)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}
const PLAYER_BEST_ROUNDS=D.playerBestRounds||{};

const PLAYER_2026_ROUND_ORDER=[
  'R1','R2','R3','R4','R5','R6','R7','R8','R9','R10',
  'MC','R11','R12','R13','R14','R15','R16'
];

function playerResultRoundLabel(round){
  // Tables use the official abbreviation MC for the Midseason Classic.
  return round;
}

function playerResultPointsKey(round){
  return round;
}

function playerSeason2026FromRounds(playerId){
  const results=PLAYER_2026_ROUND_ORDER.map(round=>{
    const row=(D.rounds[round]||[]).find(r=>r.id===playerId);
    if(!row || row.gross==null) return null;

    const pointsKey=playerResultPointsKey(round);
    return {
      round,
      gross:Number(row.gross),
      adj:row.adj==null?null:Number(row.adj),
      fin:row.fin==null?null:Number(row.fin),
      plus:row.plus==null?null:Number(row.plus),
      hcp:row.hcp==null?null:Number(row.hcp),
      points:D.pointsByRound?.[pointsKey]?.[playerId]??0
    };
  }).filter(Boolean);

  const finishes=results.filter(r=>Number.isFinite(r.fin)).map(r=>r.fin);
  const grosses=results.map(r=>r.gross).filter(Number.isFinite);
  const adjusted=results.map(r=>r.adj).filter(Number.isFinite);

  return {
    rounds:results.length,
    wins:results.filter(r=>r.fin===1).length,
    top3:results.filter(r=>r.fin!=null && r.fin<=3).length,
    avgFinish:finishes.length?finishes.reduce((a,b)=>a+b,0)/finishes.length:null,
    avgGross:grosses.length?grosses.reduce((a,b)=>a+b,0)/grosses.length:null,
    lowGross:grosses.length?Math.min(...grosses):null,
    bestAdjusted:adjusted.length?Math.min(...adjusted):null,
    results
  };
}

function playerPageContent(id){
  const p=byId(id)||D.players[0];
  const s=playerSeason2026FromRounds(p.id);
  const c=p.career||{rounds:0,lowGross:null,avgGross:null,lowestHcp:null,bestDiff:null,courseRecords:0};
  const seasonHcpPoints=(p.hc?.trend||[]).filter(x=>String(x.iso||'').startsWith('2026-'));
  const seasonStartHcp=seasonHcpPoints.length?Number(seasonHcpPoints[0].value):Number(p.hcp);
  const seasonHcpChange=Number(p.hcp)-seasonStartHcp;
  const seasonHcpChangeText=`${seasonHcpChange>0?'+':''}${seasonHcpChange.toFixed(2)}`;

  const seasonCards = `
    <div class="season-card-grid">
      <div class="card pad"><div class="kicker">2026 Position</div><div class="metric">${p.pos}</div><div class="caption">${ordinal(p.pos)} of 6</div></div>
      <div class="card pad"><div class="kicker">Average Finish</div><div class="metric">${s.avgFinish?.toFixed(2)??'—'}</div><div class="caption">2026 season</div></div>
      <div class="card pad"><div class="kicker">Average to Par</div><div class="metric">+${p.avgToPar.toFixed(1)}</div><div class="caption">2026 season</div></div>
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

  const bestCareerRounds=(PLAYER_BEST_ROUNDS[p.id]||[]).slice(0,10);
  const bestCareerRoundsTable = `
    <div class="card statcard player-best-rounds-card stats-match-list player-best-rounds-list">
      ${bestCareerRounds.map((r,i)=>`<div class="statrow best-round-statrow ${i===0?'statrow-leader':''}">
        <div class="rank">${i+1}</div>
        <div class="stat-player-name best-round-copy">
          <b>${shortCourseName(r.course)}</b>
          <div class="sub stat-lead-margin best-round-meta">${r.date} · Gross ${r.gross}</div>
        </div>
        <div class="value best-round-diff">${Number(r.diff).toFixed(2)}</div>
      </div>`).join('')}
    </div>`;

  return `<div class="player-hub-content">

    <div class="profilehero premium-profile reveal">
      ${photoBig(p)}
      <div class="profile-name-block"><h1>${p.first} ${p.last}</h1><p>${ordinal(p.pos)} place · ${fmt(p.points)} points</p></div>
    </div>
    <div class="profile-headline-stats reveal">
      <div class="profile-headline-stat"><b>${fmt(p.points)}</b><span>2026 Points</span></div>
      <div class="profile-headline-stat"><b>${s.wins}</b><span>2026 Wins</span></div>
      <div class="profile-headline-stat profile-hcp-stat"><b>${p.hcp.toFixed(2)}<span class="profile-large-hcp-arrow">${hcpArrow(p)}</span></b><span>HBT Handicap</span></div>
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
          <div><div class="stat-value">${p.gir.toFixed(1)}%</div><div class="stat-progress"><i data-width="${Math.min(p.gir*2,100)}"></i></div></div>
        </div>
        <div class="player-2026-stat">
          <div><div class="stat-name">Driving Accuracy</div><div class="stat-rank">${ordinal(metricRank(p.id,'driving','max'))} of 6</div></div>
          <div><div class="stat-value">${p.driving.toFixed(1)}%</div><div class="stat-progress"><i data-width="${Math.min(p.driving,100)}"></i></div></div>
        </div>
        <div class="player-2026-stat">
          <div><div class="stat-name">Putts per 9</div><div class="stat-rank">${ordinal(metricRank(p.id,'putts','min'))} of 6</div></div>
          <div><div class="stat-value">${p.putts.toFixed(2)}</div><div class="stat-progress"><i data-width="${Math.min((p.putts/20)*100,100)}"></i></div></div>
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
        <div class="hcp-number"><span>${p.hcp.toFixed(2)}</span><span class="history-mini-arrow">${hcpArrow(p)}</span></div>
        <div class="hcp-label">Current HBT Handicap</div>
      </div>
      <div class="hc-grid player-handicap-grid">
        <div class="card handicap-trend-card reveal">
          <div class="eyebrow">Handicap trend</div>
          
          ${trendChart(p.hc.trend,p.last+' HCP')}
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
  const ranked=[...D.players].sort((a,b)=>a.hcp-b.hcp);

  const detailFor=p=>`
    <div class="handicap-accordion-detail" id="hcp-detail-${p.id}" data-handicap-detail="${p.id}" aria-hidden="true">
      <div class="handicap-accordion-detail-inner">
        <div class="hc-grid handicap-page-hc-grid">
          <div class="card handicap-trend-card">
            <div class="eyebrow">Handicap trend</div>
            ${trendChart(p.hc.trend,p.last+' HCP')}
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
                <span>${p.hcp.toFixed(2)}</span>
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
  const rows=D.compare;
  return `<div class="mobile-compare" style="padding:0 18px 22px"><div class="compare-grid">${rows.map((row,r)=>row.map((v,c)=>{
    let cls=(r===0||c===0)?'compare-head':(v==='-'?'compare-zero':(Number(v)>0?'compare-pos':'compare-neg'));
    return `<div class="compare-cell ${cls}">${v===null?'':(typeof v==='number'?v.toFixed(2):v)}</div>`;
  }).join('')).join('')}</div></div>`;
}

function statLeadText(metric,leader,runnerUp){
  const gap=Math.abs(Number(leader[metric])-Number(runnerUp[metric]));
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
  const arr=[...D.players].sort((a,b)=>dir==='max'?b[metric]-a[metric]:a[metric]-b[metric]);
  const leader=arr[0];
  const runnerUp=arr[1];
  const rest=arr.slice(1);
  const leadText=statLeadText(metric,leader,runnerUp);
  return `<div class="card statcard reveal stats-table-reveal">
    <div class="stat-feature">
      <div class="stat-header"><div class="eyebrow">${title}</div></div>
      <div class="statrow statrow-leader"><div class="rank">1</div>${avatar(leader)}<div class="stat-player-name"><b>${leader.last}</b><div class="sub stat-lead-margin">${leadText}</div></div><div class="value">${format(leader[metric])}</div></div>
    </div>
    ${rest.map((p,i)=>`<div class="statrow"><div class="rank">${i+2}</div>${avatar(p)}<div class="stat-player-name"><b>${p.last}</b></div><div class="value">${format(p[metric])}</div></div>`).join('')}
  </div>`;
}

const LEAGUE_HISTORY=D.leagueHistory||{
  bestRounds:[],
  lowestGross:[],
  worstRounds:[],
  hardestCourses:[]
};

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

function hardestCoursesTable(){
  const rows=LEAGUE_HISTORY.hardestCourses;
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
  const seasonStats=`<div class="statgrid">${rankedCard('gir','Greens in Regulation',v=>v.toFixed(1)+'%')}${rankedCard('driving','Driving Accuracy',v=>v.toFixed(1)+'%')}${rankedCard('putts','Putting',v=>v.toFixed(2),'min')}${rankedCard('avgToPar','Average to Par',v=>'+'+v.toFixed(1),'min')}${rankedCard('wins','Season Wins',v=>String(v))}${rankedCard('lowGross','Low Gross Round',v=>String(v),'min')}</div>`;

  const leagueStats=`<div class="statgrid league-statgrid">
    ${leagueRoundHistoryTable(
      'Best Rounds All Time',
      '15 lowest scoring differentials in HBT history.',
      LEAGUE_HISTORY.bestRounds,
      'Diff',
      v=>Number(v).toFixed(2)
    )}
    ${leagueRoundHistoryTable(
      'Lowest Gross Scores All Time',
      '15 lowest gross scores from 9-hole rounds.',
      LEAGUE_HISTORY.lowestGross,
      'Gross',
      v=>String(v)
    )}
    ${leagueRoundHistoryTable(
      'Worst Rounds All Time',
      '15 highest gross scores from 9-hole rounds.',
      LEAGUE_HISTORY.worstRounds,
      'Gross',
      v=>String(v)
    )}
    ${hardestCoursesTable()}
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

  const courses=[...D.courses].sort((a,b)=>
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

        <div class="record-stat-list stats-match-list">
          ${c.personal.slice(0,6).map((x,i)=>{
            const p=byId(x.id);
            const isRecord=Number(x.score)===Number(c.record);
            return `<div class="statrow record-statrow ${isRecord?'statrow-leader':''}">
              <div class="rank">${i+1}</div>
              ${avatar(p)}
              <div class="stat-player-name"><b>${p.last}</b></div>
              <div class="value record-best-value">${x.score}</div>
            </div>`;
          }).join('')}
        </div>
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



function initHandicapTrendCharts(scope=document){
  const charts=[...scope.querySelectorAll('[data-trend-chart]')];
  if(!charts.length) return;

  if(window.__hbtTrendObservers){ window.__hbtTrendObservers.forEach(ro=>ro.disconnect()); }
  window.__hbtTrendObservers=[];

  const parseDate=(point)=>{
    if(point.iso){
      const m=String(point.iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(m){
        const d=new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3])));
        return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
      }
    }
    return point.date||'';
  };

  const shortDate=(point,spanYears)=>{
    if(point.iso){
      const m=String(point.iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(m){
        if(spanYears>=2.25) return m[1];
        return `${Number(m[2])}/${Number(m[3])}/${String(m[1]).slice(-2)}`;
      }
    }
    return point.date||'';
  };

  charts.forEach(chart=>{
    let points=[];
    try{ points=JSON.parse(decodeURIComponent(chart.dataset.points||'')); }catch(e){ points=[]; }
    if(points.length<2) return;

    const canvas=chart.querySelector('.hbt-hc-canvas');
    const tooltip=chart.querySelector('[data-trend-tooltip]');
    const tooltipDate=tooltip?.querySelector('.hbt-hc-tooltip-date');
    const tooltipValue=tooltip?.querySelector('.hbt-hc-tooltip-value');
    if(!canvas || !tooltip) return;

    const ctx=canvas.getContext('2d');
    const label=chart.dataset.label||'Handicap';
    let selectedIndex=null;
    let lastMetrics=null;

    const palette=()=>{
      const st=getComputedStyle(document.documentElement);
      return {
        line:(st.getPropertyValue('--g3')||'#2d6a4f').trim(),
        grid:'#dfe5e0',
        axis:'#b7c0ba',
        text:'#6f7a73',
        point:(st.getPropertyValue('--gold')||'#b48e3c').trim(),
        current:(st.getPropertyValue('--g')||'#083d2c').trim()
      };
    };

    const draw=()=>{
      const cssW=Math.max(280,Math.round(chart.clientWidth));
      const cssH=Math.max(240,Math.round(chart.clientHeight));
      if(!cssW || !cssH) return;

      const dpr=Math.min(window.devicePixelRatio||1,2);
      if(canvas.width!==Math.round(cssW*dpr) || canvas.height!==Math.round(cssH*dpr)){
        canvas.width=Math.round(cssW*dpr);
        canvas.height=Math.round(cssH*dpr);
      }
      canvas.style.width=cssW+'px';
      canvas.style.height=cssH+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,cssW,cssH);

      const compact=cssW<520;
      const left=compact?42:48;
      const right=compact?12:18;
      const top=compact?18:22;
      const bottom=compact?34:38;
      const x0=left, x1=cssW-right, y0=top, y1=cssH-bottom;
      const vals=points.map(p=>Number(p.value));
      let min=Math.min(...vals), max=Math.max(...vals);
      if(max-min<1){ max+=.5; min-=.5; }
      const pad=Math.max((max-min)*.075,.2);
      min=Math.max(0,min-pad);
      max=max+pad;
      const range=Math.max(.001,max-min);
      const xy=points.map((p,i)=>({
        x:x0+i*(x1-x0)/(points.length-1),
        y:y0+(max-Number(p.value))*(y1-y0)/range,
        p
      }));
      const colors=palette();
      const fontSize=compact?10.5:(cssW>900?11.5:11);
      ctx.font=`500 ${fontSize}px Inter, Arial, sans-serif`;
      ctx.textBaseline='middle';
      ctx.fillStyle=colors.text;

      const yTicks=compact?4:5;
      ctx.lineWidth=1;
      for(let i=0;i<yTicks;i++){
        const ratio=i/(yTicks-1);
        const y=y0+ratio*(y1-y0);
        const v=max-ratio*range;
        ctx.strokeStyle=colors.grid;
        ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
        ctx.textAlign='right';
        ctx.fillText(v.toFixed(1),x0-7,y);
      }

      ctx.strokeStyle=colors.axis;
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(x0,y1); ctx.lineTo(x1,y1);
      ctx.moveTo(x0,y0); ctx.lineTo(x0,y1);
      ctx.stroke();

      const firstIso=points[0].iso||'';
      const lastIso=points[points.length-1].iso||'';
      const firstYear=Number(firstIso.slice(0,4))||0;
      const lastYear=Number(lastIso.slice(0,4))||firstYear;
      const spanYears=Math.max(0,lastYear-firstYear);
      const desired=compact?3:(cssW<760?4:5);
      const tickIndexes=[];
      for(let i=0;i<desired;i++) tickIndexes.push(Math.round(i*(points.length-1)/(desired-1)));
      [...new Set(tickIndexes)].forEach((idx,j,arr)=>{
        const pt=xy[idx];
        ctx.textAlign=j===0?'left':(j===arr.length-1?'right':'center');
        ctx.fillText(shortDate(points[idx],spanYears),pt.x,y1+18);
      });

      ctx.strokeStyle=colors.line;
      ctx.lineWidth=compact?1.55:1.35;
      ctx.lineJoin='round';
      ctx.lineCap='round';
      ctx.beginPath();
      xy.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));
      ctx.stroke();

      const pointRadius=compact?2.2:2;
      [0,xy.length-1].forEach((idx,k)=>{
        const pt=xy[idx];
        ctx.fillStyle=k===0?colors.point:colors.current;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,pointRadius,0,Math.PI*2); ctx.fill();
      });

      if(selectedIndex!==null && xy[selectedIndex]){
        const pt=xy[selectedIndex];
        ctx.save();
        ctx.strokeStyle='rgba(8,61,44,.22)';
        ctx.lineWidth=1;
        ctx.setLineDash([3,4]);
        ctx.beginPath(); ctx.moveTo(pt.x,y0); ctx.lineTo(pt.x,y1); ctx.stroke();
        ctx.restore();
        ctx.fillStyle=colors.current;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,compact?4.5:4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(pt.x,pt.y,compact?1.7:1.5,0,Math.PI*2); ctx.fill();
      }

      lastMetrics={cssW,cssH,x0,x1,y0,y1,xy};
      if(selectedIndex!==null) positionTooltip(selectedIndex);
    };

    const positionTooltip=(idx)=>{
      if(!lastMetrics || !lastMetrics.xy[idx]) return;
      const pt=lastMetrics.xy[idx];
      const point=points[idx];
      tooltipDate.textContent=parseDate(point);
      tooltipValue.textContent=`${label}: ${Number(point.value).toFixed(2)}`;
      tooltip.classList.add('is-visible');
      tooltip.setAttribute('aria-hidden','false');

      requestAnimationFrame(()=>{
        const tw=tooltip.offsetWidth||130;
        const th=tooltip.offsetHeight||48;
        let left=pt.x-tw/2;
        left=Math.max(6,Math.min(lastMetrics.cssW-tw-6,left));
        let top=pt.y-th-12;
        if(top<4) top=pt.y+12;
        tooltip.style.left=left+'px';
        tooltip.style.top=top+'px';
      });
    };

    const hideTooltip=()=>{
      selectedIndex=null;
      tooltip.classList.remove('is-visible');
      tooltip.setAttribute('aria-hidden','true');
      draw();
    };

    const pick=(clientX)=>{
      if(!lastMetrics) return;
      const rect=canvas.getBoundingClientRect();
      const x=clientX-rect.left;
      const raw=(x-lastMetrics.x0)/(lastMetrics.x1-lastMetrics.x0)*(points.length-1);
      selectedIndex=Math.max(0,Math.min(points.length-1,Math.round(raw)));
      draw();
    };

    canvas.addEventListener('pointermove',e=>{
      if(e.pointerType==='mouse') pick(e.clientX);
    });
    canvas.addEventListener('pointerleave',e=>{
      if(e.pointerType==='mouse') hideTooltip();
    });
    canvas.addEventListener('pointerdown',e=>{
      pick(e.clientX);
    });
    canvas.addEventListener('keydown',e=>{
      if(e.key!=='ArrowLeft' && e.key!=='ArrowRight' && e.key!=='Escape') return;
      e.preventDefault();
      if(e.key==='Escape'){ hideTooltip(); return; }
      if(selectedIndex===null) selectedIndex=e.key==='ArrowLeft'?points.length-1:0;
      else selectedIndex=Math.max(0,Math.min(points.length-1,selectedIndex+(e.key==='ArrowLeft'?-1:1)));
      draw();
    });
    canvas.tabIndex=0;

    chart.__hideTrendTooltip=hideTooltip;
    chart.__redrawTrend=draw;
    const ro=new ResizeObserver(()=>draw());
    ro.observe(chart);
    window.__hbtTrendObservers.push(ro);
    draw();
  });

  if(window.__hbtTrendOutsideHandler) document.removeEventListener('pointerdown',window.__hbtTrendOutsideHandler);
  window.__hbtTrendOutsideHandler=(e)=>{
    charts.forEach(chart=>{ if(!chart.contains(e.target)) chart.__hideTrendTooltip?.(); });
  };
  document.addEventListener('pointerdown',window.__hbtTrendOutsideHandler);
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
    initHandicapTrendCharts(content);
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
  requestAnimationFrame(()=>{setupRetailMenu();initTitleRaceAccordions();initScorecardYearNav();initPlayerHeadNav();initHandicapAccordions();initStatsViewToggle();initHandicapTrendCharts();initPremiumMotion();initHeroStatusRotation();ensureHeroVideoPlayback();});
};
window.addEventListener('hashchange',render);
render();
