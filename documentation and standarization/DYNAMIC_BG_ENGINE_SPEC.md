Saya memiliki game balapan kereta. Saat ini background game terasa terlalu gelap / dark mode terus dan kurang hidup. Saya ingin Anda mengembangkan **Dynamic Train Racing Background Engine** yang mampu menghasilkan suasana perjalanan kereta yang dinamis, random, detail, presisi, dan terasa seperti melewati stasiun serta kota nyata di Indonesia maupun luar negeri.

Tujuan utama enhancement ini adalah membuat background game balapan kereta menjadi lebih hidup, immersive, dan tidak monoton. Background harus bisa berubah berdasarkan waktu, cuaca, lokasi, rute, tipe stasiun, suasana kota, NPC, landscape, landmark, audio ambience, lighting, dan visual effect. Jangan hanya mengganti warna langit. Engine harus terasa seperti perjalanan kereta sungguhan dari satu stasiun ke stasiun lain.

## 1. Objective

Bangun sistem background engine untuk game balapan kereta dengan kemampuan berikut:

1. Randomisasi suasana waktu:

   * Pagi
   * Siang
   * Sore
   * Petang / senja
   * Malam
   * Dini hari
   * Golden hour
   * Blue hour

2. Randomisasi cuaca:

   * Cerah
   * Berawan
   * Mendung
   * Hujan ringan
   * Hujan deras
   * Gerimis
   * Kabut tipis
   * Kabut tebal
   * Setelah hujan / wet road reflection
   * Panas tropis
   * Angin kencang ringan
   * Badai ringan khusus level tertentu

3. Sistem lokasi dan stasiun:

   * Stasiun Indonesia: Surabaya, Jakarta, Bandung, Yogyakarta, Semarang, Malang, Solo, Cirebon, Medan, Padang, Palembang, Makassar, dll.
   * Stasiun luar negeri: Tokyo, Osaka, London, Paris, Zurich, New York, Seoul, Bangkok, Kuala Lumpur, Singapore, dll.
   * Setiap kota harus punya landscape, budaya visual, signage, NPC, bangunan, suasana, dan landmark yang relevan.

4. Dynamic journey:

   * Pemain tidak hanya melihat satu background statis.
   * Background harus memberi rasa perjalanan dari area luar kota → pinggiran kota → area urban → mendekati stasiun → masuk area stasiun → keluar lagi.
   * Setiap level/rute harus terasa punya identitas.

## 2. Core Design Principle

Engine harus dibuat berbasis modular layer, bukan hardcoded background tunggal.

Gunakan pendekatan:

* Sky layer
* Far background layer
* Mid background layer
* Near trackside layer
* Track layer
* Station foreground layer
* NPC layer
* Weather FX layer
* Lighting overlay
* Particle FX layer
* Audio ambience layer
* Event trigger layer

Setiap layer harus bisa diganti, dikombinasikan, dan di-randomize berdasarkan rule.

Contoh:
Jika lokasi = Surabaya, waktu = sore, cuaca = hujan ringan, area = approaching station, maka background harus menghasilkan:

* Langit jingga keabu-abuan
* Jalan dan atap bangunan tampak basah
* Refleksi lampu di permukaan
* Landmark Surabaya secara subtle
* NPC membawa payung
* Signage stasiun menggunakan gaya lokal
* Suasana kota padat tapi tidak berlebihan
* Lighting warm + wet reflection
* Audio ambience hujan, pengeras suara stasiun, suara roda kereta, suara kota

## 3. Time-of-Day System

Buat sistem waktu yang mempengaruhi warna, lighting, shadow, visibility, NPC behavior, traffic density, dan ambience.

### Pagi

Visual:

* Langit biru muda / orange soft
* Cahaya matahari rendah dari samping
* Shadow panjang dan soft
* Kabut tipis di area pinggiran
* Aktivitas NPC mulai ramai

NPC:

* Penumpang berangkat kerja
* Pedagang membuka kios
* Petugas stasiun membersihkan area
* Anak sekolah / commuter

Audio:

* Burung
* Announcement stasiun
* Suara kendaraan mulai ramai
* Kereta commuter lewat

### Siang

Visual:

* Cahaya terang
* Shadow pendek
* Warna lebih kontras
* Heat haze ringan pada area rel
* Langit cerah atau sedikit berawan

NPC:

* Penumpang normal
* Petugas stasiun aktif
* Pedagang / kios ramai
* Kendaraan lebih padat di background kota

