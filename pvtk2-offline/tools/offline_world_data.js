'use strict';
/**
 * Generator for PVTK2 Offline Maps (`assets/map/<id>.m`),
 * Per-Map NPC/Sprite/Monster Data Packets (`assets/map/<id>_mini.m`),
 * WorldMap Region & Sub-Map Lists (`assets/map/1000_mini.m` .. `1016_mini.m`),
 * and Initial World Data Packet (`assets/android_params.js`).
 *
 * Binary formats match the exact reverse-engineered parsers in classes2.dex:
 * - GameMap.loadLocalMap(mapId, false) -> GZIP.inflate -> GameMap.fromBytes(DataInputStream) (0x25c54c)
 * - MsgHandler.processDataBlockFlagMsg(Message) (0x252324):
 *     Bit 0x08   (8)    : processDataPlayerMission (0x25297c) -> Mission.fromBytes (0x20a180)
 *     Bit 0x10   (16)   : processDataPlayerItemMsg (0x24ec2c) -> Item.fromBytes (0x1fda2c / 0x1fda94)
 *     Bit 0x20   (32)   : processDataPlayerSkillMsg (0x24ec6c) -> Skill.fromBytes (0x21f644)
 *     Bit 0x400  (1024) : NPC.parseNPCData(GZIP.inflate(msg.getBytes())) + FragmentData.fromNormalData(msg)
 *     Bit 0x800  (2048) : processDataMonsterGroupMsg (0x2528b8) -> MonsterGroup.fromBytes (0x20bda8)
 *     Bit 0x1000 (4096) : processDataMonsterMsg (0x2497b4) + processDataMonsterAIMsg (0x252840)
 *     Bit 0x2000 (8192) : processDataMapImageMsg (0x252750) -> ResourceHandler.mapImage
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CAPTURED_DIR = 'D:/REA/app/pvtk2-offline/work/captured_maps';
const RAM_DUMPS_DIR = 'D:/REA/app/pvtk2-offline/work/ram_dumps';
const MAP_PNGS_DIR = 'D:/REA/app/pvtk2-offline/build/map_pngs';

// Big-endian DataOutputStream writer (matches java.io.DataInputStream)
class DataOutputWriter {
  constructor() {
    this.chunks = [];
  }
  writeByte(v) {
    const b = Buffer.alloc(1);
    b[0] = v & 0xff;
    this.chunks.push(b);
  }
  writeBoolean(v) {
    this.writeByte(v ? 1 : 0);
  }
  writeShort(v) {
    const b = Buffer.alloc(2);
    b.writeInt16BE((v << 16) >> 16, 0);
    this.chunks.push(b);
  }
  writeInt(v) {
    const b = Buffer.alloc(4);
    b.writeInt32BE(v | 0, 0);
    this.chunks.push(b);
  }
  writeUTF(str) {
    const utf8 = Buffer.from(str || '', 'utf8');
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(utf8.length, 0);
    this.chunks.push(lenBuf, utf8);
  }
  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

// Big-endian com.hz.net.Message writer (matches com.hz.net.Message get* readers at 0x260164)
class NetMessageWriter {
  constructor() {
    this.chunks = [];
  }
  putByte(v) {
    const b = Buffer.alloc(1);
    b[0] = v & 0xff;
    this.chunks.push(b);
  }
  putBoolean(v) {
    this.putByte(v ? 1 : 0);
  }
  putShort(v) {
    const b = Buffer.alloc(2);
    b.writeInt16BE((v << 16) >> 16, 0);
    this.chunks.push(b);
  }
  putInt(v) {
    const b = Buffer.alloc(4);
    b.writeInt32BE(v | 0, 0);
    this.chunks.push(b);
  }
  putLong(v) {
    const b = Buffer.alloc(8);
    b.writeBigInt64BE(BigInt(v), 0);
    this.chunks.push(b);
  }
  putLength(len) {
    const b = Buffer.alloc(3);
    b[0] = (len >>> 16) & 0xff;
    b[1] = (len >>> 8) & 0xff;
    b[2] = len & 0xff;
    this.chunks.push(b);
  }
  putString(str) {
    const s = str || '';
    this.putLength(s.length);
    if (s.length > 0) {
      const b = Buffer.alloc(s.length * 2);
      for (let i = 0; i < s.length; i++) {
        b.writeUInt16BE(s.charCodeAt(i), i * 2);
      }
      this.chunks.push(b);
    }
  }
  putBytes(buf) {
    const data = buf || Buffer.alloc(0);
    this.putLength(data.length);
    if (data.length > 0) {
      this.chunks.push(Buffer.from(data));
    }
  }
  putRaw(buf) {
    if (buf && buf.length > 0) {
      this.chunks.push(Buffer.from(buf));
    }
  }
  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

/**
 * Authentic captured server maps (`0x291b` + `0x2907` + `0x2918` + `0x2928`).
 */
const CAPTURED_SERVER_MAPS = [
  { mapId: 900, mSrcId: 900, dataSrcId: 900, name: 'Cổng Làng', gx: 22, gy: 7 },
  { mapId: 901, mSrcId: 901, dataSrcId: 901, name: 'Rừng Phong', gx: 24, gy: 6 },
  { mapId: 902, mSrcId: 902, dataSrcId: 902, name: 'Khu Vong Giả', gx: 20, gy: 26 },
  { mapId: 5, mSrcId: 5, dataSrcId: 5, name: 'Tân Nguyệt Trấn', gx: 10, gy: 5 },
  { mapId: 14, mSrcId: 19, dataSrcId: 14, name: 'Quảng Trường Tân Nguyệt', gx: 9, gy: 36 },
  { mapId: 19, mSrcId: 19, dataSrcId: 19, name: 'Tân Nguyệt Cổ Trấn', gx: 3, gy: 2 },
  { mapId: 906, mSrcId: 906, dataSrcId: 906, name: 'Thành Thái Dương', gx: 15, gy: 12 },
  { mapId: 4, mSrcId: 4, dataSrcId: 4, name: 'Điện Đón Khách (Thục Sơn)', gx: 19, gy: 12 },
  { mapId: 254, mSrcId: 254, dataSrcId: 254, name: 'Rừng Cổ Thụ', gx: 25, gy: 4 },
  { mapId: 22, mSrcId: 22, dataSrcId: 22, name: 'Chân Núi Nguyệt Nha', gx: 6, gy: 28 },
  { mapId: 920, mSrcId: 920, dataSrcId: 920, name: 'Đồng Tuyệt Vọng', gx: 7, gy: 5 },
  { mapId: 13, mSrcId: 13, dataSrcId: 13, name: 'Ngoại Ô Tử C.Thành', gx: 15, gy: 15 },
  { mapId: 820, mSrcId: 820, dataSrcId: 820, name: 'Sa Mạc Xích Viêm', gx: 5, gy: 10 },
  { mapId: 824, mSrcId: 824, dataSrcId: 824, name: 'Tử Cấm Thành', gx: 23, gy: 24 },
  { mapId: 825, mSrcId: 825, dataSrcId: 825, name: 'Chân Núi Tử Vân', gx: 31, gy: 29 },
  // Connected portal & Trạm Phi Hành target aliases so every portal/NPC jump across all 15 maps works seamlessly:
  { mapId: 7, mSrcId: 254, dataSrcId: 254, name: 'Bản Đồ Thanh Minh', gx: 25, gy: 4 },
  { mapId: 16, mSrcId: 4, dataSrcId: 4, name: 'Quảng Trường Thần Kiếm', gx: 19, gy: 12 },
  { mapId: 20, mSrcId: 254, dataSrcId: 254, name: 'Rừng Trồng Cây', gx: 25, gy: 4 },
  { mapId: 23, mSrcId: 22, dataSrcId: 22, name: 'Đỉnh Nguyệt Nha', gx: 6, gy: 28 },
  { mapId: 251, mSrcId: 254, dataSrcId: 254, name: 'Rừng Tinh Linh', gx: 25, gy: 4 },
  { mapId: 257, mSrcId: 254, dataSrcId: 254, name: 'Bản Đồ Mạo Hiểm', gx: 25, gy: 4 },
  { mapId: 263, mSrcId: 906, dataSrcId: 906, name: 'Di Tích Thánh Vực', gx: 15, gy: 12 },
  { mapId: 279, mSrcId: 820, dataSrcId: 820, name: 'Sa Mạc Thất Hồn (PB)', gx: 5, gy: 10 },
  { mapId: 293, mSrcId: 22, dataSrcId: 22, name: 'Sơn Động Nguyệt Nha', gx: 6, gy: 28 },
  { mapId: 300, mSrcId: 820, dataSrcId: 820, name: 'Doanh Trại Đoàn Tùy Táng', gx: 5, gy: 10 },
  { mapId: 301, mSrcId: 825, dataSrcId: 825, name: 'Trại Huyết Yên (PB)', gx: 31, gy: 29 },
  { mapId: 456, mSrcId: 13, dataSrcId: 13, name: 'Tam Tộc Phía Bắc', gx: 15, gy: 15 },
  { mapId: 459, mSrcId: 4, dataSrcId: 4, name: 'Đền Hùng Vương', gx: 19, gy: 12 },
  { mapId: 807, mSrcId: 825, dataSrcId: 825, name: 'Thích Khách Hành Động', gx: 31, gy: 29 },
  { mapId: 813, mSrcId: 902, dataSrcId: 902, name: 'Mộ Hán Vương', gx: 20, gy: 26 },
  { mapId: 819, mSrcId: 820, dataSrcId: 820, name: 'Sa Mạc Thất Hồn', gx: 5, gy: 10 },
  { mapId: 826, mSrcId: 825, dataSrcId: 825, name: 'Núi Tử Vân', gx: 31, gy: 29 },
  { mapId: 832, mSrcId: 920, dataSrcId: 920, name: 'Thần Táng Trường', gx: 7, gy: 5 },
  { mapId: 833, mSrcId: 13, dataSrcId: 13, name: 'Thái Hoa Thôn', gx: 15, gy: 15 },
  { mapId: 835, mSrcId: 19, dataSrcId: 19, name: 'Khu Gia Viên', gx: 3, gy: 2 },
  { mapId: 836, mSrcId: 5, dataSrcId: 5, name: 'Tiên Phủ Gia Viên', gx: 10, gy: 5 },
  { mapId: 903, mSrcId: 902, dataSrcId: 902, name: 'U Hồn Cốc', gx: 20, gy: 26 },
  { mapId: 905, mSrcId: 900, dataSrcId: 900, name: 'Thục Sơn Cổng Làng', gx: 22, gy: 7 },
  { mapId: 907, mSrcId: 254, dataSrcId: 254, name: 'Rừng Dạ Ngữ', gx: 25, gy: 4 },
  { mapId: 911, mSrcId: 13, dataSrcId: 13, name: 'Phụ Bản Nguyên Đán', gx: 15, gy: 15 },
  { mapId: 912, mSrcId: 19, dataSrcId: 19, name: 'Quốc Tế Lao Động', gx: 3, gy: 2 },
  { mapId: 914, mSrcId: 902, dataSrcId: 902, name: 'Mộ Phong Ấn', gx: 20, gy: 26 },
  { mapId: 921, mSrcId: 920, dataSrcId: 920, name: 'Đồng Băng Hoang', gx: 7, gy: 5 },
  { mapId: 936, mSrcId: 824, dataSrcId: 824, name: 'Cung Điện Kết Hôn', gx: 23, gy: 24 },
  { mapId: 937, mSrcId: 22, dataSrcId: 22, name: 'Phụ Bản Trâu Làm Loạn', gx: 6, gy: 28 },
  { mapId: 945, mSrcId: 820, dataSrcId: 820, name: 'Đấu Trường Bá Thiên Hổ', gx: 5, gy: 10 },
  { mapId: 952, mSrcId: 19, dataSrcId: 19, name: 'Bản Đồ Hoạt Động MJ', gx: 3, gy: 2 },
  { mapId: 954, mSrcId: 906, dataSrcId: 906, name: 'Trường Đấu Sủng', gx: 15, gy: 12 },
  { mapId: 955, mSrcId: 825, dataSrcId: 825, name: 'Doanh Trại Diệt Oa Khấu', gx: 31, gy: 29 },
  { mapId: 956, mSrcId: 824, dataSrcId: 824, name: 'Cầu Ô Thước (Thất Tịch)', gx: 23, gy: 24 },
  { mapId: 958, mSrcId: 19, dataSrcId: 14, name: 'Phó Bản Tết Trung Thu', gx: 9, gy: 36 },
  { mapId: 967, mSrcId: 824, dataSrcId: 824, name: 'Đền Nguyệt Lão', gx: 23, gy: 24 },
  { mapId: 974, mSrcId: 820, dataSrcId: 820, name: 'Phụ Bản Liệt Diễm', gx: 5, gy: 10 },
  { mapId: 988, mSrcId: 920, dataSrcId: 920, name: 'Vực Sâu Vô Cực', gx: 7, gy: 5 },
];

