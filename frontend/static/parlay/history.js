// Weeks 2–6 rebuilt from Pandolfi's note + DraftKings screenshots; stats and scoring plays from box scores.
const Q = ['Q1', 'Q2', 'Q3', 'Q4'];
function G(away, home, an, hn, name, start, a, h, extra) {
  return Object.assign({ away, home, an, hn, name, short: `${away} @ ${home}`, start, showTime: true, final: true,
    a, h, per: a && a.length > 4 ? Q.concat(['OT']) : Q.slice() }, extra || {});
}
const ATD = 'Anytime TD Scorer';
const run = (yds, q, clock, team, desc) => ({ yds, how: 'TD run', q, clock, team, desc });
const catch_ = (yds, q, clock, team, desc) => ({ yds, how: 'TD catch', q, clock, team, desc });
const pass = (yds, q, clock, team, to) => ({ yds, how: 'TD pass', q, clock, team, desc: 'to ' + to });

const W2 = {
  key: 'w2', label: 'Wk 2',
  games: {
    detbuf: G('DET', 'BUF', 'DET Lions', 'BUF Bills', 'Lions @ Bills', '2026-09-17T20:15:00-04:00', [0, 10, 7, 14], [14, 13, 7, 7]),
    cinhou: G('CIN', 'HOU', 'CIN Bengals', 'HOU Texans', 'Bengals @ Texans', '2026-09-20T13:00:00-04:00', [0, 7, 10, 3], [0, 3, 3, 0]),
    minchi: G('MIN', 'CHI', 'MIN Vikings', 'CHI Bears', 'Vikings @ Bears', '2026-09-20T13:00:00-04:00', [3, 3, 0, 3], [3, 0, 0, 0]),
    gbnyj: G('GB', 'NYJ', 'GB Packers', 'NYJ Jets', 'Packers @ Jets', '2026-09-20T13:00:00-04:00', [0, 7, 0, 10, 3], [0, 7, 7, 3, 0]),
    cletb: G('CLE', 'TB', 'CLE Browns', 'TB Buccaneers', 'Browns @ Buccaneers', '2026-09-20T13:00:00-04:00', [3, 3, 10, 7], [6, 3, 7, 3]),
    phiten: G('PHI', 'TEN', 'PHI Eagles', 'TEN Titans', 'Eagles @ Titans', '2026-09-20T13:00:00-04:00', [0, 14, 3, 7], [7, 3, 7, 3])
  },
  tickets: [{
    title: '8 Pick Parlay', odds: 12660, wager: 10, toPay: 1276, funded: 'WC', noPick: ['WC'], placed: 'Two $5 slips, $638 each',
    items: [
      { who: 'AP', sel: 'Josh Allen', mkt: ATD, odds: -160, game: 'detbuf', kind: 'count', target: 1, unit: 'TD', actual: 2, result: 'hit', tds: [run(1, 'Q1', '9:09', 'BUF'), run(2, 'Q3', '1:07', 'BUF')] },
      { who: 'Hof', sel: 'Amon-Ra St. Brown', mkt: ATD, odds: 110, game: 'detbuf', kind: 'count', target: 1, unit: 'TD', actual: 2, result: 'hit',
        ps: { rec: 9, recYds: 142, recTd: 2 }, tds: [catch_(2, 'Q3', '9:29', 'DET'), catch_(27, 'Q4', '1:42', 'DET')] },
      { who: 'Ip', sel: 'Over 77.5', mkt: "Ja'Marr Chase Receiving Yards", odds: -111, game: 'cinhou', kind: 'count', over: true, target: 77.5, unit: 'yds', actual: 75, result: 'miss',
        flag: 'Pandolfi’s note marks this a hit, but Chase finished with 75 yards against the 77.5 line.',
        ps: { rec: 7, recYds: 75, recTd: 2 }, tds: [catch_(32, 'Q2', '3:29', 'CIN'), catch_(18, 'Q3', '3:03', 'CIN')] },
      { who: 'Lou', sel: 'Over 46.5', mkt: 'Colston Loveland Receiving Yards', odds: -115, game: 'minchi', kind: 'count', over: true, target: 46.5, unit: 'yds', actual: 3, result: 'miss',
        ps: { rec: 1, recYds: 3, recTd: 0 } },
      { who: 'Allan', sel: 'Over 38.5', mkt: 'Kyle Monangai Rushing Yards', odds: -115, game: 'minchi', kind: 'count', over: true, target: 38.5, unit: 'yds', actual: 47, result: 'hit',
        ps: { first: 'rush', car: 10, rushYds: 47, rushTd: 0 } },
      { who: '?', sel: 'Over 77.5', mkt: 'Saquon Barkley Rushing Yards', odds: -114, game: 'phiten', kind: 'count', over: true, target: 77.5, unit: 'yds', actual: 9, result: 'void',
        voidNote: 'Left in the first half with a stinger (4 carries, 9 yds). Most likely voided by DraftKings Early Exit Protection, but that isn’t confirmed.',
        flag: 'This pick isn’t in Pandolfi’s note. Whose was it?',
        ps: { first: 'rush', car: 4, rushYds: 9, rushTd: 0, rec: 1, recYds: 11, recTd: 0 } },
      { who: 'TJ', sel: '2+', mkt: 'Jordan Love Passing TDs', odds: -133, game: 'gbnyj', kind: 'count', target: 2, unit: 'TD', actual: 2, result: 'hit',
        ps: { first: 'pass', cmp: 16, att: 29, passYds: 145, passTd: 2, int: 0 }, tds: [pass(6, 'Q2', '9:35', 'GB', 'MarShawn Lloyd'), pass(3, 'Q4', '7:58', 'GB', 'Christian Watson')] },
      { who: 'Zach', sel: 'Bucky Irving', mkt: ATD, odds: -130, game: 'cletb', kind: 'count', target: 1, unit: 'TD', actual: 0, result: 'miss',
        ps: { first: 'rush', car: 17, rushYds: 89, rushTd: 0, rec: 4, recYds: 1, recTd: 0 } }
    ]
  }]
};

