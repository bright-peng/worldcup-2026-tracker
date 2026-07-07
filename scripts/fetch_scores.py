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

def is_placeholder(name):
    """判断队名是否仍然是占位符（如 'Group A winners'，'Winner Match 83'）"""
    return not name or 'winners' in name or 'runners-up' in name or 'third place' in name or 'Winner' in name or 'Loser' in name

def propagate_knockouts(local_data):
    """根据目前的比赛比分，演算并将淘汰赛的真实队名更新到 fixtures 中"""
    resolved_matches = calculate_standings_and_resolve_teams(local_data['fixtures'])
    propagation_count = 0
    for match in local_data['fixtures']:
        m_num = match['matchNumber']
        if m_num in resolved_matches:
            resolved_m = resolved_matches[m_num]
            if is_placeholder(match.get('homeTeam', '')) and not is_placeholder(resolved_m.get('homeTeam', '')):
                match['homeTeam'] = resolved_m['homeTeam']
                propagation_count += 1
                print(f"👉 [对阵传导] Match {m_num} 主队更新为: {resolved_m['homeTeam']}")
            if is_placeholder(match.get('awayTeam', '')) and not is_placeholder(resolved_m.get('awayTeam', '')):
                match['awayTeam'] = resolved_m['awayTeam']
                propagation_count += 1
                print(f"👉 [对阵传导] Match {m_num} 客队更新为: {resolved_m['awayTeam']}")
    
    if propagation_count > 0:
        print(f"✓ 对阵传导同步完成，共更新了 {propagation_count} 处队名占位符。")
    return propagation_count

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

THIRD_PLACE_COMBINATIONS = {
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
}

