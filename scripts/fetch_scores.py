#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import urllib.request
import sys
from datetime import datetime, timedelta, timezone
from collections import Counter

# API 队名到本地官方队名的映射转换表
api_team_to_local = {
    'South Korea': 'Korea Republic',
    'Turkey': 'Turkiye',
    'Ivory Coast': "Cote d'Ivoire",
    'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'Cape Verde Islands': 'Cabo Verde',
    'Curaçao': 'Curacao',
    'Iran': 'IR Iran',
    'DR Congo': 'Congo DR'
}

def normalize_team_name(name):
    if not name:
        return ""
    trimmed = name.strip()
    return api_team_to_local.get(trimmed, trimmed)

# 通用 HTTP 请求辅助函数
def fetch_url(url, headers=None):
    if headers is None:
        headers = {}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"⚠️ 请求 URL 失败 [{url}]: {e}")
        return None

def main():
    token = os.environ.get('FOOTBALL_DATA_API_TOKEN')
    rapid_key = os.environ.get('RAPID_API_KEY')
    
    print("🏆 启动多源比分比对与增量滑动窗口更新引擎...")
    
    # 存储各个源抓取到的比分汇总
    # 结构: { match_number: [ { 'home': X, 'away': Y, 'status': S, 'homePen': P1, 'awayPen': P2, 'source': Src } ] }
    match_votes = {}
    
    # --------------------------------------------------------------------------
    # 数据源 1: Football-Data.org (需要 Token)
    # --------------------------------------------------------------------------
    if token:
        print("📡 源 1 [Football-Data.org] 正在拉取...")
        fd_data = fetch_url(
            'https://api.football-data.org/v4/competitions/WC/matches',
            headers={'X-Auth-Token': token}
        )
        if fd_data and 'matches' in fd_data:
            live_statuses = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT']
            for m in fd_data['matches']:
                home = m['homeTeam']['name']
                away = m['awayTeam']['name']
                score_obj = m.get('score', {})
                full_time = score_obj.get('fullTime', {})
                
                h_score = full_time.get('home')
                a_score = full_time.get('away')
                status_raw = m['status']
                
                if h_score is not None and a_score is not None:
                    status = 'finished' if status_raw == 'FINISHED' else ('suspended' if status_raw == 'SUSPENDED' else ('live' if status_raw in live_statuses else 'scheduled'))
                    penalties = score_obj.get('penalties', {})
                    h_pen = penalties.get('home') if penalties else None
                    a_pen = penalties.get('away') if penalties else None
                    
                    vote = {'home': h_score, 'away': a_score, 'status': status, 'homePen': h_pen, 'awayPen': a_pen, 'homeName': home, 'awayName': away, 'source': 'Football-Data'}
                    
                    # 放入临时池
                    match_key = f"{normalize_team_name(home)}|{normalize_team_name(away)}"
                    match_votes.setdefault(match_key, []).append(vote)
            print("✓ 源 1 [Football-Data.org] 抓取完成。")
        else:
            print("⚠️ 源 1 抓取数据为空。")

    # --------------------------------------------------------------------------
    # 数据源 2: API-Football (RapidAPI，需要 Key)
    # --------------------------------------------------------------------------
    if rapid_key:
        print("📡 源 2 [API-Football] 正在拉取...")
        af_data = fetch_url(
            'https://api-football-v1.p.rapidapi.com/v3/fixtures?league=1&season=2026',
            headers={
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                'x-rapidapi-key': rapid_key
            }
        )
        if af_data and 'response' in af_data:
            finished_shorts = ['FT', 'AET', 'PEN']
            live_shorts = ['1H', '2H', 'HT', 'ET', 'P', 'BT']
            for item in af_data['response']:
                home = item['teams']['home']['name']
                away = item['teams']['away']['name']
                goals = item.get('goals', {})
                
                h_score = goals.get('home')
                a_score = goals.get('away')
                status_short = item['fixture']['status']['short']
                
                if h_score is not None and a_score is not None:
                    status = 'finished' if status_short in finished_shorts else ('suspended' if status_short in ['SUSP', 'PST'] else ('live' if status_short in live_shorts else 'scheduled'))
                    penalty_obj = item.get('score', {}).get('penalty', {})
                    h_pen = penalty_obj.get('home') if penalty_obj else None
                    a_pen = penalty_obj.get('away') if penalty_obj else None
                    
                    vote = {'home': h_score, 'away': a_score, 'status': status, 'homePen': h_pen, 'awayPen': a_pen, 'homeName': home, 'awayName': away, 'source': 'API-Football'}
                    
                    match_key = f"{normalize_team_name(home)}|{normalize_team_name(away)}"
                    match_votes.setdefault(match_key, []).append(vote)
            print("✓ 源 2 [API-Football] 抓取完成。")
        else:
            print("⚠️ 源 2 抓取数据为空。")

    # --------------------------------------------------------------------------
    # 数据源 3: GitHub OpenFootball JSON (免 Key)
    # --------------------------------------------------------------------------
    print("📡 源 3 [GitHub OpenFootball] 正在拉取...")
    gf_raw = fetch_url('https://api.allorigins.win/get?url=https%3A%2F%2Fraw.githubusercontent.com%2Fopenfootball%2Fworldcup.json%2Fmaster%2F2026%2Fworldcup.json')
    if gf_raw and 'contents' in gf_raw:
        try:
            gf_data = json.loads(gf_raw['contents'])
            if gf_data and 'rounds' in gf_data:
                for round_obj in gf_data['rounds']:
                    for m in round_obj.get('matches', []):
                        home = m['team1']
                        away = m['team2']
                        h_score = m.get('score1')
                        a_score = m.get('score2')
                        
                        if h_score is not None and a_score is not None:
                            # 静态文件通常只含已结束比分
                            vote = {'home': h_score, 'away': a_score, 'status': 'finished', 'homePen': None, 'awayPen': None, 'homeName': home, 'awayName': away, 'source': 'GitHub-OpenFootball'}
                            
                            match_key = f"{normalize_team_name(home)}|{normalize_team_name(away)}"
                            match_votes.setdefault(match_key, []).append(vote)
                print("✓ 源 3 [GitHub OpenFootball] 抓取完成。")
        except Exception as parse_err:
            print(f"⚠️ 解析源 3 数据失败: {parse_err}")
    else:
        print("⚠️ 源 3 抓取数据为空。")

    # --------------------------------------------------------------------------
    # 载入本地赛程文件
    # --------------------------------------------------------------------------
    fixtures_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fixtures.json')
    try:
        with open(fixtures_path, 'r', encoding='utf-8') as f:
            local_data = json.load(f)
    except Exception as e:
        print(f"❌ 读取 fixtures.json 失败: {e}")
        sys.exit(1)

    # --------------------------------------------------------------------------
    # 增量滑动窗口抓取控制与多源投票决策
    # --------------------------------------------------------------------------
    now_utc = datetime.now(timezone.utc)
    updated_count = 0
    
    print(f"⏰ 当前 UTC 时间: {now_utc.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 遍历本地所有赛程，进行增量窗口判定
    for match in local_data['fixtures']:
        # 1. 增量筛选：仅更新“小组赛”
        if match['stage'] != 'group-stage':
            continue
            
        m_num = match['matchNumber']
        kickoff_utc_str = match['kickoffUtc']
        
        # 将开球时间解析为带时区的 datetime
        try:
            kickoff_dt = datetime.strptime(kickoff_utc_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        except Exception:
            # 兼容非 Z 时区格式
            kickoff_dt = datetime.strptime(kickoff_utc_str, "%Y-%m-%dT%H:%M:%S%z")

        # 【增量规则】：只抓取和更新时间在“开球时间在当前时间之前，且距离当前在 48小时内”的比赛，
        # 或者本地状态依然不是 finished 且已到了开球时间的比赛（进行中的比赛）。
        # 这确保了早已结束的历史比赛不被重复抓取和重写（被锁定），同时未来的比赛也保持 scheduled。
        time_elapsed = now_utc - kickoff_dt
        
        is_in_window = False
        # 规则 A: 正在进行中（开球了但未超过 48 小时，给足录入缓冲期）
        if timedelta(hours=0) <= time_elapsed <= timedelta(hours=48):
            is_in_window = True
        # 规则 B: 已经开球了，但本地尚未被标为 finished 结束（可能在踢或者中场休息）
        elif time_elapsed >= timedelta(hours=0) and match.get('status') != 'finished':
            is_in_window = True

        if not is_in_window:
            # 不在滑动抓取窗口内，直接跳过，保持本地状态不变！
            continue

        # 在投票池里查找对应的比赛
        local_h = normalize_team_name(match['homeTeam'])
        local_a = normalize_team_name(match['awayTeam'])
        
        # 支持主客队换位的匹配查找键
        key1 = f"{local_h}|{local_a}"
        key2 = f"{local_a}|{local_h}"
        
        votes = match_votes.get(key1) or match_votes.get(key2)
        if not votes:
            continue

        # 2. 多源比分共识投票决策
        # 我们把每个源抓到的比分转化成字符串格式进行投票 (home_score, away_score, status)
        score_tuples = []
        for v in votes:
            # 如果主客队顺序相反，反转比分进行校验
            is_reversed = normalize_team_name(v['homeName']) == local_a
            h_s = v['away'] if is_reversed else v['home']
            a_s = v['home'] if is_reversed else v['away']
            h_p = v['awayPen'] if is_reversed else v['homePen']
            a_p = v['homePen'] if is_reversed else v['awayPen']
            
            score_tuples.append((h_s, a_s, v['status'], h_p, a_p))

        if not score_tuples:
            continue

        # 使用 Counter 计算各组合票数
        # 去掉 penalties 进行比分和状态判定投票
        vote_keys = [(t[0], t[1], t[2]) for t in score_tuples]
        counter = Counter(vote_keys)
        
        # 获得得票最多（众数 Majority）的组合
        best_combination, count = counter.most_common(1)[0]
        consensus_home, consensus_away, consensus_status = best_combination

        # 提取胜出组合中对应的罚点球数（若有）
        consensus_h_pen = None
        consensus_a_pen = None
        for t in score_tuples:
            if t[0] == consensus_home and t[1] == consensus_away and t[2] == consensus_status:
                consensus_h_pen = t[3]
                consensus_a_pen = t[4]
                break

        # 校验：是否达成共识
        # 如果有多个数据源返回了数据，但得票最高的只得到了 1 票（说明有冲突），
        # 此时我们优先信任级别最高的源：API-Football (源2) > Football-Data (源1) > GitHub (源3)
        if len(score_tuples) > 1 and count == 1:
            print(f"⚠️ Match {m_num} ({match['homeTeam']} vs {match['awayTeam']}) 多源数据存在冲突 {score_tuples}。启用优先级决策。")
            # 优先级选择
            priority_source = None
            for src_name in ['API-Football', 'Football-Data', 'GitHub-OpenFootball']:
                matched_vote = next((v for v in votes if v['source'] == src_name), None)
                if matched_vote:
                    priority_source = matched_vote
                    break
            if priority_source:
                is_reversed = normalize_team_name(priority_source['homeName']) == local_a
                consensus_home = priority_source['away'] if is_reversed else priority_source['home']
                consensus_away = priority_source['home'] if is_reversed else priority_source['away']
                consensus_status = priority_source['status']
                consensus_h_pen = priority_source['awayPen'] if is_reversed else priority_source['homePen']
                consensus_a_pen = priority_source['homePen'] if is_reversed else priority_source['awayPen']
                print(f"👉 采用高优先级源 [{priority_source['source']}] 的比分: {consensus_home}-{consensus_away} ({consensus_status})")
        
        # 更新写入
        match['homeScore'] = consensus_home
        match['awayScore'] = consensus_away
        match['status'] = consensus_status
        if consensus_h_pen is not None:
            match['homePenalties'] = consensus_h_pen
            match['awayPenalties'] = consensus_a_pen
        else:
            match.pop('homePenalties', None)
            match.pop('awayPenalties', None)

        print(f"⚡ [窗口更新] Match {m_num} ({match['homeTeam']} vs {match['awayTeam']}): 真实比分更新为 {consensus_home}:{consensus_away}，状态: {consensus_status} (多源投票: {count}/{len(score_tuples)}票)")
        updated_count += 1

    # 写回 fixtures.json
    try:
        with open(fixtures_path, 'w', encoding='utf-8') as f:
            json.dump(local_data, f, ensure_ascii=False, indent=2)
        print(f"✓ 增量更新已成功写回 fixtures.json。本次共更新了 {updated_count} 场时间窗口内的比赛。")
    except Exception as e:
        print(f"❌ 写回 fixtures.json 失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
