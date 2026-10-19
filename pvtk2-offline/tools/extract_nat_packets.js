#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const dumpFile = process.argv[2] || 'D:/REA/app/pvtk2-offline/work/ram_dumps/nat_ring.bin';
const forceMapId = process.argv[3] ? parseInt(process.argv[3], 10) : 0;
const outDir = 'D:/REA/app/pvtk2-offline/work/captured_maps';

const raw = fs.readFileSync(dumpFile);

// 1) Reassemble TCP segments from game server port 10010 in VBoxNetNAT mbuf pool
const segs = new Map();
for (let off = 0; off < raw.length - 40; off++) {
  if (raw[off] === 0x45 && raw[off + 1] === 0x00 && raw[off + 9] === 0x06) {
    const ipLen = raw.readUInt16BE(off + 2);
    if (ipLen >= 40 && ipLen <= 1500 && off + ipLen <= raw.length) {
      const tcpOff = off + 20;
      if (raw.readUInt16BE(tcpOff) === 10010) {
        const seq = raw.readUInt32BE(tcpOff + 4);
        const tcpHdrLen = ((raw[tcpOff + 12] >> 4) & 0x0f) * 4;
        const payOff = tcpOff + tcpHdrLen;
        const payLen = ipLen - 20 - tcpHdrLen;
        if (payLen > 0 && payOff + payLen <= raw.length) {
          segs.set(seq, raw.subarray(payOff, payOff + payLen));
        }
      }
    }
  }
}
const sortedSeqs = [...segs.keys()].sort((a, b) => a - b);
const tcpChunks = [];
let expectedSeq = null;
for (const seq of sortedSeqs) {
  const pay = segs.get(seq);
  if (expectedSeq !== null && seq > expectedSeq) {
    tcpChunks.push(Buffer.alloc(16));
  }
  tcpChunks.push(pay);
  expectedSeq = seq + pay.length;
}
const tcpStream = tcpChunks.length > 0 ? Buffer.concat(tcpChunks) : Buffer.alloc(0);

// 2) Also append the 64KB circular socket receive buffer doubled so wrapped packets are contiguous.
const ringStart = raw.length - 0x12d20;
const ringEnd = ringStart + 0x10000;
let searchBuf = Buffer.concat([raw, tcpStream]);
if (ringStart >= 0 && ringEnd <= raw.length) {
  const ring = raw.subarray(ringStart, ringEnd);
  searchBuf = Buffer.concat([raw, tcpStream, ring, ring]);
}

let foundMapId = forceMapId;
const found291a = [];
const found291b = [];
const found2907 = [];
const found2918 = [];
const found2928 = [];
const found2ee4 = [];
const found36b1 = [];
const found38a5 = [];