def calculate_standings_and_resolve_teams(fixtures):
    # 1. 初始化 A-L 组的积分表
    groups = ['A','B','C','D','E','F','G','H','I','J','K','L']
    standings = {g: {} for g in groups}
    
    def create_row(team):
        return {'team': team, 'pld': 0, 'w': 0, 'd': 0, 'l': 0, 'gf': 0, 'ga': 0, 'gd': 0, 'pts': 0}

    for f in fixtures:
        if f.get('stage') == 'group-stage':
            g = f['group']
            if f['homeTeam'] not in standings[g]:
                standings[g][f['homeTeam']] = create_row(f['homeTeam'])
            if f['awayTeam'] not in standings[g]:
                standings[g][f['awayTeam']] = create_row(f['awayTeam'])
                
    # 累加小组赛 (Match 1 到 72)
    for f in fixtures:
        if f.get('stage') != 'group-stage':
            continue
        if f.get('status') == 'finished' and f.get('homeScore') is not None and f.get('awayScore') is not None:
            g = f['group']
            h = standings[g][f['homeTeam']]
            a = standings[g][f['awayTeam']]
            h_score = int(f['homeScore'])
            a_score = int(f['awayScore'])
            
            h['pld'] += 1
            a['pld'] += 1
            h['gf'] += h_score
            h['ga'] += a_score
            a['gf'] += a_score
            a['ga'] += h_score
            
            if h_score > a_score:
                h['w'] += 1
                h['pts'] += 3
                a['l'] += 1
            elif h_score < a_score:
                a['w'] += 1
                a['pts'] += 3
                h['l'] += 1
            else:
                h['d'] += 1
                a['d'] += 1
                h['pts'] += 1
                a['pts'] += 1
            h['gd'] = h['gf'] - h['ga']
            a['gd'] = a['gf'] - a['ga']
            
    # 对小组进行排序
    sorted_standings = {}
    for g in groups:
        teams_list = list(standings[g].values())
        # Timsort 稳定排序：字典序 -> 总进球 -> 净胜球 -> 积分
        teams_list.sort(key=lambda x: x['team'])
        teams_list.sort(key=lambda x: x['gf'], reverse=True)
        teams_list.sort(key=lambda x: x['gd'], reverse=True)
        teams_list.sort(key=lambda x: x['pts'], reverse=True)
        
        sorted_standings[g] = teams_list
        for idx, row in enumerate(sorted_standings[g]):
            row['pos'] = idx + 1
            
    def is_group_finished(g_name):
        group_matches = [f for f in fixtures if f.get('stage') == 'group-stage' and f.get('group') == g_name]
        if not group_matches:
            return False
        return all(f.get('status') == 'finished' for f in group_matches)
        
    all_group_finished = all(f.get('status') == 'finished' for f in fixtures if f.get('stage') == 'group-stage')
    
    qualifiers = {
        'winners': {},
        'runnersUp': {},
        'thirdPlaces': []
    }
    
    all_third_places = []
    for g in groups:
        list_teams = sorted_standings[g]
        g_fin = is_group_finished(g)
        if g_fin and len(list_teams) >= 2:
            qualifiers['winners'][g] = list_teams[0]['team']
            qualifiers['runnersUp'][g] = list_teams[1]['team']
        else:
            qualifiers['winners'][g] = None
            qualifiers['runnersUp'][g] = None
            
        if all_group_finished and len(list_teams) >= 3:
            all_third_places.append({
                'group': g,
                'team': list_teams[2]['team'],
                'pts': list_teams[2]['pts'],
                'gd': list_teams[2]['gd'],
                'gf': list_teams[2]['gf']
            })
            
    if all_group_finished:
        all_third_places.sort(key=lambda x: x['group'])
        all_third_places.sort(key=lambda x: x['gf'], reverse=True)
        all_third_places.sort(key=lambda x: x['gd'], reverse=True)
        all_third_places.sort(key=lambda x: x['pts'], reverse=True)
        qualifiers['thirdPlaces'] = all_third_places[:8]
    else:
        qualifiers['thirdPlaces'] = []
        
    matches = {}
    for f in fixtures:
        matches[f['matchNumber']] = {
            'matchNumber': f['matchNumber'],
            'stage': f['stage'],
            'group': f.get('group'),
            'homeTeam': f['homeTeam'],
            'awayTeam': f['awayTeam'],
            'homeScore': f.get('homeScore'),
            'awayScore': f.get('awayScore'),
            'homePenalties': f.get('homePenalties'),
            'awayPenalties': f.get('awayPenalties'),
            'status': f.get('status', 'scheduled')
        }
        
    third_place_slots = [
        { 'matchNumber': 74, 'slot': 'awayTeam', 'options': ['A', 'B', 'C', 'D', 'F'] },
        { 'matchNumber': 77, 'slot': 'awayTeam', 'options': ['C', 'D', 'F', 'G', 'H'] },
        { 'matchNumber': 79, 'slot': 'awayTeam', 'options': ['C', 'E', 'F', 'H', 'I'] },
        { 'matchNumber': 80, 'slot': 'awayTeam', 'options': ['E', 'H', 'I', 'J', 'K'] },
        { 'matchNumber': 81, 'slot': 'awayTeam', 'options': ['B', 'E', 'F', 'I', 'J'] },
        { 'matchNumber': 82, 'slot': 'awayTeam', 'options': ['A', 'E', 'H', 'I', 'J'] },
        { 'matchNumber': 85, 'slot': 'awayTeam', 'options': ['E', 'F', 'G', 'I', 'J'] },
        { 'matchNumber': 87, 'slot': 'awayTeam', 'options': ['D', 'E', 'I', 'J', 'L'] }
    ]
    
    def resolve_group_placeholder(placeholder, third_places_assigned):
        if 'winners' in placeholder:
            g = placeholder.replace('Group ', '').replace(' winners', '').strip()
            return qualifiers['winners'].get(g) or placeholder
        if 'runners-up' in placeholder:
            g = placeholder.replace('Group ', '').replace(' runners-up', '').strip()
            return qualifiers['runnersUp'].get(g) or placeholder
        if 'third place' in placeholder:
            if not qualifiers['thirdPlaces']:
                return placeholder
            
            match_conf = None
            for c in third_place_slots:
                if '/'.join(c['options']) in placeholder:
                    match_conf = c
                    break
            
            if match_conf:
                for t in qualifiers['thirdPlaces']:
                    if t['group'] in match_conf['options'] and t['team'] not in third_places_assigned:
                        third_places_assigned.add(t['team'])
                        return t['team']
            
            option_groups = placeholder.replace('Group ', '').replace(' third place', '').split('/')
            for t in qualifiers['thirdPlaces']:
                if t['group'] in option_groups and t['team'] not in third_places_assigned:
                    third_places_assigned.add(t['team'])
                    return t['team']
        return placeholder

        # 获取出线的小组第三组合
    qualified_groups = "".join(sorted([t['group'] for t in qualifiers['thirdPlaces']]))
    mapping_str = THIRD_PLACE_COMBINATIONS.get(qualified_groups)
    annex_c_map = None
    if mapping_str and len(mapping_str) == 8:
        annex_c_map = {
            74: mapping_str[0],
            77: mapping_str[1],
            79: mapping_str[2],
            80: mapping_str[3],
            81: mapping_str[4],
            82: mapping_str[5],
            85: mapping_str[6],
            87: mapping_str[7]
        }

    third_places_assigned = set()
    for i in range(73, 89):
        m = matches[i]
        if annex_c_map and i in annex_c_map:
            target_group = annex_c_map[i]
            target_team = next((t['team'] for t in qualifiers['thirdPlaces'] if t['group'] == target_group), None)
            if target_team:
                if 'third place' in m['homeTeam']:
                    m['homeTeam'] = target_team
                if 'third place' in m['awayTeam']:
                    m['awayTeam'] = target_team
                continue
                
        m['homeTeam'] = resolve_group_placeholder(m['homeTeam'], third_places_assigned)
        m['awayTeam'] = resolve_group_placeholder(m['awayTeam'], third_places_assigned)
        
    def get_winner(match):
        if match['homeScore'] is None or match['awayScore'] is None:
            return None
        h_s = int(match['homeScore'])
        a_s = int(match['awayScore'])
        if h_s > a_s:
            return match['homeTeam']
        if h_s < a_s:
            return match['awayTeam']
        if match['homePenalties'] is not None and match['awayPenalties'] is not None:
            h_p = int(match['homePenalties'])
            a_p = int(match['awayPenalties'])
            if h_p > a_p:
                return match['homeTeam']
            if h_p < a_p:
                return match['awayTeam']
        return match['homeTeam']
        
    def get_loser(match):
        if match['homeScore'] is None or match['awayScore'] is None:
            return None
        h_s = int(match['homeScore'])
        a_s = int(match['awayScore'])
        if h_s < a_s:
            return match['homeTeam']
        if h_s > a_s:
            return match['awayTeam']
        if match['homePenalties'] is not None and match['awayPenalties'] is not None:
            h_p = int(match['homePenalties'])
            a_p = int(match['awayPenalties'])
            if h_p < a_p:
                return match['homeTeam']
            if h_p > a_p:
                return match['awayTeam']
        return match['awayTeam']

    def resolve_knockout_placeholder(placeholder):
        if placeholder.startswith('Winner Match'):
            target_num = int(placeholder.replace('Winner Match ', '').strip())
            prev_match = matches[target_num]
            if prev_match['status'] == 'finished':
                return get_winner(prev_match) or placeholder
        if placeholder.startswith('Loser Match'):
            target_num = int(placeholder.replace('Loser Match ', '').strip())
            prev_match = matches[target_num]
            if prev_match['status'] == 'finished':
                return get_loser(prev_match) or placeholder
        return placeholder

    for i in range(89, 105):
        m = matches[i]
        m['homeTeam'] = resolve_knockout_placeholder(m['homeTeam'])
        m['awayTeam'] = resolve_knockout_placeholder(m['awayTeam'])
        
    return matches