/**
 * Converts a captured server `0x291b` packet (`map_<mSrcId>_291b.bin`) into a local `.m` GZIP buffer
 * compatible with `GameMap.loadLocalMap(mapId, false)` by writing `mapName` into the UTF header
 * and setting `crossData = 0` so all tiles are passable offline.
 */
function convertCapturedServerMapToLocalM(mSrcId, mapName) {
  const b = fs.readFileSync(path.join(CAPTURED_DIR, `map_${mSrcId}_291b.bin`));
  const gzSig = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);
  const gzPos = b.indexOf(gzSig);
  if (gzPos < 3) {
    throw new Error(`GZIP signature not found in map_${mSrcId}_291b.bin`);
  }
  const gzLen = (b[gzPos - 3] << 16) | (b[gzPos - 2] << 8) | b[gzPos - 1];
  const m = zlib.gunzipSync(b.subarray(gzPos, gzPos + gzLen));

  let pos = 0;
  const utfLen = m.readUInt16BE(pos);
  pos += 2 + utfLen;
  const afterNamePos = pos;

  const cols = m[pos++];
  const rows = m[pos++];
  const imgCnt = m[pos++];
  pos += imgCnt * 3;
  const totalTiles = m[pos++];
  const numSets = m[pos++];
  pos += numSets * 4;

  const beforeCrossPos = pos;
  const crossInts = m[pos++];
  pos += crossInts * 4;
  const afterCrossPos = pos;

  const nameWriter = new DataOutputWriter();
  nameWriter.writeUTF(mapName);
  const nameBuf = nameWriter.toBuffer();

  const patchedUncompressed = Buffer.concat([
    nameBuf,
    m.subarray(afterNamePos, beforeCrossPos),
    Buffer.from([0]), // crossData = 0 (all tiles passable offline)
    m.subarray(afterCrossPos),
  ]);

  return zlib.gzipSync(patchedUncompressed, { level: 9 });
}

/**
 * Extracts NPC GZIP, Sprite GZIP, and MonsterGroup+Monster+MonsterAI raw bytes
 * for a captured server map (`map_<dataSrcId>_2907.bin` + `map_<dataSrcId>_2918.bin`).
 */
function extractCapturedMapBlocks(dataSrcId) {
  const b2907 = fs.readFileSync(path.join(CAPTURED_DIR, `map_${dataSrcId}_2907.bin`));
  const gx = b2907[5];
  const gy = b2907[6];
  const npcGzLen = (b2907[11] << 16) | (b2907[12] << 8) | b2907[13];
  const npcGzBuf = b2907.subarray(14, 14 + npcGzLen);
  const monsterBlockBuf = b2907.subarray(14 + npcGzLen, b2907.length - 3);

  const b2918 = fs.readFileSync(path.join(CAPTURED_DIR, `map_${dataSrcId}_2918.bin`));
  const sprGzLen = (b2918[1] << 16) | (b2918[2] << 8) | b2918[3];
  const sprGzBuf = b2918.subarray(4, 4 + sprGzLen);

  return { gx, gy, npcGzBuf, sprGzBuf, monsterBlockBuf };
}

/**
 * Merges all `map_*_2918.bin` sprite packets into a single GZIP payload containing
 * all unique `.spr` definitions and unique `.fr` definitions + PNG sheets.
 */
function buildMergedSpriteGzipPayload() {
  const sprMap = new Map();
  const frMap = new Map();

  const files = fs
    .readdirSync(CAPTURED_DIR)
    .filter((f) => /^map_\d+_2918\.bin$/.test(f))
    .sort();

  for (const f of files) {
    const b = fs.readFileSync(path.join(CAPTURED_DIR, f));
    const gzLen = (b[1] << 16) | (b[2] << 8) | b[3];
    const u = zlib.gunzipSync(b.subarray(4, 4 + gzLen));
    let pos = 0;
    const numSpr = u[pos++];
    for (let i = 0; i < numSpr; i++) {
      const start = pos;
      const id = u.readInt16BE(pos);
      pos += 2;
      const len = u.readUInt16BE(pos);
      pos += 2 + len;
      if (!sprMap.has(id)) {
        sprMap.set(id, u.subarray(start, pos));
      }
    }
    const numFr = u[pos++];
    for (let i = 0; i < numFr; i++) {
      const start = pos;
      const id = u.readInt16BE(pos);
      pos += 2;
      const len = u.readUInt16BE(pos);
      pos += 2 + len;
      const pngLen = u.readUInt16BE(pos);
      pos += 2 + pngLen;
      if (!frMap.has(id)) {
        frMap.set(id, u.subarray(start, pos));
      }
    }
  }

  const chunks = [Buffer.from([sprMap.size])];
  for (const raw of sprMap.values()) chunks.push(raw);
  chunks.push(Buffer.from([frMap.size]));
  for (const raw of frMap.values()) chunks.push(raw);

  return zlib.gzipSync(Buffer.concat(chunks), { level: 9 });
}

/**
 * Appends `Bit 0x2000` (`MsgHandler.processDataMapImageMsg`) containing all custom map tile
 * and palette entries merged across all captured `0x2928` packets + fallback tilesets.
 */
function writeMergedMapImagesToMessage(msg) {
  const imgMap = new Map();

  const files = fs
    .readdirSync(CAPTURED_DIR)
    .filter((f) => f.endsWith('2928.bin'))
    .sort();
  for (const f of files) {
    const b = fs.readFileSync(path.join(CAPTURED_DIR, f));
    if (b.length < 2) continue;
    const cnt = b.readInt16BE(0);
    let pos = 2;
    for (let i = 0; i < cnt; i++) {
      if (pos + 7 > b.length) break;
      const id = b.readInt32BE(pos);
      pos += 4;
      const len = (b[pos] << 16) | (b[pos + 1] << 8) | b[pos + 2];
      pos += 3;
      if (pos + len > b.length) break;
      const data = b.subarray(pos, pos + len);
      pos += len;
      const nameId = id & 0xffff;
      if (len > 0 && !imgMap.has(nameId)) {
        imgMap.set(nameId, { id, data });
      }
    }
  }

  // Fill any remaining nameIDs referenced by any captured map not present in 1.pn or 2928 captures
  const png72A = fs.readFileSync(path.join(MAP_PNGS_DIR, '0369_72x72.png')); // 72x72 (3x3 tileset)
  const png72B = fs.readFileSync(path.join(MAP_PNGS_DIR, '0315_72x72.png')); // 72x72 (3x3 tileset)
  const png24 = fs.readFileSync(path.join(MAP_PNGS_DIR, '0798_24x24.png')); // 24x24 (1x1 tile)
  const pnIds = new Set(
    fs.readdirSync(MAP_PNGS_DIR).map((f) => parseInt(f.split('_')[0], 10))
  );
  const fallbackIds = new Set([
    16, 17, 27, 98, 114, 117, 1390, 3028, 3071, 3094, 3095, 3110, 3112, 3116, 3117, 3118, 3120, 3127, 3153, 3158, 3166,
  ]);
  for (const f of fs.readdirSync(CAPTURED_DIR).filter((x) => /^map_\d+_291b\.bin$/.test(x))) {
    const b = fs.readFileSync(path.join(CAPTURED_DIR, f));
    const gzPos = b.indexOf(Buffer.from([0x1f, 0x8b, 0x08, 0x00]));
    if (gzPos < 3) continue;
    const gzLen = (b[gzPos - 3] << 16) | (b[gzPos - 2] << 8) | b[gzPos - 1];
    const m = zlib.gunzipSync(b.subarray(gzPos, gzPos + gzLen));
    let pos = 0;
    const uLen = m.readUInt16BE(pos);
    pos += 2 + uLen + 2;
    const imgCnt = m[pos++];
    for (let i = 0; i < imgCnt; i++) {
      const nid = m.readUInt16BE(pos);
      pos += 3;
      if (!pnIds.has(nid) && !imgMap.has(nid)) {
        fallbackIds.add(nid);
      }
    }
  }
  for (const fid of fallbackIds) {
    if (!imgMap.has(fid)) {
      const data = fid === 3117 ? png72A : fid === 3118 ? png72B : png24;
      imgMap.set(fid, { id: fid, data });
    }
  }

  const entries = [...imgMap.values()];
  msg.putShort(entries.length);
  for (const e of entries) {
    msg.putInt(e.id);
    msg.putBytes(e.data);
  }
}

/**
 * Shared catalog of verified PNG assets from `assets/map/1.pn` + `assets/map/1.pd`.
 */
const SHARED_GROUND_TILESETS = [
  { id: 302, c: 2, r: 2 },  // ts 0:  tiles 0..3   (48x48 Clean grey stone courtyard slabs)
  { id: 691, c: 2, r: 2 },  // ts 1:  tiles 4..7   (48x48 Royal grey marble paving slabs)
  { id: 162, c: 2, r: 2 },  // ts 2:  tiles 8..11  (48x48 White cobblestone plaza)
  { id: 803, c: 2, r: 2 },  // ts 3:  tiles 12..15 (48x48 Ancient fortress stone plaza)
  { id: 996, c: 2, r: 2 },  // ts 4:  tiles 16..19 (48x48 Golden-brown cobblestone road)
  { id: 1300, c: 3, r: 2 }, // ts 5:  tiles 20..25 (72x48 White imperial brick road)
  { id: 798, c: 1, r: 1 },  // ts 6:  tile  26     (24x24 Warm sandstone road tile)
  { id: 444, c: 2, r: 2 },  // ts 7:  tiles 27..30 (48x48 Bright green lawn grass)
  { id: 369, c: 3, r: 3 },  // ts 8:  tiles 31..39 (72x72 Lush green grass)
  { id: 304, c: 3, r: 2 },  // ts 9:  tiles 40..45 (72x48 Rich green forest grass)
  { id: 315, c: 3, r: 3 },  // ts 10: tiles 46..54 (72x72 Golden martial earth)
  { id: 106, c: 3, r: 3 },  // ts 11: tiles 55..63 (72x72 Dark cavern rock floor)
  { id: 1146, c: 3, r: 3 }, // ts 12: tiles 64..72 (72x72 Glowing red-hot lava floor)
  { id: 1331, c: 3, r: 3 }, // ts 13: tiles 73..81 (72x72 White snow & ice field)
  { id: 373, c: 1, r: 1 },  // ts 14: tile  82     (24x24 Clear turquoise pond water)
  { id: 417, c: 1, r: 1 },  // ts 15: tile  83     (24x24 Deep blue river water A)
  { id: 418, c: 1, r: 1 },  // ts 16: tile  84     (24x24 Deep blue river water B)
  { id: 981, c: 1, r: 1 },  // ts 17: tile  85     (24x24 Bright azure water)
];

const TS_BASE = [];
let _nextTile = 0;
for (const ts of SHARED_GROUND_TILESETS) {
  TS_BASE.push(_nextTile);
  _nextTile += ts.c * ts.r;
}
const TOTAL_TILES = _nextTile; // 86

function sampleTs(tsIdx, col, row) {
  const ts = SHARED_GROUND_TILESETS[tsIdx];
  return TS_BASE[tsIdx] + (row % ts.r) * ts.c + (col % ts.c);
}

