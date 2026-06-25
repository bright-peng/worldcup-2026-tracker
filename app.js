/**
 * 2026 FIFA World Cup Score Tracker & Simulator - Core Logic
 */

// 国家名与 flagcdn 双字母代码映射表
const countryToCode = {
    'Algeria': 'dz',
    'Argentina': 'ar',
    'Australia': 'au',
    'Austria': 'at',
    'Belgium': 'be',
    'Bosnia and Herzegovina': 'ba',
    'Brazil': 'br',
    'Cabo Verde': 'cv',
    'Canada': 'ca',
    'Colombia': 'co',
    'Congo DR': 'cd',
    "Cote d'Ivoire": 'ci',
    'Croatia': 'hr',
    'Curacao': 'cw',
    'Czechia': 'cz',
    'Ecuador': 'ec',
    'Egypt': 'eg',
    'England': 'gb-eng',
    'France': 'fr',
    'Germany': 'de',
    'Ghana': 'gh',
    'Haiti': 'ht',
    'IR Iran': 'ir',
    'Iraq': 'iq',
    'Japan': 'jp',
    'Jordan': 'jo',
    'Korea Republic': 'kr',
    'Mexico': 'mx',
    'Morocco': 'ma',
    'Netherlands': 'nl',
    'New Zealand': 'nz',
    'Norway': 'no',
    'Panama': 'pa',
    'Paraguay': 'py',
    'Portugal': 'pt',
    'Qatar': 'qa',
    'Saudi Arabia': 'sa',
    'Scotland': 'gb-sct',
    'Senegal': 'sn',
    'South Africa': 'za',
    'Spain': 'es',
    'Sweden': 'se',
    'Switzerland': 'ch',
    'Tunisia': 'tn',
    'Turkiye': 'tr',
    'United States': 'us',
    'Uruguay': 'uy',
    'Uzbekistan': 'uz'
};

// 32强对决中的小组第三分配配置位
const thirdPlaceSlots = [
    { matchNumber: 74, slot: 'awayTeam', options: ['A', 'B', 'C', 'D', 'F'] },
    { matchNumber: 77, slot: 'awayTeam', options: ['C', 'D', 'F', 'G', 'H'] },
    { matchNumber: 79, slot: 'awayTeam', options: ['C', 'E', 'F', 'H', 'I'] },
    { matchNumber: 80, slot: 'awayTeam', options: ['E', 'H', 'I', 'J', 'K'] },
    { matchNumber: 81, slot: 'awayTeam', options: ['B', 'E', 'F', 'I', 'J'] },
    { matchNumber: 82, slot: 'awayTeam', options: ['A', 'E', 'H', 'I', 'J'] },
    { matchNumber: 85, slot: 'awayTeam', options: ['E', 'F', 'G', 'I', 'J'] },
    { matchNumber: 87, slot: 'awayTeam', options: ['D', 'E', 'I', 'J', 'L'] }
];

// 空比分快照（不预设比分，完全通过抓取 API 或手动输入）
const initialScoreSnapshots = {};

// API 队名到本地官方队名的映射转换表
const apiTeamNameToLocal = {
    'South Korea': 'Korea Republic',
    'Turkey': 'Turkiye',
    'Ivory Coast': "Cote d'Ivoire",
    'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'Cape Verde Islands': 'Cabo Verde',
    'Curaçao': 'Curacao',
    'Iran': 'IR Iran',
    'DR Congo': 'Congo DR'
};

function normalizeTeamName(name) {
    if (!name) return '';
    const trimmed = name.trim();
    return apiTeamNameToLocal[trimmed] || trimmed;
}

// 全局应用状态
let appState = {
    fixtures: [], // 原始赛程数据
    matches: {},  // 包含比分状态的 104 场比赛字典 { matchNumber: matchObject }
    apiConfig: {
        footballDataToken: '',
        rapidApiKey: ''
    }
};

// 页面载入初始化
document.addEventListener('DOMContentLoaded', async () => {
    initLucide();
    await loadApiConfig();
    await loadMatchData();
    setupEventListeners();
    renderAll();

    // 若本地无任何比分且已配置 Token，首次自动静默抓取真实比分
    if (appState.apiConfig.footballDataToken || appState.apiConfig.rapidApiKey) {
        const hasFinished = Object.values(appState.matches).some(m => m.status === 'finished');
        if (!hasFinished) {
            setTimeout(() => {
                triggerDataFetch();
            }, 800); // 延时 800ms 执行
        }
    }

    // 开启定时轮询：每 60 秒自动 Fetch 本地已更新的 fixtures.json 静态文件，同步最新赛况比分
    setInterval(async () => {
        await reloadMatchesDataOnly();
    }, 60000);
});

function initLucide() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// 载入 API 配置
async function loadApiConfig() {
    let hasToken = false;
    
    // 1. 尝试从本地项目根目录的 .env 文件加载环境变量
    try {
        const response = await fetch('./.env');
        if (response.ok) {
            const text = await response.text();
            
            // 匹配 Football-Data API Token
            const fdMatch = text.match(/FOOTBALL_DATA_API_TOKEN\s*=\s*([a-zA-Z0-9]+)/);
            if (fdMatch && fdMatch[1]) {
                appState.apiConfig.footballDataToken = fdMatch[1].trim();
                document.getElementById('api-key-football-data').value = appState.apiConfig.footballDataToken;
                hasToken = true;
            }

            // 匹配 RapidAPI Key
            const raMatch = text.match(/RAPID_API_KEY\s*=\s*([a-zA-Z0-9]+)/);
            if (raMatch && raMatch[1]) {
                appState.apiConfig.rapidApiKey = raMatch[1].trim();
                document.getElementById('api-key-rapidapi').value = appState.apiConfig.rapidApiKey;
                hasToken = true;
            }
        }
    } catch (e) {
        console.warn('从 .env 加载配置失败，将尝试从 LocalStorage 读取', e);
    }

    // 2. 尝试从 LocalStorage 读取未被覆盖的配置
    const savedConfig = localStorage.getItem('worldcup_api_config');
    if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (!appState.apiConfig.footballDataToken && parsed.footballDataToken) {
            appState.apiConfig.footballDataToken = parsed.footballDataToken;
            document.getElementById('api-key-football-data').value = parsed.footballDataToken;
        }
        if (parsed.rapidApiKey) {
            appState.apiConfig.rapidApiKey = parsed.rapidApiKey;
            document.getElementById('api-key-rapidapi').value = parsed.rapidApiKey;
        }
        if (appState.apiConfig.footballDataToken || appState.apiConfig.rapidApiKey) {
            hasToken = true;
        }
    }
    
    updateApiStatusBadge(hasToken);
}

