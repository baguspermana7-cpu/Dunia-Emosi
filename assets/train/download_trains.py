#!/usr/bin/env python3
"""
Train icon downloader + database builder for Dunia Emosi app.
Downloads train illustrations from Wikimedia Commons, OpenClipArt, and creates SVG placeholders.
"""

import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import re

TRAIN_DIR = os.path.dirname(os.path.abspath(__file__))

TRAINS = [
    # ── STEAM ERA ────────────────────────────────────────────────────────────
    {"id": "stephensons-rocket",    "name": "Stephenson's Rocket",         "country": "United Kingdom", "year": 1829, "type": "steam",   "era": "Early Steam",    "speed_kph": 47},
    {"id": "blenkinsop-rack",       "name": "Blenkinsop Rack Locomotive",  "country": "United Kingdom", "year": 1812, "type": "steam",   "era": "Early Steam",    "speed_kph": 10},
    {"id": "locomotion-no1",        "name": "Locomotion No. 1",            "country": "United Kingdom", "year": 1825, "type": "steam",   "era": "Early Steam",    "speed_kph": 24},
    {"id": "catch-me-who-can",      "name": "Catch Me Who Can",            "country": "United Kingdom", "year": 1808, "type": "steam",   "era": "Early Steam",    "speed_kph": 30},
    {"id": "planet-class",          "name": "Planet Class Locomotive",     "country": "United Kingdom", "year": 1830, "type": "steam",   "era": "Early Steam",    "speed_kph": 56},
    {"id": "stourbridge-lion",      "name": "Stourbridge Lion",            "country": "United States",  "year": 1829, "type": "steam",   "era": "Early Steam",    "speed_kph": 16},
    {"id": "tom-thumb",             "name": "Tom Thumb",                   "country": "United States",  "year": 1830, "type": "steam",   "era": "Early Steam",    "speed_kph": 29},
    {"id": "dewitt-clinton",        "name": "DeWitt Clinton",              "country": "United States",  "year": 1831, "type": "steam",   "era": "Early Steam",    "speed_kph": 24},
    {"id": "best-friend-charleston","name": "Best Friend of Charleston",   "country": "United States",  "year": 1830, "type": "steam",   "era": "Early Steam",    "speed_kph": 35},
    {"id": "american-4-4-0",        "name": "American Standard 4-4-0",    "country": "United States",  "year": 1845, "type": "steam",   "era": "Classic Steam",  "speed_kph": 100},
    {"id": "mogul-2-6-0",           "name": "Mogul 2-6-0",                "country": "United States",  "year": 1860, "type": "steam",   "era": "Classic Steam",  "speed_kph": 90},
    {"id": "consolidation-2-8-0",   "name": "Consolidation 2-8-0",        "country": "United States",  "year": 1866, "type": "steam",   "era": "Classic Steam",  "speed_kph": 80},
    {"id": "ten-wheeler-4-6-0",     "name": "Ten-Wheeler 4-6-0",          "country": "United States",  "year": 1870, "type": "steam",   "era": "Classic Steam",  "speed_kph": 110},
    {"id": "mikado-2-8-2",          "name": "Mikado 2-8-2",               "country": "United States",  "year": 1897, "type": "steam",   "era": "Classic Steam",  "speed_kph": 100},
    {"id": "atlantic-4-4-2",        "name": "Atlantic 4-4-2",             "country": "United States",  "year": 1900, "type": "steam",   "era": "Classic Steam",  "speed_kph": 140},
    {"id": "hudson-4-6-4",          "name": "Hudson 4-6-4",               "country": "United States",  "year": 1927, "type": "steam",   "era": "Golden Steam",   "speed_kph": 160},
    {"id": "berkshire-2-8-4",       "name": "Berkshire 2-8-4",            "country": "United States",  "year": 1925, "type": "steam",   "era": "Golden Steam",   "speed_kph": 120},
    {"id": "texas-2-10-4",          "name": "Texas 2-10-4",               "country": "United States",  "year": 1925, "type": "steam",   "era": "Golden Steam",   "speed_kph": 110},
    {"id": "big-boy-4-8-8-4",       "name": "Big Boy 4-8-8-4",            "country": "United States",  "year": 1941, "type": "steam",   "era": "Golden Steam",   "speed_kph": 130},
    {"id": "challenger-4-6-6-4",    "name": "Challenger 4-6-6-4",         "country": "United States",  "year": 1936, "type": "steam",   "era": "Golden Steam",   "speed_kph": 120},
    {"id": "hiawatha-class-a",      "name": "Hiawatha Class A (4-4-2)",   "country": "United States",  "year": 1935, "type": "steam",   "era": "Golden Steam",   "speed_kph": 180},
    {"id": "prr-k4s-pacific",       "name": "PRR K4s Pacific",            "country": "United States",  "year": 1914, "type": "steam",   "era": "Classic Steam",  "speed_kph": 145},
    {"id": "flying-scotsman-a1",    "name": "Flying Scotsman (LNER A1)",  "country": "United Kingdom", "year": 1923, "type": "steam",   "era": "Golden Steam",   "speed_kph": 160},
    {"id": "mallard-a4",            "name": "Mallard (LNER A4)",          "country": "United Kingdom", "year": 1938, "type": "steam",   "era": "Golden Steam",   "speed_kph": 203},
    {"id": "gresley-a3-pacific",    "name": "Gresley A3 Pacific",         "country": "United Kingdom", "year": 1928, "type": "steam",   "era": "Golden Steam",   "speed_kph": 173},
    {"id": "castle-class-gwr",      "name": "Castle Class GWR 4-6-0",    "country": "United Kingdom", "year": 1923, "type": "steam",   "era": "Classic Steam",  "speed_kph": 150},
    {"id": "king-class-gwr",        "name": "King Class GWR",             "country": "United Kingdom", "year": 1927, "type": "steam",   "era": "Golden Steam",   "speed_kph": 165},
    {"id": "duchess-class-lms",     "name": "Duchess Class LMS",          "country": "United Kingdom", "year": 1937, "type": "steam",   "era": "Golden Steam",   "speed_kph": 183},
    {"id": "britannia-class-br",    "name": "Britannia Class BR",         "country": "United Kingdom", "year": 1951, "type": "steam",   "era": "Late Steam",     "speed_kph": 145},
    {"id": "drg-class-05",          "name": "DRG Class 05 Streamliner",   "country": "Germany",        "year": 1935, "type": "steam",   "era": "Golden Steam",   "speed_kph": 200},
    {"id": "drb-class-52",          "name": "DRB Class 52 Kriegslokomotive","country":"Germany",        "year": 1941, "type": "steam",   "era": "Golden Steam",   "speed_kph": 80},
    {"id": "jnr-d51",               "name": "JNR Class D51 Mikado",       "country": "Japan",          "year": 1936, "type": "steam",   "era": "Classic Steam",  "speed_kph": 85},
    {"id": "jnr-c62",               "name": "JNR Class C62 Hudson",       "country": "Japan",          "year": 1949, "type": "steam",   "era": "Late Steam",     "speed_kph": 129},
    {"id": "sncf-super-pacific",    "name": "SNCF 231 Super Pacific",     "country": "France",         "year": 1923, "type": "steam",   "era": "Classic Steam",  "speed_kph": 130},
    {"id": "chapelon-242-a1",       "name": "Chapelon 242 A.1",           "country": "France",         "year": 1942, "type": "steam",   "era": "Late Steam",     "speed_kph": 150},
    {"id": "cpr-royal-hudson",      "name": "CPR Royal Hudson 4-6-4",     "country": "Canada",         "year": 1937, "type": "steam",   "era": "Golden Steam",   "speed_kph": 130},
    {"id": "sar-class-25",          "name": "SAR Class 25 Condensing",    "country": "South Africa",   "year": 1953, "type": "steam",   "era": "Late Steam",     "speed_kph": 100},
    {"id": "australian-3801",       "name": "NSWGR 3801 Pacific",         "country": "Australia",      "year": 1943, "type": "steam",   "era": "Classic Steam",  "speed_kph": 130},
    {"id": "wap-class-india-steam", "name": "Indian WP Class Pacific",    "country": "India",          "year": 1947, "type": "steam",   "era": "Late Steam",     "speed_kph": 110},
    {"id": "garratt-lms",           "name": "Garratt Articulated (LMS)",  "country": "United Kingdom", "year": 1927, "type": "steam",   "era": "Classic Steam",  "speed_kph": 100},
    {"id": "ffestiniog-narrow",     "name": "Ffestiniog Narrow Gauge",    "country": "United Kingdom", "year": 1863, "type": "steam",   "era": "Early Steam",    "speed_kph": 30},

    # ── DIESEL ERA ───────────────────────────────────────────────────────────
    {"id": "flying-hamburger",      "name": "Flying Hamburger SVT 877",   "country": "Germany",        "year": 1932, "type": "diesel",  "era": "Early Diesel",   "speed_kph": 160},
    {"id": "emd-e-unit",            "name": "EMD E-Unit Streamliner",     "country": "United States",  "year": 1937, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 160},
    {"id": "emd-f-unit",            "name": "EMD F-Unit",                 "country": "United States",  "year": 1939, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 145},
    {"id": "emd-gp7",               "name": "EMD GP7",                    "country": "United States",  "year": 1949, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 130},
    {"id": "emd-sd40",              "name": "EMD SD40",                   "country": "United States",  "year": 1966, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "emd-sd70m",             "name": "EMD SD70M",                  "country": "United States",  "year": 1992, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "emd-sd90mac",           "name": "EMD SD90MAC",                "country": "United States",  "year": 1995, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "ge-dash-9",             "name": "GE Dash 9-44CW",             "country": "United States",  "year": 1993, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "ge-es44ac",             "name": "GE ES44AC (Evolution)",      "country": "United States",  "year": 2004, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "ge-tier4-et44",         "name": "GE Tier 4 ET44 (GEVO)",      "country": "United States",  "year": 2015, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "waratah-nsr",           "name": "Waratah NSW Diesel",         "country": "Australia",      "year": 1960, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 130},
    {"id": "dongfeng-4",            "name": "Dongfeng 4 (DF4)",           "country": "China",          "year": 1968, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 100},
    {"id": "df11-china",            "name": "Dongfeng 11 (DF11)",         "country": "China",          "year": 1992, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 170},
    {"id": "class-66-emd",          "name": "Class 66 (EMD JT42CWR)",     "country": "United Kingdom", "year": 1998, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "class-67-uk",           "name": "Class 67 UK",                "country": "United Kingdom", "year": 1999, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 200},
    {"id": "vossloh-euro-4000",     "name": "Vossloh Euro 4000",          "country": "Germany",        "year": 2004, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 140},
    {"id": "cc201-indonesia",       "name": "CC201 Indonesia",            "country": "Indonesia",      "year": 1976, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 120},
    {"id": "cc203-indonesia",       "name": "CC203 Indonesia",            "country": "Indonesia",      "year": 1995, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 120},
    {"id": "bb301-indonesia",       "name": "BB301 Indonesia",            "country": "Indonesia",      "year": 1977, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 100},
    {"id": "bb302-indonesia",       "name": "BB302 Indonesia",            "country": "Indonesia",      "year": 1980, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 100},
    {"id": "bb303-indonesia",       "name": "BB303 Indonesia",            "country": "Indonesia",      "year": 1986, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 110},
    {"id": "cc300-indonesia",       "name": "CC300 Indonesia (Electric)", "country": "Indonesia",      "year": 2018, "type": "electric","era": "Modern Electric","speed_kph": 160},

    # ── ELECTRIC ─────────────────────────────────────────────────────────────
    {"id": "prr-gg1",               "name": "PRR GG1 Electric",           "country": "United States",  "year": 1934, "type": "electric","era": "Classic Electric","speed_kph": 160},
    {"id": "sbb-crocodile",         "name": "SBB Ce 6/8 Crocodile",       "country": "Switzerland",    "year": 1919, "type": "electric","era": "Classic Electric","speed_kph": 75},
    {"id": "sbb-re-4-4",            "name": "SBB Re 4/4 II",              "country": "Switzerland",    "year": 1964, "type": "electric","era": "Modern Electric","speed_kph": 140},
    {"id": "sncf-bb-9004",          "name": "SNCF BB 9004",               "country": "France",         "year": 1957, "type": "electric","era": "Classic Electric","speed_kph": 331},
    {"id": "db-br-110",             "name": "DB BR 110",                  "country": "Germany",        "year": 1956, "type": "electric","era": "Classic Electric","speed_kph": 150},
    {"id": "db-br-140",             "name": "DB BR 140",                  "country": "Germany",        "year": 1957, "type": "electric","era": "Classic Electric","speed_kph": 100},
    {"id": "db-br-101",             "name": "DB BR 101",                  "country": "Germany",        "year": 1996, "type": "electric","era": "Modern Electric","speed_kph": 220},
    {"id": "db-br-185-traxx",       "name": "DB BR 185 TRAXX",            "country": "Germany",        "year": 2000, "type": "electric","era": "Modern Electric","speed_kph": 140},
    {"id": "bombardier-traxx",      "name": "Bombardier TRAXX",           "country": "Multi-country",  "year": 1998, "type": "electric","era": "Modern Electric","speed_kph": 200},
    {"id": "alstom-prima-ii",       "name": "Alstom Prima II",            "country": "Multi-country",  "year": 2004, "type": "electric","era": "Modern Electric","speed_kph": 200},
    {"id": "siemens-vectron",       "name": "Siemens Vectron",            "country": "Germany",        "year": 2012, "type": "electric","era": "Modern Electric","speed_kph": 200},
    {"id": "obb-1116-taurus",       "name": "ÖBB 1116 Taurus",           "country": "Austria",        "year": 1999, "type": "electric","era": "Modern Electric","speed_kph": 230},
    {"id": "fs-e444",               "name": "FS E.444 Tartaruga",         "country": "Italy",          "year": 1967, "type": "electric","era": "Classic Electric","speed_kph": 200},
    {"id": "fs-etr-500",            "name": "FS ETR.500 Frecciarossa",    "country": "Italy",          "year": 1997, "type": "electric","era": "Modern Electric","speed_kph": 360},
    {"id": "szd-vl80",              "name": "SZD VL80 (Russia)",          "country": "Russia",         "year": 1961, "type": "electric","era": "Classic Electric","speed_kph": 110},
    {"id": "wap-7-india",           "name": "WAP-7 (India)",              "country": "India",          "year": 1999, "type": "electric","era": "Modern Electric","speed_kph": 140},
    {"id": "stadler-flirt",         "name": "Stadler FLIRT",              "country": "Multi-country",  "year": 2004, "type": "electric","era": "Modern Electric","speed_kph": 200},
    {"id": "siemens-desiro",        "name": "Siemens Desiro",             "country": "Multi-country",  "year": 2002, "type": "electric","era": "Modern Electric","speed_kph": 160},
    {"id": "alstom-coradia",        "name": "Alstom Coradia",             "country": "Multi-country",  "year": 2000, "type": "electric","era": "Modern Electric","speed_kph": 200},
    {"id": "sj-x2-sweden",          "name": "SJ X2 (Sweden)",             "country": "Sweden",         "year": 1990, "type": "electric","era": "Modern Electric","speed_kph": 210},
    {"id": "ns-intercity-direct",   "name": "NS Intercity Direct",        "country": "Netherlands",    "year": 2012, "type": "electric","era": "Modern Electric","speed_kph": 250},

    # ── HIGH-SPEED ───────────────────────────────────────────────────────────
    {"id": "shinkansen-0",          "name": "Shinkansen 0 Series",        "country": "Japan",          "year": 1964, "type": "electric","era": "High Speed",     "speed_kph": 220},
    {"id": "shinkansen-100",        "name": "Shinkansen 100 Series",      "country": "Japan",          "year": 1985, "type": "electric","era": "High Speed",     "speed_kph": 230},
    {"id": "shinkansen-300",        "name": "Shinkansen 300 Series",      "country": "Japan",          "year": 1992, "type": "electric","era": "High Speed",     "speed_kph": 270},
    {"id": "shinkansen-500",        "name": "Shinkansen 500 Series",      "country": "Japan",          "year": 1997, "type": "electric","era": "High Speed",     "speed_kph": 320},
    {"id": "shinkansen-700",        "name": "Shinkansen 700 Series",      "country": "Japan",          "year": 1999, "type": "electric","era": "High Speed",     "speed_kph": 285},
    {"id": "shinkansen-n700",       "name": "Shinkansen N700 Series",     "country": "Japan",          "year": 2007, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "shinkansen-n700s",      "name": "Shinkansen N700S",           "country": "Japan",          "year": 2020, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "shinkansen-e5",         "name": "Shinkansen E5 Hayabusa",     "country": "Japan",          "year": 2011, "type": "electric","era": "High Speed",     "speed_kph": 320},
    {"id": "shinkansen-e7",         "name": "Shinkansen E7/W7",           "country": "Japan",          "year": 2014, "type": "electric","era": "High Speed",     "speed_kph": 275},
    {"id": "shinkansen-e6",         "name": "Shinkansen E6 Komachi",      "country": "Japan",          "year": 2013, "type": "electric","era": "High Speed",     "speed_kph": 320},
    {"id": "shinkansen-l0",         "name": "SCMaglev L0 Series",         "country": "Japan",          "year": 2027, "type": "maglev",  "era": "Maglev",         "speed_kph": 603},
    {"id": "tgv-sud-est",           "name": "TGV Sud-Est",                "country": "France",         "year": 1981, "type": "electric","era": "High Speed",     "speed_kph": 270},
    {"id": "tgv-atlantique",        "name": "TGV Atlantique",             "country": "France",         "year": 1989, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "tgv-duplex",            "name": "TGV Duplex",                 "country": "France",         "year": 1995, "type": "electric","era": "High Speed",     "speed_kph": 320},
    {"id": "tgv-euroduplex",        "name": "TGV Euroduplex",             "country": "France",         "year": 2011, "type": "electric","era": "High Speed",     "speed_kph": 320},
    {"id": "tgv-inoui",             "name": "TGV InOui (Avelia Horizon)", "country": "France",         "year": 2024, "type": "electric","era": "High Speed",     "speed_kph": 350},
    {"id": "ice-1",                 "name": "ICE 1",                      "country": "Germany",        "year": 1991, "type": "electric","era": "High Speed",     "speed_kph": 280},
    {"id": "ice-2",                 "name": "ICE 2",                      "country": "Germany",        "year": 1997, "type": "electric","era": "High Speed",     "speed_kph": 280},
    {"id": "ice-3",                 "name": "ICE 3",                      "country": "Germany",        "year": 2000, "type": "electric","era": "High Speed",     "speed_kph": 330},
    {"id": "ice-4",                 "name": "ICE 4",                      "country": "Germany",        "year": 2017, "type": "electric","era": "High Speed",     "speed_kph": 250},
    {"id": "eurostar-e300",         "name": "Eurostar e300",              "country": "UK/Europe",      "year": 1994, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "eurostar-e320",         "name": "Eurostar e320 (Velaro)",     "country": "UK/Europe",      "year": 2015, "type": "electric","era": "High Speed",     "speed_kph": 320},
    {"id": "renfe-ave-100",         "name": "Renfe AVE Class 100",        "country": "Spain",          "year": 1992, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "ave-103-velaro-e",      "name": "AVE Class 103 (Velaro E)",   "country": "Spain",          "year": 2006, "type": "electric","era": "High Speed",     "speed_kph": 350},
    {"id": "ktx-i",                 "name": "KTX-I",                      "country": "South Korea",    "year": 2004, "type": "electric","era": "High Speed",     "speed_kph": 305},
    {"id": "ktx-sancheon",          "name": "KTX-Sancheon",               "country": "South Korea",    "year": 2010, "type": "electric","era": "High Speed",     "speed_kph": 330},
    {"id": "ktx-eum",               "name": "KTX-Eum EMU-250",           "country": "South Korea",    "year": 2021, "type": "electric","era": "High Speed",     "speed_kph": 260},
    {"id": "fuxing-cr400",          "name": "CR400 Fuxing (China)",       "country": "China",          "year": 2017, "type": "electric","era": "High Speed",     "speed_kph": 350},
    {"id": "crh2-china",            "name": "CRH2 (China)",               "country": "China",          "year": 2007, "type": "electric","era": "High Speed",     "speed_kph": 250},
    {"id": "crh380a",               "name": "CRH380A (China)",            "country": "China",          "year": 2010, "type": "electric","era": "High Speed",     "speed_kph": 380},
    {"id": "trenitalia-italo",      "name": "NTV Italo (Italy)",          "country": "Italy",          "year": 2012, "type": "electric","era": "High Speed",     "speed_kph": 360},
    {"id": "afrosiyob-uzbekistan",  "name": "Afrosiyob (Uzbekistan)",     "country": "Uzbekistan",     "year": 2011, "type": "electric","era": "High Speed",     "speed_kph": 250},
    {"id": "haramain-express",      "name": "Haramain Express (Saudi)",   "country": "Saudi Arabia",   "year": 2018, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "hsr-taiwan",            "name": "Taiwan High Speed Rail",     "country": "Taiwan",         "year": 2007, "type": "electric","era": "High Speed",     "speed_kph": 300},
    {"id": "acela-amtrak",          "name": "Acela Express (Amtrak)",     "country": "United States",  "year": 2000, "type": "electric","era": "High Speed",     "speed_kph": 240},

    # ── MAGLEV ───────────────────────────────────────────────────────────────
    {"id": "shanghai-maglev",       "name": "Shanghai Maglev (Transrapid)","country":"China",          "year": 2002, "type": "maglev",  "era": "Maglev",         "speed_kph": 431},
    {"id": "transrapid-07",         "name": "Transrapid 07",              "country": "Germany",        "year": 1989, "type": "maglev",  "era": "Maglev",         "speed_kph": 450},
    {"id": "linimo-aichi",          "name": "Linimo HSST (Japan)",        "country": "Japan",          "year": 2005, "type": "maglev",  "era": "Maglev",         "speed_kph": 100},
    {"id": "hyperloop-concept",     "name": "Hyperloop Concept",          "country": "International",  "year": 2030, "type": "maglev",  "era": "Future",         "speed_kph": 1200},

    # ── METRO / URBAN ─────────────────────────────────────────────────────────
    {"id": "london-underground",    "name": "London Underground (Tube)",  "country": "United Kingdom", "year": 1863, "type": "electric","era": "Metro",          "speed_kph": 80},
    {"id": "paris-metro",           "name": "Paris Métro",                "country": "France",         "year": 1900, "type": "electric","era": "Metro",          "speed_kph": 90},
    {"id": "new-york-subway",       "name": "New York Subway",            "country": "United States",  "year": 1904, "type": "electric","era": "Metro",          "speed_kph": 80},
    {"id": "moscow-metro",          "name": "Moscow Metro",               "country": "Russia",         "year": 1935, "type": "electric","era": "Metro",          "speed_kph": 90},
    {"id": "tokyo-metro",           "name": "Tokyo Metro",                "country": "Japan",          "year": 1927, "type": "electric","era": "Metro",          "speed_kph": 100},
    {"id": "mrt-jakarta",           "name": "MRT Jakarta",                "country": "Indonesia",      "year": 2019, "type": "electric","era": "Metro",          "speed_kph": 80},
    {"id": "lrt-jakarta",           "name": "LRT Jakarta",                "country": "Indonesia",      "year": 2019, "type": "electric","era": "Metro",          "speed_kph": 90},
    {"id": "commuter-line-krl",     "name": "KRL Commuter Line",          "country": "Indonesia",      "year": 2011, "type": "electric","era": "Metro",          "speed_kph": 90},
    {"id": "mrt-singapore",         "name": "MRT Singapore",              "country": "Singapore",      "year": 1987, "type": "electric","era": "Metro",          "speed_kph": 90},
    {"id": "mrt-kuala-lumpur",      "name": "MRT Kuala Lumpur",           "country": "Malaysia",       "year": 2016, "type": "electric","era": "Metro",          "speed_kph": 100},
    {"id": "bts-bangkok",           "name": "BTS Skytrain Bangkok",       "country": "Thailand",       "year": 1999, "type": "electric","era": "Metro",          "speed_kph": 80},
    {"id": "delhi-metro",           "name": "Delhi Metro",                "country": "India",          "year": 2002, "type": "electric","era": "Metro",          "speed_kph": 80},
    {"id": "dubai-metro",           "name": "Dubai Metro",                "country": "UAE",            "year": 2009, "type": "electric","era": "Metro",          "speed_kph": 100},

    # ── HISTORIC / SPECIAL ────────────────────────────────────────────────────
    {"id": "orient-express",        "name": "Orient Express",             "country": "Europe",         "year": 1883, "type": "steam",   "era": "Classic Steam",  "speed_kph": 80},
    {"id": "trans-siberian",        "name": "Trans-Siberian Railway",     "country": "Russia",         "year": 1891, "type": "steam",   "era": "Classic Steam",  "speed_kph": 60},
    {"id": "blue-train-sa",         "name": "Blue Train (South Africa)",  "country": "South Africa",   "year": 1939, "type": "electric","era": "Classic Electric","speed_kph": 110},
    {"id": "ghan-australia",        "name": "The Ghan (Australia)",       "country": "Australia",      "year": 1929, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 115},
    {"id": "indian-pacific",        "name": "Indian Pacific (Australia)", "country": "Australia",      "year": 1970, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 115},
    {"id": "palace-wheels-india",   "name": "Palace on Wheels (India)",   "country": "India",          "year": 1982, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 100},
    {"id": "bernina-express",       "name": "Bernina Express (Swiss)",    "country": "Switzerland",    "year": 1910, "type": "electric","era": "Classic Electric","speed_kph": 90},
    {"id": "glacier-express",       "name": "Glacier Express (Swiss)",    "country": "Switzerland",    "year": 1930, "type": "electric","era": "Classic Electric","speed_kph": 75},
    {"id": "rocky-mountaineer",     "name": "Rocky Mountaineer (Canada)", "country": "Canada",         "year": 1990, "type": "diesel",  "era": "Modern Diesel",  "speed_kph": 80},
    {"id": "california-zephyr",     "name": "California Zephyr",         "country": "United States",  "year": 1949, "type": "diesel",  "era": "Classic Diesel", "speed_kph": 145},
    {"id": "20th-century-limited",  "name": "20th Century Limited",      "country": "United States",  "year": 1902, "type": "steam",   "era": "Classic Steam",  "speed_kph": 160},
]