const startScan = 0;
for (let i = startScan; i < searchBuf.length - 8; i++) {
  const len = searchBuf.readUInt16BE(i);
  const op = searchBuf.readUInt16BE(i + 2);
  if (len < 6 || len > 62000 || i + len > searchBuf.length) continue;

  const payload = searchBuf.subarray(i + 4, i + len);

  if (op === 0x291a && len >= 10 && len <= 5000) {
    const areaId = payload[0];
    const cnt = payload[1];
    if (areaId >= 0 && areaId <= 20 && cnt >= 1 && cnt <= 30) {
      found291a.push({ off: i, areaId, cnt, payload });
    }
  } else if ((op === 0x291b || op === 0x290a) && len >= 200 && len <= 30000) {
    const gzPos = payload.indexOf(Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
    if (gzPos >= 18 && gzPos <= 6000) {
      const mCnt = op === 0x290a ? 0 : payload.readUInt16BE(0);
      const hdrOff = op === 0x290a ? 1 : 2 + mCnt * 6;
      const gzLen = (payload[gzPos - 3] << 16) | (payload[gzPos - 2] << 8) | payload[gzPos - 1];
      if (mCnt <= 30 && hdrOff + 10 <= gzPos - 3 && gzPos + gzLen <= payload.length) {
        try {
          const u = zlib.gunzipSync(payload.subarray(gzPos, gzPos + gzLen));
          const mapId = payload.readInt16BE(hdrOff + 2);
          if (mapId > 0 && mapId < 5000 && u[2] > 0 && u[3] > 0) {
            const cleanPayload = Buffer.concat([
              Buffer.from([0x00, 0x00]),
              payload.subarray(hdrOff, hdrOff + 10),
              Buffer.from([0x00, 0x00, 0x00, 0x00]),
              payload.subarray(gzPos - 3),
            ]);
            found291b.push({ off: i, mapId, cols: u[2], rows: u[3], uLen: u.length, payload: cleanPayload });
            foundMapId = mapId;
          }
        } catch {}
      }
    }
  } else if (op === 0x2907 && len >= 50 && len <= 20000) {
    if (payload.length > 16 && payload[14] === 0x1f && payload[15] === 0x8b) {
      const gzLen = (payload[11] << 16) | (payload[12] << 8) | payload[13];
      if (14 + gzLen <= payload.length) {
        try {
          const u = zlib.gunzipSync(payload.subarray(14, 14 + gzLen));
          found2907.push({ off: i, gx: payload[5], gy: payload[6], npcCnt: u[0], uLen: u.length, payload });
        } catch {}
      }
    }
  } else if (op === 0x2918 && len >= 50 && len <= 62000) {
    if (payload.length > 6 && payload[4] === 0x1f && payload[5] === 0x8b) {
      const gzLen = (payload[1] << 16) | (payload[2] << 8) | payload[3];
      if (4 + gzLen <= payload.length) {
        try {
          const u = zlib.gunzipSync(payload.subarray(4, 4 + gzLen));
          found2918.push({ off: i, numSpr: u[0], uLen: u.length, payload });
        } catch {}
      }
    }
  } else if (op === 0x2928 && len >= 10 && len <= 60000) {
    const cnt = payload.readInt16BE(0);
    if (cnt >= 1 && cnt <= 200) {
      let p = 2, valid = 0;
      for (let k = 0; k < cnt; k++) {
        if (p + 7 > payload.length) break;
        const id = payload.readInt32BE(p); p += 4;
        const l = (payload[p] << 16) | (payload[p + 1] << 8) | payload[p + 2]; p += 3;
        if (l < 0 || p + l > payload.length) break;
        p += l;
        valid++;
      }
      if (valid === cnt && p === payload.length) {
        found2928.push({ off: i, cnt: valid, payload: payload.subarray(0, p) });
      }
    }
  } else if (op === 0x2ee4 && len >= 20 && len <= 20000) {
    if (payload[0] === 0 && payload[1] >= 1 && payload[1] <= 120) {
      const strLen = (payload[5] << 16) | (payload[6] << 8) | payload[7];
      if (strLen >= 1 && strLen <= 50) {
        found2ee4.push({ off: i, cnt: payload[1], payload: payload.subarray(1) });
      }
    }
  } else if (op === 0x36b1 && len >= 20 && len <= 20000) {
    const teacherId = payload.readInt16BE(0);
    const cnt = payload[2];
    const strLen = (payload[7] << 16) | (payload[8] << 8) | payload[9];
    if (teacherId > 0 && teacherId < 10000 && cnt >= 1 && cnt <= 127 && strLen >= 1 && strLen <= 50) {
      found36b1.push({ off: i, teacherId, cnt, payload });
    }
  } else if (op === 0x38a5 && len >= 6 && len <= 20000) {
    const cnt = payload[0];
    if (cnt >= 1 && cnt <= 20) {
      found38a5.push({ off: i, cnt, payload });
    }
  }
}

console.log(`Scan of ${path.basename(dumpFile)}:`);
console.log(`  291a: ${found291a.length}, 291b: ${found291b.length} (mapId=${foundMapId}), 2907: ${found2907.length}, 2918: ${found2918.length}, 2928: ${found2928.length}`);
console.log(`  2ee4 (ItemShop): ${found2ee4.length}, 36b1 (SkillShop): ${found36b1.length}, 38a5 (NpcMission): ${found38a5.length}`);

for (const a of found291a) {
  const fn = path.join(outDir, `wmlist_${a.cnt}_${a.payload.length}_291a.bin`);
  fs.writeFileSync(fn, a.payload);
  console.log(`  Saved ${path.basename(fn)} (cnt=${a.cnt})`);
}

if (foundMapId > 0) {
  if (found291b.length > 0) {
    const last = found291b[found291b.length - 1];
    fs.writeFileSync(path.join(outDir, `map_${last.mapId}_291b.bin`), last.payload);
    console.log(`  Saved map_${last.mapId}_291b.bin (${last.cols}x${last.rows}, uLen=${last.uLen})`);
  }
  if (found2907.length > 0) {
    const last = found2907[found2907.length - 1];
    fs.writeFileSync(path.join(outDir, `map_${foundMapId}_2907.bin`), last.payload);
    console.log(`  Saved map_${foundMapId}_2907.bin (gx=${last.gx}, gy=${last.gy}, npcCnt=${last.npcCnt})`);
  }
  if (found2918.length > 0) {
    const last = found2918[found2918.length - 1];
    fs.writeFileSync(path.join(outDir, `map_${foundMapId}_2918.bin`), last.payload);
    console.log(`  Saved map_${foundMapId}_2918.bin (numSpr=${last.numSpr}, uLen=${last.uLen})`);
  }
  if (found2928.length > 0) {
    const seen = new Map();
    for (const p of found2928) {
      const cnt = p.payload.readInt16BE(0);
      let pos = 2;
      for (let k = 0; k < cnt; k++) {
        if (pos + 7 > p.payload.length) break;
        const start = pos;
        const id = p.payload.readInt32BE(pos); pos += 4;
        const l = (p.payload[pos] << 16) | (p.payload[pos + 1] << 8) | p.payload[pos + 2]; pos += 3;
        if (pos + l > p.payload.length) break;
        pos += l;
        seen.set(id, p.payload.subarray(start, pos));
      }
    }
    const hdr = Buffer.alloc(2);
    hdr.writeInt16BE(seen.size, 0);
    fs.writeFileSync(path.join(outDir, `map_${foundMapId}_2928.bin`), Buffer.concat([hdr, ...seen.values()]));
    console.log(`  Saved map_${foundMapId}_2928.bin (unique tiles/palettes=${seen.size})`);
  }
}

for (const s of found36b1) {
  const fn = path.join(outDir, `skillshop_${s.teacherId}_36b1.bin`);
  fs.writeFileSync(fn, s.payload);
  console.log(`  Saved ${path.basename(fn)} (cnt=${s.cnt}, bytes=${s.payload.length})`);
}
for (let idx = 0; idx < found2ee4.length; idx++) {
  const s = found2ee4[idx];
  const fn = path.join(outDir, `itemshop_${s.cnt}_${s.payload.length}_2ee4.bin`);
  fs.writeFileSync(fn, s.payload);
  console.log(`  Saved ${path.basename(fn)} (cnt=${s.cnt}, bytes=${s.payload.length})`);
}
for (let idx = 0; idx < found38a5.length; idx++) {
  const s = found38a5[idx];
  const fn = path.join(outDir, `npcmss_${s.off.toString(16)}_38a5.bin`);
  fs.writeFileSync(fn, s.payload);
  console.log(`  Saved ${path.basename(fn)} (cnt=${s.cnt})`);
}
