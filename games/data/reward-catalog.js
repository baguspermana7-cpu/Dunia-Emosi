/* =============================================================================
 * reward-catalog.js  (v54.78 — sticker / badge / horn unlock metadata)
 * =============================================================================
 * Maps each reward ID to display metadata (icon, name, description).
 * Used by the Koleksi (Collection) modal to render earned + locked placeholders.
 *
 * Each entry: { id, icon, name, description, category }
 * categories: 'route', 'kindness', 'mastery', 'horn', 'badge'
 *
 * To add: simply extend the array; new IDs auto-render as locked placeholders
 * until the obstacle that rewards them is completed.
 * ========================================================================== */

;(function (global) {
  'use strict'

  global.RewardCatalog = {

    stickers: [
      // Route-themed (earned via station_cargo_sort_color in scripted routes)
      { id:'surabaya_helper',    icon:'🏆', name:'Surabaya Helper',     description:'Selesaikan tugas sortir di Stasiun Surabaya', category:'route' },
      { id:'jakarta_komuter',    icon:'🚉', name:'Jakarta Komuter',     description:'Jemput penumpang di Stasiun Jakarta',         category:'route' },
      { id:'bandung_pendaki',    icon:'⛰️', name:'Bandung Pendaki',     description:'Selesaikan rute pegunungan Bandung',         category:'route' },
      { id:'yogya_budaya',       icon:'🏛️', name:'Yogya Budaya',        description:'Lewati Tugu & Malioboro',                    category:'route' },
      { id:'semarang_pelabuhan', icon:'⚓', name:'Semarang Pelabuhan',  description:'Bersihkan jalur menuju pelabuhan',           category:'route' },
      // Kindness-themed (will be wired when animal_crossing rewards add stickers in future)
      { id:'kindness_star',      icon:'⭐', name:'Bintang Kebaikan',    description:'Bantu hewan menyeberang dengan aman',         category:'kindness' },
    ],

    badges: [
      { id:'surabaya_explorer',         icon:'🏅', name:'Surabaya Explorer',         description:'Selesaikan rute Surabaya',         category:'route' },
      { id:'jakarta_explorer',          icon:'🏅', name:'Jakarta Explorer',          description:'Selesaikan rute Jakarta',          category:'route' },
      { id:'bandung_explorer',          icon:'🏅', name:'Bandung Explorer',          description:'Selesaikan rute Bandung',          category:'route' },
      { id:'yogya_explorer',            icon:'🏅', name:'Yogya Explorer',            description:'Selesaikan rute Yogyakarta',       category:'route' },
      { id:'semarang_explorer',         icon:'🏅', name:'Semarang Explorer',         description:'Selesaikan rute Semarang',         category:'route' },
      { id:'surabaya_route_complete',   icon:'🥇', name:'Master Surabaya',           description:'Selesaikan semua tantangan Surabaya', category:'mastery' },
      { id:'jakarta_route_complete',    icon:'🥇', name:'Master Jakarta',            description:'Selesaikan semua tantangan Jakarta',  category:'mastery' },
      { id:'bandung_route_complete',    icon:'🥇', name:'Master Bandung',            description:'Selesaikan semua tantangan Bandung',  category:'mastery' },
      { id:'yogyakarta_route_complete', icon:'🥇', name:'Master Yogyakarta',         description:'Selesaikan semua tantangan Yogyakarta', category:'mastery' },
      { id:'semarang_route_complete',   icon:'🥇', name:'Master Semarang',           description:'Selesaikan semua tantangan Semarang', category:'mastery' },
    ],

    hornUnlocks: [
      // Reserved for v54.79+ — currently no obstacle rewards horns directly.
      { id:'thomas_horn', icon:'🔔', name:'Klakson Thomas', description:'Klakson lokomotif Thomas',  category:'horn' },
      { id:'gordon_horn', icon:'🔔', name:'Klakson Gordon', description:'Klakson ekspres Gordon',    category:'horn' },
    ],

  }

})(typeof window !== 'undefined' ? window : globalThis);
