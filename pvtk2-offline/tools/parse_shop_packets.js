#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const dir = 'D:/REA/app/pvtk2-offline/work/captured_maps';
const files = fs.readdirSync(dir).filter(f => f.endsWith('_2ee4.bin') || f.endsWith('_36b1.bin') || f.endsWith('_38a5.bin'));

function getItemClass(type) {
  // Let's check Item.getItemClass() or infer from type
  if (type === 28) return 4; // or 5? Let's inspect next bytes
  return 0;
}

for (const fn of files) {
  const b = fs.readFileSync(path.join(dir, fn));
  if (fn.endsWith('_2ee4.bin')) {
    console.log(`=== ${fn} (len=${b.length}, status=${b[0]}, cnt=${b[1]}) ===`);
    let p = 2;
    const rByte = () => b.readInt8(p++);
    const rShort = () => { const v = b.readInt16BE(p); p += 2; return v; };
    const rInt = () => { const v = b.readInt32BE(p); p += 4; return v; };
    const rLen = () => { const v = (b[p] << 16) | (b[p + 1] << 8) | b[p + 2]; p += 3; return v; };
    const rStr = () => {
      const l = rLen();
      let s = '';
      for (let i = 0; i < l; i++) { s += String.fromCharCode(b.readUInt16BE(p)); p += 2; }
      return s;
    };
    const cnt = b[1];
    for (let i = 0; i < cnt && p < b.length; i++) {
      const type = rByte();
      const id = rShort() & 0xffff;
      const name = rStr();
      const bagIcon = rByte() & 0xff;
      const info = rStr();
      const grade = rByte();
      const autoBinding = rByte();
      const stackNum = rByte();
      console.log(`  item[${i}]: type=${type}, id=${id}, name="${name}", bagIcon=${bagIcon}, grade=${grade}, bind=${autoBinding}, stack=${stackNum}, info="${info}"`);
      console.log(`    rem hex (${b.length - p}B):`, b.subarray(p, Math.min(b.length, p + 48)).toString('hex'));
      break;
    }
  }
}
