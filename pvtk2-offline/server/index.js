#!/usr/bin/env node
/**
 * Phong Vân Truyền Kỳ 2 (WorldOL) - Standalone Offline Server Emulator & Web GM Dashboard
 * =======================================================================================
 * Ports:
 *   - TCP 30000: Login Server + World Game Server (Big-Endian Message framing)
 *   - HTTP 8079: Fallback HTTP /A Gateway + Interactive Web GM Control Panel (http://127.0.0.1:8079)
 *   - TCP/HTTP 28080: Photo & Avatar Server
 *
 * Editable JSON Databases:
 *   - server/db/races_jobs.json
 *   - server/db/items.json
 *   - server/db/skills.json
 *   - server/db/maps.json
 *   - server/db/shops.json
 *   - server/db/missions.json
 *   - server/db/battle_groups.json
 *   - server/db/players.json
 */

const net = require('net');
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DB_DIR = path.join(__dirname, 'db');
const EXTRACTED_APK_DIR = 'C:/Users/binhn/AppData/Local/Temp/rea-extracted-bbfe7674-b0da-47cb-8a86-01196d8ccbde';

const TCP_PORT = Number(process.env.PVTK2_TCP_PORT || 30000);
const HTTP_PORT = Number(process.env.PVTK2_HTTP_PORT || 8079);
const PHOTO_PORT = Number(process.env.PVTK2_PHOTO_PORT || 28080);

// Load editable JSON databases
function loadJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(DB_DIR, filename), 'utf8'));
}

