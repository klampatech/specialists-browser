// ts-host v2 - hex-dump dlerror + LD_DEBUG pass-through
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

static const char *SYMBOLS[] = {
    "GiveFnptrsToDll",
    "Initialize",
    "GetEntityAPI",
    "GetEntityAPI2",
    "GetNewDLLFunctions",
    "GetEngineFunctions",
    "GetServerVariableInfo",
    "_ZN13CTSSlowMotion5ResetEv",
    "_ZN13CTSSlowMotionC2Ev",
    "_ZN13CTSSlowMotionD2Ev",
    "_ZN18CTSSlowMotionPoint5ResetEv",
    "_ZN6CTSGunUciC2Ev",
    "_ZN16CTSSharedEmitter6UpdateEv",
    NULL
};

// Hex dump a string for diagnostics
static void hexdump(const char *label, const char *str) {
    printf("    %s (length=%zu, hex):\n      ", label, str ? strlen(str) : 0);
    if (!str) { printf("(null)\n"); return; }
    for (size_t i = 0; i < strlen(str); i++) {
        printf("%02x ", (unsigned char)str[i]);
        if ((i + 1) % 32 == 0) printf("\n      ");
    }
    printf("\n");
}

int main(int argc, char **argv) {
    printf("=== ts-host v2 (Phase 1 step 1.2, with diagnostics) ===\n");
    printf("LD_DEBUG=%s\n", getenv("LD_DEBUG") ? getenv("LD_DEBUG") : "(unset)");
    printf("[*] Host system info:\n");
    printf("    /lib/ld-linux.so.2 exists: %d\n", access("/lib/ld-linux.so.2", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/ld-linux.so.2 exists: %d\n",
           access("/lib/i386-linux-gnu/ld-linux.so.2", F_OK) == 0);
    printf("    /lib32/libc.so.6 exists: %d\n", access("/lib32/libc.so.6", F_OK) == 0);
    printf("\n");

    // Try dlopen of a known-good library first (sanity check)
    printf("[A] Sanity: dlopen(\"libc.so.6\", RTLD_LAZY)\n");
    void *libc_h = dlopen("libc.so.6", RTLD_LAZY);
    if (libc_h) {
        printf("    OK handle=%p\n", libc_h);
        dlclose(libc_h);
    } else {
        printf("    FAILED: %s\n", dlerror());
        hexdump("dlerror", dlerror());
    }
    printf("\n");

    printf("[B] Sanity: dlopen(\"libdl.so.2\", RTLD_LAZY)\n");
    void *libdl_h = dlopen("libdl.so.2", RTLD_LAZY);
    if (libdl_h) {
        printf("    OK handle=%p\n", libdl_h);
        dlclose(libdl_h);
    } else {
        printf("    FAILED: %s\n", dlerror());
        hexdump("dlerror", dlerror());
    }
    printf("\n");

    // Now try the actual .so
    printf("[1] dlopen(\"/dlls/ts_i386.so\", RTLD_LAZY)\n");
    (void) dlerror();  // clear
    void *h = dlopen("/dlls/ts_i386.so", RTLD_LAZY);
    if (!h) {
        const char *err = dlerror();
        printf("    FAILED: %s\n", err);
        hexdump("dlerror", err);
        printf("=== FAIL: cannot open .so ===\n");
        return 1;
    }
    printf("    OK handle=%p\n", h);
    printf("\n");

    printf("[2] dlsym of GoldSrc + TS-specific symbols\n");
    int found = 0, total = 0;
    for (int i = 0; SYMBOLS[i]; i++) {
        total++;
        const char *name = SYMBOLS[i];
        void *sym = dlsym(h, name);
        if (sym) {
            found++;
            printf("    %-50s = %p\n", name, sym);
        } else {
            printf("    %-50s = NOT FOUND\n", name);
        }
    }
    printf("\n    Summary: %d / %d symbols found\n", found, total);

    printf("\n[3] dlclose\n");
    int rc = dlclose(h);
    printf("    dlclose returned %d\n", rc);

    printf("\n=== ts-host: success (found %d/%d symbols) ===\n", found, total);
    return 0;
}