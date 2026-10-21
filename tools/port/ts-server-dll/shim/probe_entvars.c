/* Stand-alone probe for build-matrix/entvars.h.
 * Compile with:
 *   gcc -I build-matrix -o probe_entvars shim/probe_entvars.c
 *
 * Prints sizeof(entvars_t) and the offsets the build-time asserts
 * enforce. If a TS_ASSERT_OFF in the header fails at compile time,
 * this probe will not link until the build succeeds — so an early
 * FAIL here means the regenerated header disagrees with HLSDK.
 */
#include <stddef.h>
#include <stdio.h>

#include "entvars.h"

int main(void) {
    printf("sizeof(entvars_t) = %zu  (HLSDK expects 720 on x86)\n",
           sizeof(entvars_t));
#define P(f) printf("  %-14s @%zu\n", #f, offsetof(entvars_t, f));
    P(classname);
    P(origin);
    P(angles);
    P(punchangle);
    P(modelindex);
    P(health);
    P(deadflag);
    P(view_ofs);
    P(flags);
    P(playerclass);
    P(vuser1);
    return 0;
}