const W3 = {
  key: 'w3', label: 'Wk 3',
  games: {
    atlgb: G('ATL', 'GB', 'ATL Falcons', 'GB Packers', 'Falcons @ Packers', '2026-09-24T20:15:00-04:00', [7, 10, 7, 11], [7, 0, 0, 7]),
    lacbuf: G('LAC', 'BUF', 'LAC Chargers', 'BUF Bills', 'Chargers @ Bills', '2026-09-27T13:00:00-04:00', [10, 0, 3, 3], [0, 10, 0, 14]),
    nyjdet: G('NYJ', 'DET', 'NYJ Jets', 'DET Lions', 'Jets @ Lions', '2026-09-27T13:00:00-04:00', [0, 7, 3, 14], [0, 10, 7, 14]),
    seawas: G('SEA', 'WAS', 'SEA Seahawks', 'WAS Commanders', 'Seahawks @ Commanders', '2026-09-27T13:00:00-04:00', [0, 10, 7, 14], [7, 10, 7, 9])
  },
  tickets: [{
    title: '5 Pick Parlay', odds: 3477, wager: 10, toPay: 357.75, funded: 'TJ', noPick: ['Ip', 'WC', 'Hof'], placed: 'Placed Sep 24, 7:06 PM',
    items: [
      { who: 'TJ', sel: 'Matthew Golden', mkt: ATD, odds: 200, game: 'atlgb', kind: 'count', target: 1, unit: 'TD', actual: 1, result: 'hit',
        ps: { rec: 5, tgt: 12, recYds: 100, recTd: 1 }, tds: [catch_(15, 'Q4', '8:18', 'GB')] },
      { who: 'Allan', sel: '72+', mkt: 'Christian Watson Receiving Yards', odds: -105, game: 'atlgb', kind: 'count', target: 72, unit: 'yds', actual: 96, result: 'hit',
        ps: { rec: 7, tgt: 10, recYds: 96, recTd: 1 }, tds: [catch_(4, 'Q1', '5:13', 'GB')] },
      { who: 'Lou', sel: 'BUF Bills -7', mkt: 'Spread', odds: -112, game: 'lacbuf', kind: 'spread', side: 'home', line: -7, result: 'hit' },
      { who: 'AP', sel: 'Amon-Ra St. Brown', mkt: ATD, odds: -125, game: 'nyjdet', kind: 'count', target: 1, unit: 'TD', actual: 1, result: 'hit',
        ps: { rec: 4, tgt: 8, recYds: 19, recTd: 1 }, tds: [catch_(4, 'Q2', '1:36', 'DET')] },
      { who: 'Zach', sel: 'Jaxon Smith-Njigba', mkt: ATD, odds: -110, game: 'seawas', kind: 'count', target: 1, unit: 'TD', actual: 2, result: 'hit',
        ps: { rec: 10, tgt: 14, recYds: 128, recTd: 2 }, tds: [catch_(1, 'Q2', '13:27', 'SEA'), catch_(11, 'Q4', '11:53', 'SEA')] }
    ]
  }]
};