def main():
    token = os.environ.get('FOOTBALL_DATA_API_TOKEN')
    rapid_key = os.environ.get('RAPID_API_KEY')
    
    print("🏆 启动多源比分比对与增量滑动窗口更新引擎...")
    
    # --------------------------------------------------------------------------
    # 载入本地赛程文件（方案 B 提取前置判断）
    # --------------------------------------------------------------------------
    fixtures_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'fixtures.json')
    try:
        with open(fixtures_path, 'r', encoding='utf-8') as f:
            local_data = json.load(f)
    except Exception as e:
        print(f"❌ 读取 fixtures.json 失败: {e}")
        sys.exit(1)

    # --------------------------------------------------------------------------
    # 队名传导同步 (第一遍)：如果内存中已算出淘汰赛的真实队伍，无条件写入 fixtures.json 中
    # --------------------------------------------------------------------------
    propagate_knockouts(local_data)

    # 动态在内存中演算晋级对阵以解析淘汰赛的待定占位符（如 Group A runners-up）
    resolved_matches = calculate_standings_and_resolve_teams(local_data['fixtures'])

    now_utc = datetime.now(timezone.utc)
    print(f"⏰ 当前 UTC 时间: {now_utc.strftime('%Y-%m-%d %H:%M:%S')}")

    # --------------------------------------------------------------------------
    # 方案 B：看门狗逻辑 (判断当前是否真的有比赛在进行或临近)
    # --------------------------------------------------------------------------
    has_active_match = False
    for match in local_data['fixtures']:
        # 如果本场已经结束，不用为此开启活跃状态
        if match.get('status') == 'finished':
            continue
            
        kickoff_utc_str = match['kickoffUtc']
        try:
            kickoff_dt = datetime.strptime(kickoff_utc_str, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        except Exception:
            try:
                kickoff_dt = datetime.strptime(kickoff_utc_str, "%Y-%m-%dT%H:%M:%S%z")
            except Exception:
                continue

        # 活跃刷新条件：只要比赛到了开球前 15 分钟（并且本地状态还不是 finished，在前置判断里已过滤），说明仍需抓取其比分以更新为 finished
        # 这样即使 GitHub Actions 发生偶发延迟导致比赛结束后数小时才运行，看门狗依然会放行抓取，完美解决数据同步滞后的问题
        if now_utc >= kickoff_dt - timedelta(minutes=15):
            has_active_match = True
            resolved_match = resolved_matches[match['matchNumber']]
            print(f"📡 监测到开球未完场比赛: Match {match['matchNumber']} ({resolved_match['homeTeam']} vs {resolved_match['awayTeam']})")
            break

    # 如果检测到没有处于正在踢或临近开球的比赛，关闭收费/限流数据源的调用，只使用免 Key 数据源
    if not has_active_match and os.environ.get('FORCE_SYNC') != '1':
        print("⏰ [方案 B 保护中] 当前无正在进行中或临近开球的比赛，自动跳过受限/收费数据源 (Football-Data & API-Football) 以节省额度。")
        token = None
        rapid_key = None

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
    # 数据源 3: GitHub OpenFootball JSON (免 Key 方案 A 兜底)
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
    # 增量滑动窗口抓取控制与多源投票决策
    # --------------------------------------------------------------------------
    updated_count = 0
    # 遍历本地所有赛程，进行增量窗口判定
    for match in local_data['fixtures']:
            
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
        # 优先使用 fixtures.json 中已写入的真实队名（由后端之前写入），
        # 仅当队名仍是占位符时才走 resolved_matches 推算
        
        if not is_placeholder(match.get('homeTeam', '')) and not is_placeholder(match.get('awayTeam', '')):
            local_h = normalize_team_name(match['homeTeam'])
            local_a = normalize_team_name(match['awayTeam'])
        else:
            resolved_match = resolved_matches[m_num]
            local_h = normalize_team_name(resolved_match['homeTeam'])
            local_a = normalize_team_name(resolved_match['awayTeam'])
        
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
            print(f"⚠️ Match {m_num} ({resolved_match['homeTeam']} vs {resolved_match['awayTeam']}) 多源数据存在冲突 {score_tuples}。启用优先级决策。")
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
        # 🛡️ 比分回退保护：比赛进行中，进球数只增不减
        old_h = match.get('homeScore')
        old_a = match.get('awayScore')
        old_status = match.get('status', 'scheduled')
        if old_h is not None and old_a is not None:
            old_total = int(old_h) + int(old_a)
            new_total = int(consensus_home) + int(consensus_away)
            if old_status == 'finished' and consensus_status != 'finished':
                print(f"🛡️ [回退保护] Match {m_num}: 本地已 finished，忽略非 finished 的数据")
                continue
            if consensus_status != 'finished' and new_total < old_total:
                print(f"🛡️ [回退保护] Match {m_num}: 总进球从 {old_total} 回退到 {new_total}，跳过脏数据")
                continue

        # 更新写入比分
        match['homeScore'] = consensus_home
        match['awayScore'] = consensus_away
        match['status'] = consensus_status
        if consensus_h_pen is not None:
            match['homePenalties'] = consensus_h_pen
            match['awayPenalties'] = consensus_a_pen
        else:
            match.pop('homePenalties', None)
            match.pop('awayPenalties', None)

        # 直接将 API 返回的真实队名写入 fixtures.json，彻底取代占位符
        # 这样前端不需要任何推算逻辑，直接显示即可
        match['homeTeam'] = local_h
        match['awayTeam'] = local_a

        print(f"⚡ [窗口更新] Match {m_num} ({local_h} vs {local_a}): 真实比分更新为 {consensus_home}:{consensus_away}，状态: {consensus_status} (多源投票: {count}/{len(score_tuples)}票)")
        updated_count += 1

    # --------------------------------------------------------------------------
    # 队名传导同步 (第二遍)：在比分抓取写入完成后，再次触发传导
    # 这样刚刚产生的淘汰赛胜者（如西班牙、比利时）能直接填入下一轮的对阵（如 Match 98 1/4 决赛）中并固化
    # --------------------------------------------------------------------------
    if updated_count > 0:
        print("⚡ [增量比分变动] 触发第二遍对阵传导同步...")
        propagate_knockouts(local_data)

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
