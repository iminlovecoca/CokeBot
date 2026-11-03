import sqlite3
import urllib.request
import re
import unicodedata
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

VIETNAMESE_REGEX = re.compile(r'^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]+$')

def normalize_word(raw):
    if not raw or not isinstance(raw, str):
        return None
    w = unicodedata.normalize('NFC', raw)
    w = re.sub(r'[\(\)\[\]\"\'\:\.\?\!\,\;]+', ' ', w)
    w = re.sub(r'[_\-]+', ' ', w)
    w = w.lower()
    w = re.sub(r'\s+', ' ', w).strip()
    if not w or len(w) < 2:
        return None
    if not VIETNAMESE_REGEX.match(w):
        return None
    syllables = w.split(' ')
    for s in syllables:
        if len(s) < 1 or len(s) > 7:
            return None
    return w

two_words = set()
all_words = set()

def add_word(raw):
    w = normalize_word(raw)
    if not w:
        return
    all_words.add(w)
    parts = w.split(' ')
    if len(parts) == 2:
        two_words.add(w)

print("Starting authentic Vietnamese dictionary build...")

# 1. Base local files
for filename in ['data/official-words.txt', 'data/words.txt', 'data/contribute-words.txt']:
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            for line in f:
                add_word(line.strip())
print(f"1. Base local: {len(two_words):,} two-words | {len(all_words):,} total")

# 2. Local dictionary.db
if os.path.exists('scripts/dictionary.db'):
    conn = sqlite3.connect('scripts/dictionary.db')
    c = conn.cursor()
    c.execute("SELECT word FROM words WHERE lang_code='vi'")
    for r in c.fetchall(): add_word(r[0])
    c.execute("SELECT r.related_word FROM word_relations r JOIN words w ON r.word_id = w.id WHERE w.lang_code = 'vi'")
    for r in c.fetchall(): add_word(r[0])
    c.execute("SELECT links FROM definitions WHERE definition_lang='vi' AND links IS NOT NULL AND length(links) > 2")
    for r in c.fetchall():
        try:
            for item in json.loads(r[0]): add_word(item)
        except: pass
    print(f"2. After dictionary.db: {len(two_words):,} two-words | {len(all_words):,} total")

# 3. Administrative units
try:
    url = 'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/simplified_json_generated_data_vn_units.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        for prov in data:
            if 'Name' in prov: add_word(prov['Name'])
            for w in prov.get('Wards', []):
                if 'Name' in w: add_word(w['Name'])
            for d in prov.get('Districts', []):
                if 'Name' in d: add_word(d['Name'])
                for w in d.get('Wards', []):
                    if 'Name' in w: add_word(w['Name'])
    print(f"3. After admin units: {len(two_words):,} two-words | {len(all_words):,} total")
except Exception as e:
    print(f"3. Admin units err: {e}")

# 4. Catusf tab dictionaries
catusf_urls = [
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietviet.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/star_vietnga.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Viet-Trung.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/star_viettbn.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Tong-hop-Phat-hoc.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Viet-Anh-Thien-Phuc.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-ThienChuu-TranVanChanh.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/TudienThienChuu.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-Quang.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Dao-Uyen.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Anh-Han-Viet.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Tinh-tuyen.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Viet-Anh-Dong-Loai.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Tu-dien-Phat-hoc-Viet-Anh-Minh-Thong.tab',
    'https://raw.githubusercontent.com/catusf/tudien/master/dict/Rong-mo-tam-hon.tab',
]

for u in catusf_urls:
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            for line in resp:
                line_str = line.decode('utf-8', errors='ignore')
                parts = line_str.split('\t')
                if parts:
                    for alias in parts[0].split(','):
                        add_word(alias.strip())
    except Exception as e:
        print(f"Err {u}: {e}")

print(f"4. After Catusf tab dicts: {len(two_words):,} two-words | {len(all_words):,} total")

# 5. Rime vn.dict.yaml
try:
    u = 'https://raw.githubusercontent.com/JaplinChen/rime-vietnamese-pinyin/master/vn.dict.yaml'
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        for line in resp:
            line_str = line.decode('utf-8', errors='ignore')
            if not line_str or line_str.startswith('#') or line_str.startswith('---') or line_str.startswith('...'):
                continue
            parts = line_str.split('\t')
            if parts: add_word(parts[0])
    print(f"5. After Rime vn.dict: {len(two_words):,} two-words | {len(all_words):,} total")
except Exception as e:
    print(f"5. Rime err: {e}")

# 6. CVDICT.u8
try:
    u = 'https://raw.githubusercontent.com/ph0ngp/CVDICT/main/CVDICT.u8'
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        for line in resp:
            line_str = line.decode('utf-8', errors='ignore')
            if not line_str.startswith('#') and '/' in line_str:
                parts = line_str.split('/')
                for def_part in parts[1:]:
                    for s in def_part.split(';'):
                        clean = re.sub(r'\(.*?\)', '', s).strip()
                        add_word(clean)
    print(f"6. After CVDICT: {len(two_words):,} two-words | {len(all_words):,} total")
except Exception as e:
    print(f"6. CVDICT err: {e}")

# 7. Kaikki with derived/compounds
try:
    u = 'https://kaikki.org/dictionary/Vietnamese/kaikki.org-dictionary-Vietnamese.jsonl'
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as resp:
        for line in resp:
            line_str = line.decode('utf-8', errors='ignore').strip()
            if not line_str: continue
            try:
                obj = json.loads(line_str)
                if 'word' in obj: add_word(obj['word'])
                def check_arr(arr):
                    if not isinstance(arr, list): return
                    for it in arr:
                        if isinstance(it, str): add_word(it)
                        elif isinstance(it, dict):
                            if 'word' in it: add_word(it['word'])
                            if 'roman' in it: add_word(it['roman'])
                check_arr(obj.get('derived'))
                check_arr(obj.get('related'))
                check_arr(obj.get('synonyms'))
                check_arr(obj.get('compounds'))
                check_arr(obj.get('hyponyms'))
            except: pass
    print(f"7. After Kaikki full: {len(two_words):,} two-words | {len(all_words):,} total")
except Exception as e:
    print(f"7. Kaikki err: {e}")

# Sorting function using Vietnamese collation order
# Simple locale-independent fallback
sorted_two_words = sorted(list(two_words))
sorted_all_words = sorted(list(all_words))

print(f"\nFinal Statistics:")
print(f"  • Total Words (all lengths): {len(sorted_all_words):,}")
print(f"  • Total 2-word terms (for Word Chain): {len(sorted_two_words):,}")

# Writing to files
print("\nWriting to project data files...")
with open('data/words.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sorted_all_words) + '\n')
print(f"✅ Updated data/words.txt ({len(sorted_all_words):,} lines)")

with open('data/official-words.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sorted_two_words) + '\n')
print(f"✅ Updated data/official-words.txt ({len(sorted_two_words):,} lines)")

with open('data/gwdata.json', 'w', encoding='utf-8') as f:
    json.dump(sorted_two_words, f, ensure_ascii=False, indent=2)
print(f"✅ Updated data/gwdata.json ({len(sorted_two_words):,} items)")