const SHARED_OBJECT_SPECS = [
  { key: 'taijiPlatform', id: 544, w: 86, h: 107 },
  { key: 'taijiEmblem', id: 546, w: 63, h: 37 },
  { key: 'dragonCarpet', id: 949, w: 99, h: 51 },
  { key: 'redCarpet', id: 932, w: 77, h: 48 },
  { key: 'goldMedallion', id: 984, w: 76, h: 52 },
  { key: 'marbleMedallion', id: 178, w: 70, h: 37 },
  { key: 'jadeMedallion', id: 982, w: 69, h: 36 },
  { key: 'grandStairs', id: 390, w: 103, h: 80 },
  { key: 'stoneStairs', id: 43, w: 82, h: 58 },
  { key: 'woodStairs', id: 251, w: 68, h: 57 },
  { key: 'iceStairs', id: 507, w: 48, h: 58 },
  { key: 'stoneBridge', id: 269, w: 110, h: 58 },
  { key: 'lotusPink', id: 401, w: 62, h: 36 },
  { key: 'lotusPad', id: 408, w: 38, h: 30 },

  { key: 'imperialPavilion', id: 804, w: 87, h: 137 },
  { key: 'goldenTower', id: 705, w: 74, h: 157 },
  { key: 'teaPavilion', id: 122, w: 106, h: 57 },
  { key: 'umbrellaStall', id: 1110, w: 79, h: 101 },
  { key: 'palaceRoofWide', id: 1189, w: 143, h: 78 },
  { key: 'palaceRoofMain', id: 1198, w: 97, h: 84 },
  { key: 'palaceRoofSide', id: 1190, w: 100, h: 86 },
  { key: 'palaceHall', id: 1188, w: 81, h: 90 },
  { key: 'bluePavilionA', id: 346, w: 73, h: 71 },
  { key: 'bluePavilionB', id: 348, w: 71, h: 61 },
  { key: 'redPavilion', id: 1228, w: 61, h: 75 },
  { key: 'portalGate', id: 181, w: 105, h: 100 },
  { key: 'caveGate', id: 180, w: 105, h: 84 },
  { key: 'stoneArchway', id: 890, w: 95, h: 105 },
  { key: 'ancientArchway', id: 880, w: 67, h: 94 },
  { key: 'jadeGate', id: 942, w: 69, h: 61 },
  { key: 'tallPillarGate', id: 1245, w: 76, h: 130 },
  { key: 'swordMonument', id: 386, w: 55, h: 155 },
  { key: 'runicAltar', id: 1128, w: 90, h: 99 },
  { key: 'immortalShrine', id: 1330, w: 112, h: 80 },
  { key: 'swordFurnace', id: 910, w: 60, h: 58 },
  { key: 'goddessStatue', id: 276, w: 93, h: 134 },
  { key: 'qilinStatue', id: 952, w: 63, h: 108 },
  { key: 'lionStatue', id: 512, w: 36, h: 62 },
  { key: 'stoneLantern', id: 393, w: 44, h: 77 },
  { key: 'flamingBrazier', id: 73, w: 47, h: 72 },
  { key: 'marbleTower', id: 923, w: 45, h: 125 },
  { key: 'marblePillar', id: 922, w: 30, h: 108 },
  { key: 'marbleDome', id: 919, w: 51, h: 80 },
  { key: 'jadeFountain', id: 123, w: 59, h: 42 },
  { key: 'lotusFountain', id: 572, w: 56, h: 42 },
  { key: 'innBanner', id: 19, w: 44, h: 123 },
  { key: 'warDrum', id: 23, w: 49, h: 65 },
  { key: 'archeryTarget', id: 267, w: 47, h: 72 },
  { key: 'tallPineA', id: 1231, w: 114, h: 162 },
  { key: 'tallPineB', id: 1232, w: 100, h: 158 },
  { key: 'bloodBodhiTree', id: 4, w: 123, h: 119 },
  { key: 'lushTreeA', id: 87, w: 72, h: 57 },
  { key: 'lushTreeB', id: 88, w: 88, h: 61 },
  { key: 'peachBlossomA', id: 332, w: 37, h: 38 },
  { key: 'peachBlossomB', id: 333, w: 38, h: 35 },
  { key: 'immortalCrane', id: 395, w: 43, h: 72 },
  { key: 'lavaPillarA', id: 1149, w: 41, h: 82 },
  { key: 'lavaPillarB', id: 1150, w: 48, h: 85 },
  { key: 'lavaRock', id: 1147, w: 51, h: 42 },
  { key: 'iceCrystalA', id: 1171, w: 74, h: 78 },
  { key: 'iceCrystalB', id: 1176, w: 84, h: 87 },
  { key: 'iceCrystalC', id: 1177, w: 45, h: 64 },
  { key: 'glacialCloudA', id: 1182, w: 95, h: 46 },
  { key: 'glacialCloudB', id: 1185, w: 77, h: 68 },
  { key: 'jadePeakA', id: 361, w: 104, h: 58 },
  { key: 'jadePeakB', id: 363, w: 54, h: 75 },
  { key: 'jadePeakC', id: 365, w: 48, h: 94 },
];

const OBJ_BY_KEY = new Map();
SHARED_OBJECT_SPECS.forEach((spec, i) => {
  OBJ_BY_KEY.set(spec.key, {
    ...spec,
    imgIdx: SHARED_GROUND_TILESETS.length + i,
  });
});

function buildMapBinary(mapName, tilePicker, pixelPlacements, objectPlacements) {
  const out = new DataOutputWriter();
  const cols = 30;
  const rows = 30;

  out.writeUTF(mapName);
  out.writeByte(cols);
  out.writeByte(rows);

  const totalImages = SHARED_GROUND_TILESETS.length + SHARED_OBJECT_SPECS.length;
  out.writeByte(totalImages);
  for (const ts of SHARED_GROUND_TILESETS) {
    out.writeShort(ts.id);
    out.writeByte(0);
  }
  for (const spec of SHARED_OBJECT_SPECS) {
    out.writeShort(spec.id);
    out.writeByte(0);
  }

  out.writeByte(TOTAL_TILES);
  out.writeByte(SHARED_GROUND_TILESETS.length);
  for (let i = 0; i < SHARED_GROUND_TILESETS.length; i++) {
    const ts = SHARED_GROUND_TILESETS[i];
    out.writeByte(i);
    out.writeByte(0);
    out.writeByte(ts.c);
    out.writeByte(ts.r);
  }

  out.writeByte(0); // crossData = 0
  out.writeByte(3); // 3 layers

  out.writeByte(2); // TileLayer
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.writeByte(tilePicker(c, r));
    }
  }

  out.writeByte(3); // PixelLayer
  out.writeShort(pixelPlacements.length);
  for (const p of pixelPlacements) {
    const spec = OBJ_BY_KEY.get(p.key);
    const x = Math.round(p.gx * 24 + 12 - spec.w / 2);
    const y = Math.round(p.gy * 24 + 12 - spec.h / 2);
    out.writeShort(x);
    out.writeShort(y);
    out.writeByte(spec.imgIdx);
    out.writeByte(p.trans || 0);
  }

  out.writeByte(4); // PlayerLayer
  out.writeByte(0); // 0 mapSprites
  out.writeShort(objectPlacements.length);
  for (const o of objectPlacements) {
    const spec = OBJ_BY_KEY.get(o.key);
    const cx = Math.round(o.gx * 24 + 12);
    const by = Math.round(o.gy * 24 + 20);
    out.writeShort(cx);
    out.writeShort(by);
    out.writeByte(spec.imgIdx);
    out.writeByte(o.trans || 0);
  }

  return zlib.gzipSync(out.toBuffer(), { level: 9 });
}

/**
 * Builds all authentic captured server maps (`900, 901, 902, 5, 14, 19, 906, 4, 254, 22, 920` + portal aliases)
 * AND custom maps (`1, 2, 3, 6`).
 */
function buildAllOfflineMaps() {
  const maps = {};

  // 1. Convert all captured server maps & connected portal target aliases
  for (const cm of CAPTURED_SERVER_MAPS) {
    maps[cm.mapId] = convertCapturedServerMapToLocalM(cm.mSrcId, cm.name);
  }

  // 2. Also build custom maps 1, 2, 3, 6 (Tử Cấm Thành, Sa Mạc Thất Hồn, Maya, Thành Phong Tuyết)
  const commonPortals = [
    { gx: 15, gy: 4, key: 'portalGate' },
    { gx: 15, gy: 25, key: 'portalGate' },
    { gx: 5, gy: 15, key: 'portalGate' },
    { gx: 25, gy: 15, key: 'portalGate' },
  ];

  maps[1] = buildMapBinary(
    'Tử Cấm Thành',
    (c, r) => {
      const inPlaza = c >= 8 && c <= 22 && r >= 7 && r <= 19;
      const inNSRoad = c >= 14 && c <= 16 && r >= 3 && r <= 26;
      const inEWRoad = r >= 14 && r <= 16 && c >= 3 && c <= 26;
      const inMoat = (r === 20 || r === 21) && !inNSRoad && !(c >= 9 && c <= 11) && !(c >= 19 && c <= 21);
      if (inMoat) return (c + r) % 2 === 0 ? sampleTs(14, c, r) : sampleTs(15, c, r);
      if (inNSRoad) return sampleTs(5, c, r);
      if (inEWRoad) return sampleTs(4, c, r);
      if (inPlaza) {
        if (c >= 12 && c <= 18 && r >= 10 && r <= 17) return sampleTs(1, c, r);
        return sampleTs(0, c, r);
      }
      return ((Math.floor(c / 3) + Math.floor(r / 3)) % 2 === 0) ? sampleTs(8, c, r) : sampleTs(7, c, r);
    },
    [
      { gx: 15, gy: 15, key: 'taijiPlatform' },
      { gx: 15, gy: 15, key: 'taijiEmblem' },
      { gx: 15, gy: 12, key: 'dragonCarpet' },
      { gx: 15, gy: 10, key: 'grandStairs' },
      { gx: 11, gy: 15, key: 'goldMedallion' },
      { gx: 19, gy: 15, key: 'goldMedallion' },
      { gx: 15, gy: 18, key: 'redCarpet' },
      { gx: 15, gy: 20, key: 'stoneBridge' },
      { gx: 10, gy: 20, key: 'stoneBridge' },
      { gx: 20, gy: 20, key: 'stoneBridge' },
      { gx: 12, gy: 20, key: 'lotusPink' },
      { gx: 17, gy: 20, key: 'lotusPink' },
      { gx: 7, gy: 20, key: 'lotusPad' },
      { gx: 23, gy: 20, key: 'lotusPad' },
    ],
    [
      ...commonPortals,
      { gx: 15, gy: 8, key: 'imperialPavilion' },
      { gx: 11, gy: 8, key: 'goldenTower' },
      { gx: 19, gy: 8, key: 'goldenTower' },
      { gx: 10, gy: 13, key: 'teaPavilion' },
      { gx: 20, gy: 13, key: 'umbrellaStall' },
      { gx: 13, gy: 10, key: 'qilinStatue' },
      { gx: 17, gy: 10, key: 'qilinStatue', trans: 2 },
      { gx: 13, gy: 13, key: 'flamingBrazier' },
      { gx: 17, gy: 13, key: 'flamingBrazier' },
      { gx: 13, gy: 17, key: 'stoneLantern' },
      { gx: 17, gy: 17, key: 'stoneLantern' },
      { gx: 10, gy: 17, key: 'jadeFountain' },
      { gx: 20, gy: 17, key: 'jadeFountain' },
      { gx: 15, gy: 22, key: 'stoneArchway' },
      { gx: 8, gy: 10, key: 'peachBlossomA' },
      { gx: 22, gy: 10, key: 'peachBlossomB' },
      { gx: 8, gy: 18, key: 'immortalCrane' },
      { gx: 22, gy: 18, key: 'immortalCrane', trans: 2 },
      { gx: 6, gy: 8, key: 'tallPineA' },
      { gx: 24, gy: 8, key: 'tallPineB' },
      { gx: 6, gy: 24, key: 'tallPineA' },
      { gx: 24, gy: 24, key: 'tallPineB' },
    ]
  );

  maps[2] = buildMapBinary(
    'Sa Mạc Thất Hồn',
    (c, r) => {
      const inPlaza = c >= 7 && c <= 23 && r >= 7 && r <= 20;
      const inNSRoad = c >= 14 && c <= 16 && r >= 3 && r <= 26;
      const inEWRoad = r >= 14 && r <= 16 && c >= 3 && c <= 26;
      if (inNSRoad || inEWRoad) return sampleTs(5, c, r);
      if (inPlaza) {
        if (c >= 11 && c <= 19 && r >= 10 && r <= 18) return sampleTs(3, c, r);
        return sampleTs(0, c, r);
      }
      return sampleTs(10, c, r);
    },
    [
      { gx: 15, gy: 15, key: 'taijiPlatform' },
      { gx: 15, gy: 12, key: 'dragonCarpet' },
      { gx: 15, gy: 10, key: 'grandStairs' },
      { gx: 11, gy: 15, key: 'marbleMedallion' },
      { gx: 19, gy: 15, key: 'marbleMedallion' },
      { gx: 15, gy: 18, key: 'redCarpet' },
      { gx: 15, gy: 21, key: 'stoneStairs' },
    ],
    [
      ...commonPortals,
      { gx: 15, gy: 8, key: 'palaceRoofWide' },
      { gx: 10, gy: 9, key: 'palaceRoofMain' },
      { gx: 20, gy: 9, key: 'palaceRoofSide' },
      { gx: 9, gy: 13, key: 'palaceHall' },
      { gx: 21, gy: 13, key: 'palaceHall' },
      { gx: 13, gy: 10, key: 'qilinStatue' },
      { gx: 17, gy: 10, key: 'qilinStatue', trans: 2 },
      { gx: 13, gy: 13, key: 'warDrum' },
      { gx: 17, gy: 13, key: 'warDrum' },
      { gx: 13, gy: 17, key: 'flamingBrazier' },
      { gx: 17, gy: 17, key: 'flamingBrazier' },
      { gx: 10, gy: 18, key: 'archeryTarget' },
      { gx: 20, gy: 18, key: 'innBanner' },
      { gx: 15, gy: 22, key: 'stoneArchway' },
      { gx: 6, gy: 8, key: 'tallPineA' },
      { gx: 24, gy: 8, key: 'tallPineB' },
      { gx: 6, gy: 22, key: 'tallPineB' },
      { gx: 24, gy: 22, key: 'tallPineA' },
    ]
  );

  maps[3] = buildMapBinary(
    'Maya Thánh Thành',
    (c, r) => {
      const inForge = c >= 8 && c <= 22 && r >= 7 && r <= 20;
      const inRoad = (c >= 14 && c <= 16 && r >= 3 && r <= 26) || (r >= 14 && r <= 16 && c >= 3 && c <= 26);
      if (inRoad) return sampleTs(4, c, r);
      if (inForge) {
        if (c >= 11 && c <= 19 && r >= 10 && r <= 18) return sampleTs(10, c, r);
        return sampleTs(0, c, r);
      }
      return sampleTs(9, c, r);
    },
    [
      { gx: 15, gy: 15, key: 'taijiPlatform' },
      { gx: 15, gy: 15, key: 'goldMedallion' },
      { gx: 15, gy: 11, key: 'stoneStairs' },
      { gx: 11, gy: 15, key: 'jadeMedallion' },
      { gx: 19, gy: 15, key: 'jadeMedallion' },
      { gx: 15, gy: 19, key: 'woodStairs' },
    ],
    [
      ...commonPortals,
      { gx: 15, gy: 8, key: 'swordMonument' },
      { gx: 11, gy: 9, key: 'swordMonument' },
      { gx: 19, gy: 9, key: 'swordMonument' },
      { gx: 15, gy: 11, key: 'runicAltar' },
      { gx: 10, gy: 13, key: 'swordFurnace' },
      { gx: 20, gy: 13, key: 'swordFurnace' },
      { gx: 13, gy: 12, key: 'flamingBrazier' },
      { gx: 17, gy: 12, key: 'flamingBrazier' },
      { gx: 13, gy: 17, key: 'flamingBrazier' },
      { gx: 17, gy: 17, key: 'flamingBrazier' },
      { gx: 9, gy: 8, key: 'jadePeakA' },
      { gx: 21, gy: 8, key: 'jadePeakA' },
      { gx: 9, gy: 18, key: 'jadePeakB' },
      { gx: 21, gy: 18, key: 'jadePeakC' },
      { gx: 15, gy: 22, key: 'ancientArchway' },
      { gx: 6, gy: 10, key: 'tallPineA' },
      { gx: 24, gy: 10, key: 'tallPineB' },
    ]
  );

  maps[6] = buildMapBinary(
    'Thành Phong Tuyết',
    (c, r) => {
      const inSanctum = c >= 9 && c <= 21 && r >= 8 && r <= 19;
      const inRoad = (c >= 14 && c <= 16 && r >= 3 && r <= 26) || (r >= 14 && r <= 16 && c >= 3 && c <= 26);
      if (inRoad) return sampleTs(5, c, r);
      if (inSanctum) {
        if (c >= 12 && c <= 18 && r >= 11 && r <= 17) return sampleTs(1, c, r);
        return sampleTs(13, c, r);
      }
      return sampleTs(13, c, r);
    },
    [
      { gx: 15, gy: 15, key: 'taijiPlatform' },
      { gx: 15, gy: 15, key: 'taijiEmblem' },
      { gx: 15, gy: 12, key: 'marbleMedallion' },
      { gx: 15, gy: 10, key: 'grandStairs' },
      { gx: 11, gy: 15, key: 'jadeMedallion' },
      { gx: 19, gy: 15, key: 'jadeMedallion' },
      { gx: 15, gy: 18, key: 'iceStairs' },
    ],
    [
      ...commonPortals,
      { gx: 15, gy: 8, key: 'imperialPavilion' },
      { gx: 11, gy: 8, key: 'goddessStatue' },
      { gx: 19, gy: 8, key: 'goddessStatue', trans: 2 },
      { gx: 10, gy: 12, key: 'iceCrystalA' },
      { gx: 20, gy: 12, key: 'iceCrystalB' },
      { gx: 10, gy: 17, key: 'iceCrystalB' },
      { gx: 20, gy: 17, key: 'iceCrystalA' },
      { gx: 13, gy: 11, key: 'marbleTower' },
      { gx: 17, gy: 11, key: 'marbleTower' },
      { gx: 13, gy: 14, key: 'iceCrystalC' },
      { gx: 17, gy: 14, key: 'iceCrystalC' },
      { gx: 12, gy: 18, key: 'glacialCloudA' },
      { gx: 18, gy: 18, key: 'glacialCloudB' },
      { gx: 15, gy: 22, key: 'jadeGate' },
    ]
  );

  return maps;
}

