param(
    [string]$Action = "capture",
    [int]$X = 0,
    [int]$Y = 0,
    [int]$X2 = 0,
    [int]$Y2 = 0,
    [int]$WaitMs = 1200,
    [string]$Out = "C:\Users\binhn\.gemini\antigravity\brain\6652e3e0-be76-4656-a274-c6dc5d7a2bdb\tab1_live.png"
)

Add-Type -ReferencedAssemblies System.Drawing, System.Windows.Forms -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public class LDTab1 {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);
    [DllImport("user32.dll", SetLastError=true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);
    [DllImport("user32.dll")] public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdcDest, int xDest, int yDest, int wDest, int hDest, IntPtr hdcSource, int xSrc, int ySrc, int rop);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP   = 0x0202;
    public const uint WM_MOUSEMOVE   = 0x0200;
    public const uint WM_ACTIVATE    = 0x0006;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP   = 0x0004;

    public static IntPtr MakeLParam(int x, int y) {
        return (IntPtr)((y << 16) | (x & 0xFFFF));
    }

    public static string Execute(string action, int x, int y, int x2, int y2, int waitMs, string outPath) {
        StringBuilder log = new StringBuilder();
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenDesktop("Default", 0, true, 0x10000000);
            SetThreadDesktop(hDesk);

            IntPtr mainHwnd = IntPtr.Zero;
            IntPtr tab0Hwnd = IntPtr.Zero;
            IntPtr multiHwnd = IntPtr.Zero;
            EnumDesktopWindows(hDesk, (hWnd, l) => {
                StringBuilder sbC = new StringBuilder(256);
                StringBuilder sbT = new StringBuilder(256);
                GetClassName(hWnd, sbC, 256);
                GetWindowText(hWnd, sbT, 256);
                if (sbC.ToString() == "LDPlayerMainFrame" && sbT.ToString() == "1") {
                    mainHwnd = hWnd;
                } else if (sbC.ToString() == "LDPlayerMainFrame") {
                    tab0Hwnd = hWnd;
                }
                if (sbC.ToString() == "LDRemoteLoginFrame") {
                    multiHwnd = hWnd;
                }
                return true;
            }, IntPtr.Zero);

            if (mainHwnd == IntPtr.Zero) {
                log.AppendLine("ERROR: Could not find LDPlayerMainFrame Title='1'");
                return;
            }

            if (multiHwnd != IntPtr.Zero) {
                ShowWindow(multiHwnd, 6); // SW_MINIMIZE
            }
            if (tab0Hwnd != IntPtr.Zero) {
                RECT r0;
                GetWindowRect(tab0Hwnd, out r0);
                if (r0.Right > 900) {
                    MoveWindow(tab0Hwnd, 20, 20, r0.Right - r0.Left, r0.Bottom - r0.Top, true);
                }
            }

            ShowWindow(mainHwnd, 9); // SW_RESTORE
            Thread.Sleep(50);
            RECT mr;
            GetWindowRect(mainHwnd, out mr);
            if ((mr.Right - mr.Left) < 500 || mr.Left != 800 || mr.Top != 10 || action == "resize") {
                MoveWindow(mainHwnd, 800, 10, 587, 1003, true);
                Thread.Sleep(250);
            }

            SetWindowPos(mainHwnd, (IntPtr)(-1), 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0040);
            SetForegroundWindow(mainHwnd);
            Thread.Sleep(150);

            IntPtr renderHwnd = IntPtr.Zero;
            IntPtr subHwnd = IntPtr.Zero;
            EnumChildWindows(mainHwnd, (ch, l) => {
                StringBuilder sbC = new StringBuilder(256);
                GetClassName(ch, sbC, 256);
                if (sbC.ToString() == "RenderWindow") renderHwnd = ch;
                if (sbC.ToString() == "subWin") subHwnd = ch;
                return true;
            }, IntPtr.Zero);

            RECT rr;
            GetWindowRect(renderHwnd, out rr);
            int rw = rr.Right - rr.Left;
            int rh = rr.Bottom - rr.Top;
            log.AppendLine(string.Format("RenderWindow=0x{0:X} subWin=0x{1:X} Rect=({2},{3}) Size={4}x{5}", renderHwnd.ToInt64(), subHwnd.ToInt64(), rr.Left, rr.Top, rw, rh));

            if (action == "tap") {
                int sx = rr.Left + x;
                int sy = rr.Top + y;
                SetCursorPos(sx, sy);
                Thread.Sleep(30);
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                Thread.Sleep(60);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                log.AppendLine(string.Format("Tapped ({0}, {1}) at screen ({2}, {3})", x, y, sx, sy));
                Thread.Sleep(waitMs);
            } else if (action == "back") {
                SetCursorPos(rr.Left + 270, rr.Top + 480);
                Thread.Sleep(20);
                keybd_event(0x1B, 1, 0, UIntPtr.Zero);
                Thread.Sleep(50);
                keybd_event(0x1B, 1, 2, UIntPtr.Zero);
                log.AppendLine("Sent VK_ESCAPE");
                Thread.Sleep(waitMs);
            } else if (action == "drag") {
                int sx1 = rr.Left + x;
                int sy1 = rr.Top + y;
                SetCursorPos(sx1, sy1);
                Thread.Sleep(30);
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                int steps = 10;
                for (int i = 1; i <= steps; i++) {
                    int cx = sx1 + (x2 - x) * i / steps;
                    int cy = sy1 + (y2 - y) * i / steps;
                    Thread.Sleep(25);
                    SetCursorPos(cx, cy);
                }
                Thread.Sleep(40);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                log.AppendLine(string.Format("Dragged ({0},{1}) -> ({2},{3})", x, y, x2, y2));
                Thread.Sleep(waitMs);
            }

            GetWindowRect(renderHwnd, out rr);
            rw = rr.Right - rr.Left;
            rh = rr.Bottom - rr.Top;
            if (rw > 0 && rh > 0 && !string.IsNullOrEmpty(outPath)) {
                using (Bitmap bmp = new Bitmap(rw, rh, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(bmp)) {
                        IntPtr hdcDest = g.GetHdc();
                        IntPtr hdcScreen = GetDC(IntPtr.Zero);
                        BitBlt(hdcDest, 0, 0, rw, rh, hdcScreen, rr.Left, rr.Top, 0x00CC0020);
                        ReleaseDC(IntPtr.Zero, hdcScreen);
                        g.ReleaseHdc(hdcDest);
                    }
                    bmp.Save(outPath, ImageFormat.Png);
                    log.AppendLine("Captured " + rw + "x" + rh + " -> " + outPath);
                }
            }
        });
        t.Start();
        t.Join();
        return log.ToString();
    }
}
"@

Write-Host ([LDTab1]::Execute($Action, $X, $Y, $X2, $Y2, $WaitMs, $Out))
