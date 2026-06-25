#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import urllib.request
import sys

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

def main():
    token = os.environ.get('FOOTBALL_DATA_API_TOKEN')
    if not token:
        print("❌ 错误: 未能在环境变量中找到 FOOTBALL_DATA_API_TOKEN")
        sys.exit(1)

    print("🚀 正在从 Football-Data.org 获取最新的世界杯比分...")
    url = 'https://api.football-data.org/v4/competitions/WC/matches'
    
    try:
        req = urllib.request.Request(url, headers={'X-Auth-Token': token})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ 请求 API 失败: {e}")
        sys.exit(1)

    if not data or 'matches' not in data:
        print("❌ 错误: API 返回了空数据或格式不正确")
        sys.exit(1)

    print(f"✓ 成功抓取到 {len(data['matches'])} 场比赛数据。正在读取本地 fixtures.json...")

    # 读取本地 fixtures.json
    fixtures_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fixtures.json')
    try:
        with open(fixtures_path, 'r', encoding='utf-8') as f:
            local_data = json.load(f)
    except Exception as e:
        print(f"❌ 读取 fixtures.json 失败: {e}")
        sys.exit(1)

    # 模糊查找 Match 编号
    def find_match_number(home, away):
        norm_h = normalize_team_name(home)
        norm_a = normalize_team_name(away)
        
        # 仅对小组赛阶段(M1 - M72)进行精确匹配
        for match in local_data['fixtures']:
            if match['stage'] == 'group-stage':
                m_h = normalize_team_name(match['homeTeam'])
                m_a = normalize_team_name(match['awayTeam'])
                if (m_h == norm_h and m_a == norm_a) or (m_h == norm_a and m_a == norm_h):
                    return match['matchNumber']
        return None

    live_statuses = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT']
    updated_count = 0

    for m in data['matches']:
        home_name = m['homeTeam']['name']
        away_name = m['awayTeam']['name']
        
        # 仅同步小组赛比分，淘汰赛自动晋级由前端引擎根据小组赛比分实时演算得出
        match_num = find_match_number(home_name, away_name)
        if match_num:
            # 找到本地对应场次
            local_match = next((f for f in local_data['fixtures'] if f['matchNumber'] == match_num), None)
            if local_match:
                status_raw = m['status']
                score_obj = m.get('score', {})
                full_time = score_obj.get('fullTime', {})
                
                home_score = full_time.get('home')
                away_score = full_time.get('away')
                
                if home_score is not None and away_score is not None:
                    # 确定状态
                    status = 'finished' if status_raw == 'FINISHED' else ('live' if status_raw in live_statuses else 'scheduled')
                    
                    local_match['homeScore'] = home_score
                    local_match['awayScore'] = away_score
                    local_match['status'] = status
                    
                    # 存入点球数据
                    penalties = score_obj.get('penalties', {})
                    if penalties and penalties.get('home') is not None:
                        local_match['homePenalties'] = penalties.get('home')
                        local_match['awayPenalties'] = penalties.get('away')
                    
                    updated_count += 1

    # 写回 fixtures.json
    try:
        with open(fixtures_path, 'w', encoding='utf-8') as f:
            json.dump(local_data, f, ensure_ascii=False, indent=2)
        print(f"✓ 成功更新 fixtures.json。共有 {updated_count} 场比赛被写入真实比分数据！")
    except Exception as e:
        print(f"❌ 写回 fixtures.json 失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
