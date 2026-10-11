# Mojo racing status (2026-10-11)
1. Jumper regression NOT fixed. QA_ONLY=jumper on my tree, 4 runs so far: run 1 passed, run 2 failed ("1 hops, hits 1->1, last pothole/jump", hop count below the 2 needed; no BROK in that run), runs 3-4 unfinished. HEAD A/B result is main's (0/4 fails).
2. Likely causes still untested: +7% pace creep (rows arrive faster than the 0.5 s hop), authored patterns already queued before the test sets __mcNoPatterns, or the ramp hopMax state. Try first: set pace creep 0 for the jump perk, and drain S.patQ when __mcNoPatterns is set.
3. Done and gated elsewhere: crash questions, lives/game over, patterns, fog/LOD/pixel cap. qa-mojo-chase-ui was 104/0. Perf, atmos recheck and the contact sheet are owed. Nothing committed.
