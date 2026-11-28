/* PRD-59C: build the family checklist for the saved children before the shared checklist renderer (uae-docs.js) runs.
   Saving: steps in UAEStore.KEYS.family (same shape as PRD-59A §4.3); names and start date in KEYS.familyMeta. */
(function () {
  'use strict'
  var meta = UAEStore.read(UAEStore.KEYS.familyMeta, {})
  var kids = Array.isArray(meta.kids) && meta.kids.length ? meta.kids : [{ name: 'Anak 1', stage: 'g2' }, { name: 'Anak 2', stage: 'g2' }]
  window.UAEChecklist = { data: UAEFamily.build(kids), key: UAEStore.KEYS.family, meta: meta }
})()