function updateApiStatusBadge(active) {
    const badge = document.getElementById('api-status-display');
    const indicator = badge.querySelector('.status-indicator');
    const text = badge.querySelector('.status-text');
    
    if (active && (appState.apiConfig.footballDataToken || appState.apiConfig.rapidApiKey)) {
        indicator.className = 'status-indicator green';
        text.textContent = 'API Key 已配置';
    } else {
        indicator.className = 'status-indicator yellow';
        text.textContent = '仅限本地/免 Key 模拟';
    }
}

// 加载比赛日程数据
async function loadMatchData() {
    const localData = localStorage.getItem('worldcup_2026_matches');
    const now = Date.now();
    const matchDurationMs = 2.5 * 60 * 60 * 1000; // 2.5小时
    
    // 如果缓存包含以前设置的旧 Mock 数据的标志（例如 Match 1 存了 2:1），自动执行一次重置
    let cleanedLocalData = localData;
    if (localData && localData.includes('"matchNumber":1,') && localData.includes('"homeScore":2,"awayScore":1')) {
        localStorage.removeItem('worldcup_2026_matches');
        cleanedLocalData = null;
    }
    
    try {
        // 先获取本地赛程的定义
        const response = await fetch('./fixtures.json');
        const data = await response.json();
        appState.fixtures = data.fixtures;
        
        if (cleanedLocalData) {
            // 如果本地有保存的比分，直接读取并合并
            appState.matches = JSON.parse(cleanedLocalData);
            
            // 确保没有缺失的场次
            appState.fixtures.forEach(fixture => {
                const mNum = fixture.matchNumber;
                if (!appState.matches[mNum]) {
                    appState.matches[mNum] = createEmptyMatchObject(fixture);
                }
            });
        } else {
            // 首次使用，初始化空比赛
            appState.fixtures.forEach(fixture => {
                const mNum = fixture.matchNumber;
                appState.matches[mNum] = createEmptyMatchObject(fixture);
            });
        }

        // 统一的时间动态校准与默认比分填充
        appState.fixtures.forEach(fixture => {
            const mNum = fixture.matchNumber;
            const matchObj = appState.matches[mNum];
            const kickoffTime = new Date(fixture.kickoffUtc).getTime();

            if (now < kickoffTime) {
                // 1. 未来的比赛：强制为未开始，清空比分
                matchObj.status = 'scheduled';
                matchObj.homeScore = null;
                matchObj.awayScore = null;
                matchObj.homePenalties = null;
                matchObj.awayPenalties = null;
            } else if (now >= kickoffTime && now < kickoffTime + matchDurationMs) {
                // 2. 正在进行中的比赛：如果还没被标为 finished，就标记为进行中
                if (matchObj.status !== 'finished') {
                    matchObj.status = 'live';
                    // 如果还没有录入比分，默认为 0:0
                    if (matchObj.homeScore === null) matchObj.homeScore = 0;
                    if (matchObj.awayScore === null) matchObj.awayScore = 0;
                }
            } else {
                // 3. 已经结束的历史比赛：
                // 优先从 fixtures.json 中抓取回来的真实比分载入，无则使用 initialScoreSnapshots 兜底
                if (!localData || matchObj.homeScore === null) {
                    if (fixture.homeScore !== undefined && fixture.homeScore !== null) {
                        matchObj.homeScore = fixture.homeScore;
                        matchObj.awayScore = fixture.awayScore;
                        matchObj.status = fixture.status || 'finished';
                        matchObj.homePenalties = fixture.homePenalties !== undefined ? fixture.homePenalties : null;
                        matchObj.awayPenalties = fixture.awayPenalties !== undefined ? fixture.awayPenalties : null;
                    } else if (initialScoreSnapshots[mNum]) {
                        matchObj.homeScore = initialScoreSnapshots[mNum].homeScore;
                        matchObj.awayScore = initialScoreSnapshots[mNum].awayScore;
                        matchObj.status = initialScoreSnapshots[mNum].status;
                    }
                }
            }
        });
        
        saveMatchesToLocalStorage();
    } catch (e) {
        console.error('加载赛程失败', e);
        showToast('加载赛程定义失败，请刷新重试。', 'error');
    }
}

// 自动 Fetch 静态赛程数据（由 Actions 定期更新），合并比分完成前端自动无感刷新
async function reloadMatchesDataOnly() {
    try {
        const response = await fetch('./fixtures.json?t=' + Date.now()); // 加时间戳，防缓存
        if (!response.ok) return;
        const data = await response.json();
        
        let dataChanged = false;
        
        data.fixtures.forEach(fixture => {
            const mNum = fixture.matchNumber;
            const localMatchObj = appState.matches[mNum];
            
            if (localMatchObj) {
                // 检查 fixtures.json 中是否含有已抓取的真实比分
                const newHomeScore = fixture.homeScore !== undefined ? fixture.homeScore : null;
                const newAwayScore = fixture.awayScore !== undefined ? fixture.awayScore : null;
                const newStatus = fixture.status !== undefined ? fixture.status : 'scheduled';
                const newHomePen = fixture.homePenalties !== undefined ? fixture.homePenalties : null;
                const newAwayPen = fixture.awayPenalties !== undefined ? fixture.awayPenalties : null;
                
                // 如果后端脚本把比分写入了 fixtures.json 并且与本地当前值不同，进行更新
                if (newHomeScore !== null && (localMatchObj.homeScore !== newHomeScore || localMatchObj.awayScore !== newAwayScore || localMatchObj.status !== newStatus)) {
                    localMatchObj.homeScore = newHomeScore;
                    localMatchObj.awayScore = newAwayScore;
                    localMatchObj.status = newStatus;
                    localMatchObj.homePenalties = newHomePen;
                    localMatchObj.awayPenalties = newAwayPen;
                    dataChanged = true;
                }
            }
        });
        
        if (dataChanged) {
            console.log('⚡ 自动刷新：检测到 Actions 后台同步了新的真实比分，重新渲染中...');
            renderAll();
            showToast('已同步最新比赛比分！', 'info');
        }
    } catch (e) {
        console.warn('定时轮询比分同步失败:', e);
    }
}