const W4games = {
  indwsh: G('IND', 'WAS', 'IND Colts', 'WAS Commanders', 'Colts @ Commanders', '2026-10-04T09:30:00-04:00', [0, 10, 10, 10], [6, 0, 7, 0]),
  arinyg: G('ARI', 'NYG', 'ARI Cardinals', 'NYG Giants', 'Cardinals @ Giants', '2026-10-04T13:00:00-04:00', [14, 3, 7, 0], [3, 16, 8, 9]),
  nebuf: G('NE', 'BUF', 'NE Patriots', 'BUF Bills', 'Patriots @ Bills', '2026-10-04T13:00:00-04:00', [7, 7, 7, 8], [0, 17, 0, 9]),
  gbtb: G('GB', 'TB', 'GB Packers', 'TB Buccaneers', 'Packers @ Buccaneers', '2026-10-04T13:00:00-04:00', [0, 10, 7, 0], [0, 7, 0, 7]),
  nyjchi: G('NYJ', 'CHI', 'NYJ Jets', 'CHI Bears', 'Jets @ Bears', '2026-10-04T13:00:00-04:00', [0, 3, 3, 6], [7, 6, 7, 3]),
  jaxcin: G('JAX', 'CIN', 'JAX Jaguars', 'CIN Bengals', 'Jaguars @ Bengals', '2026-10-04T13:00:00-04:00', [3, 10, 3, 6], [0, 3, 7, 7]),
  tenbal: G('TEN', 'BAL', 'TEN Titans', 'BAL Ravens', 'Titans @ Ravens', '2026-10-04T13:00:00-04:00', [7, 0, 3, 8], [7, 17, 0, 0]),
  kclv: G('KC', 'LV', 'KC Chiefs', 'LV Raiders', 'Chiefs @ Raiders', '2026-10-04T16:25:00-04:00', [7, 3, 0, 20], [7, 6, 0, 14]),
  detcar: G('DET', 'CAR', 'DET Lions', 'CAR Panthers', 'Lions @ Panthers', '2026-10-04T20:20:00-04:00', [3, 13, 3, 7], [7, 9, 13, 3])
};
const W4A = {
  key: 'w4a', label: 'Wk 4 #1', games: W4games,
  tickets: [{
    title: '8 Pick Parlay', odds: 6565, wager: 10, toPay: 666.50, funded: 'WC', noPick: [], placed: 'Placed week of Sep 28',
    items: [
      { who: 'Ip', sel: '50+', mkt: 'Josh Downs Receiving Yards', odds: -211, game: 'indwsh', kind: 'count', target: 50, unit: 'yds', actual: 16, result: 'miss',
        ps: { rec: 3, tgt: 4, recYds: 16, recTd: 0 } },
      { who: 'Lou', sel: 'Over 0.5', mkt: 'Jameis Winston Interceptions Thrown', odds: -156, game: 'arinyg', kind: 'count', over: true, target: 0.5, unit: 'INT', actual: 2, result: 'hit',
        ps: { first: 'pass', cmp: 18, att: 29, passYds: 250, passTd: 3, int: 2 } },
      { who: 'AP', sel: 'BUF Bills -7', mkt: 'Spread', odds: -105, game: 'nebuf', kind: 'spread', side: 'home', line: -7, result: 'miss' },
      { who: 'Hof', sel: 'Josh Allen', mkt: ATD, odds: -175, game: 'nebuf', kind: 'count', target: 1, unit: 'TD', actual: 1, result: 'hit',
        ps: { first: 'rush', car: 5, rushYds: 4, rushTd: 1 }, tds: [run(2, 'Q2', '1:00', 'BUF')] },
      { who: 'TJ', sel: '50+', mkt: 'Matthew Golden Receiving Yards', odds: -130, game: 'gbtb', kind: 'count', target: 50, unit: 'yds', actual: 21, result: 'miss',
        ps: { rec: 3, tgt: 7, recYds: 21, recTd: 1, car: 1, rushYds: 6, rushTd: 0 }, tds: [catch_(2, 'Q2', '12:54', 'GB')] },
      { who: 'Allan', sel: 'Over 64.5', mkt: 'Christian Watson Receiving Yards', odds: -120, game: 'gbtb', kind: 'count', over: true, target: 64.5, unit: 'yds', actual: 47, result: 'miss',
        ps: { rec: 3, tgt: 3, recYds: 47, recTd: 0 } },
      { who: 'WC', sel: 'Over 54.5', mkt: 'Bucky Irving Rushing Yards', odds: -125, game: 'gbtb', kind: 'count', over: true, target: 54.5, unit: 'yds', actual: 61, result: 'hit',
        ps: { first: 'rush', car: 16, rushYds: 61, rushTd: 0, rec: 0, recYds: 0, recTd: 0 } },
      { who: 'Zach', sel: '2+', mkt: 'Bryce Young Passing TDs', odds: -132, game: 'detcar', kind: 'count', target: 2, unit: 'TD', actual: 2, result: 'hit',
        ps: { first: 'pass', cmp: 29, att: 41, passYds: 329, passTd: 2, int: 0, car: 3, rushYds: 3, rushTd: 0 },
        tds: [pass(32, 'Q2', '8:08', 'CAR', 'Tetairoa McMillan'), pass(10, 'Q3', '9:33', 'CAR', 'Tetairoa McMillan')] }
    ]
  }]
};
const W4B = {
  key: 'w4b', label: 'Wk 4 #2', games: W4games,
  tickets: [{
    title: '8 Pick Parlay', odds: 3977, wager: 10, toPay: 407.70, funded: 'TJ', noPick: [], placed: 'Placed Thu Oct 1',
    items: [
      { who: 'Ip', sel: '50+', mkt: 'Brock Bowers Receiving Yards', odds: -370, game: 'kclv', kind: 'count', target: 50, unit: 'yds', actual: 86, result: 'hit',
        ps: { rec: 6, tgt: 11, recYds: 86, recTd: 1 }, tds: [catch_(20, 'Q4', '1:46', 'LV')] },
      { who: 'Lou', sel: 'CHI Bears -3.5', mkt: 'Spread', odds: -105, game: 'nyjchi', kind: 'spread', side: 'home', line: -3.5, result: 'hit' },
      { who: 'AP', sel: "Ja'Marr Chase", mkt: ATD, odds: -115, game: 'jaxcin', kind: 'count', target: 1, unit: 'TD', actual: 0, result: 'void',
        voidNote: 'Left in the 2nd quarter (12:04) with a concussion. DraftKings Early Exit Protection voided the leg.', ps: { rec: 3, tgt: 3, recYds: 27, recTd: 0 } },
      { who: 'Hof', sel: 'Amon-Ra St. Brown', mkt: ATD, odds: -125, game: 'detcar', kind: 'count', target: 1, unit: 'TD', actual: 0, result: 'miss',
        ps: { rec: 8, tgt: 11, recYds: 75, recTd: 0 } },
      { who: 'TJ', sel: 'Derrick Henry', mkt: ATD, odds: -215, game: 'tenbal', kind: 'count', target: 1, unit: 'TD', actual: 1, result: 'hit',
        ps: { first: 'rush', car: 23, rushYds: 73, rushTd: 1, rec: 2, recYds: 6 }, tds: [run(5, 'Q1', null, 'BAL')] },
      { who: 'Allan', sel: 'Over 245.5', mkt: 'Jordan Love Passing Yards', odds: -111, game: 'gbtb', kind: 'count', over: true, target: 245.5, unit: 'yds', actual: 197, result: 'miss',
        ps: { first: 'pass', cmp: 22, att: 30, passYds: 197, passTd: 2, int: 1, car: 4, rushYds: -8, rushTd: 0 },
        tds: [pass(2, 'Q2', '12:54', 'GB', 'Matthew Golden'), pass(2, 'Q3', '10:32', 'GB', 'Tucker Kraft')] },
      { who: 'Zach', sel: 'James Cook', mkt: ATD, odds: -125, game: 'nebuf', kind: 'count', target: 1, unit: 'TD', actual: 1, result: 'hit',
        ps: { first: 'rush', car: 12, rushYds: 75, rushTd: 1, rec: 2, recYds: 8 }, tds: [run(8, 'Q2', '14:15', 'BUF')] },
      { who: 'WC', sel: 'Over 52.5', mkt: 'Dalton Kincaid Receiving Yards', odds: -115, game: 'nebuf', kind: 'count', over: true, target: 52.5, unit: 'yds', actual: 7, result: 'miss',
        ps: { rec: 1, tgt: 2, recYds: 7, recTd: 0 } }
    ]
  }]
};