# ── Colour palette by type ────────────────────────────────────────────────────
TYPE_COLORS = {
    "steam":   {"body": "#8B4513", "accent": "#CD853F", "wheel": "#2C1A0E", "smoke": "#C0C0C0"},
    "diesel":  {"body": "#1E3A5F", "accent": "#F4A261", "wheel": "#333333", "smoke": "#888888"},
    "electric":{"body": "#1A3C6B", "accent": "#E8C547", "wheel": "#1A1A1A", "smoke": "none"},
    "maglev":  {"body": "#0D1B2A", "accent": "#00D4FF", "wheel": "none",    "smoke": "none"},
}

ERA_COLORS = {
    "Early Steam":    "#8B6914",
    "Classic Steam":  "#6B3A2A",
    "Golden Steam":   "#4A0E0E",
    "Late Steam":     "#3D2B1F",
    "Early Diesel":   "#0A2547",
    "Classic Diesel": "#0F3460",
    "Modern Diesel":  "#16213E",
    "Classic Electric":"#1A237E",
    "Modern Electric": "#0D47A1",
    "High Speed":     "#880E4F",
    "Maglev":         "#004D40",
    "Metro":          "#1B5E20",
    "Future":         "#311B92",
}


def make_svg(train):
    t = train["type"]
    c = TYPE_COLORS.get(t, TYPE_COLORS["diesel"])
    body  = c["body"]
    acc   = c["accent"]
    wheel = c["wheel"]
    smoke = c["smoke"]

    name  = train["name"]
    year  = train["year"]
    flag  = train["country"][:2].upper()

    svg_parts = []

    if t == "steam":
        svg_parts.append(f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
  <defs>
    <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{acc}"/>
      <stop offset="100%" stop-color="{body}"/>
    </linearGradient>
  </defs>
  <!-- smoke -->
  <ellipse cx="40" cy="18" rx="8" ry="6" fill="{smoke}" opacity="0.6"/>
  <ellipse cx="48" cy="10" rx="6" ry="5" fill="{smoke}" opacity="0.4"/>
  <!-- boiler -->
  <rect x="20" y="45" width="130" height="35" rx="8" fill="url(#bodyG)"/>
  <!-- firebox -->
  <rect x="140" y="40" width="35" height="40" rx="4" fill="{body}"/>
  <!-- cab -->
  <rect x="145" y="28" width="40" height="28" rx="3" fill="{body}"/>
  <rect x="150" y="32" width="12" height="10" rx="2" fill="{acc}" opacity="0.7"/>
  <rect x="167" y="32" width="12" height="10" rx="2" fill="{acc}" opacity="0.7"/>
  <!-- smokestack -->
  <rect x="33" y="25" width="14" height="22" rx="3" fill="{body}"/>
  <rect x="30" y="22" width="20" height="6" rx="2" fill="{body}"/>
  <!-- dome -->
  <ellipse cx="80" cy="44" rx="14" ry="10" fill="{acc}"/>
  <!-- coupling rod area -->
  <rect x="20" y="78" width="150" height="8" rx="2" fill="{body}" opacity="0.5"/>
  <!-- wheels -->
  <circle cx="50"  cy="88" r="14" fill="{wheel}" stroke="{acc}" stroke-width="3"/>
  <circle cx="90"  cy="88" r="14" fill="{wheel}" stroke="{acc}" stroke-width="3"/>
  <circle cx="130" cy="88" r="14" fill="{wheel}" stroke="{acc}" stroke-width="3"/>
  <circle cx="165" cy="92" r="10" fill="{wheel}" stroke="{acc}" stroke-width="2"/>
  <circle cx="30"  cy="92" r="10" fill="{wheel}" stroke="{acc}" stroke-width="2"/>
  <!-- centre hubs -->
  <circle cx="50"  cy="88" r="4"  fill="{acc}"/>
  <circle cx="90"  cy="88" r="4"  fill="{acc}"/>
  <circle cx="130" cy="88" r="4"  fill="{acc}"/>
  <!-- headlamp -->
  <circle cx="22" cy="58" r="5"   fill="#FFD700" opacity="0.9"/>
  <!-- label -->
  <text x="100" y="113" font-family="Arial,sans-serif" font-size="7" fill="#555" text-anchor="middle">{name[:28]}</text>
  <text x="100" y="8"   font-family="Arial,sans-serif" font-size="6" fill="#888" text-anchor="middle">{year} · {flag}</text>
</svg>""")

    elif t == "diesel":
        svg_parts.append(f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 110" width="200" height="110">
  <defs>
    <linearGradient id="dG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{acc}"/>
      <stop offset="60%" stop-color="{body}"/>
      <stop offset="100%" stop-color="{body}"/>
    </linearGradient>
  </defs>
  <!-- main body -->
  <rect x="10" y="30" width="180" height="48" rx="5" fill="url(#dG)"/>
  <!-- stripe -->
  <rect x="10" y="55" width="180" height="7" fill="{acc}" opacity="0.35"/>
  <!-- cab nose -->
  <path d="M10,30 Q20,22 50,28 L50,78 L10,78 Z" fill="{body}"/>
  <rect x="13" y="35" width="16" height="11" rx="2" fill="{acc}" opacity="0.8"/>
  <!-- exhaust stack -->
  <rect x="85" y="18" width="8" height="14" rx="2" fill="{body}"/>
  <rect x="82" y="15" width="14" height="5" rx="2" fill="{body}"/>
  {f'<ellipse cx="89" cy="13" rx="7" ry="4" fill="{smoke}" opacity="0.5"/>' if smoke!="none" else ""}
  <!-- vents -->
  <rect x="55" y="34" width="4" height="18" rx="1" fill="{body}" opacity="0.6"/>
  <rect x="62" y="34" width="4" height="18" rx="1" fill="{body}" opacity="0.6"/>
  <rect x="69" y="34" width="4" height="18" rx="1" fill="{body}" opacity="0.6"/>
  <!-- wheels -->
  <circle cx="40"  cy="85" r="13" fill="#222" stroke="{acc}" stroke-width="3"/>
  <circle cx="80"  cy="85" r="13" fill="#222" stroke="{acc}" stroke-width="3"/>
  <circle cx="125" cy="85" r="13" fill="#222" stroke="{acc}" stroke-width="3"/>
  <circle cx="165" cy="85" r="13" fill="#222" stroke="{acc}" stroke-width="3"/>
  <circle cx="40"  cy="85" r="4"  fill="{acc}"/>
  <circle cx="80"  cy="85" r="4"  fill="{acc}"/>
  <circle cx="125" cy="85" r="4"  fill="{acc}"/>
  <circle cx="165" cy="85" r="4"  fill="{acc}"/>
  <!-- headlamp -->
  <circle cx="12" cy="53" r="5"   fill="#FFD700" opacity="0.9"/>
  <text x="100" y="106" font-family="Arial,sans-serif" font-size="7" fill="#555" text-anchor="middle">{name[:28]}</text>
  <text x="100" y="10"  font-family="Arial,sans-serif" font-size="6" fill="#888" text-anchor="middle">{year} · {flag}</text>
</svg>""")

    elif t == "maglev":
        svg_parts.append(f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
  <defs>
    <linearGradient id="mG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00D4FF"/>
      <stop offset="50%" stop-color="{body}"/>
      <stop offset="100%" stop-color="#00D4FF"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- levitation glow -->
  <ellipse cx="100" cy="85" rx="90" ry="8" fill="#00D4FF" opacity="0.15"/>
  <ellipse cx="100" cy="82" rx="85" ry="5" fill="#00D4FF" opacity="0.25" filter="url(#glow)"/>
  <!-- body aerodynamic -->
  <path d="M5,55 Q15,25 60,22 L165,22 Q195,25 197,55 L197,72 Q180,80 100,80 Q20,80 5,72 Z" fill="url(#mG)"/>
  <!-- nose highlight -->
  <path d="M5,55 Q15,35 50,32 L50,65 Q20,68 5,72 Z" fill="{acc}" opacity="0.2"/>
  <!-- windows -->
  <rect x="60"  y="28" width="16" height="10" rx="3" fill="{acc}" opacity="0.6"/>
  <rect x="82"  y="28" width="16" height="10" rx="3" fill="{acc}" opacity="0.6"/>
  <rect x="104" y="28" width="16" height="10" rx="3" fill="{acc}" opacity="0.6"/>
  <rect x="126" y="28" width="16" height="10" rx="3" fill="{acc}" opacity="0.6"/>
  <!-- speed stripe -->
  <path d="M5,58 L197,58" stroke="{acc}" stroke-width="1.5" opacity="0.5"/>
  <!-- magnetic base -->
  <rect x="20" y="74" width="160" height="6" rx="3" fill="{acc}" opacity="0.4"/>
  <!-- headlight -->
  <ellipse cx="8" cy="55" rx="5" ry="8" fill="#00FFFF" opacity="0.9" filter="url(#glow)"/>
  <text x="100" y="97" font-family="Arial,sans-serif" font-size="7" fill="#555" text-anchor="middle">{name[:28]}</text>
  <text x="100" y="10" font-family="Arial,sans-serif" font-size="6" fill="#888" text-anchor="middle">{year} · {flag}</text>
</svg>""")

    else:  # electric / high-speed / metro
        is_hs = train.get("era") in ("High Speed",)
        if is_hs:
            nose = f'<path d="M5,50 Q20,25 70,28 L160,28 Q190,30 197,50 L197,72 Q185,78 100,78 Q20,78 5,72 Z" fill="url(#eG)"/>'
            nose_h = f'<path d="M5,50 Q15,32 60,30 L60,68 Q25,70 5,72 Z" fill="{acc}" opacity="0.2"/>'
        else:
            nose = f'<rect x="10" y="28" width="180" height="50" rx="6" fill="url(#eG)"/>'
            nose_h = ""
        svg_parts.append(f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
  <defs>
    <linearGradient id="eG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="{acc}"/>
      <stop offset="30%" stop-color="{body}"/>
      <stop offset="100%" stop-color="{body}"/>
    </linearGradient>
  </defs>
  {nose}
  {nose_h}
  <!-- pantograph -->
  <line x1="100" y1="28" x2="100" y2="15" stroke="{acc}" stroke-width="1.5"/>
  <line x1="90"  y1="15" x2="110" y2="15" stroke="{acc}" stroke-width="2"/>
  <line x1="88"  y1="18" x2="112" y2="18" stroke="{acc}" stroke-width="2.5"/>
  <!-- windows -->
  <rect x="65"  y="33" width="16" height="11" rx="2" fill="{acc}" opacity="0.55"/>
  <rect x="87"  y="33" width="16" height="11" rx="2" fill="{acc}" opacity="0.55"/>
  <rect x="109" y="33" width="16" height="11" rx="2" fill="{acc}" opacity="0.55"/>
  <rect x="131" y="33" width="16" height="11" rx="2" fill="{acc}" opacity="0.55"/>
  <!-- waist stripe -->
  <rect x="10"  y="57" width="180" height="5" fill="{acc}" opacity="0.4"/>
  <!-- wheels (hidden under skirt for HS, visible for metro/loco) -->
  <circle cx="42"  cy="84" r="11" fill="#111" stroke="{acc}" stroke-width="2.5"/>
  <circle cx="80"  cy="84" r="11" fill="#111" stroke="{acc}" stroke-width="2.5"/>
  <circle cx="125" cy="84" r="11" fill="#111" stroke="{acc}" stroke-width="2.5"/>
  <circle cx="163" cy="84" r="11" fill="#111" stroke="{acc}" stroke-width="2.5"/>
  <circle cx="42"  cy="84" r="3.5" fill="{acc}"/>
  <circle cx="80"  cy="84" r="3.5" fill="{acc}"/>
  <circle cx="125" cy="84" r="3.5" fill="{acc}"/>
  <circle cx="163" cy="84" r="3.5" fill="{acc}"/>
  <!-- headlamp -->
  <circle cx="8"  cy="52" r="5" fill="#FFE040" opacity="0.95"/>
  <circle cx="197" cy="52" r="4" fill="#FFE040" opacity="0.6"/>
  <text x="100" y="97" font-family="Arial,sans-serif" font-size="7" fill="#555" text-anchor="middle">{name[:28]}</text>
  <text x="100" y="10" font-family="Arial,sans-serif" font-size="6" fill="#888" text-anchor="middle">{year} · {flag}</text>
</svg>""")

    return svg_parts[0]


