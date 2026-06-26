/* =============================================================================
 * routes.js  (v54.76 — scripted train routes)
 * =============================================================================
 * Each route defines an ORDERED sequence of obstacles that fire one after
 * another (with optional wait gaps) — versus random adaptive picking.
 *
 * Per spec §28: Surabaya route is the anchor scripted demo (8-beat sequence).
 * Other Indonesian locations fall back to the adaptive random picker.
 *
 * Schema:
 *   window.TrainRoutes = {
 *     [routeId]: {
 *       id, locationId, name, description,
 *       sequence: [
 *         { type:'wait', durationMs:6000 } |
 *         { obstacleId:'...', overrideReward?:{...} } |
 *         { type:'arrival' }
 *       ],
 *       completionReward: { coins, sticker, badge, hornUnlock }
 *     }
 *   }
 * ========================================================================== */

;(function (global) {
  'use strict'

  global.TrainRoutes = {

    // ── SURABAYA scripted route (spec §28 anchor demo) ──────────────────────
    surabaya_route: {
      id: 'surabaya_route',
      locationId: 'id_surabaya',
      name: 'Surabaya Petualangan',
      description: 'Kereta melintasi kota Surabaya menuju stasiun pusat. 8 tantangan.',
      sequence: [
        // 1. Opening lane drive (collect stars implicitly)
        { type: 'wait', durationMs: 8000 },
        // 2. Small crate lane avoid (spec §28 beat 2)
        { obstacleId: 'falling_rocks_small' },
        // 3. Missing rail puzzle (spec §28 beat 3)
        { obstacleId: 'missing_rail_triangle' },
        // 4. Fire jump question (spec §28 beat 4)
        { obstacleId: 'fire_jump_question' },
        // 5. Signal challenge (spec §28 beat 5)
        { obstacleId: 'signal_light_challenge' },
        // 6. Animal crossing kindness (spec §28 beat 6)
        { obstacleId: 'animal_crossing_cat' },
        // 7. Station cargo sort (spec §28 beat 7 — "Surabaya Helper" badge)
        { obstacleId: 'station_cargo_sort_color', overrideReward: { coins: 10, sticker: 'surabaya_helper', badge: 'surabaya_explorer' } },
        // 8. Arrival
        { type: 'arrival' },
      ],
      completionReward: { coins: 20, sticker: 'surabaya_explorer', badge: 'surabaya_route_complete' },
    },

    // ── JAKARTA scripted route (urban density theme) ────────────────────────
    jakarta_route: {
      id: 'jakarta_route',
      locationId: 'id_jakarta',
      name: 'Jakarta Komuter',
      description: 'Jalur ramai ibukota — banyak tantangan stasiun.',
      sequence: [
        { type: 'wait', durationMs: 7000 },
        { obstacleId: 'water_puddle_swerve' },
        { obstacleId: 'broken_bridge_color' },
        { obstacleId: 'educational_question_gate_count' },
        { obstacleId: 'choose_correct_track_destination' },
        { obstacleId: 'station_passenger_pickup_3', overrideReward: { coins: 8, sticker: 'jakarta_komuter' } },
        { obstacleId: 'station_cargo_sort_destination', overrideReward: { coins: 10, badge: 'jakarta_explorer' } },
        { type: 'arrival' },
      ],
      completionReward: { coins: 25, sticker: 'jakarta_komuter', badge: 'jakarta_route_complete' },
    },

    // ── BANDUNG scripted route (mountain + tea plantation theme) ─────────────
    bandung_route: {
      id: 'bandung_route',
      locationId: 'id_bandung',
      name: 'Bandung Pegunungan',
      description: 'Mendaki ke dataran tinggi Priangan.',
      sequence: [
        { type: 'wait', durationMs: 7000 },
        { obstacleId: 'falling_rocks_big' },
        { obstacleId: 'missing_rail_ramp_up' },
        { obstacleId: 'windy_bridge_balance' },
        { obstacleId: 'animal_crossing_goat' },
        { obstacleId: 'educational_question_gate_shape' },
        { obstacleId: 'station_lost_suitcase', overrideReward: { coins: 10, sticker: 'bandung_pendaki', badge: 'bandung_explorer' } },
        { type: 'arrival' },
      ],
      completionReward: { coins: 25, sticker: 'bandung_pendaki', badge: 'bandung_route_complete' },
    },

    // ── YOGYAKARTA scripted route (heritage + cultural) ─────────────────────
    yogyakarta_route: {
      id: 'yogyakarta_route',
      locationId: 'id_yogyakarta',
      name: 'Yogyakarta Budaya',
      description: 'Lewati Tugu, Malioboro, lalu Stasiun Tugu.',
      sequence: [
        { type: 'wait', durationMs: 7000 },
        { obstacleId: 'choose_track_color' },
        { obstacleId: 'memory_sequence_3color' },
        { obstacleId: 'educational_question_gate_letter' },
        { obstacleId: 'animal_crossing_bird' },
        { obstacleId: 'station_ticket_color_match', overrideReward: { coins: 8, sticker: 'yogya_budaya' } },
        { obstacleId: 'station_signal_lamp_fix', overrideReward: { coins: 10, badge: 'yogya_explorer' } },
        { type: 'arrival' },
      ],
      completionReward: { coins: 25, sticker: 'yogya_budaya', badge: 'yogyakarta_route_complete' },
    },

    // ── SEMARANG scripted route (coastal + colonial heritage) ───────────────
    semarang_route: {
      id: 'semarang_route',
      locationId: 'id_semarang',
      name: 'Semarang Pesisir',
      description: 'Lewati Lawang Sewu menuju Pelabuhan.',
      sequence: [
        { type: 'wait', durationMs: 7000 },
        { obstacleId: 'water_puddle_pump' },
        { obstacleId: 'broken_bridge_number_sequence_1to3' },
        { obstacleId: 'tunnel_gate_question' },
        { obstacleId: 'friendly_race_boost' },
        { obstacleId: 'station_clean_leaves_track', overrideReward: { coins: 8, sticker: 'semarang_pelabuhan' } },
        { obstacleId: 'station_cargo_sort_object_category', overrideReward: { coins: 10, badge: 'semarang_explorer' } },
        { type: 'arrival' },
      ],
      completionReward: { coins: 25, sticker: 'semarang_pelabuhan', badge: 'semarang_route_complete' },
    },

  }

  /**
   * Look up a route by current BG-engine location id.
   * Returns the route object or null if no scripted route exists for that location.
   */
  global.findRouteForLocation = function (locationId) {
    if (!locationId) return null
    const all = global.TrainRoutes || {}
    for (const id in all) {
      if (all[id] && all[id].locationId === locationId) return all[id]
    }
    return null
  }

})(typeof window !== 'undefined' ? window : globalThis);