function saveJson(filename, data) {
  fs.writeFileSync(path.join(DB_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

const db = {
  racesJobs: loadJson('races_jobs.json'),
  items: loadJson('items.json'),
  skills: loadJson('skills.json'),
  maps: loadJson('maps.json'),
  shops: loadJson('shops.json'),
  missions: loadJson('missions.json'),
  battleGroups: loadJson('battle_groups.json'),
  players: loadJson('players.json'),
};

function savePlayers() {
  saveJson('players.json', db.players);
}

function getItemById(id) {
  return db.items.find((it) => it.id === Number(id)) || db.items[0];
}

function getSkillById(id) {
  return db.skills.find((sk) => sk.id === Number(id)) || db.skills[0];
}

function getMapById(id) {
  return db.maps.find((m) => m.id === Number(id)) || db.maps[0];
}

function getMissionById(id) {
  return db.missions.find((ms) => ms.id === Number(id)) || db.missions[0];
}

// ============================================================================
// Binary Big-Endian Message Reader & Writer (com.hz.net.Message compatible)
// ============================================================================
class MsgWriter {
  constructor(type) {
    this.type = type;
    this.chunks = [];
  }
  putByte(v) {
    const b = Buffer.alloc(1);
    b.writeInt8((v << 24) >> 24, 0);
    this.chunks.push(b);
    return this;
  }
  putUByte(v) {
    const b = Buffer.alloc(1);
    b.writeUInt8(v & 0xff, 0);
    this.chunks.push(b);
    return this;
  }
  putBoolean(v) {
    return this.putByte(v ? 1 : 0);
  }
  putShort(v) {
    const b = Buffer.alloc(2);
    b.writeInt16BE((v << 16) >> 16, 0);
    this.chunks.push(b);
    return this;
  }
  putUShort(v) {
    const b = Buffer.alloc(2);
    b.writeUInt16BE(v & 0xffff, 0);
    this.chunks.push(b);
    return this;
  }
  putInt(v) {
    const b = Buffer.alloc(4);
    b.writeInt32BE(v | 0, 0);
    this.chunks.push(b);
    return this;
  }
  putLong(v) {
    const b = Buffer.alloc(8);
    b.writeBigInt64BE(BigInt(v), 0);
    this.chunks.push(b);
    return this;
  }
  putString(str) {
    const s = str == null ? '' : String(str);
    const utf8 = Buffer.from(s, 'utf8');
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(utf8.length, 0);
    this.chunks.push(lenBuf, utf8);
    return this;
  }
  putBytes(buf) {
    if (buf && buf.length > 0) {
      this.chunks.push(Buffer.from(buf));
    }
    return this;
  }
  getPayload() {
    return Buffer.concat(this.chunks);
  }
  toFrame() {
    const payload = this.getPayload();
    const totalLen = 4 + payload.length;
    const header = Buffer.alloc(4);
    header.writeUInt16BE(totalLen & 0xffff, 0);
    header.writeInt16BE((this.type << 16) >> 16, 2);
    return Buffer.concat([header, payload]);
  }
}

class MsgReader {
  constructor(type, buf) {
    this.type = type;
    this.buf = buf || Buffer.alloc(0);
    this.off = 0;
  }
  remaining() {
    return Math.max(0, this.buf.length - this.off);
  }
  getByte() {
    if (this.off + 1 > this.buf.length) return 0;
    return this.buf.readInt8(this.off++);
  }
  getUByte() {
    if (this.off + 1 > this.buf.length) return 0;
    return this.buf.readUInt8(this.off++);
  }
  getBoolean() {
    return this.getByte() === 1;
  }
  getShort() {
    if (this.off + 2 > this.buf.length) return 0;
    const v = this.buf.readInt16BE(this.off);
    this.off += 2;
    return v;
  }
  getInt() {
    if (this.off + 4 > this.buf.length) return 0;
    const v = this.buf.readInt32BE(this.off);
    this.off += 4;
    return v;
  }
  getLong() {
    if (this.off + 8 > this.buf.length) return 0n;
    const v = this.buf.readBigInt64BE(this.off);
    this.off += 8;
    return v;
  }
  getString() {
    if (this.off + 2 > this.buf.length) return '';
    const len = this.buf.readUInt16BE(this.off);
    this.off += 2;
    if (this.off + len > this.buf.length) {
      const s = this.buf.subarray(this.off).toString('utf8');
      this.off = this.buf.length;
      return s;
    }
    const s = this.buf.subarray(this.off, this.off + len).toString('utf8');
    this.off += len;
    return s;
  }
}

// ============================================================================
// Domain Model Serializers (Exact Match for classes2.dex Bytecode)
// ============================================================================

/**
 * Serializes Item.fromBytesAtts2(Item, Message)
 */
function writeItemAtts2(w, itemDef, opts = {}) {
  const slotPos = opts.slotPos !== undefined ? opts.slotPos : 30;
  const quantity = opts.count !== undefined ? opts.count : 1;
  w.putInt(itemDef.id);
  w.putString(itemDef.name);
  w.putByte(itemDef.type);
  w.putByte(itemDef.icon || itemDef.type);
  w.putByte(itemDef.grade || 5);
  w.putByte(itemDef.bagIcon || itemDef.type);
  w.putByte(itemDef.reqLv || 1);
  w.putShort(itemDef.durability || 500);
  w.putInt(0); // status bitfield (bit 4=enchants, bit 8=time, bit 0x200=initReqLv, bit 0x8000=AscensionStar)
  w.putString(itemDef.desc || '');
  w.putByte(0); // bindType
  w.putShort(itemDef.weight || 5);
  w.putInt(itemDef.price || 1000);
  w.putShort(itemDef.avatarId || 0);
  const attrs = itemDef.attrs || [];
  w.putByte(attrs.length);
  for (const a of attrs) {
    w.putShort(a.id);
    w.putShort(a.value);
  }
  const gemAttrs = itemDef.gemAttrs || [];
  w.putByte(gemAttrs.length);
  for (const g of gemAttrs) {
    w.putShort(g.id);
    w.putShort(g.value);
  }
  w.putByte(itemDef.suitId || 0);
  w.putShort(0); // suitStatus
  w.putByte(itemDef.starLevel || 0);
  // Used inside PlayerBag / Equip:
  if (opts.includeSlotAndCount) {
    w.putShort(slotPos);
    w.putShort(quantity);
  }
}

/**
 * Serializes ShopItem.fromBytesShopItem(Message, shopID)
 */
function writeShopItem(w, itemDef, shopId) {
  writeItemAtts2(w, itemDef, { includeSlotAndCount: false });
  w.putInt(0); // dismoney1
  w.putInt(0); // dismoney2
  w.putInt(0); // dismoney3
  w.putByte(0); // discount
  w.putInt(0); // money1 (0 KNB in GM Shop!)
  w.putInt(0); // money2 (0 Kim Diệp)
  w.putInt(0); // money3 (0 Đồng)
  w.putShort(0); // status
  w.putShort(99); // maxBuy
  w.putShort(999); // allCount
  w.putByte(1); // hot/new badge
}

/**
 * Serializes Skill.fromBaseBytes(Message)
 */
function writeSkillBase(w, sk) {
  w.putInt(sk.id);
  w.putString(sk.name);
  w.putByte(sk.level || 10);
  w.putByte(sk.type !== undefined ? sk.type : 1);
  w.putByte(sk.icon || 1);
  w.putShort(sk.consumeMp || 20);
  if ((sk.type !== undefined ? sk.type : 1) !== 0) {
    w.putByte(0); // WeaponNeedType
    w.putByte(0); // expandType
    w.putByte(sk.range || 3);
    w.putByte(sk.targetType || 1);
    w.putByte(sk.targetNum || 3);
    w.putShort(sk.anime1 || 101);
    w.putShort(sk.anime2 || 102);
    w.putShort(sk.anime3 || 103);
    w.putByte(0); // skillCount
  }
  w.putString(sk.desc || '');
  w.putShort(sk.powerType1 || 1);
  w.putShort(sk.powerValue1 || 3500);
  w.putShort(0);
  w.putShort(0);
  w.putShort(0);
  w.putShort(0);
  w.putByte(0); // round
  w.putInt(0);  // statusBit
}

/**
 * Serializes Skill.fromBytes(Message) = fromBaseBytes + boolean isAutoShot
 */
function writeSkillFull(w, sk) {
  writeSkillBase(w, sk);
  w.putBoolean(true);
}

/**
 * Serializes Skill.fromShopBytes(Message) = fromBaseBytes + sp/money1/2/3/reqJob/reqLevel
 */
function writeSkillShop(w, sk) {
  writeSkillBase(w, sk);
  w.putShort(0); // learnSp = 0 for free learning
  w.putShort(0); // money1
  w.putShort(0); // money2
  w.putInt(0);   // money3
  w.putByte(sk.reqJob || 0);
  w.putByte(sk.reqLevel || 1);
}

/**
 * Serializes ListPlayer for character selection screen (MSG 10002 / 10003)
 */
function writeSimpleListPlayer(w, p) {
  // setting bits:
  // bit 1 (0x01) = leaderLevel? No, let's check getSimplePlayerFromBytes:
  // setting = readShort():
  //   bit 0x01: byte (icon/badge)
  //   bit 0x02: inticon2, int icon3
  //   bit 0x10: byte (petIcon)
  //   bit 0x400: byte vipLevel
  const setting = 0x02 | 0x400;
  w.putShort(setting);
  w.putInt(p.id);
  w.putByte(p.gx || 12);
  w.putByte(p.gy || 10);
  w.putByte(0); // dir
  w.putInt(p.icon1 || ((p.race || 0) * 2 + (p.sex || 0) + 1));
  w.putInt(p.icon2 || 12);
  w.putInt(p.icon3 || 45);
  w.putString(p.name);
  w.putByte(p.level || 60);
  w.putByte(p.job || 1);
  w.putByte(p.vipLevel || 12);
}

/**
 * Serializes full Player data for MSG 10004 (doSelectRoleResponse)
 */
function writeEnterGamePlayer(w, p) {
  w.putByte(0); // errorCode = 0 (Success)
  w.putInt(0);  // statusFlags
  w.putByte(p.sex || 0);
  w.putByte(p.race || 0);
  w.putByte(p.job || 1);
  w.putByte(p.level || 60);
  w.putInt(p.icon1 || 1);
  w.putInt(p.icon2 || 12);
  w.putInt(p.icon3 || 45);
  w.putInt(0); // state
  w.putString(p.name);
  w.putString(p.title || 'Bất Khốc Tử Thần');
  w.putInt(p.hp || 68000);
  w.putInt(p.mp || 25000);
  w.putInt(p.exp || 125000);
  w.putInt(p.expMax || 500000);
  w.putInt(p.sp || 5000);
  w.putShort(p.str || 450);
  w.putShort(p.con || 420);
  w.putShort(p.agi || 400);
  w.putShort(p.int || 300);
  w.putShort(p.wis || 300);
  w.putShort(p.cp || 1000);
  w.putInt(p.money1 !== undefined ? p.money1 : 8888888);
  w.putInt(p.money2 !== undefined ? p.money2 : 8888888);
  w.putInt(p.money3 !== undefined ? p.money3 : 99999999);
  w.putShort(80); // bagGridSize
  w.putShort(60); // storeSize

  // All items in bag + equipped
  const allItems = [];
  for (const eq of p.equipped || []) {
    allItems.push({ slotPos: eq.slotPos, itemDef: getItemById(eq.itemId), count: 1 });
  }
  for (const bg of p.bag || []) {
    allItems.push({ slotPos: bg.slotPos, itemDef: getItemById(bg.itemId), count: bg.count || 1 });
  }
  w.putByte(allItems.length);
  for (const entry of allItems) {
    w.putShort(entry.slotPos);
    const isStackable = entry.itemDef.type >= 30;
    if (isStackable) {
      w.putByte(entry.count);
      w.putInt(entry.itemDef.id);
      writeItemAtts2(w, entry.itemDef, { includeSlotAndCount: false });
    } else {
      w.putByte(1);
      writeItemAtts2(w, entry.itemDef, { includeSlotAndCount: false });
    }
  }

  // Skills
  const pSkills = (p.skillIds || [101, 102, 103, 104, 105]).map(getSkillById);
  w.putByte(pSkills.length);
  for (const sk of pSkills) {
    writeSkillFull(w, sk);
  }
  // Talents
  w.putByte(0);
  // Active Missions
  w.putByte(0);
  // Completed mission bitmask bytes
  w.putByte(0);
  // Quickobar shortcuts (12 shorts)
  for (let i = 0; i < 12; i++) {
    w.putShort(pSkills[i] ? pSkills[i].id : 0);
  }
  w.putBoolean(false); // hasPetEquipped inline (can equip via bag or pet menu)
  w.putBoolean(false); // hasMercenary
  w.putBoolean(false); // hasActiveCountry
  w.putByte(p.vipLevel || 12);
  w.putInt(p.vipExp || 100000);
  w.putByte(0); // superQqLevel
  w.putInt(0);  // masterId
  w.putByte(0); // apprenticeCount
  w.putInt(0);  // partnerId
  w.putString(''); // partnerName
  w.putByte(0); //enchantSuitLevel
  w.putByte(0); // extra tail
}

/**
 * Compiles a GZIP-compressed .m map file & NPC list for MSG 13004 (doGetMapData)
 * matching GameMap.fromBytes + MapLayer.fromBytes + TileLayer + PixelLayer + PlayerLayer + NPC.fromBytes (version=20)
 */
function buildMapPacket13004(mapDef, player) {
  const w = new MsgWriter(13004);
  w.putByte(0); // flags (bit 1=clear Sprite cache, bit 2=onlyUpdateTile, bit 4=hasSwitchAnim, bit 8=skipImages)
  w.putByte(player.gx || mapDef.spawnX || 12);
  w.putByte(player.gy || mapDef.spawnY || 10);
  w.putShort(mapDef.id);
  w.putShort(mapDef.id); // mapResID
  w.putString(mapDef.name);
  w.putByte(mapDef.weather || 0);

  // Build uncompressed .m binary buffer for GameMap.fromBytes(DataInputStream):
  //   int version = 20
  //   short mapWidth (columns), short mapHeight (rows)
  //   byte layerCount = 2:
  //     Layer 0: type=1 (TileLayer):
  //       byte flags = 0 (not sameTile)
  //       byte[rows * cols] tileImageIndices
  //       byte[rows * cols] tileFlagTransformBytes
  //     Layer 1: type=3 (PlayerLayer):
  //       short drawObjCount = 0
  //   byte[rows * cols] passabilityGrid (0 = walkable, 1 = blocked)
  //   byte jumpPointCount:
  //     for each: byte gx, byte gy, byte w=2, byte h=2
  //   byte npcCount:
  //     for each NPC.fromBytes(dis, 20):
  //       byte id, String name, byte gx, byte gy, byte icon1, byte dir, byte territory,
  //       byte movePathsCount=0, String welcome, byte npcType (5=PowerNPC GM, 0=normal, 1=battle)
  const cols = mapDef.width || 24;
  const rows = mapDef.height || 20;
  const cellCount = cols * rows;

  const mChunks = [];
  const pushByte = (v) => { const b = Buffer.alloc(1); b.writeInt8((v << 24) >> 24, 0); mChunks.push(b); };
  const pushShort = (v) => { const b = Buffer.alloc(2); b.writeInt16BE((v << 16) >> 16, 0); mChunks.push(b); };
  const pushInt = (v) => { const b = Buffer.alloc(4); b.writeInt32BE(v | 0, 0); mChunks.push(b); };
  const pushUTF = (s) => {
    const u = Buffer.from(s || '', 'utf8');
    const l = Buffer.alloc(2);
    l.writeUInt16BE(u.length, 0);
    mChunks.push(l, u);
  };

  pushInt(20); // version = 20
  pushShort(cols);
  pushShort(rows);
  pushByte(2); // 2 layers: TileLayer (1) + PlayerLayer (3)

  // Layer 0: TileLayer (type = 1)
  pushByte(1);
  pushByte(0); // not single-tile
  const tileIdxBuf = Buffer.alloc(cellCount, 0); // tile index 0
  const tileTransBuf = Buffer.alloc(cellCount, 0);
  mChunks.push(tileIdxBuf, tileTransBuf);

  // Layer 1: PlayerLayer (type = 3)
  pushByte(3);
  pushShort(0); // 0 static map objects

  // Passability grid: 0 = passable everywhere except outer 1-tile border
  const passBuf = Buffer.alloc(cellCount, 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        passBuf[r * cols + c] = 0; // keep walkable so player never gets stuck
      }
    }
  }
  mChunks.push(passBuf);

  // Jump points
  const jumps = mapDef.jumpPoints || [];
  pushByte(jumps.length);
  for (const jp of jumps) {
    pushByte(jp.gx);
    pushByte(jp.gy);
    pushByte(2);
    pushByte(2);
  }

  // NPCs
  const npcs = mapDef.npcs || [];
  pushByte(npcs.length);
  for (const npc of npcs) {
    pushByte(npc.id);
    pushUTF(npc.name);
    pushByte(npc.gx);
    pushByte(npc.gy);
    pushByte(npc.icon1 || 101);
    pushByte(npc.dir || 2);
    pushByte(0); // territory
    pushByte(0); // 0 move paths
    pushUTF(npc.welcome || 'Chào đại hiệp!');
    pushByte(npc.npcType !== undefined ? npc.npcType : 0);
  }

  const rawMapBytes = Buffer.concat(mChunks);
  const gzMapBytes = zlib.gzipSync(rawMapBytes);

  w.putShort(gzMapBytes.length);
  w.putBytes(gzMapBytes);

  // Write NPC runtime state after GameMap.fromBytes:
  // GameWorld.doGetMapData reads for each NPC:
  //   boolean visible = true
  //   short icon1
  //   byte missionState (1 = has quest !, 2 = completable ?, 0 = none)
  //   if npcType == 5 (PowerNPC): NPC.readPowerNPCData(msg)
  for (const npc of npcs) {
    w.putBoolean(true);
    w.putShort(npc.icon1 || 101);
    w.putByte((npc.missions && npc.missions.length > 0) ? 1 : 0);
    if (npc.npcType === 5) {
      writePowerNpcData(w, npc);
    }
  }

  // Map image/tileSet data (if skipImages bit 8 is not set):
  // Let's provide 0 extra dynamic map images so client uses built-in assets/map/*.pn
  w.putShort(0); // tileSetBytes length = 0 (built-in)
  w.putByte(0);  // mapImages count = 0
  w.putByte(0);  // mapSprites count = 0

  return w;
}

/**
 * Serializes NPC.readPowerNPCData(Message) for npcType == 5 (GM Tiên Tử Menu)
 */
function writePowerNpcData(w, npc) {
  const entries = [];

  // 1. GM Shops (type = 3: Shop)
  for (const shopId of npc.shopIds || [901, 902, 903, 904]) {
    const sh = db.shops[shopId];
    if (sh) {
      entries.push({ type: 3, menuName: `🛒 ${sh.name}`, shopId: sh.id });
    }
  }

  // 2. Skill Shop (type = 5: Skill Shop)
  if (npc.skillShopId) {
    entries.push({ type: 5, menuName: '📖 Tàng Kinh Các - Học Toàn Bộ Tuyệt Kỹ', skillShopId: npc.skillShopId });
  }

  // 3. Teleport menu (type = 1: Map Teleport)
  const tpMaps = (npc.teleportMapIds || [1, 2, 3, 4, 5, 6, 7, 8, 9]).map(getMapById);
  if (tpMaps.length > 0) {
    entries.push({
      type: 1,
      menuName: '⚡ Dịch Chuyển Tức Thời (Toàn Bộ 9 Bản Đồ)',
      subMenus: tpMaps.map((m) => ({
        name: `Đến ${m.name}`,
        desc: `Dịch chuyển miễn phí (0 Đồng) tới ${m.name}`,
        mapId: m.id
      }))
    });
  }

  w.putByte(entries.length);
  for (const e of entries) {
    w.putByte(e.type);
    w.putString(e.menuName);
    if (e.type === 1) {
      w.putByte(e.subMenus.length);
      for (const sub of e.subMenus) {
        w.putString(sub.name);
        w.putString(sub.desc);
      }
    } else if (e.type === 3) {
      w.putShort(e.shopId);
      w.putByte(0); // shopType = 0 (Normal/GM item shop)
    } else if (e.type === 5) {
      w.putShort(e.skillShopId);
    }
  }
}

// ============================================================================
// Packet Dispatcher (Shared by TCP 30000 and HTTP 8079 /A)
// ============================================================================
const serverStats = {
  startedAt: new Date().toISOString(),
  tcpConnections: 0,
  httpRequests: 0,
  packetsHandled: 0,
  recentLogs: []
};

function logEvent(tag, detail) {
  const entry = { time: new Date().toLocaleTimeString(), tag, detail };
  serverStats.recentLogs.unshift(entry);
  if (serverStats.recentLogs.length > 60) serverStats.recentLogs.pop();
  console.log(`[${entry.time}] [${tag}] ${detail}`);
}

const activeSessions = new Set();

function broadcastToSessions(msgWriter) {
  const frame = msgWriter.toFrame();
  for (const sock of activeSessions) {
    if (!sock.destroyed) {
      sock.write(frame);
    }
  }
}

function getActivePlayer(session) {
  if (session && session.player) return session.player;
  return db.players[0];
}

function addItemToPlayerBag(player, itemId, count = 1) {
  player.bag = player.bag || [];
  const existing = player.bag.find((b) => b.itemId === Number(itemId) && getItemById(itemId).type >= 30);
  if (existing) {
    existing.count = Math.min(99, (existing.count || 1) + count);
    savePlayers();
    return existing.slotPos;
  }
  const usedSlots = new Set(player.bag.map((b) => b.slotPos));
  let slotPos = 30;
  while (usedSlots.has(slotPos)) slotPos++;
  player.bag.push({ slotPos, itemId: Number(itemId), count });
  savePlayers();
  return slotPos;
}

function createSystemChatPush(text) {
  const w = new MsgWriter(13515); // MSG_CHAT_SYSTEM_RECEIVE
  w.putString(text);
  return w;
}

function createMoneyUpdatePush(player) {
  const w = new MsgWriter(11012); // MSG_PLAYER_SYN_MONEY
  w.putInt(player.money1);
  w.putInt(player.money2);
  w.putInt(player.money3);
  w.putString('GM Offline: Đã cập nhật Tiền Vàng / KNB / Kim Diệp!');
  return w;
}

function handleGameMessage(msg, session) {
  serverStats.packetsHandled++;
  const type = msg.type;
  const player = getActivePlayer(session);
  const responses = [];

  switch (type) {
    // 1. Account Login (MSG 1)
    case 1: {
      const clientVer = msg.getShort();
      const account = msg.getString();
      logEvent('MSG_LOGIN (1)', `Account="${account || 'offline_user'}", ClientVer=${clientVer}`);
      const w = new MsgWriter(1);
      w.putByte(1); // status = 1 (Success)
      w.putLong(88888888n); // ukey
      w.putString(account || 'pvtk2_offline');
      w.putString('Chào mừng đến với Phong Vân Truyền Kỳ 2 Offline (REA Edition)!');
      w.putBoolean(false); // no forced update
      w.putByte(1); // 1 area
      w.putString('Cụm Máy Chủ Offline Localhost');
      w.putByte(1); // 1 server line
      w.putShort(1); // lineId = 1
      w.putString('S1 - Phong Vân Truyền Kỳ 2 (Offline GM)');
      w.putString(`socket://127.0.0.1:${TCP_PORT}`);
      w.putString(`http://127.0.0.1:${HTTP_PORT}/A`);
      w.putByte(1); // lineStatus (Good/Green)
      w.putByte(db.players.length); // roleCount on this server
      responses.push(w);
      break;
    }

    // 2. Enter Server / Character List (MSG 2 & MSG 10002)
    case 2:
    case 10002: {
      logEvent(`MSG_CHAR_LIST (${type})`, `Returning ${db.players.length} characters`);
      const w = new MsgWriter(type);
      w.putByte(0); // ret = 0 (Success)
      w.putInt(100001); // sessionID
      w.putByte(4); // maxRoleNum = 4
      w.putByte(db.players.length);
      for (const p of db.players) {
        writeSimpleListPlayer(w, p);
      }
      responses.push(w);
      break;
    }

    // 3. Create New Character (MSG 10003)
    case 10003: {
      const slotIndex = msg.getByte();
      const race = msg.getByte();
      const sex = msg.getByte();
      const job = msg.getByte();
      const icon1 = msg.getInt();
      const name = msg.getString() || `ĐạiHiệp${db.players.length + 1}`;
      const newPlayer = {
        id: 10000 + db.players.length + 1,
        name,
        sex,
        race,
        job: job || 1,
        level: 60,
        exp: 100000,
        expMax: 500000,
        hp: 68000,
        mp: 25000,
        sp: 5000,
        cp: 1000,
        str: 450,
        con: 420,
        agi: 400,
        int: 300,
        wis: 300,
        money1: 9999999,
        money2: 9999999,
        money3: 99999999,
        vipLevel: 12,
        vipExp: 100000,
        mapId: 1,
        gx: 12,
        gy: 10,
        icon1: icon1 || 1,
        icon2: 12,
        icon3: 45,
        title: 'Tân Nhân Vương Phong Vân',
        equipped: [
          { slotPos: 3, itemId: 1001 },
          { slotPos: 10, itemId: 2002 },
          { slotPos: 17, itemId: 2009 },
          { slotPos: 21, itemId: 2010 }
        ],
        bag: [
          { slotPos: 30, itemId: 1002, count: 1 },
          { slotPos: 31, itemId: 3001, count: 50 },
          { slotPos: 32, itemId: 3002, count: 20 },
          { slotPos: 33, itemId: 3003, count: 10 }
        ],
        skillIds: [101, 102, 103, 104, 105, 109, 110],
        completedMissions: [],
        activeMissions: [1, 2]
      };
      db.players.push(newPlayer);
      savePlayers();
      logEvent('MSG_CREATE_CHAR (10003)', `Created character "${name}" (ID=${newPlayer.id}, Race=${race}, Job=${job})`);
      const w = new MsgWriter(10003);
      w.putByte(0); // result = 0 (Success)
      writeSimpleListPlayer(w, newPlayer);
      responses.push(w);
      break;
    }

    // 4. Select Role & Enter Game World (MSG 10004)
    case 10004: {
      const playerId = msg.getInt();
      const selected = db.players.find((p) => p.id === playerId) || db.players[0];
      if (session) session.player = selected;
      logEvent('MSG_ENTER_GAME (10004)', `Player "${selected.name}" (ID=${selected.id}) entering Map ${selected.mapId}`);
      const w = new MsgWriter(10004);
      writeEnterGamePlayer(w, selected);
      responses.push(w);

      // Immediately push initial map load (13004) + welcome notice (13515)
      const mapDef = getMapById(selected.mapId || 1);
      responses.push(buildMapPacket13004(mapDef, selected));
      responses.push(
        createSystemChatPush(
          '🌟 [PVTK2 Offline] Chào mừng Đại Hiệp! Hãy gặp NPC "GM Tiên Tử" hoặc gõ lệnh chat: /gm, /gold, /knb, /level 85, /item 1004, /skill, /tp 2'
        )
      );
      break;
    }

    // 5. Heartbeat / Sync Move (MSG 10005, 13001, 13002)
    case 10005:
    case 13001:
    case 13002: {
      if (type === 13001 && msg.remaining() >= 2) {
        player.gx = msg.getByte();
        player.gy = msg.getByte();
      }
      const w = new MsgWriter(10005);
      w.putInt(Math.floor(Date.now() / 1000));
      responses.push(w);
      break;
    }

    // 6. Map Change / Jump / Teleport (MSG 13003, 13004, 15003)
    case 13003:
    case 13004:
    case 15003: {
      let targetMapId = player.mapId || 1;
      if (type === 13003) {
        const jumpIdx = msg.getByte();
        const curMap = getMapById(player.mapId || 1);
        const jp = (curMap.jumpPoints || [])[jumpIdx] || (curMap.jumpPoints || [])[0];
        if (jp) {
          targetMapId = jp.targetMapId;
          player.gx = jp.targetGx || 12;
          player.gy = jp.targetGy || 10;
        }
      } else if (type === 15003) {
        const npcId = msg.getByte();
        const subIdx = msg.getByte();
        const mapList = db.maps;
        const chosen = mapList[subIdx] || mapList[0];
        targetMapId = chosen.id;
        player.gx = chosen.spawnX || 12;
        player.gy = chosen.spawnY || 10;
      } else if (msg.remaining() >= 2) {
        targetMapId = msg.getShort();
      }
      const nextMap = getMapById(targetMapId);
      player.mapId = nextMap.id;
      savePlayers();
      logEvent(`MSG_MAP_CHANGE (${type})`, `Player "${player.name}" -> Map ${nextMap.id} (${nextMap.name})`);
      responses.push(buildMapPacket13004(nextMap, player));
      break;
    }

    // 7. Browse Item Shop / GM Shop (MSG 12004)
    case 12004: {
      const shopId = msg.getShort();
      const shop = db.shops[shopId] || db.shops[902];
      const shopItems = (shop.itemIds || []).map(getItemById);
      logEvent('MSG_ITEM_SHOP_LIST (12004)', `ShopID=${shopId} (${shop.name}), Items=${shopItems.length}`);
      const w = new MsgWriter(12004);
      w.putByte(0); // err = 0
      w.putByte(shopItems.length);
      for (const it of shopItems) {
        writeShopItem(w, it, shopId);
      }
      responses.push(w);
      break;
    }

    // 8. Buy Item from Shop / GM Shop (MSG 12005)
    case 12005: {
      const shopId = msg.getShort();
      const itemId = msg.getInt();
      const count = Math.max(1, msg.getByte());
      const itemDef = getItemById(itemId);
      const slotPos = addItemToPlayerBag(player, itemDef.id, count);
      logEvent('MSG_ITEM_BUY (12005)', `Player bought ${count}x "${itemDef.name}" (ID=${itemDef.id}) -> slot ${slotPos}`);
      const w = new MsgWriter(12005);
      w.putByte(0); // result = 0 (Success)
      w.putInt(itemDef.id);
      w.putShort(slotPos);
      w.putByte(count);
      w.putInt(player.money1);
      w.putInt(player.money2);
      w.putInt(player.money3);
      w.putShort(99);
      w.putShort(999);
      responses.push(w);
      break;
    }

    // 9. Sell Item from Bag (MSG 12006)
    case 12006: {
      const shopId = msg.getShort();
      const itemId = msg.getInt();
      const slotPos = msg.getShort();
      const count = msg.getByte();
      player.bag = (player.bag || []).filter((b) => b.slotPos !== slotPos);
      player.money3 = (player.money3 || 0) + 50000;
      savePlayers();
      logEvent('MSG_ITEM_SELL (12006)', `Sold slot=${slotPos} (itemId=${itemId}) -> Money3=${player.money3}`);
      const w = new MsgWriter(12006);
      w.putByte(0); // err = 0
      w.putInt(player.money3);
      responses.push(w);
      break;
    }

    // 10. Player Bag Operation: Equip / Unequip / Use Consumable & GM Chests (MSG 12001)
    case 12001: {
      const waitType = msg.getByte();
      const opType = msg.getByte(); // 1=equip, 2=unequip, 3=use/drop
      const itemId = msg.getInt();
      const slotPos = msg.getShort();
      logEvent('MSG_PLAYER_BAG (12001)', `waitType=${waitType}, opType=${opType}, itemId=${itemId}, slotPos=${slotPos}`);

      if (opType === 1) {
        // Equip item
        const bagIdx = (player.bag || []).findIndex((b) => b.slotPos === slotPos || b.itemId === itemId);
        const itemDef = getItemById(itemId);
        if (bagIdx >= 0) player.bag.splice(bagIdx, 1);
        player.equipped = (player.equipped || []).filter((e) => e.slotPos !== itemDef.type);
        player.equipped.push({ slotPos: itemDef.type, itemId: itemDef.id });
        savePlayers();
      } else if (opType === 2) {
        // Unequip item
        player.equipped = (player.equipped || []).filter((e) => e.slotPos !== slotPos && e.itemId !== itemId);
        addItemToPlayerBag(player, itemId, 1);
      } else if (opType === 3) {
        // Use item
        if (itemId === 3003) {
          // Rương GM Phú Quý
          player.money1 = 9999999;
          player.money2 = 9999999;
          player.money3 = 99999999;
          savePlayers();
          responses.push(createMoneyUpdatePush(player));
        } else if (itemId === 3002) {
          // Chân Nguyên Đế Thích Thiên (Sách EXP)
          player.level = Math.min(85, (player.level || 60) + 5);
          player.sp = (player.sp || 5000) + 1000;
          player.hp = 99999;
          player.mp = 50000;
          savePlayers();
        }
      }

      if (waitType !== 0) {
        const w = new MsgWriter(12001);
        w.putByte(0); // processPlayerBagMsg reads byte result = 0, then resets msg for caller
        w.putByte(waitType);
        if (waitType === 11) {
          // EXP book
          w.putByte(1);
          w.putInt(500000);
          w.putInt(player.exp);
          w.putInt(player.expMax);
          w.putByte(player.level);
          w.putInt(player.hp);
          w.putInt(player.mp);
          w.putInt(player.sp);
          w.putShort(player.cp || 1000);
        } else if (waitType === 4) {
          // Treasure chest
          w.putByte(0);
          w.putInt(player.money1);
          w.putInt(player.money2);
          w.putInt(player.money3);
        } else {
          w.putByte(0);
        }
        responses.push(w);
      }
      break;
    }

    // 11. Browse Skill Shop (MSG 14001)
    case 14001: {
      const shopId = msg.getShort();
      logEvent('MSG_SKILL_SHOP_LIST (14001)', `ShopID=${shopId}, Skills=${db.skills.length}`);
      const w = new MsgWriter(14001);
      w.putShort(shopId);
      w.putByte(db.skills.length);
      w.putByte(0); // gAction = 0
      for (const sk of db.skills) {
        writeSkillShop(w, sk);
        w.putByte(1); // status = 1 (learnable)
      }
      responses.push(w);
      break;
    }

    // 12. Learn Skill (MSG 14002)
    case 14002: {
      const shopId = msg.getShort();
      const skillId = msg.getInt();
      const sk = getSkillById(skillId);
      player.skillIds = player.skillIds || [];
      if (!player.skillIds.includes(sk.id)) {
        player.skillIds.push(sk.id);
        savePlayers();
      }
      logEvent('MSG_SKILL_LEARN (14002)', `Player learned skill "${sk.name}" (ID=${sk.id})`);
      const w = new MsgWriter(14002);
      w.putByte(0); // result = 0 (Success)
      w.putInt(sk.id);
      w.putInt(player.sp || 5000);
      w.putInt(player.money1);
      w.putInt(player.money2);
      w.putInt(player.money3);
      w.putByte(0); // no next shop skill
      w.putBoolean(true); // hasLearnedSkill
      writeSkillFull(w, sk);
      w.putByte(0); // addLevel
      responses.push(w);
      break;
    }

    // 13. Mission Data / Accept / Submit (MSG 15001, 15002, 15004)
    case 15001: {
      const missionId = msg.getShort();
      const ms = getMissionById(missionId);
      logEvent('MSG_MISSION_DATA (15001)', `MissionID=${ms.id} (${ms.name})`);
      const w = new MsgWriter(15001);
      w.putShort(ms.id);
      w.putString(ms.name);
      w.putByte(ms.level || 1);
      w.putString(ms.desc);
      w.putString(ms.dialogStart);
      w.putString(ms.dialogComplete);
      w.putInt(0); // setting = 0
      w.putInt(ms.exp || 50000);
      w.putShort(0); // money2 short
      w.putInt(ms.money3 || 1000000);
      w.putByte(0); // conditionCount = 0 (instantly completable!)
      const rewardItems = (ms.rewardItemIds || []).map(getItemById);
      w.putByte(rewardItems.length);
      for (const it of rewardItems) {
        writeItemAtts2(w, it, { includeSlotAndCount: false });
        w.putShort(1); // quantity
      }
      w.putByte(0); // selectItemCount = 0
      responses.push(w);
      break;
    }

    case 15002:
    case 15004: {
      const npcId = msg.getByte();
      const missionId = msg.getShort();
      const ms = getMissionById(missionId);
      player.money1 = Math.min(999999999, (player.money1 || 0) + (ms.money1 || 0));
      player.money2 = Math.min(999999999, (player.money2 || 0) + (ms.money2 || 0));
      player.money3 = Math.min(999999999, (player.money3 || 0) + (ms.money3 || 0));
      for (const itemId of ms.rewardItemIds || []) {
        addItemToPlayerBag(player, itemId, 1);
      }
      savePlayers();
      logEvent(`MSG_MISSION_ACTION (${type})`, `Completed/Accepted Mission "${ms.name}"`);
      const w = new MsgWriter(type);
      w.putByte(0); // err = 0
      w.putShort(ms.id);
      w.putInt(player.exp);
      w.putInt(player.money1);
      w.putInt(player.money2);
      w.putInt(player.money3);
      responses.push(w);
      responses.push(createMoneyUpdatePush(player));
      break;
    }

    // 14. PVE Battle / Encounter Monster or Boss (MSG 14501, 14502)
    case 14501:
    case 14502: {
      const groupId = msg.remaining() >= 2 ? msg.getShort() : 101;
      const bg = db.battleGroups[groupId] || db.battleGroups[101];
      logEvent(`MSG_BATTLE (${type})`, `Battle against "${bg.name}" (Group=${groupId})`);
      player.exp = (player.exp || 0) + (bg.rewardExp || 50000);
      player.money3 = (player.money3 || 0) + (bg.rewardMoney3 || 100000);
      if (bg.rewardItemId) {
        addItemToPlayerBag(player, bg.rewardItemId, 1);
      }
      savePlayers();
      responses.push(createMoneyUpdatePush(player));
      responses.push(
        createSystemChatPush(
          `⚔️ Chiến thắng [${bg.name}]! Nhận +${bg.rewardExp} EXP, +${bg.rewardMoney3} Đồng và chiến lợi phẩm [${getItemById(bg.rewardItemId).name}]!`
        )
      );
      break;
    }

    // 15. In-Game Chat & GM Slash Commands (MSG 13509 & CheatCode 16002)
    case 13509:
    case 16002: {
      const channel = type === 13509 ? msg.getByte() : 0;
      const text = msg.getString().trim();
      logEvent('MSG_CHAT_SEND (13509)', `[Ch=${channel}] "${text}"`);

      if (text.startsWith('/')) {
        const parts = text.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        if (cmd === '/gm' || cmd === '/help') {
          responses.push(
            createSystemChatPush(
              '🛠️ Lệnh GM Offline: /gold (Max Tiền/KNB) | /level 85 (Max Cấp) | /item <id> (Nhận đồ, VD: /item 1001) | /skill (Học full kỹ năng) | /tp <1..9> (Dịch chuyển bản đồ)'
            )
          );
        } else if (cmd === '/gold' || cmd === '/knb' || cmd === '/la') {
          player.money1 = 99999999;
          player.money2 = 99999999;
          player.money3 = 999999999;
          savePlayers();
          responses.push(createMoneyUpdatePush(player));
          responses.push(createSystemChatPush('💰 [GM] Đã cộng 99,999,999 KNB + Kim Diệp + 999,999,999 Đồng Vàng!'));
        } else if (cmd === '/level' || cmd === '/lv') {
          const lv = Math.min(85, Math.max(1, Number(parts[1] || 85)));
          player.level = lv;
          player.hp = 99999;
          player.mp = 50000;
          player.sp = 99999;
          player.str = 999;
          player.con = 999;
          player.agi = 999;
          player.int = 999;
          player.wis = 999;
          savePlayers();
          responses.push(createSystemChatPush(`⚡ [GM] Đã thăng cấp nhân vật lên Lv${lv} (Cấp Thần Kì) + Max toàn bộ chỉ số!`));
        } else if (cmd === '/item') {
          const id = Number(parts[1] || 1001);
          const count = Number(parts[2] || 1);
          const it = getItemById(id);
          const slot = addItemToPlayerBag(player, it.id, count);
          responses.push(createSystemChatPush(`🎁 [GM] Đã gửi ${count}x [${it.name}] vào Túi Đồ (Ô #${slot})!`));
        } else if (cmd === '/skill') {
          player.skillIds = db.skills.map((s) => s.id);
          savePlayers();
          responses.push(createSystemChatPush(`📖 [GM] Đã lĩnh ngộ toàn bộ ${db.skills.length} Tuyệt Kỹ Phong Vân!`));
        } else if (cmd === '/tp' || cmd === '/map') {
          const mapId = Number(parts[1] || 2);
          const nextMap = getMapById(mapId);
          player.mapId = nextMap.id;
          player.gx = nextMap.spawnX || 12;
          player.gy = nextMap.spawnY || 10;
          savePlayers();
          responses.push(buildMapPacket13004(nextMap, player));
          responses.push(createSystemChatPush(`🌀 [GM] Đã dịch chuyển tới [${nextMap.name}]!`));
        } else {
          responses.push(createSystemChatPush(`❓ Lệnh không xác định "${cmd}". Gõ /gm để xem danh sách lệnh.`));
        }
      } else {
        const echo = new MsgWriter(13510); // MSG_CHAT_RECEIVE
        echo.putByte(channel);
        echo.putInt(player.id);
        echo.putString(player.name);
        echo.putString(text);
        echo.putByte(player.vipLevel || 12);
        responses.push(echo);
      }
      break;
    }

    default: {
      logEvent(`MSG_GENERIC (${type})`, `Unhandled packet (${msg.buf.length} bytes), returning OK ack`);
      const w = new MsgWriter(type);
      w.putByte(0); // generic err = 0 success
      responses.push(w);
      break;
    }
  }

  return responses;
}

// ============================================================================
// 1. TCP Login & World Server (Port 30000)
// ============================================================================
const tcpServer = net.createServer((socket) => {
  serverStats.tcpConnections++;
  activeSessions.add(socket);
  const session = { player: db.players[0], remote: `${socket.remoteAddress}:${socket.remotePort}` };
  logEvent('TCP_CONNECT', `Client connected from ${session.remote}`);

  let recvBuf = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    recvBuf = Buffer.concat([recvBuf, chunk]);
    while (recvBuf.length >= 4) {
      const totalLen = recvBuf.readUInt16BE(0);
      const msgType = recvBuf.readInt16BE(2);
      if (totalLen < 4) {
        recvBuf = recvBuf.subarray(4);
        continue;
      }
      if (recvBuf.length < totalLen) break;
      const payload = recvBuf.subarray(4, totalLen);
      recvBuf = recvBuf.subarray(totalLen);

      const reader = new MsgReader(msgType, payload);
      const replies = handleGameMessage(reader, session);
      if (replies.length > 0) {
        socket.write(Buffer.concat(replies.map((r) => r.toFrame())));
      }
    }
  });

  socket.on('close', () => {
    activeSessions.delete(socket);
    logEvent('TCP_CLOSE', `Client disconnected (${session.remote})`);
  });

  socket.on('error', (err) => {
    activeSessions.delete(socket);
    logEvent('TCP_ERROR', `${session.remote}: ${err.message}`);
  });
});