/**
 * World-wide Fast Travel (`menuJumpMap`) entries included on custom Town / Hero NPCs.
 */
const WORLD_JUMP_MENUS = [
  { menu: '1. Cổng Làng (Tân Thủ Thôn)', mapId: 900, gx: 22, gy: 7 },
  { menu: '2. Rừng Phong (Cấp 1-5)', mapId: 901, gx: 24, gy: 6 },
  { menu: '3. Khu Vong Giả (Cấp 5-10)', mapId: 902, gx: 20, gy: 26 },
  { menu: '4. Tân Nguyệt Trấn (Đông Trấn)', mapId: 5, gx: 10, gy: 5 },
  { menu: '5. Quảng Trường Tân Nguyệt', mapId: 14, gx: 9, gy: 36 },
  { menu: '6. Tân Nguyệt Cổ Trấn (Phồn Hoa Đô)', mapId: 19, gx: 3, gy: 2 },
  { menu: '7. Thành Thái Dương (Trung Lập)', mapId: 906, gx: 15, gy: 12 },
  { menu: '8. Thục Sơn - Điện Đón Khách', mapId: 4, gx: 19, gy: 12 },
  { menu: '9. Rừng Tinh Linh - Rừng Cổ Thụ', mapId: 254, gx: 25, gy: 4 },
  { menu: '10. Chân Núi Nguyệt Nha', mapId: 22, gx: 6, gy: 28 },
  { menu: '11. Đồng Tuyệt Vọng', mapId: 920, gx: 7, gy: 5 },
  { menu: '12. Ngoại Ô Tử C.Thành', mapId: 13, gx: 15, gy: 15 },
  { menu: '13. Tử Cấm Thành (Bản Gốc)', mapId: 824, gx: 23, gy: 24 },
  { menu: '14. Sa Mạc Xích Viêm (Cấp 45)', mapId: 820, gx: 5, gy: 10 },
  { menu: '15. Chân Núi Tử Vân (Cấp 55)', mapId: 825, gx: 31, gy: 29 },
  { menu: '16. Phong Vân Thành (Custom)', mapId: 1, gx: 15, gy: 15 },
  { menu: '17. Thiên Hạ Hội (Custom)', mapId: 2, gx: 15, gy: 15 },
  { menu: '18. Maya Thánh Thành (Bái Kiếm)', mapId: 3, gx: 15, gy: 15 },
  { menu: '19. Thành Phong Tuyết (Thiên Môn)', mapId: 6, gx: 15, gy: 15 },
];

