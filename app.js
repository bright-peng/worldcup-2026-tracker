/**
 * 2026 FIFA World Cup Score Tracker & Simulator - Core Logic
 */

// 统一国家队元数据（国旗代码、中文名、FIFA 三字码）
// 合并了原来的 countryToCode 映射，避免重复维护
const teamMetadata = {
    'Algeria': { code: 'dz', cn: '阿尔及利亚', fifa: 'ALG' },
    'Argentina': { code: 'ar', cn: '阿根廷', fifa: 'ARG' },
    'Australia': { code: 'au', cn: '澳大利亚', fifa: 'AUS' },
    'Austria': { code: 'at', cn: '奥地利', fifa: 'AUT' },
    'Belgium': { code: 'be', cn: '比利时', fifa: 'BEL' },
    'Bosnia and Herzegovina': { code: 'ba', cn: '波黑', fifa: 'BIH' },
    'Brazil': { code: 'br', cn: '巴西', fifa: 'BRA' },
    'Cabo Verde': { code: 'cv', cn: '佛得角', fifa: 'CPV' },
    'Canada': { code: 'ca', cn: '加拿大', fifa: 'CAN' },
    'Colombia': { code: 'co', cn: '哥伦比亚', fifa: 'COL' },
    'Congo DR': { code: 'cd', cn: '民主刚果', fifa: 'COD' },
    "Cote d'Ivoire": { code: 'ci', cn: '科特迪瓦', fifa: 'CIV' },
    'Croatia': { code: 'hr', cn: '克罗地亚', fifa: 'CRO' },
    'Curacao': { code: 'cw', cn: '库拉索', fifa: 'CUW' },
    'Czechia': { code: 'cz', cn: '捷克', fifa: 'CZE' },
    'Ecuador': { code: 'ec', cn: '厄瓜多尔', fifa: 'ECU' },
    'Egypt': { code: 'eg', cn: '埃及', fifa: 'EGY' },
    'England': { code: 'gb-eng', cn: '英格兰', fifa: 'ENG' },
    'France': { code: 'fr', cn: '法国', fifa: 'FRA' },
    'Germany': { code: 'de', cn: '德国', fifa: 'GER' },
    'Ghana': { code: 'gh', cn: '加纳', fifa: 'GHA' },
    'Haiti': { code: 'ht', cn: '海地', fifa: 'HAI' },
    'IR Iran': { code: 'ir', cn: '伊朗', fifa: 'IRN' },
    'Iraq': { code: 'iq', cn: '伊拉克', fifa: 'IRQ' },
    'Japan': { code: 'jp', cn: '日本', fifa: 'JPN' },
    'Jordan': { code: 'jo', cn: '约旦', fifa: 'JOR' },
    'Korea Republic': { code: 'kr', cn: '韩国', fifa: 'KOR' },
    'Mexico': { code: 'mx', cn: '墨西哥', fifa: 'MEX' },
    'Morocco': { code: 'ma', cn: '摩洛哥', fifa: 'MAR' },
    'Netherlands': { code: 'nl', cn: '荷兰', fifa: 'NED' },
    'New Zealand': { code: 'nz', cn: '新西兰', fifa: 'NZL' },
    'Norway': { code: 'no', cn: '挪威', fifa: 'NOR' },
    'Panama': { code: 'pa', cn: '巴拿马', fifa: 'PAN' },
    'Paraguay': { code: 'py', cn: '巴拉圭', fifa: 'PAR' },
    'Portugal': { code: 'pt', cn: '葡萄牙', fifa: 'POR' },
    'Qatar': { code: 'qa', cn: '卡塔尔', fifa: 'QAT' },
    'Saudi Arabia': { code: 'sa', cn: '沙特阿拉伯', fifa: 'KSA' },
    'Scotland': { code: 'gb-sct', cn: '苏格兰', fifa: 'SCO' },
    'Senegal': { code: 'sn', cn: '塞内加尔', fifa: 'SEN' },
    'South Africa': { code: 'za', cn: '南非', fifa: 'RSA' },
    'Spain': { code: 'es', cn: '西班牙', fifa: 'ESP' },
    'Sweden': { code: 'se', cn: '瑞典', fifa: 'SWE' },
    'Switzerland': { code: 'ch', cn: '瑞士', fifa: 'SUI' },
    'Tunisia': { code: 'tn', cn: '突尼斯', fifa: 'TUN' },
    'Turkiye': { code: 'tr', cn: '土耳其', fifa: 'TUR' },
    'United States': { code: 'us', cn: '美国', fifa: 'USA' },
    'Uruguay': { code: 'uy', cn: '乌拉圭', fifa: 'URU' },
    'Uzbekistan': { code: 'uz', cn: '乌兹别克斯坦', fifa: 'UZB' }
};

// 翻译占位符为中文
function translatePlaceholder(name) {
    if (!name) return '';
    let result = name;
    if (result.startsWith('Winner Match')) {
        return result.replace('Winner Match ', 'M') + ' 胜者';
    }
    if (result.startsWith('Loser Match')) {
        return result.replace('Loser Match ', 'M') + ' 负者';
    }
    result = result.replace(/Group\s+([A-L])\s+winners/gi, '$1组第一');
    result = result.replace(/Group\s+([A-L])\s+runners-up/gi, '$1组第二');
    result = result.replace(/Group\s+([A-L/]+)\s+third\s+place/gi, '$1组第三名');
    return result;
}

// 格式化获取队伍展示名称：中文 + 三字FIFA国际码
function getTeamDisplayName(englishName) {
    if (!englishName) return '';
    const isPlaceholder = englishName.startsWith('Winner Match') || 
                        englishName.startsWith('Loser Match') || 
                        englishName.includes('winners') || 
                        englishName.includes('runners-up') || 
                        englishName.includes('third place');
                        
    if (isPlaceholder) {
        return `<span class="placeholder-team">${translatePlaceholder(englishName)}</span>`;
    }
    const meta = teamMetadata[englishName];
    if (meta) {
        return `${meta.cn} <span class="fifa-code">${meta.fifa}</span>`;
    }
    return englishName;
}

// 格式化获取简单纯文本展示名称：中文 (三字码)
function getTeamSimpleName(englishName) {
    if (!englishName) return '';
    const isPlaceholder = englishName.startsWith('Winner Match') || 
                        englishName.startsWith('Loser Match') || 
                        englishName.includes('winners') || 
                        englishName.includes('runners-up') || 
                        englishName.includes('third place');
                        
    if (isPlaceholder) {
        return translatePlaceholder(englishName);
    }
    const meta = teamMetadata[englishName];
    if (meta) {
        return `${meta.cn} (${meta.fifa})`;
    }
    return englishName;
}

