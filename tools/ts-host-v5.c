// ts-host v5 — provides libgcc_s stubs as part of the binary
//
// The .so has R_386_GLOB_DAT relocations for __register_frame_info and
// __deregister_frame_info. Without libgcc_s loaded, dlopen errors with
// CheerpX's "rame_info" buffer bug. By defining these symbols in our
// own binary AND making them exported, the dynamic linker should
// resolve them from our process's symbol table, skipping the libgcc_s
// lookup entirely.

#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <dirent.h>
#include <fcntl.h>

// ============================================================
// libgcc_s stubs — these are DWARF/exception-handling functions
// The .so references them via R_386_GLOB_DAT relocations. The
// dynamic linker resolves them from our binary's exported symbols.
// ============================================================

struct object;
struct dwarf_eh_frame;

void __register_frame_info(void *table) {
    (void)table;
    /* No-op: we don't use DWARF exception handling. */
}
void __deregister_frame_info(void *table) {
    (void)table;
    /* No-op */
}
void __register_frame_info_table(void *table) {
    (void)table;
    /* No-op */
}
void __register_frame_info_bases(void *table) {
    (void)table;
    /* No-op */
}
void __deregister_frame_info_bases(void *table) {
    (void)table;
    /* No-op */
}
void __register_frame_info_table_bases(void *table) {
    (void)table;
    /* No-op */
}

// ============================================================
// Original diagnostic + dlopen test
// ============================================================

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
    printf("=== ts-host v5 (with libgcc_s stubs) ===\n");

    printf("[*] Verify our libgcc_s stubs are exported:\n");
    void *test;
    *(void**)&test = (void*)&__register_frame_info;
    printf("    &__register_frame_info = %p\n", test);
    *(void**)&test = (void*)&__deregister_frame_info;
    printf("    &__deregister_frame_info = %p\n", test);
    printf("\n");

    printf("[1] dlopen(\"/dlls/ts_i386.so\", RTLD_LAZY)\n");
    (void) dlerror();
    void *h = dlopen("/dlls/ts_i386.so", RTLD_LAZY);
    if (!h) {
        const char *e = dlerror();
        printf("    FAILED: %s\n", e);
        printf("    hex: ");
        for (size_t i = 0; i < strlen(e); i++) printf("%02x ", (unsigned char)e[i]);
        printf("\n");
        return 1;
    }
    printf("    OK handle=%p\n", h);
    printf("\n");

    printf("[2] dlsym of key symbols\n");
    int found = 0, total = 0;
    for (int i = 0; SYMBOLS[i]; i++) {
        total++;
        const char *name = SYMBOLS[i];
        void *sym = dlsym(h, name);
        if (sym) { found++; printf("    %-50s = %p\n", name, sym); }
        else { printf("    %-50s = NOT FOUND\n", name); }
    }
    printf("\n    Summary: %d / %d symbols found\n", found, total);

    printf("\n[3] dlclose\n");
    printf("    dlclose returned %d\n", dlclose(h));
    printf("\n=== SUCCESS ===\n");
    return 0;
}