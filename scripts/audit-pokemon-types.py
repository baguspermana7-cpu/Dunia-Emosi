#!/usr/bin/env python3
"""
Audit Pokemon primary type accuracy across all game files.

Scans every `slug:'xxx',type:'yyy'` occurrence in g13c-pixi.html + game.js
and flags entries where the declared type doesn't match the canonical
Pokemon primary type.

Source of truth: hardcoded CANONICAL_PRIMARY map below, derived from
official Pokemon Generation 1-9 data.

Usage:
  python3 scripts/audit-pokemon-types.py            # report mismatches
  python3 scripts/audit-pokemon-types.py --strict   # exit 1 if any flagged
  python3 scripts/audit-pokemon-types.py --ignore-thematic
                                                    # don't flag intentional
                                                    # themed-gym choices

Exit code 0 = pass, 1 = mismatches found (with --strict).

This catches the regression pattern documented in L110 (themed-gym
contamination) where adding a Pokemon to a gym matching its SECONDARY
type accidentally overrides its PRIMARY type.
"""

import argparse
import os
import re
import sys

# Canonical PRIMARY type per Pokemon slug (Gen 1-9, Pokemon Showdown
# convention). Only Pokemon used in Dunia-Emosi battle games are listed.
# Source: official Pokemon types as of Gen 9 / Scarlet & Violet.
CANONICAL_PRIMARY = {
    # Gen 1
    'bulbasaur':'grass','ivysaur':'grass','venusaur':'grass',
    'charmander':'fire','charmeleon':'fire','charizard':'fire',
    'squirtle':'water','wartortle':'water','blastoise':'water',
    'caterpie':'bug','metapod':'bug','butterfree':'bug',
    'weedle':'bug','kakuna':'bug','beedrill':'bug',
    'pidgey':'normal','pidgeotto':'normal','pidgeot':'normal',
    'rattata':'normal','raticate':'normal',
    'spearow':'normal','fearow':'normal',
    'ekans':'poison','arbok':'poison',
    'pikachu':'electric','raichu':'electric','pichu':'electric',
    'sandshrew':'ground','sandslash':'ground',
    'nidoran-f':'poison','nidorina':'poison','nidoqueen':'poison',
    'nidoran-m':'poison','nidorino':'poison','nidoking':'poison',
    'clefairy':'fairy','clefable':'fairy','cleffa':'fairy',
    'vulpix':'fire','ninetales':'fire',
    'jigglypuff':'normal','wigglytuff':'normal','igglybuff':'normal',
    'zubat':'poison','golbat':'poison','crobat':'poison',
    'oddish':'grass','gloom':'grass','vileplume':'grass','bellossom':'grass',
    'paras':'bug','parasect':'bug',
    'venonat':'bug','venomoth':'bug',
    'diglett':'ground','dugtrio':'ground',
    'meowth':'normal','persian':'normal',
    'psyduck':'water','golduck':'water',
    'mankey':'fighting','primeape':'fighting','annihilape':'fighting',
    'growlithe':'fire','arcanine':'fire',
    'poliwag':'water','poliwhirl':'water','poliwrath':'water','politoed':'water',
    'abra':'psychic','kadabra':'psychic','alakazam':'psychic',
    'machop':'fighting','machoke':'fighting','machamp':'fighting',
    'bellsprout':'grass','weepinbell':'grass','victreebel':'grass',
    'tentacool':'water','tentacruel':'water',
    'geodude':'rock','graveler':'rock','golem':'rock',
    'ponyta':'fire','rapidash':'fire',
    'slowpoke':'water','slowbro':'water','slowking':'water',
    'magnemite':'electric','magneton':'electric','magnezone':'electric',
    'farfetchd':'normal','sirfetchd':'fighting',
    'doduo':'normal','dodrio':'normal',
    'seel':'water','dewgong':'water',
    'grimer':'poison','muk':'poison',
    'shellder':'water','cloyster':'water',
    'gastly':'ghost','haunter':'ghost','gengar':'ghost',
    'onix':'rock','steelix':'steel',
    'drowzee':'psychic','hypno':'psychic',
    'krabby':'water','kingler':'water',
    'voltorb':'electric','electrode':'electric',
    'exeggcute':'grass','exeggutor':'grass',
    'cubone':'ground','marowak':'ground',
    'hitmonlee':'fighting','hitmonchan':'fighting','hitmontop':'fighting','tyrogue':'fighting',
    'lickitung':'normal','lickilicky':'normal',
    'koffing':'poison','weezing':'poison',
    'rhyhorn':'ground','rhydon':'ground','rhyperior':'ground',
    'chansey':'normal','blissey':'normal','happiny':'normal',
    'tangela':'grass','tangrowth':'grass',
    'kangaskhan':'normal',
    'horsea':'water','seadra':'water','kingdra':'water',
    'goldeen':'water','seaking':'water',
    'staryu':'water','starmie':'water',
    'mr-mime':'psychic','mime-jr':'psychic','mr-rime':'ice',
    'scyther':'bug','scizor':'bug','kleavor':'bug',
    'jynx':'ice','smoochum':'ice',
    'electabuzz':'electric','elekid':'electric','electivire':'electric',
    'magmar':'fire','magby':'fire','magmortar':'fire',
    'pinsir':'bug','tauros':'normal',
    'magikarp':'water','gyarados':'water',
    'lapras':'water','ditto':'normal',
    'eevee':'normal','vaporeon':'water','jolteon':'electric','flareon':'fire',
    'espeon':'psychic','umbreon':'dark','leafeon':'grass','glaceon':'ice','sylveon':'fairy',
    'porygon':'normal','porygon2':'normal','porygon-z':'normal',
    'omanyte':'rock','omastar':'rock','kabuto':'rock','kabutops':'rock','aerodactyl':'rock',
    'snorlax':'normal','munchlax':'normal','ursaluna':'ground','ursaring':'normal','teddiursa':'normal',
    'articuno':'ice','zapdos':'electric','moltres':'fire',
    'dratini':'dragon','dragonair':'dragon','dragonite':'dragon',
    'mewtwo':'psychic','mew':'psychic',
    # Gen 2
    'chikorita':'grass','bayleef':'grass','meganium':'grass',
    'cyndaquil':'fire','quilava':'fire','typhlosion':'fire',
    'totodile':'water','croconaw':'water','feraligatr':'water',
    'sentret':'normal','furret':'normal',
    'hoothoot':'normal','noctowl':'normal',
    'ledyba':'bug','ledian':'bug',
    'spinarak':'bug','ariados':'bug',
    'chinchou':'water','lanturn':'water',
    'togepi':'fairy','togetic':'fairy','togekiss':'fairy',
    'natu':'psychic','xatu':'psychic',
    'mareep':'electric','flaaffy':'electric','ampharos':'electric',
    'marill':'water','azumarill':'water','azurill':'normal',
    'sudowoodo':'rock','bonsly':'rock',
    'hoppip':'grass','skiploom':'grass','jumpluff':'grass',
    'aipom':'normal','ambipom':'normal',
    'sunkern':'grass','sunflora':'grass',
    'yanma':'bug','yanmega':'bug',
    'wooper':'water','quagsire':'water','clodsire':'poison',
    'murkrow':'dark','honchkrow':'dark',
    'misdreavus':'ghost','mismagius':'ghost',
    'unown':'psychic','wobbuffet':'psychic','girafarig':'normal','farigiraf':'normal',
    'pineco':'bug','forretress':'bug',
    'dunsparce':'normal','dudunsparce':'normal',
    'gligar':'ground','gliscor':'ground',
    'snubbull':'fairy','granbull':'fairy',
    'qwilfish':'water',
    'shuckle':'bug','heracross':'bug',
    'sneasel':'dark','weavile':'dark','sneasler':'fighting',
    'slugma':'fire','magcargo':'fire',
    'swinub':'ice','piloswine':'ice','mamoswine':'ice',
    'corsola':'water','cursola':'ghost',
    'remoraid':'water','octillery':'water',
    'delibird':'ice','mantine':'water','mantyke':'water',
    'skarmory':'steel',
    'houndour':'dark','houndoom':'dark',
    'phanpy':'ground','donphan':'ground',
    'stantler':'normal','wyrdeer':'normal',
    'smeargle':'normal','miltank':'normal',
    'raikou':'electric','entei':'fire','suicune':'water',
    'larvitar':'rock','pupitar':'rock','tyranitar':'rock',
    'lugia':'psychic','ho-oh':'fire','celebi':'psychic',
    # Gen 3
    'treecko':'grass','grovyle':'grass','sceptile':'grass',
    'torchic':'fire','combusken':'fire','blaziken':'fire',
    'mudkip':'water','marshtomp':'water','swampert':'water',
    'poochyena':'dark','mightyena':'dark',
    'zigzagoon':'normal','linoone':'normal','obstagoon':'dark',
    'wurmple':'bug','silcoon':'bug','beautifly':'bug','cascoon':'bug','dustox':'bug',
    'lotad':'water','lombre':'water','ludicolo':'water',
    'seedot':'grass','nuzleaf':'grass','shiftry':'grass',
    'taillow':'normal','swellow':'normal',
    'wingull':'water','pelipper':'water',
    'ralts':'psychic','kirlia':'psychic','gardevoir':'psychic','gallade':'psychic',
    'surskit':'bug','masquerain':'bug',
    'shroomish':'grass','breloom':'grass',
    'slakoth':'normal','vigoroth':'normal','slaking':'normal',
    'nincada':'bug','ninjask':'bug','shedinja':'bug',
    'whismur':'normal','loudred':'normal','exploud':'normal',
    'makuhita':'fighting','hariyama':'fighting',
    'nosepass':'rock','probopass':'rock',
    'skitty':'normal','delcatty':'normal',
    'sableye':'dark','mawile':'steel',
    'aron':'steel','lairon':'steel','aggron':'steel',
    'meditite':'fighting','medicham':'fighting',
    'electrike':'electric','manectric':'electric',
    'plusle':'electric','minun':'electric',
    'volbeat':'bug','illumise':'bug',
    'roselia':'grass','budew':'grass','roserade':'grass',
    'gulpin':'poison','swalot':'poison',
    'carvanha':'water','sharpedo':'water',
    'wailmer':'water','wailord':'water',
    'numel':'fire','camerupt':'fire','torkoal':'fire',
    'spoink':'psychic','grumpig':'psychic','spinda':'normal',
    'trapinch':'ground','vibrava':'ground','flygon':'ground',
    'cacnea':'grass','cacturne':'grass',
    'swablu':'normal','altaria':'dragon',
    'zangoose':'normal','seviper':'poison',
    'lunatone':'rock','solrock':'rock',
    'barboach':'water','whiscash':'water',
    'corphish':'water','crawdaunt':'water',
    'baltoy':'ground','claydol':'ground',
    'lileep':'rock','cradily':'rock','anorith':'rock','armaldo':'rock',
    'feebas':'water','milotic':'water',
    'castform':'normal','kecleon':'normal',
    'shuppet':'ghost','banette':'ghost',
    'duskull':'ghost','dusclops':'ghost','dusknoir':'ghost',
    'tropius':'grass','chimecho':'psychic',
    'absol':'dark','wynaut':'psychic',
    'snorunt':'ice','glalie':'ice','froslass':'ice',
    'spheal':'ice','sealeo':'ice','walrein':'ice',
    'clamperl':'water','huntail':'water','gorebyss':'water',
    'relicanth':'water','luvdisc':'water',
    'bagon':'dragon','shelgon':'dragon','salamence':'dragon',
    'beldum':'steel','metang':'steel','metagross':'steel',
    'regirock':'rock','regice':'ice','registeel':'steel',
    'latias':'dragon','latios':'dragon',
    'kyogre':'water','groudon':'ground','rayquaza':'dragon',
    'jirachi':'steel','deoxys':'psychic',
    # Gen 4
    'turtwig':'grass','grotle':'grass','torterra':'grass',
    'chimchar':'fire','monferno':'fire','infernape':'fire',
    'piplup':'water','prinplup':'water','empoleon':'water',
    'starly':'normal','staravia':'normal','staraptor':'normal',
    'bidoof':'normal','bibarel':'normal',
    'kricketot':'bug','kricketune':'bug',
    'shinx':'electric','luxio':'electric','luxray':'electric',
    'cranidos':'rock','rampardos':'rock','shieldon':'rock','bastiodon':'rock',
    'burmy':'bug','wormadam':'bug','mothim':'bug',
    'combee':'bug','vespiquen':'bug',
    'pachirisu':'electric','buizel':'water','floatzel':'water',
    'cherubi':'grass','cherrim':'grass',
    'shellos':'water','gastrodon':'water',
    'drifloon':'ghost','drifblim':'ghost',
    'buneary':'normal','lopunny':'normal',
    'glameow':'normal','purugly':'normal',
    'chingling':'psychic','stunky':'poison','skuntank':'poison',
    'bronzor':'steel','bronzong':'steel',
    'chatot':'normal','spiritomb':'ghost',
    'gible':'dragon','gabite':'dragon','garchomp':'dragon',
    'riolu':'fighting','lucario':'fighting',
    'hippopotas':'ground','hippowdon':'ground',
    'skorupi':'poison','drapion':'poison',
    'croagunk':'poison','toxicroak':'poison',
    'carnivine':'grass','finneon':'water','lumineon':'water',
    'snover':'grass','abomasnow':'grass',
    'rotom':'electric','uxie':'psychic','mesprit':'psychic','azelf':'psychic',
    'dialga':'steel','palkia':'water','heatran':'fire','regigigas':'normal',
    'giratina':'ghost','cresselia':'psychic','phione':'water','manaphy':'water',
    'darkrai':'dark','shaymin':'grass','arceus':'normal',
    # Gen 5
    'victini':'psychic',
    'snivy':'grass','servine':'grass','serperior':'grass',
    'tepig':'fire','pignite':'fire','emboar':'fire',
    'oshawott':'water','dewott':'water','samurott':'water',
    'patrat':'normal','watchog':'normal',
    'lillipup':'normal','herdier':'normal','stoutland':'normal',
    'purrloin':'dark','liepard':'dark',
    'munna':'psychic','musharna':'psychic',
    'pidove':'normal','tranquill':'normal','unfezant':'normal',
    'blitzle':'electric','zebstrika':'electric',
    'roggenrola':'rock','boldore':'rock','gigalith':'rock',
    'woobat':'psychic','swoobat':'psychic',
    'drilbur':'ground','excadrill':'ground',
    'audino':'normal',
    'timburr':'fighting','gurdurr':'fighting','conkeldurr':'fighting',
    'tympole':'water','palpitoad':'water','seismitoad':'water',
    'throh':'fighting','sawk':'fighting',
    'sewaddle':'bug','swadloon':'bug','leavanny':'bug',
    'venipede':'bug','whirlipede':'bug','scolipede':'bug',
    'cottonee':'grass','whimsicott':'grass',
    'petilil':'grass','lilligant':'grass',
    'basculin':'water','basculegion':'water','overqwil':'dark',
    'sandile':'ground','krokorok':'ground','krookodile':'ground',
    'darumaka':'fire','darmanitan':'fire',
    'maractus':'grass',
    'dwebble':'bug','crustle':'bug',
    'scraggy':'dark','scrafty':'dark',
    'sigilyph':'psychic',
    'yamask':'ghost','cofagrigus':'ghost','runerigus':'ground',
    'tirtouga':'water','carracosta':'water',
    'archen':'rock','archeops':'rock',
    'trubbish':'poison','garbodor':'poison',
    'zorua':'dark','zoroark':'dark',
    'minccino':'normal','cinccino':'normal',
    'gothita':'psychic','gothorita':'psychic','gothitelle':'psychic',
    'solosis':'psychic','duosion':'psychic','reuniclus':'psychic',
    'ducklett':'water','swanna':'water',
    'vanillite':'ice','vanillish':'ice','vanilluxe':'ice',
    'deerling':'normal','sawsbuck':'normal',
    'emolga':'electric','karrablast':'bug','escavalier':'bug',
    'foongus':'grass','amoonguss':'grass',
    'frillish':'water','jellicent':'water','alomomola':'water',
    'joltik':'bug','galvantula':'bug',
    'ferroseed':'grass','ferrothorn':'grass',
    'klink':'steel','klang':'steel','klinklang':'steel',
    'tynamo':'electric','eelektrik':'electric','eelektross':'electric',
    'elgyem':'psychic','beheeyem':'psychic',
    'litwick':'ghost','lampent':'ghost','chandelure':'ghost',
    'axew':'dragon','fraxure':'dragon','haxorus':'dragon',
    'cubchoo':'ice','beartic':'ice','cryogonal':'ice',
    'shelmet':'bug','accelgor':'bug',
    'stunfisk':'ground','mienfoo':'fighting','mienshao':'fighting',
    'druddigon':'dragon','golett':'ground','golurk':'ground',
    'pawniard':'dark','bisharp':'dark','kingambit':'dark',
    'bouffalant':'normal',
    'rufflet':'normal','braviary':'normal',
    'vullaby':'dark','mandibuzz':'dark',
    'heatmor':'fire','durant':'bug',
    'deino':'dark','zweilous':'dark','hydreigon':'dark',
    'larvesta':'bug','volcarona':'bug',
    'cobalion':'steel','terrakion':'rock','virizion':'grass',
    'tornadus':'flying','thundurus':'electric','landorus':'ground',
    'reshiram':'dragon','zekrom':'dragon','kyurem':'dragon',
    'keldeo':'water','meloetta':'normal','genesect':'bug',
    # Gen 6
    'chespin':'grass','quilladin':'grass','chesnaught':'grass',
    'fennekin':'fire','braixen':'fire','delphox':'fire',
    'froakie':'water','frogadier':'water','greninja':'water',
    'bunnelby':'normal','diggersby':'normal',
    'fletchling':'normal','fletchinder':'fire','talonflame':'fire',
    'scatterbug':'bug','spewpa':'bug','vivillon':'bug',
    'litleo':'fire','pyroar':'fire',
    'flabebe':'fairy','floette':'fairy','florges':'fairy',
    'skiddo':'grass','gogoat':'grass',
    'pancham':'fighting','pangoro':'fighting',
    'furfrou':'normal','espurr':'psychic','meowstic':'psychic',
    'honedge':'steel','doublade':'steel','aegislash':'steel',
    'spritzee':'fairy','aromatisse':'fairy',
    'swirlix':'fairy','slurpuff':'fairy',
    'inkay':'dark','malamar':'dark',
    'binacle':'rock','barbaracle':'rock',
    'skrelp':'poison','dragalge':'poison',
    'clauncher':'water','clawitzer':'water',
    'helioptile':'electric','heliolisk':'electric',
    'tyrunt':'rock','tyrantrum':'rock',
    'amaura':'rock','aurorus':'rock',
    'hawlucha':'fighting','dedenne':'electric','carbink':'rock',
    'goomy':'dragon','sliggoo':'dragon','goodra':'dragon',
    'klefki':'steel','phantump':'ghost','trevenant':'ghost',
    'pumpkaboo':'ghost','gourgeist':'ghost',
    'bergmite':'ice','avalugg':'ice',
    'noibat':'flying','noivern':'flying',
    'xerneas':'fairy','yveltal':'dark','zygarde':'dragon',
    'diancie':'rock','hoopa':'psychic','volcanion':'fire',
    # Gen 7
    'rowlet':'grass','dartrix':'grass','decidueye':'grass',
    'litten':'fire','torracat':'fire','incineroar':'fire',
    'popplio':'water','brionne':'water','primarina':'water',
    'pikipek':'normal','trumbeak':'normal','toucannon':'normal',
    'yungoos':'normal','gumshoos':'normal',
    'grubbin':'bug','charjabug':'bug','vikavolt':'bug',
    'crabrawler':'fighting','crabominable':'fighting',
    'oricorio':'fire','cutiefly':'bug','ribombee':'bug',
    'rockruff':'rock','lycanroc':'rock',
    'wishiwashi':'water','mareanie':'poison','toxapex':'poison',
    'mudbray':'ground','mudsdale':'ground',
    'dewpider':'water','araquanid':'water',
    'fomantis':'grass','lurantis':'grass',
    'morelull':'grass','shiinotic':'grass',
    'salandit':'poison','salazzle':'poison',
    'stufful':'normal','bewear':'normal',
    'bounsweet':'grass','steenee':'grass','tsareena':'grass',
    'comfey':'fairy','oranguru':'normal','passimian':'fighting',
    'wimpod':'bug','golisopod':'bug',
    'sandygast':'ghost','palossand':'ghost',
    'pyukumuku':'water','type-null':'normal','silvally':'normal',
    'minior':'rock','komala':'normal','turtonator':'fire',
    'togedemaru':'electric','mimikyu':'ghost',
    'bruxish':'water','drampa':'normal','dhelmise':'ghost',
    'jangmo-o':'dragon','hakamo-o':'dragon','kommo-o':'dragon',
    'tapu-koko':'electric','tapu-lele':'psychic','tapu-bulu':'grass','tapu-fini':'water',
    'cosmog':'psychic','cosmoem':'psychic','solgaleo':'psychic','lunala':'psychic',
    'nihilego':'rock','buzzwole':'bug','pheromosa':'bug',
    'xurkitree':'electric','celesteela':'steel','kartana':'grass',
    'guzzlord':'dark','necrozma':'psychic','magearna':'steel','marshadow':'fighting',
    'poipole':'poison','naganadel':'poison','stakataka':'rock','blacephalon':'fire',
    'zeraora':'electric','meltan':'steel','melmetal':'steel',
    # Gen 8 / 9 — abbreviated, since Dunia-Emosi mostly uses Gen 1-7
    'grookey':'grass','thwackey':'grass','rillaboom':'grass',
    'scorbunny':'fire','raboot':'fire','cinderace':'fire',
    'sobble':'water','drizzile':'water','inteleon':'water',
    'corviknight':'flying','perrserker':'steel',
    'eternatus':'poison','zacian':'fairy','zamazenta':'fighting',
    'urshifu':'fighting','calyrex':'psychic',
}

