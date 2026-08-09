
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
function leaderboardGapText(p,leaderPlayer){
  if(!p || !leaderPlayer) return '';
  const gap=Math.max(0,Number(leaderPlayer.points)-Number(p.points));
  if(gap<0.5) return 'In the lead';
  return `${fmt(gap)} pts behind`;
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
  const roundCourseMap={
    R1:'CREVE COEUR GOLF CLUB',
    R2:'FOREST PARK - HAWTHORNE',
    R3:'TAPAWINGO - MERAMEC',
    R4:'TAPAWINGO - WOODLANDS',
    R5:'FOREST PARK - HAWTHORNE',
    R6:'TAPAWINGO - MERAMEC',
    R7:'FOREST PARK - REDBUD',
    R8:'TAPAWINGO - MERAMEC',
    R9:'FOREST PARK - DOGWOOD',
    R10:'FOREST PARK - REDBUD',
    R11:'TAPAWINGO - WOODLANDS',
    R12:'FOREST PARK - DOGWOOD',
    R13:'FOREST PARK - REDBUD',
    R14:'TAPAWINGO - PRAIRIE'
  };
  const roundDateMap={
    R1:'April 7, 2026',R2:'April 14, 2026',R3:'April 21, 2026',R4:'April 28, 2026',
    R5:'May 5, 2026',R6:'May 12, 2026',R7:'May 26, 2026',R8:'June 2, 2026',
    R9:'June 9, 2026',R10:'June 16, 2026',R11:'June 30, 2026',R12:'July 14, 2026',
    R13:'July 21, 2026',R14:'August 4, 2026'
  };
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
      <source src="assets/hero-skate.mp4" type="video/mp4">
    </video>
        <div class="hero-bottom-gradient" aria-hidden="true"></div>
<div class="hero-video-treatment" aria-hidden="true"></div>
    
    <div class="hero-in home-hero-in">
      <div class="hero-title-wrap hero-event-lockup">
        <div class="hero-event-date">September 12th</div>
        <div class="hero-event-title">HBT Championship</div>
        <div class="hero-event-location">Orlando, Florida</div>
      </div>
      <div class="hero-score-divider" aria-hidden="true"></div>
      <div class="hero-status hero-status-clean">
        <span>15 of 18 events complete</span>
        <div class="hero-status-rotator">
          <span id="heroStatusText">${L.last} leads · ${fmt(L.points)} pts</span>
        </div>
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
          <span class="player-avatar-link" onclick="event.stopPropagation()">${avatar(p)}</span>
          <div>
            <div class="leaderboard-name">${p.first} ${p.last}</div>
            <div class="leaderboard-meta">${leaderboardGapText(p,L)}</div>
          </div>
          <div class="leaderboard-points"><b>${fmt(p.points)}</b><span>Points</span></div>
        </a>`).join('')}
      </div>
    </section>

    <section class="premium-section reveal">
      <div class="premium-kicker">Every point matters</div>
      <h2 class="premium-title">2026 Points</h2>
      <p class="premium-copy">Lowest 2 scores of the season are dropped from points total.</p>
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
          <a href="#player/${statWeek.id}" class="stat-week-headshot">${photoBig(statWeek)}</a>
        </article>

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

        <article class="tour-story tour-story-fire dark-green">
          <div class="tour-stat-kicker gold-text">Who's on Fire 🔥</div>
          <div class="tour-story-name">${hot.player.first} ${hot.player.last}</div>
          <div class="tour-story-display">${fmt(hot.points)}</div>
          <div class="tour-story-unit">PTS · LAST 3 EVENTS</div>
          <div class="tour-story-note light-note">Most points over the last 3 events</div>
        </article>

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

  const courseByRound={
    R1:'CREVE COEUR GOLF CLUB',
    R2:'FOREST PARK - HAWTHORNE',
    R3:'TAPAWINGO - MERAMEC',
    R4:'TAPAWINGO - WOODLANDS',
    R5:'FOREST PARK - HAWTHORNE',
    R6:'TAPAWINGO - MERAMEC',
    R7:'FOREST PARK - REDBUD',
    R8:'TAPAWINGO - MERAMEC',
    R9:'FOREST PARK - DOGWOOD',
    R10:'FOREST PARK - REDBUD',
    MC:'TAPAWINGO - WOODLANDS',
    R11:'CRESCENT FARMS - STALLION',
    R12:'FOREST PARK - DOGWOOD',
    R13:'FOREST PARK - REDBUD',
    R14:'TAPAWINGO - PRAIRIE'
  };

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
              <span>— tees</span>
              <span>Rating —</span>
              <span>Slope —</span>
              <span>Par —</span>
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
        const course=D.courses.find(c=>c.name===courseName);
        const parRow=rr.find(r=>Number.isFinite(Number(r.gross))&&Number.isFinite(Number(r.plus)));
        const par=parRow?Number(parRow.gross)-Number(parRow.plus):null;
        const is18=par!==null && par>40;
        const rating=course?(is18?course.rating:course.nineRating):null;

        return `<section class="card round-scorecard reveal">
          <div class="round-scorecard-header">
            <div class="round-scorecard-header-top">
              <div class="round-scorecard-title-block">
                <div class="eyebrow">${s.id==='MC'?'Midseason Classic':s.id}</div>
                <h3>${prettyCourse(courseName)}</h3>
                <div class="round-course-meta">
                  <span>${course?.tees||'—'} tees</span>
                  <span>Rating ${typeof rating==='number'?rating.toFixed(2):'—'}</span>
                  <span>Slope ${course?.slope??'—'}</span>
                  <span>Par ${par??'—'}</span>
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
  const p=D.players[0];
  return `<section class="page players-hub-page">
    <div class="pagehead players-pagehead">
      <div><div class="eyebrow">The Field</div><h1>Players</h1></div>
      <p>Select a player to view their 2026 statistics, handicap history and career records.</p>
    </div>

    <div class="player-head-nav" id="playerHeadNav">
      ${D.players.map((pl,i)=>`
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
function playerPageContent(id){
  const p=byId(id)||D.players[0];
  const s=p.season2026||{rounds:0,wins:0,top3:0,avgFinish:null,avgGross:null,lowGross:null,bestAdjusted:null,results:[]};
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
      <div class="card pad dark course-records-held"><div class="kicker">Course Records Held</div><div class="metric">${c.courseRecords}</div><div class="caption">Current HBT course records</div></div>
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
          <div class="card trend-card handicap-page-trend-card">
            <div class="eyebrow">Handicap trend</div>
            ${trendSvg(p.hc.trend,p.last+' HCP')}
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
                <div class="sub handicap-expand-copy"><span class="expand-copy-open">Click to expand</span><span class="expand-copy-close">Click to collapse</span><span class="expand-copy-arrow">⌄</span></div>
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

const LEAGUE_HISTORY={"bestRounds":[{"rank":1,"player":"Garesche","stat":1.37,"course":"Tapawingo Prairie","date":"8/17/22"},{"rank":2,"player":"Mayer","stat":3.35,"course":"Forest Park Dogwood","date":"7/14/26"},{"rank":3,"player":"Garesche","stat":3.49,"course":"Forest Park Hawthorne","date":"7/20/21"},{"rank":4,"player":"Mayer","stat":3.94,"course":"Tapawingo Meramec","date":"5/7/24"},{"rank":5,"player":"Mayer","stat":3.94,"course":"Tapawingo Meramec","date":"5/13/25"},{"rank":6,"player":"Garesche","stat":3.94,"course":"Tapawingo Meramec","date":"5/12/26"},{"rank":7,"player":"Mayer","stat":4.0,"course":"Ruth Park","date":"7/31/19"},{"rank":8,"player":"Mayer","stat":4.0,"course":"Ruth Park","date":"8/4/20"},{"rank":9,"player":"Mayer","stat":4.0,"course":"Ruth Park","date":"8/3/21"},{"rank":10,"player":"Mayer","stat":4.15,"course":"Forest Park Redbud","date":"8/13/24"},{"rank":11,"player":"Mayer","stat":4.24,"course":"Ruth Park","date":"7/26/24"},{"rank":12,"player":"Mayer","stat":4.28,"course":"Bear Creek","date":"8/30/21"},{"rank":13,"player":"Garesche","stat":4.54,"course":"Forest Park Hawthorne","date":"7/15/25"},{"rank":14,"player":"Mayer","stat":4.57,"course":"Aberdeen","date":"8/29/20"},{"rank":15,"player":"Mayer","stat":4.79,"course":"Tapawingo Meramec","date":"4/18/23"}],"lowestGross":[{"rank":1,"player":"Mayer","stat":36,"course":"Forest Park Dogwood","date":"7/14/26"},{"rank":2,"player":"Garesche","stat":36,"course":"Forest Park Hawthorne","date":"7/20/21"},{"rank":3,"player":"Garesche","stat":37,"course":"Tapawingo Prairie","date":"8/17/22"},{"rank":4,"player":"Mayer","stat":37,"course":"Forest Park Redbud","date":"8/13/24"},{"rank":5,"player":"Mayer","stat":37,"course":"Ruth Park","date":"7/26/24"},{"rank":6,"player":"Garesche","stat":37,"course":"Forest Park Hawthorne","date":"7/15/25"},{"rank":7,"player":"Mayer","stat":37,"course":"Forest Park Highlands","date":"8/13/19"},{"rank":8,"player":"Mayer","stat":38,"course":"Ruth Park","date":"7/31/19"},{"rank":9,"player":"Mayer","stat":38,"course":"Ruth Park","date":"8/4/20"},{"rank":10,"player":"Mayer","stat":38,"course":"Ruth Park","date":"8/3/21"},{"rank":11,"player":"Garesche","stat":38,"course":"Forest Park Redbud","date":"8/5/25"},{"rank":12,"player":"Mayer","stat":38,"course":"Ruth Park","date":"4/11/23"},{"rank":13,"player":"Frankenberg","stat":38,"course":"Forest Park Highlands","date":"8/13/19"},{"rank":14,"player":"Garesche","stat":39,"course":"Forest Park Redbud","date":"8/1/23"},{"rank":15,"player":"Garesche","stat":39,"course":"Forest Park Redbud","date":"6/16/26"}],"worstRounds":[{"rank":1,"player":"Bender","stat":66,"course":"Creve Coeur GC","date":"5/6/20"},{"rank":2,"player":"Bender","stat":65,"course":"Forest Park Hawthorne","date":"4/13/21"},{"rank":3,"player":"Bender","stat":63,"course":"Creve Coeur GC","date":"4/7/26"},{"rank":4,"player":"Frankenberg","stat":61,"course":"Creve Coeur GC","date":"5/8/19"},{"rank":5,"player":"Frankenberg","stat":61,"course":"Tapawingo Prairie","date":"5/28/24"},{"rank":6,"player":"Bender","stat":61,"course":"Tapawingo Woodlands","date":"6/30/26"},{"rank":7,"player":"Bender","stat":60,"course":"Forest Park Dogwood","date":"4/30/24"},{"rank":8,"player":"Davis","stat":60,"course":"Creve Coeur GC","date":"5/12/20"},{"rank":9,"player":"Bender","stat":60,"course":"Creve Coeur GC","date":"5/13/21"},{"rank":10,"player":"Bender","stat":60,"course":"Tapawingo Prairie","date":"5/10/22"},{"rank":11,"player":"Bender","stat":59,"course":"Creve Coeur GC","date":"4/25/23"},{"rank":12,"player":"Davis","stat":59,"course":"Troy Burne - Resort","date":"7/13/24"},{"rank":13,"player":"Frankenberg","stat":59,"course":"Tapawingo Meramec","date":"4/18/23"},{"rank":14,"player":"Schuette","stat":59,"course":"Tapawingo Prairie","date":"5/9/23"},{"rank":15,"player":"Bender","stat":59,"course":"Tapawingo Prairie","date":"5/15/24"}],"hardestCourses":[{"rank":1,"course":"Creve Coeur GC","avg":51.03,"rounds":76},{"rank":2,"course":"Tapawingo Prairie","avg":50.85,"rounds":62},{"rank":3,"course":"Tapawingo Woodlands","avg":49.49,"rounds":43},{"rank":4,"course":"Tapawingo Meramec","avg":48.91,"rounds":69},{"rank":5,"course":"Forest Park Dogwood","avg":47.62,"rounds":56},{"rank":6,"course":"Forest Park Redbud","avg":47.15,"rounds":87},{"rank":7,"course":"Forest Park Highlands","avg":46.85,"rounds":74},{"rank":8,"course":"Ruth Park","avg":46.29,"rounds":77},{"rank":9,"course":"Forest Park Hawthorne","avg":45.4,"rounds":91}]};

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
  window.scrollTo(0,0);
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
  requestAnimationFrame(()=>{setupRetailMenu();initScorecardYearNav();initPlayerHeadNav();initHandicapAccordions();initStatsViewToggle();initPremiumMotion();initHeroStatusRotation();ensureHeroVideoPlayback();});
};
window.addEventListener('hashchange',render);
render();
