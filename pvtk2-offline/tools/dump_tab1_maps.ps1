Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public class RamScanner2 {
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

    public static void ScanForUTF(int pid, string outDir) {
        string[] targets = new string[] {
            "T\u00e2n Nguy\u1ec7t Tr\u1ea5n",
            "Th\u00e0nh c\u1ee7a Muab\u00e1nKNB",
            "T\u1ee5 B\u1ea3o C\u00e1c",
            "V\u1ea1n Hoa C\u00e1c",
            "Tr\u1ea1m Phi H\u00e0nh"
        };
        IntPtr hProc = OpenProcess(0x0010 | 0x0400, false, pid);
        if (hProc == IntPtr.Zero) {
            Console.WriteLine("Failed to open process " + pid);
            return;
        }

        List<byte[]> patterns = new List<byte[]>();
        foreach (string t in targets) {
            byte[] utf = Encoding.UTF8.GetBytes(t);
            byte[] pat = new byte[utf.Length + 2];
            pat[0] = (byte)((utf.Length >> 8) & 0xFF);
            pat[1] = (byte)(utf.Length & 0xFF);
            Buffer.BlockCopy(utf, 0, pat, 2, utf.Length);
            patterns.Add(pat);
            Console.WriteLine("Pattern '" + t + "' -> len=" + utf.Length);
        }

        long addr = 0;
        long maxAddr = 0x7FFFFFFFFFFF;
        byte[] buf = new byte[4 * 1024 * 1024];
        int matchIdx = 0;
        long totalReadBytes = 0;

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
                    if (ReadProcessMemory(hProc, (IntPtr)(mbi.BaseAddress.ToInt64() + offset), buf, toRead, out read) && read > 64) {
                        totalReadBytes += read;
                        for (int p = 0; p < patterns.Count; p++) {
                            byte[] pat = patterns[p];
                            byte first = pat[0];
                            byte second = pat[1];
                            byte third = pat[2];
                            int limit = read - pat.Length - 32;
                            for (int i = 0; i < limit; i++) {
                                if (buf[i] == first && buf[i + 1] == second && buf[i + 2] == third) {
                                    bool ok = true;
                                    for (int k = 3; k < pat.Length; k++) {
                                        if (buf[i + k] != pat[k]) { ok = false; break; }
                                    }
                                    if (ok) {
                                        int after = i + pat.Length;
                                        int s1 = (buf[after] << 8) | buf[after + 1];
                                        int s2 = (buf[after + 2] << 8) | buf[after + 3];
                                        int s3 = (buf[after + 4] << 8) | buf[after + 5];
                                        Console.WriteLine(string.Format("FOUND p={0} at 0x{1:X} -> next shorts: {2}, {3}, {4}",
                                            p, mbi.BaseAddress.ToInt64() + offset + i, s1, s2, s3));
                                        int startOff = Math.Max(0, i - 256);
                                        int dumpLen = Math.Min(65536, read - startOff);
                                        byte[] dump = new byte[dumpLen];
                                        Buffer.BlockCopy(buf, startOff, dump, 0, dumpLen);
                                        string fname = Path.Combine(outDir, string.Format("dump_{0}_p{1}_{2}x{3}.bin", matchIdx++, p, s1, s2));
                                        File.WriteAllBytes(fname, dump);
                                    }
                                }
                            }
                        }
                    }
                    offset += toRead;
                }
            }
            addr = mbi.BaseAddress.ToInt64() + regionSize;
        }
        CloseHandle(hProc);
        Console.WriteLine("Scan complete. TotalReadMB=" + (totalReadBytes / (1024*1024)) + " Matches=" + matchIdx);
    }
}
"@

$outDir = "D:\REA\app\pvtk2-offline\work\ram_dumps"
[RamScanner2]::ScanForUTF(29840, $outDir)
