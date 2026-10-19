#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const capDir = 'D:/REA/app/pvtk2-offline/work/captured_maps';
const files = fs.readdirSync(capDir).filter(f => f.endsWith('_2907.bin')).sort();

function parse2907(buf) {
  const gzPos = buf.indexOf(Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
  if (gzPos < 3) return [];
  const gzLen = (buf[gzPos - 3] << 16) | (buf[gzPos - 2] << 8) | buf[gzPos - 1];
  const u = zlib.gunzipSync(buf.subarray(gzPos, gzPos + gzLen));

  let p = 0;
  const rByte = () => u.readInt8(p++);
  const rUByte = () => u.readUInt8(p++);
  const rShort = () => { const v = u.readInt16BE(p); p += 2; return v; };
  const rUTF = () => { const l = u.readUInt16BE(p); p += 2; const s = u.subarray(p, p + l).toString('utf8'); p += l; return s; };

  const cnt = rUByte();
  const npcs = [];
  for (let i = 0; i < cnt && p < u.length; i++) {
    const sign = rByte();
    const id = rUByte();
    const missionGroupID = rByte();
    const npcType = rByte();
    const icon1 = rShort();
    const businessIcon = rShort();
    const name = rUTF();
    const welcome = rUTF();
    const talkDetail = rUTF();
    const status = rUByte();
    const dir = rByte();
    const gx = rByte();
    const gy = rByte();
    const rangeX = rByte();
    const rangeY = rByte();
    let mssData = null;
    if ((status & 0x08) !== 0) {
      mssData = [rShort(), rByte(), rShort(), rByte()];
    }
    const extra = {};
    if (npcType === 1) {
      extra.battleID = rShort();
      extra.comeOutTime = rUByte();
    } else if (npcType === 2) {
      extra.topic = rUTF();
      extra.shopID = rShort();
    } else if (npcType === 3 || npcType === 8) {
      extra.topic = rUTF();
      extra.jumpMapID = rShort();
      extra.jumpMapGx = rByte();
      extra.jumpMapGy = rByte();
    } else if (npcType === 5) {
      extra.jumps = [];
      extra.battles = [];
      extra.shops = [];
      extra.teachers = [];
      const jCnt = rByte();
      for (let k = 0; k < jCnt; k++) {
        extra.jumps.push({ menu: rUTF(), mapId: rShort(), gx: rByte(), gy: rByte(), reqMss: rShort(), reqState: rByte() });
      }
      const bCnt = rByte();
      for (let k = 0; k < bCnt; k++) {
        extra.battles.push({ menu: rUTF(), battleID: rShort(), reqMss: rShort(), reqState: rByte() });
      }
      const sCnt = rByte();
      for (let k = 0; k < sCnt; k++) {
        extra.shops.push({ menu: rUTF(), shopID: rShort(), reqMss: rShort(), reqState: rByte() });
      }
      const tCnt = rByte();
      for (let k = 0; k < tCnt; k++) {
        extra.teachers.push({ menu: rUTF(), teacherId: rShort(), reqMss: rShort(), reqState: rByte() });
      }
    } else if (npcType === 7) {
      extra.topic = rUTF();
      extra.teacherId = rShort();
    } else if (npcType === 9) {
      extra.topic = rUTF();
    }
    npcs.push({ i, id, npcType, sign, missionGroupID, icon1, businessIcon, status, dir, gx, gy, rangeX, rangeY, name, welcome, talkDetail, mssData, extra });
  }
  return npcs;
}

const out = {};
for (const f of files) {
  out[f] = parse2907(fs.readFileSync(path.join(capDir, f)));
  console.log(`${f}: ${out[f].length} NPCs/monsters`);
}
fs.writeFileSync('D:/REA/app/pvtk2-offline/work/all_captured_npcs.json', JSON.stringify(out, null, 2));
