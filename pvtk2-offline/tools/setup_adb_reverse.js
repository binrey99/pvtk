#!/usr/bin/env node
/**
 * Auto-detects ADB from LDPlayer, BlueStacks, Nox, MuMu, MEmu, or Android SDK
 * and automatically executes:
 *   adb reverse tcp:30000 tcp:30000
 *   adb reverse tcp:8079  tcp:8079
 *   adb reverse tcp:28080 tcp:28080
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CANDIDATE_ADB_PATHS = [
  process.env.REA_ADB_PATH,
  'adb',
  // LDPlayer
  'C:\\LDPlayer\\LDPlayer9\\adb.exe',
  'D:\\LDPlayer\\LDPlayer9\\adb.exe',
  'E:\\LDPlayer\\LDPlayer9\\adb.exe',
  'C:\\LDPlayer\\LDPlayer4.0\\adb.exe',
  'D:\\LDPlayer\\LDPlayer4.0\\adb.exe',
  'C:\\XuanZhi\\LDPlayer\\adb.exe',
  'D:\\XuanZhi\\LDPlayer\\adb.exe',
  // BlueStacks 5 / Nxt
  'C:\\Program Files\\BlueStacks_nxt\\hd-adb.exe',
  'C:\\Program Files (x86)\\BlueStacks_nxt\\hd-adb.exe',
  'D:\\Program Files\\BlueStacks_nxt\\hd-adb.exe',
  'C:\\Program Files\\BlueStacks\\hd-adb.exe',
  // NoxPlayer
  'C:\\Program Files (x86)\\Nox\\bin\\nox_adb.exe',
  'C:\\Program Files\\Nox\\bin\\nox_adb.exe',
  'D:\\Program Files\\Nox\\bin\\nox_adb.exe',
  'D:\\Nox\\bin\\nox_adb.exe',
  // MuMu Player
  'C:\\Program Files\\Netease\\MuMuPlayer-12.0\\shell\\adb.exe',
  'D:\\Program Files\\Netease\\MuMuPlayer-12.0\\shell\\adb.exe',
  'C:\\Program Files\\MuMu\\emulator\\nemu\\vmonitor\\bin\\adb_server.exe',
  // MEmu
  'C:\\Program Files\\Microvirt\\MEmu\\adb.exe',
  'D:\\Program Files\\Microvirt\\MEmu\\adb.exe',
  // Android SDK Platform-Tools
  path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  'C:\\adb\\adb.exe',
  'C:\\platform-tools\\adb.exe',
  'D:\\platform-tools\\adb.exe'
].filter(Boolean);

const EMULATOR_PORTS = [5555, 5557, 62001, 62025, 7555, 16384, 21503];
const REVERSE_PORTS = [30000, 8079, 28080];

function findAdbBinary() {
  for (const candidate of CANDIDATE_ADB_PATHS) {
    if (candidate === 'adb') {
      try {
        execFileSync('adb', ['version'], { stdio: 'ignore', timeout: 3000 });
        return 'adb';
      } catch (_) {
        continue;
      }
    }
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function setupAdbReverse(customAdbPath) {
  const adb = customAdbPath || findAdbBinary();
  if (!adb) {
    return {
      ok: false,
      adb: null,
      devices: [],
      message: 'Không tìm thấy tệp adb.exe tự động. Hãy bật giả lập (LDPlayer/BlueStacks/Nox) hoặc nhập đường dẫn adb.exe.'
    };
  }

  // Try connecting common local emulator loopback ports
  for (const port of EMULATOR_PORTS) {
    try {
      execFileSync(adb, ['connect', `127.0.0.1:${port}`], { stdio: 'pipe', timeout: 1500 });
    } catch (_) {}
  }

  let devicesOut = '';
  try {
    devicesOut = execFileSync(adb, ['devices'], { encoding: 'utf8', timeout: 4000 });
  } catch (err) {
    return { ok: false, adb, devices: [], message: `Lỗi khi chạy "${adb} devices": ${err.message}` };
  }

  const devices = devicesOut
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && /\s+device$/.test(line))
    .map((line) => line.split(/\s+/)[0]);

  if (devices.length === 0) {
    return {
      ok: false,
      adb,
      devices: [],
      message: `Đã tìm thấy ADB tại [${adb}], nhưng chưa có giả lập/điện thoại nào đang mở (adb devices trống). Hãy mở giả lập và bật "ADB Debugging" trong cài đặt giả lập!`
    };
  }

  const results = [];
  for (const serial of devices) {
    for (const port of REVERSE_PORTS) {
      try {
        execFileSync(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], {
          stdio: 'pipe',
          timeout: 3000
        });
        results.push(`${serial} -> tcp:${port}`);
      } catch (err) {
        results.push(`${serial} -> tcp:${port} (Lỗi: ${err.message})`);
      }
    }
  }

  return {
    ok: true,
    adb,
    devices,
    results,
    message: `Đã nối cổng thành công (tcp:30000, tcp:8079, tcp:28080) cho thiết bị: ${devices.join(', ')}`
  };
}

if (require.main === module) {
  const customPath = process.argv[2];
  const res = setupAdbReverse(customPath);
  console.log(res.message);
  if (res.results && res.results.length > 0) {
    for (const r of res.results) {
      console.log('  [OK] adb reverse:', r);
    }
  }
}

module.exports = { findAdbBinary, setupAdbReverse };
