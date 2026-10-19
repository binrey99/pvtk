param(
    [string]$Tag = "scan"
)

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Runtime.InteropServices;
using System.Text;

public class NatScanner {
    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenProcess(uint dwDesiredAccess, bool bInheritHandle, int dwProcessId);
    [DllImport("kernel32.dll")]
    public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, int dwSize, out int lpNumberOfBytesRead);
    [DllImport("kernel32.dll")]
    public static extern int VirtualQueryEx(IntPtr hProcess, IntPtr lpAddress, out MEMORY_BASIC_INFORMATION lpBuffer, uint dwLength);
    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr hObject);

    [StructLayout(LayoutKind.Sequential)]
    public struct MEMORY_BASIC_INFORMATION {
        public IntPtr BaseAddress;
        public IntPtr AllocationBase;
        public uint AllocationProtect;
        public IntPtr RegionSize;
        public uint State;
        public uint Protect;
        public uint Type;
    }

    public static void Scan(int pid, string outDir, string tag) {
        IntPtr hProc = OpenProcess(0x0010 | 0x0400, false, pid);
        if (hProc == IntPtr.Zero) { Console.WriteLine("OpenProcess failed"); return; }

        long addr = 0;
        long maxAddr = 0x7FFFFFFFFFFF;
        byte[] buf = new byte[4 * 1024 * 1024];
        int gzipFound = 0;

        while (addr < maxAddr) {
            MEMORY_BASIC_INFORMATION mbi;
            int res = VirtualQueryEx(hProc, (IntPtr)addr, out mbi, (uint)Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION)));
            if (res == 0) break;
            long regionSize = mbi.RegionSize.ToInt64();
            if (mbi.State == 0x1000 && (mbi.Protect & 0x100) == 0 && (mbi.Protect & 0x01) == 0) {
                long offset = 0;
                while (offset < regionSize) {
                    int toRead = (int)Math.Min(buf.Length, regionSize - offset);
                    int read = 0;
                    if (ReadProcessMemory(hProc, (IntPtr)(mbi.BaseAddress.ToInt64() + offset), buf, toRead, out read) && read > 32) {
                        for (int i = 0; i < read - 32; i++) {
                            if (buf[i] == 0x1F && buf[i+1] == 0x8B && buf[i+2] == 0x08 && buf[i+3] == 0x00) {
                                try {
                                    int len = Math.Min(32768, read - i);
                                    using (MemoryStream ms = new MemoryStream(buf, i, len))
                                    using (GZipStream gz = new GZipStream(ms, CompressionMode.Decompress))
                                    using (MemoryStream outMs = new MemoryStream()) {
                                        byte[] tmp = new byte[4096];
                                        int r;
                                        while ((r = gz.Read(tmp, 0, tmp.Length)) > 0) {
                                            outMs.Write(tmp, 0, r);
                                            if (outMs.Length > 131072) break;
                                        }
                                        byte[] decomp = outMs.ToArray();
                                        if (decomp.Length > 16) {
                                            int idx = gzipFound++;
                                            Console.WriteLine(string.Format("[{0}] GZIP #{1} at 0x{2:X} decompLen={3}",
                                                tag, idx, mbi.BaseAddress.ToInt64() + offset + i, decomp.Length));
                                            File.WriteAllBytes(Path.Combine(outDir, tag + "_decomp_" + idx + ".bin"), decomp);
                                            int rawStart = Math.Max(0, i - 128);
                                            int rawLen = Math.Min(16384, read - rawStart);
                                            byte[] raw = new byte[rawLen];
                                            Buffer.BlockCopy(buf, rawStart, raw, 0, rawLen);
                                            File.WriteAllBytes(Path.Combine(outDir, tag + "_raw_" + idx + ".bin"), raw);
                                        }
                                    }
                                } catch {}
                            }
                        }
                    }
                    offset += toRead;
                }
            }
            addr = mbi.BaseAddress.ToInt64() + regionSize;
        }
        CloseHandle(hProc);
        Console.WriteLine("NatScanner [" + tag + "] done: gzipFound=" + gzipFound);
    }
}
"@

[NatScanner]::Scan(30588, "D:\REA\app\pvtk2-offline\work\ram_dumps", $Tag)