function createEmptyMatchObject(fixture) {
    return {
        ...fixture,
        homeScore: null,
        awayScore: null,
        homePenalties: null,
        awayPenalties: null,
        status: 'scheduled' // scheduled, live, finished
    };
}

function saveMatchesToLocalStorage() {
    localStorage.setItem('worldcup_2026_matches', JSON.stringify(appState.matches));
}

// 获取国旗 URL
function getFlagUrl(teamName) {
    if (!teamName || teamName.includes('runners-up') || teamName.includes('winners') || teamName.includes('third place') || teamName.includes('Match') || teamName.includes('Winner') || teamName.includes('Loser')) {
        return 'https://flagcdn.com/w80/un.png'; // 占位联合旗帜
    }
    const code = countryToCode[teamName];
    if (code) {
        return `https://flagcdn.com/w80/${code}.png`;
    }
    return 'https://flagcdn.com/w80/un.png';
}

// 渲染所有组件
function renderAll() {
    // 运行晋级和积分计算引擎
    runEngine();
    
    // 渲染各个 Tab 页
    renderMatchesList();
    renderStandings();
    renderBracket();
    initLucide();
}

/* ==========================================================================
   世界杯模拟器核心引擎
   ========================================================================== */
function runEngine() {
    // 1. 根据 Match 1-72 的小组赛结果计算积分榜排名
    const standings = calculateGroupStandings();
    
    // 2. 计算出 32 强中属于小组赛第1、第2以及出线第3名的晋级名额
    const qualifiers = determineQualifiers(standings);
    
    // 3. 填充 32强淘汰赛 (Match 73 - 88) 的队伍对阵
    populateRoundOf32(qualifiers);
    
    // 4. 淘汰赛传导晋级 (Match 89 - 104)
    propagateKnockoutStages();
    
    // 5. 保存计算后的状态到本地
    saveMatchesToLocalStorage();
}

// 计算小组积分榜
function calculateGroupStandings() {
    const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
    const standings = {};
    
    groups.forEach(g => {
        standings[g] = {};
    });
    
    // 初始化每个组内的每支球队数据
    appState.fixtures.forEach(f => {
        if (f.stage === 'group-stage') {
            const g = f.group;
            if (!standings[g][f.homeTeam]) standings[g][f.homeTeam] = createStandingRow(f.homeTeam);
            if (!standings[g][f.awayTeam]) standings[g][f.awayTeam] = createStandingRow(f.awayTeam);
        }
    });
    
    // 累加比赛结果
    for (let i = 1; i <= 72; i++) {
        const m = appState.matches[i];
        if (m && m.status === 'finished' && m.homeScore !== null && m.awayScore !== null) {
            const h = standings[m.group][m.homeTeam];
            const a = standings[m.group][m.awayTeam];
            
            h.pld++;
            a.pld++;
            h.gf += m.homeScore;
            h.ga += m.awayScore;
            a.gf += m.awayScore;
            a.ga += m.homeScore;
            
            if (m.homeScore > m.awayScore) {
                h.w++;
                h.pts += 3;
                a.l++;
            } else if (m.homeScore < m.awayScore) {
                a.w++;
                a.pts += 3;
                h.l++;
            } else {
                h.d++;
                a.d++;
                h.pts += 1;
                a.pts += 1;
            }
            h.gd = h.gf - h.ga;
            a.gd = a.gf - a.ga;
        }
    }
    
    // 对每个小组进行排序
    const sortedStandings = {};
    groups.forEach(g => {
        sortedStandings[g] = Object.values(standings[g]).sort((x, y) => {
            if (x.pts !== y.pts) return y.pts - x.pts; // 1. 积分
            if (x.gd !== y.gd) return y.gd - x.gd;     // 2. 净胜球
            if (x.gf !== y.gf) return y.gf - x.gf;     // 3. 总进球
            return x.team.localeCompare(y.team);       // 4. 字典序
        });
        
        // 标记组内排名 (1-4)
        sortedStandings[g].forEach((row, index) => {
            row.pos = index + 1;
        });
    });
    
    return sortedStandings;
}

function createStandingRow(teamName) {
    return {
        team: teamName,
        pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, pos: 0
    };
}

// 决定全部 32 个晋级名额
function determineQualifiers(standings) {
    const qualifiers = {
        winners: {},    // 各组第一
        runnersUp: {},  // 各组第二
        thirdPlaces: [] // 最好的 8 个第三名
    };
    
    const allThirdPlaces = [];
    
    Object.keys(standings).forEach(group => {
        const list = standings[group];
        if (list.length >= 2) {
            qualifiers.winners[group] = list[0].team;
            qualifiers.runnersUp[group] = list[1].team;
        }
        if (list.length >= 3) {
            allThirdPlaces.push({
                group: group,
                team: list[2].team,
                pts: list[2].pts,
                gd: list[2].gd,
                gf: list[2].gf
            });
        }
    });
    
    // 对 12 个小组的第三名进行排序，选前 8 个
    allThirdPlaces.sort((x, y) => {
        if (x.pts !== y.pts) return y.pts - x.pts;
        if (x.gd !== y.gd) return y.gd - x.gd;
        if (x.gf !== y.gf) return y.gf - x.gf;
        return x.group.localeCompare(y.group);
    });
    
    qualifiers.thirdPlaces = allThirdPlaces.slice(0, 8);
    return qualifiers;
}

// 填充 32强对阵 (Match 73 - 88)
function populateRoundOf32(qualifiers) {
    const thirdPlacesAssigned = new Set();
    
    for (let i = 73; i <= 88; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        // 重置回默认占位符，以便重新计算
        m.homeTeam = m.homeTeamPlaceholder || appState.fixtures[i - 1].homeTeam;
        m.awayTeam = m.awayTeamPlaceholder || appState.fixtures[i - 1].awayTeam;
        
        // 缓存初始占位符
        if (!m.homeTeamPlaceholder) m.homeTeamPlaceholder = m.homeTeam;
        if (!m.awayTeamPlaceholder) m.awayTeamPlaceholder = m.awayTeam;
        
        // 解析主队
        m.homeTeam = resolveGroupPlaceholder(m.homeTeam, qualifiers, thirdPlacesAssigned);
        // 解析客队
        m.awayTeam = resolveGroupPlaceholder(m.awayTeam, qualifiers, thirdPlacesAssigned);
    }
}