// 仅获取中文名
function getTeamChineseName(englishName) {
    if (!englishName) return '';
    const meta = teamMetadata[englishName];
    return meta ? meta.cn : translatePlaceholder(englishName);
}

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

    // 开启智能定时轮询：正常每 60 秒同步一次，连续失败超过阈值后自动降频至 5 分钟
    function scheduleReload() {
        const interval = _reloadFailCount >= _RELOAD_MAX_FAIL ? 300000 : 60000;
        setTimeout(async () => {
            await reloadMatchesDataOnly();
            scheduleReload();
        }, interval);
    }
    scheduleReload();
});

function initLucide() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// 载入 API 配置（仅从 LocalStorage 读取，不再通过 HTTP 暴露 .env 文件）
async function loadApiConfig() {
    let hasToken = false;

    // 从 LocalStorage 读取已保存的 API 配置
    const savedConfig = localStorage.getItem('worldcup_api_config');
    if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.footballDataToken) {
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
                // 只要远程 fixtures.json 已经标为 finished 且含有真实比分，而本地还没标为 finished，就强制进行比分覆盖同步。
                // 这样能有效打破 LocalStorage 脏缓存的锁定，并在后续运行中正确载入真实完赛比分，同时保留用户手动的模拟成果。
                const isRemoteFinished = fixture.homeScore !== null && fixture.homeScore !== undefined && (fixture.status === 'finished');
                const isLocalNotFinished = matchObj.status !== 'finished';
                const needsSync = !localData || matchObj.homeScore === null || (isLocalNotFinished && isRemoteFinished);
                
                if (needsSync) {
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

// 定时轮询连续失败计数器
let _reloadFailCount = 0;
const _RELOAD_MAX_FAIL = 5; // 连续失败超过此阈值后降频

// 自动 Fetch 静态赛程数据（由 Actions 定期更新），合并比分完成前端自动无感刷新
async function reloadMatchesDataOnly() {
    try {
        const response = await fetch('./fixtures.json?t=' + Date.now()); // 加时间戳，防缓存
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        
        // 请求成功，重置失败计数
        _reloadFailCount = 0;
        
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
        _reloadFailCount++;
        if (_reloadFailCount === _RELOAD_MAX_FAIL) {
            console.warn(`定时轮询已连续失败 ${_RELOAD_MAX_FAIL} 次，降低刷新频率至 5 分钟/次`);
            showToast('数据同步暂时异常，已自动降低刷新频率。', 'error');
        }
        console.warn(`定时轮询比分同步失败 (第 ${_reloadFailCount} 次):`, e);
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

// 获取国旗 URL（直接从统一的 teamMetadata 中取 code）
function getFlagUrl(teamName) {
    if (!teamName || teamName.includes('runners-up') || teamName.includes('winners') || teamName.includes('third place') || teamName.includes('Match') || teamName.includes('Winner') || teamName.includes('Loser')) {
        return 'https://flagcdn.com/w80/un.png'; // 占位联合旗帜
    }
    const meta = teamMetadata[teamName];
    if (meta && meta.code) {
        return `https://flagcdn.com/w80/${meta.code}.png`;
    }
    return 'https://flagcdn.com/w80/un.png';
}

// 渲染所有组件
function renderAll() {
    // 运行晋级和积分计算引擎，返回已计算的积分榜数据供渲染复用
    const standings = runEngine();
    
    // 渲染各个 Tab 页（复用积分榜，避免重复计算）
    renderMatchesList();
    renderStandings(standings);
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
    
    // 6. 返回积分榜供渲染复用，避免 renderStandings 重复计算
    return standings;
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

// 判断单个小组是否全部完赛（2026年世界杯每小组6场比赛）
function isGroupFinished(groupName) {
    if (!appState.fixtures || appState.fixtures.length === 0) return false;
    const groupMatches = appState.fixtures.filter(f => f.stage === 'group-stage' && f.group === groupName);
    if (groupMatches.length === 0) return false;
    return groupMatches.every(f => {
        const m = appState.matches[f.matchNumber];
        return m && m.status === 'finished';
    });
}

// 判断整个小组赛阶段（共72场比赛）是否全部完赛
function isAllGroupStageFinished() {
    for (let i = 1; i <= 72; i++) {
        const m = appState.matches[i];
        if (!m || m.status !== 'finished') {
            return false;
        }
    }
    return true;
}

// 决定全部 32 个晋级名额
function determineQualifiers(standings) {
    const qualifiers = {
        winners: {},    // 各组第一
        runnersUp: {},  // 各组第二
        thirdPlaces: [] // 最好的 8 个第三名
    };
    
    const allThirdPlaces = [];
    const isAllFinished = isAllGroupStageFinished();
    
    Object.keys(standings).forEach(group => {
        const list = standings[group];
        const groupFin = isGroupFinished(group);
        
        // 只有在小组的全部 6 场比赛都打完的情况下，才确定出该组的前两名，送入对战图
        if (groupFin && list.length >= 2) {
            qualifiers.winners[group] = list[0].team;
            qualifiers.runnersUp[group] = list[1].team;
        } else {
            // 小组未完赛前，出线名额保持待定 (null)
            qualifiers.winners[group] = null;
            qualifiers.runnersUp[group] = null;
        }
        
        // 只有在全部 72 场小组赛完全结束后，各小组第三名的横向排名才有意义。
        // 小组赛未完全完赛前，不填充任何第三名的晋级席位，以防出现对阵临时乱跳的待定情况。
        if (isAllFinished && list.length >= 3) {
            allThirdPlaces.push({
                group: group,
                team: list[2].team,
                pts: list[2].pts,
                gd: list[2].gd,
                gf: list[2].gf
            });
        }
    });
    
    if (isAllFinished) {
        // 对 12 个小组的第三名进行排序，选前 8 个
        allThirdPlaces.sort((x, y) => {
            if (x.pts !== y.pts) return y.pts - x.pts;
            if (x.gd !== y.gd) return y.gd - x.gd;
            if (x.gf !== y.gf) return y.gf - x.gf;
            return x.group.localeCompare(y.group);
        });
        
        qualifiers.thirdPlaces = allThirdPlaces.slice(0, 8);
    } else {
        qualifiers.thirdPlaces = [];
    }
    
    return qualifiers;
}

const thirdPlaceCombinations = {
    "ABCDEFGH": "CFHEBAGD",
    "ABCDEFGI": "DFCIBAGE",
    "ABCDEFGJ": "DFCJBAGE",
    "ABCDEFGK": "DFCKBAGE",
    "ABCDEFGL": "DFCEBAGL",
    "ABCDEFHI": "CFHIBAED",
    "ABCDEFHJ": "CFHEBAJD",
    "ABCDEFHK": "CFHKBAED",
    "ABCDEFHL": "CDHEBAFL",
    "ABCDEFIJ": "DFCIBAJE",
    "ABCDEFIK": "DFCKBAEI",
    "ABCDEFIL": "DFCIBAEL",
    "ABCDEFJK": "DFCKBAJE",
    "ABCDEFJL": "DFCEBAJL",
    "ABCDEFKL": "DFCKBAEL",
    "ABCDEGHI": "CDHIBAGE",
    "ABCDEGHJ": "CDHJBAGE",
    "ABCDEGHK": "CDHKBAGE",
    "ABCDEGHL": "CDHEBAGL",
    "ABCDEGIJ": "CDEJBAGI",
    "ABCDEGIK": "CDEKBAGI",
    "ABCDEGIL": "CDEIBAGL",
    "ABCDEGJK": "CDEKBAGJ",
    "ABCDEGJL": "CDEJBAGL",
    "ABCDEGKL": "CDEKBAGL",
    "ABCDEHIJ": "CDHIBAJE",
    "ABCDEHIK": "CDHKBAEI",
    "ABCDEHIL": "CDHIBAEL",
    "ABCDEHJK": "CDHKBAJE",
    "ABCDEHJL": "CDHEBAJL",
    "ABCDEHKL": "CDHKBAEL",
    "ABCDEIJK": "CDEKBAJI",
    "ABCDEIJL": "CDEIBAJL",
    "ABCDEIKL": "CDEKBAIL",
    "ABCDEJKL": "CDEKBAJL",
    "ABCDFGHI": "CFHIBAGD",
    "ABCDFGHJ": "CFHJBAGD",
    "ABCDFGHK": "CFHKBAGD",
    "ABCDFGHL": "DFCHBAGL",
    "ABCDFGIJ": "DFCJBAGI",
    "ABCDFGIK": "DFCKBAGI",
    "ABCDFGIL": "DFCIBAGL",
    "ABCDFGJK": "DFCKBAGJ",
    "ABCDFGJL": "DFCJBAGL",
    "ABCDFGKL": "DFCKBAGL",
    "ABCDFHIJ": "CFHIBAJD",
    "ABCDFHIK": "CDHKBAFI",
    "ABCDFHIL": "CDHIBAFL",
    "ABCDFHJK": "CFHKBAJD",
    "ABCDFHJL": "DFCHBAJL",
    "ABCDFHKL": "CDHKBAFL",
    "ABCDFIJK": "DFCKBAJI",
    "ABCDFIJL": "DFCIBAJL",
    "ABCDFIKL": "DFCKBAIL",
    "ABCDFJKL": "DFCKBAJL",
    "ABCDGHIJ": "CDHJBAGI",
    "ABCDGHIK": "CDHKBAGI",
    "ABCDGHIL": "CDHIBAGL",
    "ABCDGHJK": "CDHKBAGJ",
    "ABCDGHJL": "CDHJBAGL",
    "ABCDGHKL": "CDHKBAGL",
    "ABCDGIJK": "DGCKBAJI",
    "ABCDGIJL": "DGCIBAJL",
    "ABCDGIKL": "CDIKBAGL",
    "ABCDGJKL": "DGCKBAJL",
    "ABCDHIJK": "CDHKBAJI",
    "ABCDHIJL": "CDHIBAJL",
    "ABCDHIKL": "CDHKBAIL",
    "ABCDHJKL": "CDHKBAJL",
    "ABCDIJKL": "CDIKBAJL",
    "ABCEFGHI": "CFHIBAGE",
    "ABCEFGHJ": "CFHJBAGE",
    "ABCEFGHK": "CFHKBAGE",
    "ABCEFGHL": "CFHEBAGL",
    "ABCEFGIJ": "CFEJBAGI",
    "ABCEFGIK": "CFEKBAGI",
    "ABCEFGIL": "CFEIBAGL",
    "ABCEFGJK": "CFEKBAGJ",
    "ABCEFGJL": "CFEJBAGL",
    "ABCEFGKL": "CFEKBAGL",
    "ABCEFHIJ": "CFHIBAJE",
    "ABCEFHIK": "CFHKBAEI",
    "ABCEFHIL": "CFHIBAEL",
    "ABCEFHJK": "CFHKBAJE",
    "ABCEFHJL": "CFHEBAJL",
    "ABCEFHKL": "CFHKBAEL",
    "ABCEFIJK": "CFEKBAJI",
    "ABCEFIJL": "CFEIBAJL",
    "ABCEFIKL": "CFEKBAIL",
    "ABCEFJKL": "CFEKBAJL",
    "ABCEGHIJ": "CGHIBAJE",
    "ABCEGHIK": "CHEKBAGI",
    "ABCEGHIL": "CHEIBAGL",
    "ABCEGHJK": "CGHKBAJE",
    "ABCEGHJL": "CGHEBAJL",
    "ABCEGHKL": "CHEKBAGL",
    "ABCEGIJK": "CGEKBAJI",
    "ABCEGIJL": "CGEIBAJL",
    "ABCEGIKL": "ACEKBIGL",
    "ABCEGJKL": "CGEKBAJL",
    "ABCEHIJK": "CHEKBAJI",
    "ABCEHIJL": "CHEIBAJL",
    "ABCEHIKL": "CHEKBAIL",
    "ABCEHJKL": "CHEKBAJL",
    "ABCEIJKL": "ACEKBIJL",
    "ABCFGHIJ": "CFHJBAGI",
    "ABCFGHIK": "CFHKBAGI",
    "ABCFGHIL": "CFHIBAGL",
    "ABCFGHJK": "CFHKBAGJ",
    "ABCFGHJL": "CFHJBAGL",
    "ABCFGHKL": "CFHKBAGL",
    "ABCFGIJK": "FGCKBAJI",
    "ABCFGIJL": "FGCIBAJL",
    "ABCFGIKL": "CFIKBAGL",
    "ABCFGJKL": "FGCKBAJL",
    "ABCFHIJK": "CFHKBAJI",
    "ABCFHIJL": "CFHIBAJL",
    "ABCFHIKL": "CFHKBAIL",
    "ABCFHJKL": "CFHKBAJL",
    "ABCFIJKL": "CFIKBAJL",
    "ABCGHIJK": "CGHKBAJI",
    "ABCGHIJL": "CGHIBAJL",
    "ABCGHIKL": "CHIKBAGL",
    "ABCGHJKL": "CGHKBAJL",
    "ABCGIJKL": "CGIKBAJL",
    "ABCHIJKL": "CHIKBAJL",
    "ABDEFGHI": "DFHIBAGE",
    "ABDEFGHJ": "DFHJBAGE",
    "ABDEFGHK": "DFHKBAGE",
    "ABDEFGHL": "DFHEBAGL",
    "ABDEFGIJ": "DFEJBAGI",
    "ABDEFGIK": "DFEKBAGI",
    "ABDEFGIL": "DFEIBAGL",
    "ABDEFGJK": "DFEKBAGJ",
    "ABDEFGJL": "DFEJBAGL",
    "ABDEFGKL": "DFEKBAGL",
    "ABDEFHIJ": "DFHIBAJE",
    "ABDEFHIK": "DFHKBAEI",
    "ABDEFHIL": "DFHIBAEL",
    "ABDEFHJK": "DFHKBAJE",
    "ABDEFHJL": "DFHEBAJL",
    "ABDEFHKL": "DFHKBAEL",
    "ABDEFIJK": "DFEKBAJI",
    "ABDEFIJL": "DFEIBAJL",
    "ABDEFIKL": "DFEKBAIL",
    "ABDEFJKL": "DFEKBAJL",
    "ABDEGHIJ": "DGHIBAJE",
    "ABDEGHIK": "DHEKBAGI",
    "ABDEGHIL": "DHEIBAGL",
    "ABDEGHJK": "DGHKBAJE",
    "ABDEGHJL": "DGHEBAJL",
    "ABDEGHKL": "DHEKBAGL",
    "ABDEGIJK": "DGEKBAJI",
    "ABDEGIJL": "DGEIBAJL",
    "ABDEGIKL": "ADEKBIGL",
    "ABDEGJKL": "DGEKBAJL",
    "ABDEHIJK": "DHEKBAJI",
    "ABDEHIJL": "DHEIBAJL",
    "ABDEHIKL": "DHEKBAIL",
    "ABDEHJKL": "DHEKBAJL",
    "ABDEIJKL": "ADEKBIJL",
    "ABDFGHIJ": "DFHJBAGI",
    "ABDFGHIK": "DFHKBAGI",
    "ABDFGHIL": "DFHIBAGL",
    "ABDFGHJK": "DFHKBAGJ",
    "ABDFGHJL": "DFHJBAGL",
    "ABDFGHKL": "DFHKBAGL",
    "ABDFGIJK": "DGFKBAJI",
    "ABDFGIJL": "DGFIBAJL",
    "ABDFGIKL": "DFIKBAGL",
    "ABDFGJKL": "DGFKBAJL",
    "ABDFHIJK": "DFHKBAJI",
    "ABDFHIJL": "DFHIBAJL",
    "ABDFHIKL": "DFHKBAIL",
    "ABDFHJKL": "DFHKBAJL",
    "ABDFIJKL": "DFIKBAJL",
    "ABDGHIJK": "DGHKBAJI",
    "ABDGHIJL": "DGHIBAJL",
    "ABDGHIKL": "DHIKBAGL",
    "ABDGHJKL": "DGHKBAJL",
    "ABDGIJKL": "DGIKBAJL",
    "ABDHIJKL": "DHIKBAJL",
    "ABEFGHIJ": "FGHIBAJE",
    "ABEFGHIK": "FHEKBAGI",
    "ABEFGHIL": "FHEIBAGL",
    "ABEFGHJK": "FGHKBAJE",
    "ABEFGHJL": "FGHEBAJL",
    "ABEFGHKL": "FHEKBAGL",
    "ABEFGIJK": "FGEKBAJI",
    "ABEFGIJL": "FGEIBAJL",
    "ABEFGIKL": "AFEKBIGL",
    "ABEFGJKL": "FGEKBAJL",
    "ABEFHIJK": "FHEKBAJI",
    "ABEFHIJL": "FHEIBAJL",
    "ABEFHIKL": "FHEKBAIL",
    "ABEFHJKL": "FHEKBAJL",
    "ABEFIJKL": "AFEKBIJL",
    "ABEGHIJK": "AGEKBHJI",
    "ABEGHIJL": "AGEIBHJL",
    "ABEGHIKL": "AHEKBIGL",
    "ABEGHJKL": "AGEKBHJL",
    "ABEGIJKL": "AGEKBIJL",
    "ABEHIJKL": "AHEKBIJL",
    "ABFGHIJK": "FGHKBAJI",
    "ABFGHIJL": "FGHIBAJL",
    "ABFGHIKL": "AFHKBIGL",
    "ABFGHJKL": "FGHKBAJL",
    "ABFGIJKL": "FGIKBAJL",
    "ABFHIJKL": "AFHKBIJL",
    "ABGHIJKL": "AGHKBIJL",
    "ACDEFGHI": "CFHIEAGD",
    "ACDEFGHJ": "CFHEJAGD",
    "ACDEFGHK": "CFHKEAGD",
    "ACDEFGHL": "CDHEFAGL",
    "ACDEFGIJ": "DFCIJAGE",
    "ACDEFGIK": "DFCKEAGI",
    "ACDEFGIL": "DFCIEAGL",
    "ACDEFGJK": "DFCKJAGE",
    "ACDEFGJL": "DFCEJAGL",
    "ACDEFGKL": "DFCKEAGL",
    "ACDEFHIJ": "CFHIEAJD",
    "ACDEFHIK": "CDHKFAEI",
    "ACDEFHIL": "CDHIFAEL",
    "ACDEFHJK": "CFHKEAJD",
    "ACDEFHJL": "CDHEFAJL",
    "ACDEFHKL": "CDHKFAEL",
    "ACDEFIJK": "DFCKEAJI",
    "ACDEFIJL": "DFCIEAJL",
    "ACDEFIKL": "DFCKIAEL",
    "ACDEFJKL": "DFCKEAJL",
    "ACDEGHIJ": "CDHIJAGE",
    "ACDEGHIK": "CDHKEAGI",
    "ACDEGHIL": "CDHIEAGL",
    "ACDEGHJK": "CDHKJAGE",
    "ACDEGHJL": "CDHEJAGL",
    "ACDEGHKL": "CDHKEAGL",
    "ACDEGIJK": "CDEKJAGI",
    "ACDEGIJL": "CDEIJAGL",
    "ACDEGIKL": "CDEKIAGL",
    "ACDEGJKL": "CDEKJAGL",
    "ACDEHIJK": "CDHKEAJI",
    "ACDEHIJL": "CDHIEAJL",
    "ACDEHIKL": "CDHKIAEL",
    "ACDEHJKL": "CDHKEAJL",
    "ACDEIJKL": "CDEKIAJL",
    "ACDFGHIJ": "CFHIJAGD",
    "ACDFGHIK": "CDHKFAGI",
    "ACDFGHIL": "CDHIFAGL",
    "ACDFGHJK": "CFHKJAGD",
    "ACDFGHJL": "DFCHJAGL",
    "ACDFGHKL": "CDHKFAGL",
    "ACDFGIJK": "DFCKJAGI",
    "ACDFGIJL": "DFCIJAGL",
    "ACDFGIKL": "DFCKIAGL",
    "ACDFGJKL": "DFCKJAGL",
    "ACDFHIJK": "CDHKFAJI",
    "ACDFHIJL": "CDHIFAJL",
    "ACDFHIKL": "CDHKIAFL",
    "ACDFHJKL": "CDHKFAJL",
    "ACDFIJKL": "DFCKIAJL",
    "ACDGHIJK": "CDHKJAGI",
    "ACDGHIJL": "CDHIJAGL",
    "ACDGHIKL": "CDHKIAGL",
    "ACDGHJKL": "CDHKJAGL",
    "ACDGIJKL": "CDIKJAGL",
    "ACDHIJKL": "CDHKIAJL",
    "ACEFGHIJ": "CFHIJAGE",
    "ACEFGHIK": "CFHKEAGI",
    "ACEFGHIL": "CFHIEAGL",
    "ACEFGHJK": "CFHKJAGE",
    "ACEFGHJL": "CFHEJAGL",
    "ACEFGHKL": "CFHKEAGL",
    "ACEFGIJK": "CFEKJAGI",
    "ACEFGIJL": "CFEIJAGL",
    "ACEFGIKL": "CFEKIAGL",
    "ACEFGJKL": "CFEKJAGL",
    "ACEFHIJK": "CFHKEAJI",
    "ACEFHIJL": "CFHIEAJL",
    "ACEFHIKL": "CFHKIAEL",
    "ACEFHJKL": "CFHKEAJL",
    "ACEFIJKL": "CFEKIAJL",
    "ACEGHIJK": "CHEKJAGI",
    "ACEGHIJL": "CHEIJAGL",
    "ACEGHIKL": "CHEKIAGL",
    "ACEGHJKL": "CHEKJAGL",
    "ACEGIJKL": "CGEKIAJL",
    "ACEHIJKL": "CHEKIAJL",
    "ACFGHIJK": "CFHKJAGI",
    "ACFGHIJL": "CFHIJAGL",
    "ACFGHIKL": "CFHKIAGL",
    "ACFGHJKL": "CFHKJAGL",
    "ACFGIJKL": "CFIKJAGL",
    "ACFHIJKL": "CFHKIAJL",
    "ACGHIJKL": "CGHKIAJL",
    "ADEFGHIJ": "DFHIJAGE",
    "ADEFGHIK": "DFHKEAGI",
    "ADEFGHIL": "DFHIEAGL",
    "ADEFGHJK": "DFHKJAGE",
    "ADEFGHJL": "DFHEJAGL",
    "ADEFGHKL": "DFHKEAGL",
    "ADEFGIJK": "DFEKJAGI",
    "ADEFGIJL": "DFEIJAGL",
    "ADEFGIKL": "DFEKIAGL",
    "ADEFGJKL": "DFEKJAGL",
    "ADEFHIJK": "DFHKEAJI",
    "ADEFHIJL": "DFHIEAJL",
    "ADEFHIKL": "DFHKIAEL",
    "ADEFHJKL": "DFHKEAJL",
    "ADEFIJKL": "DFEKIAJL",
    "ADEGHIJK": "DHEKJAGI",
    "ADEGHIJL": "DHEIJAGL",
    "ADEGHIKL": "DHEKIAGL",
    "ADEGHJKL": "DHEKJAGL",
    "ADEGIJKL": "DGEKIAJL",
    "ADEHIJKL": "DHEKIAJL",
    "ADFGHIJK": "DFHKJAGI",
    "ADFGHIJL": "DFHIJAGL",
    "ADFGHIKL": "DFHKIAGL",
    "ADFGHJKL": "DFHKJAGL",
    "ADFGIJKL": "DFIKJAGL",
    "ADFHIJKL": "DFHKIAJL",
    "ADGHIJKL": "DGHKIAJL",
    "AEFGHIJK": "FHEKJAGI",
    "AEFGHIJL": "FHEIJAGL",
    "AEFGHIKL": "FHEKIAGL",
    "AEFGHJKL": "FHEKJAGL",
    "AEFGIJKL": "FGEKIAJL",
    "AEFHIJKL": "FHEKIAJL",
    "AEGHIJKL": "AGEKIHJL",
    "AFGHIJKL": "FGHKIAJL",
    "BCDEFGHI": "DFCIBHGE",
    "BCDEFGHJ": "CFHEBJGD",
    "BCDEFGHK": "DFCKBHGE",
    "BCDEFGHL": "DFCEBHGL",
    "BCDEFGIJ": "DFCIBJGE",
    "BCDEFGIK": "DFCKBEGI",
    "BCDEFGIL": "DFCIBEGL",
    "BCDEFGJK": "DFCKBJGE",
    "BCDEFGJL": "DFCEBJGL",
    "BCDEFGKL": "DFCKBEGL",
    "BCDEFHIJ": "DFCIBHJE",
    "BCDEFHIK": "DFCKBHEI",
    "BCDEFHIL": "DFCIBHEL",
    "BCDEFHJK": "DFCKBHJE",
    "BCDEFHJL": "DFCEBHJL",
    "BCDEFHKL": "DFCKBHEL",
    "BCDEFIJK": "DFCKBEJI",
    "BCDEFIJL": "DFCIBEJL",
    "BCDEFIKL": "DFCKBIEL",
    "BCDEFJKL": "DFCKBEJL",
    "BCDEGHIJ": "CDHIBJGE",
    "BCDEGHIK": "CDEKBHGI",
    "BCDEGHIL": "CDEIBHGL",
    "BCDEGHJK": "CDHKBJGE",
    "BCDEGHJL": "CDHEBJGL",
    "BCDEGHKL": "CDEKBHGL",
    "BCDEGIJK": "CDEKBJGI",
    "BCDEGIJL": "CDEIBJGL",
    "BCDEGIKL": "CDEKBIGL",
    "BCDEGJKL": "CDEKBJGL",
    "BCDEHIJK": "CDEKBHJI",
    "BCDEHIJL": "CDEIBHJL",
    "BCDEHIKL": "CDEKBHIL",
    "BCDEHJKL": "CDEKBHJL",
    "BCDEIJKL": "CDEKBIJL",
    "BCDFGHIJ": "CFHIBJGD",
    "BCDFGHIK": "DFCKBHGI",
    "BCDFGHIL": "DFCIBHGL",
    "BCDFGHJK": "CFHKBJGD",
    "BCDFGHJL": "DFCJBHGL",
    "BCDFGHKL": "DFCKBHGL",
    "BCDFGIJK": "DFCKBJGI",
    "BCDFGIJL": "DFCIBJGL",
    "BCDFGIKL": "DFCKBIGL",
    "BCDFGJKL": "DFCKBJGL",
    "BCDFHIJK": "DFCKBHJI",
    "BCDFHIJL": "DFCIBHJL",
    "BCDFHIKL": "DFCKBHIL",
    "BCDFHJKL": "DFCKBHJL",
    "BCDFIJKL": "DFCKBIJL",
    "BCDGHIJK": "CDHKBJGI",
    "BCDGHIJL": "CDHIBJGL",
    "BCDGHIKL": "CDHKBIGL",
    "BCDGHJKL": "CDHKBJGL",
    "BCDGIJKL": "CDIKBJGL",
    "BCDHIJKL": "CDHKBIJL",
    "BCEFGHIJ": "CFHIBJGE",
    "BCEFGHIK": "CFEKBHGI",
    "BCEFGHIL": "CFEIBHGL",
    "BCEFGHJK": "CFHKBJGE",
    "BCEFGHJL": "CFHEBJGL",
    "BCEFGHKL": "CFEKBHGL",
    "BCEFGIJK": "CFEKBJGI",
    "BCEFGIJL": "CFEIBJGL",
    "BCEFGIKL": "CFEKBIGL",
    "BCEFGJKL": "CFEKBJGL",
    "BCEFHIJK": "CFEKBHJI",
    "BCEFHIJL": "CFEIBHJL",
    "BCEFHIKL": "CFEKBHIL",
    "BCEFHJKL": "CFEKBHJL",
    "BCEFIJKL": "CFEKBIJL",
    "BCEGHIJK": "CGEKBHJI",
    "BCEGHIJL": "CGEIBHJL",
    "BCEGHIKL": "CHEKBIGL",
    "BCEGHJKL": "CGEKBHJL",
    "BCEGIJKL": "CGEKBIJL",
    "BCEHIJKL": "CHEKBIJL",
    "BCFGHIJK": "CFHKBJGI",
    "BCFGHIJL": "CFHIBJGL",
    "BCFGHIKL": "CFHKBIGL",
    "BCFGHJKL": "CFHKBJGL",
    "BCFGIJKL": "CFIKBJGL",
    "BCFHIJKL": "CFHKBIJL",
    "BCGHIJKL": "CGHKBIJL",
    "BDEFGHIJ": "DFHIBJGE",
    "BDEFGHIK": "DFEKBHGI",
    "BDEFGHIL": "DFEIBHGL",
    "BDEFGHJK": "DFHKBJGE",
    "BDEFGHJL": "DFHEBJGL",
    "BDEFGHKL": "DFEKBHGL",
    "BDEFGIJK": "DFEKBJGI",
    "BDEFGIJL": "DFEIBJGL",
    "BDEFGIKL": "DFEKBIGL",
    "BDEFGJKL": "DFEKBJGL",
    "BDEFHIJK": "DFEKBHJI",
    "BDEFHIJL": "DFEIBHJL",
    "BDEFHIKL": "DFEKBHIL",
    "BDEFHJKL": "DFEKBHJL",
    "BDEFIJKL": "DFEKBIJL",
    "BDEGHIJK": "DGEKBHJI",
    "BDEGHIJL": "DGEIBHJL",
    "BDEGHIKL": "DHEKBIGL",
    "BDEGHJKL": "DGEKBHJL",
    "BDEGIJKL": "DGEKBIJL",
    "BDEHIJKL": "DHEKBIJL",
    "BDFGHIJK": "DFHKBJGI",
    "BDFGHIJL": "DFHIBJGL",
    "BDFGHIKL": "DFHKBIGL",
    "BDFGHJKL": "DFHKBJGL",
    "BDFGIJKL": "DFIKBJGL",
    "BDFHIJKL": "DFHKBIJL",
    "BDGHIJKL": "DGHKBIJL",
    "BEFGHIJK": "FGEKBHJI",
    "BEFGHIJL": "FGEIBHJL",
    "BEFGHIKL": "FHEKBIGL",
    "BEFGHJKL": "FGEKBHJL",
    "BEFGIJKL": "FGEKBIJL",
    "BEFHIJKL": "FHEKBIJL",
    "BEGHIJKL": "BGEKIHJL",
    "BFGHIJKL": "FGHKBIJL",
    "CDEFGHIJ": "DFCIJHGE",
    "CDEFGHIK": "DFCKEHGI",
    "CDEFGHIL": "DFCIEHGL",
    "CDEFGHJK": "DFCKJHGE",
    "CDEFGHJL": "DFCEJHGL",
    "CDEFGHKL": "DFCKEHGL",
    "CDEFGIJK": "DFCKEJGI",
    "CDEFGIJL": "DFCIEJGL",
    "CDEFGIKL": "DFCKEIGL",
    "CDEFGJKL": "DFCKEJGL",
    "CDEFHIJK": "DFCKEHJI",
    "CDEFHIJL": "DFCIEHJL",
    "CDEFHIKL": "DFCKIHEL",
    "CDEFHJKL": "DFCKEHJL",
    "CDEFIJKL": "DFCKEIJL",
    "CDEGHIJK": "CDEKJHGI",
    "CDEGHIJL": "CDEIJHGL",
    "CDEGHIKL": "CDEKIHGL",
    "CDEGHJKL": "CDEKJHGL",
    "CDEGIJKL": "CDEKIJGL",
    "CDEHIJKL": "CDEKIHJL",
    "CDFGHIJK": "DFCKJHGI",
    "CDFGHIJL": "DFCIJHGL",
    "CDFGHIKL": "DFCKIHGL",
    "CDFGHJKL": "DFCKJHGL",
    "CDFGIJKL": "DFCKIJGL",
    "CDFHIJKL": "DFCKIHJL",
    "CDGHIJKL": "CDHKIJGL",
    "CEFGHIJK": "CFEKJHGI",
    "CEFGHIJL": "CFEIJHGL",
    "CEFGHIKL": "CFEKIHGL",
    "CEFGHJKL": "CFEKJHGL",
    "CEFGIJKL": "CFEKIJGL",
    "CEFHIJKL": "CFEKIHJL",
    "CEGHIJKL": "CGEKIHJL",
    "CFGHIJKL": "CFHKIJGL",
    "DEFGHIJK": "DFEKJHGI",
    "DEFGHIJL": "DFEIJHGL",
    "DEFGHIKL": "DFEKIHGL",
    "DEFGHJKL": "DFEKJHGL",
    "DEFGIJKL": "DFEKIJGL",
    "DEFHIJKL": "DFEKIHJL",
    "DEGHIJKL": "DGEKIHJL",
    "DFGHIJKL": "DFHKIJGL",
    "EFGHIJKL": "FGEKIHJL"
};

// 填充 32强对阵 (Match 73 - 88)
function populateRoundOf32(qualifiers) {
    const thirdPlacesAssigned = new Set();
    
    const qualifiedGroups = qualifiers.thirdPlaces.map(t => t.group).sort().join('');
    const mappingStr = thirdPlaceCombinations[qualifiedGroups];
    let annexCMap = null;
    if (mappingStr && mappingStr.length === 8) {
        annexCMap = {
            74: mappingStr[0],
            77: mappingStr[1],
            79: mappingStr[2],
            80: mappingStr[3],
            81: mappingStr[4],
            82: mappingStr[5],
            85: mappingStr[6],
            87: mappingStr[7]
        };
    }
    
    for (let i = 73; i <= 88; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        // 重置回默认占位符，以便重新计算
        m.homeTeam = m.homeTeamPlaceholder || appState.fixtures[i - 1].homeTeam;
        m.awayTeam = m.awayTeamPlaceholder || appState.fixtures[i - 1].awayTeam;
        
        // 缓存初始占位符
        if (!m.homeTeamPlaceholder) m.homeTeamPlaceholder = m.homeTeam;
        if (!m.awayTeamPlaceholder) m.awayTeamPlaceholder = m.awayTeam;
        
        if (annexCMap && annexCMap[i]) {
            const targetGroup = annexCMap[i];
            const targetTeam = qualifiers.thirdPlaces.find(t => t.group === targetGroup)?.team;
            if (targetTeam) {
                if (m.homeTeam.includes('third place')) m.homeTeam = targetTeam;
                if (m.awayTeam.includes('third place')) m.awayTeam = targetTeam;
                continue;
            }
        }
        
        // 否则走原来的贪心算法解析逻辑
        m.homeTeam = resolveGroupPlaceholder(m.homeTeam, qualifiers, thirdPlacesAssigned);
        m.awayTeam = resolveGroupPlaceholder(m.awayTeam, qualifiers, thirdPlacesAssigned);
    }
};
    
    for (let i = 73; i <= 88; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        // 重置回默认占位符，以便重新计算
        m.homeTeam = m.homeTeamPlaceholder || appState.fixtures[i - 1].homeTeam;
        m.awayTeam = m.awayTeamPlaceholder || appState.fixtures[i - 1].awayTeam;
        
        // 缓存初始占位符
        if (!m.homeTeamPlaceholder) m.homeTeamPlaceholder = m.homeTeam;
        if (!m.awayTeamPlaceholder) m.awayTeamPlaceholder = m.awayTeam;
        
        // 如果是官方特定的标准出线组合，直接使用精准映射进行分配
        if (isStandard2026Combination && annexCMap[i]) {
            const targetGroup = annexCMap[i];
            const targetTeam = qualifiers.thirdPlaces.find(t => t.group === targetGroup)?.team;
            if (targetTeam) {
                if (m.homeTeam.includes('third place')) m.homeTeam = targetTeam;
                if (m.awayTeam.includes('third place')) m.awayTeam = targetTeam;
                continue;
            }
        }
        
        // 否则走原来的贪心算法解析逻辑
        m.homeTeam = resolveGroupPlaceholder(m.homeTeam, qualifiers, thirdPlacesAssigned);
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
        // 如果未完赛，qualifiers.thirdPlaces 是空的，直接保留占位符
        if (!qualifiers.thirdPlaces || qualifiers.thirdPlaces.length === 0) {
            return placeholder;
        }
        
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
    
    // 收集所有通过过滤筛选的比赛
    const matchesToRender = [];
    
    for (let i = 1; i <= 104; i++) {
        const m = appState.matches[i];
        if (!m) continue;
        
        // 1. 过滤：搜索词（同时匹配英文队名、中文队名和 FIFA 三字码）
        const homeName = m.homeTeam.toLowerCase();
        const awayName = m.awayTeam.toLowerCase();
        const homeCn = getTeamChineseName(m.homeTeam).toLowerCase();
        const awayCn = getTeamChineseName(m.awayTeam).toLowerCase();
        const homeMeta = teamMetadata[m.homeTeam];
        const awayMeta = teamMetadata[m.awayTeam];
        const homeFifa = homeMeta ? homeMeta.fifa.toLowerCase() : '';
        const awayFifa = awayMeta ? awayMeta.fifa.toLowerCase() : '';
        if (searchVal && !homeName.includes(searchVal) && !awayName.includes(searchVal)
            && !homeCn.includes(searchVal) && !awayCn.includes(searchVal)
            && !homeFifa.includes(searchVal) && !awayFifa.includes(searchVal)) {
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
        
        matchesToRender.push(m);
    }
    
    // 按本地日期 YYYY-MM-DD 分组（用于后续智能定位滚动计算）
    const allGroupedDates = {};
    matchesToRender.forEach(m => {
        const dateObj = new Date(m.kickoffUtc);
        const y = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${y}-${month}-${d}`;
        if (!allGroupedDates[dateKey]) {
            allGroupedDates[dateKey] = [];
        }
        allGroupedDates[dateKey].push(m);
    });
    const allSortedDateKeys = Object.keys(allGroupedDates).sort();

    // 智能定位滚动：确定最先看到关注的比赛日
    // 获取本地今天 YYYY-MM-DD
    const getTodayLocalStr = () => {
        const today = new Date();
        const y = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return `${y}-${month}-${d}`;
    };
    const todayStr = getTodayLocalStr();

    let targetDateKey = null;
    if (allGroupedDates[todayStr]) {
        targetDateKey = todayStr;
    } else {
        const activeKey = allSortedDateKeys.find(key => 
            allGroupedDates[key].some(m => m.status !== 'finished')
        );
        if (activeKey) {
            targetDateKey = activeKey;
        } else if (allSortedDateKeys.length > 0) {
            targetDateKey = allSortedDateKeys[allSortedDateKeys.length - 1];
        }
    }

    // 定义要展示的阶段顺序与显示名
    const stageOrder = [
        { id: 'group-stage', name: '小组赛' },
        { id: 'round-of-32', name: '32 强淘汰赛' },
        { id: 'round-of-16', name: '16 强淘汰赛' },
        { id: 'quarter-finals', name: '1/4 决赛' },
        { id: 'semi-finals', name: '半决赛' },
        { id: 'third-place', name: '三四名决赛' },
        { id: 'final', name: '决赛' }
    ];

    // 将过滤后的比赛按阶段分组
    const stageGroups = {};
    stageOrder.forEach(s => {
        stageGroups[s.id] = [];
    });
    matchesToRender.forEach(m => {
        if (stageGroups[m.stage]) {
            stageGroups[m.stage].push(m);
        }
    });

    const renderedCount = matchesToRender.length;

    // 遍历阶段进行渲染
    stageOrder.forEach(stageInfo => {
        const matchesInStage = stageGroups[stageInfo.id];
        if (!matchesInStage || matchesInStage.length === 0) return;

        // 判断阶段整体状态
        const allFinished = matchesInStage.every(m => m.status === 'finished');
        const anyLive = matchesInStage.some(m => m.status === 'live' || m.status === 'suspended');
        const allScheduled = matchesInStage.every(m => m.status === 'scheduled');

        let stageStatusText = '未开始';
        let stageStatusClass = 'scheduled';
        if (allFinished) {
            stageStatusText = '已结束';
            stageStatusClass = 'finished';
        } else if (anyLive || (!allScheduled && !allFinished)) {
            stageStatusText = '进行中';
            stageStatusClass = 'live';
        }

        // 阶段内的天级分组
        const stageGroupedByDate = {};
        matchesInStage.forEach(m => {
            const dateObj = new Date(m.kickoffUtc);
            const y = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            const dateKey = `${y}-${month}-${d}`;
            if (!stageGroupedByDate[dateKey]) {
                stageGroupedByDate[dateKey] = [];
            }
            stageGroupedByDate[dateKey].push(m);
        });
        const stageSortedDateKeys = Object.keys(stageGroupedByDate).sort();

        // 决定默认是否折叠：已结束的阶段默认折叠。但如果该阶段包含了要定位滚动的日期，则必须强制展开。
        const containsTargetDate = stageSortedDateKeys.includes(targetDateKey);
        const isCollapsed = allFinished && !containsTargetDate;

        // 创建阶段包裹容器
        const stageSection = document.createElement('div');
        stageSection.className = `stage-section ${isCollapsed ? 'collapsed' : ''}`;
        stageSection.setAttribute('data-stage-id', stageInfo.id);

        // 创建阶段头部
        const stageHeader = document.createElement('div');
        stageHeader.className = 'stage-group-header glass-panel';
        stageHeader.innerHTML = `
            <div class="stage-header-left">
                <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="toggle-arrow"></i>
                <span class="stage-title">${stageInfo.name}</span>
                <span class="stage-count-badge">${matchesInStage.length} 场比赛</span>
            </div>
            <div class="stage-header-right">
                <span class="stage-status-badge ${stageStatusClass}">${stageStatusText}</span>
            </div>
        `;

        // 绑定折叠点击事件
        stageHeader.addEventListener('click', () => {
            stageSection.classList.toggle('collapsed');
            const arrow = stageHeader.querySelector('.toggle-arrow');
            if (stageSection.classList.contains('collapsed')) {
                arrow.setAttribute('data-lucide', 'chevron-right');
            } else {
                arrow.setAttribute('data-lucide', 'chevron-down');
            }
            // 重新初始化该头部内的 Lucide 图标以切换方向
            if (window.lucide) {
                window.lucide.createIcons({ nodes: [stageHeader] });
            }
        });

        // 阶段内容区
        const stageContent = document.createElement('div');
        stageContent.className = 'stage-group-content';

        // 在内容区内渲染天级分组与卡片
        stageSortedDateKeys.forEach(dateKey => {
            const matchesInDay = stageGroupedByDate[dateKey];
            
            // 同一天内的比赛按照开球时间升序排序，时间相同则按比赛编号排序
            matchesInDay.sort((a, b) => {
                const timeA = new Date(a.kickoffUtc).getTime();
                const timeB = new Date(b.kickoffUtc).getTime();
                if (timeA !== timeB) return timeA - timeB;
                return a.matchNumber - b.matchNumber;
            });
            
            const isToday = (dateKey === todayStr);
            
            // 获取本地化日期字符串展示 (如 "06-15 星期一")
            const firstMatchDate = new Date(matchesInDay[0].kickoffUtc);
            const dateDisplay = firstMatchDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'long' });
            
            // 创建日期头部 Header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-group-header';
            dateHeader.setAttribute('data-date', dateKey);
            dateHeader.innerHTML = `
                <div class="date-header-title ${isToday ? 'is-today' : ''}">
                    <i data-lucide="calendar"></i>
                    <span>${dateDisplay}</span>
                    ${isToday ? '<span class="today-badge">今天</span>' : ''}
                </div>
                <span class="date-header-count">${matchesInDay.length} 场比赛</span>
            `;
            stageContent.appendChild(dateHeader);
            
            // 创建卡片网格
            const grid = document.createElement('div');
            grid.className = 'date-group-grid';
            
            // 渲染这一天的所有卡片并添加到网格中
            matchesInDay.forEach(m => {
                const card = document.createElement('div');
                card.className = `match-card ${m.status}`;
                card.setAttribute('data-match-number', m.matchNumber);
                
                const homeFlag = getFlagUrl(m.homeTeam);
                const awayFlag = getFlagUrl(m.awayTeam);
                
                // 比分板的渲染
                let scoreHtml = '';
                if (m.status === 'scheduled') {
                    const timeStr = new Date(m.kickoffUtc).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
                    scoreHtml = `<div class="match-time-placeholder">${timeStr}</div>`;
                } else {
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
                
                card.innerHTML = `
                    <div class="match-card-header">
                        <span class="match-number-badge">Match ${m.matchNumber}</span>
                        <span class="match-stage-label">${m.stage === 'group-stage' ? '小组赛 ' + m.group + '组' : translateStage(m.stage)}</span>
                    </div>
                    <div class="match-card-body">
                        <div class="team-display home">
                            <div class="flag-wrapper">
                                <img class="team-flag" src="${homeFlag}" alt="${m.homeTeam}">
                            </div>
                            <span class="team-name" title="${getTeamSimpleName(m.homeTeam)}">${getTeamDisplayName(m.homeTeam)}</span>
                        </div>
                        
                        <div class="score-board">
                            ${scoreHtml}
                        </div>
                        
                        <div class="team-display away">
                            <div class="flag-wrapper">
                                <img class="team-flag" src="${awayFlag}" alt="${m.awayTeam}">
                            </div>
                            <span class="team-name" title="${getTeamSimpleName(m.awayTeam)}">${getTeamDisplayName(m.awayTeam)}</span>
                        </div>
                    </div>
                    <div class="match-status-row">
                        <span class="match-venue" title="${m.stadium}, ${m.hostCity}"><i data-lucide="map-pin"></i> ${m.stadium}</span>
                        <button class="btn-edit-match" title="模拟/录入比分" onclick="openEditScoreDialog(${m.matchNumber})">
                            <i data-lucide="edit-3"></i>
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
            stageContent.appendChild(grid);
        });

        stageSection.appendChild(stageHeader);
        stageSection.appendChild(stageContent);
        container.appendChild(stageSection);
    });

    if (targetDateKey) {
        const targetEl = container.querySelector(`.date-group-header[data-date="${targetDateKey}"]`);
        if (targetEl) {
            setTimeout(() => {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }
    
    if (renderedCount === 0) {
        container.innerHTML = `
            <div class="loading-placeholder">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--color-text-muted);"></i>
                <p>未找到符合筛选条件的比赛项目。</p>
            </div>
        `;
    }
    // 注意：不在此处调用 initLucide()，由上层 renderAll() 统一调用一次以减少 DOM 遍历开销
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

// 渲染小组积分榜 (Tab 2)，接收已计算好的积分榜数据以避免重复计算
function renderStandings(standings) {
    const container = document.getElementById('standings-grid-container');
    container.innerHTML = '';
    
    // 如果没传入积分榜（兜底），则计算一次
    if (!standings) standings = calculateGroupStandings();
    
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
                        <span>${getTeamSimpleName(row.team)}</span>
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
                            <span title="${getTeamSimpleName(m.homeTeam)}">${getTeamDisplayName(m.homeTeam)}</span>
                        </div>
                        <span class="bracket-team-score">${scoreHomeStr}</span>
                    </div>
                    <div class="bracket-team-row ${isAwayWinner ? 'winner' : ''}">
                        <div class="bracket-team-info">
                            <img class="bracket-team-flag" src="${getFlagUrl(m.awayTeam)}" alt="Flag">
                            <span title="${getTeamSimpleName(m.awayTeam)}">${getTeamDisplayName(m.awayTeam)}</span>
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
    
    document.getElementById('edit-home-name').textContent = getTeamSimpleName(m.homeTeam);
    document.getElementById('edit-away-name').textContent = getTeamSimpleName(m.awayTeam);
    
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
    // 仅对新增的 toast 元素进行局部图标初始化，避免遍历整个 DOM
    if (window.lucide) {
        window.lucide.createIcons({ nodes: [toast] });
    }
    
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