def save_svg(train):
    path = os.path.join(TRAIN_DIR, f"{train['id']}.svg")
    with open(path, "w", encoding="utf-8") as f:
        f.write(make_svg(train))
    return path


def build_database():
    db = []
    for t in TRAINS:
        db.append({
            "id":          t["id"],
            "name":        t["name"],
            "country":     t["country"],
            "year":        t["year"],
            "type":        t["type"],
            "era":         t["era"],
            "speed_kph":   t["speed_kph"],
            "icon":        f"assets/train/{t['id']}.svg",
            "bg_color":    ERA_COLORS.get(t["era"], "#333333"),
        })
    return db


def main():
    print(f"Generating {len(TRAINS)} train SVG icons …")
    os.makedirs(TRAIN_DIR, exist_ok=True)

    for i, train in enumerate(TRAINS, 1):
        path = save_svg(train)
        print(f"  [{i:3d}/{len(TRAINS)}] {train['id']}.svg")

    db = build_database()
    db_path = os.path.join(TRAIN_DIR, "trains-database.json")
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump({"trains": db, "total": len(db), "generated": "2026-04-12"}, f, indent=2, ensure_ascii=False)

    print(f"\nDone! {len(TRAINS)} SVG icons + database saved to:")
    print(f"  {TRAIN_DIR}/")
    print(f"  {db_path}")


if __name__ == "__main__":
    main()