Audio:

* Suara kota lebih jelas
* Klakson jauh
* Announcement
* Mesin / roda kereta

### Sore

Visual:

* Cahaya warm
* Langit kuning ke orange
* Shadow panjang
* Refleksi kaca gedung lebih kuat
* Area stasiun mulai padat

NPC:

* Commuter pulang kerja
* Penumpang lebih banyak
* Orang menunggu di peron
* Pedagang lebih aktif

Audio:

* Keramaian stasiun meningkat
* Announcement lebih sering
* Suara crowd

### Petang / Senja

Visual:

* Langit orange, ungu, biru gelap
* Lampu jalan mulai menyala
* Lampu stasiun mulai dominan
* Kontras antara cahaya natural dan lampu buatan

NPC:

* Penumpang rush hour
* Banyak siluet manusia
* Petugas dengan rompi reflektif

Audio:

* Crowd lebih padat
* Suara kendaraan
* Announcement stasiun
* Bell crossing / palang kereta

### Malam

Visual:

* Langit gelap tapi tidak monoton
* Lampu stasiun, lampu kota, neon sign, lampu kendaraan
* Refleksi pada rel dan permukaan basah bila hujan
* Jangan membuat semua gelap. Harus tetap playable dan visual readable.
* Gunakan contrast, rim light, dan highlight.

NPC:

* Penumpang lebih sedikit di area tertentu
* Petugas keamanan
* Pedagang malam
* Commuter malam

Audio:

* Suara malam kota
* Announcement lebih echo
* Jangkrik / ambience malam untuk area non-urban
* Suara listrik / lampu / distant traffic

## 4. Weather System

Weather bukan hanya overlay partikel. Weather harus mempengaruhi lighting, NPC, ground, audio, visibility, dan gameplay feel.

### Cerah

* Langit bersih
* Cloud kecil
* Shadow jelas
* Warna lebih vibrant
* NPC normal

### Berawan

* Lighting lebih soft
* Shadow lebih diffuse
* Warna sedikit muted
* Awan bergerak pelan

### Mendung

* Langit abu-abu
* Cahaya redup
* Mood lebih berat
* Angin ringan
* NPC mulai membawa payung / jaket

### Gerimis / Hujan Ringan

* Rain particle halus
* Wet surface
* Refleksi lampu
* NPC menggunakan payung
* Efek cipratan kecil dari roda kereta
* Audio rain light + wheel wet track

### Hujan Deras

* Rain particle lebih padat
* Visibility berkurang tapi tetap playable
* Water streak di foreground
* Splash effect
* NPC berlindung di kanopi
* Lampu kendaraan/stasiun lebih dominan
* Audio hujan deras, thunder distant optional

### Kabut

* Depth visibility berkurang
* Far background fade
* Lighting lebih diffuse
* Cocok untuk area pegunungan, pagi, atau luar kota

## 5. Location-Based Background Identity

Setiap kota/stasiun harus punya identity pack.

Buat sistem `LocationTheme` yang berisi:

* City name
* Country
* Station type
* Architectural style
* Landmark list
* Trackside objects
* NPC archetypes
* Signage style
* Vegetation style
* Road/traffic style
* Platform detail
* Local color palette
* Audio ambience
* Weather tendency
* Special events
* Cultural details
* Do-not-use list agar tidak salah representasi

## 6. Indonesia Station Themes

### Surabaya Level

Untuk level Surabaya, background harus terasa seperti Surabaya, bukan kota generik.

Gunakan elemen visual seperti:

* Nuansa kota besar Jawa Timur
* Landmark Surabaya secara subtle dan tidak berlebihan:

  * Tugu Pahlawan
  * Jembatan Suramadu di far background untuk scene tertentu
  * Gedung kolonial / heritage
  * Area urban padat
  * Jalan besar dengan kendaraan
  * Bangunan ruko, kantor, hotel, dan area komersial
  * Elemen sungai / Kalimas untuk variasi background tertentu
* Stasiun bisa mengambil inspirasi dari karakter visual:

  * Surabaya Gubeng
  * Surabaya Pasar Turi
  * Area peron besar
  * Kanopi stasiun
  * Signage KAI style
  * Papan nama stasiun
  * Lampu peron
  * Area crossing
  * Petugas stasiun

NPC Surabaya:

* Penumpang commuter
* Keluarga membawa koper
* Pedagang makanan/minuman
* Petugas KAI
* Ojek online / kendaraan di background
* Security
* Orang membawa payung saat hujan
* Penumpang menunggu di bangku peron

Landscape Surabaya:

* Urban flat city
* Gedung menengah dan tinggi
* Ruko padat
* Jalan besar
* Traffic padat sedang
* Area heritage
* Billboard lokal
* Vegetasi tropis
* Lampu jalan perkotaan

Detail suasana:

* Pagi: commuter berangkat kerja, langit cerah tropis
* Siang: panas, bright, sedikit heat haze
* Sore: golden light di gedung dan rel
* Petang: lampu kota mulai menyala, stasiun ramai
* Malam: lampu peron, lampu jalan, signage, city light
* Hujan: permukaan rel dan platform basah, NPC pakai payung, refleksi lampu

### Jakarta Level

Elemen:

* Skyline gedung tinggi
* Jalan layang / flyover
* KRL / commuter feel
* Traffic padat
* Signage urban
* Jembatan penyeberangan
* Area stasiun besar
* Billboard digital

NPC:

* Pekerja kantor
* Commuter rush hour
* Security
* Pedagang kecil
* Penumpang dengan backpack/laptop bag

### Bandung Level

Elemen:

* Nuansa pegunungan
* Udara lebih sejuk
* Bangunan art deco / heritage
* Pohon rindang
* Distant mountain layer
* Jalan kota yang lebih compact
* Kabut pagi memungkinkan

NPC:

* Wisatawan
* Mahasiswa
* Commuter
* Pedagang lokal

### Yogyakarta Level

Elemen:

* Nuansa heritage dan budaya
* Bangunan rendah
* Signage lokal
* Malioboro-inspired commercial street secara subtle
* Becak/andong sebagai background detail
* Pohon besar dan lampu jalan khas
* Suasana turis dan keluarga

NPC:

* Wisatawan
* Keluarga
* Backpacker
* Pedagang lokal
* Petugas stasiun

### Semarang Level

Elemen:

* Kota pesisir
* Heritage building
* Area kota lama inspired background
* Jalan besar dan pelabuhan jauh
* Cuaca panas lembap
* Potential coastal haze

### Malang Level

Elemen:

* Pegunungan
* Kota lebih sejuk
* Pohon besar
* Bangunan kolonial
* Kabut pagi
* Landscape hijau

## 7. International Station Themes

### Tokyo Level

Elemen:

* Urban dense city
* Neon sign
* High-rise building
* Clean platform
* Digital signage
* Vending machine
* Precise train station feel
* Cherry blossom optional for special season
* Rainy night with neon reflection

NPC:

* Office workers
* Students
* Tourists
* Station staff
* People queuing neatly

### London Level

Elemen:

* Brick buildings
* Victorian station architecture
* Overcast weather
* Rain common
* Red bus in far background
* Old-new city mix
* Warm station lights

NPC:

* Commuters with coat
* Tourists
* Station staff
* People with umbrella

### Zurich / Swiss Level

Elemen:

* Clean station
* Mountain far background
* Lake/river optional
* Snow weather optional
* Precise signage
* Modern European rail feel

NPC:

* Commuters
* Tourists
* Cyclists in background
* Station staff

### New York Level

Elemen:

* Dense urban skyline
* Elevated rail / bridge background
* Yellow taxi far background
* Large station signage
* Night city light
* Steam vent optional

NPC:

* Busy commuters
* Tourists
* Street vendors
* Police/security

## 8. Journey Phase System

Background harus berubah berdasarkan fase perjalanan:

1. Departure Station

   * Platform visible
   * NPC ramai
   * Announcement
   * Train starts accelerating
   * Station signage visible

2. Urban Exit

   * Building dense
   * Roads, cars, bridges
   * Trackside wall, signal, utility pole

3. Suburban / Industrial

   * Warehouse
   * Small houses
   * Factories
   * Railway crossing
   * Vegetation mixed

4. Countryside / Open Area

   * Sawah / fields / hills / rivers
   * Fewer buildings
   * More sky visibility
   * Birds, trees, small houses

5. Landmark Segment

   * Landmark city appears in far or mid background
   * Should not block gameplay
   * Should feel iconic but natural

6. Approaching Station

   * More tracks
   * Signal gantry
   * Yard
   * Slow increase of station objects
   * More lights and platforms

7. Arrival Station

   * Platform, NPC, signage, roof, benches, kiosk
   * Audio announcement
   * Crowd loop
   * Optional stopping or checkpoint event