// ============================================================================
// 2. HTTP Gateway (/A) & Interactive Web GM Control Panel (Port 8079)
// ============================================================================
function renderGmDashboardHtml() {
  const p = db.players[0];
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phong Vân Truyền Kỳ 2 Offline - Web GM Control Panel</title>
  <style>
    :root { --bg: #0f172a; --card: #1e293b; --accent: #f59e0b; --text: #f8fafc; --muted: #94a3b8; --green: #10b981; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { margin: 0; padding: 24px; background: var(--bg); color: var(--text); }
    h1, h2, h3 { margin-top: 0; color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; }
    .card { background: var(--card); border: 1px solid #334155; border-radius: 12px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .btn { background: var(--accent); color: #000; font-weight: 700; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; margin: 4px; transition: 0.15s; }
    .btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-green { background: var(--green); color: #fff; }
    select, input { background: #0f172a; color: #fff; border: 1px solid #475569; padding: 8px 12px; border-radius: 6px; width: 100%; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #334155; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #065f46; color: #6ee7b7; font-size: 12px; font-weight: 600; }
    pre { background: #090d16; padding: 12px; border-radius: 8px; max-height: 240px; overflow-y: auto; font-size: 12px; color: #cbd5e1; }
  </style>
</head>
<body>
  <h1>⚔️ Phong Vân Truyền Kỳ 2 (WorldOL) - Offline Server & GM Center</h1>
  <p style="color:var(--muted)">
    Trạng thái: <span class="badge">ONLINE (Localhost 127.0.0.1)</span> |
    TCP Game Server: <code>127.0.0.1:${TCP_PORT}</code> |
    HTTP Gateway: <code>127.0.0.1:${HTTP_PORT}/A</code> |
    Photo Server: <code>127.0.0.1:${PHOTO_PORT}</code> |
    Packets xử lý: <strong>${serverStats.packetsHandled}</strong>
  </p>

  <div class="grid">
    <div class="card">
      <h2>👑 Nhân Vật Chính: ${p.name} (ID: ${p.id})</h2>
      <table>
        <tr><th>Cấp Độ / VIP</th><td>Lv.${p.level} (Cấp Thần Kì) / VIP ${p.vipLevel}</td></tr>
        <tr><th>KNB (Vàng)</th><td>${p.money1.toLocaleString()}</td></tr>
        <tr><th>Kim Diệp (Lá)</th><td>${p.money2.toLocaleString()}</td></tr>
        <tr><th>Đồng (Bạc)</th><td>${p.money3.toLocaleString()}</td></tr>
        <tr><th>HP / MP / SP</th><td>${p.hp.toLocaleString()} / ${p.mp.toLocaleString()} / ${p.sp.toLocaleString()}</td></tr>
        <tr><th>Bản Đồ Hiện Tại</th><td>Map #${p.mapId} (${getMapById(p.mapId).name}) [${p.gx}, ${p.gy}]</td></tr>
        <tr><th>Hành Trang / Kỹ Năng</th><td>${(p.bag || []).length} Vật phẩm | ${(p.skillIds || []).length} Tuyệt kỹ</td></tr>
      </table>
      <div style="margin-top: 14px;">
        <button class="btn" onclick="gmAction('max_money')">💰 Cộng 99,999,999 KNB + Kim Diệp + Đồng</button>
        <button class="btn btn-green" onclick="gmAction('max_level')">⚡ Thăng Cấp Lv85 + Max Chỉ Số (999)</button>
        <button class="btn" onclick="gmAction('unlock_skills')">📖 Mở Khóa Toàn Bộ Tuyệt Kỹ Võ Học</button>
      </div>
    </div>

    <div class="card">
      <h2>🎁 Gửi Thần Khí, Trang Bị & Vật Phẩm Vào Túi</h2>
      <label>Chọn Vật Phẩm (Từ <code>server/db/items.json</code>):</label>
      <select id="itemSelect">
        ${db.items.map((it) => `<option value="${it.id}">[${it.id}] ${it.name} (Phẩm ${it.grade})</option>`).join('')}
      </select>
      <label>Số lượng:</label>
      <input type="number" id="itemCount" value="1" min="1" max="99" />
      <button class="btn btn-green" onclick="sendItem()">📬 Gửi Vật Phẩm Ngay</button>

      <h3 style="margin-top: 18px;">🌀 Dịch Chuyển Tức Thời (9 Bản Đồ)</h3>
      <select id="mapSelect">
        ${db.maps.map((m) => `<option value="${m.id}" ${m.id === p.mapId ? 'selected' : ''}>[Map ${m.id}] ${m.name}</option>`).join('')}
      </select>
      <button class="btn" onclick="teleportMap()">🚀 Dịch Chuyển Nhân Vật</button>
    </div>

    <div class="card">
      <h2>📜 Nhật Ký Gói Tin & Kết Nối Giả Lập (ADB Reverse)</h2>
      <label>Đường dẫn <code>adb.exe</code> (để trống = tự động dò LDPlayer / BlueStacks / Nox):</label>
      <input type="text" id="adbPath" placeholder="Ví dụ: C:\LDPlayer\LDPlayer9\adb.exe" />
      <button class="btn btn-green" onclick="connectAdb()">🔌 Tự Động Kết Nối Giả Lập (Chạy adb reverse)</button>
      <button class="btn" onclick="location.reload()">🔄 Làm Mới Trang</button>
      <pre id="logBox">${serverStats.recentLogs.map((l) => `[${l.time}] [${l.tag}] ${l.detail}`).join('\n') || 'Đang chờ kết nối từ PVTK2v1_Offline.apk...'}</pre>
    </div>
  </div>

  <script>
    async function gmAction(action, extra = {}) {
      const res = await fetch('/api/gm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra })
      });
      const data = await res.json();
      alert(data.message || 'Thành công!');
      location.reload();
    }
    function sendItem() {
      const itemId = Number(document.getElementById('itemSelect').value);
      const count = Number(document.getElementById('itemCount').value || 1);
      gmAction('add_item', { itemId, count });
    }
    function teleportMap() {
      const mapId = Number(document.getElementById('mapSelect').value);
      gmAction('teleport', { mapId });
    }
    function connectAdb() {
      const adbPath = document.getElementById('adbPath').value.trim();
      gmAction('adb_reverse', { adbPath });
    }
  </script>
</body>
</html>`;
}

const { setupAdbReverse } = require('../tools/setup_adb_reverse.js');
const WEB_ROOT = path.join(__dirname, '..', 'web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pl': 'application/octet-stream',
  '.ui': 'application/octet-stream',
  '.t': 'application/octet-stream'
};

const httpServer = http.createServer((req, res) => {
  serverStats.httpRequests++;
  const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${HTTP_PORT}`);

  // 1. Server GM Dashboard UI at /gm
  if (req.method === 'GET' && parsedUrl.pathname === '/gm') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderGmDashboardHtml());
    return;
  }

  // 2. JSON Status & GM Action API
  if (parsedUrl.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ stats: serverStats, player: db.players[0] }, null, 2));
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/gm') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const p = db.players[0];
        let message = 'Đã thực thi lệnh GM!';
        if (payload.action === 'max_money') {
          p.money1 = 99999999;
          p.money2 = 99999999;
          p.money3 = 999999999;
          savePlayers();
          broadcastToSessions(createMoneyUpdatePush(p));
          message = 'Đã cộng 99,999,999 KNB, Kim Diệp & 999,999,999 Đồng!';
        } else if (payload.action === 'max_level') {
          p.level = 85;
          p.hp = 99999;
          p.mp = 50000;
          p.sp = 99999;
          p.str = 999;
          p.con = 999;
          p.agi = 999;
          p.int = 999;
          p.wis = 999;
          savePlayers();
          broadcastToSessions(createSystemChatPush('⚡ [Web GM] Nhân vật đã thăng cấp Lv85 & Max chỉ số!'));
          message = 'Đã nâng cấp nhân vật lên Lv85 + Max chỉ số 999!';
        } else if (payload.action === 'unlock_skills') {
          p.skillIds = db.skills.map((s) => s.id);
          savePlayers();
          broadcastToSessions(createSystemChatPush('📖 [Web GM] Đã mở khóa toàn bộ Tuyệt Kỹ Phong Vân!'));
          message = `Đã mở khóa toàn bộ ${db.skills.length} kỹ năng!`;
        } else if (payload.action === 'add_item') {
          const it = getItemById(payload.itemId);
          const slot = addItemToPlayerBag(p, it.id, payload.count || 1);
          broadcastToSessions(createSystemChatPush(`🎁 [Web GM] Đã nhận ${(payload.count || 1)}x [${it.name}] vào ô #${slot}!`));
          message = `Đã thêm ${payload.count || 1}x "${it.name}" vào ô hành trang #${slot}!`;
        } else if (payload.action === 'teleport') {
          const m = getMapById(payload.mapId);
          p.mapId = m.id;
          p.gx = m.spawnX || 12;
          p.gy = m.spawnY || 10;
          savePlayers();
          broadcastToSessions(buildMapPacket13004(m, p));
          message = `Đã dịch chuyển nhân vật tới "${m.name}"!`;
        } else if (payload.action === 'adb_reverse') {
          const adbRes = setupAdbReverse(payload.adbPath || undefined);
          message = adbRes.message;
        }
        logEvent('WEB_GM', message);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, message, player: p }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // 3. Game Client HTTP /A Endpoint (HttpRequest.parse() binary format)
  if (parsedUrl.pathname.startsWith('/A')) {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      let rawFrames = Buffer.concat(chunks);
      const dParam = parsedUrl.searchParams.get('D');
      if (rawFrames.length === 0 && dParam) {
        const dStr = String(dParam);
        if (/^[0-9a-fA-F]+$/.test(dStr) && dStr.length % 2 === 0) {
          rawFrames = Buffer.from(dStr, 'hex');
        } else {
          rawFrames = Buffer.from(dStr, 'base64');
        }
      }

      const outMessages = [];
      let off = 0;
      while (off + 4 <= rawFrames.length) {
        const tLen = rawFrames.readUInt16BE(off);
        const mType = rawFrames.readInt16BE(off + 2);
        if (tLen < 4 || off + tLen > rawFrames.length) break;
        const body = rawFrames.subarray(off + 4, off + tLen);
        off += tLen;
        const replies = handleGameMessage(new MsgReader(mType, body), { player: db.players[0] });
        outMessages.push(...replies);
      }

      if (outMessages.length === 0) {
        const hb = new MsgWriter(10005);
        hb.putInt(Math.floor(Date.now() / 1000));
        outMessages.push(hb);
      }

      const header = Buffer.alloc(6);
      header.writeInt32BE(Math.floor(Date.now() / 1000), 0);
      header.writeInt16BE(outMessages.length, 4);
      const frames = outMessages.map((m) => m.toFrame());
      const bodyBuf = Buffer.concat([header, ...frames]);

      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bodyBuf.length
      });
      res.end(bodyBuf);
    });
    return;
  }

  // 4. Playable Web Edition Static Server (/ and /web/*)
  if (req.method === 'GET' || req.method === 'HEAD') {
    let relPath = decodeURIComponent(parsedUrl.pathname);
    if (relPath === '/' || relPath === '/web' || relPath === '/web/') {
      relPath = '/index.html';
    } else if (relPath.startsWith('/web/')) {
      relPath = relPath.slice(4);
    }
    const safePath = path.normalize(path.join(WEB_ROOT, relPath));
    if (safePath.startsWith(WEB_ROOT) && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const data = fs.readFileSync(safePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': data.length,
        'Cache-Control': 'no-cache'
      });
      res.end(req.method === 'HEAD' ? undefined : data);
      return;
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

// ============================================================================
// 3. Photo & Avatar Server (Port 28080)
// ============================================================================
const photoServer = http.createServer((req, res) => {
  const w = new MsgWriter(4);
  w.putByte(0);
  const frame = w.toFrame();
  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': frame.length
  });
  res.end(frame);
});

function startServers() {
  tcpServer.listen(TCP_PORT, '0.0.0.0', () => {
    logEvent('STARTUP', `TCP Game & Login Server listening on 0.0.0.0:${TCP_PORT} (127.0.0.1:${TCP_PORT})`);
  });
  httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    logEvent('STARTUP', `HTTP /A Gateway & Web GM Dashboard listening on http://127.0.0.1:${HTTP_PORT}`);
  });
  photoServer.listen(PHOTO_PORT, '0.0.0.0', () => {
    logEvent('STARTUP', `Photo Server listening on 0.0.0.0:${PHOTO_PORT}`);
  });
}

if (require.main === module) {
  startServers();
}

module.exports = { startServers, tcpServer, httpServer, photoServer, MsgWriter, MsgReader };