// 解析小组赛晋级占位符 (例如 "Group A runners-up", "Group E winners", "Group A/B/C/D/F third place")
function resolveGroupPlaceholder(placeholder, qualifiers, thirdPlacesAssigned) {
    if (placeholder.includes('winners')) {
        const group = placeholder.replace('Group ', '').replace(' winners', '').trim();
        return qualifiers.winners[group] || placeholder;
    }
    if (placeholder.includes('runners-up')) {
        const group = placeholder.replace('Group ', '').replace(' runners-up', '').trim();
        return qualifiers.runnersUp[group] || placeholder;
    }
    if (placeholder.includes('third place')) {
        // 从包含的小组选项中，挑出晋级且尚未分配的最好的第三名
        const matchConf = thirdPlaceSlots.find(c => placeholder.includes(c.options.join('/')));
        if (matchConf) {
            // 在 qualifiers.thirdPlaces 里找符合 matchConf.options 且未分配过的第三名
            const matched = qualifiers.thirdPlaces.find(t => 
                matchConf.options.includes(t.group) && !thirdPlacesAssigned.has(t.team)
            );
            if (matched) {
                thirdPlacesAssigned.add(matched.team);
                return matched.team;
            }
        }
        
        // 备用兜底逻辑：如果前面的精密匹配由于组的选项对应不上，直接挑出一个符合条件但未分配的第三名
        const optionGroups = placeholder.replace('Group ', '').replace(' third place', '').split('/');
        const matchedFallback = qualifiers.thirdPlaces.find(t => 
            optionGroups.includes(t.group) && !thirdPlacesAssigned.has(t.team)
        );
        if (matchedFallback) {
            thirdPlacesAssigned.add(matchedFallback.team);
            return matchedFallback.team;
        }
    }
    return placeholder;
}

// 淘汰赛层级传导晋级 (Match 89 - 104)
function propagateKnockoutStages() {
    // 依次计算 M89 到 M104 场比赛
    for (let i = 89; i <= 104; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        m.homeTeam = m.homeTeamPlaceholder || appState.fixtures[i - 1].homeTeam;
        m.awayTeam = m.awayTeamPlaceholder || appState.fixtures[i - 1].awayTeam;
        
        if (!m.homeTeamPlaceholder) m.homeTeamPlaceholder = m.homeTeam;
        if (!m.awayTeamPlaceholder) m.awayTeamPlaceholder = m.awayTeam;
        
        // 解析 Winner Match X / Loser Match X
        m.homeTeam = resolveKnockoutPlaceholder(m.homeTeam);
        m.awayTeam = resolveKnockoutPlaceholder(m.awayTeam);
        
        // 如果当前比赛已经填充了实际的队伍，并且之前比分是已结束，但新队伍名与以前不一样，重置比分
        // (比如用户改了前驱比赛的比分导致对决人选变了，需要把这场比赛的比分重置为未开始)
        if (isActualTeam(m.homeTeam) && isActualTeam(m.awayTeam)) {
            // 正常模拟
        } else {
            // 还是有占位符，重置比分
            m.homeScore = null;
            m.awayScore = null;
            m.homePenalties = null;
            m.awayPenalties = null;
            m.status = 'scheduled';
        }
    }
}

function resolveKnockoutPlaceholder(placeholder) {
    if (placeholder.startsWith('Winner Match')) {
        const targetNum = parseInt(placeholder.replace('Winner Match ', '').trim());
        const prevMatch = appState.matches[targetNum];
        if (prevMatch && prevMatch.status === 'finished') {
            return getWinner(prevMatch) || placeholder;
        }
    }
    if (placeholder.startsWith('Loser Match')) {
        const targetNum = parseInt(placeholder.replace('Loser Match ', '').trim());
        const prevMatch = appState.matches[targetNum];
        if (prevMatch && prevMatch.status === 'finished') {
            return getLoser(prevMatch) || placeholder;
        }
    }
    return placeholder;
}

function isActualTeam(name) {
    return name && !name.includes('Winner') && !name.includes('Loser') && !name.includes('runners-up') && !name.includes('winners') && !name.includes('third place') && !name.includes('Match');
}

// 判定比赛获胜方
function getWinner(match) {
    if (match.homeScore === null || match.awayScore === null) return null;
    if (match.homeScore > match.awayScore) return match.homeTeam;
    if (match.homeScore < match.awayScore) return match.awayTeam;
    
    // 如果打平，看点球
    if (match.homePenalties !== null && match.awayPenalties !== null) {
        return match.homePenalties > match.awayPenalties ? match.homeTeam : match.awayTeam;
    }
    
    // 平局且未填点球，默认主队（防错）
    return match.homeTeam;
}

// 判定比赛失败方
function getLoser(match) {
    if (match.homeScore === null || match.awayScore === null) return null;
    if (match.homeScore < match.awayScore) return match.homeTeam;
    if (match.homeScore > match.awayScore) return match.awayTeam;
    
    // 如果打平，看点球
    if (match.homePenalties !== null && match.awayPenalties !== null) {
        return match.homePenalties < match.awayPenalties ? match.homeTeam : match.awayTeam;
    }
    
    // 平局且未填点球，默认客队（防错）
    return match.awayTeam;
}

/* ==========================================================================
   页面渲染逻辑
   ========================================================================== */

