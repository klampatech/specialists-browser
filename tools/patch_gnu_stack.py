#!/usr/bin/env python3
"""Patch a .so to add a PT_GNU_STACK program header with no-execute flag.
Usage: python3 patch_gnu_stack.py <input.so> <output.so>
"""
import struct
import sys
import os

# ELF32 constants
PT_GNU_STACK = 0x6474e551
PT_LOAD = 1
PF_X, PF_W, PF_R = 0x1, 0x2, 0x4

EHDR_SIZE = 52
PHDR_SIZE = 32
SHDR_SIZE = 40

def patch_elf(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = bytearray(f.read())

    # ELF32 header offsets (from ELF spec)
    e_phoff   = struct.unpack_from('<I', data, 28)[0]  # offset 28
    e_shoff   = struct.unpack_from('<I', data, 32)[0]  # offset 32
    e_phentsize = struct.unpack_from('<H', data, 42)[0]  # offset 42
    e_phnum   = struct.unpack_from('<H', data, 44)[0]  # offset 44
    e_shentsize = struct.unpack_from('<H', data, 46)[0]  # offset 46
    e_shnum   = struct.unpack_from('<H', data, 48)[0]  # offset 48

    print(f"  e_phoff={e_phoff}, e_phnum={e_phnum}, e_shoff={e_shoff}, e_shnum={e_shnum}")
    print(f"  file size: {len(data):,} bytes")

    # Parse existing program headers
    phdrs = []
    for i in range(e_phnum):
        phdrs.append(list(struct.unpack_from('<IIIIIIII', data, e_phoff + i * PHDR_SIZE)))

    if any(p[0] == PT_GNU_STACK for p in phdrs):
        print("  GNU_STACK already present, no changes needed")
        return False

    # Insertion point: end of PHDR table
    insert_offset = e_phoff + e_phnum * PHDR_SIZE
    shift = PHDR_SIZE  # one new PHDR = 32 bytes

    print(f"  Will insert GNU_STACK PHDR at offset 0x{insert_offset:x}, shift data by {shift} bytes")

    # If the shift would clobber the section header table, move SHT first
    if e_shoff > 0 and insert_offset + shift > e_shoff:
        # Find a safe location: after all LOAD segments
        max_load_end = 0
        for p in phdrs:
            if p[0] == PT_LOAD:
                end = p[1] + p[4]
                if end > max_load_end:
                    max_load_end = end
        new_shoff = (max(max_load_end, insert_offset) + shift + 3) & ~3
        sh_total = e_shnum * e_shentsize
        print(f"  Moving section header table from 0x{e_shoff:x} to 0x{new_shoff:x} ({sh_total} bytes)")
        # Copy SH table to new location
        data[new_shoff:new_shoff+sh_total] = data[e_shoff:e_shoff+sh_total]
        # Zero old location
        data[e_shoff:e_shoff+sh_total] = b'\x00' * sh_total
        # Update e_shoff
        struct.pack_into('<I', data, 32, new_shoff)
        e_shoff = new_shoff

    # Now shift the data at insert_offset onwards by `shift` bytes
    # Use bytearray slicing
    tail = bytes(data[insert_offset:])
    data[insert_offset + shift:insert_offset + shift + len(tail)] = tail
    # Zero the gap
    for i in range(insert_offset, insert_offset + shift):
        data[i] = 0

    # Update PHDR offsets that are >= insert_offset
    for i, p in enumerate(phdrs):
        # p = [p_type, p_offset, p_vaddr, p_paddr, p_filesz, p_memsz, p_flags, p_align]
        if p[1] >= insert_offset:
            p[1] += shift
        if p[2] >= insert_offset:
            p[2] += shift
        if p[3] >= insert_offset:
            p[3] += shift
        struct.pack_into('<IIIIIIII', data, e_phoff + i * PHDR_SIZE, *p)

    # Update SH offsets if section content offsets are >= insert_offset
    if e_shoff > 0:
        for i in range(e_shnum):
            sh_off = e_shoff + i * e_shentsize
            sh = list(struct.unpack_from('<IIIIIIIIII', data, sh_off))
            if sh[4] >= insert_offset:  # sh_offset
                sh[4] += shift
            if sh[3] >= insert_offset:  # sh_addr
                sh[3] += shift
            struct.pack_into('<IIIIIIIIII', data, sh_off, *sh)

    # Write the new GNU_STACK PHDR at insert_offset
    new_phdr = [PT_GNU_STACK, 0, 0, 0, 0, 0, PF_R | PF_W, 4]
    struct.pack_into('<IIIIIIII', data, insert_offset, *new_phdr)

    # Increment e_phnum
    struct.pack_into('<H', data, 44, e_phnum + 1)

    # Write output
    with open(output_path, 'wb') as f:
        f.write(data)
    print(f"  Wrote {output_path} ({len(data):,} bytes)")
    return True


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 patch_gnu_stack.py <input.so> <output.so>")
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    print(f"Patching {input_path} -> {output_path}")
    if patch_elf(input_path, output_path):
        print("✓ Successfully patched")
    else:
        print("✓ No changes needed")