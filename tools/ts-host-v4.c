// ts-host v4 - test file open from glibc's POV
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/stat.h>

int main(int argc, char **argv) {
    printf("=== ts-host v4 (file open test) ===\n");

    const char *files[] = {
        "/dlls/libgcc_s.so.1",
        "/dlls/ts_i386.so",
        "/dlls/libc.so.6",
        "/lib/i386-linux-gnu/libgcc_s.so.1",
        "/lib/i386-linux-gnu/libc.so.6",
        "/etc/hostname",
        "/etc/passwd",
        NULL
    };

    for (int i = 0; files[i]; i++) {
        struct stat st;
        int rc = stat(files[i], &st);
        if (rc == 0) {
            printf("  stat(%s): OK, size=%lld mode=0%o\n", files[i], (long long)st.st_size, st.st_mode);
        } else {
            printf("  stat(%s): FAIL errno=%d (%s)\n", files[i], errno, strerror(errno));
        }

        int fd = open(files[i], O_RDONLY);
        if (fd >= 0) {
            printf("  open(%s): OK, fd=%d\n", files[i], fd);
            close(fd);
        } else {
            printf("  open(%s): FAIL errno=%d (%s)\n", files[i], errno, strerror(errno));
        }
    }
    printf("\n");

    // Try direct dlopen of libgcc_s.so.1
    printf("[A] dlopen(\"/dlls/libgcc_s.so.1\", RTLD_LAZY)\n");
    void *gcc = dlopen("/dlls/libgcc_s.so.1", RTLD_LAZY);
    if (gcc) {
        printf("    OK handle=%p\n", gcc);
        void *sym = dlsym(gcc, "__register_frame_info");
        printf("    __register_frame_info = %p\n", sym);
        dlclose(gcc);
    } else {
        const char *e = dlerror();
        printf("    FAILED: %s\n", e);
        printf("    hex: ");
        for (size_t i = 0; i < strlen(e); i++) printf("%02x ", (unsigned char)e[i]);
        printf("\n");
    }
    printf("\n");

    // Now try the .so
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

    printf("\n[2] dlsym of key symbols\n");
    const char *syms[] = {
        "GiveFnptrsToDll",
        "Initialize",
        "_ZN13CTSSlowMotion5ResetEv",
        "_ZN6CTSGunUciC2Ev",
        NULL
    };
    for (int i = 0; syms[i]; i++) {
        void *s = dlsym(h, syms[i]);
        printf("    %-50s = %p\n", syms[i], s);
    }
    printf("\n=== SUCCESS ===\n");
    return 0;
}