// 渲染比赛日程列表 (Tab 1)
function renderMatchesList() {
    const container = document.getElementById('matches-list-container');
    container.innerHTML = '';
    
    const searchVal = document.getElementById('match-search').value.toLowerCase();
    const stageVal = document.getElementById('filter-stage').value;
    const groupVal = document.getElementById('filter-group').value;
    const statusVal = document.getElementById('filter-status').value;
    
    let renderedCount = 0;
    
    for (let i = 1; i <= 104; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        // 1. 过滤：搜索词
        const homeName = m.homeTeam.toLowerCase();
        const awayName = m.awayTeam.toLowerCase();
        if (searchVal && !homeName.includes(searchVal) && !awayName.includes(searchVal)) {
            continue;
        }
        
        // 2. 过滤：阶段
        if (stageVal !== 'all') {
            if (stageVal === 'group-stage' && m.stage !== 'group-stage') continue;
            if (stageVal === 'knockout' && m.stage === 'group-stage') continue;
            if (stageVal !== 'group-stage' && stageVal !== 'knockout' && m.stage !== stageVal) continue;
        }
        
        // 3. 过滤：小组
        if (groupVal !== 'all' && (m.stage !== 'group-stage' || m.group !== groupVal)) {
            continue;
        }
        
        // 4. 过滤：状态
        if (statusVal !== 'all' && m.status !== statusVal) {
            continue;
        }
        
        renderedCount++;
        const card = document.createElement('div');
        card.className = `match-card ${m.status}`;
        card.setAttribute('data-match-number', m.matchNumber);
        
        const homeFlag = getFlagUrl(m.homeTeam);
        const awayFlag = getFlagUrl(m.awayTeam);
        
        // 比分板的渲染
        let scoreHtml = '';
        if (m.status === 'scheduled') {
            // 未开始，显示踢球时间（只显示时间，比如 22:00）
            const timeStr = new Date(m.kickoffUtc).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
            scoreHtml = `<div class="match-time-placeholder">${timeStr}</div>`;
        } else {
            // 进行中、已结束或因故中断
            scoreHtml = `
                <div class="score-display ${m.status === 'live' ? 'live' : ''} ${m.status === 'suspended' ? 'suspended' : ''}">
                    <span>${m.homeScore}</span>
                    <span class="score-sep">-</span>
                    <span>${m.awayScore}</span>
                </div>
            `;
            if (m.status === 'suspended') {
                scoreHtml += `
                    <div class="penalty-badge suspended-badge" style="color: var(--warning); border-color: rgba(255, 215, 0, 0.3); background: rgba(255, 215, 0, 0.05); margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; border: 1px solid;">
                        <i data-lucide="alert-circle" style="width: 12px; height: 12px;"></i>
                        比赛因故中断
                    </div>
                `;
            }
            if (m.homePenalties !== null && m.awayPenalties !== null) {
                scoreHtml += `<div class="penalty-badge">点球 ${m.homePenalties}:${m.awayPenalties}</div>`;
            }
        }
        
        // 日期时间转化显示 (本地时区)
        const dateObj = new Date(m.kickoffUtc);
        const dateStr = dateObj.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' });
        
        card.innerHTML = `
            <div class="match-card-header">
                <span class="match-number-badge">Match ${m.matchNumber}</span>
                <span class="match-stage-label">${m.stage === 'group-stage' ? '小组赛 ' + m.group + '组' : translateStage(m.stage)}</span>
                <span>${dateStr}</span>
            </div>
            <div class="match-card-body">
                <div class="team-display home">
                    <div class="flag-wrapper">
                        <img class="team-flag" src="${homeFlag}" alt="${m.homeTeam}">
                    </div>
                    <span class="team-name" title="${m.homeTeam}">${m.homeTeam}</span>
                </div>
                
                <div class="score-board">
                    ${scoreHtml}
                </div>
                
                <div class="team-display away">
                    <div class="flag-wrapper">
                        <img class="team-flag" src="${awayFlag}" alt="${m.awayTeam}">
                    </div>
                    <span class="team-name" title="${m.awayTeam}">${m.awayTeam}</span>
                </div>
            </div>
            <div class="match-status-row">
                <span class="match-venue" title="${m.stadium}, ${m.hostCity}"><i data-lucide="map-pin"></i> ${m.stadium}</span>
                <button class="btn-edit-match" title="模拟/录入比分" onclick="openEditScoreDialog(${m.matchNumber})">
                    <i data-lucide="edit-3"></i>
                </button>
            </div>
        `;
        
        container.appendChild(card);
    }
    
    if (renderedCount === 0) {
        container.innerHTML = `
            <div class="loading-placeholder">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--color-text-muted);"></i>
                <p>未找到符合筛选条件的比赛项目。</p>
            </div>
        `;
    }
    
    // 初始化可能新渲染的 Lucide 图标
    initLucide();
}

// 翻译阶段名称
function translateStage(stage) {
    const dict = {
        'group-stage': '小组赛',
        'round-of-32': '32 强淘汰赛',
        'round-of-16': '16 强淘汰赛',
        'quarter-finals': '1/4 决赛',
        'semi-finals': '半决赛',
        'third-place': '三四名决赛',
        'final': '决赛'
    };
    return dict[stage] || stage;
}

// 渲染小组积分榜 (Tab 2)
function renderStandings() {
    const container = document.getElementById('standings-grid-container');
    container.innerHTML = '';
    
    const standings = calculateGroupStandings();
    
    Object.keys(standings).forEach(group => {
        const card = document.createElement('div');
        card.className = 'group-table-card';
        
        let rowsHtml = '';
        standings[group].forEach(row => {
            const flag = getFlagUrl(row.team);
            let qualifyClass = '';
            if (row.pos === 1) qualifyClass = 'qualify-row-1';
            else if (row.pos === 2) qualifyClass = 'qualify-row-2';
            else if (row.pos === 3) qualifyClass = 'qualify-row-3rd';
            
            rowsHtml += `
                <tr class="${qualifyClass}">
                    <td class="pos-num">${row.pos}</td>
                    <td class="team-col">
                        <img class="mini-flag" src="${flag}" alt="${row.team}">
                        <span>${row.team}</span>
                    </td>
                    <td>${row.pld}</td>
                    <td>${row.w}</td>
                    <td>${row.d}</td>
                    <td>${row.l}</td>
                    <td>${row.gf}/${row.ga}</td>
                    <td>${row.gd > 0 ? '+' + row.gd : row.gd}</td>
                    <td><strong>${row.pts}</strong></td>
                </tr>
            `;
        });
        
        card.innerHTML = `
            <h3><span>Group ${group}</span> <i data-lucide="award" style="color: var(--primary); width: 18px;"></i></h3>
            <table class="group-table">
                <thead>
                    <tr>
                        <th style="width: 25px;">#</th>
                        <th class="team-col">球队</th>
                        <th style="width: 25px;">赛</th>
                        <th style="width: 20px;">胜</th>
                        <th style="width: 20px;">平</th>
                        <th style="width: 20px;">负</th>
                        <th style="width: 50px;">进/失</th>
                        <th style="width: 30px;">净</th>
                        <th style="width: 30px;">分</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        `;
        container.appendChild(card);
    });
}

