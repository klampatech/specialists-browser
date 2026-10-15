// ts-host v3 — full env diagnostics + LD_DEBUG passthrough
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <dirent.h>

static const char *SYMBOLS[] = {
    "GiveFnptrsToDll",
    "Initialize",
    "GetEntityAPI",
    "_ZN13CTSSlowMotion5ResetEv",
    "_ZN6CTSGunUciC2Ev",
    "_ZN16CTSSharedEmitter6UpdateEv",
    NULL
};

int main(int argc, char **argv) {
    printf("=== ts-host v3 (full diagnostics) ===\n");
    printf("[*] Environment:\n");
    printf("    LD_LIBRARY_PATH=%s\n", getenv("LD_LIBRARY_PATH") ? getenv("LD_LIBRARY_PATH") : "(unset)");
    printf("    LD_PRELOAD=%s\n", getenv("LD_PRELOAD") ? getenv("LD_PRELOAD") : "(unset)");
    printf("    HOME=%s\n", getenv("HOME") ? getenv("HOME") : "(unset)");
    printf("    PATH=%s\n", getenv("PATH") ? getenv("PATH") : "(unset)");
    printf("    LD_DEBUG=%s\n", getenv("LD_DEBUG") ? getenv("LD_DEBUG") : "(unset)");
    printf("\n");

    printf("[*] Filesystem:\n");
    printf("    /lib/ld-linux.so.2 exists: %d\n", access("/lib/ld-linux.so.2", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/ld-linux.so.2 exists: %d\n",
           access("/lib/i386-linux-gnu/ld-linux.so.2", F_OK) == 0);
    printf("    /lib32/libc.so.6 exists: %d\n", access("/lib32/libc.so.6", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/libc.so.6 exists: %d\n", access("/lib/i386-linux-gnu/libc.so.6", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/libm.so.6 exists: %d\n", access("/lib/i386-linux-gnu/libm.so.6", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/libdl.so exists: %d\n", access("/lib/i386-linux-gnu/libdl.so", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/libdl.so.2 exists: %d\n", access("/lib/i386-linux-gnu/libdl.so.2", F_OK) == 0);
    printf("    /lib/i386-linux-gnu/libgcc_s.so.1 exists: %d\n", access("/lib/i386-linux-gnu/libgcc_s.so.1", F_OK) == 0);
    printf("    /dlls/libm.so.6 exists: %d\n", access("/dlls/libm.so.6", F_OK) == 0);
    printf("    /dlls/libc.so.6 exists: %d\n", access("/dlls/libc.so.6", F_OK) == 0);
    printf("    /dlls/libdl.so.2 exists: %d\n", access("/dlls/libdl.so.2", F_OK) == 0);
    printf("    /dlls/ts_i386.so exists: %d\n", access("/dlls/ts_i386.so", F_OK) == 0);
    printf("\n");

    printf("[*] Try listing /dlls/ via opendir:\n");
    {
        DIR *d = opendir("/dlls");
        if (d) {
            struct dirent *e;
            while ((e = readdir(d))) {
                printf("    %s\n", e->d_name);
            }
            closedir(d);
        } else {
            printf("    opendir failed: %s\n", strerror(errno));
        }
    }
    printf("\n");

    printf("[1] dlopen(\"/dlls/ts_i386.so\", RTLD_LAZY)\n");
    (void) dlerror();
    void *h = dlopen("/dlls/ts_i386.so", RTLD_LAZY);
    if (!h) {
        const char *err = dlerror();
        printf("    FAILED: %s\n", err);
        // Hex
        printf("    hex: ");
        for (size_t i = 0; i < strlen(err); i++) printf("%02x ", (unsigned char)err[i]);
        printf("\n");
        printf("=== FAIL ===\n");
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
        if (sym) { found++; printf("    %-50s = %p\n", name, sym); }
        else { printf("    %-50s = NOT FOUND\n", name); }
    }
    printf("\n    Summary: %d / %d symbols found\n", found, total);

    printf("\n[4] dlclose\n");
    printf("    dlclose returned %d\n", dlclose(h));
    printf("\n=== SUCCESS ===\n");
    return 0;
}