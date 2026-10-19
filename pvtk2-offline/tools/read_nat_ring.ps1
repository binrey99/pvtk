param(
    [string]$OutFile = "D:\REA\app\pvtk2-offline\work\ram_dumps\nat_ring.bin"
)

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class NatMbufDumper2 {
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

    public static void DumpGameRegions(int pid, string outFile) {
        IntPtr hProc = OpenProcess(0x0010 | 0x0400, false, pid);
        if (hProc == IntPtr.Zero) { Console.WriteLine("OpenProcess failed"); return; }

        long addr = 0;
        long maxAddr = 0x7FFFFFFFFFFF;
        byte[] buf = new byte[4 * 1024 * 1024];
        using (FileStream fs = new FileStream(outFile, FileMode.Create, FileAccess.Write)) {
            while (addr < maxAddr) {
                MEMORY_BASIC_INFORMATION mbi;
                int res = VirtualQueryEx(hProc, (IntPtr)addr, out mbi, (uint)Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION)));
                if (res == 0) break;
                long regionSize = mbi.RegionSize.ToInt64();
                if (mbi.State == 0x1000 && mbi.Type == 0x20000 && mbi.Protect == 0x04) {
                    long offset = 0;
                    while (offset < regionSize) {
                        int toRead = (int)Math.Min(buf.Length, regionSize - offset);
                        int read = 0;
                        if (ReadProcessMemory(hProc, (IntPtr)(mbi.BaseAddress.ToInt64() + offset), buf, toRead, out read) && read > 64) {
                            bool hasGameData = false;
                            for (int i = 0; i < read - 8; i++) {
                                if ((buf[i] == 0x1F && buf[i+1] == 0x8B && buf[i+2] == 0x08 && buf[i+3] == 0x00) ||
                                    (buf[i+2] == 0x2E && buf[i+3] == 0xE4) ||
                                    (buf[i+2] == 0x36 && buf[i+3] == 0xB1) ||
                                    (buf[i] == 0x00 && buf[i+3] == 0x29 && (buf[i+4] == 0x07 || buf[i+4] == 0x18 || buf[i+4] == 0x19 || buf[i+4] == 0x1A || buf[i+4] == 0x1B || buf[i+4] == 0x28))) {
                                    hasGameData = true;
                                    break;
                                }
                            }
                            if (hasGameData) {
                                fs.Write(buf, 0, read);
                            }
                        }
                        offset += toRead;
                    }
                }
                addr = mbi.BaseAddress.ToInt64() + regionSize;
            }
            Console.WriteLine("Dumped " + fs.Length + " bytes of game packet regions to " + outFile);
        }
        CloseHandle(hProc);
    }
}
"@

$natProc = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq "VBoxNetNAT.exe" -and $_.CommandLine -match "LdNatNetwork1" } | Select-Object -First 1
[NatMbufDumper2]::DumpGameRegions($natProc.ProcessId, $OutFile)
