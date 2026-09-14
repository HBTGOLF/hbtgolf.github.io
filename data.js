(function(){
  const D = window.HBT_DATA;
  if(!D) return;

  const course = 'Orange County National - Crooked Cat';
  const dateIso = '2026-09-11';
  const dateShort = '9/11/26';
  const frontPar = [5,4,4,5,4,3,4,3,4];
  const backPar  = [4,4,4,3,5,3,4,5,4];
  const fullPar = [...frontPar,...backPar];

  const front = {
    am:{gross:51,plus:15,hcp:6.63,adj:44.37,fin:5,points:500,putts:16,gir:0,fir:0,scores:[6,5,7,8,5,6,5,4,5]},
    cd:{gross:51,plus:15,hcp:8.65,adj:42.35,fin:4,points:600,putts:21,gir:11,fir:67,scores:[7,6,5,7,7,5,5,4,5]},
    jb:{gross:61,plus:25,hcp:12.36,adj:48.64,fin:6,points:400,putts:19,gir:22,fir:56,scores:[8,7,7,8,8,4,8,3,8]},
    rg:{gross:48,plus:12,hcp:6.17,adj:41.83,fin:3,points:700,putts:19,gir:33,fir:67,scores:[5,5,7,6,6,4,7,3,5]},
    ss:{gross:52,plus:16,hcp:10.99,adj:41.01,fin:2,points:850,putts:18,gir:11,fir:78,scores:[7,6,8,5,5,4,7,4,6]},
    tf:{gross:49,plus:13,hcp:9.11,adj:39.89,fin:1,points:1000,putts:18,gir:null,fir:56,scores:[6,5,5,4,4,6,6,6,5]}
  };

  const back = {
    am:{gross:46,plus:10,hcp:6.63,adj:39.37,fin:2,points:850,putts:19,gir:33,fir:22,scores:[5,4,5,4,8,4,5,5,6]},
    cd:{gross:51,plus:15,hcp:8.65,adj:42.35,fin:3,points:700,putts:21,gir:22,fir:56,scores:[4,6,8,6,6,3,5,7,6]},
    jb:{gross:58,plus:22,hcp:12.36,adj:45.64,fin:6,points:400,putts:19,gir:0,fir:33,scores:[7,5,7,5,7,5,8,7,7]},
    rg:{gross:41,plus:5,hcp:6.17,adj:34.83,fin:1,points:1000,putts:19,gir:67,fir:33,scores:[4,5,5,4,5,3,5,6,4]},
    ss:{gross:55,plus:19,hcp:10.99,adj:44.01,fin:5,points:500,putts:18,gir:0,fir:78,scores:[5,6,7,6,7,5,6,7,6]},
    tf:{gross:53,plus:17,hcp:9.11,adj:43.89,fin:4,points:600,putts:18,gir:null,fir:44,scores:[6,5,7,6,6,6,6,6,5]}
  };

  const major = {
    am:{gross:97,plus:25,hcp:13.26,adj:83.74,fin:2,points:850,putts:35,gir:17,fir:14},
    cd:{gross:102,plus:30,hcp:17.30,adj:84.70,fin:4,points:600,putts:42,gir:17,fir:64},
    jb:{gross:119,plus:47,hcp:24.72,adj:94.28,fin:6,points:400,putts:38,gir:11,fir:43},
    rg:{gross:89,plus:17,hcp:12.34,adj:76.66,fin:1,points:1000,putts:38,gir:50,fir:43},
    ss:{gross:107,plus:35,hcp:21.98,adj:85.02,fin:5,points:500,putts:36,gir:6,fir:79},
    tf:{gross:102,plus:30,hcp:18.22,adj:83.78,fin:3,points:700,putts:36,gir:null,fir:64}
  };

  const ids = ['tf','cd','am','rg','ss','jb'];
  const names = {
    tf:'Tony Frankenberg', cd:'Corey Davis', am:'Anthony Mayer',
    rg:'Rick Garesche', ss:'Scott Schuette', jb:'Josh Bender'
  };

  const roundRows = (source, includeScores=true)=>Object.entries(source).map(([id,r])=>({
    id,
    gross:r.gross,
    plus:r.plus,
    hcp:r.hcp,
    adj:r.adj,
    fin:r.fin,
    scores:includeScores ? r.scores : [...front[id].scores,...back[id].scores],
    putts:r.putts,
    gir:r.gir,
    driving:r.fir
  }));

  D.rounds = D.rounds || {};
  D.rounds['CH-F9'] = roundRows(front);
  D.rounds['CH-B9'] = roundRows(back);
  D.rounds['CH-MAJOR'] = roundRows(major,false);

  D.roundMeta = D.roundMeta || {};
  D.roundMeta['CH-F9'] = {course,date:dateIso,tees:'Green',rating:35.20,slope:130,par:36,holes:9,eventType:'Championship'};
  D.roundMeta['CH-B9'] = {course,date:dateIso,tees:'Green',rating:35.20,slope:130,par:36,holes:9,eventType:'Championship'};
  D.roundMeta['CH-MAJOR'] = {course,date:dateIso,tees:'Green',rating:70.40,slope:130,par:72,holes:18,eventType:'Championship'};

  D.pointsByRound = D.pointsByRound || {};
  D.pointsByRound['CH-F9'] = Object.fromEntries(Object.entries(front).map(([id,r])=>[id,r.points]));
  D.pointsByRound['CH-B9'] = Object.fromEntries(Object.entries(back).map(([id,r])=>[id,r.points]));
  D.pointsByRound['CH-MAJOR'] = Object.fromEntries(Object.entries(major).map(([id,r])=>[id,r.points]));
  D.pointsByRound.CH = Object.fromEntries(ids.map(id=>[id,front[id].points+back[id].points+major[id].points]));

  D.roundSummaries = (D.roundSummaries || []).filter(s=>!['CH-F9','CH-B9','CH-MAJOR'].includes(s.id));
  D.roundSummaries.push(
    {id:'CH-F9',name:'Championship Front 9',winner:'tf'},
    {id:'CH-B9',name:'Championship Back 9',winner:'rg'},
    {id:'CH-MAJOR',name:'Championship Major Result',winner:'rg'}
  );

  const finalPoints = {tf:14650,cd:14300,am:14000,rg:14000,ss:12700,jb:9900};
  const finalPos = {tf:1,cd:2,am:3,rg:4,ss:5,jb:6};
  const currentHcp = {tf:9.06,cd:8.65,am:6.85,rg:5.89,ss:11.68,jb:12.72};
  const hcpAdds = {
    am:[{score:51,diff:13.73,handicap:6.85},{score:46,diff:9.39,handicap:6.85}],
    cd:[{score:51,diff:13.73,handicap:8.65},{score:51,diff:13.73,handicap:8.65}],
    jb:[{score:61,diff:22.43,handicap:12.66},{score:58,diff:19.82,handicap:12.72}],
    rg:[{score:48,diff:11.13,handicap:6.17},{score:41,diff:5.04,handicap:5.89}],
    ss:[{score:52,diff:14.60,handicap:10.99},{score:55,diff:17.21,handicap:11.68}],
    tf:[{score:49,diff:12.00,handicap:9.06},{score:53,diff:15.47,handicap:9.06}]
  };

  (D.players || []).forEach(p=>{
    p.points = finalPoints[p.id] ?? p.points;
    p.pos = finalPos[p.id] ?? p.pos;
    p.hcp = currentHcp[p.id] ?? p.hcp;

    if(!p.hc) return;
    const existing = Array.isArray(p.hc.last20) ? p.hc.last20 : [];
    const retained = existing.slice(-18).map(r=>({...r}));
    const maxRaw = existing.reduce((m,r)=>Math.max(m,Number(r.rawRound)||0),0);
    const additions = (hcpAdds[p.id]||[]).map((r,i)=>({
      rawRound:maxRaw+i+1,
      date:dateShort,
      course:course.toUpperCase(),
      score:r.score,
      diff:r.diff,
      handicap:r.handicap,
      iso:dateIso,
      counts:false,
      rd:maxRaw+i+1
    }));
    const next = [...retained,...additions];
    const ranked = next.map((r,i)=>({i,diff:Number(r.diff)}))
      .filter(x=>Number.isFinite(x.diff))
      .sort((a,b)=>a.diff-b.diff || a.i-b.i);
    const counting = new Set(ranked.slice(0,8).map(x=>x.i));
    next.forEach((r,i)=>{ r.counts = counting.has(i); });
    p.hc.last20 = next;

    const trend = Array.isArray(p.hc.trend) ? p.hc.trend.filter(x=>x.iso!==dateIso) : [];
    (hcpAdds[p.id]||[]).forEach(x=>trend.push({date:dateShort,iso:dateIso,value:x.handicap}));
    p.hc.trend = trend;
  });

  D.players.sort((a,b)=>Number(a.pos)-Number(b.pos));

  D.latestRound = {id:'CH',course,date:'September 11, 2026'};
  if(D.dataSource) D.dataSource.synced = '2026-09-11';
  D.latestScorecard = {
    roundId:'CH',
    eventId:'2026-CH',
    course,
    date:'September 11, 2026',
    tees:'Green',
    rating:70.40,
    slope:130,
    holesPlayed:18,
    totalPar:72,
    par:fullPar,
    players:Object.entries(major).map(([id,r])=>({
      id,
      name:names[id],
      scores:[...front[id].scores,...back[id].scores],
      total:r.gross,
      parPlusMinus:r.plus,
      hdp:r.hcp,
      adj:r.adj,
      finish:r.fin
    }))
  };

  D.courses = D.courses || [];
  const existingCourseIndex = D.courses.findIndex(c=>String(c.name||'').toLowerCase()===course.toLowerCase());
  const courseRecord = {
    name:course,
    par:36,
    tees:'Green',
    rating:70.40,
    nineRating:35.20,
    slope:130,
    record:41,
    holders:['Garesche'],
    personal:[
      {id:'rg',score:41},{id:'am',score:46},{id:'tf',score:49},
      {id:'cd',score:51},{id:'ss',score:52},{id:'jb',score:58}
    ],
    imageClass:''
  };
  if(existingCourseIndex>=0) D.courses[existingCourseIndex]=courseRecord;
  else D.courses.push(courseRecord);

  if(D.leagueHistory){
    if(Array.isArray(D.leagueHistory.worstRounds)){
      const rows=D.leagueHistory.worstRounds.filter(r=>!(r.player==='Bender' && r.course==='Orange County National Crooked Cat' && r.date===dateShort));
      rows.push({player:'Bender',stat:61,course:'Orange County National Crooked Cat',date:dateShort});
      rows.sort((a,b)=>Number(b.stat)-Number(a.stat));
      D.leagueHistory.worstRounds=rows.slice(0,15).map((r,i)=>({...r,rank:i+1}));
    }
    if(Array.isArray(D.leagueHistory.hardestCourses)){
      const rows=D.leagueHistory.hardestCourses.filter(r=>r.course!=='Orange County National Crooked Cat');
      rows.push({course:'Orange County National Crooked Cat',avg:51.33,rounds:12});
      rows.sort((a,b)=>Number(b.avg)-Number(a.avg));
      D.leagueHistory.hardestCourses=rows.map((r,i)=>({...r,rank:i+1}));
    }
  }
})();
