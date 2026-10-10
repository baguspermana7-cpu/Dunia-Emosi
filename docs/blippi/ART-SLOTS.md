# Blippi G32 - art slots

Kirim satu file per baris: **assets/blippi/<key>.webp**, ukuran piksel pada bingkai referensi 1672x941. Transparan = latar alfa (potong rapi); Opak = gambar penuh. Setelah file ada, tambahkan key ke `SHIPPED` di `games/data/blippi-art.js` dan tambahkan file ke `sw.js` SHELL. Tidak ada perubahan kode lain.

Blippi hanya dari aset pemilik (tidak digambar dari imajinasi, tidak memakai art library).

| Key | Nama slot | Layar | Ukuran (px) | Latar | Sudut pandang / pose |
|---|---|---|---|---|---|
| `bg-hub` | LATAR HUB - GARASI PENEMUAN | Hub | 1672 x 941 | Opak | Taman garasi, pandangan 3/4 dari atas, tanpa karakter dan tanpa kendaraan |
| `bg-peta` | LATAR PETA - LAUTAN | Peta | 1672 x 941 | Opak | Lautan biru dan batu karang saja; pulau terpisah (pulau-*) |
| `bg-garasi` | LATAR GARASI KENDARAAN | Kendaraan, Bengkel, Penemuan, Bermain | 1672 x 941 | Opak | Dalam garasi, lantai kosong untuk alas bundar |
| `bg-misi-kincir` | LATAR TAMAN AIR | Misi W02-M01 | 1672 x 941 | Opak | Taman air, jalan batu di depan, tanpa truk dan tanpa kincir |
| `bg-misi-jalan` | LATAR KOTA RODA - SUNGAI | Misi W01-M01 | 1672 x 941 | Opak | Sungai melintang kiri-kanan, tepi bawah dan atas rata |
| `logo-blippi` | LOGO BLIPPI | Semua layar | 250 x 140 | Transparan | Logo BLIPPI + dasi kupu-kupu, depan |
| `blippi-menunjuk` | BLIPPI - MENUNJUK | Hub, Peta, Kendaraan | 330 x 640 | Transparan | Seluruh badan, berdiri, kedua tangan menunjuk ke kanan, tersenyum |
| `blippi-potret` | BLIPPI - POTRET | Misi | 190 x 190 | Transparan | Kepala dan bahu, tersenyum, menghadap depan |
| `blippi-profil` | BLIPPI - PROFIL | Semua layar | 92 x 92 | Transparan | Kepala saja, bulat, untuk lencana profil |
| `hub-meja-peta` | MEJA PETA | Hub | 690 x 235 | Transparan | Diorama pulau di atas meja kayu, 3/4 depan |
| `hub-papan` | PAPAN PENEMUAN | Hub | 244 x 225 | Transparan | Papan kayu bergantung lampu, depan |
| `hub-garasi` | GARASI PENEMUAN | Hub | 772 x 450 | Transparan | Bangunan garasi dua pintu, depan 3/4 |
| `ikon-wall-daun` | IKON DAUN | Hub | 76 x 76 | Transparan | Ikon bulat, depan |
| `ikon-wall-cakar` | IKON CAKAR | Hub | 76 x 76 | Transparan | Ikon bulat, depan |
| `ikon-wall-planet` | IKON PLANET | Hub | 76 x 76 | Transparan | Ikon bulat, depan |
| `ikon-wall-dino` | IKON DINO | Hub | 76 x 76 | Transparan | Ikon bulat, depan |
| `ikon-wall-gerigi` | IKON RODA GIGI | Hub | 76 x 76 | Transparan | Ikon bulat, depan |
| `veh-buggy` | BUGGY - 3/4 DEPAN | Hub, Kendaraan | 750 x 450 | Transparan | Tiga perempat depan-kiri, di atas tanah rata, bayangan lembut |
| `veh-truk-air` | TRUK AIR - 3/4 DEPAN | Kendaraan | 750 x 450 | Transparan | Tiga perempat depan-kiri |
| `veh-excavator` | EXCAVATOR - 3/4 DEPAN | Kendaraan | 750 x 450 | Transparan | Tiga perempat depan-kiri, bucket di depan |
| `thumb-buggy` | BUGGY | Kendaraan | 190 x 120 | Transparan | Kartu pilihan, tiga perempat |
| `thumb-truk-air` | TRUK AIR | Kendaraan | 190 x 120 | Transparan | Kartu pilihan, tiga perempat |
| `thumb-excavator` | EXCAVATOR | Kendaraan | 190 x 120 | Transparan | Kartu pilihan, tiga perempat |
| `modul-pompa` | MODUL POMPA | Kendaraan, Bengkel | 190 x 130 | Transparan | Pompa air biru-oranye dengan selang kuning |
| `modul-semprot` | MODUL SEMPROT | Kendaraan, Bengkel | 190 x 130 | Transparan | Nozzle semprot dengan percikan air |
| `modul-ban-jalan` | MODUL BAN JALAN | Kendaraan, Bengkel | 190 x 130 | Transparan | Ban halus, miring |
| `modul-ban-berpola` | MODUL BAN BERPOLA | Kendaraan, Bengkel | 190 x 130 | Transparan | Ban bergerigi, miring |
| `modul-bucket-sempit` | MODUL BUCKET SEMPIT | Kendaraan, Bengkel | 190 x 130 | Transparan | Bucket sempit, samping |
| `modul-bucket-lebar` | MODUL BUCKET LEBAR | Kendaraan, Bengkel | 190 x 130 | Transparan | Bucket lebar, samping |
| `pulau-kota-roda` | PULAU KOTA RODA | Peta | 640 x 250 | Transparan | Pulau kota, derek, jembatan; pandangan 3/4 dari atas |
| `pulau-taman-air` | PULAU TAMAN AIR | Peta | 480 x 215 | Transparan | Pulau dengan kincir MATI (diam) |
| `pulau-taman-air-aktif` | PULAU TAMAN AIR - KINCIR AKTIF | Peta | 480 x 215 | Transparan | Pulau yang sama, air mengalir dan pancuran menyala |
| `pulau-eco-park` | PULAU ECO PARK | Peta | 560 x 300 | Transparan | Pulau daur ulang dan taman bermain |
| `pulau-kebun-ceria` | PULAU KEBUN CERIA | Peta | 560 x 330 | Transparan | Pulau kebun, lumbung merah, traktor |
| `pulau-pelabuhan` | PULAU PELABUHAN | Peta | 480 x 300 | Transparan | Pulau pelabuhan, kapal, mercusuar |
| `pulau-wonder-lab` | PULAU WONDER LAB | Peta | 510 x 310 | Transparan | Pulau kubah penemuan dan lintasan |
| `thumb-taman-air` | TAMAN AIR | Peta, Kendaraan | 150 x 100 | Opak | Kincir air kecil, bingkai persegi |
| `thumb-jalan-pertamaku` | JALAN PERTAMAKU | Hub, Peta | 165 x 150 | Opak | Jembatan kayu di atas sungai kecil |
| `nav-peta` | IKON PETA | Navigasi | 130 x 110 | Transparan | Peta lipat dengan pin oranye |
| `nav-kendaraan` | IKON KENDARAAN | Navigasi | 130 x 110 | Transparan | Buggy kecil, 3/4 depan |
| `nav-bengkel` | IKON BENGKEL | Navigasi | 130 x 110 | Transparan | Kunci inggris dan obeng bersilang |
| `nav-penemuan` | IKON PENEMUAN | Navigasi | 130 x 110 | Transparan | Kaca pembesar dengan bintang |
| `nav-bermain` | IKON BERMAIN | Navigasi | 130 x 110 | Transparan | Tanjakan kayu dan kerucut |
| `veh-truk-air-sisi` | TRUK AIR - SAMPING | Misi W02-M01 | 760 x 495 | Transparan | Tiga perempat samping kiri, gulungan selang di belakang kabin, menghadap kiri |
| `prop-kincir-rumah` | KINCIR AIR - BANGUNAN | Misi W02-M01, Peta | 690 x 500 | Transparan | Rumah kincir dan kolam TANPA roda (roda terpisah) |
| `prop-kincir-roda` | RODA KINCIR | Misi W02-M01 | 400 x 400 | Transparan | Roda kayu, depan lurus, titik tengah di tengah gambar (berputar) |
| `prop-pipa` | PIPA MASUK | Misi W02-M01 | 150 x 300 | Transparan | Pipa biru tegak dengan lubang masuk di sisi kiri |
| `prop-selang-ujung` | UJUNG SELANG | Misi W02-M01 | 120 x 80 | Transparan | Kepala sambungan oranye, menghadap kanan |
| `prop-katup` | KATUP | Misi W02-M01 | 100 x 100 | Transparan | Katup roda merah di pipa biru |
| `prop-pompa-truk` | POMPA DI TRUK | Misi W02-M01 | 180 x 120 | Transparan | Pompa terpasang, depan |
| `tool-selang` | SELANG | Misi W02-M01 | 150 x 100 | Transparan | Gulungan selang kuning |
| `tool-katup` | KATUP | Misi W02-M01 | 150 x 100 | Transparan | Katup roda merah |
| `tool-pompa` | POMPA | Misi W02-M01 | 150 x 100 | Transparan | Pompa air biru-oranye |
| `stiker-kincir` | STIKER KINCIR | Misi W02-M01, Penemuan | 220 x 220 | Transparan | Stiker bulat kincir air |
| `prop-papan` | PAPAN JEMBATAN | Misi W01-M01 | 130 x 56 | Transparan | Papan kayu, pandangan atas, melintang |
| `veh-buggy-misi` | BUGGY - SAMPING | Misi W01-M01 | 200 x 130 | Transparan | Samping/atas-miring, menghadap atas layar |
| `prop-paket` | PAKET | Misi W01-M01 | 90 x 80 | Transparan | Kotak hadiah |
| `prop-bendera` | BENDERA TUJUAN | Misi W01-M01 | 70 x 110 | Transparan | Bendera di tiang |
| `prop-jalur-taman` | JALUR TAMAN | Misi W01-M01 | 420 x 120 | Transparan | Jalan taman kecil yang muncul setelah selesai |
| `tool-papan` | PAPAN | Misi W01-M01 | 150 x 100 | Transparan | Tumpukan papan kayu |
| `tool-jalan` | JALAN | Misi W01-M01 | 150 x 100 | Transparan | Pedal gas / buggy kecil |
| `tool-paket` | PAKET | Misi W01-M01 | 150 x 100 | Transparan | Kotak hadiah |
| `stiker-buggy` | STIKER BUGGY | Misi W01-M01, Penemuan | 220 x 220 | Transparan | Stiker bulat buggy |
| `yard-tanjakan` | TANJAKAN | Bermain | 300 x 140 | Transparan | Tanjakan kayu, samping |
| `yard-kerucut` | KERUCUT | Bermain | 70 x 90 | Transparan | Kerucut oranye, depan |

Total: 65 slot.