const CUSTOM_MAP_NPCS = {
  1: [
    {
      id: 1,
      sign: 1,
      npcType: 5,
      icon1: 701,
      name: 'Vô Danh (Dịch Trạm Thế Giới)',
      welcome: 'Thiên hạ phong vân xuất ngỗ bối!',
      talkDetail:
        'Chào thiếu hiệp! Đây là trung tâm Tử Cấm Thành. Ngươi có thể chọn chuyển sang bất kỳ Bản Đồ nào trong 15 đại bản đồ hoặc mở Bản Đồ Thế Giới!',
      dir: 2,
      gx: 15,
      gy: 12,
      jumps: WORLD_JUMP_MENUS,
      battles: [
        { menu: 'Tỷ thí Đấu Trường Tân Thủ', battleID: 1 },
        { menu: 'Khiêu chiến Thập Nhị Kinh Hoàng', battleID: 2 },
        { menu: 'Khiêu chiến Tuyệt Vô Thần (Boss)', battleID: 4 },
        { menu: 'Khiêu chiến Hùng Bá Thiên Hạ (Boss)', battleID: 5 },
      ],
    },
    {
      id: 2,
      sign: 2,
      npcType: 5,
      icon1: 705,
      name: 'Nhiếp Phong',
      welcome: 'Tuyết Ẩm Cuồng Đao - Phong Thần Cước!',
      talkDetail:
        'Băng Tâm Quyết giúp tâm cảnh bất động. Thiếu hiệp muốn luận bàn đao pháp hay cùng ta hành hiệp giang hồ?',
      dir: 2,
      gx: 12,
      gy: 14,
      jumps: WORLD_JUMP_MENUS,
      battles: [
        { menu: 'Tỷ thí Phong Thần Cước', battleID: 2 },
        { menu: 'Chinh phạt Vô Song Thành', battleID: 3 },
      ],
    },
    {
      id: 3,
      sign: 2,
      npcType: 5,
      icon1: 709,
      name: 'Bộ Kinh Vân',
      welcome: 'Tuyệt Thế Hảo Kiếm - Bài Vân Chưởng!',
      talkDetail:
        'Tuyệt Thế Hảo Kiếm đã xuất thế! Ngươi có dám cùng ta bước vào Kiếm Giới?',
      dir: 2,
      gx: 18,
      gy: 14,
      jumps: WORLD_JUMP_MENUS,
      battles: [
        { menu: 'Tỷ thí Bài Vân Chưởng', battleID: 3 },
        { menu: 'Quyết chiến Tuyệt Vô Thần (Boss)', battleID: 4 },
      ],
    },
    { id: 7, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Bắc: Cổng Làng', topic: 'Về Cổng Làng', gx: 15, gy: 5, rangeX: 2, rangeY: 2, jumpMapID: 900, jumpMapGx: 22, jumpMapGy: 7 },
    { id: 8, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Nam: Tân Nguyệt Trấn', topic: 'Tới Tân Nguyệt Trấn', gx: 15, gy: 24, rangeX: 2, rangeY: 2, jumpMapID: 5, jumpMapGx: 10, jumpMapGy: 5 },
    { id: 9, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Tây: Thành Thái Dương', topic: 'Tới Thành Thái Dương', gx: 6, gy: 15, rangeX: 2, rangeY: 2, jumpMapID: 906, jumpMapGx: 15, jumpMapGy: 12 },
    { id: 10, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Đông: Quảng Trường Tân Nguyệt', topic: 'Tới Quảng Trường Tân Nguyệt', gx: 24, gy: 15, rangeX: 2, rangeY: 2, jumpMapID: 14, jumpMapGx: 9, jumpMapGy: 36 },
    { id: 11, npcType: 1, icon1: 501, name: 'Sơn Tặc Tinh Anh', gx: 11, gy: 23, rangeX: 1, rangeY: 1, battleID: 1, comeOutTime: 8 },
    { id: 12, npcType: 1, icon1: 504, name: 'Hắc Phong Đao Khách', gx: 19, gy: 23, rangeX: 1, rangeY: 1, battleID: 2, comeOutTime: 8 },
  ],
  2: [
    {
      id: 1,
      sign: 1,
      npcType: 5,
      icon1: 718,
      name: 'Hùng Bá Bang Chủ',
      welcome: 'Kim lân há là vật trong ao, nhất ngộ phong vân tiện hóa long!',
      talkDetail:
        'Đây là Sa Mạc Thất Hồn - Thiên Hạ Hội Tổng Đàn của lão phu! Ngươi muốn khiêu chiến lão phu hay truyền tống sang bản đồ khác?',
      dir: 2,
      gx: 15,
      gy: 11,
      jumps: WORLD_JUMP_MENUS,
      battles: [
        { menu: 'Đánh bại Tinh Anh Thiên Hạ Hội', battleID: 3 },
        { menu: 'Quyết chiến Hùng Bá Chân Thân (Boss)', battleID: 5 },
      ],
    },
    { id: 7, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Bắc: Thành Phong Tuyết', topic: 'Tới Thành Phong Tuyết', gx: 15, gy: 5, rangeX: 2, rangeY: 2, jumpMapID: 6, jumpMapGx: 15, jumpMapGy: 15 },
    { id: 8, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Nam: Cổng Làng', topic: 'Về Cổng Làng', gx: 15, gy: 24, rangeX: 2, rangeY: 2, jumpMapID: 900, jumpMapGx: 22, jumpMapGy: 7 },
    { id: 11, npcType: 1, icon1: 504, name: 'Thiên Hạ Hội Đao Khách', gx: 11, gy: 22, rangeX: 1, rangeY: 1, battleID: 2, comeOutTime: 8 },
    { id: 12, npcType: 1, icon1: 512, name: 'Hùng Bá Thân Vệ', gx: 19, gy: 22, rangeX: 1, rangeY: 1, battleID: 5, comeOutTime: 10 },
  ],
  3: [
    {
      id: 1,
      sign: 1,
      npcType: 5,
      icon1: 709,
      name: 'Ngạo Thiên Trang Chủ',
      welcome: 'Bái Kiếm Sơn Trang trăm năm rèn Tuyệt Thế Hảo Kiếm!',
      talkDetail:
        'Vạn thanh thần kiếm tại Maya Thánh Thành đều cúi đầu trước Tuyệt Thế Hảo Kiếm!',
      dir: 2,
      gx: 15,
      gy: 12,
      jumps: WORLD_JUMP_MENUS,
      battles: [
        { menu: 'Đoạt Tuyệt Thế Hảo Kiếm', battleID: 4 },
        { menu: 'Khiêu chiến Kiếm Ma & Ngạo Thiên', battleID: 5 },
      ],
    },
    { id: 7, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Bắc: Cổng Làng', topic: 'Về Cổng Làng', gx: 15, gy: 5, rangeX: 2, rangeY: 2, jumpMapID: 900, jumpMapGx: 22, jumpMapGy: 7 },
    { id: 8, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Nam: Thành Thái Dương', topic: 'Tới Thành Thái Dương', gx: 15, gy: 24, rangeX: 2, rangeY: 2, jumpMapID: 906, jumpMapGx: 15, jumpMapGy: 12 },
    { id: 11, npcType: 1, icon1: 504, name: 'Hộ Kiếm Khôi Lỗi', gx: 11, gy: 22, rangeX: 1, rangeY: 1, battleID: 2, comeOutTime: 8 },
  ],
  6: [
    {
      id: 1,
      sign: 1,
      npcType: 5,
      icon1: 701,
      name: 'Đế Thích Thiên (Chí Tôn)',
      welcome: 'Thánh Tâm Quyết trường sinh bất tử, ta chính là Thần của nhân gian!',
      talkDetail:
        'Bản tọa đã sống hai ngàn năm nhờ máu Phượng Hoàng, sáng lập Thiên Môn Thánh Điện tại Thành Phong Tuyết!',
      dir: 2,
      gx: 15,
      gy: 11,
      jumps: WORLD_JUMP_MENUS,
      battles: [
        { menu: 'Khiêu chiến Thần Tướng Thiên Môn', battleID: 4 },
        { menu: 'Quyết chiến Đế Thích Thiên Chí Tôn (Final Boss)', battleID: 5 },
      ],
    },
    { id: 7, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Bắc: Cổng Làng', topic: 'Về Cổng Làng', gx: 15, gy: 5, rangeX: 2, rangeY: 2, jumpMapID: 900, jumpMapGx: 22, jumpMapGy: 7 },
    { id: 8, sign: 1, npcType: 8, icon1: 722, name: 'Cổng Nam: Đồng Tuyệt Vọng', topic: 'Tới Đồng Tuyệt Vọng', gx: 15, gy: 24, rangeX: 2, rangeY: 2, jumpMapID: 920, jumpMapGx: 7, jumpMapGy: 5 },
    { id: 11, npcType: 1, icon1: 512, name: 'Thiên Môn Băng Thần Tướng', gx: 11, gy: 21, rangeX: 1, rangeY: 1, battleID: 4, comeOutTime: 8 },
    { id: 12, npcType: 1, icon1: 518, name: 'Đế Thích Thiên Pháp Thân', gx: 19, gy: 21, rangeX: 1, rangeY: 1, battleID: 5, comeOutTime: 10 },
  ],
};

function buildCustomNpcCompressedPayload(mapId) {
  const dis = new DataOutputWriter();
  const npcs = CUSTOM_MAP_NPCS[mapId] || CUSTOM_MAP_NPCS[1];

  dis.writeByte(npcs.length);
  for (const n of npcs) {
    dis.writeByte(n.sign ?? 0);
    dis.writeByte(n.id);
    dis.writeByte(0);
    dis.writeByte(n.npcType);
    dis.writeShort(n.icon1);
    dis.writeShort(0);
    dis.writeUTF(n.name);
    dis.writeUTF(n.welcome || '');
    dis.writeUTF(n.talkDetail || '');
    dis.writeByte(3);
    dis.writeByte(n.dir ?? 2);
    dis.writeByte(n.gx);
    dis.writeByte(n.gy);
    dis.writeByte(n.rangeX ?? 1);
    dis.writeByte(n.rangeY ?? 1);

    if (n.npcType === 1) {
      dis.writeShort(n.battleID);
      dis.writeByte(n.comeOutTime ?? 10);
    } else if (n.npcType === 3 || n.npcType === 8) {
      dis.writeUTF(n.topic || n.name);
      dis.writeShort(n.jumpMapID ?? 900);
      dis.writeByte(n.jumpMapGx ?? 22);
      dis.writeByte(n.jumpMapGy ?? 7);
    } else if (n.npcType === 5) {
      const jumps = n.jumps || [];
      dis.writeByte(jumps.length);
      for (const j of jumps) {
        dis.writeUTF(j.menu);
        dis.writeShort(j.mapId);
        dis.writeByte(j.gx);
        dis.writeByte(j.gy);
        dis.writeShort(0);
        dis.writeByte(0);
      }
      const battles = n.battles || [];
      dis.writeByte(battles.length);
      for (const b of battles) {
        dis.writeUTF(b.menu);
        dis.writeShort(b.battleID);
        dis.writeShort(0);
        dis.writeByte(0);
      }
      dis.writeByte(0);
      dis.writeByte(0);
    }
  }

  return zlib.gzipSync(dis.toBuffer(), { level: 9 });
}

function writeCustomMonstersToMessage(msg) {
  const groups = [
    { groupId: 1, monsters: [1, 2, 1, 0, 0, 0, 0, 0, 0, 0] },
    { groupId: 2, monsters: [2, 3, 2, 1, 0, 0, 0, 0, 0, 0] },
    { groupId: 3, monsters: [3, 4, 3, 2, 0, 0, 0, 0, 0, 0] },
    { groupId: 4, monsters: [4, 5, 4, 3, 3, 0, 0, 0, 0, 0] },
    { groupId: 5, monsters: [5, 6, 5, 4, 4, 0, 0, 0, 0, 0] },
  ];
  msg.putByte(groups.length);
  for (const g of groups) {
    msg.putShort(g.groupId);
    msg.putByte(0);
    msg.putShort(0);
    msg.putByte(0);
    for (let i = 0; i < 10; i++) {
      msg.putShort(g.monsters[i] || 0);
    }
  }

  const monsters = [
    { id: 1, name: 'Sơn Tặc Đầu Mục', icon1: 604, level: 30, type: 0, hp: 1200, mp: 500, atk: 180 },
    { id: 2, name: 'Hắc Phong Đao Khách', icon1: 603, level: 40, type: 0, hp: 1800, mp: 600, atk: 240 },
    { id: 3, name: 'Thiên Trì Sát Thủ', icon1: 606, level: 50, type: 1, hp: 2500, mp: 800, atk: 320 },
    { id: 4, name: 'Vô Song Ma Tướng', icon1: 609, level: 55, type: 1, hp: 3200, mp: 1000, atk: 380 },
    { id: 5, name: 'Tuyệt Vô Thần', icon1: 612, level: 60, type: 2, hp: 4500, mp: 1500, atk: 450 },
    { id: 6, name: 'Hùng Bá Thiên Hạ', icon1: 615, level: 65, type: 2, hp: 5500, mp: 2000, atk: 520 },
  ];
  msg.putByte(monsters.length);
  for (const m of monsters) {
    msg.putInt(m.id);
    msg.putString(m.name);
    msg.putLong(m.icon1);
    msg.putByte(m.level);
    msg.putByte(m.type);
    msg.putInt(m.hp);
    msg.putInt(m.mp);
    msg.putInt(120);
    msg.putByte(0);
    msg.putInt(m.atk);
    msg.putInt(m.atk + 80);
    msg.putByte(1);
    msg.putInt(20);
    msg.putInt(m.atk);
    msg.putInt(m.atk);
    msg.putInt(m.atk);
    msg.putInt(100);
    msg.putInt(100);
    msg.putInt(100);
    msg.putInt(95);
    msg.putInt(95);
    msg.putShort(15);
    msg.putInt(10);
    msg.putInt(10);
    msg.putInt(10);
    msg.putInt(10);
    msg.putInt(10);
    msg.putInt(10);
    msg.putInt(0);
    msg.putInt(0);
    msg.putInt(0);
    msg.putInt(0);
    msg.putInt(0);
    msg.putLong(0);
    msg.putInt(0);
  }
  msg.putByte(0);
  msg.putByte(0);
}

/**
 * Builds a WorldMap sub-map list (`0x291a`) message buffer for `assets/map/<1000 + areaId>_mini.m`,
 * remapping `worldMapEntryId` (`objData.int0`) directly to the playable `mapId`.
 */
function buildWorldMapListPacket(areaId) {
  const file = path.join(CAPTURED_DIR, `wmlist_${areaId}_291a.bin`);
  const msg = new NetMessageWriter();

  if (fs.existsSync(file)) {
    const b = fs.readFileSync(file);
    let pos = 0;
    const readLen = () => {
      const l = (b[pos] << 16) | (b[pos + 1] << 8) | b[pos + 2];
      pos += 3;
      return l;
    };
    const readStr = () => {
      const l = readLen();
      let s = '';
      for (let i = 0; i < l; i++) {
        s += String.fromCharCode(b.readUInt16BE(pos));
        pos += 2;
      }
      return s;
    };

    const cnt = b[pos++];
    msg.putByte(cnt);
    for (let i = 0; i < cnt; i++) {
      const origId = b.readInt16BE(pos);
      pos += 2;
      const name = readStr();
      const desc = readStr();
      const f1 = b[pos++];
      const f2 = b[pos++];

      let targetMapId = 900;
      if (areaId === 1) targetMapId = origId === 1 ? 920 : 921;
      else if (areaId === 4) targetMapId = 906;
      else if (areaId === 5) {
        if (origId === 18) targetMapId = 900;
        else if (origId === 19) targetMapId = 901;
        else if (origId === 20) targetMapId = 902;
        else targetMapId = 903;
      } else if (areaId === 6) targetMapId = origId === 24 ? 254 : 251;
      else if (areaId === 7) targetMapId = origId === 28 ? 22 : 23;
      else if (areaId === 8) targetMapId = origId === 33 ? 4 : 16;
      else if (areaId === 9) {
        if (origId === 37) targetMapId = 5;
        else if (origId === 38) targetMapId = 14;
        else if (origId === 55) targetMapId = 19;
        else targetMapId = 14;
      } else if (areaId === 10) {
        targetMapId = origId === 57 ? 13 : 824;
      } else if (areaId === 11) {
        targetMapId = origId === 50 ? 825 : 826;
      } else if (areaId === 12) {
        targetMapId = origId === 43 ? 820 : origId === 44 ? 2 : 819;
      }

      msg.putShort(targetMapId);
      msg.putString(name);
      msg.putString(desc);
      msg.putByte(f1);
      msg.putByte(f2);
    }
    return msg.toBuffer();
  }

  // Fallback sub-map lists for regions 2, 3, 13, 14, 15, 16
  const customLists = {
    2: [
      { mapId: 901, name: 'Rừng Phong (Cấp 1-5)', desc: 'Luyện cấp' },
      { mapId: 254, name: 'Rừng Cổ Thụ (Cấp 12-15)', desc: 'Luyện cấp' },
    ],
    3: [
      { mapId: 263, name: 'Di Tích Thánh Vực (Trung lập)', desc: 'Thành thị' },
      { mapId: 906, name: 'Thành Thái Dương (Trung lập)', desc: 'Thành thị' },
    ],
    13: [
      { mapId: 824, name: 'Tử Cấm Thành (Bản Gốc)', desc: 'Thành thị' },
      { mapId: 1, name: 'Phong Vân Thành (Custom)', desc: 'Thành thị' },
    ],
    14: [
      { mapId: 825, name: 'Chân Núi Tử Vân (Cấp 55)', desc: 'Luyện cấp' },
      { mapId: 820, name: 'Sa Mạc Xích Viêm (Cấp 45)', desc: 'Luyện cấp' },
    ],
    15: [
      { mapId: 3, name: 'Maya Thánh Thành (Bái Kiếm)', desc: 'Thành thị' },
      { mapId: 906, name: 'Thành Thái Dương (Trung lập)', desc: 'Thành thị' },
    ],
    16: [
      { mapId: 6, name: 'Thành Phong Tuyết (Thiên Môn)', desc: 'Thành thị' },
      { mapId: 920, name: 'Đồng Tuyệt Vọng (Cấp 22-24)', desc: 'Luyện cấp' },
    ],
  };
  const list = customLists[areaId] || [{ mapId: 900, name: 'Cổng Làng (Tân Thủ)', desc: 'Luyện cấp' }];
  msg.putByte(list.length);
  for (const item of list) {
    msg.putShort(item.mapId);
    msg.putString(item.name);
    msg.putString(item.desc);
    msg.putByte(0);
    msg.putByte(0);
  }
  return msg.toBuffer();
}

/**
 * Builds all per-map jump packets (`assets/map/<id>_mini.m`), WorldMap packets (`1000_mini.m` .. `1016_mini.m`),
 * Offline ItemShop packets (`assets/map/<3000 + shopId>_mini.m`), and Offline SkillShop packets (`assets/map/<4000 + teacherId>_mini.m`).
 */
function buildAllMapJumpPackets() {
  const packets = {};
  const emptySprGzip = zlib.gzipSync(Buffer.from([0, 0]), { level: 9 });

  // 1. Authentic captured server maps & connected portal aliases
  for (const cm of CAPTURED_SERVER_MAPS) {
    const { gx, gy, npcGzBuf, sprGzBuf, monsterBlockBuf } = extractCapturedMapBlocks(cm.dataSrcId);
    const msg = new NetMessageWriter();
    msg.putInt(cm.mapId);
    msg.putByte(cm.gx ?? gx);
    msg.putByte(cm.gy ?? gy);
    msg.putInt(0x400 | 0x800 | 0x1000);
    msg.putBytes(npcGzBuf);
    msg.putBytes(sprGzBuf);
    msg.putRaw(monsterBlockBuf);
    packets[cm.mapId] = msg.toBuffer();
  }

  // 2. Custom maps 1, 2, 3, 6
  for (const mapId of [1, 2, 3, 6]) {
    const msg = new NetMessageWriter();
    msg.putInt(mapId);
    msg.putByte(15);
    msg.putByte(15);
    msg.putInt(0x400 | 0x800 | 0x1000);
    msg.putBytes(buildCustomNpcCompressedPayload(mapId));
    msg.putBytes(emptySprGzip);
    writeCustomMonstersToMessage(msg);
    packets[mapId] = msg.toBuffer();
  }

  // 3. WorldMap main packet (`1000_mini.m` = `wm_2919.bin`) and region sub-map lists (`1001_mini.m` .. `1016_mini.m`)
  packets[1000] = fs.readFileSync(path.join(CAPTURED_DIR, 'wm_2919.bin'));
  for (let areaId = 1; areaId <= 16; areaId++) {
    packets[1000 + areaId] = buildWorldMapListPacket(areaId);
  }

  // 4. Offline ItemShop packets (`assets/map/<3000 + shopId>_mini.m`, loaded via createCheckEditionMsg(2000 + shopId))
  //    ShopItem.getShopItemList(S) reads item count byte followed by Item.fromBytesShopItems entries.
  const shopPetBuf = fs.readFileSync(path.join(CAPTURED_DIR, 'itemshop_2_267_2ee4.bin'));
  const shopPhysArmorBuf = fs.readFileSync(path.join(CAPTURED_DIR, 'itemshop_14_3485_2ee4.bin'));
  const shopMagArmorBuf = fs.readFileSync(path.join(CAPTURED_DIR, 'itemshop_14_3491_2ee4.bin'));
  const shopWeaponBuf = fs.readFileSync(path.join(CAPTURED_DIR, 'itemshop_9_1421_2ee4.bin'));
  packets[3000 + 23] = shopPetBuf;
  for (const sid of [51, 52, 55, 61, 62, 63, 200, 204]) {
    packets[3000 + sid] = shopPhysArmorBuf;
  }
  for (const sid of [202, 203, 205]) {
    packets[3000 + sid] = shopMagArmorBuf;
  }
  for (const sid of [207, 209]) {
    packets[3000 + sid] = shopWeaponBuf;
  }

  // 5. Offline SkillShop packets (`assets/map/<4000 + teacherId>_mini.m`, loaded via createCheckEditionMsg(3000 + teacherId))
  const skill304Buf = fs.readFileSync(path.join(CAPTURED_DIR, 'skillshop_304_36b1.bin'));
  const skill305Buf = fs.readFileSync(path.join(CAPTURED_DIR, 'skillshop_305_36b1.bin'));
  const skill306Buf = fs.readFileSync(path.join(CAPTURED_DIR, 'skillshop_306_36b1.bin'));
  const skill307Buf = fs.readFileSync(path.join(CAPTURED_DIR, 'skillshop_307_36b1.bin'));
  for (const tid of [304, 308, 608, 609, 2001]) {
    packets[4000 + tid] = skill304Buf;
  }
  for (const tid of [305, 309, 401, 405, 600, 601, 2002]) {
    packets[4000 + tid] = skill305Buf;
  }
  for (const tid of [306, 310, 402, 406, 610, 611, 2003]) {
    packets[4000 + tid] = skill306Buf;
  }
  for (const tid of [307, 311, 602, 603]) {
    packets[4000 + tid] = skill307Buf;
  }

  return packets;
}

/**
 * Serializes a Mission for MsgHandler.processDataPlayerMission (Bit 0x08).
 */
function writeMissionToMessage(msg, m) {
  const dis = new DataOutputWriter();
  dis.writeShort(m.id);
  dis.writeUTF(m.name);
  dis.writeByte(m.level ?? 1);
  dis.writeUTF(m.simpleDesc);
  dis.writeUTF(m.desc);
  dis.writeShort(0); // setting = 0
  dis.writeShort(m.mapId);
  dis.writeByte(m.npcId ?? 1);
  dis.writeShort(m.mapId); // radarMapID
  dis.writeByte(m.gx ?? 15);
  dis.writeByte(m.gy ?? 15);
  dis.writeUTF(m.dialog1 || m.desc);
  dis.writeUTF(m.dialog2 || m.simpleDesc);
  dis.writeUTF(m.dialog3 || 'Hãy tiếp tục hành trình khám phá thế giới Phong Vân!');
  dis.writeInt(m.exp ?? 50000);
  dis.writeShort(m.money2 ?? 100);
  dis.writeShort(m.money3 ?? 500);
  dis.writeByte(0); // selectItems
  dis.writeByte(0); // rewardItems
  dis.writeByte(0); // acceptJumpMap
  dis.writeByte(0); // submitJumpMap
  msg.putBytes(dis.toBuffer());
}

/**
 * Serializes an Item for MsgHandler.processDataPlayerItemMsg (Bit 0x10).
 */
function writeItemToMessage(msg, item) {
  msg.putShort(item.quantity ?? 1);
  msg.putShort(item.durability ?? 100);
  msg.putByte(item.attachDone ?? 0);
  msg.putByte(item.attachPower ?? 0);
  msg.putShort(item.attachValue ?? 0);
  msg.putShort(item.slotPos);
  msg.putShort(item.status ?? 0);

  msg.putByte(item.type);

  // Pet item (type = 32) in Item.fromBytesAtts2 (0x2022dc)
  if (item.type === 32) {
    msg.putString(item.name);
    msg.putByte(item.bagIcon ?? 1);
    msg.putString(item.info || '');
    msg.putByte(item.grade ?? 5);
    msg.putByte(item.autoBinding ?? 0);
    msg.putShort(item.icon ?? 505);
    msg.putByte(item.reqLv ?? 1);
    msg.putByte(item.vipLevelReq ?? 0);
    return;
  }

  msg.putShort(item.id);
  msg.putString(item.name);
  msg.putByte(item.bagIcon ?? 1);
  msg.putString(item.info || '');
  msg.putByte(item.grade ?? 5);
  msg.putByte(item.autoBinding ?? 0);
  msg.putByte(item.stackNum ?? 1);

  const isWeapon = (item.type >= 13 && item.type <= 24) || (item.type >= 34 && item.type <= 39);
  const isUseItem = (item.type >= 26 && item.type <= 28) || item.type === 31;
  const isGem = item.type === 30;

  if (isWeapon) {
    msg.putShort(item.icon ?? 0);
    msg.putShort(0);
    msg.putByte(100);
    msg.putInt(item.price ?? 50000);
    msg.putByte(3);
    msg.putByte(0);
    msg.putByte(item.reqLv ?? 1);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(item.def_str ?? 200);
    msg.putShort(item.def_agi ?? 200);
    msg.putShort(item.def_mag ?? 200);
    msg.putByte(item.power1 ?? 1);
    msg.putShort(item.powerValue1 ?? 300);
    msg.putByte(item.power2 ?? 2);
    msg.putShort(item.powerValue2 ?? 300);
    msg.putByte(item.power3 ?? 3);
    msg.putShort(item.powerValue3 ?? 300);
    msg.putString(item.skillDesc || 'Thần Binh Truyền Kỳ');
    msg.putByte(0);
    msg.putShort(0);
    msg.putByte(0);
    msg.putShort(0);
    msg.putByte(item.atkType ?? 0);
    msg.putByte(item.atk_time ?? 2);
    msg.putShort(item.atkMin ?? 1200);
    msg.putShort(item.atkMax ?? 1800);
    msg.putByte(item.ascensionStar ?? 9);
    msg.putByte(item.star ?? 12);
    msg.putByte(item.hitrate ?? 98);
    msg.putByte(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putBoolean(false);
    msg.putByte(0);
    msg.putByte(0);
  } else if (isUseItem) {
    msg.putByte(1);
    msg.putShort(0);
    msg.putByte(1);
    msg.putInt(item.price ?? 1000);
    msg.putByte(1);
    msg.putByte(0);
    msg.putByte(item.power1 ?? 1);
    msg.putShort(item.powerValue1 ?? 3000);
    msg.putByte(item.power2 ?? 3);
    msg.putShort(item.powerValue2 ?? 3000);
    msg.putByte(0);
  } else if (isGem) {
    msg.putInt(item.price ?? 10000);
    msg.putByte(item.power1 ?? 1);
    msg.putShort(item.powerValue1 ?? 200);
  } else {
    msg.putShort(item.icon ?? 0);
    msg.putShort(0);
    msg.putByte(100);
    msg.putInt(item.price ?? 35000);
    msg.putByte(3);
    msg.putByte(0);
    msg.putByte(item.reqLv ?? 1);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(item.def_str ?? 500);
    msg.putShort(item.def_agi ?? 500);
    msg.putShort(item.def_mag ?? 500);
    msg.putByte(item.power1 ?? 1);
    msg.putShort(item.powerValue1 ?? 250);
    msg.putByte(item.power2 ?? 2);
    msg.putShort(item.powerValue2 ?? 250);
    msg.putByte(item.power3 ?? 3);
    msg.putShort(item.powerValue3 ?? 250);
    msg.putString(item.skillDesc || 'Hoàng Kim Chiến Giáp');
    msg.putByte(0);
    msg.putShort(0);
    msg.putByte(0);
    msg.putShort(0);
    msg.putByte(item.ascensionStar ?? 9);
    msg.putByte(item.star ?? 12);
    msg.putByte(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putShort(0);
    msg.putBoolean(false);
    msg.putByte(0);
    msg.putByte(0);
  }
}

/**
 * Serializes a Skill for MsgHandler.processDataPlayerSkillMsg (Bit 0x20).
 */
function writeSkillToMessage(msg, sk) {
  msg.putShort(sk.id);
  msg.putByte(sk.level ?? 20);
  msg.putString(sk.name);
  msg.putByte(sk.type); // 1 = Bị động (Passive), 2 = Tự động phóng (Auto), 3 = Chủ động (Active Initiative)
  msg.putString(sk.info);
  msg.putByte(sk.skillWeapon ?? 0);
  msg.putByte(sk.power1 ?? 1);
  msg.putShort(sk.powerValue1 ?? 500);
  msg.putByte(sk.power2 ?? 2);
  msg.putShort(sk.powerValue2 ?? 300);
  msg.putByte(sk.power3 ?? 0);
  msg.putShort(sk.powerValue3 ?? 0);
  if (sk.type !== 1) {
    msg.putByte(sk.skillAtkType ?? 0);
    msg.putByte(sk.area ?? 0);
    msg.putByte(sk.round ?? 1);
    msg.putByte(sk.atk_time ?? 2);
    msg.putShort(sk.useMP ?? 50);
    msg.putShort(sk.useHP ?? 0);
    msg.putByte(sk.anime1 ?? 0);
    msg.putShort(sk.anime2 ?? 1301);
    msg.putShort(sk.anime3 ?? 1302);
    msg.putByte(sk.position ?? 0);
    msg.putByte(0);
    msg.putByte(0);
    msg.putByte(0);
  }
  msg.putBoolean(false);
  msg.putByte(0);
}

/**
 * Builds the complete initial `assets/android_params.js` payload for `MsgHandler.processDataBlockFlagMsg`.
 * Starts in authentic Map 900 (`Cổng Làng`, gx=22, gy=7) with:
 * - Bit 0x08   : 12 Main Story Missions (`N.vụ`) with instant auto-path teleport
 * - Bit 0x10   : Equipped Weapons/Armor + Pet (`Hỏa Kỳ Lân Thần Thú`, slotPos=1, type=32) + Bag Items
 * - Bit 0x20   : 15 Learned Skills (`Bị động`, `Chủ động`, `Tự động phóng`)
 * - Bit 0x400  : `Cổng Làng` NPCs + All Unique Sprites & Fragment Sheets
 * - Bit 0x800  : `Cổng Làng` MonsterGroups
 * - Bit 0x1000 : `Cổng Làng` Monsters + MonsterAI
 * - Bit 0x2000 : All Custom Map Tiles & Palettes (`ResourceHandler.mapImage`)
 */
function buildOfflineWorldPacket() {
  const msg = new NetMessageWriter();
  const map900Blocks = extractCapturedMapBlocks(900);

  // 1. Header: int mapId (900 = Cổng Làng), byte gx (22), byte gy (7), int flags
  msg.putInt(900);
  msg.putByte(22);
  msg.putByte(7);

  const FLAG_MISSIONS = 0x08;
  const FLAG_ITEMS = 0x10;
  const FLAG_SKILLS = 0x20;
  const FLAG_NPCS = 0x400;
  const FLAG_MONSTER_GROUPS = 0x800;
  const FLAG_MONSTERS = 0x1000;
  const FLAG_MAP_IMAGES = 0x2000;
  msg.putInt(
    FLAG_MISSIONS |
      FLAG_ITEMS |
      FLAG_SKILLS |
      FLAG_NPCS |
      FLAG_MONSTER_GROUPS |
      FLAG_MONSTERS |
      FLAG_MAP_IMAGES
  );

  // --- Bit 0x08 (8): Player Mission Log (`N.vụ` UI) ---
  const missions = [
    {
      id: 101,
      name: '[Chính] Khởi Đầu Cổng Làng',
      level: 1,
      mapId: 900,
      npcId: 1,
      gx: 22,
      gy: 7,
      simpleDesc: 'Gặp Đại Thần Quan & Tinh Tinh tại Cổng Làng (22, 7)',
      desc: 'Chào mừng đến Cổng Làng! Hãy trò chuyện với Tinh Tinh, Đại Thần Quan và các bậc tiền bối tại Cổng Làng để làm quen với thế giới Phong Vân Truyền Kỳ.',
      exp: 20000,
      money2: 50,
      money3: 200,
    },
    {
      id: 102,
      name: '[Chính] Thám Hiểm Rừng Phong',
      level: 5,
      mapId: 901,
      npcId: 1,
      gx: 24,
      gy: 6,
      simpleDesc: 'Tiến vào Rừng Phong (Cấp 1-5) tiêu diệt quái vật',
      desc: 'Từ Cổng Làng đi qua cổng dịch chuyển phía Nam hoặc chọn Tự tìm đường để tới Rừng Phong, tiêu diệt Thợ Săn Gấu và Giải Tinh Anh.',
      exp: 35000,
      money2: 80,
      money3: 400,
    },
    {
      id: 103,
      name: '[Chính] Bí Ẩn Khu Vong Giả',
      level: 8,
      mapId: 902,
      npcId: 1,
      gx: 20,
      gy: 26,
      simpleDesc: 'Khám phá Khu Vong Giả (Cấp 5-10)',
      desc: 'Khu Vong Giả xuất hiện nhiều vong hồn và quái vật cổ xưa. Hãy tới điều tra và gặp Thần Bí Các Tư Đặc tại Khu Vong Giả.',
      exp: 50000,
      money2: 100,
      money3: 600,
    },
    {
      id: 104,
      name: '[Chính] Tiến Về Tân Nguyệt Trấn',
      level: 10,
      mapId: 5,
      npcId: 1,
      gx: 10,
      gy: 5,
      simpleDesc: 'Đến Tân Nguyệt Trấn gặp Thương Nhân & Học Viện',
      desc: 'Tân Nguyệt Trấn là trung tâm giao thương sầm uất của Đông Trấn. Hãy đến Tân Nguyệt Trấn và Quảng Trường Tân Nguyệt để mở rộng hành trình.',
      exp: 80000,
      money2: 150,
      money3: 1000,
    },
    {
      id: 105,
      name: '[Chính] Quảng Trường Tân Nguyệt',
      level: 15,
      mapId: 14,
      npcId: 1,
      gx: 9,
      gy: 36,
      simpleDesc: 'Tới Quảng Trường Tân Nguyệt & Phồn Hoa Đô',
      desc: 'Tại Quảng Trường Tân Nguyệt quy tụ các đại sứ hoạt động, phó bản, thú cưỡi và thời trang. Chọn Tự tìm đường để truyền tống ngay!',
      exp: 120000,
      money2: 200,
      money3: 1500,
    },
    {
      id: 106,
      name: '[Chính] Thục Sơn & Rừng Tinh Linh',
      level: 20,
      mapId: 4,
      npcId: 1,
      gx: 19,
      gy: 12,
      simpleDesc: 'Bái phỏng Thục Sơn Điện Đón Khách',
      desc: 'Thục Sơn Kiếm Phái và Rừng Tinh Linh đang cần cao thủ tương trợ. Hãy tới Điện Đón Khách diện kiến Chưởng Môn.',
      exp: 180000,
      money2: 300,
      money3: 2500,
    },
    {
      id: 107,
      name: '[Chính] Thành Thái Dương Trung Lập',
      level: 30,
      mapId: 906,
      npcId: 1,
      gx: 15,
      gy: 12,
      simpleDesc: 'Tới Thành Thái Dương hội ngộ quần hùng',
      desc: 'Thành Thái Dương là tòa thành trung lập vĩ đại nơi Đông - Tây giao hội. Chọn Tự tìm đường để dịch chuyển tới Thành Thái Dương.',
      exp: 250000,
      money2: 500,
      money3: 5000,
    },
    {
      id: 108,
      name: '[Chính] Quyết Chiến Đồng Tuyệt Vọng',
      level: 35,
      mapId: 920,
      npcId: 1,
      gx: 7,
      gy: 5,
      simpleDesc: 'Chinh phục Đồng Tuyệt Vọng & Núi Nguyệt Nha',
      desc: 'Vùng đất băng giá Đồng Tuyệt Vọng ẩn chứa những thử thách khắc nghiệt nhất. Hãy lên đường khẳng định bá nghiệp!',
      exp: 350000,
      money2: 800,
      money3: 8000,
    },
    {
      id: 109,
      name: '[Chính] Ngoại Ô Tử Cấm Thành',
      level: 38,
      mapId: 13,
      npcId: 2,
      gx: 15,
      gy: 15,
      simpleDesc: 'Tới Ngoại Ô Tử C.Thành gặp Thầy Kĩ Năng & Trạm Phi Hành',
      desc: 'Ngoại Ô Tử Cấm Thành là cửa ngõ tiến vào kinh đô phương Tây, nơi có Thầy Kĩ Năng, Thầy Trân Thú, Vạn Hoa Các và Trạm Phi Hành.',
      exp: 400000,
      money2: 900,
      money3: 9000,
    },
    {
      id: 110,
      name: '[Chính] Đại Nội Tử Cấm Thành',
      level: 40,
      mapId: 824,
      npcId: 2,
      gx: 23,
      gy: 24,
      simpleDesc: 'Tiến vào Tử Cấm Thành diện kiến Tây Thành Chủ',
      desc: 'Tử Cấm Thành là kinh đô phương Tây nguy nga tráng lệ với Nhà Buôn Vũ Khí+Phòng Cụ, Nhà Buôn Lò Luyện, Thầy Pet, Huấn Luyện Viên Thợ Săn và Tây Truyền Lệnh.',
      exp: 500000,
      money2: 1000,
      money3: 10000,
    },
    {
      id: 111,
      name: '[Chính] Chinh Phạt Sa Mạc Xích Viêm',
      level: 45,
      mapId: 820,
      npcId: 1,
      gx: 5,
      gy: 10,
      simpleDesc: 'Tới Sa Mạc Xích Viêm (Cấp 45) tiêu diệt Quái Thằn Lằn & Vua Bò Cạp',
      desc: 'Sa Mạc Xích Viêm nóng bỏng đầy rẫy Tội Phạm Lưu Đày, Quái Thằn Lằn, Yêu Tinh Cát và Vua Bò Cạp. Chọn Tự tìm đường để dịch chuyển ngay!',
      exp: 650000,
      money2: 1200,
      money3: 12000,
    },
    {
      id: 112,
      name: '[Chính] Lời Mời Núi Tử Vân',
      level: 55,
      mapId: 825,
      npcId: 5,
      gx: 31,
      gy: 29,
      simpleDesc: 'Tới Chân Núi Tử Vân (Cấp 55-60) gặp Lính Tây Thành & Thị Vệ Trưởng',
      desc: 'Theo lời mời của Tây Thành Chủ, hãy tiến vào Chân Núi Tử Vân gặp Lính Tây Thành và Thị Vệ Trưởng, tiêu diệt Thủ Lĩnh Đạo Tặc và Doanh Trại Phản Quân!',
      exp: 800000,
      money2: 1500,
      money3: 15000,
    },
  ];

  msg.putByte(missions.length);
  for (const m of missions) {
    writeMissionToMessage(msg, m);
  }

  // --- Bit 0x10 (16): Player Items (Equipped 0..29 including Pet at slotPos 1 + Bag 30..39) ---
  const items = [
    {
      slotPos: 1,
      type: 32,
      name: 'Hỏa Kỳ Lân Thần Thú',
      bagIcon: 1,
      info: 'Thần thú thượng cổ Lăng Vân Động, toàn thân rực lửa hộ chủ xuất chiến.',
      grade: 5,
      icon: 505,
      reqLv: 1,
    },
    {
      slotPos: 8,
      type: 13,
      id: 1001,
      name: 'Tuyệt Thế Hảo Kiếm +12',
      bagIcon: 1,
      info: 'Thần binh của Bộ Kinh Vân, hấp thu tinh hoa vạn kiếm, uy lực chấn thiên hạ.',
      grade: 5,
      atkMin: 1500,
      atkMax: 2200,
      def_str: 300,
      def_agi: 300,
      def_mag: 300,
    },
    {
      slotPos: 7,
      type: 0,
      id: 1002,
      name: 'Kim Long Chiến Khôi +12',
      bagIcon: 5,
      info: 'Mũ giáp hoàng kim hộ thân của bậc đế vương.',
      grade: 5,
      def_str: 550,
      def_agi: 550,
      def_mag: 550,
    },
    {
      slotPos: 5,
      type: 1,
      id: 1003,
      name: 'Kỳ Lân Chiến Giáp +12',
      bagIcon: 4,
      info: 'Chiến giáp kết tinh từ vảy Hoả Kỳ Lân, đao thương bất nhập.',
      grade: 5,
      def_str: 900,
      def_agi: 900,
      def_mag: 900,
    },
    {
      slotPos: 4,
      type: 5,
      id: 1004,
      name: 'Thiên Vũ Hộ Vai +12',
      bagIcon: 6,
      info: 'Hộ vai thần võ gia tăng sức mạnh kinh thiên.',
      grade: 5,
      def_str: 450,
      def_agi: 450,
      def_mag: 450,
    },
    {
      slotPos: 6,
      type: 7,
      id: 1005,
      name: 'Cửu Long Ngọc Đai +12',
      bagIcon: 7,
      info: 'Ngọc đai chạm khắc chín rồng hộ thể.',
      grade: 5,
      def_str: 420,
      def_agi: 420,
      def_mag: 420,
    },
    {
      slotPos: 9,
      type: 6,
      id: 1006,
      name: 'Bài Vân Hộ Uyển +12',
      bagIcon: 8,
      info: 'Hộ uyển phát huy tối đa chưởng lực Bài Vân Chưởng.',
      grade: 5,
      def_str: 430,
      def_agi: 430,
      def_mag: 430,
    },
    {
      slotPos: 11,
      type: 4,
      id: 1007,
      name: 'Phong Thần Chiến Ngoa +12',
      bagIcon: 9,
      info: 'Chiến ngoa thần tốc như Phong Thần Cước của Nhiếp Phong.',
      grade: 5,
      def_str: 480,
      def_agi: 480,
      def_mag: 480,
    },
    {
      slotPos: 0,
      type: 8,
      id: 1008,
      name: 'Long Hồn Hạng Liên +12',
      bagIcon: 10,
      info: 'Dây chuyền chứa đựng long hồn thượng cổ.',
      grade: 5,
      def_str: 380,
      def_agi: 380,
      def_mag: 380,
    },
    {
      slotPos: 2,
      type: 9,
      id: 1009,
      name: 'Càn Khôn Giới Chỉ +12',
      bagIcon: 11,
      info: 'Nhẫn thần hội tụ linh khí đất trời.',
      grade: 5,
      def_str: 400,
      def_agi: 400,
      def_mag: 400,
    },
    {
      slotPos: 14,
      type: 10,
      id: 1010,
      name: 'Băng Tâm Ngọc Bội +12',
      bagIcon: 12,
      info: 'Ngọc bội Băng Tâm Quyết giữ tâm cảnh bất động.',
      grade: 5,
      def_str: 400,
      def_agi: 400,
      def_mag: 400,
    },
    // Bag items (slotPos 30..39)
    {
      slotPos: 30,
      type: 16,
      id: 2001,
      name: 'Tuyết Ẩm Cuồng Đao +12',
      bagIcon: 2,
      info: 'Thần đao gia truyền của Nhiếp gia, hàn khí thấu xương.',
      grade: 5,
      atkMin: 1600,
      atkMax: 2350,
    },
    {
      slotPos: 31,
      type: 19,
      id: 2002,
      name: 'Hoả Lân Thần Thương +12',
      bagIcon: 3,
      info: 'Trường thương rực lửa Kỳ Lân, công phá vạn quân.',
      grade: 5,
      atkMin: 1550,
      atkMax: 2280,
    },
    {
      slotPos: 32,
      type: 22,
      id: 2003,
      name: 'Thiên Cơ Pháp Trượng +12',
      bagIcon: 4,
      info: 'Pháp trượng huyền môn tinh thông thiên cơ.',
      grade: 5,
      atkMin: 1480,
      atkMax: 2150,
    },
    {
      slotPos: 33,
      type: 1,
      id: 2004,
      name: 'Bất Diệt Kim Thân Giáp +12',
      bagIcon: 5,
      info: 'Thần giáp của Tuyệt Vô Thần, phòng ngự vô địch.',
      grade: 5,
      def_str: 1050,
      def_agi: 1050,
      def_mag: 1050,
    },
    {
      slotPos: 34,
      type: 0,
      id: 2005,
      name: 'Bá Vương Tử Kim Khôi +12',
      bagIcon: 6,
      info: 'Chiến khôi tử kim tôn quý.',
      grade: 5,
      def_str: 620,
      def_agi: 620,
      def_mag: 620,
    },
    {
      slotPos: 35,
      type: 4,
      id: 2006,
      name: 'Thần Hành Bảo Ngoa +12',
      bagIcon: 7,
      info: 'Bảo ngoa giúp thân pháp nhanh như chớp giật.',
      grade: 5,
      def_str: 540,
      def_agi: 540,
      def_mag: 540,
    },
    {
      slotPos: 36,
      type: 26,
      id: 3001,
      name: 'Cửu Chuyển Hoàn Hồn Đan',
      bagIcon: 13,
      info: 'Linh đan thượng phẩm, hồi phục 3000 Sinh Lực và Nội Lực.',
      grade: 4,
      quantity: 50,
      stackNum: 99,
      power1: 1,
      powerValue1: 3000,
      power2: 3,
      powerValue2: 3000,
    },
    {
      slotPos: 37,
      type: 26,
      id: 3002,
      name: 'Huyết Bồ Đề Ngàn Năm',
      bagIcon: 14,
      info: 'Thánh quả trong Lăng Vân Động, đại bổ nguyên khí 5000 HP/MP.',
      grade: 5,
      quantity: 50,
      stackNum: 99,
      power1: 1,
      powerValue1: 5000,
      power2: 3,
      powerValue2: 5000,
    },
    {
      slotPos: 38,
      type: 30,
      id: 4001,
      name: 'Hồng Bảo Thạch Cấp 9',
      bagIcon: 15,
      info: 'Bảo thạch khảm nạm gia tăng Sức Mạnh.',
      grade: 5,
      quantity: 10,
      stackNum: 20,
      power1: 1,
      powerValue1: 200,
    },
    {
      slotPos: 39,
      type: 30,
      id: 4002,
      name: 'Lam Bảo Thạch Cấp 9',
      bagIcon: 16,
      info: 'Bảo thạch khảm nạm gia tăng Nội Công.',
      grade: 5,
      quantity: 10,
      stackNum: 20,
      power1: 2,
      powerValue1: 200,
    },
  ];

  msg.putShort(items.length);
  for (const it of items) {
    writeItemToMessage(msg, it);
  }

  // --- Bit 0x20 (32): 15 Learned Player Skills across Bị động (1), Chủ động (3), Tự động phóng (2) ---
  const skills = [
    {
      id: 101,
      level: 20,
      name: 'Kỳ Lân Ma Công',
      type: 1,
      info: 'Huyết mạch Hỏa Kỳ Lân chảy trong cơ thể, vĩnh viễn gia tăng 600 Ngoại Công và Bạo Kích.',
      power1: 1,
      powerValue1: 600,
      power2: 2,
      powerValue2: 600,
    },
    {
      id: 102,
      level: 20,
      name: 'Bất Diệt Kim Thân',
      type: 1,
      info: 'Tuyệt kỹ hộ thể của Tuyệt Vô Thần, vĩnh viễn tăng 800 Phòng Ngự và Kháng Sát Thương.',
      power1: 1,
      powerValue1: 800,
      power2: 2,
      powerValue2: 800,
    },
    {
      id: 103,
      level: 20,
      name: 'Thánh Tâm Quyết',
      type: 1,
      info: 'Thần công trường sinh của Đế Thích Thiên, gia tăng giới hạn Sinh Lực và Nội Lực.',
      power1: 1,
      powerValue1: 1200,
      power2: 3,
      powerValue2: 1200,
    },
    {
      id: 104,
      level: 20,
      name: 'Long Nguyên Chân Khí',
      type: 1,
      info: 'Tinh hoa Chân Long hộ thể, gia tăng toàn diện thuộc tính chiến đấu.',
      power1: 1,
      powerValue1: 900,
      power2: 2,
      powerValue2: 900,
    },
    {
      id: 201,
      level: 20,
      name: 'Bài Vân Chưởng',
      type: 3,
      info: 'Tuyệt kỹ chưởng pháp của Bộ Kinh Vân cuồn cuộn như mây trời, sát thương cực lớn.',
      area: 0,
      atk_time: 2,
      useMP: 30,
      anime2: 1301,
      anime3: 1302,
      power1: 1,
      powerValue1: 850,
    },
    {
      id: 202,
      level: 20,
      name: 'Phong Thần Cước',
      type: 3,
      info: 'Thần cước nhanh như cuồng phong của Nhiếp Phong, quét sạch kẻ địch hàng ngang.',
      area: 1,
      atk_time: 3,
      useMP: 45,
      anime2: 1305,
      anime3: 1306,
      power1: 1,
      powerValue1: 980,
    },
    {
      id: 203,
      level: 20,
      name: 'Thiên Sương Quyền',
      type: 3,
      info: 'Quyền pháp hàn băng của Tần Sương đóng băng kinh mạch đối thủ.',
      area: 0,
      atk_time: 2,
      useMP: 35,
      anime2: 1301,
      anime3: 1302,
      power1: 1,
      powerValue1: 900,
    },
    {
      id: 204,
      level: 20,
      name: 'Vạn Kiếm Quy Tông',
      type: 3,
      info: 'Cảnh giới tối cao của kiếm đạo Vô Danh, vạn kiếm cùng xuất kích toàn bộ chiến trường.',
      area: 3,
      atk_time: 3,
      useMP: 80,
      anime2: 1309,
      anime3: 1310,
      power1: 1,
      powerValue1: 1350,
    },
    {
      id: 205,
      level: 20,
      name: 'Tam Nguyên Quy Nhất',
      type: 3,
      info: 'Tuyệt học tối thượng của Hùng Bá dung hợp Phong - Vân - Sương công phá hàng dọc.',
      area: 2,
      atk_time: 2,
      useMP: 60,
      anime2: 1313,
      anime3: 1314,
      power1: 1,
      powerValue1: 1150,
    },
    {
      id: 206,
      level: 20,
      name: 'Ngạo Hàn Lục Quyết',
      type: 3,
      info: 'Đao pháp gia truyền của Nhiếp gia phát huy uy lực Tuyết Ẩm Cuồng Đao.',
      area: 1,
      atk_time: 2,
      useMP: 50,
      anime2: 1305,
      anime3: 1306,
      power1: 1,
      powerValue1: 1080,
    },
    {
      id: 207,
      level: 20,
      name: 'Kiếm Nhị Thập Tam',
      type: 3,
      info: 'Kiếm chiêu hủy thiên diệt địa của Kiếm Thánh Độc Cô Kiếm ngưng đọng không gian.',
      area: 3,
      atk_time: 3,
      useMP: 90,
      anime2: 1309,
      anime3: 1310,
      power1: 1,
      powerValue1: 1500,
    },
    {
      id: 208,
      level: 20,
      name: 'Khuynh Thành Chi Luyến',
      type: 3,
      info: 'Tuyệt kỹ hợp bích Vô Song Âm Dương Kiếm chém rách hư không.',
      area: 3,
      atk_time: 3,
      useMP: 85,
      anime2: 1313,
      anime3: 1314,
      power1: 1,
      powerValue1: 1420,
    },
    {
      id: 301,
      level: 20,
      name: 'Băng Tâm Quyết',
      type: 2,
      info: 'Tâm nhược băng thanh, thiên tháp bất kinh. Tự động hộ thân trong chiến đấu.',
      area: 0,
      atk_time: 1,
      useMP: 40,
      anime2: 1317,
      anime3: 1318,
      power1: 1,
      powerValue1: 1500,
    },
    {
      id: 302,
      level: 20,
      name: 'Huyền Võ Chân Công',
      type: 2,
      info: 'Tuyệt kỹ thập cường võ đạo của Thập Cường Võ Giả tự động gia hộ chân khí.',
      area: 0,
      atk_time: 1,
      useMP: 45,
      anime2: 1317,
      anime3: 1318,
      power1: 1,
      powerValue1: 1600,
    },
    {
      id: 303,
      level: 20,
      name: 'Kim Chung Tráo',
      type: 2,
      info: 'Chuông vàng hộ thể, tự động kích hoạt khi bước vào chiến trận.',
      area: 0,
      atk_time: 1,
      useMP: 35,
      anime2: 1317,
      anime3: 1318,
      power1: 1,
      powerValue1: 1400,
    },
  ];

  msg.putShort(skills.length);
  for (const sk of skills) {
    writeSkillToMessage(msg, sk);
  }

  // --- Bit 0x400 (1024): Map 900 (Cổng Làng) NPCs + All 84 Unique Sprites & 53 Fragment Sheets ---
  msg.putBytes(map900Blocks.npcGzBuf);
  msg.putBytes(buildMergedSpriteGzipPayload());

  // --- Bit 0x800 (2048) & Bit 0x1000 (4096): Map 900 (Cổng Làng) MonsterGroups, Monsters & MonsterAI ---
  msg.putRaw(map900Blocks.monsterBlockBuf);

  // --- Bit 0x2000 (8192): All 234 Custom Map Tiles & Palettes (ResourceHandler.mapImage) ---
  writeMergedMapImagesToMessage(msg);

  return msg.toBuffer();
}

module.exports = {
  buildAllOfflineMaps,
  buildAllMapJumpPackets,
  buildOfflineWorldPacket,
};
