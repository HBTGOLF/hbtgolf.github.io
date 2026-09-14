(function(){
  if(typeof currentSeasonStandings!=='function') return;

  buildTitleRace = function(){
    const standings=currentSeasonStandings();
    const leader=standings[0];
    const chPts=id=>typeof championshipAggregatePoints==='function' ? championshipAggregatePoints(id) : 0;
    const map={};

    standings.forEach(entry=>{
      const p=entry.player;
      const points=entry.points;
      const gap=Math.max(0,leader.points-points);
      const missed=typeof missedRegularRounds==='function' ? missedRegularRounds(p.id) : [];
      const season=typeof playerSeason2026FromRounds==='function' ? playerSeason2026FromRounds(p.id) : null;
      const wins=season?.wins ?? p.wins ?? 0;

      if(p.id==='tf'){
        map[p.id]={
          status:'champion',
          label:'2026 CHAMPION',
          blurb:`Tony put together a complete season and saved his biggest push for the finish. He won the Championship Front 9, collected ${fmt(chPts(p.id))} points in Orlando, erased the final gap to Corey, and closed at ${fmt(points)} points to win the 2026 HBT title by ${fmt(points-standings[1].points)}. A season that stayed within reach all year ended with exactly the finish he needed.`
        };
      }else if(p.id==='cd'){
        map[p.id]={
          status:'runner-up',
          label:'RUNNER-UP',
          blurb:`Corey had one of the strongest seasons in the league and spent most of the year as the guy everyone was chasing. He piled up ${wins} wins before the Championship, carried the points lead into Orlando, added ${fmt(chPts(p.id))} more there, and finished with ${fmt(points)} points. The trophy slipped away at the very end, but being 350 points from a title after an 18-event season is a pretty good year, even for Corey.`
        };
      }else if(p.id==='am'){
        map[p.id]={
          status:'final',
          label:'3RD PLACE',
          blurb:`Anthony was in the mix from spring through the final Major Result and finished the season with ${fmt(points)} points. His ${fmt(chPts(p.id))}-point Championship included a runner-up finish on the Back 9 and another second in the Major Result, giving him one of the strongest finishes of the weekend. He ends 2026 tied with Rick on points and only ${fmt(gap)} behind the champion.`
        };
      }else if(p.id==='rg'){
        map[p.id]={
          status:'final',
          label:'4TH PLACE',
          blurb:`Rick finished 2026 playing his best golf when the stakes were highest. He won the Championship Back 9, won the 18-hole Major Result, scored a league-best ${fmt(chPts(p.id))} Championship points, and finished with ${fmt(points)} overall. Two wins in the final event is a pretty memorable way to close a season.`
        };
      }else if(p.id==='ss'){
        map[p.id]={
          status:'final',
          label:'5TH PLACE',
          blurb:`Scott finished the year at ${fmt(points)} points and had plenty of stretches where his game could hang with anyone in the league. He opened the Championship with a second-place Front 9 worth 850 points and collected ${fmt(chPts(p.id))} across the weekend. It was a solid season with enough good golf to make him dangerous every time he showed up.`
        };
      }else if(p.id==='jb'){
        const mia=missed.length
          ? ` Even with ${missed.length===1?missed[0]:missed.join(', ').replace(/, ([^,]*)$/, ' and $1')} going down as ${missed.length===1?'an MIA week':'MIA weeks'}, he kept grinding when he was in the field.`
          : '';
        map[p.id]={
          status:'final',
          label:'6TH PLACE',
          blurb:`Josh finishes 2026 with ${fmt(points)} points and deserves credit for sticking with the season through some tough scoring stretches.${mia} He added ${fmt(chPts(p.id))} points at the Championship and closed the year with two more full scorecards in Orlando. The standings do not show every good swing, and Josh had more of them than sixth place suggests.`
        };
      }else{
        map[p.id]={status:'final',label:'SEASON COMPLETE',blurb:`${p.first} finishes the 2026 season with ${fmt(points)} points and a full year of HBT golf in the books.`};
      }
    });
    return map;
  };

  function applyPostseasonV150(){
    const route=location.hash.slice(1)||'home';

    if(route!=='home'){
      document.querySelectorAll('.round-scorecard .eyebrow').forEach(el=>{
        const labels={
          'CH-F9':'Championship Front 9',
          'CH-B9':'Championship Back 9',
          'CH-MAJOR':'Championship Major Result'
        };
        if(labels[el.textContent.trim()]) el.textContent=labels[el.textContent.trim()];
      });
      return;
    }

    const standings=currentSeasonStandings();
    const champ=standings[0];
    const setText=(sel,text)=>{const el=document.querySelector(sel);if(el)el.textContent=text;};

    setText('.hero-event-date','2026 Season Complete');
    setText('.hero-event-title',`${champ.player.first} ${champ.player.last}`);
    setText('.hero-event-location',`Season Champion · ${fmt(champ.points)} points`);
    setText('.leaderboard-title-race-help','Click a player to read their 2026 season recap.');

    document.querySelectorAll('.title-race-detail-kicker').forEach(el=>el.textContent='2026 Season Recap');
    document.querySelectorAll('[data-title-race-toggle]').forEach(el=>{
      const id=el.getAttribute('data-title-race-toggle');
      const p=byId(id);
      if(p) el.setAttribute('aria-label',`Show ${p.first} ${p.last}'s 2026 season recap`);
    });

    const statCard=document.querySelector('.tour-editorial-grid .stat-week-card');
    const rick=byId('rg');
    if(statCard && rick){
      const name=statCard.querySelector('.tour-story-name');
      const display=statCard.querySelector('.tour-story-display');
      const unit=statCard.querySelector('.tour-story-unit');
      const note=statCard.querySelector('.tour-story-note');
      const head=statCard.querySelector('.stat-week-headshot');
      if(name) name.textContent='Rick Garesche';
      if(display) display.textContent='2';
      if(unit) unit.textContent='CHAMPIONSHIP WINS';
      if(note) note.textContent='Won the Back 9 and Major Result · 2,700 points in Orlando';
      if(head) head.innerHTML=photoBig(rick);
    }
  }

  const priorRender=render;
  render=function(){
    priorRender();
    requestAnimationFrame(applyPostseasonV150);
  };
  window.addEventListener('hashchange',()=>requestAnimationFrame(applyPostseasonV150));
  render();
})();
