
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
  const vals=labs
    .map((r,i)=>({r,i,v:Number(D.pointsByRound?.[r]?.[playerId])}))
    .filter(x=>Number.isFinite(x.v));
  vals.sort((a,b)=>a.v-b.v || a.i-b.i);
  return new Set(vals.slice(0,2).map(x=>x.r));
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
function trendSvg(points,label='Handicap'){
  const pts=points.filter(p=>p.value!==null&&p.value!==undefined);
  if(pts.length<2) return `<div class="caption">Not enough data for trend.</div>`;

  const w=720,h=230,left=46,right=18,top=24,bottom=28;
  const vals=pts.map(p=>Number(p.value));
  let min=Math.min(...vals), max=Math.max(...vals);
  if(max-min<1){ max+=.5; min-=.5; }

  const padRange=(max-min)*.08;
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
    <text x="${x0}" y="${h-7}">${first.date}</text>
    <text x="${x1-64}" y="${h-7}">${last.date}</text>
  </svg>`;
}
function home(){
  const L=D.players[0];
  const rr=D.rounds.R14.filter(x=>x.gross!=null).sort((a,b)=>a.fin-b.fin);
  const labs=Object.keys(D.pointsByRound).filter(x=>!['R15','R16','CH1','CH2','CH3'].includes(x));
  const leadGap=D.players.length>1?L.points-D.players[1].points:0;
  const girLeader=[...D.players].sort((a,b)=>b.gir-a.gir)[0];
  const drivingLeader=[...D.players].sort((a,b)=>b.driving-a.driving)[0];
  const puttingLeader=[...D.players].sort((a,b)=>a.putts-b.putts)[0];
  const race=D.players;
  const roundsPlayed=Object.values(D.rounds).filter(r=>r.some(x=>x.gross!=null)).length;
  const roundsRemaining=Math.max(16-roundsPlayed,0);

  return `<section class="hero home-editorial-hero">
    <video class="hero-bg-video" autoplay muted loop playsinline preload="metadata" aria-hidden="true">
      <source src="assets/hero-skate.mp4" type="video/mp4">
    </video>
    <div class="hero-video-treatment" aria-hidden="true"></div>
    
    <div class="hero-in home-hero-in">
      <div class="hero-title-wrap hero-logo-lockup">
        <div class="hero-logo-panel">
          <img src="assets/hbt-logo.png" alt="HBT Golf League" class="hero-logo-mark">
          <div class="hero-season-sub">2026 Season</div>
        </div>
      </div>
      <div class="hero-status">
        <span>Round 14 Complete</span>
        <div class="hero-status-rotator"><span id="heroStatusText">${L.last} leads · ${fmt(L.points)} pts</span></div>
      </div>

    </div>
  </section>

  <section class="page home-main">
    <section class="premium-section">
      <div class="premium-kicker">2026 Season</div>
      <h2 class="premium-title">Leaderboard.</h2>
      <div class="leaderboard-stack">
        ${D.players.map(p=>`<a href="#player/${p.id}" class="leaderboard-row reveal">
          <div class="leaderboard-pos">${p.pos}</div>
          ${avatar(p)}
          <div>
            <div class="leaderboard-name">${p.first} ${p.last}</div>
            <div class="leaderboard-meta">${p.season2026.wins} wins · ${p.hcp.toFixed(2)}${hcpArrow(p)} HCP</div>
          </div>
          <div class="leaderboard-points"><b>${fmt(p.points)}</b><span>Points</span></div>
        </a>`).join('')}
      </div>
    </section>

    <section class="premium-section reveal">
      <div class="premium-kicker">Every point matters</div>
      <h2 class="premium-title">2026 Points</h2>
      <p class="premium-copy">Round-by-round points in a compact mobile score grid.</p>
      <div class="tablebox home-points compact-points" style="margin-top:22px">
        <table>
          <thead><tr><th>Rd</th>${D.players.map(p=>`<th>${p.initials}</th>`).join('')}</tr></thead>
          <tbody>
            ${labs.map(r=>`<tr><td class="pname">${r}</td>${D.players.map(p=>{
              const drops=droppedPointRounds(p.id,labs);
              const val=D.pointsByRound[r]?.[p.id];
              const cls=drops.has(r)?'dropped-point':'';
              return `<td class="${cls}">${val??'—'}</td>`;
            }).join('')}</tr>`).join('')}
            <tr class="leadrow"><td class="pname">TOT</td>${D.players.map(p=>`<td class="pts">${fmt(p.points)}</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="premium-section reveal latest-home">
      <div class="premium-kicker">Latest round</div>
      <h2 class="premium-title">Tapawingo Prairie.</h2>
      <div class="section-title-row latest-round-links">
        <p class="premium-copy">Round 14 · August 4, 2026</p>
        <a href="#rounds" class="text-link">View all scorecards →</a>
      </div>
      <div class="card" style="margin-top:24px">
        <div class="tablebox home-scorecard" style="border:0">
          <table><thead><tr><th>Fin</th><th>Player</th><th>Gross</th><th>+/-</th><th>HCP</th><th>Adj</th></tr></thead><tbody>
          ${rr.map(r=>{let p=byId(r.id);return `<tr class="${r.fin===1?'leadrow':''}">
            <td class="pos">${r.fin}</td><td><b>${p.last}</b></td><td>${r.gross}</td><td>+${r.plus}</td><td>${Number(r.hcp).toFixed(2)}</td><td class="pts">${Number(r.adj).toFixed(2)}</td>
          </tr>`}).join('')}
          </tbody></table>
        </div>
      </div>
    </section>

    <section class="around-tour premium-section reveal">
      <div class="premium-kicker">Right now</div>
      <h2 class="premium-title">Around the Tour.</h2>
      <p class="premium-copy">The season at a glance, pulled from the league numbers.</p>

      <div class="tour-feature tour-feature-leader">
        <div class="tour-feature-copy">
          <span class="tour-label">Tour Leader</span>
          <h3>${L.last}</h3>
          <div class="tour-big">${fmt(L.points)}</div>
          <p>${fmt(leadGap)} points clear with ${roundsRemaining} regular-season round${roundsRemaining===1?'':'s'} remaining.</p>
        </div>
        <a href="#player/${L.id}" class="tour-headshot">${avatar(L)}</a>
      </div>

      <div class="tour-feature tour-feature-stat">
        <div class="tour-feature-copy">
          <span class="tour-label">Stat of the Moment</span>
          <div class="tour-big">${girLeader.gir.toFixed(1)}%</div>
          <h3>${girLeader.last}</h3>
          <p>Leads the 2026 Tour in greens in regulation.</p>
        </div>
        <a href="#player/${girLeader.id}" class="tour-headshot">${avatar(girLeader)}</a>
      </div>

      <div class="mini-leaders">
        <div><span>Driving</span><b>${drivingLeader.driving.toFixed(1)}%</b><small>${drivingLeader.last}</small></div>
        <div><span>Putting</span><b>${puttingLeader.putts.toFixed(2)}</b><small>${puttingLeader.last}</small></div>
      </div>

      <div class="tour-race">
        <div class="tour-race-head">
          <div><span class="tour-label">The Race</span><h3>${roundsRemaining} rounds remaining</h3></div>
          <a href="#rounds">View rounds →</a>
        </div>
        ${race.map((p,i)=>`<a href="#player/${p.id}" class="race-row">
          <span class="race-pos">${i+1}</span>
          ${avatar(p)}
          <span class="race-name">${p.last}</span>
          <span class="race-gap">${i===0?fmt(p.points)+' pts':'−'+fmt(L.points-p.points)}</span>
        </a>`).join('')}
      </div>
    </section>
  </section>`;
}

function leaderboard(){
  const labs=Object.keys(D.pointsByRound).filter(x=>!['R15','R16','CH1','CH2','CH3'].includes(x));
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">2026 season</div><h1>Leaderboard</h1></div><p>Season points, current HBT handicap, wins and gap to the leader.</p></div>
  <div class="tablebox"><table><thead><tr><th>Pos</th><th>Player</th><th>HCP</th><th>Wins</th><th>Points</th><th>Gap</th></tr></thead><tbody>
  ${D.players.map((p,i)=>`<tr class="${i===0?'leadrow':''}"><td class="pos">${p.pos}</td><td><div style="display:flex;align-items:center;gap:10px">${avatar(p)}<div><div class="pname">${p.last}</div><div class="sub">${p.initials}</div></div></div></td><td>${p.hcp.toFixed(2)}${hcpArrow(p)}</td><td>${p.season2026.wins}</td><td class="pts">${fmt(p.points)}</td><td>${i?'−'+fmt(D.players[0].points-p.points):'—'}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="section-spacer"></div><div class="pagehead"><div><div class="eyebrow">Round by round</div><h1 style="font-size:48px">Points ledger</h1></div></div>
  <div class="tablebox mobile-ledger"><table><thead><tr><th>Round</th>${['jb','cd','tf','rg','am','ss'].map(id=>`<th>${byId(id).initials}</th>`).join('')}</tr></thead><tbody>
  ${labs.map(r=>`<tr><td class="pname">${r}</td>${['jb','cd','tf','rg','am','ss'].map(id=>`<td>${D.pointsByRound[r]?.[id]??''}</td>`).join('')}</tr>`).join('')}
  <tr class="leadrow"><td class="pname">TOTAL</td>${['jb','cd','tf','rg','am','ss'].map(id=>`<td class="pts">${fmt(byId(id).points)}</td>`).join('')}</tr>
  </tbody></table></div></section>`;
}

function rounds(){
  const completed=D.roundSummaries
    .filter(s=>D.rounds[s.id].some(x=>x.gross!=null))
    .slice()
    .reverse();

  return `<section class="page">
    <div class="pagehead">
      <div><div class="eyebrow">2026 Events</div><h1>Rounds</h1></div>
      <p>Most recent first. Every completed round uses the same scorecard fields as the latest round.</p>
    </div>

    <div class="rounds-list">
      ${completed.map(s=>{
        const rr=D.rounds[s.id]
          .filter(x=>x.gross!=null)
          .sort((a,b)=>(a.fin??99)-(b.fin??99));
        const winner=rr.length?byId(rr[0].id):null;

        return `<section class="card round-scorecard reveal">
          <div class="round-scorecard-header">
            <div class="round-scorecard-header-top">
              <div>
                <div class="eyebrow">${s.id}</div>
                <h3>${s.id==='R14'?'Tapawingo Prairie':s.id}</h3>
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
    </div>
  </section>`;
}
function scorecardTable(roundId){
  const rr=D.rounds[roundId].filter(x=>x.gross!=null).sort((a,b)=>a.fin-b.fin);
  return `<div class="tablebox mobile-scorecard" style="border:0"><table><thead><tr><th>Fin</th><th>Player</th><th>Gross</th><th>+/-</th><th>HCP</th><th>Adjusted</th></tr></thead><tbody>${rr.map(r=>{let p=byId(r.id);return `<tr class="${r.fin===1?'leadrow':''}"><td class="pos">${r.fin}</td><td><div style="display:flex;gap:10px;align-items:center">${avatar(p)}<b>${p.last}</b></div></td><td>${r.gross}</td><td>+${r.plus}</td><td>${Number(r.hcp).toFixed(2)}</td><td class="pts">${Number(r.adj).toFixed(2)}</td></tr>`}).join('')}</tbody></table></div>`;
}

function players(){
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">The field</div><h1>Players</h1></div><p>Profiles bring together standings, stats, handicap calculator and full handicap trend.</p></div>
  <div class="playergrid">${D.players.map(p=>`<a class="card playercard" href="#player/${p.id}"><div class="player-top">${photoBig(p)}</div><div class="player-info"><div class="kicker">${ordinal(p.pos)} in standings</div><h3>${p.first} ${p.last}</h3><div class="smallstats"><div><b>${p.hcp.toFixed(2)}${hcpArrow(p)}</b><span>HCP</span></div><div><b>${fmt(p.points)}</b><span>Points</span></div><div><b>${p.season2026?.wins??0}</b><span>Wins</span></div></div></div></a>`).join('')}</div></section>`;
}


function shortCourseName(name){
  if(!name) return '';
  const map=[
    [/FOREST PARK - REDBUD/gi,'FP Redbud'],
    [/FOREST PARK - DOGWOOD/gi,'FP Dogwood'],
    [/FOREST PARK - HAWTHORNE/gi,'FP Hawthorn'],
    [/FOREST PARK - HIGHLANDS/gi,'FP Highlands'],
    [/TAPAWINGO - PRAIRIE/gi,'Tap Prairie'],
    [/TAPAWINGO - MERAMEC/gi,'Tap Meramec'],
    [/TAPAWINGO - WOODLANDS/gi,'Tap Woodlands'],
    [/CRESCENT FARMS - STALLION/gi,'Crescent'],
    [/CREVE COEUR GOLF CLUB/gi,'Creve Coeur'],
    [/BALLWIN GOLF COURSE/gi,'Ballwin'],
    [/RUTH PARK/gi,'Ruth Park'],
    [/STONEWOLF/gi,'Stonewolf']
  ];
  let out=String(name);
  map.forEach(([re,val])=>out=out.replace(re,val));
  if(out.length>12) out=out.slice(0,11)+'…';
  return out;
}

function handicapCalculator(p){
  return `<div class="card"><div class="pad"><div class="eyebrow">Handicap calculator</div><h2 class="display" style="font-size:42px;margin:6px 0">Best 8 of last 20 rounds</h2><p class="caption">Green checks show the eight score differentials currently counting toward ${p.last}'s HBT handicap.</p></div>
  <div class="tablebox mobile-calculator" style="border:0"><table class="calculator"><thead><tr><th>Rd</th><th>Date</th><th>Course</th><th>Counts</th><th>Score</th><th>SC Diff</th></tr></thead><tbody>
    ${p.hc.last20.map((r,i)=>`<tr class="${r.counts?'leadrow':''}"><td>${20-i}</td><td>${r.date}</td><td>${shortCourseName(r.course)}</td><td class="counts">${r.counts?'<span class="count-badge">✓</span>':''}</td><td>${r.score}</td><td>${r.diff.toFixed(2)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}
function playerPage(id){
  const p=byId(id)||D.players[0];
  const s=p.season2026||{rounds:0,wins:0,top3:0,avgFinish:null,avgGross:null,lowGross:null,bestAdjusted:null,results:[]};
  const c=p.career||{rounds:0,lowGross:null,avgGross:null,lowestHcp:null,bestDiff:null,courseRecords:0};

  const seasonCards = `
    <div class="season-card-grid">
      <div class="card pad"><div class="kicker">2026 Position</div><div class="metric">${p.pos}</div><div class="caption">${ordinal(p.pos)} of 6</div></div>
      <div class="card pad"><div class="kicker">2026 Points</div><div class="metric">${fmt(p.points)}</div><div class="caption">${s.rounds} completed rounds</div></div>
      <div class="card pad"><div class="kicker">2026 Wins</div><div class="metric">${s.wins}</div><div class="caption">${s.top3} top-3 finishes</div></div>
      <div class="card pad dark"><div class="kicker">2026 Avg Finish</div><div class="metric">${s.avgFinish?.toFixed(2)??'—'}</div><div class="caption">Lower is better</div></div>
    </div>`;

  const resultStrip = `
    <div class="season-result-strip">
      ${s.results.map(r=>`<div class="finish-pill ${r.fin===1?'win':(r.fin<=3?'top3':'')}"><b>${r.fin}${r.fin===1?'st':r.fin===2?'nd':r.fin===3?'rd':'th'}</b><span>${r.round}</span></div>`).join('')}
    </div>`;

  const seasonTable = `
    <div class="season-history tablebox">
      <table><thead><tr><th>Round</th><th>Gross</th><th>Adj</th><th>Finish</th><th>Points</th></tr></thead><tbody>
      ${s.results.map(r=>`<tr class="${r.fin===1?'leadrow':''}"><td class="pname">${r.round}</td><td>${r.gross}</td><td>${r.adj!==null?r.adj.toFixed(2):'—'}</td><td>${r.fin??'—'}</td><td class="pts">${r.points??0}</td></tr>`).join('')}
      </tbody></table>
    </div>`;

  const careerCards = `
    <div class="career-card-grid">
      <div class="card pad"><div class="kicker">Career Rounds</div><div class="metric">${c.rounds}</div><div class="caption">All historical rounds available</div></div>
      <div class="card pad"><div class="kicker">Career Low Gross</div><div class="metric">${c.lowGross??'—'}</div><div class="caption">Best recorded score</div></div>
      <div class="card pad"><div class="kicker">Lowest HBT Handicap</div><div class="metric">${c.lowestHcp!==null?c.lowestHcp.toFixed(2):'—'}</div><div class="caption">Lowest recorded index</div></div>
      <div class="card pad dark"><div class="kicker">Course Records Held</div><div class="metric">${c.courseRecords}</div><div class="caption">Current HBT course records</div></div>
    </div>`;

  return `<section class="page">
    <a href="#players" class="badge" style="margin-bottom:14px">← All players</a>

    <div class="profilehero premium-profile reveal">
      ${photoBig(p)}
      <div><div class="eyebrow">HBT Player · 2026</div><h1>${p.first}<br>${p.last}</h1><p>${ordinal(p.pos)} place · ${fmt(p.points)} points</p></div>
      <div class="big-hcp">${p.hcp.toFixed(2)}${hcpArrow(p)}<small>Current HBT Handicap</small></div>
    </div>
    <div class="profile-headline-stats reveal">
      <div class="profile-headline-stat"><b>${fmt(p.points)}</b><span>2026 Points</span></div>
      <div class="profile-headline-stat"><b>${s.wins}</b><span>2026 Wins</span></div>
      <div class="profile-headline-stat"><b>${s.avgFinish?.toFixed(2)??'—'}</b><span>Avg Finish</span></div>
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
        <div class="hcp-number">${p.hcp.toFixed(2)}${hcpArrow(p)}</div>
        <div class="hcp-label">Current HBT Handicap</div>
      </div>
      <div class="hc-grid">
        <div class="card trend-card reveal">
          <div class="eyebrow">Handicap trend</div>
          
          ${trendSvg(p.hc.trend,p.last+' HCP')}
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
      <p class="career-note">Career wins, career top-3 finishes, and career average finish are not shown until complete historical finishing-position data is available for prior seasons.</p>
    </section>
  </section>`;
}

function handicaps(){
  const ranked=[...D.players].sort((a,b)=>a.hcp-b.hcp);
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">Handicap center</div><h1>Handicaps</h1></div><p>Main HBT handicap page with rankings, head-to-head strokes, trend lines and each player’s current calculator.</p></div>
  <div class="statgrid">${ranked.map((p,i)=>`<a class="card statcard" href="#player/${p.id}"><div class="statrow" style="border-top:0"><div class="rank">${i+1}</div>${avatar(p)}<div><b>${p.last}</b><div class="sub">${p.hc.last20.filter(x=>x.counts).length} counting rounds</div></div><div class="value">${p.hcp.toFixed(2)}${hcpArrow(p)}</div></div></a>`).join('')}</div>
  <div class="section-spacer"></div>
  <div class="card"><div class="pad"><div class="eyebrow">Handicap comparison chart</div><h2 class="display" style="font-size:42px;margin:6px 0">Head-to-head strokes</h2><p class="caption">Positive values mean the row player gives strokes to the column player; negative values mean the row player receives strokes.</p></div>${compareChart()}</div>
  <div class="section-spacer"></div>
  <div class="playergrid">${D.players.map(p=>`<a class="card playercard" href="#player/${p.id}"><div class="player-top">${photoBig(p)}</div><div class="player-info"><div class="kicker">Handicap calculator</div><h3>${p.last}</h3><div class="smallstats"><div><b>${p.hcp.toFixed(2)}${hcpArrow(p)}</b><span>HCP</span></div><div><b>${p.hc.last20.filter(x=>x.counts).length}</b><span>Counts</span></div><div><b>20</b><span>Rounds</span></div></div></div></a>`).join('')}</div>
  </section>`;
}
function compareChart(){
  const rows=D.compare;
  return `<div class="mobile-compare" style="padding:0 18px 22px"><div class="compare-grid">${rows.map((row,r)=>row.map((v,c)=>{
    let cls=(r===0||c===0)?'compare-head':(v==='-'?'compare-zero':(Number(v)>0?'compare-pos':'compare-neg'));
    return `<div class="compare-cell ${cls}">${v===null?'':(typeof v==='number'?v.toFixed(2):v)}</div>`;
  }).join('')).join('')}</div></div>`;
}

function rankedCard(metric,title,format,dir='max'){
  const arr=[...D.players].sort((a,b)=>dir==='max'?b[metric]-a[metric]:a[metric]-b[metric]);
  return `<div class="card statcard"><div class="stat-header"><div class="eyebrow">${title}</div><h2>${format(arr[0][metric])}</h2><div class="caption">Leader · ${arr[0].last}</div></div>${arr.map((p,i)=>`<div class="statrow"><div class="rank">${i+1}</div>${avatar(p)}<div><b>${p.last}</b><div class="sub">${p.initials}</div></div><div class="value">${format(p[metric])}</div></div>`).join('')}</div>`;
}
function stats(){
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">League analytics</div><h1>Stats</h1></div><p>Every stat ranks all six players with headshots, so the page feels more like a sports site than a spreadsheet.</p></div>
  <div class="statgrid">${rankedCard('gir','Greens in Regulation',v=>v.toFixed(1)+'%')}${rankedCard('driving','Driving Accuracy',v=>v.toFixed(1)+'%')}${rankedCard('putts','Putting',v=>v.toFixed(2),'min')}${rankedCard('avgToPar','Average to Par',v=>'+'+v.toFixed(1),'min')}${rankedCard('wins','Season Wins',v=>String(v))}${rankedCard('lowGross','Low Gross Round',v=>String(v),'min')}</div>
  <div class="section-spacer"></div>${recordBand()}</section>`;
}

function records(){
  return `<section class="page"><div class="pagehead"><div><div class="eyebrow">Course book</div><h1>Course Records</h1></div><p>Course record cards with stylized course imagery, record holders, rating/slope and personal bests.</p></div>
  <div class="coursegrid">${D.courses.map(c=>`<div class="card course"><div class="course-img"></div><div class="pad"><div class="kicker">HBT course record</div><div class="course-record">${c.record}</div><div class="caption">${c.holders.join(' & ')}</div><h3>${c.name.replace('FOREST PARK - ','Forest Park · ').replace('TAPAWINGO - ','Tapawingo · ')}</h3><div class="course-meta"><span>${c.tees||'—'} tees</span><span>9H ${typeof c.nineRating==='number'?c.nineRating.toFixed(2):'—'}</span><span>Slope ${c.slope||'—'}</span></div><div class="standing-list">${c.personal.slice(0,6).map((x,i)=>`<div class="standing-mini"><span>${i+1}. <b>${byId(x.id).last}</b></span><span>${x.score}</span></div>`).join('')}</div></div></div>`).join('')}</div>
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
  document.querySelector('#nav').classList.remove('open');
  window.scrollTo(0,0);
}

const menuBtn=document.querySelector('#menu');
const nav=document.querySelector('#nav');
menuBtn.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded',open?'true':'false');
});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded','false');
}));



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

  const ordered=[...D.players].sort((a,b)=>a.pos-b.pos);
  const leader=ordered[0];
  let index=0;

  const labels=ordered.map((p,i)=>{
    if(i===0) return `${p.last} leads · ${fmt(p.points)} pts`;
    const gap=leader.points-p.points;
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



const baseRender=render;
render=function(){
  baseRender();
  requestAnimationFrame(()=>{initPremiumMotion();initHeroStatusRotation();});
};
window.addEventListener('hashchange',render);
render();