// 渲染淘汰赛对战图 (Tab 3)
function renderBracket() {
    const container = document.getElementById('bracket-container');
    container.innerHTML = '';
    
    // 对战图分为 5 列（流式自左向右）：
    // Column 1: Round of 32 (16 场)
    // Column 2: Round of 16 (8 场)
    // Column 3: Quarter-finals (4 场)
    // Column 4: Semi-finals (2 场)
    // Column 5: Final & 3rd Place (2 场)
    
    const rounds = [
        { stage: 'round-of-32', matches: [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88] },
        { stage: 'round-of-16', matches: [89,90,91,92,93,94,95,96] },
        { stage: 'quarter-finals', matches: [97,98,99,100] },
        { stage: 'semi-finals', matches: [101,102] },
        { stage: 'final-3rd', matches: [104, 103] } // 决赛和三四名并在一列显示
    ];
    
    rounds.forEach((round, colIndex) => {
        const col = document.createElement('div');
        col.className = 'bracket-column';
        
        round.matches.forEach(mNum => {
            const m = appState.matches[mNum];
            if (!m) return;
            
            const node = document.createElement('div');
            node.className = 'bracket-node';
            if (mNum === 104) node.className = 'bracket-node bracket-center-node final';
            if (mNum === 103) node.className = 'bracket-node bracket-center-node third-place';
            
            const isHomeWinner = m.status === 'finished' && getWinner(m) === m.homeTeam;
            const isAwayWinner = m.status === 'finished' && getWinner(m) === m.awayTeam;
            
            let scoreHomeStr = m.homeScore !== null ? m.homeScore : '-';
            let scoreAwayStr = m.awayScore !== null ? m.awayScore : '-';
            if (m.homePenalties !== null && m.awayPenalties !== null) {
                scoreHomeStr += `(${m.homePenalties})`;
                scoreAwayStr += `(${m.awayPenalties})`;
            }
            
            node.innerHTML = `
                <div class="bracket-node-header">
                    <span>M${m.matchNumber}</span>
                    <span>${mNum === 104 ? '总决赛' : mNum === 103 ? '三四名决赛' : translateStage(m.stage)}</span>
                </div>
                <div class="bracket-node-body">
                    <div class="bracket-team-row ${isHomeWinner ? 'winner' : ''}">
                        <div class="bracket-team-info">
                            <img class="bracket-team-flag" src="${getFlagUrl(m.homeTeam)}" alt="Flag">
                            <span title="${m.homeTeam}">${m.homeTeam}</span>
                        </div>
                        <span class="bracket-team-score">${scoreHomeStr}</span>
                    </div>
                    <div class="bracket-team-row ${isAwayWinner ? 'winner' : ''}">
                        <div class="bracket-team-info">
                            <img class="bracket-team-flag" src="${getFlagUrl(m.awayTeam)}" alt="Flag">
                            <span title="${m.awayTeam}">${m.awayTeam}</span>
                        </div>
                        <span class="bracket-team-score">${scoreAwayStr}</span>
                    </div>
                </div>
                <button class="bracket-node-edit" onclick="openEditScoreDialog(${m.matchNumber})">
                    <i data-lucide="edit-2"></i>
                </button>
            `;
            col.appendChild(node);
        });
        
        container.appendChild(col);
    });
}

/* ==========================================================================
   交互事件与 Modal 管理
   ========================================================================== */

// 打开比分编辑弹窗
window.openEditScoreDialog = function(matchNumber) {
    const m = appState.matches[matchNumber];
    if (!m) return;
    
    document.getElementById('edit-match-id').value = m.matchNumber;
    document.getElementById('edit-match-number').textContent = `Match ${m.matchNumber}`;
    document.getElementById('edit-match-stage').textContent = m.stage === 'group-stage' ? `Group ${m.group}` : translateStage(m.stage);
    
    document.getElementById('edit-home-name').textContent = m.homeTeam;
    document.getElementById('edit-away-name').textContent = m.awayTeam;
    
    document.getElementById('edit-home-flag').src = getFlagUrl(m.homeTeam);
    document.getElementById('edit-away-flag').src = getFlagUrl(m.awayTeam);
    
    document.getElementById('edit-home-score').value = m.homeScore !== null ? m.homeScore : '';
    document.getElementById('edit-away-score').value = m.awayScore !== null ? m.awayScore : '';
    
    document.getElementById('edit-match-status').value = m.status;
    
    // 只有淘汰赛才开启点球大战选项
    const penaltySection = document.getElementById('edit-penalty-section');
    const penaltyInputsRow = document.getElementById('edit-penalty-inputs-row');
    const hasPenaltiesCheckbox = document.getElementById('edit-has-penalties');
    
    if (m.stage !== 'group-stage') {
        penaltySection.style.display = 'block';
        if (m.homePenalties !== null && m.awayPenalties !== null) {
            hasPenaltiesCheckbox.checked = true;
            penaltyInputsRow.style.display = 'flex';
            document.getElementById('edit-home-penalties').value = m.homePenalties;
            document.getElementById('edit-away-penalties').value = m.awayPenalties;
        } else {
            hasPenaltiesCheckbox.checked = false;
            penaltyInputsRow.style.display = 'none';
            document.getElementById('edit-home-penalties').value = '';
            document.getElementById('edit-away-penalties').value = '';
        }
    } else {
        penaltySection.style.display = 'none';
    }
    
    const dialog = document.getElementById('edit-score-dialog');
    dialog.showModal();
};

