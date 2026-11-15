# g14 background references (A-312)

Drop per-level reference art here named by level:
  level01.png  level02.png  …  level30.png

Then run:  python3 tools/bg-ref-build.py 1-30
Then:      node   tools/qa-bg-accuracy.mjs 1-30

The pipeline samples a palette + traces the city band (monument+skyline) to a
vector SVG; the game loads it as one cached sprite. Sky/hills/rail stay procedural.