## 9. Procedural Background Layering

Implement background using parallax layers:

* Layer 0: Sky gradient / stars / clouds / sun / moon
* Layer 1: Far landscape: mountains, skyline, landmark silhouette
* Layer 2: Mid cityscape: buildings, bridges, trees, station structures
* Layer 3: Trackside objects: poles, fences, signals, signage, small houses
* Layer 4: Foreground: platform edge, NPC, rain streak, passing objects
* Layer 5: Weather FX
* Layer 6: Lighting / color grading overlay
* Layer 7: UI-safe readability overlay if required

Each layer must have:

* Scroll speed multiplier
* Spawn probability
* Location tag
* Time compatibility
* Weather compatibility
* Density
* Priority
* Performance budget
* Asset fallback

Example:

```json
{
  "layer": "mid_cityscape",
  "location": "surabaya",
  "timeOfDay": ["afternoon", "sunset", "night"],
  "weather": ["clear", "cloudy", "light_rain"],
  "assets": ["surabaya_ruko_block_01", "surabaya_heritage_building_02", "surabaya_midrise_01"],
  "scrollSpeed": 0.45,
  "density": "medium",
  "spawnRule": "weighted_random",
  "avoidRepeatingWithinSeconds": 20
}
```

## 10. NPC System

NPC harus dinamis dan sesuai lokasi, waktu, cuaca, dan stasiun.

NPC types:

* Commuter
* Family passenger
* Tourist
* Student
* Office worker
* Station staff
* Security
* Vendor
* Cleaner
* Mechanic / rail worker
* Driver / motorcycle / car in far background
* Umbrella NPC during rain
* Night security NPC
* Queueing passenger
* Sitting passenger
* Running late passenger

NPC behavior:

* Waiting
* Walking
* Looking at phone
* Carrying luggage
* Opening umbrella
* Buying food
* Talking
* Sitting
* Boarding
* Waving
* Taking photo
* Avoid track area
* Shelter under canopy during rain

NPC rule examples:

* If weather = rain, increase umbrella NPC and reduce open-area NPC.
* If time = morning, increase office worker and student NPC.
* If time = evening, increase commuter crowd.
* If station = tourist city, increase tourist/family NPC.
* If station = Japan, NPC queuing should be more orderly.
* If station = Indonesia, include realistic mix of families, commuter, staff, vendor, online transport in background.

NPC must never disturb core gameplay visibility.

## 11. Lighting and Color Grading

Buat sistem lighting overlay yang mengubah mood tanpa mengganggu gameplay.

Parameters:

* Ambient color
* Directional light color
* Shadow opacity
* Contrast
* Saturation
* Fog density
* Bloom level
* Wet reflection strength
* Night readability boost
* UI contrast safety

Rules:

* Night mode must not become full black.
* Rainy night must show reflective surfaces and light sources.
* Daytime must not be overexposed.
* Fog must not hide obstacles or important gameplay objects.
* Use palette per location and time.

## 12. Weather FX Details

Weather FX must support:

* Rain particle angle affected by train speed
* Rain streak on foreground
* Splash from rail side
* Wet platform reflection
* Puddle highlight
* Distant lightning for storm scenes
* Cloud movement
* Fog depth
* Heat haze for hot afternoon scenes
* Snow only for suitable international/cold-region levels
* Dust light effect for dry rural scenes

Weather should be scalable:

* Low quality mode
* Medium quality mode
* High quality mode

## 13. Audio Ambience System

Background engine must also trigger audio ambience.

Audio layers:

* Train wheel rhythm
* Track joint sound
* Station announcement
* Crowd murmur
* City traffic
* Rain
* Thunder
* Birds
* Night ambience
* Crossing bell
* Platform warning sound
* Wind
* Distant train horn

Location-specific examples:

* Surabaya: urban traffic, Indonesian station announcement style, crowd, tropical rain.
* Bandung: birds, softer city ambience, mountain wind, station crowd.
* Tokyo: electronic chime, orderly crowd, digital announcement feel.
* London: rain, station echo, urban ambience.
* Zurich: clean station ambience, light wind, distant mountain/city ambience.

Audio must fade smoothly between journey phases.

## 14. Station Signage and Localization

Implement station signage system:

* Station name board
* Direction board
* Platform number
* Warning signs
* Local language style
* Country-appropriate typography
* KAI-inspired style for Indonesia
* JR-inspired style for Japan
* European-style station board for Europe
* UK-style signage for London
* Do not use copyrighted logos directly unless assets are licensed. Use inspired fictional equivalent if necessary.

For Indonesia:

* Use Bahasa Indonesia on signs:

  * “Jalur 1”
  * “Peron”
  * “Keluar”
  * “Kedatangan”
  * “Keberangkatan”
  * “Dilarang Melintas”
  * “Hati-Hati Kereta Api”
* Include local station boards with city names.

## 15. Landmark Accuracy and Safety

Landmarks must be used carefully:

* Do not over-clutter.
* Do not put landmark unrealistically directly beside track unless stylized intentionally.
* Use far background or mid background where appropriate.
* Maintain visual identity without breaking gameplay.
* If exact accuracy is not possible, use “inspired by” version.
* Keep asset licensing clean.
* Do not use copyrighted brand logos unless allowed.

## 16. Asset Naming Convention

Use consistent asset naming:

Format:
`country_city_area_type_variant_time_weather`

Examples:

* `id_surabaya_far_skyline_01_sunset_clear`
* `id_surabaya_mid_ruko_02_day_cloudy`
* `id_surabaya_station_platform_01_night_rain`
* `id_surabaya_npc_commuter_umbrella_01`
* `jp_tokyo_station_neon_01_night_rain`
* `uk_london_brick_station_01_cloudy`
* `ch_zurich_mountain_far_01_morning_clear`

## 17. Data Structure Requirement

Create a JSON-based configuration system so new cities/stations can be added without rewriting engine code.

Example schema:

```json
{
  "locationId": "id_surabaya",
  "displayName": "Surabaya",
  "country": "Indonesia",
  "stationInspiredBy": ["Surabaya Gubeng", "Surabaya Pasar Turi"],
  "climateProfile": "tropical_urban",
  "defaultWeatherWeights": {
    "clear": 0.35,
    "cloudy": 0.25,
    "light_rain": 0.2,
    "heavy_rain": 0.1,
    "fog": 0.05,
    "storm": 0.05
  },
  "timeOfDayWeights": {
    "morning": 0.2,
    "day": 0.25,
    "afternoon": 0.2,
    "sunset": 0.15,
    "night": 0.2
  },
  "landmarks": [
    {
      "name": "Tugu Pahlawan inspired silhouette",
      "layer": "far_background",
      "spawnChance": 0.2,
      "allowedPhases": ["urban_exit", "approaching_station"],
      "timeCompatibility": ["morning", "day", "afternoon", "sunset"],
      "weatherCompatibility": ["clear", "cloudy", "light_rain"]
    },
    {
      "name": "Suramadu Bridge inspired far silhouette",
      "layer": "far_background",
      "spawnChance": 0.15,
      "allowedPhases": ["landmark_segment"],
      "timeCompatibility": ["morning", "sunset", "night"],
      "weatherCompatibility": ["clear", "cloudy"]
    }
  ],
  "npcProfiles": {
    "morning": ["office_worker", "student", "commuter", "station_staff"],
    "day": ["family_passenger", "vendor", "station_staff", "tourist"],
    "evening": ["commuter", "security", "vendor", "family_passenger"],
    "rain": ["umbrella_commuter", "sheltering_passenger", "raincoat_staff"]
  },
  "audioProfile": {
    "station": ["indonesian_announcement", "crowd_medium", "train_chime"],
    "urban": ["traffic_medium", "distant_horn", "city_murmur"],
    "rain": ["tropical_rain_light", "wet_track_wheel"]
  }
}
```

## 18. Randomization Logic

Randomization must be controlled, not chaotic.

Implement:

* Weighted random
* Seeded random for replayable levels
* No excessive repetition
* Avoid incompatible combinations
* Biome/weather compatibility
* Time/weather compatibility
* Performance-aware asset selection
* Dynamic transition between phases

Rules:

* Snow must not appear in Surabaya unless special fantasy event.
* Heavy fog should be rare in hot urban noon.
* Rainy night should increase light reflection.
* Morning should have more low-angle sunlight.
* Tourist city should have more tourist NPC.
* Business district should have more office worker NPC.
* Rural segment should reduce high-rise buildings.

## 19. Gameplay Readability Rules

Background must never reduce gameplay quality.

Mandatory:

