#!/usr/bin/env python3
"""
Cross-check the G27 spelling-bee data against a real dictionary (build time only).

    python3 tools/spelling_bee_check.py            # all words, cached
    python3 tools/spelling_bee_check.py --refresh  # re-fetch

Source: Free Dictionary API (https://dictionaryapi.dev, no key, listed in
public-apis/public-apis), which serves Wiktionary data (CC BY-SA). Responses are
cached in ~/.cache/dunia-dict and NEVER copied into the repo: the game ships only
our own kid-written definitions and sentences plus the part of speech (a fact).
The API is slow (~20 s/request measured 2026-09-27), which is also why the game
itself never calls it -- G27 must work offline.

Checks, per word:
  - the dictionary knows the word;
  - our part of speech is one the dictionary lists for it;
  - (report) the dictionary's IPA, for the grown-up checking pronunciation.
Exit 1 on any mismatch.
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE = os.path.expanduser('~/.cache/dunia-dict')
API = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
# Fallback when dictionaryapi.dev's origin is down (HTTP 522 on 2026-09-27): the same
# Wiktionary data straight from Wikimedia's REST API (also on public-apis, no key).
WIKT = 'https://en.wiktionary.org/api/rest_v1/page/definition/'
UA = 'DuniaEmosi-build-check/1.0 (https://github.com/baguspermana7-cpu/Dunia-Emosi)'
# Proper nouns the general dictionary does not carry; checked by hand instead.
NOT_IN_DICT = {'kaaba': 'proper noun (the Kaaba, Makkah)', 'quran': 'proper noun (Quran / Koran)'}


def words():
    out = subprocess.run(['node', '-e', "global.window=global;const D=require('./games/data/spelling-data.js');"
                          "console.log(JSON.stringify(D.WORDS.map(w=>[w.w,w.pos])))"],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def entry(w, refresh):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, w + '.json')
    if os.path.exists(f) and not refresh:
        return json.load(open(f))
    for attempt in range(2):
        try:
            req = urllib.request.Request(API + w, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.load(r)
            json.dump(data, open(f, 'w'))
            return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                break
        except Exception:
            time.sleep(2)
    try:                                   # Wiktionary REST, reshaped to the same form
        req = urllib.request.Request(WIKT + w, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            wk = json.load(r)
        data = [{'word': w, 'source': 'wiktionary-rest',
                 'meanings': [{'partOfSpeech': m['partOfSpeech'].lower()} for m in wk.get('en', [])]}]
        if not data[0]['meanings']:
            data = []
        json.dump(data, open(f, 'w'))
        return data
    except urllib.error.HTTPError as e:
        if e.code == 404:
            json.dump([], open(f, 'w'))
            return []
    except Exception:
        pass
    return None


def main():
    refresh = '--refresh' in sys.argv
    bad = []
    for w, pos in words():
        d = entry(w, refresh)
        if w in NOT_IN_DICT:
            print(f'  --  {w:12} {pos:10} {NOT_IN_DICT[w]}')
            continue
        if d is None:
            bad.append(f'{w}: dictionary unreachable'); continue
        if not d:
            bad.append(f'{w}: not in the dictionary'); continue
        poses = sorted({m['partOfSpeech'] for e in d for m in e.get('meanings', [])})
        ipa = next((e.get('phonetic') for e in d if e.get('phonetic')), '') or \
            next((p.get('text') for e in d for p in e.get('phonetics', []) if p.get('text')), '')
        ok = pos in poses
        print(f"  {'OK' if ok else 'XX'}  {w:12} {pos:10} {ipa:16} dict: {', '.join(poses)}")
        if not ok:
            bad.append(f'{w}: our "{pos}" not in {poses}')
    print('\n' + ('\n'.join('FAIL ' + b for b in bad) if bad else 'ALL PASS'))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