# Pokemon where thematic-gym intent overrides canonical accuracy
# (documented exceptions per L110, accept without flagging).
THEMATIC_EXCEPTIONS = {
    'pidgey', 'pidgeotto', 'pidgeot', 'doduo',  # G13C flying gym
    'noctowl',  # G13C bird-themed
}

PATTERN = re.compile(r"slug:'([a-z0-9\-]+)',type:'([a-zA-Z]+)'")

def audit_file(path):
    """Returns list of (line_num, slug, declared_type, canonical) tuples."""
    mismatches = []
    if not os.path.exists(path):
        return mismatches
    with open(path) as f:
        for line_num, line in enumerate(f, 1):
            for slug, declared in PATTERN.findall(line):
                d = declared.lower()
                canonical = CANONICAL_PRIMARY.get(slug)
                if canonical is None:
                    continue
                if d != canonical:
                    mismatches.append((path, line_num, slug, d, canonical))
    return mismatches

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--strict', action='store_true', help='exit 1 if any mismatch')
    parser.add_argument('--ignore-thematic', action='store_true',
                        help='do not flag intentional themed-gym overrides')
    parser.add_argument('--files', nargs='+',
                        default=['games/g13c-pixi.html', 'game.js'],
                        help='files to audit (default: g13c-pixi.html + game.js)')
    args = parser.parse_args()

    all_mismatches = []
    for f in args.files:
        all_mismatches.extend(audit_file(f))

    flagged = []
    excused = []
    for entry in all_mismatches:
        path, ln, slug, declared, canonical = entry
        if args.ignore_thematic and slug in THEMATIC_EXCEPTIONS:
            excused.append(entry)
        else:
            flagged.append(entry)

    if flagged:
        print(f'\n{len(flagged)} type mismatch{"" if len(flagged)==1 else "es"} found:\n')
        for path, ln, slug, declared, canonical in flagged:
            note = ''
            if slug in THEMATIC_EXCEPTIONS:
                note = ' [thematic override — pass --ignore-thematic to skip]'
            print(f'  {path}:{ln}  {slug:<22s} declared={declared:<10s} canonical={canonical}{note}')
    else:
        print('No type mismatches detected.')

    if excused:
        print(f'\n{len(excused)} thematic overrides excused (per L110).')

    if args.strict and flagged:
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