* Track must remain clearly visible.
* Train and obstacle silhouettes must remain readable.
* Important pickups, hazards, or UI must not blend with background.
* Rain/fog must not obscure gameplay-critical objects.
* NPC and foreground detail must not confuse player as obstacle unless designed as obstacle.
* Add contrast safety layer if needed.
* Provide accessibility option:

  * Reduce weather particles
  * Reduce background motion
  * High contrast track
  * Disable lightning flash
  * Disable heavy crowd
  * Reduce parallax

## 20. Performance Requirements

Engine must support performance scaling.

Quality levels:

### Low

* Static sky gradient
* Limited parallax
* Low particle count
* Reduced NPC animation
* Fewer reflection effects

### Medium

* Multi-layer parallax
* Moderate particle
* Basic NPC animation
* Basic lighting overlay

### High

* Full parallax
* Dynamic lighting
* Animated NPC
* Wet reflection
* Weather particles
* Landmark variation
* Audio layering

Optimization:

* Object pooling for NPC, particles, trackside objects
* Preload assets by route
* Lazy-load next station theme
* Limit overdraw
* Use sprite atlas
* Use LOD for background objects
* Avoid spawning too many high-detail assets at once

## 21. Transition System

Transitions must be smooth:

* Time transition: gradual color change
* Weather transition: cloud increase before rain
* Location transition: rural → suburban → urban → station
* Audio transition: crossfade
* Lighting transition: interpolate
* NPC density transition: gradual increase near station

Do not abruptly switch background unless it is a level cutscene or portal/event.

## 22. Event System

Add optional random events:

* Train passes bridge
* Passing another train
* Railway crossing with cars waiting
* Sudden rain starts
* Sun breaks through clouds
* Entering tunnel
* Exiting tunnel to bright city
* Passing river
* Passing landmark
* Station announcement
* Crowd wave near platform
* Fireworks for special festival event
* Seasonal decoration
* Maintenance crew near track but safely outside gameplay lane

Events must be visual/ambience enhancement only unless explicitly tied to gameplay.

## 23. Example Scenario: Surabaya Sunset Light Rain

Create one complete demo scene:

Location:

* Surabaya, Indonesia

Journey phase:

* Approaching station

Time:

* Sunset / petang

Weather:

* Light rain

Visual:

* Orange-grey sky
* Wet rail reflection
* City buildings and ruko in mid background
* Subtle Tugu Pahlawan silhouette far background
* Suramadu bridge silhouette optional, very far and low opacity
* KAI-inspired station signage
* Platform lights starting to glow
* Rain particles diagonal
* NPC with umbrella under canopy
* Security/station staff near platform
* Small kiosks or vending area
* Traffic lights and vehicles in far background
* Puddle reflection on platform edge

Audio:

* Light tropical rain
* Crowd murmur
* Indonesian-style station announcement
* Wet train wheel sound
* Distant traffic

Performance:

* Must run smoothly
* Keep track and train readable
* Rain must not block player view

## 24. Deliverables Required from You

Please produce:

1. Technical architecture for the Dynamic Train Racing Background Engine.
2. Data model / JSON schema for location themes, time, weather, NPC, audio, and journey phases.
3. Procedural generation logic / pseudocode.
4. Asset list and naming convention.
5. Minimum 5 sample city/station configs:

   * Surabaya
   * Jakarta
   * Bandung
   * Yogyakarta
   * Tokyo
6. One complete implemented sample scene:

   * Surabaya sunset light rain approaching station.
7. Performance optimization plan.
8. Acceptance criteria.
9. Testing checklist.
10. Edge case handling.

## 25. Acceptance Criteria

This enhancement is accepted only if:

* Background is no longer always dark.
* Game can randomly generate morning/day/afternoon/sunset/night.
* Weather changes visually and affects ambience.
* Surabaya level feels recognizably Surabaya, not generic city.
* NPC behavior changes by time/weather/location.
* Station approach feels like real journey progression.
* Landmark usage is subtle and believable.
* Gameplay readability is preserved.
* Engine supports new city/station configs without hardcoding.
* Performance remains stable on target device.
* There is a fallback asset system if some assets are missing.
* Audio ambience changes smoothly by location/time/weather.
* The system is documented clearly for future expansion.

## 26. Important Instruction

Do not give a shallow implementation. Do not just make “background random color”. Build this as a reusable engine/module.

The final result should make the game feel like a train racing journey across different real-world-inspired locations, where every city has its own identity, every station feels alive, and every time/weather condition creates a distinct atmosphere while still keeping the racing gameplay clear and responsive.