function setupEventListeners() {
    // Tab 切换
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`tab-${target}`).classList.add('active');
            
            if (target === 'bracket') {
                renderBracket();
            }
        });
    });
    
    // 筛选变动
    document.getElementById('match-search').addEventListener('input', renderMatchesList);
    document.getElementById('filter-stage').addEventListener('change', renderMatchesList);
    document.getElementById('filter-group').addEventListener('change', renderMatchesList);
    document.getElementById('filter-status').addEventListener('change', renderMatchesList);
    
    // 打开 API 配置弹窗
    document.getElementById('btn-open-api-config').addEventListener('click', () => {
        document.getElementById('api-config-dialog').showModal();
    });
    
    // 关闭 API 配置弹窗
    document.getElementById('btn-close-api-dialog').addEventListener('click', () => {
        document.getElementById('api-config-dialog').close();
    });
    document.getElementById('btn-cancel-api').addEventListener('click', () => {
        document.getElementById('api-config-dialog').close();
    });
    
    // 保存 API 配置
    document.getElementById('api-config-form').addEventListener('submit', (e) => {
        e.preventDefault();
        appState.apiConfig.footballDataToken = document.getElementById('api-key-football-data').value.trim();
        appState.apiConfig.rapidApiKey = document.getElementById('api-key-rapidapi').value.trim();
        
        localStorage.setItem('worldcup_api_config', JSON.stringify(appState.apiConfig));
        updateApiStatusBadge(true);
        document.getElementById('api-config-dialog').close();
        showToast('API 配置保存成功！', 'success');
    });
    
    // 关闭比分编辑
    document.getElementById('btn-close-edit-dialog').addEventListener('click', () => {
        document.getElementById('edit-score-dialog').close();
    });
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        document.getElementById('edit-score-dialog').close();
    });
    
    // 点球复选框
    document.getElementById('edit-has-penalties').addEventListener('change', (e) => {
        document.getElementById('edit-penalty-inputs-row').style.display = e.target.checked ? 'flex' : 'none';
    });
    
    // 保存比分修改
    document.getElementById('edit-score-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const mNum = parseInt(document.getElementById('edit-match-id').value);
        const m = appState.matches[mNum];
        if (!m) return;
        
        const homeScoreVal = document.getElementById('edit-home-score').value;
        const awayScoreVal = document.getElementById('edit-away-score').value;
        
        m.homeScore = homeScoreVal !== '' ? parseInt(homeScoreVal) : null;
        m.awayScore = awayScoreVal !== '' ? parseInt(awayScoreVal) : null;
        m.status = document.getElementById('edit-match-status').value;
        
        if (m.stage !== 'group-stage' && document.getElementById('edit-has-penalties').checked) {
            m.homePenalties = parseInt(document.getElementById('edit-home-penalties').value || 0);
            m.awayPenalties = parseInt(document.getElementById('edit-away-penalties').value || 0);
            // 淘汰赛如果点球，比分必须是平局。如果不是平局则强制设置状态为结束，且移除点球
            if (m.homeScore !== m.awayScore) {
                m.homePenalties = null;
                m.awayPenalties = null;
            }
        } else {
            m.homePenalties = null;
            m.awayPenalties = null;
        }
        
        // 运行晋级模拟引擎，更新积分并渲染
        renderAll();
        document.getElementById('edit-score-dialog').close();
        showToast(`Match ${mNum} 比分已更新！`, 'success');
    });
    
    // 重置数据
    document.getElementById('btn-reset-data').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('确定要清除所有修改，重置回初始比分状态吗？')) {
            localStorage.removeItem('worldcup_2026_matches');
            loadMatchData().then(() => {
                renderAll();
                showToast('比赛比分已成功重置！', 'info');
            });
        }
    });
    
    // 导出 CSV
    document.getElementById('export-csv').addEventListener('click', (e) => {
        e.preventDefault();
        exportToCSV();
    });
    
    // 导出 JSON
    document.getElementById('export-json').addEventListener('click', (e) => {
        e.preventDefault();
        exportToJSON();
    });
    
    // 抓取比分按钮
    document.getElementById('btn-fetch-data').addEventListener('click', () => {
        triggerDataFetch();
    });
}

// Toast 轻提示
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    initLucide();
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/* ==========================================================================
   API 数据抓取同步逻辑 (三个免费公开 API 接口)
   ========================================================================== */
async function triggerDataFetch() {
    const fetchBtn = document.getElementById('btn-fetch-data');
    fetchBtn.classList.add('disabled');
    fetchBtn.querySelector('span').textContent = '抓取中...';
    
    showToast('正在启动世界杯比分抓取...', 'info');
    
    let successCount = 0;
    
    // 数据源 1: GitHub / OpenFootball 静态比分数据 (免 Key，第一优先级降级)
    try {
        await fetchGitHubData();
        successCount++;
        showToast('免 Key 基础源同步成功！', 'success');
    } catch (err) {
        console.warn('免 Key 数据源同步失败，尝试备用源', err);
    }
    
    // 数据源 2: Football-Data.org API (若配置 Key)
    if (appState.apiConfig.footballDataToken) {
        try {
            await fetchFootballDataOrg();
            successCount++;
            showToast('Football-Data.org 数据同步成功！', 'success');
        } catch (err) {
            console.error('Football-Data.org 抓取失败', err);
            showToast('Football-Data.org 抓取失败: ' + err.message, 'error');
        }
    }
    
    // 数据源 3: API-Football (RapidAPI，若配置 Key)
    if (appState.apiConfig.rapidApiKey) {
        try {
            await fetchApiFootball();
            successCount++;
            showToast('API-Football 数据同步成功！', 'success');
        } catch (err) {
            console.error('API-Football 抓取失败', err);
            showToast('API-Football 抓取失败: ' + err.message, 'error');
        }
    }
    
    // 渲染更新
    renderAll();
    
    fetchBtn.classList.remove('disabled');
    fetchBtn.querySelector('span').textContent = '抓取比分';
    
    if (successCount > 0) {
        showToast('比分抓取并自动晋级同步完成！', 'success');
    } else {
        showToast('抓取失败，请检查您的网络连接或 API-Key。', 'error');
    }
}

// API 1: GitHub / OpenFootball 镜像抓取
async function fetchGitHubData() {
    // 抓取 GitHub 开源世界杯 2026 json (由于当前为2026世界杯，GitHub上通常会有静态结果更新)
    // 这里使用 GitHub Raw 的镜像资源。如果没有真实 WC2026 源，则拉取 mock-fixtures 的最新比分
    // 在真实应用中，此 API 稳定提供免 Key 的历史/当前比分
    const url = `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`;
    
    // 由于 github raw 有时会因网络原因超时，我们使用 allorigins 跨域代理或直接 fetch
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('GitHub 源连接失败');
    
    const resJson = await response.json();
    const data = JSON.parse(resJson.contents);
    
    if (data && data.rounds) {
        // 解析 github 格式的比分并合并
        data.rounds.forEach(round => {
            round.matches.forEach(m => {
                // 根据主客队名字去匹配我们的 Match
                const matchNum = findMatchNumberByTeams(m.team1, m.team2);
                if (matchNum && m.score1 !== undefined && m.score2 !== undefined) {
                    const matchObj = appState.matches[matchNum];
                    if (matchObj) {
                        matchObj.homeScore = m.score1;
                        matchObj.awayScore = m.score2;
                        matchObj.status = 'finished';
                    }
                }
            });
        });
    }
}

