/**
 * City Pokemon Pack — Dunia Emosi (Task #66, 2026-04-25)
 *
 * 127 cities across 10 main Pokemon regions, each with:
 * - Background image path (PC + mobile WebP from assets/Pokemon/background/)
 * - Canonical Pokemon pack (4-7 species from gym leader / route encounters / anime episodes)
 * - Difficulty tier (1-5, escalates with story progression)
 * - Optional gym leader info
 *
 * Slugs follow PokeAPI format (lowercase, dash-separated, e.g. mr-mime, farfetchd).
 * All slugs verified against local sprite pack `assets/Pokemon/pokemondb_hd_alt2/{NNNN}_{slug}.webp`.
 *
 * Side regions (Sevii/Orre/PMD/Almia/Fiore/Oblivia/Toyland/Pasio/Kitakami/Aeos)
 * intentionally omitted from MVP — can be added Phase 7+ as "Petualangan Bonus".
 *
 * See: documentation and standarization/CITY-PROGRESSION-SPEC.md (TBD)
 *      games/data/region-meta.js (region color/icon/order)
 *      assets/Pokemon/background/data/pokemon_city_background_manifest.csv
 */

// Helper to construct city entry consistently
function _city(slug, name, order, tier, anime, gym, pack, region) {
  return {
    slug, name, order, tier,
    anime: anime || null,
    gym: gym || null,
    bg: {
      pc: `${region}__${slug}__pc.webp`,
      mobile: `${region}__${slug}__mobile.webp`,
    },
    pack,
  }
}

// Pokemon entry shorthand: [id, slug, type]
function _p(id, slug, type) { return { id, slug, type } }