const W5 = {
  key: 'w5', label: 'Wk 5',
  games: {
    phijax: G('PHI', 'JAX', 'PHI Eagles', 'JAX Jaguars', 'Eagles @ Jaguars', '2026-10-11T09:30:00-04:00', [0, 14, 0, 3], [7, 0, 3, 9], { tag: 'London' }),
    chigb: G('CHI', 'GB', 'CHI Bears', 'GB Packers', 'Bears @ Packers', '2026-10-11T13:00:00-04:00', [0, 7, 0, 0], [7, 7, 9, 8]),
    minno: G('MIN', 'NO', 'MIN Vikings', 'NO Saints', 'Vikings @ Saints', '2026-10-11T13:00:00-04:00', [3, 3, 7, 10], [0, 7, 6, 0])
  },
  tickets: [{
    title: '8 Pick Parlay', odds: 56081, wager: 10, toPay: 5618.10, funded: 'Ip', noPick: [], placed: 'Placed Wed Oct 7',
    items: [
      { who: 'WC', sel: '70+', mkt: 'Bhayshul Tuten Rushing Yards', odds: -101, game: 'phijax', kind: 'count', target: 70, unit: 'yds', actual: 72, result: 'hit',
        ps: { first: 'rush', car: 22, rushYds: 72, rushTd: 0, rec: 2, tgt: 3, recYds: 24, recTd: 0 } },
      { who: 'Zach', sel: 'MIN Vikings -1.5', mkt: 'Spread', odds: -115, game: 'minno', kind: 'spread', side: 'away', line: -1.5, result: 'hit' },
      { who: 'Ip', sel: '60+', mkt: 'Luther Burden III Receiving Yards', odds: 151, game: 'chigb', kind: 'count', target: 60, unit: 'yds', actual: 47, result: 'miss',
        ps: { rec: 4, tgt: 6, recYds: 47, recTd: 0, car: 4, rushYds: 2, rushTd: 0 } },
      { who: 'Lou', sel: 'CHI Bears -13.5', mkt: 'Spread Alternate', odds: 366, game: 'chigb', kind: 'spread', side: 'away', line: -13.5, result: 'miss' },
      { who: 'AP', sel: '60+', mkt: 'Kyle Monangai Rushing Yards', odds: 117, game: 'chigb', kind: 'count', target: 60, unit: 'yds', actual: 0, result: 'void',
        voidNote: 'Ruled out before kickoff with a toe injury, so the leg was voided.' },
      { who: 'Hof', sel: 'Over 45.5', mkt: 'Total Points', odds: -112, game: 'chigb', kind: 'total', over: true, target: 45.5, unit: 'pts', actual: 38, result: 'miss' },
      { who: 'TJ', sel: 'Tucker Kraft', mkt: ATD, odds: 225, game: 'chigb', kind: 'count', target: 1, unit: 'TD', actual: 0, result: 'miss',
        ps: { rec: 5, tgt: 5, recYds: 64, recTd: 0, car: 1, rushYds: 2, rushTd: 0 } },
      { who: 'Allan', sel: 'GB Packers', mkt: 'Last to Score', odds: -110, game: 'chigb', kind: 'last', team: 'GB', result: 'hit',
        tds: [run(4, 'Q4', '14:55', 'GB', 'MarShawn Lloyd, plus a 2-pt conversion')] }
    ]
  }]
};