// 根据球队名字模糊查找 Match 编号（支持规范化名称兼容）
function findMatchNumberByTeams(t1, t2) {
    const norm1 = normalizeTeamName(t1);
    const norm2 = normalizeTeamName(t2);
    
    for (let i = 1; i <= 72; i++) {
        const m = appState.matches[i];
        if (m) {
            const mHome = normalizeTeamName(m.homeTeam);
            const mAway = normalizeTeamName(m.awayTeam);
            if ((mHome === norm1 && mAway === norm2) || (mHome === norm2 && mAway === norm1)) {
                return i;
            }
        }
    }
    return null;
}

// API 2: Football-Data.org 抓取
async function fetchFootballDataOrg() {
    const token = appState.apiConfig.footballDataToken;
    const url = 'https://api.football-data.org/v4/competitions/WC/matches';
    
    // 使用 allorigins 代理，并在 fetch 头中附加 token 跨域请求
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    // 注意，allorigins proxy 不会把 headers 发给目标，所以在纯前端拉取带有 authorization 的 API 存在瓶颈
    // 方案：若是带有 Token 头的 API，我们可以先通过 direct fetch 尝试（有的用户会在本地浏览器安装跨域插件）
    // 或者，我们可以通过更先进的免 Key / 本地 node 代理。这里我们使用 fetch 加上 Headers 并兜底
    const response = await fetch(url, {
        headers: {
            'X-Auth-Token': token
        }
    });
    
    if (!response.ok) throw new Error(`Football-Data API 响应错误: ${response.status}`);
    const data = await response.json();
    
    if (data && data.matches) {
        data.matches.forEach(m => {
            // 根据 matchNumber 或主客队匹配
            const matchNum = m.matchNumber || findMatchNumberByTeams(m.homeTeam.name, m.awayTeam.name);
            if (matchNum) {
                const matchObj = appState.matches[matchNum];
                if (matchObj && m.score && m.score.fullTime && m.score.fullTime.home !== null) {
                    matchObj.homeScore = m.score.fullTime.home;
                    matchObj.awayScore = m.score.fullTime.away;
                    const liveStatuses = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'];
                    matchObj.status = m.status === 'FINISHED' ? 'finished' : (liveStatuses.includes(m.status) ? 'live' : 'scheduled');
                    
                    if (m.score.penalties && m.score.penalties.home !== null) {
                        matchObj.homePenalties = m.score.penalties.home;
                        matchObj.awayPenalties = m.score.penalties.away;
                    }
                }
            }
        });
    }
}

// API 3: API-Football (RapidAPI) 抓取
async function fetchApiFootball() {
    const key = appState.apiConfig.rapidApiKey;
    // 2026年世界杯，league id = 1
    const url = 'https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2026';
    
    const response = await fetch(url, {
        headers: {
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
            'x-rapidapi-key': key
        }
    });
    
    if (!response.ok) throw new Error(`RapidAPI 响应错误: ${response.status}`);
    const data = await response.json();
    
    if (data && data.response) {
        data.response.forEach(item => {
            const homeName = item.teams.home.name;
            const awayName = item.teams.away.name;
            
            const matchNum = findMatchNumberByTeams(homeName, awayName);
            if (matchNum) {
                const matchObj = appState.matches[matchNum];
                if (matchObj) {
                    const statusShort = item.fixture.status.short;
                    
                    if (item.goals.home !== null && item.goals.away !== null) {
                        matchObj.homeScore = item.goals.home;
                        matchObj.awayScore = item.goals.away;
                        const liveShorts = ['1H', '2H', 'HT', 'ET', 'P', 'BT'];
                        matchObj.status = (statusShort === 'FT' || statusShort === 'AET' || statusShort === 'PEN') ? 'finished' : (liveShorts.includes(statusShort) ? 'live' : 'scheduled');
                        
                        if (item.score.penalty && item.score.penalty.home !== null) {
                            matchObj.homePenalties = item.score.penalty.home;
                            matchObj.awayPenalties = item.score.penalty.away;
                        }
                    }
                }
            }
        });
    }
}

/* ==========================================================================
   数据导出逻辑 (CSV / JSON)
   ========================================================================== */

function exportToCSV() {
    let csvContent = '\ufeff'; // UTF-8 BOM, 确保 Excel 打开不乱码
    csvContent += 'Match Number,Date,Stage,Group,Home Team,Away Team,Home Score,Away Score,Status,Home Penalties,Away Penalties,Stadium,Host City\n';
    
    for (let i = 1; i <= 104; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        const homeScoreStr = m.homeScore !== null ? m.homeScore : '';
        const awayScoreStr = m.awayScore !== null ? m.awayScore : '';
        const homePenStr = m.homePenalties !== null ? m.homePenalties : '';
        const awayPenStr = m.awayPenalties !== null ? m.awayPenalties : '';
        
        const line = [
            m.matchNumber,
            m.date,
            translateStage(m.stage),
            m.group || '',
            `"${m.homeTeam}"`,
            `"${m.awayTeam}"`,
            homeScoreStr,
            awayScoreStr,
            m.status,
            homePenStr,
            awayPenStr,
            `"${m.stadium}"`,
            `"${m.hostCity}"`
        ].join(',');
        
        csvContent += line + '\n';
    }
    
    downloadFile(csvContent, 'text/csv;charset=utf-8;', 'worldcup_2026_scores.csv');
    showToast('CSV 格式比分已成功导出！', 'success');
}

function exportToJSON() {
    const jsonStr = JSON.stringify(appState.matches, null, 2);
    downloadFile(jsonStr, 'application/json;charset=utf-8;', 'worldcup_2026_scores.json');
    showToast('JSON 格式比分已成功导出！', 'success');
}

function downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
