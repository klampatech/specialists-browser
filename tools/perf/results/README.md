# Raw measurement results

The raw JSON output of every measurement quoted in
`docs/CLIENT-PERF-RESEARCH.md`. These are kept so that every number in
the report can be checked against the data that produced it, rather than
taken on trust.

## Resolution sweeps (production, real GPU)

| file | what it is |
|---|---|
| `prod-resolution-sweep-1080p-runA.json` | 1920×1080 viewport; engine resolution forced to 1920×1080 / 1280×720 / 640×360. **This is the run quoted in §3.1.** |
| `prod-resolution-sweep-1080p-runB.json` | The same sweep, an independent run. Frame rate is stable (58.9–60.0 rAF/s); the lag figure is not (11.9–16.9 ms median). |
| `prod-resolution-sweep-1440p.json` | 2560×1440 viewport; engine resolution forced to 2560×1440 / 1920×1080 / 1280×720 |

## Engine cvar sweeps

| file | what it is |
|---|---|
| `cvar-sweep-1080p.json` | The corrected 1920×1080 sweep — 25 s warm-up, interleaved A/B/A. This is the table in §3.4. |
| `cvar-sweep-4k.json` | The same at 3840×2160, 30 s warm-up. §3.4b. |
| `cvar-sweep-1080p-first.json` | The **first, confounded** sweep, kept deliberately. Its baseline read 38.29 rAF/s against 57.13 after a reset — which is what showed that the harness needed a warm-up and interleaving. Do not quote it as a result. |

## Input latency

| file | what it is |
|---|---|
| `input-latency-run1.json` | 22 clean samples, median 11.5 ms, range 9.0–12.9 ms |
| `input-latency-run2.json` | 24 clean samples, median 7.0 ms; 21 samples under 8.2 ms, plus three tail outliers at 21.2 / 82.1 / 93.3 ms |

## The `-Oz` vs `-O3` A/B

| file | order | 1st rAF/s | 2nd rAF/s | ahead |
|---|---|---|---|---|
| `ab-wasm-opt-run1.json` | `-Oz` → `-O3` | 58.96 | 59.63 | 2nd |
| `ab-wasm-opt-run2.json` | `-Oz` → `-O3` | 59.97 | 59.32 | 1st |
| `ab-wasm-opt-run3.json` | `-Oz` → `-O3` | 56.93 | 58.93 | 2nd |
| **`ab-wasm-opt-run4.json`** | **`-O3` → `-Oz`** | **57.21** | **58.40** | **2nd (`-Oz`)** |

**Run 4 is the one that matters.** In cycles 1, 2 and 3 the build measured
**second** came out ahead; in cycle 4 the order was swapped and the build
measured **second** came out ahead again — this time `-Oz`. The winner
follows the position, not the build.

The corroborating signal is `frameMsMin`. Across all eight build
measurements it ranges from **16.64 ms to 16.79 ms**, i.e. all of them
60 Hz (1000/60 = 16.67 ms). Neither build ever renders a frame faster
than the display's refresh period, so neither build can make the game
faster; the differences in `rafAvg` are differences in how many frames
get dropped, which is the server's state.

## Reproducing

See `tools/perf/README.md` for how to run each harness, including the
build flags and the `--reverse` flag that produces cycle 4.
