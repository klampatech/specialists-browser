// ts-host.c — Phase 1 step 1.2 bridge PoC
//
// Goal: prove we can dlopen the TS server .so inside CheerpX and
// call GiveFnptrsToDll. This is the first iteration of the bridge
// layer.
//
// What we do:
//   1. dlopen the TS server .so at /dlls/ts_i386.so
//   2. Print the handle
//   3. List the .so's exported symbols that look like GoldSrc engine
//      entry points (GiveFnptrsToDll, Initialize, etc.)
//   4. dlsym each one and report its address
//   5. Exit
//
// We can't actually CALL GiveFnptrsToDll yet because it expects a
// function table we haven't built. That comes in step 1.3.
//
// Compile (on m5):
//   gcc -m32 -static -o ts-host ts-host.c -ldl
//
// Output goes to stdout. CheerpX's setCustomConsole captures it.

#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>

// Symbol names we want to look up. Some have C++ mangling
// (CTSSlowMotion__*), some are C linkage (GiveFnptrsToDll).
static const char *SYMBOLS[] = {
    // GoldSrc mod entry points (standard HLSDK interface)
    "GiveFnptrsToDll",
    "Initialize",
    "GetEntityAPI",
    "GetEntityAPI2",
    "GetNewDLLFunctions",
    "GetEngineFunctions",
    "GetServerVariableInfo",
    // TS-specific symbols (C++ mangled)
    "_ZN13CTSSlowMotion5ResetEv",           // CTSSlowMotion::Reset()
    "_ZN13CTSSlowMotionC2Ev",              // CTSSlowMotion::CTSSlowMotion()
    "_ZN13CTSSlowMotionD2Ev",              // ~CTSSlowMotion()
    "_ZN18CTSSlowMotionPoint5ResetEv",      // CTSSlowMotionPoint::Reset()
    "_ZN6CTSGunUciC2Ev",                   // CTSGunUci::CTSGunUci()
    "_ZN16CTSSharedEmitter6UpdateEv",      // CTSSharedEmitter::Update()
    // End marker
    NULL
};

int main(int argc, char **argv) {
    printf("=== ts-host v1 (Phase 1 step 1.2 bridge PoC) ===\n");
    printf("[1] dlopen(\"/dlls/ts_i386.so\", RTLD_LAZY)\n");

    void *h = dlopen("/dlls/ts_i386.so", RTLD_LAZY);
    if (!h) {
        printf("    FAILED: %s\n", dlerror());
        printf("=== FAIL: cannot open .so ===\n");
        return 1;
    }
    printf("    OK handle=%p\n", h);

    printf("\n[2] dlsym of GoldSrc + TS-specific symbols\n");
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