const W6 = {
  key: 'w6', label: 'Wk 6',
  games: {
    seaden: G('SEA', 'DEN', 'SEA Seahawks', 'DEN Broncos', 'Seahawks @ Broncos', '2026-10-15T20:15:00-04:00', [3, 0, 0, 11, 0], [0, 14, 0, 0, 3]),
    nonyg: G('NO', 'NYG', 'NO Saints', 'NYG Giants', 'Saints @ Giants', '2026-10-18T13:00:00-04:00', [0, 10, 17, 7], [7, 3, 0, 17]),
    tenind: G('TEN', 'IND', 'TEN Titans', 'IND Colts', 'Titans @ Colts', '2026-10-18T13:00:00-04:00', [0, 0, 6, 20], [0, 13, 0, 7]),
    nyjne: G('NYJ', 'NE', 'NYJ Jets', 'NE Patriots', 'Jets @ Patriots', '2026-10-18T13:00:00-04:00', [3, 0, 10, 6], [7, 10, 0, 9]),
    buflv: G('BUF', 'LV', 'BUF Bills', 'LV Raiders', 'Bills @ Raiders', '2026-10-18T16:25:00-04:00', [3, 10, 10, 10], [7, 6, 0, 17]),
    dalgb: G('DAL', 'GB', 'DAL Cowboys', 'GB Packers', 'Cowboys @ Packers', '2026-10-18T20:20:00-04:00', [0, 0, 7, 6], [7, 10, 3, 3])
  },
  tickets: [{
    title: '8 Pick Parlay', odds: 18246, wager: 10, toPay: 1834.60, funded: 'Lou', noPick: [], placed: 'Placed Thu Oct 15, 4:18 PM',
    items: [
      { who: 'AP', sel: '93+', mkt: 'Jaxon Smith-Njigba Receiving Yards', odds: -114, game: 'seaden', kind: 'count', target: 93, unit: 'yds', actual: 134, result: 'hit',
        ps: { rec: 12, tgt: 16, recYds: 134, recTd: 0 } },
      { who: 'Lou', sel: 'Over 0.5', mkt: 'Jameis Winston Interceptions Thrown', odds: -158, game: 'nonyg', kind: 'count', over: true, target: 0.5, unit: 'INT', actual: 2, result: 'hit',
        ps: { first: 'pass', cmp: 14, att: 26, passYds: 152, passTd: 1, int: 2, car: 3, rushYds: 4, rushTd: 0 } },
      { who: 'Zach', sel: 'Jonathan Taylor', mkt: '2+ TDs', odds: 205, game: 'tenind', kind: 'count', target: 2, unit: 'TD', actual: 1, result: 'miss',
        ps: { first: 'rush', car: 21, rushYds: 94, rushTd: 1, rec: 2, tgt: 4, recYds: 57, recTd: 0 }, tds: [run(4, 'Q4', '5:32', 'IND')] },
      { who: 'WC', sel: 'Over 238.5', mkt: 'Drake Maye Passing Yards', odds: 121, game: 'nyjne', kind: 'count', over: true, target: 238.5, unit: 'yds', actual: 235, result: 'miss',
        ps: { first: 'pass', cmp: 18, att: 32, passYds: 235, passTd: 3, int: 0, car: 4, rushYds: 24, rushTd: 0 },
        tds: [pass(42, 'Q1', '4:10', 'NE', 'Romeo Doubs'), pass(9, 'Q2', '0:14', 'NE', 'DeMario Douglas'), pass(7, 'Q4', '14:10', 'NE', 'Hunter Henry')] },
      { who: 'Hof', sel: 'Josh Allen', mkt: ATD, odds: -170, game: 'buflv', kind: 'count', target: 1, unit: 'TD', actual: 0, result: 'miss',
        ps: { first: 'rush', car: 5, rushYds: 1, rushTd: 0, cmp: 23, att: 33, passYds: 255, passTd: 2, int: 0 } },
      { who: 'Ip', sel: 'George Pickens', mkt: ATD, odds: 150, game: 'dalgb', kind: 'count', target: 1, unit: 'TD', actual: 0, result: 'miss',
        ps: { rec: 6, tgt: 11, recYds: 73, recTd: 0 } },
      { who: 'TJ', sel: '50+', mkt: 'Matthew Golden Receiving Yards', odds: -226, game: 'dalgb', kind: 'count', target: 50, unit: 'yds', actual: 104, result: 'hit',
        ps: { rec: 6, tgt: 13, recYds: 104, recTd: 1 }, tds: [catch_(9, 'Q1', null, 'GB')] },
      { who: 'Allan', sel: 'Over 73.5', mkt: 'Christian Watson Receiving Yards', odds: -112, game: 'dalgb', kind: 'count', over: true, target: 73.5, unit: 'yds', actual: 64, result: 'miss',
        ps: { rec: 3, tgt: 8, recYds: 64, recTd: 0 } }
    ]
  }]
};