const CITY_PACK = {
  // ════════════════════════════════════════════════════════════════════
  // KANTO (10) — Gen 1
  // ════════════════════════════════════════════════════════════════════
  kanto: {
    name: 'Kanto', gen: 'Gen 1', color: '#EF4444', icon: '🔥',
    cities: [
      _city('pallet-town', 'Pallet Town', 1, 1, 'EP001', null, [
        _p(1,'bulbasaur','grass'), _p(4,'charmander','fire'), _p(7,'squirtle','water'),
        _p(25,'pikachu','electric'), _p(16,'pidgey','flying'), _p(19,'rattata','normal'),
      ], 'kanto'),
      _city('viridian-city', 'Viridian City', 2, 4, 'EP002', {leader:'Giovanni',type:'ground'}, [
        _p(111,'rhyhorn','rock'), _p(51,'dugtrio','ground'), _p(31,'nidoqueen','poison'),
        _p(34,'nidoking','poison'), _p(112,'rhydon','ground'), _p(21,'spearow','flying'),
      ], 'kanto'),
      _city('pewter-city', 'Pewter City', 3, 1, 'EP005', {leader:'Brock',type:'rock'}, [
        _p(74,'geodude','rock'), _p(95,'onix','rock'), _p(41,'zubat','poison'),
        _p(35,'clefairy','fairy'), _p(46,'paras','bug'), _p(27,'sandshrew','ground'),
      ], 'kanto'),
      _city('cerulean-city', 'Cerulean City', 4, 2, 'EP007', {leader:'Misty',type:'water'}, [
        _p(120,'staryu','water'), _p(121,'starmie','water'), _p(54,'psyduck','water'),
        _p(175,'togepi','fairy'), _p(118,'goldeen','water'), _p(116,'horsea','water'),
      ], 'kanto'),
      _city('vermilion-city', 'Vermilion City', 5, 2, 'EP014', {leader:'Lt. Surge',type:'electric'}, [
        _p(100,'voltorb','electric'), _p(25,'pikachu','electric'), _p(26,'raichu','electric'),
        _p(81,'magnemite','electric'), _p(50,'diglett','ground'), _p(83,'farfetchd','flying'),
      ], 'kanto'),
      _city('lavender-town', 'Lavender Town', 6, 2, 'EP023', null, [
        _p(92,'gastly','ghost'), _p(93,'haunter','ghost'), _p(94,'gengar','ghost'),
        _p(104,'cubone','ground'), _p(105,'marowak','ground'), _p(96,'drowzee','psychic'),
      ], 'kanto'),
      _city('celadon-city', 'Celadon City', 7, 3, 'EP026', {leader:'Erika',type:'grass'}, [
        _p(69,'bellsprout','grass'), _p(70,'weepinbell','grass'), _p(71,'victreebel','grass'),
        _p(43,'oddish','grass'), _p(44,'gloom','grass'), _p(45,'vileplume','grass'),
      ], 'kanto'),
      _city('saffron-city', 'Saffron City', 8, 3, 'EP022', {leader:'Sabrina',type:'psychic'}, [
        _p(63,'abra','psychic'), _p(64,'kadabra','psychic'), _p(65,'alakazam','psychic'),
        _p(122,'mr-mime','psychic'), _p(49,'venomoth','bug'), _p(106,'hitmonlee','fighting'),
      ], 'kanto'),
      _city('fuchsia-city', 'Fuchsia City', 9, 3, 'EP032', {leader:'Koga',type:'poison'}, [
        _p(109,'koffing','poison'), _p(110,'weezing','poison'), _p(48,'venonat','bug'),
        _p(49,'venomoth','bug'), _p(113,'chansey','normal'), _p(115,'kangaskhan','normal'),
      ], 'kanto'),
      _city('cinnabar-island', 'Cinnabar Island', 10, 4, 'EP059', {leader:'Blaine',type:'fire'}, [
        _p(58,'growlithe','fire'), _p(77,'ponyta','fire'), _p(78,'rapidash','fire'),
        _p(59,'arcanine','fire'), _p(126,'magmar','fire'), _p(37,'vulpix','fire'),
      ], 'kanto'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // JOHTO (12) — Gen 2
  // ════════════════════════════════════════════════════════════════════
  johto: {
    name: 'Johto', gen: 'Gen 2', color: '#F59E0B', icon: '🌅',
    cities: [
      _city('new-bark-town', 'New Bark Town', 1, 1, 'EP160', null, [
        _p(152,'chikorita','grass'), _p(155,'cyndaquil','fire'), _p(158,'totodile','water'),
        _p(16,'pidgey','flying'), _p(161,'sentret','normal'),
      ], 'johto'),
      _city('cherrygrove-city', 'Cherrygrove City', 2, 1, null, null, [
        _p(163,'hoothoot','flying'), _p(165,'ledyba','bug'), _p(167,'spinarak','bug'),
        _p(204,'pineco','bug'), _p(102,'exeggcute','grass'), _p(72,'tentacool','water'),
      ], 'johto'),
      _city('violet-city', 'Violet City', 3, 1, 'EP159', {leader:'Falkner',type:'flying'}, [
        _p(16,'pidgey','flying'), _p(17,'pidgeotto','flying'), _p(163,'hoothoot','flying'),
        _p(69,'bellsprout','grass'), _p(177,'natu','psychic'), _p(201,'unown','psychic'),
      ], 'johto'),
      _city('azalea-town', 'Azalea Town', 4, 2, 'EP180', {leader:'Bugsy',type:'bug'}, [
        _p(11,'metapod','bug'), _p(14,'kakuna','bug'), _p(123,'scyther','bug'),
        _p(79,'slowpoke','water'), _p(10,'caterpie','bug'), _p(13,'weedle','bug'),
      ], 'johto'),
      _city('goldenrod-city', 'Goldenrod City', 5, 2, 'EP194', {leader:'Whitney',type:'normal'}, [
        _p(35,'clefairy','fairy'), _p(241,'miltank','normal'), _p(39,'jigglypuff','normal'),
        _p(133,'eevee','normal'), _p(209,'snubbull','fairy'), _p(52,'meowth','normal'),
      ], 'johto'),
      _city('ecruteak-city', 'Ecruteak City', 6, 3, 'EP243', {leader:'Morty',type:'ghost'}, [
        _p(92,'gastly','ghost'), _p(93,'haunter','ghost'), _p(94,'gengar','ghost'),
        _p(250,'ho-oh','fire'), _p(249,'lugia','psychic'), _p(133,'eevee','normal'),
      ], 'johto'),
      _city('olivine-city', 'Olivine City', 7, 3, 'EP223', {leader:'Jasmine',type:'steel'}, [
        _p(81,'magnemite','electric'), _p(208,'steelix','steel'), _p(181,'ampharos','electric'),
        _p(179,'mareep','electric'), _p(180,'flaaffy','electric'), _p(98,'krabby','water'),
      ], 'johto'),
      _city('cianwood-city', 'Cianwood City', 8, 3, 'EP228', {leader:'Chuck',type:'fighting'}, [
        _p(57,'primeape','fighting'), _p(62,'poliwrath','water'), _p(56,'mankey','fighting'),
        _p(72,'tentacool','water'), _p(213,'shuckle','bug'), _p(90,'shellder','water'),
      ], 'johto'),
      _city('mahogany-town', 'Mahogany Town', 9, 3, 'EP249', {leader:'Pryce',type:'ice'}, [
        _p(86,'seel','water'), _p(87,'dewgong','water'), _p(221,'piloswine','ice'),
        _p(220,'swinub','ice'), _p(130,'gyarados','water'), _p(129,'magikarp','water'),
      ], 'johto'),
      _city('blackthorn-city', 'Blackthorn City', 10, 4, 'EP254', {leader:'Clair',type:'dragon'}, [
        _p(147,'dratini','dragon'), _p(148,'dragonair','dragon'), _p(230,'kingdra','water'),
        _p(116,'horsea','water'), _p(117,'seadra','water'), _p(149,'dragonite','dragon'),
      ], 'johto'),
      _city('frontier-access', 'Frontier Access', 11, 5, null, null, [
        _p(248,'tyranitar','rock'), _p(149,'dragonite','dragon'), _p(212,'scizor','bug'),
        _p(214,'heracross','bug'), _p(143,'snorlax','normal'), _p(196,'espeon','psychic'),
      ], 'johto'),
      _city('safari-zone-gate', 'Safari Zone Gate', 12, 4, null, null, [
        _p(128,'tauros','normal'), _p(115,'kangaskhan','normal'), _p(113,'chansey','normal'),
        _p(111,'rhyhorn','rock'), _p(102,'exeggcute','grass'), _p(132,'ditto','normal'),
      ], 'johto'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // HOENN (16) — Gen 3
  // ════════════════════════════════════════════════════════════════════
  hoenn: {
    name: 'Hoenn', gen: 'Gen 3', color: '#10B981', icon: '🌊',
    cities: [
      _city('littleroot-town', 'Littleroot Town', 1, 1, 'AG001', null, [
        _p(252,'treecko','grass'), _p(255,'torchic','fire'), _p(258,'mudkip','water'),
        _p(261,'poochyena','dark'), _p(263,'zigzagoon','normal'),
      ], 'hoenn'),
      _city('oldale-town', 'Oldale Town', 2, 1, 'AG003', null, [
        _p(265,'wurmple','bug'), _p(266,'silcoon','bug'), _p(268,'cascoon','bug'),
        _p(270,'lotad','water'), _p(273,'seedot','grass'), _p(276,'taillow','flying'),
      ], 'hoenn'),
      _city('petalburg-city', 'Petalburg City', 3, 3, 'AG005', {leader:'Norman',type:'normal'}, [
        _p(287,'slakoth','normal'), _p(288,'vigoroth','normal'), _p(289,'slaking','normal'),
        _p(327,'spinda','normal'), _p(264,'linoone','normal'), _p(263,'zigzagoon','normal'),
      ], 'hoenn'),
      _city('rustboro-city', 'Rustboro City', 4, 1, 'AG010', {leader:'Roxanne',type:'rock'}, [
        _p(74,'geodude','rock'), _p(299,'nosepass','rock'), _p(304,'aron','steel'),
        _p(293,'whismur','normal'), _p(41,'zubat','poison'), _p(63,'abra','psychic'),
      ], 'hoenn'),
      _city('dewford-town', 'Dewford Town', 5, 2, 'AG019', {leader:'Brawly',type:'fighting'}, [
        _p(66,'machop','fighting'), _p(296,'makuhita','fighting'), _p(307,'meditite','psychic'),
        _p(302,'sableye','dark'), _p(303,'mawile','fairy'), _p(72,'tentacool','water'),
      ], 'hoenn'),
      _city('slateport-city', 'Slateport City', 6, 2, 'AG023', null, [
        _p(72,'tentacool','water'), _p(278,'wingull','flying'), _p(279,'pelipper','flying'),
        _p(320,'wailmer','water'), _p(129,'magikarp','water'), _p(25,'pikachu','electric'),
      ], 'hoenn'),
      _city('mauville-city', 'Mauville City', 7, 2, 'AG033', {leader:'Wattson',type:'electric'}, [
        _p(81,'magnemite','electric'), _p(100,'voltorb','electric'), _p(82,'magneton','electric'),
        _p(309,'electrike','electric'), _p(310,'manectric','electric'), _p(311,'plusle','electric'),
      ], 'hoenn'),
      _city('verdanturf-town', 'Verdanturf Town', 8, 2, 'AG045', null, [
        _p(293,'whismur','normal'), _p(294,'loudred','normal'), _p(300,'skitty','normal'),
        _p(43,'oddish','grass'), _p(314,'illumise','bug'), _p(313,'volbeat','bug'),
      ], 'hoenn'),
      _city('lavaridge-town', 'Lavaridge Town', 9, 3, 'AG063', {leader:'Flannery',type:'fire'}, [
        _p(218,'slugma','fire'), _p(322,'numel','fire'), _p(323,'camerupt','fire'),
        _p(324,'torkoal','fire'), _p(360,'wynaut','psychic'), _p(325,'spoink','psychic'),
      ], 'hoenn'),
      _city('fortree-city', 'Fortree City', 10, 3, 'AG089', {leader:'Winona',type:'flying'}, [
        _p(277,'swellow','flying'), _p(279,'pelipper','flying'), _p(227,'skarmory','steel'),
        _p(334,'altaria','dragon'), _p(357,'tropius','grass'), _p(352,'kecleon','normal'),
      ], 'hoenn'),
      _city('lilycove-city', 'Lilycove City', 11, 3, 'AG114', null, [
        _p(366,'clamperl','water'), _p(363,'spheal','ice'), _p(364,'sealeo','ice'),
        _p(365,'walrein','ice'), _p(202,'wobbuffet','psychic'), _p(359,'absol','dark'),
      ], 'hoenn'),
      _city('mossdeep-city', 'Mossdeep City', 12, 4, 'AG119', {leader:'Tate & Liza',type:'psychic'}, [
        _p(337,'lunatone','rock'), _p(338,'solrock','rock'), _p(344,'claydol','ground'),
        _p(178,'xatu','psychic'), _p(343,'baltoy','ground'), _p(358,'chimecho','psychic'),
      ], 'hoenn'),
      _city('sootopolis-city', 'Sootopolis City', 13, 4, 'AG189', {leader:'Wallace',type:'water'}, [
        _p(370,'luvdisc','water'), _p(129,'magikarp','water'), _p(350,'milotic','water'),
        _p(321,'wailord','water'), _p(382,'kyogre','water'), _p(383,'groudon','ground'),
      ], 'hoenn'),
      _city('pacifidlog-town', 'Pacifidlog Town', 14, 3, 'AG172', null, [
        _p(72,'tentacool','water'), _p(278,'wingull','flying'), _p(279,'pelipper','flying'),
        _p(320,'wailmer','water'), _p(319,'sharpedo','water'), _p(384,'rayquaza','dragon'),
      ], 'hoenn'),
      _city('ever-grande-city', 'Ever Grande City', 15, 5, 'AG185', null, [
        _p(262,'mightyena','dark'), _p(356,'dusclops','ghost'), _p(365,'walrein','ice'),
        _p(373,'salamence','dragon'), _p(376,'metagross','steel'), _p(350,'milotic','water'),
        _p(359,'absol','dark'),
      ], 'hoenn'),
      _city('fallarbor-town', 'Fallarbor Town', 16, 3, null, null, [
        _p(371,'bagon','dragon'), _p(372,'shelgon','dragon'), _p(373,'salamence','dragon'),
        _p(345,'lileep','rock'), _p(347,'anorith','rock'), _p(353,'shuppet','ghost'),
      ], 'hoenn'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // SINNOH (17) — Gen 4 [from Agent 1 research]
  // ════════════════════════════════════════════════════════════════════
  sinnoh: {
    name: 'Sinnoh', gen: 'Gen 4', color: '#3B82F6', icon: '❄️',
    cities: [
      _city('twinleaf-town', 'Twinleaf Town', 1, 1, 'DP001', null, [
        _p(396,'starly','flying'), _p(399,'bidoof','normal'), _p(387,'turtwig','grass'),
        _p(390,'chimchar','fire'), _p(393,'piplup','water'),
      ], 'sinnoh'),
      _city('sandgem-town', 'Sandgem Town', 2, 1, 'DP002', null, [
        _p(387,'turtwig','grass'), _p(390,'chimchar','fire'), _p(393,'piplup','water'),
        _p(403,'shinx','electric'), _p(399,'bidoof','normal'), _p(396,'starly','flying'),
      ], 'sinnoh'),
      _city('jubilife-city', 'Jubilife City', 3, 1, 'DP003', null, [
        _p(396,'starly','flying'), _p(401,'kricketot','bug'), _p(403,'shinx','electric'),
        _p(425,'drifloon','ghost'), _p(434,'stunky','poison'),
      ], 'sinnoh'),
      _city('oreburgh-city', 'Oreburgh City', 4, 2, 'DP013', {leader:'Roark',type:'rock'}, [
        _p(74,'geodude','rock'), _p(95,'onix','rock'), _p(408,'cranidos','rock'),
        _p(410,'shieldon','rock'), _p(524,'roggenrola','rock'), _p(246,'larvitar','rock'),
      ], 'sinnoh'),
      _city('floaroma-town', 'Floaroma Town', 5, 2, 'DP018', null, [
        _p(412,'burmy','bug'), _p(415,'combee','bug'), _p(416,'vespiquen','bug'),
        _p(420,'cherubi','grass'), _p(421,'cherrim','grass'), _p(406,'budew','grass'),
      ], 'sinnoh'),
      _city('eterna-city', 'Eterna City', 6, 2, 'DP040', {leader:'Gardenia',type:'grass'}, [
        _p(387,'turtwig','grass'), _p(388,'grotle','grass'), _p(407,'roserade','grass'),
        _p(413,'wormadam','bug'), _p(455,'carnivine','grass'), _p(357,'tropius','grass'),
      ], 'sinnoh'),
      _city('hearthome-city', 'Hearthome City', 7, 3, 'DP066', {leader:'Fantina',type:'ghost'}, [
        _p(200,'misdreavus','ghost'), _p(429,'mismagius','ghost'), _p(425,'drifloon','ghost'),
        _p(426,'drifblim','ghost'), _p(92,'gastly','ghost'), _p(94,'gengar','ghost'),
      ], 'sinnoh'),
      _city('solaceon-town', 'Solaceon Town', 8, 3, 'DP076', null, [
        _p(113,'chansey','normal'), _p(175,'togepi','fairy'), _p(209,'snubbull','fairy'),
        _p(215,'sneasel','dark'), _p(206,'dunsparce','normal'), _p(133,'eevee','normal'),
      ], 'sinnoh'),
      _city('veilstone-city', 'Veilstone City', 9, 3, 'DP089', {leader:'Maylene',type:'fighting'}, [
        _p(308,'medicham','fighting'), _p(297,'hariyama','fighting'), _p(448,'lucario','fighting'),
        _p(57,'primeape','fighting'), _p(286,'breloom','grass'), _p(237,'hitmontop','fighting'),
      ], 'sinnoh'),
      _city('pastoria-city', 'Pastoria City', 10, 3, 'DP100', {leader:'Crasher Wake',type:'water'}, [
        _p(195,'quagsire','water'), _p(419,'floatzel','water'), _p(340,'whiscash','water'),
        _p(130,'gyarados','water'), _p(224,'octillery','water'), _p(211,'qwilfish','water'),
      ], 'sinnoh'),
      _city('celestic-town', 'Celestic Town', 11, 4, 'DP116', null, [
        _p(481,'mesprit','psychic'), _p(480,'uxie','psychic'), _p(482,'azelf','psychic'),
        _p(442,'spiritomb','ghost'), _p(359,'absol','dark'), _p(200,'misdreavus','ghost'),
      ], 'sinnoh'),
      _city('canalave-city', 'Canalave City', 12, 4, 'DP139', {leader:'Byron',type:'steel'}, [
        _p(208,'steelix','steel'), _p(437,'bronzong','steel'), _p(411,'bastiodon','rock'),
        _p(306,'aggron','steel'), _p(376,'metagross','steel'), _p(227,'skarmory','steel'),
      ], 'sinnoh'),
      _city('snowpoint-city', 'Snowpoint City', 13, 4, 'DP170', {leader:'Candice',type:'ice'}, [
        _p(460,'abomasnow','ice'), _p(461,'weavile','dark'), _p(471,'glaceon','ice'),
        _p(478,'froslass','ice'), _p(215,'sneasel','dark'), _p(124,'jynx','ice'),
      ], 'sinnoh'),
      _city('sunyshore-city', 'Sunyshore City', 14, 4, 'DP182', {leader:'Volkner',type:'electric'}, [
        _p(405,'luxray','electric'), _p(466,'electivire','electric'), _p(462,'magnezone','electric'),
        _p(479,'rotom','electric'), _p(26,'raichu','electric'), _p(125,'electabuzz','electric'),
      ], 'sinnoh'),
      _city('resort-area', 'Resort Area', 15, 4, null, null, [
        _p(113,'chansey','normal'), _p(242,'blissey','normal'), _p(175,'togepi','fairy'),
        _p(176,'togetic','fairy'), _p(468,'togekiss','fairy'), _p(132,'ditto','normal'),
      ], 'sinnoh'),
      _city('fight-area', 'Fight Area', 16, 5, null, null, [
        _p(445,'garchomp','dragon'), _p(448,'lucario','fighting'), _p(467,'magmortar','fire'),
        _p(466,'electivire','electric'), _p(376,'metagross','steel'), _p(248,'tyranitar','rock'),
      ], 'sinnoh'),
      _city('survival-area', 'Survival Area', 17, 5, null, null, [
        _p(146,'moltres','fire'), _p(467,'magmortar','fire'), _p(392,'infernape','fire'),
        _p(59,'arcanine','fire'), _p(485,'heatran','fire'), _p(244,'entei','fire'),
      ], 'sinnoh'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // UNOVA (20) — Gen 5 [from Agent 1 research]
  // ════════════════════════════════════════════════════════════════════
  unova: {
    name: 'Unova', gen: 'Gen 5', color: '#6B7280', icon: '🏙️',
    cities: [
      _city('nuvema-town', 'Nuvema Town', 1, 1, 'BW001', null, [
        _p(495,'snivy','grass'), _p(498,'tepig','fire'), _p(501,'oshawott','water'),
        _p(504,'patrat','normal'), _p(506,'lillipup','normal'),
      ], 'unova'),
      _city('accumula-town', 'Accumula Town', 2, 1, 'BW002', null, [
        _p(504,'patrat','normal'), _p(506,'lillipup','normal'), _p(519,'pidove','flying'),
        _p(587,'emolga','electric'), _p(511,'pansage','grass'), _p(513,'pansear','fire'),
      ], 'unova'),
      _city('striaton-city', 'Striaton City', 3, 2, 'BW009', {leader:'Cilan/Chili/Cress',type:'multi'}, [
        _p(511,'pansage','grass'), _p(513,'pansear','fire'), _p(515,'panpour','water'),
        _p(512,'simisage','grass'), _p(514,'simisear','fire'), _p(516,'simipour','water'),
      ], 'unova'),
      _city('nacrene-city', 'Nacrene City', 4, 2, 'BW019', {leader:'Lenora',type:'normal'}, [
        _p(505,'watchog','normal'), _p(508,'stoutland','normal'), _p(506,'lillipup','normal'),
        _p(263,'zigzagoon','normal'), _p(217,'ursaring','normal'), _p(241,'miltank','normal'),
      ], 'unova'),
      _city('castelia-city', 'Castelia City', 5, 2, 'BW035', {leader:'Burgh',type:'bug'}, [
        _p(542,'leavanny','bug'), _p(545,'scolipede','bug'), _p(544,'whirlipede','bug'),
        _p(543,'venipede','bug'), _p(540,'sewaddle','bug'), _p(557,'dwebble','bug'),
      ], 'unova'),
      _city('nimbasa-city', 'Nimbasa City', 6, 3, 'BW046', {leader:'Elesa',type:'electric'}, [
        _p(587,'emolga','electric'), _p(595,'joltik','bug'), _p(596,'galvantula','bug'),
        _p(311,'plusle','electric'), _p(312,'minun','electric'), _p(26,'raichu','electric'),
      ], 'unova'),
      _city('driftveil-city', 'Driftveil City', 7, 3, 'BW066', {leader:'Clay',type:'ground'}, [
        _p(530,'excadrill','ground'), _p(537,'seismitoad','water'), _p(623,'golurk','ghost'),
        _p(536,'palpitoad','water'), _p(95,'onix','rock'), _p(622,'golett','ghost'),
      ], 'unova'),
      _city('mistralton-city', 'Mistralton City', 8, 3, 'BW084', {leader:'Skyla',type:'flying'}, [
        _p(581,'swanna','water'), _p(528,'swoobat','psychic'), _p(561,'sigilyph','psychic'),
        _p(521,'unfezant','flying'), _p(178,'xatu','psychic'), _p(277,'swellow','flying'),
      ], 'unova'),
      _city('icirrus-city', 'Icirrus City', 9, 4, 'BW099', {leader:'Brycen',type:'ice'}, [
        _p(614,'beartic','ice'), _p(615,'cryogonal','ice'), _p(583,'vanillish','ice'),
        _p(584,'vanilluxe','ice'), _p(461,'weavile','dark'), _p(478,'froslass','ice'),
      ], 'unova'),
      _city('opelucid-city', 'Opelucid City', 10, 4, 'BW117', {leader:'Drayden/Iris',type:'dragon'}, [
        _p(612,'haxorus','dragon'), _p(621,'druddigon','dragon'), _p(611,'fraxure','dragon'),
        _p(610,'axew','dragon'), _p(130,'gyarados','water'), _p(373,'salamence','dragon'),
      ], 'unova'),
      _city('aspertia-city', 'Aspertia City', 11, 1, null, {leader:'Cheren',type:'normal'}, [
        _p(506,'lillipup','normal'), _p(572,'minccino','normal'), _p(510,'liepard','dark'),
        _p(504,'patrat','normal'), _p(396,'starly','flying'), _p(519,'pidove','flying'),
      ], 'unova'),
      _city('floccesy-town', 'Floccesy Town', 12, 1, null, null, [
        _p(519,'pidove','flying'), _p(504,'patrat','normal'), _p(509,'purrloin','dark'),
        _p(531,'audino','normal'), _p(548,'petilil','grass'), _p(546,'cottonee','grass'),
      ], 'unova'),
      _city('virbank-city', 'Virbank City', 13, 2, null, {leader:'Roxie',type:'poison'}, [
        _p(569,'garbodor','poison'), _p(545,'scolipede','bug'), _p(89,'muk','poison'),
        _p(109,'koffing','poison'), _p(544,'whirlipede','bug'), _p(88,'grimer','poison'),
      ], 'unova'),
      _city('lentimas-town', 'Lentimas Town', 14, 4, null, null, [
        _p(467,'magmortar','fire'), _p(631,'heatmor','fire'), _p(466,'electivire','electric'),
        _p(219,'magcargo','fire'), _p(324,'torkoal','fire'), _p(305,'lairon','steel'),
      ], 'unova'),
      _city('humilau-city', 'Humilau City', 15, 4, null, {leader:'Marlon',type:'water'}, [
        _p(564,'carracosta','water'), _p(321,'wailord','water'), _p(593,'jellicent','water'),
        _p(226,'mantine','water'), _p(320,'wailmer','water'), _p(458,'mantyke','water'),
      ], 'unova'),
      _city('lacunosa-town', 'Lacunosa Town', 16, 4, null, null, [
        _p(646,'kyurem','dragon'), _p(643,'reshiram','fire'), _p(644,'zekrom','electric'),
        _p(488,'cresselia','psychic'), _p(491,'darkrai','dark'), _p(359,'absol','dark'),
      ], 'unova'),
      _city('anville-town', 'Anville Town', 17, 3, null, null, [
        _p(100,'voltorb','electric'), _p(101,'electrode','electric'), _p(81,'magnemite','electric'),
        _p(462,'magnezone','electric'), _p(599,'klink','steel'), _p(600,'klang','steel'),
      ], 'unova'),
      _city('black-city', 'Black City', 18, 5, null, null, [
        _p(619,'mienfoo','fighting'), _p(620,'mienshao','fighting'), _p(638,'cobalion','steel'),
        _p(639,'terrakion','rock'), _p(640,'virizion','grass'), _p(642,'thundurus','electric'),
      ], 'unova'),
      _city('white-forest', 'White Forest', 19, 5, null, null, [
        _p(641,'tornadus','flying'), _p(645,'landorus','ground'), _p(648,'meloetta','psychic'),
        _p(647,'keldeo','water'), _p(494,'victini','psychic'), _p(637,'volcarona','bug'),
      ], 'unova'),
      _city('undella-town', 'Undella Town', 20, 5, null, null, [
        _p(350,'milotic','water'), _p(130,'gyarados','water'), _p(230,'kingdra','water'),
        _p(134,'vaporeon','water'), _p(121,'starmie','water'), _p(489,'phione','water'),
        _p(490,'manaphy','water'),
      ], 'unova'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // KALOS (16) — Gen 6 [from Agent 1 research]
  // ════════════════════════════════════════════════════════════════════
  kalos: {
    name: 'Kalos', gen: 'Gen 6', color: '#EC4899', icon: '🗼',
    cities: [
      _city('vaniville-town', 'Vaniville Town', 1, 1, 'XY001', null, [
        _p(650,'chespin','grass'), _p(653,'fennekin','fire'), _p(656,'froakie','water'),
        _p(661,'fletchling','flying'), _p(659,'bunnelby','normal'),
      ], 'kalos'),
      _city('aquacorde-town', 'Aquacorde Town', 2, 1, 'XY001', null, [
        _p(650,'chespin','grass'), _p(653,'fennekin','fire'), _p(656,'froakie','water'),
        _p(661,'fletchling','flying'), _p(659,'bunnelby','normal'), _p(664,'scatterbug','bug'),
      ], 'kalos'),
      _city('santalune-city', 'Santalune City', 3, 1, 'XY007', {leader:'Viola',type:'bug'}, [
        _p(666,'vivillon','bug'), _p(665,'spewpa','bug'), _p(664,'scatterbug','bug'),
        _p(543,'venipede','bug'), _p(401,'kricketot','bug'), _p(313,'volbeat','bug'),
      ], 'kalos'),
      _city('lumiose-city', 'Lumiose City', 4, 2, 'XY002', {leader:'Clemont',type:'electric'}, [
        _p(405,'luxray','electric'), _p(695,'heliolisk','electric'), _p(587,'emolga','electric'),
        _p(26,'raichu','electric'), _p(702,'dedenne','electric'), _p(137,'porygon','normal'),
      ], 'kalos'),
      _city('camphrier-town', 'Camphrier Town', 5, 2, 'XY030', null, [
        _p(83,'farfetchd','flying'), _p(58,'growlithe','fire'), _p(84,'doduo','flying'),
        _p(77,'ponyta','fire'), _p(263,'zigzagoon','normal'), _p(519,'pidove','flying'),
      ], 'kalos'),
      _city('cyllage-city', 'Cyllage City', 6, 2, 'XY047', {leader:'Grant',type:'rock'}, [
        _p(696,'tyrunt','rock'), _p(698,'amaura','rock'), _p(697,'tyrantrum','rock'),
        _p(699,'aurorus','rock'), _p(558,'crustle','bug'), _p(142,'aerodactyl','rock'),
      ], 'kalos'),
      _city('ambrette-town', 'Ambrette Town', 7, 2, 'XY039', null, [
        _p(138,'omanyte','rock'), _p(140,'kabuto','rock'), _p(345,'lileep','rock'),
        _p(347,'anorith','rock'), _p(696,'tyrunt','rock'), _p(320,'wailmer','water'),
      ], 'kalos'),
      _city('geosenge-town', 'Geosenge Town', 8, 3, 'XY060', null, [
        _p(74,'geodude','rock'), _p(524,'roggenrola','rock'), _p(95,'onix','rock'),
        _p(442,'spiritomb','ghost'), _p(337,'lunatone','rock'), _p(338,'solrock','rock'),
      ], 'kalos'),
      _city('shalour-city', 'Shalour City', 9, 3, 'XY062', {leader:'Korrina',type:'fighting'}, [
        _p(447,'riolu','fighting'), _p(448,'lucario','fighting'), _p(619,'mienfoo','fighting'),
        _p(620,'mienshao','fighting'), _p(539,'sawk','fighting'), _p(286,'breloom','grass'),
      ], 'kalos'),
      _city('coumarine-city', 'Coumarine City', 10, 3, 'XY071', {leader:'Ramos',type:'grass'}, [
        _p(673,'gogoat','grass'), _p(549,'lilligant','grass'), _p(597,'ferroseed','grass'),
        _p(598,'ferrothorn','grass'), _p(187,'hoppip','grass'), _p(470,'leafeon','grass'),
      ], 'kalos'),
      _city('laverre-city', 'Laverre City', 11, 4, 'XY091', {leader:'Valerie',type:'fairy'}, [
        _p(122,'mr-mime','psychic'), _p(700,'sylveon','fairy'), _p(282,'gardevoir','psychic'),
        _p(303,'mawile','fairy'), _p(683,'aromatisse','fairy'), _p(685,'slurpuff','fairy'),
      ], 'kalos'),
      _city('dendemille-town', 'Dendemille Town', 12, 4, 'XY093', null, [
        _p(478,'froslass','ice'), _p(460,'abomasnow','ice'), _p(583,'vanillish','ice'),
        _p(615,'cryogonal','ice'), _p(712,'bergmite','ice'), _p(713,'avalugg','ice'),
      ], 'kalos'),
      _city('anistar-city', 'Anistar City', 13, 4, 'XY100', {leader:'Olympia',type:'psychic'}, [
        _p(518,'musharna','psychic'), _p(199,'slowking','psychic'), _p(358,'chimecho','psychic'),
        _p(308,'medicham','fighting'), _p(178,'xatu','psychic'), _p(282,'gardevoir','psychic'),
      ], 'kalos'),
      _city('couriway-town', 'Couriway Town', 14, 4, 'XY110', null, [
        _p(715,'noivern','flying'), _p(714,'noibat','flying'), _p(581,'swanna','water'),
        _p(277,'swellow','flying'), _p(169,'crobat','poison'), _p(521,'unfezant','flying'),
      ], 'kalos'),
      _city('snowbelle-city', 'Snowbelle City', 15, 4, 'XY115', {leader:'Wulfric',type:'ice'}, [
        _p(713,'avalugg','ice'), _p(712,'bergmite','ice'), _p(461,'weavile','dark'),
        _p(460,'abomasnow','ice'), _p(471,'glaceon','ice'), _p(614,'beartic','ice'),
      ], 'kalos'),
      _city('kiloude-city', 'Kiloude City', 16, 5, null, null, [
        _p(706,'goodra','dragon'), _p(701,'hawlucha','fighting'), _p(282,'gardevoir','psychic'),
        _p(681,'aegislash','steel'), _p(706,'goodra','dragon'), _p(716,'xerneas','fairy'),
        _p(717,'yveltal','dark'),
      ], 'kalos'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // ALOLA (9) — Gen 7 [from Agent 2 research]
  // ════════════════════════════════════════════════════════════════════
  alola: {
    name: 'Alola', gen: 'Gen 7', color: '#F97316', icon: '🌴',
    cities: [
      _city('iki-town', 'Iki Town', 1, 1, 'SM001', {leader:'Hala',type:'fighting'}, [
        _p(56,'mankey','fighting'), _p(296,'makuhita','fighting'), _p(739,'crabrawler','fighting'),
        _p(172,'pichu','electric'), _p(722,'rowlet','grass'), _p(725,'litten','fire'),
      ], 'alola'),
      _city('hau-oli-city', 'Hau\'oli City', 2, 1, 'SM002', null, [
        _p(19,'rattata','normal'), _p(52,'meowth','normal'), _p(734,'yungoos','normal'),
        _p(735,'gumshoos','normal'), _p(235,'smeargle','normal'), _p(278,'wingull','flying'),
      ], 'alola'),
      _city('heahea-city', 'Heahea City', 3, 2, 'SM024', {leader:'Lana',type:'water'}, [
        _p(170,'chinchou','water'), _p(90,'shellder','water'), _p(752,'araquanid','water'),
        _p(25,'pikachu','electric'), _p(456,'finneon','water'), _p(72,'tentacool','water'),
      ], 'alola'),
      _city('paniola-town', 'Paniola Town', 4, 2, 'SM027', null, [
        _p(241,'miltank','normal'), _p(128,'tauros','normal'), _p(58,'growlithe','fire'),
        _p(133,'eevee','normal'), _p(672,'skiddo','grass'), _p(673,'gogoat','grass'),
      ], 'alola'),
      _city('konikoni-city', 'Konikoni City', 5, 2, 'SM028', {leader:'Olivia',type:'rock'}, [
        _p(299,'nosepass','rock'), _p(525,'boldore','rock'), _p(745,'lycanroc','rock'),
        _p(347,'anorith','rock'), _p(345,'lileep','rock'), _p(132,'ditto','normal'),
      ], 'alola'),
      _city('malie-city', 'Malie City', 6, 3, 'SM042', null, [
        _p(20,'raticate','normal'), _p(88,'grimer','poison'), _p(568,'trubbish','poison'),
        _p(81,'magnemite','electric'), _p(572,'minccino','normal'), _p(674,'pancham','fighting'),
      ], 'alola'),
      _city('tapu-village', 'Tapu Village', 7, 3, 'SM055', null, [
        _p(37,'vulpix','ice'), _p(27,'sandshrew','ice'), _p(359,'absol','dark'),
        _p(361,'snorunt','ice'), _p(279,'pelipper','flying'), _p(351,'castform','normal'),
      ], 'alola'),
      _city('po-town', 'Po Town', 8, 4, 'SM071', {leader:'Guzma',type:'bug'}, [
        _p(768,'golisopod','bug'), _p(168,'ariados','bug'), _p(284,'masquerain','bug'),
        _p(127,'pinsir','bug'), _p(212,'scizor','bug'), _p(757,'salandit','poison'),
      ], 'alola'),
      _city('seafolk-village', 'Seafolk Village', 9, 4, 'SM103', {leader:'Mina',type:'fairy'}, [
        _p(743,'ribombee','fairy'), _p(303,'mawile','fairy'), _p(210,'granbull','fairy'),
        _p(781,'dhelmise','ghost'), _p(320,'wailmer','water'), _p(142,'aerodactyl','rock'),
      ], 'alola'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // GALAR (12) — Gen 8 [from Agent 2 research]
  // ════════════════════════════════════════════════════════════════════
  galar: {
    name: 'Galar', gen: 'Gen 8', color: '#1E3A8A', icon: '🏰',
    cities: [
      _city('postwick', 'Postwick', 1, 1, null, null, [
        _p(810,'grookey','grass'), _p(813,'scorbunny','fire'), _p(816,'sobble','water'),
        _p(831,'wooloo','normal'), _p(819,'skwovet','normal'), _p(4,'charmander','fire'),
      ], 'galar'),
      _city('wedgehurst', 'Wedgehurst', 2, 1, null, null, [
        _p(79,'slowpoke','psychic'), _p(831,'wooloo','normal'), _p(819,'skwovet','normal'),
        _p(824,'blipbug','bug'), _p(263,'zigzagoon','normal'), _p(821,'rookidee','flying'),
      ], 'galar'),
      _city('motostoke', 'Motostoke', 3, 2, null, {leader:'Kabu',type:'fire'}, [
        _p(38,'ninetales','fire'), _p(59,'arcanine','fire'), _p(851,'centiskorch','fire'),
        _p(833,'chewtle','water'), _p(834,'drednaw','water'), _p(819,'skwovet','normal'),
      ], 'galar'),
      _city('turffield', 'Turffield', 4, 2, null, {leader:'Milo',type:'grass'}, [
        _p(829,'gossifleur','grass'), _p(830,'eldegoss','grass'), _p(342,'crawdaunt','water'),
        _p(264,'linoone','normal'), _p(263,'zigzagoon','normal'), _p(549,'lilligant','grass'),
      ], 'galar'),
      _city('hulbury', 'Hulbury', 5, 2, null, {leader:'Nessa',type:'water'}, [
        _p(118,'goldeen','water'), _p(846,'arrokuda','water'), _p(834,'drednaw','water'),
        _p(170,'chinchou','water'), _p(550,'basculin','water'), _p(746,'wishiwashi','water'),
      ], 'galar'),
      _city('hammerlocke', 'Hammerlocke', 6, 3, null, {leader:'Raihan',type:'dragon'}, [
        _p(884,'duraludon','steel'), _p(526,'gigalith','rock'), _p(330,'flygon','dragon'),
        _p(844,'sandaconda','ground'), _p(175,'togepi','fairy'), _p(887,'dragapult','dragon'),
      ], 'galar'),
      _city('stow-on-side', 'Stow-on-Side', 7, 3, null, {leader:'Bea/Allister',type:'fighting'}, [
        _p(237,'hitmontop','fighting'), _p(675,'pangoro','fighting'), _p(865,'sirfetchd','fighting'),
        _p(68,'machamp','fighting'), _p(778,'mimikyu','ghost'), _p(94,'gengar','ghost'),
      ], 'galar'),
      _city('ballonlea', 'Ballonlea', 8, 3, null, {leader:'Opal',type:'fairy'}, [
        _p(110,'weezing','poison'), _p(303,'mawile','fairy'), _p(468,'togekiss','fairy'),
        _p(869,'alcremie','fairy'), _p(755,'morelull','grass'), _p(708,'phantump','ghost'),
      ], 'galar'),
      _city('circhester', 'Circhester', 9, 4, null, {leader:'Gordie/Melony',type:'rock'}, [
        _p(689,'barbaracle','rock'), _p(213,'shuckle','bug'), _p(874,'stonjourner','rock'),
        _p(839,'coalossal','rock'), _p(873,'frosmoth','ice'), _p(875,'eiscue','ice'),
      ], 'galar'),
      _city('spikemuth', 'Spikemuth', 10, 4, null, {leader:'Piers',type:'dark'}, [
        _p(560,'scrafty','dark'), _p(687,'malamar','dark'), _p(435,'skuntank','dark'),
        _p(862,'obstagoon','dark'), _p(877,'morpeko','electric'), _p(510,'liepard','dark'),
      ], 'galar'),
      _city('wyndon', 'Wyndon', 11, 5, null, {leader:'Leon',type:'champion'}, [
        _p(681,'aegislash','steel'), _p(887,'dragapult','dragon'), _p(612,'haxorus','dragon'),
        _p(537,'seismitoad','water'), _p(815,'cinderace','fire'), _p(6,'charizard','fire'),
      ], 'galar'),
      _city('freezington', 'Freezington', 12, 5, null, null, [
        _p(898,'calyrex','psychic'), _p(896,'glastrier','ice'), _p(897,'spectrier','ghost'),
        _p(615,'cryogonal','ice'), _p(459,'snover','grass'), _p(478,'froslass','ice'),
      ], 'galar'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // PALDEA (12) — Gen 9 [from Agent 2 research]
  // ════════════════════════════════════════════════════════════════════
  paldea: {
    name: 'Paldea', gen: 'Gen 9', color: '#F59E0B', icon: '🥖',
    cities: [
      _city('cabo-poco', 'Cabo Poco', 1, 1, 'HZ001', null, [
        _p(906,'sprigatito','grass'), _p(909,'fuecoco','fire'), _p(912,'quaxly','water'),
        _p(917,'tarountula','bug'), _p(661,'fletchling','flying'), _p(278,'wingull','flying'),
      ], 'paldea'),
      _city('los-platos', 'Los Platos', 2, 1, 'HZ002', null, [
        _p(915,'lechonk','normal'), _p(921,'pawmi','electric'), _p(187,'hoppip','grass'),
        _p(926,'fidough','fairy'), _p(661,'fletchling','flying'), _p(270,'lotad','water'),
      ], 'paldea'),
      _city('mesagoza', 'Mesagoza', 3, 2, 'HZ003', null, [
        _p(906,'sprigatito','grass'), _p(909,'fuecoco','fire'), _p(912,'quaxly','water'),
        _p(921,'pawmi','electric'), _p(923,'pawmot','electric'), _p(925,'maushold','normal'),
        _p(1000,'gholdengo','steel'),
      ], 'paldea'),
      _city('cortondo', 'Cortondo', 4, 2, null, {leader:'Katy',type:'bug'}, [
        _p(919,'nymble','bug'), _p(917,'tarountula','bug'), _p(216,'teddiursa','normal'),
        _p(872,'snom','ice'), _p(669,'flabebe','fairy'), _p(401,'kricketot','bug'),
      ], 'paldea'),
      _city('artazon', 'Artazon', 5, 2, null, {leader:'Brassius',type:'grass'}, [
        _p(928,'smoliv','grass'), _p(548,'petilil','grass'), _p(185,'sudowoodo','rock'),
        _p(191,'sunkern','grass'), _p(192,'sunflora','grass'), _p(273,'seedot','grass'),
      ], 'paldea'),
      _city('levincia', 'Levincia', 6, 3, null, {leader:'Iono',type:'electric'}, [
        _p(940,'wattrel','electric'), _p(939,'bellibolt','electric'), _p(404,'luxio','electric'),
        _p(429,'mismagius','ghost'), _p(92,'gastly','ghost'), _p(871,'pincurchin','electric'),
      ], 'paldea'),
      _city('cascarrafa', 'Cascarrafa', 7, 3, null, {leader:'Kofu',type:'water'}, [
        _p(976,'veluza','water'), _p(961,'wugtrio','water'), _p(740,'crabominable','fighting'),
        _p(960,'wiglett','water'), _p(339,'barboach','water'), _p(211,'qwilfish','water'),
      ], 'paldea'),
      _city('porto-marinada', 'Porto Marinada', 8, 3, null, null, [
        _p(551,'sandile','ground'), _p(246,'larvitar','rock'), _p(449,'hippopotas','ground'),
        _p(632,'durant','bug'), _p(631,'heatmor','fire'), _p(451,'skorupi','poison'),
      ], 'paldea'),
      _city('medali', 'Medali', 9, 4, null, {leader:'Larry',type:'normal'}, [
        _p(775,'komala','normal'), _p(982,'dudunsparce','normal'), _p(398,'staraptor','flying'),
        _p(264,'linoone','normal'), _p(161,'sentret','normal'), _p(506,'lillipup','normal'),
      ], 'paldea'),
      _city('montenevera', 'Montenevera', 10, 4, null, {leader:'Ryme',type:'ghost'}, [
        _p(354,'banette','ghost'), _p(778,'mimikyu','ghost'), _p(972,'houndstone','ghost'),
        _p(849,'toxtricity','electric'), _p(477,'dusknoir','ghost'), _p(353,'shuppet','ghost'),
      ], 'paldea'),
      _city('alfornada', 'Alfornada', 11, 4, null, {leader:'Tulip',type:'psychic'}, [
        _p(981,'farigiraf','normal'), _p(282,'gardevoir','psychic'), _p(956,'espathra','psychic'),
        _p(671,'florges','fairy'), _p(96,'drowzee','psychic'), _p(280,'ralts','psychic'),
      ], 'paldea'),
      _city('zapapico', 'Zapapico', 12, 4, null, null, [
        _p(449,'hippopotas','ground'), _p(450,'hippowdon','ground'), _p(982,'dudunsparce','normal'),
        _p(529,'drilbur','ground'), _p(530,'excadrill','ground'), _p(95,'onix','rock'),
      ], 'paldea'),
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  // HISUI (3) — Legends Arceus [from Agent 2 research]
  // ════════════════════════════════════════════════════════════════════
  hisui: {
    name: 'Hisui', gen: 'Legends', color: '#92400E', icon: '🏯',
    cities: [
      _city('jubilife-village', 'Jubilife Village', 1, 1, null, null, [
        _p(722,'rowlet','grass'), _p(155,'cyndaquil','fire'), _p(501,'oshawott','water'),
        _p(479,'rotom','electric'), _p(425,'drifloon','ghost'), _p(412,'burmy','bug'),
        _p(399,'bidoof','normal'),
      ], 'hisui'),
      _city('diamond-settlement', 'Diamond Settlement', 2, 3, null, null, [
        _p(41,'zubat','poison'), _p(42,'golbat','poison'), _p(108,'lickitung','normal'),
        _p(463,'lickilicky','normal'), _p(401,'kricketot','bug'), _p(402,'kricketune','bug'),
        _p(95,'onix','rock'), _p(201,'unown','psychic'),
      ], 'hisui'),
      _city('pearl-settlement', 'Pearl Settlement', 3, 3, null, null, [
        _p(215,'sneasel','dark'), _p(903,'sneasler','fighting'), _p(361,'snorunt','ice'),
        _p(362,'glalie','ice'), _p(478,'froslass','ice'), _p(627,'rufflet','flying'),
        _p(550,'basculin','water'), _p(902,'basculegion','water'),
      ], 'hisui'),
    ],
  },
}

if (typeof window !== 'undefined') window.CITY_PACK = CITY_PACK
if (typeof module !== 'undefined' && module.exports) module.exports = CITY_PACK
