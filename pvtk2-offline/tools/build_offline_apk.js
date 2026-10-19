#!/usr/bin/env node
/**
 * PVTK2 Standalone Offline APK Builder & DEX Binary Patcher
 * ---------------------------------------------------------
 * Builds D:\REA\app\pvtk2-offline\PVTK2v1_Offline.apk from D:\REA\app\PVTK2v1.apk:
 * 1. Removes the Account Login UI & SDK login gate.
 * 2. Direct transition from "Play / New Game" -> Character Creation (UI 300 / CreatPlayer).
 * 3. Direct transition from Character Creation (UI 300) -> Standalone Offline World (Stage 20).
 * 4. Fixes Character Info (`N.vật`) -> `Skill` tab (`Talent.CheakIsTalentSkill` NPE fix + offline
 *    Initiative/Auto skill toggling in `Skill.doPlayerSetSkillInitiative`, `doPlayerCancelSkillInitiative`, `doSetAutoSkill`).
 * 5. Packages 6 authentic 3-layer maps (`assets/map/1.m` .. `assets/map/6.m`) and per-map NPC/Portal
 *    packets (`assets/map/1_mini.m` .. `assets/map/6_mini.m`), and patches `GameWorld.doJumpMap(IIIZ)V`
 *    and `WorldMap.doEnterWorldMap()V` for full multi-map switching via Portals, NPC menus, and HUD `Map` button.
 * 6. Recomputes DEX SHA-1 signature & Adler32 checksum, and signs the APK with JAR v1 + APK Signature Scheme v2.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const {
  buildAllOfflineMaps,
  buildAllMapJumpPackets,
  buildOfflineWorldPacket,
} = require('./offline_world_data');

const SOURCE_APK = 'D:/REA/app/PVTK2v1.apk';
const OUT_DIR = 'D:/REA/app/pvtk2-offline';
const OUT_APK = path.join(OUT_DIR, 'PVTK2v1_Offline.apk');
const PATCHED_DEX_PATH = path.join(OUT_DIR, 'build', 'classes2.dex');

fs.mkdirSync(path.join(OUT_DIR, 'build'), { recursive: true });

function readZipEntries(zipBuf) {
  let eocd = zipBuf.length - 22;
  while (eocd >= 0 && zipBuf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('Invalid ZIP/APK archive: EOCD not found');

  const cdCount = zipBuf.readUInt16LE(eocd + 10);
  const cdOff = zipBuf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = cdOff;
  for (let i = 0; i < cdCount; i++) {
    if (zipBuf.readUInt32LE(p) !== 0x02014b50) {
      throw new Error(`Invalid Central Directory header at 0x${p.toString(16)}`);
    }
    const verMade = zipBuf.readUInt16LE(p + 4);
    const verExtr = zipBuf.readUInt16LE(p + 6);
    const flags = zipBuf.readUInt16LE(p + 8);
    const method = zipBuf.readUInt16LE(p + 10);
    const time = zipBuf.readUInt16LE(p + 12);
    const date = zipBuf.readUInt16LE(p + 14);
    const crc = zipBuf.readUInt32LE(p + 16);
    const compSize = zipBuf.readUInt32LE(p + 20);
    const uncompSize = zipBuf.readUInt32LE(p + 24);
    const nameLen = zipBuf.readUInt16LE(p + 28);
    const extraLen = zipBuf.readUInt16LE(p + 30);
    const commentLen = zipBuf.readUInt16LE(p + 32);
    const lfhOff = zipBuf.readUInt32LE(p + 42);
    const rel = zipBuf.subarray(p + 46, p + 46 + nameLen).toString('utf8');

    const lfhNameLen = zipBuf.readUInt16LE(lfhOff + 26);
    const lfhExtraLen = zipBuf.readUInt16LE(lfhOff + 28);
    const dataStart = lfhOff + 30 + lfhNameLen + lfhExtraLen;
    const compData = zipBuf.subarray(dataStart, dataStart + compSize);

    entries.push({
      cdIndex: i,
      rel,
      verMade,
      verExtr,
      flags,
      method,
      time,
      date,
      crc,
      compSize,
      uncompSize,
      lfhOff,
      compData,
      inflate() {
        return method === 8 ? zlib.inflateRawSync(compData) : Buffer.from(compData);
      },
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function computeAdler32(buf) {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;
  const len = buf.length;
  let i = 0;
  while (i < len) {
    let tlen = Math.min(len - i, 5552);
    do {
      a += buf[i++];
      b += a;
    } while (--tlen > 0);
    a %= MOD_ADLER;
    b %= MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

function readStringAt(dex, strOff, idx) {
  let off = dex.readUInt32LE(strOff + idx * 4);
  let b;
  do {
    b = dex[off++];
  } while (b & 0x80);
  let end = off;
  while (end < dex.length && dex[end] !== 0) end++;
  return dex.subarray(off, end).toString('utf8');
}

function createDexResolver(dex) {
  const strCount = dex.readUInt32LE(56);
  const strOff = dex.readUInt32LE(60);
  const typeCount = dex.readUInt32LE(64);
  const typeOff = dex.readUInt32LE(68);
  const protoOff = dex.readUInt32LE(76);
  const fieldCount = dex.readUInt32LE(80);
  const fieldOff = dex.readUInt32LE(84);
  const methodCount = dex.readUInt32LE(88);
  const methodOff = dex.readUInt32LE(92);

  const strAt = (idx) => readStringAt(dex, strOff, idx);
  const typeAt = (idx) => strAt(dex.readUInt32LE(typeOff + idx * 4));
  const protoAt = (idx) => {
    const base = protoOff + idx * 12;
    const ret = typeAt(dex.readUInt32LE(base + 4));
    const paramsOff = dex.readUInt32LE(base + 8);
    if (!paramsOff) return `()${ret}`;
    const count = dex.readUInt32LE(paramsOff);
    let params = '';
    for (let i = 0; i < count; i++) {
      params += typeAt(dex.readUInt16LE(paramsOff + 4 + i * 2));
    }
    return `(${params})${ret}`;
  };

  return {
    findString(target) {
      for (let i = 0; i < strCount; i++) {
        if (strAt(i) === target) return i;
      }
      throw new Error(`String not found in DEX: ${target}`);
    },
    findType(desc) {
      for (let i = 0; i < typeCount; i++) {
        if (typeAt(i) === desc) return i;
      }
      throw new Error(`Type not found in DEX: ${desc}`);
    },
    findField(cls, name, typeDesc) {
      for (let i = 0; i < fieldCount; i++) {
        const base = fieldOff + i * 8;
        if (
          typeAt(dex.readUInt16LE(base)) === cls &&
          strAt(dex.readUInt32LE(base + 4)) === name &&
          (!typeDesc || typeAt(dex.readUInt16LE(base + 2)) === typeDesc)
        ) {
          return i;
        }
      }
      throw new Error(`Field not found in DEX: ${cls}->${name}:${typeDesc || '*'}`);
    },
    findMethod(cls, name, protoDesc) {
      for (let i = 0; i < methodCount; i++) {
        const base = methodOff + i * 8;
        if (
          typeAt(dex.readUInt16LE(base)) === cls &&
          strAt(dex.readUInt32LE(base + 4)) === name &&
          (!protoDesc || protoAt(dex.readUInt16LE(base + 2)) === protoDesc)
        ) {
          return i;
        }
      }
      throw new Error(`Method not found in DEX: ${cls}->${name}${protoDesc || ''}`);
    },
  };
}

// Dalvik 16-bit code-unit emitters
const Dalvik = {
  nop: () => [0x0000],
  moveObject: (vA, vB) => [0x0007 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12)],
  returnVoid: () => [0x000e],
  returnVal: (vA) => [0x000f | ((vA & 0xff) << 8)],
  returnObject: (vA) => [0x0011 | ((vA & 0xff) << 8)],
  moveResultObject: (vA) => [0x000c | ((vA & 0xff) << 8)],
  const4: (vA, imm4) => [0x0012 | ((vA & 0x0f) << 8) | ((imm4 & 0x0f) << 12)],
  const16: (vAA, imm16) => [0x0013 | ((vAA & 0xff) << 8), imm16 & 0xffff],
  constString: (vAA, strIdx) => [0x001a | ((vAA & 0xff) << 8), strIdx & 0xffff],
  newInstance: (vAA, typeIdx) => [0x0022 | ((vAA & 0xff) << 8), typeIdx & 0xffff],
  newArray: (vA, vB, typeIdx) => [
    0x0023 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    typeIdx & 0xffff,
  ],
  goto8: (offset8) => [0x0028 | ((offset8 & 0xff) << 8)],
  ifNe: (vA, vB, offset16) => [
    0x0033 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    offset16 & 0xffff,
  ],
  ifEqz: (vAA, offset16) => [0x0038 | ((vAA & 0xff) << 8), offset16 & 0xffff],
  ifNez: (vAA, offset16) => [0x0039 | ((vAA & 0xff) << 8), offset16 & 0xffff],
  ifLez: (vAA, offset16) => [0x003b | ((vAA & 0xff) << 8), offset16 & 0xffff],
  aputByte: (vAA, vBB, vCC) => [
    0x004f | ((vAA & 0xff) << 8),
    (vBB & 0xff) | ((vCC & 0xff) << 8),
  ],
  iget: (vA, vB, fieldIdx) => [
    0x0052 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    fieldIdx & 0xffff,
  ],
  igetObject: (vA, vB, fieldIdx) => [
    0x0054 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    fieldIdx & 0xffff,
  ],
  iput: (vA, vB, fieldIdx) => [
    0x0059 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    fieldIdx & 0xffff,
  ],
  iputObject: (vA, vB, fieldIdx) => [
    0x005b | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    fieldIdx & 0xffff,
  ],
  iputByte: (vA, vB, fieldIdx) => [
    0x005d | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    fieldIdx & 0xffff,
  ],
  iputShort: (vA, vB, fieldIdx) => [
    0x005f | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    fieldIdx & 0xffff,
  ],
  sgetObject: (vAA, fieldIdx) => [0x0062 | ((vAA & 0xff) << 8), fieldIdx & 0xffff],
  sputObject: (vAA, fieldIdx) => [0x0069 | ((vAA & 0xff) << 8), fieldIdx & 0xffff],
  sputBoolean: (vAA, fieldIdx) => [0x006a | ((vAA & 0xff) << 8), fieldIdx & 0xffff],
  addIntLit16: (vA, vB, lit16) => [
    0x00d0 | ((vA & 0x0f) << 8) | ((vB & 0x0f) << 12),
    lit16 & 0xffff,
  ],
  invoke35c: (op, methodIdx, regs = []) => {
    const argc = regs.length;
    const r0 = regs[0] || 0;
    const r1 = regs[1] || 0;
    const r2 = regs[2] || 0;
    const r3 = regs[3] || 0;
    const r4 = regs[4] || 0;
    return [
      (op & 0xff) | ((argc & 0x0f) << 12) | ((r4 & 0x0f) << 8),
      methodIdx & 0xffff,
      (r0 & 0x0f) | ((r1 & 0x0f) << 4) | ((r2 & 0x0f) << 8) | ((r3 & 0x0f) << 12),
    ];
  },
  invokeVirtual: (methodIdx, regs) => Dalvik.invoke35c(0x6e, methodIdx, regs),
  invokeDirect: (methodIdx, regs) => Dalvik.invoke35c(0x70, methodIdx, regs),
  invokeStatic: (methodIdx, regs) => Dalvik.invoke35c(0x71, methodIdx, regs),
};

function writeMethodWords(dex, codeOff, words) {
  const insnsSize = dex.readUInt32LE(codeOff + 12);
  if (words.length > insnsSize) {
    throw new Error(
      `Method at 0x${codeOff.toString(16)} overflow: ${words.length} words > insnsSize ${insnsSize}`
    );
  }
  const insnsOff = codeOff + 16;
  for (let i = 0; i < insnsSize; i++) {
    dex.writeUInt16LE(i < words.length ? words[i] : 0x0000, insnsOff + i * 2);
  }
}

function patchClasses2Dex(originalDex) {
  console.log('[1/3] Patching classes2.dex for 100% Standalone Offline Mode...');
  const dex = Buffer.from(originalDex);

  const R = createDexResolver(dex);

  // Resolve exact DEX indices from symbol tables
  const IDX = {
    strDefaultName: R.findString('Thành'),
    strMapDir: R.findString('/map/'),
    strMiniM: R.findString('_mini.m'),
    strOfflinePacket: R.findString('/android_params.js'),
    typePlayerBag: R.findType('Lcom/hz/core/PlayerBag;'),
    typeMessage: R.findType('Lcom/hz/net/Message;'),
    typeStringBuilder: R.findType('Ljava/lang/StringBuilder;'),
    typeShortArray: R.findType('[S'),

    fIsAgree: R.findField('Lcom/hz/main/GameWorld;', 'isAgree', 'Z'),
    fMyPlayer: R.findField('Lcom/hz/main/GameWorld;', 'myPlayer', 'Lcom/hz/actor/Player;'),
    fGameMap: R.findField('Lcom/hz/main/GameWorld;', 'gameMap', 'Lcom/hz/map/GameMap;'),
    fPackImgData: R.findField('Lcom/hz/main/ResourceHandler;', 'packImgData', '[[B'),
    fObjectDataInt0: R.findField('Lcom/hz/core/ObjectData;', 'int0', 'I'),
    fMissionMapId: R.findField('Lcom/hz/core/Mission;', 'mapId', 'S'),
    fPlayerBag: R.findField('Lcom/hz/actor/Player;', 'bag', 'Lcom/hz/core/PlayerBag;'),

    fAutoSkillID: R.findField('Lcom/hz/actor/Player;', 'autoSkillID', '[S'),
    fHp: R.findField('Lcom/hz/actor/Player;', 'hp', 'I'),
    fHpDisplay: R.findField('Lcom/hz/actor/Player;', 'hpDisplay', 'I'),
    fMp: R.findField('Lcom/hz/actor/Player;', 'mp', 'I'),
    fMpDisplay: R.findField('Lcom/hz/actor/Player;', 'mpDisplay', 'I'),
    fExp: R.findField('Lcom/hz/actor/Player;', 'exp', 'I'),
    fExpMax: R.findField('Lcom/hz/actor/Player;', 'expMax', 'I'),
    fSp: R.findField('Lcom/hz/actor/Player;', 'sp', 'I'),
    fCombatPoint: R.findField('Lcom/hz/actor/Player;', 'combatPoint', 'I'),
    fMoney1: R.findField('Lcom/hz/actor/Player;', 'money1', 'I'),
    fMoney2: R.findField('Lcom/hz/actor/Player;', 'money2', 'I'),
    fMoney3: R.findField('Lcom/hz/actor/Player;', 'money3', 'I'),
    fCp: R.findField('Lcom/hz/actor/Player;', 'cp', 'S'),
    fStr: R.findField('Lcom/hz/actor/Player;', 'str', 'S'),
    fCon: R.findField('Lcom/hz/actor/Player;', 'con', 'S'),
    fAgi: R.findField('Lcom/hz/actor/Player;', 'agi', 'S'),
    fIlt: R.findField('Lcom/hz/actor/Player;', 'ilt', 'S'),
    fWis: R.findField('Lcom/hz/actor/Player;', 'wis', 'S'),
    fVip1: R.findField('Lcom/hz/actor/Player;', 'vipLevel', 'B'),
    fVip2: R.findField('Lcom/hz/actor/Player;', 'vipLevel2', 'B'),
    fVip3: R.findField('Lcom/hz/actor/Player;', 'vipLevel3', 'B'),
    fNumBag: R.findField('Lcom/hz/actor/Player;', 'numBag', 'B'),
    fNumStroe: R.findField('Lcom/hz/actor/Player;', 'numStroe', 'B'),

    mGetWidgetByEvent: R.findMethod('Lcom/hz/ui/UIHandler;', 'getGWidgetByEventType', '(I)Lcom/hz/gui/GWidget;'),
    mSetShow: R.findMethod('Lcom/hz/gui/GWidget;', 'setShow', '(Z)V'),
    mGetParent: R.findMethod('Lcom/hz/gui/GWidget;', 'getParent', '()Lcom/hz/gui/GContainer;'),
    mUpdateLoginUI: R.findMethod('Lcom/hz/ui/UIHandler;', 'updateDataToLoginUI', '(Lcom/hz/ui/UIHandler;)V'),
    mCloseAllUI: R.findMethod('Lcom/hz/ui/UIHandler;', 'closeAllUI', '()V'),
    mDoMenuButton: R.findMethod('Lcom/hz/ui/UIAction;', 'doMenuButton', '(I)V'),
    mDoPlayerListCreate: R.findMethod('Lcom/hz/ui/UIAction;', 'doPlayerListCreate', '(I)V'),
    mDoPlayerListEnterGame: R.findMethod('Lcom/hz/ui/UIAction;', 'doPlayerListEnterGame', '(Lcom/hz/actor/ListPlayer;)V'),
    mDoTourist: R.findMethod('Lcom/hz/main/GameWorld;', 'doTourist', '(III)V'),
    mDoJumpMap: R.findMethod('Lcom/hz/main/GameWorld;', 'doJumpMap', '(IIIZ)V'),
    mChangeStage: R.findMethod('Lcom/hz/main/GameWorld;', 'changeStage', '(I)V'),
    mGetNpcByID: R.findMethod('Lcom/hz/main/GameWorld;', 'getNpcByID', '(I)Lcom/hz/actor/NPC;'),
    mDoNpc: R.findMethod('Lcom/hz/actor/NPC;', 'doNpc', '(Lcom/hz/actor/NPC;)Z'),

    mGetRandomCreatePlayer: R.findMethod('Lcom/hz/actor/ListPlayer;', 'getRandomCreatePlayer', '()Lcom/hz/actor/ListPlayer;'),
    mSetName: R.findMethod('Lcom/hz/actor/Player;', 'setName', '(Ljava/lang/String;)V'),
    mSetId: R.findMethod('Lcom/hz/actor/Player;', 'setId', '(I)V'),
    mSetLevel: R.findMethod('Lcom/hz/actor/Player;', 'setLevel', '(B)V'),
    mSetBag: R.findMethod('Lcom/hz/actor/Player;', 'setBag', '(Lcom/hz/core/PlayerBag;)V'),
    mSetPosition: R.findMethod('Lcom/hz/actor/Player;', 'setPosition', '(II)V'),
    mRefreshWorldSprite: R.findMethod('Lcom/hz/actor/Player;', 'refreshWorldSprite', '()V'),
    mSetPet: R.findMethod('Lcom/hz/actor/Player;', 'setPet', '(Lcom/hz/actor/Model;)V'),
    mPlayerBagInit: R.findMethod('Lcom/hz/core/PlayerBag;', '<init>', '(Lcom/hz/actor/Player;)V'),
    mBagGet: R.findMethod('Lcom/hz/core/PlayerBag;', 'getItem', '(I)Lcom/hz/core/Item;'),
    mCreateItemPet: R.findMethod('Lcom/hz/actor/MyPet;', 'createItemPet', '(Lcom/hz/core/Item;Lcom/hz/actor/Player;)Lcom/hz/actor/MyPet;'),

    mLoadAllIDList: R.findMethod('Lcom/hz/main/ResourceHandler;', 'loadAllIDList', '()V'),
    mLoadPackageData: R.findMethod('Lcom/hz/main/ResourceHandler;', 'loadPackageData', '(Ljava/lang/String;I)[[B'),
    mLoadLocalMap: R.findMethod('Lcom/hz/map/GameMap;', 'loadLocalMap', '(IZ)Lcom/hz/map/GameMap;'),
    mSetTag: R.findMethod('Lcom/hz/map/GameMap;', 'setTag', '(BZ)V'),
    mMapInit: R.findMethod('Lcom/hz/map/GameMap;', 'init', '()V'),
    mGetFileByte: R.findMethod('Lcom/hz/common/Utilities;', 'getFileByte', '(Ljava/lang/String;)[B'),
    mMessageInit: R.findMethod('Lcom/hz/net/Message;', '<init>', '(I[B)V'),
    mProcessDataBlockFlag: R.findMethod('Lcom/hz/main/MsgHandler;', 'processDataBlockFlagMsg', '(Lcom/hz/net/Message;)V'),
    mCreateCheckEditionMsg: R.findMethod('Lcom/hz/main/MsgHandler;', 'createCheckEditionMsg', '(B)Lcom/hz/net/Message;'),
    mFromNormalData: R.findMethod('Lcom/hz/main/FragmentData;', 'fromNormalData', '(Lcom/hz/net/Message;)V'),

    mSbInit: R.findMethod('Ljava/lang/StringBuilder;', '<init>', '()V'),
    mSbAppendStr: R.findMethod('Ljava/lang/StringBuilder;', 'append', '(Ljava/lang/String;)Ljava/lang/StringBuilder;'),
    mSbAppendInt: R.findMethod('Ljava/lang/StringBuilder;', 'append', '(I)Ljava/lang/StringBuilder;'),
    mSbToString: R.findMethod('Ljava/lang/StringBuilder;', 'toString', '()Ljava/lang/String;'),
  };

  // 2. Bypass CMNManager SDK Login & Tool Network/Emulator Checks
  dex.writeUInt32LE(0x00000000, 0x2bb9b4 + 14);
  dex[0x2bb9b4 + 22] = 0x12;
  dex[0x2bb9b4 + 23] = 0x10;
  writeMethodWords(dex, 0x2bb960, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]);
  for (const codeOff of [
    0x2bb9d4, // CheckUpdate
    0x2bba08, // FeedbackApp
    0x2bba3c, // Init
    0x2bba88, // Login
    0x2bbabc, // Logout
    0x2bbaf0, // Payment
    0x2bbbd0, // PushNotifications
    0x2bbbfc, // ShowPopupEvent
    0x2bbc30, // SwitchAccount
    0x2bbc64, // doClearToken
  ]) {
    writeMethodWords(dex, codeOff, [...Dalvik.returnVoid()]);
  }

  for (const codeOff of [
    0x2bc190, // doCheckNetWorking()Z
    0x2bc214, // doNetWorking()Z
    0x2bc39c, // isConnectAble()Z
  ]) {
    writeMethodWords(dex, codeOff, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]);
  }

  const isConnectWords = new Array(53).fill(0x0000);
  isConnectWords[0x00] = 0x1012; isConnectWords[0x01] = 0x000f;
  isConnectWords[0x20] = 0x1012; isConnectWords[0x21] = 0x000f;
  writeMethodWords(dex, 0x2bc310, isConnectWords);

  const isEmulatorWords = new Array(53).fill(0x0000);
  isEmulatorWords[0x00] = 0x0012; isEmulatorWords[0x01] = 0x000f;
  isEmulatorWords[0x0c] = 0x0012; isEmulatorWords[0x0d] = 0x000f;
  isEmulatorWords[0x19] = 0x0012; isEmulatorWords[0x1a] = 0x000f;
  writeMethodWords(dex, 0x1d9cd4, isEmulatorWords);

  writeMethodWords(dex, 0x23c540, [...Dalvik.const4(0, 0), ...Dalvik.returnVal(0)]); // GameWorld.checkTourist()Z -> false
  writeMethodWords(dex, 0x2568a0, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]); // SafeLock.doSafeLockVerify()Z -> true

  // Disable startup & background sync/ad/ani/heartbeat network calls
  writeMethodWords(dex, 0x247524, [...Dalvik.returnVoid()]); // GameWorld.doPushFirstInstance()V
  writeMethodWords(dex, 0x249718, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]); // MsgHandler.openLoginServer()Z -> true
  writeMethodWords(dex, 0x24eec0, [...Dalvik.returnVoid()]); // MsgHandler.doSocketHeart()V
  writeMethodWords(dex, 0x1e0124, [...Dalvik.returnVoid()]); // AniResourceSave.doGetNewAniResource()V
  writeMethodWords(dex, 0x1dfb14, [...Dalvik.returnVoid()]); // Advertisement.doLoadAd()V
  writeMethodWords(dex, 0x24ef14, [...Dalvik.returnVoid()]); // MsgHandler.doSoftSync()V

  // Speed up Stage 1 logo display in GameCanvas.doGameLogo (0x233010, pc=0x0097: 2000ms -> 150ms)
  dex.writeUInt16LE(150, 0x233010 + 16 + 0x0097 * 2);
  console.log('      Patched startup logo hang & network/emulator/SDK/sync gates.');

  // 3. Remove Account Login UI elements in UIHandler.updateDataToLoginUI(UIHandler)V
  const loginUiWords = [
    ...Dalvik.ifEqz(4, 119),
    ...Dalvik.const4(1, 0),
    ...Dalvik.const4(2, 1),
    ...Dalvik.sputBoolean(2, IDX.fIsAgree),
  ];
  for (const wid of [4, 6, 10]) {
    loginUiWords.push(
      ...Dalvik.const16(0, wid),
      ...Dalvik.invokeVirtual(IDX.mGetWidgetByEvent, [4, 0]),
      ...Dalvik.moveResultObject(0),
      ...Dalvik.ifEqz(0, 14),
      ...Dalvik.invokeVirtual(IDX.mSetShow, [0, 1]),
      ...Dalvik.invokeVirtual(IDX.mGetParent, [0]),
      ...Dalvik.moveResultObject(0),
      ...Dalvik.ifEqz(0, 5),
      ...Dalvik.invokeVirtual(IDX.mSetShow, [0, 1]),
    );
  }
  for (const wid of [1, 2, 3, 7, 11]) {
    loginUiWords.push(
      ...Dalvik.const16(0, wid),
      ...Dalvik.invokeVirtual(IDX.mGetWidgetByEvent, [4, 0]),
      ...Dalvik.moveResultObject(0),
      ...Dalvik.ifEqz(0, 5),
      ...Dalvik.invokeVirtual(IDX.mSetShow, [0, 1]),
    );
  }
  loginUiWords.push(...Dalvik.returnVoid()); // pc=0x79
  loginUiWords[1] = 0x79;
  loginUiWords.push(...Dalvik.returnVoid()); // pc=0x7a
  writeMethodWords(dex, 0x2a25e4, loginUiWords);
  const loginTriesOff = 0x2a25e4 + 16 + 123 * 2 + 2;
  dex.writeUInt32LE(0x0002, loginTriesOff + 0);
  dex.writeUInt16LE(0x0002, loginTriesOff + 4);
  dex.writeUInt32LE(0x0004, loginTriesOff + 8);
  dex.writeUInt16LE(0x0075, loginTriesOff + 12);

  // 4. Patch Login / MainMenu actions -> direct Character Creation (UI 300)
  const processLoginWords = [
    ...Dalvik.const4(0, 1),
    ...Dalvik.ifNe(6, 0, 8),
    ...Dalvik.const16(0, 11247),
    ...Dalvik.invokeStatic(IDX.mDoMenuButton, [0]),
    ...Dalvik.returnVoid(),
    ...Dalvik.const16(0, 31),
    ...Dalvik.ifNe(6, 0, 6),
    ...Dalvik.invokeStatic(IDX.mUpdateLoginUI, [5]),
    ...Dalvik.returnVoid(),
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mDoPlayerListCreate, [0]),
    ...Dalvik.returnVoid(),
  ];
  writeMethodWords(dex, 0x28b5cc, processLoginWords);

  writeMethodWords(dex, 0x28bb10, [
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mDoPlayerListCreate, [0]),
    ...Dalvik.returnVoid(),
  ]);

  writeMethodWords(dex, 0x2468f4, [
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mDoPlayerListCreate, [0]),
    ...Dalvik.returnVoid(),
  ]);

  // 5. Patch UIAction.processCreatePlayerAction(UIHandler, I)V at pc=0x0072
  const createActionPatchOff = 0x288924 + 16 + 0x0072 * 2;
  const createActionWords = [
    ...Dalvik.invokeStatic(IDX.mDoPlayerListEnterGame, [0]),
    ...Dalvik.returnVoid(),
  ];
  for (let i = 0; i < 0x008d - 0x0072; i++) {
    const w = i < createActionWords.length ? createActionWords[i] : 0x0000;
    dex.writeUInt16LE(w, createActionPatchOff + i * 2);
  }

  // 6. Patch UIAction.doPlayerListEnterGame(ListPlayer)V
  const enterGameWords = [
    ...Dalvik.ifNez(3, 7),
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mDoPlayerListCreate, [0]),
    ...Dalvik.returnVoid(),
    ...Dalvik.sputObject(3, IDX.fMyPlayer),
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mDoTourist, [0, 0, 0]),
    ...Dalvik.returnVoid(),
  ];
  writeMethodWords(dex, 0x2835e8, enterGameWords);

  // 7. Patch GameWorld.doTourist(I, I, I)V to initialize full player stats, load assets/map/900.m
  //    ("Cổng Làng", 30x40), and parse assets/android_params.js via MsgHandler.processDataBlockFlagMsg
  dex[0x85eb19] = 0x01;
  dex[0x85eb1b] = 0x01;
  dex[0x85eb1d] = 0x01;
  const doTouristWords = [
    ...Dalvik.sgetObject(0, IDX.fMyPlayer),
    ...Dalvik.ifNez(0, 11),
    ...Dalvik.invokeStatic(IDX.mGetRandomCreatePlayer, []),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.constString(1, IDX.strDefaultName),
    ...Dalvik.invokeVirtual(IDX.mSetName, [0, 1]),
    ...Dalvik.sputObject(0, IDX.fMyPlayer),

    ...Dalvik.const16(1, 10001),
    ...Dalvik.invokeVirtual(IDX.mSetId, [0, 1]),
    ...Dalvik.const16(1, 60),
    ...Dalvik.invokeVirtual(IDX.mSetLevel, [0, 1]),
    ...Dalvik.const16(1, 9999),
    ...Dalvik.iput(1, 0, IDX.fCombatPoint),
    ...Dalvik.const16(1, 100),
    ...Dalvik.iputShort(1, 0, IDX.fCp),
    ...Dalvik.const16(1, 150),
    ...Dalvik.iputShort(1, 0, IDX.fStr),
    ...Dalvik.iputShort(1, 0, IDX.fCon),
    ...Dalvik.iputShort(1, 0, IDX.fAgi),
    ...Dalvik.iputShort(1, 0, IDX.fIlt),
    ...Dalvik.iputShort(1, 0, IDX.fWis),
    ...Dalvik.const16(1, 9),
    ...Dalvik.iputByte(1, 0, IDX.fVip1),
    ...Dalvik.iputByte(1, 0, IDX.fVip2),
    ...Dalvik.iputByte(1, 0, IDX.fVip3),
    ...Dalvik.const16(1, 42),
    ...Dalvik.iputByte(1, 0, IDX.fNumBag),
    ...Dalvik.iputByte(1, 0, IDX.fNumStroe),
    ...Dalvik.newInstance(1, IDX.typePlayerBag),
    ...Dalvik.invokeDirect(IDX.mPlayerBagInit, [1, 0]),
    ...Dalvik.invokeVirtual(IDX.mSetBag, [0, 1]),
    ...Dalvik.const16(1, 10),
    ...Dalvik.newArray(1, 1, IDX.typeShortArray),
    ...Dalvik.iputObject(1, 0, IDX.fAutoSkillID),

    // Load map texture pack IDs (1.pn) and PNG data (1.pd), then load assets/map/900.m ("Cổng Làng")
    ...Dalvik.invokeStatic(IDX.mLoadAllIDList, []),
    ...Dalvik.constString(1, IDX.strMapDir),
    ...Dalvik.const4(2, 1),
    ...Dalvik.invokeStatic(IDX.mLoadPackageData, [1, 2]),
    ...Dalvik.moveResultObject(1),
    ...Dalvik.sputObject(1, IDX.fPackImgData),

    ...Dalvik.const16(1, 900),
    ...Dalvik.const4(2, 0),
    ...Dalvik.invokeStatic(IDX.mLoadLocalMap, [1, 2]),
    ...Dalvik.moveResultObject(1),
    ...Dalvik.sputObject(1, IDX.fGameMap),

    // Parse offline world data block (Missions, Items/Pet, 15 Skills, Cổng Làng NPCs, 84 Sprites, Monsters, 234 Map Images):
    ...Dalvik.constString(2, IDX.strOfflinePacket),
    ...Dalvik.invokeStatic(IDX.mGetFileByte, [2]),
    ...Dalvik.moveResultObject(2),
    ...Dalvik.const4(3, 0),
    ...Dalvik.newInstance(4, IDX.typeMessage),
    ...Dalvik.invokeDirect(IDX.mMessageInit, [4, 3, 2]),
    ...Dalvik.invokeStatic(IDX.mProcessDataBlockFlag, [4]),

    // Initialize map palette & tile buffer AFTER processDataBlockFlagMsg populates ResourceHandler.mapImage & player pos
    ...Dalvik.invokeVirtual(IDX.mMapInit, [1]),

    // Fill HP/MP/EXP & currencies after equipment max-HP bonuses are applied
    0x0115, 0x0002, // const/high16 v1, 0x00020000 (131072 -> 100% full HP/MP bar)
    ...Dalvik.iput(1, 0, IDX.fHp),
    ...Dalvik.iput(1, 0, IDX.fHpDisplay),
    ...Dalvik.iput(1, 0, IDX.fMp),
    ...Dalvik.iput(1, 0, IDX.fMpDisplay),
    ...Dalvik.const16(1, 30000),
    ...Dalvik.iput(1, 0, IDX.fExpMax),
    ...Dalvik.iput(1, 0, IDX.fSp),
    ...Dalvik.iput(1, 0, IDX.fMoney1),
    ...Dalvik.iput(1, 0, IDX.fMoney2),
    ...Dalvik.iput(1, 0, IDX.fMoney3),
    ...Dalvik.const16(1, 15000),
    ...Dalvik.iput(1, 0, IDX.fExp),

    ...Dalvik.invokeVirtual(IDX.mRefreshWorldSprite, [0]),
    ...Dalvik.const16(1, 20),
    ...Dalvik.invokeStatic(IDX.mChangeStage, [1]),
    ...Dalvik.returnVoid(),
  ];
  writeMethodWords(dex, 0x247c58, doTouristWords);
  console.log(`      Patched GameWorld.doTourist (${doTouristWords.length}/162 words) starting at Map 900 (Cổng Làng).`);

  // 8. Patch PlayerInfoUIAction.doSureAddValue (codeOff=0x27a4b0, pc=0x0017)
  const addValPatchOff = 0x27a4b0 + 16 + 0x0017 * 2;
  const addValWords = Dalvik.goto8(0x002c - 0x0017);
  for (let i = 0; i < 0x0029 - 0x0017; i++) {
    dex.writeUInt16LE(i < addValWords.length ? addValWords[i] : 0x0000, addValPatchOff + i * 2);
  }

  // 9. Fix Character Info (`N.vật`) -> `Skill` Tab (`Talent.CheakIsTalentSkill` NPE fix + offline Auto/Initiative toggling):
  writeMethodWords(dex, 0x222070, [...Dalvik.const4(0, 0), ...Dalvik.returnVal(0)]);
  for (let pc = 0x001d; pc <= 0x002a; pc++) {
    dex.writeUInt16LE(0x0000, 0x21e680 + 16 + pc * 2);
  }
  for (let pc = 0x0022; pc <= 0x002f; pc++) {
    dex.writeUInt16LE(0x0000, 0x21e6fc + 16 + pc * 2);
  }
  for (let pc = 0x0014; pc <= 0x001e; pc++) {
    dex.writeUInt16LE(0x0000, 0x21e790 + 16 + pc * 2);
  }
  console.log('      Patched Talent.CheakIsTalentSkill & Skill initiative/auto toggling for N.vật -> Skill tab.');

  // 10. Patch Equipment, Skill Weapon Check, NPC Dialogue, and Local Battle Reward:
  writeMethodWords(dex, 0x21f1a4, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]); // Skill.isValidSkillWeapon -> true
  dex.writeUInt16LE(0x0000, 0x23cb60 + 16 + 0x0052 * 2); // GameWorld.doEquipAction
  dex.writeUInt16LE(0x0000, 0x23cb60 + 16 + 0x0053 * 2);
  dex.writeUInt16LE(0x0000, 0x23f2dc + 16 + 0x002f * 2); // GameWorld.doUnEquipAction
  dex.writeUInt16LE(0x0000, 0x23f2dc + 16 + 0x0030 * 2);
  for (let pc = 0x006f; pc <= 0x0074; pc++) {
    dex.writeUInt16LE(0x0000, 0x23ca14 + 16 + pc * 2); // GameWorld.doDelEquipAction
  }
  writeMethodWords(dex, 0x1c7b48, [...Dalvik.returnVoid()]); // NPC.doGetCountryBuildingNPC
  writeMethodWords(dex, 0x1c7bd0, [...Dalvik.returnVoid()]); // NPC.doGetMissionData
  writeMethodWords(dex, 0x1d1148, [...Dalvik.returnVoid()]); // BattleAniEngine.sendLocalBattleReward

  // 11. Patch Sprite & Custom Map Tile/Palette Loading:
  //     - In MsgHandler.processDataBlockFlagMsg (0x252324, pc=0xf9..0xfb): replace FragmentData.doMapSpriteRequest(v4, v5)
  //       with FragmentData.fromNormalData(v13) so Bit 0x400 loads both NPC GZIP and Sprite GZIP directly!
  const sprCallWords = Dalvik.invokeStatic(IDX.mFromNormalData, [13]);
  for (let i = 0; i < 3; i++) {
    dex.writeUInt16LE(sprCallWords[i], 0x252324 + 16 + (0xf9 + i) * 2);
  }
  writeMethodWords(dex, 0x231c3c, [...Dalvik.returnVoid()]); // FragmentData.checkCache -> no-op
  writeMethodWords(dex, 0x231ee0, [...Dalvik.returnVoid()]); // FragmentData.doSpriteRequest -> no-op

  //     - In MsgHandler.processDataMapImageMsg (0x252750, regs=10, ins=1, outs=3, tries=0, sz=111, p0=v9):
  //       Replace pc=0x00..0x4a (75 words) with move-object v0, v9 + 74 NOPs, and NOP pc=0x6b..0x6d (3 words)
  //       so Bit 0x2000 reads custom map tiles & palettes directly from msg into ResourceHandler.mapImage!
  const moveV0V9 = Dalvik.moveObject(0, 9)[0];
  dex.writeUInt16LE(moveV0V9, 0x252750 + 16);
  for (let pc = 0x01; pc <= 0x4a; pc++) {
    dex.writeUInt16LE(0x0000, 0x252750 + 16 + pc * 2);
  }
  for (let pc = 0x6b; pc <= 0x6d; pc++) {
    dex.writeUInt16LE(0x0000, 0x252750 + 16 + pc * 2);
  }
  writeMethodWords(dex, 0x2567a8, [...Dalvik.returnVoid()]); // ResourceHandler.allClear -> no-op
  writeMethodWords(dex, 0x2567c4, [...Dalvik.returnVoid()]); // ResourceHandler.checkMapCache -> no-op
  console.log('      Patched Bit 0x400 Sprite loader (FragmentData.fromNormalData) & Bit 0x2000 MapImage loader.');

  // 12. Patch Multi-Map Switching in GameWorld.doJumpMap(IIIZ)V (0x246778, regs=6, ins=4, outs=4, tries=0, sz=68)
  const doJumpMapWords = [
    ...Dalvik.invokeStatic(IDX.mCloseAllUI, []),
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mLoadLocalMap, [2, 0]),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.sputObject(0, IDX.fGameMap),

    ...Dalvik.newInstance(1, IDX.typeStringBuilder),
    ...Dalvik.invokeDirect(IDX.mSbInit, [1]),
    ...Dalvik.constString(5, IDX.strMapDir),
    ...Dalvik.invokeVirtual(IDX.mSbAppendStr, [1, 5]),
    ...Dalvik.moveResultObject(1),
    ...Dalvik.invokeVirtual(IDX.mSbAppendInt, [1, 2]),
    ...Dalvik.moveResultObject(1),
    ...Dalvik.constString(5, IDX.strMiniM),
    ...Dalvik.invokeVirtual(IDX.mSbAppendStr, [1, 5]),
    ...Dalvik.moveResultObject(1),
    ...Dalvik.invokeVirtual(IDX.mSbToString, [1]),
    ...Dalvik.moveResultObject(1),

    ...Dalvik.invokeStatic(IDX.mGetFileByte, [1]),
    ...Dalvik.moveResultObject(1),
    ...Dalvik.const4(5, 0),
    ...Dalvik.newInstance(2, IDX.typeMessage),
    ...Dalvik.invokeDirect(IDX.mMessageInit, [2, 5, 1]),
    ...Dalvik.invokeStatic(IDX.mProcessDataBlockFlag, [2]),

    ...Dalvik.ifLez(3, 7),
    ...Dalvik.sgetObject(1, IDX.fMyPlayer),
    ...Dalvik.invokeVirtual(IDX.mSetPosition, [1, 3, 4]),
    ...Dalvik.invokeVirtual(IDX.mMapInit, [0]),
    ...Dalvik.const16(1, 20),
    ...Dalvik.invokeStatic(IDX.mChangeStage, [1]),
    ...Dalvik.returnVoid(),
  ];
  writeMethodWords(dex, 0x246778, doJumpMapWords);

  // 13. Patch Real Graphical WorldMap (Stage 60, 110.ui + 109.ui):
  //     - MsgHandler.createCheckEditionMsg(int id) (0x24ab18, regs=3, ins=1, outs=3, tries=0, sz=40, p0=v2)
  //       loads "/map/" + (id + 1000) + "_mini.m" and returns new Message(0, bytes).
  dex.writeUInt16LE(3, 0x24ab18 + 4); // outs = 3
  const checkEditionWords = [
    ...Dalvik.addIntLit16(2, 2, 1000),
    ...Dalvik.newInstance(0, IDX.typeStringBuilder),
    ...Dalvik.invokeDirect(IDX.mSbInit, [0]),
    ...Dalvik.constString(1, IDX.strMapDir),
    ...Dalvik.invokeVirtual(IDX.mSbAppendStr, [0, 1]),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.invokeVirtual(IDX.mSbAppendInt, [0, 2]),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.constString(1, IDX.strMiniM),
    ...Dalvik.invokeVirtual(IDX.mSbAppendStr, [0, 1]),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.invokeVirtual(IDX.mSbToString, [0]),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.invokeStatic(IDX.mGetFileByte, [0]),
    ...Dalvik.moveResultObject(0),
    ...Dalvik.const4(1, 0),
    ...Dalvik.newInstance(2, IDX.typeMessage),
    ...Dalvik.invokeDirect(IDX.mMessageInit, [2, 1, 0]),
    ...Dalvik.returnObject(2),
  ];
  writeMethodWords(dex, 0x24ab18, checkEditionWords);

  //     - WorldMap.doEnterWorldMap() (0x2588f4): replace pc=0x00..0x11 with createCheckEditionMsg(0),
  //       keeping pc=0x12..0x21 intact (fromWorldMapData + changeStage(60))
  const enterWmWords = [
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mCreateCheckEditionMsg, [0]),
    ...Dalvik.moveResultObject(0),
  ];
  for (let pc = 0x00; pc <= 0x11; pc++) {
    dex.writeUInt16LE(pc < enterWmWords.length ? enterWmWords[pc] : 0x0000, 0x2588f4 + 16 + pc * 2);
  }

  //     - WorldMap.doGetMapList(WorldMap) (0x258948): call createCheckEditionMsg(areaId) and NOP pc=0x0f..0x1c
  dex.writeUInt16LE(IDX.mCreateCheckEditionMsg, 0x258948 + 16 + 0x0c * 2);
  for (let pc = 0x0f; pc <= 0x1c; pc++) {
    dex.writeUInt16LE(0x0000, 0x258948 + 16 + pc * 2);
  }

  //     - WorldMap.doJumpMap(ObjectData) (0x2589a4): read objData.int0 (targetMapId) and call GameWorld.doJumpMap(mapId, 0, 0, false)
  dex.writeUInt16LE(4, 0x2589a4 + 4); // outs = 4
  writeMethodWords(dex, 0x2589a4, [
    ...Dalvik.iget(0, 6, IDX.fObjectDataInt0),
    ...Dalvik.const4(1, 0),
    ...Dalvik.invokeStatic(IDX.mDoJumpMap, [0, 1, 1, 1]),
    ...Dalvik.returnVoid(),
  ]);
  console.log(`      Patched GameWorld.doJumpMap (${doJumpMapWords.length}/68 words) & Real Graphical WorldMap (Stage 60).`);

  // 14. Patch Equipped Pet (`Hỏa Kỳ Lân Thần Thú`, slotPos=1, type=32) & Mission Auto-Path Teleport:
  dex.writeUInt16LE(4, 0x249380); // GameWorld.setPlayerEquipItem regs = 4
  const setEquipPetWords = [
    ...Dalvik.sgetObject(0, IDX.fMyPlayer),
    ...Dalvik.ifEqz(0, 33),
    ...Dalvik.igetObject(1, 0, IDX.fPlayerBag),
    ...Dalvik.ifEqz(1, 29),
    ...Dalvik.const4(2, 1),
    ...Dalvik.invokeVirtual(IDX.mBagGet, [1, 2]),
    ...Dalvik.moveResultObject(2),
    ...Dalvik.ifEqz(2, 22),
    ...Dalvik.invokeStatic(IDX.mCreateItemPet, [2, 0]),
    ...Dalvik.moveResultObject(2),
    ...Dalvik.const16(3, 5000),
    ...Dalvik.iput(3, 2, IDX.fHp),
    ...Dalvik.iput(3, 2, IDX.fHpDisplay),
    ...Dalvik.iput(3, 2, IDX.fMp),
    ...Dalvik.iput(3, 2, IDX.fMpDisplay),
    ...Dalvik.invokeVirtual(IDX.mRefreshWorldSprite, [2]),
    ...Dalvik.invokeVirtual(IDX.mSetPet, [0, 2]),
    ...Dalvik.returnVoid(),
  ];
  writeMethodWords(dex, 0x249380, setEquipPetWords);
  writeMethodWords(dex, 0x1c5534, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]); // MyPet.doPetInfoMsg -> true
  writeMethodWords(dex, 0x1c5634, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]); // MyPet.isAlive -> true
  writeMethodWords(dex, 0x1c5680, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]); // MyPet.isBattleStatus -> true

  // Mission.doDeleteMissionMsg (0x209cbc): NOP out network wait pc=0x11..0x1b
  for (let pc = 0x11; pc <= 0x1b; pc++) {
    dex.writeUInt16LE(0x0000, 0x209cbc + 16 + pc * 2);
  }
  // Mission.doMenuButton (0x209d14, pc=0x08b..0x08c): pass mission.mapId instead of mission.id to doMissionAutoPathMsg
  dex.writeUInt16LE(IDX.fMissionMapId, 0x209d14 + 16 + 0x08c * 2);
  // Mission.doMissionAutoPathMsg(int mapId) (0x209f48): call GameWorld.doJumpMap(mapId, 0, 0, false)
  dex.writeUInt16LE(4, 0x209f48 + 4); // outs = 4
  writeMethodWords(dex, 0x209f48, [
    ...Dalvik.const4(0, 0),
    ...Dalvik.invokeStatic(IDX.mDoJumpMap, [3, 0, 0, 0]),
    ...Dalvik.const4(0, 1),
    ...Dalvik.returnVal(0),
  ]);
  console.log(`      Patched GameWorld.setPlayerEquipItem (${setEquipPetWords.length}/43 words), MyPet UI, & Mission Auto-Path.`);

  // 15. Patch Offline NPC Visibility, Item Shops, Skill Trainer Shops, Equipment Repair & Reborn Point:
  //     - Mission.checkPlayerMissionStatus (0x209b0c): return true so all NPCs and NPC menu choices are visible offline.
  writeMethodWords(dex, 0x209b0c, [...Dalvik.const4(0, 1), ...Dalvik.returnVal(0)]);

  //     - ShopItem.getShopItemList(short shopId) (0x21dda4, p0=v5): load /map/<3000+shopId>_mini.m via createCheckEditionMsg(2000+shopId)
  const getShopItemListWords = [
    ...Dalvik.const4(1, 0), // v1 = null (required by verifier for return-object v1)
    0x0213, 0x012c, // const/16 v2, 300
    0x2535, 0x0004, // if-le v5, v2, +4
    0x0513, 0x00d1, // const/16 v5, 209 (fallback to Weapon Shop 209 if shopId > 300)
    ...Dalvik.addIntLit16(0, 5, 2000),
    ...Dalvik.invokeStatic(IDX.mCreateCheckEditionMsg, [0]),
    ...Dalvik.moveResultObject(0),
  ];
  for (let pc = 0x00; pc <= 0x0f; pc++) {
    dex.writeUInt16LE(
      pc < getShopItemListWords.length ? getShopItemListWords[pc] : 0x0000,
      0x21dda4 + 16 + pc * 2
    );
  }

  //     - ShopItem.doItemShopBuyMsg(Player v16, ShopItem v17, short v18, int v19)Z (0x21bfb0):
  //       clone item, set durability=100, add to player.bag, and alert item name.
  writeMethodWords(dex, 0x21bfb0, [
    0x0008, 0x0010, // move-object/from16 v0, v16 (Player)
    0x0108, 0x0011, // move-object/from16 v1, v17 (ShopItem)
    0x0202, 0x0012, // move/from16 v2, v18 (count)
    ...Dalvik.igetObject(6, 0, 0x0d9c), // v6 = v0.bag
    ...Dalvik.invokeVirtual(0x27d8, [1]), // v1.getCloneShopItem()
    ...Dalvik.moveResultObject(0), // v0 = cloned Item
    ...Dalvik.const16(4, 100),
    ...Dalvik.iputShort(4, 0, 0x170d), // v0.durability = 100
    0x248f, // int-to-short v4, v2
    ...Dalvik.invokeVirtual(0x26ff, [6, 0, 4]), // v6.addItem(v0, v4)
    ...Dalvik.invokeVirtual(0x2803, [1]), // v1.getNameInfo()
    ...Dalvik.moveResultObject(0),
    ...Dalvik.invokeStatic(0x3543, [0]), // UIHandler.alertMessage(v0)
    ...Dalvik.const4(0, 1),
    ...Dalvik.returnVal(0),
  ]);

  //     - GameWorld.getShopSkillList(int teacherId) (0x241c9c, p0=v8): load /map/<4000+teacherId>_mini.m via createCheckEditionMsg(3000+teacherId)
  const getShopSkillListWords = [
    ...Dalvik.const4(1, 0), // v1 = null (required by verifier for return-object v1)
    ...Dalvik.addIntLit16(0, 8, 3000),
    ...Dalvik.invokeStatic(IDX.mCreateCheckEditionMsg, [0]),
    ...Dalvik.moveResultObject(0),
  ];
  for (let pc = 0x00; pc <= 0x13; pc++) {
    dex.writeUInt16LE(
      pc < getShopSkillListWords.length ? getShopSkillListWords[pc] : 0x0000,
      0x241c9c + 16 + pc * 2
    );
  }
  for (let pc = 0x18; pc <= 0x1f; pc++) {
    dex.writeUInt16LE(0x0000, 0x241c9c + 16 + pc * 2); // NOP teacherId mismatch check so shared skill packets work
  }

  //     - Skill.doLearnSkill(UIHandler v10, Player v11, Skill v12)Skill (0x21f470):
  //       learn/upgrade skill on player, update UI, alert skill name, and return skill.
  writeMethodWords(dex, 0x21f470, [
    ...Dalvik.invokeVirtual(0x1f00, [11, 12]), // v11.learnSkill(v12)
    ...Dalvik.invokeVirtual(0x1e81, [11]), // v11.checkHPMP()
    ...Dalvik.invokeStatic(0x370f, []), // UIHandler.updateWorldPlayerInfoUI()
    ...Dalvik.igetObject(0, 12, 0x1b0b), // v0 = v12.name
    ...Dalvik.invokeStatic(0x3543, [0]), // UIHandler.alertMessage(v0)
    ...Dalvik.returnObject(12),
  ]);

  //     - GameWorld.doRepairEquip (0x24793c): NOP network sendWait pc=0x39..0x59 so offline repair completes immediately
  for (let pc = 0x39; pc <= 0x59; pc++) {
    dex.writeUInt16LE(0x0000, 0x24793c + 16 + pc * 2);
  }

  //     - GameWorld.doSpecialShop (0x23e734):
  //       (a) For unsupported shopId >= 10000 (pc=0x20..0x25), return false (v4) instead of true so NPC.doMenuButton falls through to ShopItem.openItemShop
  for (let pc = 0x20; pc <= 0x24; pc++) {
    dex.writeUInt16LE(0x0000, 0x23e734 + 16 + pc * 2);
  }
  dex.writeUInt16LE(0x040f, 0x23e734 + 16 + 0x25 * 2); // return v4 (false)
  //       (b) For 10004 (Cài điểm hồi sinh, pc=0xaf..0xb5), alert confirmation instead of sendWait
  const rebornWords = [
    ...Dalvik.constString(5, 0x8ed2),
    ...Dalvik.invokeStatic(0x3543, [5]),
  ];
  for (let i = 0; i <= 0xb5 - 0xaf; i++) {
    dex.writeUInt16LE(
      i < rebornWords.length ? rebornWords[i] : 0x0000,
      0x23e734 + 16 + (0xaf + i) * 2
    );
  }
  console.log('      Patched Offline NPC Visibility, Item Shops, Skill Trainer Shops, Equipment Repair & Reborn Point.');

  // 16. Recompute DEX SHA-1 signature (bytes 32..end -> written to 12..32)
  const sha1 = crypto.createHash('sha1').update(dex.subarray(32)).digest();
  sha1.copy(dex, 12);

  // 17. Recompute DEX Adler32 checksum (bytes 12..end -> written to 8..12 LE)
  const adler = computeAdler32(dex.subarray(12));
  dex.writeUInt32LE(adler, 8);

  console.log(`      Updated DEX header: SHA-1=${sha1.toString('hex')}, Adler32=0x${adler.toString(16).padStart(8, '0')}`);
  fs.writeFileSync(PATCHED_DEX_PATH, dex);
  return dex;
}

// CRC32 Lookup Table for ZIP packaging
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function derLen(len) {
  if (len < 128) return Buffer.from([len]);
  const bytes = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derSeq(...items) {
  const body = Buffer.concat(items);
  return Buffer.concat([Buffer.from([0x30]), derLen(body.length), body]);
}

function derSet(...items) {
  const body = Buffer.concat(items);
  return Buffer.concat([Buffer.from([0x31]), derLen(body.length), body]);
}

function derTag(tag, body) {
  return Buffer.concat([Buffer.from([tag]), derLen(body.length), body]);
}

function derInt(numOrBuf) {
  let buf = Buffer.isBuffer(numOrBuf) ? numOrBuf : Buffer.from([numOrBuf]);
  while (buf.length > 1 && buf[0] === 0 && (buf[1] & 0x80) === 0) buf = buf.subarray(1);
  if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0x00]), buf]);
  return Buffer.concat([Buffer.from([0x02]), derLen(buf.length), buf]);
}

function derOctetString(buf) {
  return Buffer.concat([Buffer.from([0x04]), derLen(buf.length), buf]);
}

function derOid(oidBytes) {
  const body = Buffer.from(oidBytes);
  return Buffer.concat([Buffer.from([0x06]), derLen(body.length), body]);
}

function derUtf8String(str) {
  const body = Buffer.from(str, 'utf8');
  return Buffer.concat([Buffer.from([0x0c]), derLen(body.length), body]);
}

function derUtcTime(str) {
  const body = Buffer.from(str, 'ascii');
  return Buffer.concat([Buffer.from([0x17]), derLen(body.length), body]);
}

function createSignerContext() {
  const keyPath = path.join(OUT_DIR, 'build', 'signing-key.json');
  let privateKey, publicKey;
  if (fs.existsSync(keyPath)) {
    const saved = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    privateKey = crypto.createPrivateKey(saved.privateKeyPem);
    publicKey = crypto.createPublicKey(saved.publicKeyPem);
  } else {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 0x10001,
    });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    fs.writeFileSync(
      keyPath,
      JSON.stringify({
        privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
      }, null, 2)
    );
  }
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });

  const algSha256WithRsa = derSeq(
    derOid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b]),
    Buffer.from([0x05, 0x00])
  );
  const algSha256 = derSeq(
    derOid([0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01]),
    Buffer.from([0x05, 0x00])
  );
  const algRsa = derSeq(
    derOid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]),
    Buffer.from([0x05, 0x00])
  );

  const name = derSeq(
    derSet(derSeq(derOid([0x55, 0x04, 0x06]), derUtf8String('84'))),
    derSet(derSeq(derOid([0x55, 0x04, 0x08]), derUtf8String('VietNam'))),
    derSet(derSeq(derOid([0x55, 0x04, 0x07]), derUtf8String('Ho Chi Minh'))),
    derSet(derSeq(derOid([0x55, 0x04, 0x0a]), derUtf8String('PVTK2Offline'))),
    derSet(derSeq(derOid([0x55, 0x04, 0x0b]), derUtf8String('PVTK2Offline'))),
    derSet(derSeq(derOid([0x55, 0x04, 0x03]), derUtf8String('PVTK2Offline')))
  );
  const validity = derSeq(derUtcTime('240101000000Z'), derUtcTime('491231235959Z'));
  const serial = derInt(Buffer.from([0x16, 0x75, 0xcd, 0x5f]));

  const skiHash = crypto.createHash('sha1').update(spkiDer).digest();
  const extSki = derSeq(
    derOid([0x55, 0x1d, 0x0e]),
    derOctetString(derOctetString(skiHash))
  );
  const extensions = derTag(0xa3, derSeq(extSki));

  const tbsCert = derSeq(
    derTag(0xa0, derInt(2)),
    serial,
    algSha256WithRsa,
    name,
    validity,
    name,
    spkiDer,
    extensions
  );

  const certSig = crypto.sign('sha256', tbsCert, privateKey);
  const certBitString = Buffer.concat([
    Buffer.from([0x03]),
    derLen(certSig.length + 1),
    Buffer.from([0x00]),
    certSig,
  ]);
  const x509Cert = derSeq(tbsCert, algSha256WithRsa, certBitString);

  return {
    privateKey,
    publicKey,
    spkiDer,
    x509Cert,
    buildJarV1Signature(sfBytes) {
      const sfSig = crypto.sign('sha256', sfBytes, privateKey);
      const signerInfo = derSeq(
        derInt(1),
        derSeq(name, serial),
        algSha256,
        algRsa,
        derOctetString(sfSig)
      );
      const signedData = derSeq(
        derInt(1),
        derSet(algSha256),
        derSeq(derOid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01])),
        derTag(0xa0, x509Cert),
        derSet(signerInfo)
      );
      return derSeq(
        derOid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]),
        derTag(0xa0, signedData)
      );
    },
    buildApkSigBlockV2(entriesBuf, cdBuf, eocdBuf) {
      const sigBlockStart = entriesBuf.length;
      const eocdForDigest = Buffer.from(eocdBuf);
      eocdForDigest.writeUInt32LE(sigBlockStart, 16);

      const sections = [entriesBuf, cdBuf, eocdForDigest];
      const CHUNK_SIZE = 1024 * 1024;
      const chunkDigests = [];
      let totalChunks = 0;
      for (const sec of sections) {
        for (let pos = 0; pos < sec.length; pos += CHUNK_SIZE) {
          const chunk = sec.subarray(pos, Math.min(pos + CHUNK_SIZE, sec.length));
          const hdr = Buffer.alloc(5);
          hdr[0] = 0xa5;
          hdr.writeUInt32LE(chunk.length, 1);
          chunkDigests.push(crypto.createHash('sha256').update(hdr).update(chunk).digest());
          totalChunks++;
        }
      }
      const topHdr = Buffer.alloc(5);
      topHdr[0] = 0x5a;
      topHdr.writeUInt32LE(totalChunks, 1);
      const topDigest = crypto.createHash('sha256').update(topHdr).update(Buffer.concat(chunkDigests)).digest();

      const u32 = (n) => {
        const b = Buffer.alloc(4);
        b.writeUInt32LE(n >>> 0, 0);
        return b;
      };
      const lenPrefixed = (buf) => Buffer.concat([u32(buf.length), buf]);

      const SIG_ALG_RSA_PKCS1_V1_5_SHA256 = 0x0103;
      const digestEntry = lenPrefixed(Buffer.concat([u32(SIG_ALG_RSA_PKCS1_V1_5_SHA256), lenPrefixed(topDigest)]));
      const digestsSeq = lenPrefixed(digestEntry);
      const certsSeq = lenPrefixed(lenPrefixed(x509Cert));
      const addAttrsSeq = u32(0);

      const signedData = Buffer.concat([digestsSeq, certsSeq, addAttrsSeq]);
      const v2SigBytes = crypto.sign('sha256', signedData, privateKey);
      const sigEntry = lenPrefixed(Buffer.concat([u32(SIG_ALG_RSA_PKCS1_V1_5_SHA256), lenPrefixed(v2SigBytes)]));
      const sigsSeq = lenPrefixed(sigEntry);
      const pubKeySeq = lenPrefixed(spkiDer);

      const signer = lenPrefixed(Buffer.concat([lenPrefixed(signedData), sigsSeq, pubKeySeq]));
      const signersBlock = lenPrefixed(signer);

      const pair1Value = Buffer.concat([u32(0x7109871a), signersBlock]);
      const pair1 = Buffer.alloc(8 + pair1Value.length);
      pair1.writeBigUInt64LE(BigInt(pair1Value.length), 0);
      pair1Value.copy(pair1, 8);

      const baseBlockLen = 8 + pair1.length + 8 + 16;
      let padPair = Buffer.alloc(0);
      const rem = baseBlockLen % 4096;
      if (rem !== 0) {
        let needed = 4096 - rem;
        if (needed < 12) needed += 4096;
        const padValLen = needed - 8;
        padPair = Buffer.alloc(needed);
        padPair.writeBigUInt64LE(BigInt(padValLen), 0);
        padPair.writeUInt32LE(0x42726577, 8);
      }

      const pairsBuf = Buffer.concat([pair1, padPair]);
      const sizeOfBlock = BigInt(pairsBuf.length + 8 + 16);
      const sigBlock = Buffer.alloc(8 + pairsBuf.length + 8 + 16);
      sigBlock.writeBigUInt64LE(sizeOfBlock, 0);
      pairsBuf.copy(sigBlock, 8);
      sigBlock.writeBigUInt64LE(sizeOfBlock, 8 + pairsBuf.length);
      sigBlock.write('APK Sig Block 42', 8 + pairsBuf.length + 8, 'ascii');
      return { sigBlock, topDigestHex: topDigest.toString('hex') };
    },
  };
}

function replaceAllBuffer(buf, findBuf, replaceBuf) {
  if (findBuf.length !== replaceBuf.length) {
    throw new Error('replaceAllBuffer requires equal-length buffers');
  }
  const out = Buffer.from(buf);
  let idx = 0;
  let count = 0;
  while ((idx = out.indexOf(findBuf, idx)) !== -1) {
    replaceBuf.copy(out, idx);
    idx += findBuf.length;
    count++;
  }
  return { out, count };
}

function patchPackageIdentityForCoexistence(manifestRaw, arscRaw, classes1Raw) {
  const oldPkgUtf16 = Buffer.from('vn.cmn.bokinhvan', 'utf16le');
  const newPkgUtf16 = Buffer.from('vn.cmn.bokinhvao', 'utf16le');
  const oldPkgUtf8 = Buffer.from('vn.cmn.bokinhvan', 'utf8');
  const newPkgUtf8 = Buffer.from('vn.cmn.bokinhvao', 'utf8');

  const mRes = replaceAllBuffer(manifestRaw, oldPkgUtf16, newPkgUtf16);
  const aRes = replaceAllBuffer(arscRaw, oldPkgUtf16, newPkgUtf16);
  const cRes = replaceAllBuffer(classes1Raw, oldPkgUtf8, newPkgUtf8);

  const cSha1 = crypto.createHash('sha1').update(cRes.out.subarray(32)).digest();
  cSha1.copy(cRes.out, 12);
  const cAdler = computeAdler32(cRes.out.subarray(12));
  cRes.out.writeUInt32LE(cAdler, 8);

  console.log(
    `      Updated package & provider authorities ("vn.cmn.bokinhvan" -> "vn.cmn.bokinhvao"): ` +
      `AndroidManifest.xml=${mRes.count}, resources.arsc=${aRes.count}, classes.dex=${cRes.count}`
  );
  return {
    patchedManifest: mRes.out,
    patchedArsc: aRes.out,
    patchedClasses1: cRes.out,
  };
}

function updateManifestAndSignatureFile(origMfStr, origSfStr, modifiedMap) {
  let mfStr = origMfStr;
  let sfStr = origSfStr;

  for (const [rel, data] of Object.entries(modifiedMap)) {
    const mfDigest = crypto.createHash('sha256').update(data).digest('base64');
    const newStanza = `Name: ${rel}\r\nSHA-256-Digest: ${mfDigest}\r\n\r\n`;
    const stanzaRegex = new RegExp(
      `Name: ${rel.replace(/\./g, '\\.')}\\r\\nSHA-256-Digest: [A-Za-z0-9+/=]+\\r\\n\\r\\n`
    );
    if (stanzaRegex.test(mfStr)) {
      mfStr = mfStr.replace(stanzaRegex, newStanza);
    } else {
      mfStr = mfStr.replace(/(\r\n)*$/, '\r\n\r\n') + newStanza;
    }

    const sfDigest = crypto.createHash('sha256').update(Buffer.from(newStanza, 'utf8')).digest('base64');
    const newSfStanza = `Name: ${rel}\r\nSHA-256-Digest: ${sfDigest}\r\n\r\n`;
    if (stanzaRegex.test(sfStr)) {
      sfStr = sfStr.replace(stanzaRegex, newSfStanza);
    } else {
      sfStr = sfStr.replace(/(\r\n)*$/, '\r\n\r\n') + newSfStanza;
    }
  }

  const manifestBytes = Buffer.from(mfStr, 'utf8');
  const fullMfDigest = crypto.createHash('sha256').update(manifestBytes).digest('base64');
  sfStr = sfStr.replace(
    /SHA-256-Digest-Manifest: [A-Za-z0-9+/=]+\r\n/,
    `SHA-256-Digest-Manifest: ${fullMfDigest}\r\n`
  );
  const sfBytes = Buffer.from(sfStr, 'utf8');
  return { manifestBytes, sfBytes };
}

function buildApk() {
  console.log(`[0/4] Reading all 9,407 source APK entries from ${SOURCE_APK}...`);
  const sourceZipBuf = fs.readFileSync(SOURCE_APK);
  const rawEntries = readZipEntries(sourceZipBuf);
  const byName = new Map(rawEntries.map((e) => [e.rel, e]));

  const patchedClasses2 = patchClasses2Dex(byName.get('classes2.dex').inflate());
  const { patchedManifest, patchedArsc, patchedClasses1 } = patchPackageIdentityForCoexistence(
    byName.get('AndroidManifest.xml').inflate(),
    byName.get('resources.arsc').inflate(),
    byName.get('classes.dex').inflate()
  );

  const allMaps = buildAllOfflineMaps();
  const allJumpPackets = buildAllMapJumpPackets();
  const worldPacketBytes = buildOfflineWorldPacket();

  const customAssetFiles = [['assets/android_params.js', worldPacketBytes]];
  for (const [mapId, mapBuf] of Object.entries(allMaps)) {
    customAssetFiles.push([`assets/map/${mapId}.m`, mapBuf]);
  }
  for (const [pktId, pktBuf] of Object.entries(allJumpPackets)) {
    customAssetFiles.push([`assets/map/${pktId}_mini.m`, pktBuf]);
  }
  console.log(
    `      Generated ${Object.keys(allMaps).length} offline maps, ${Object.keys(allJumpPackets).length} jump/WorldMap packets, ` +
      `and initial world packet assets/android_params.js (${worldPacketBytes.length} bytes).`
  );

  const tplEntry = byName.get('assets/map/1.pn');
  let maxLfhOff = 0;
  for (const e of rawEntries) {
    if (e.lfhOff > maxLfhOff) maxLfhOff = e.lfhOff;
  }
  const modifiedDict = {
    'AndroidManifest.xml': patchedManifest,
    'classes.dex': patchedClasses1,
    'classes2.dex': patchedClasses2,
    'resources.arsc': patchedArsc,
  };
  const modifiedRawPayloads = new Map([
    ['AndroidManifest.xml', { raw: patchedManifest, method: 8 }],
    ['classes.dex', { raw: patchedClasses1, method: 8 }],
    ['classes2.dex', { raw: patchedClasses2, method: 8 }],
    ['resources.arsc', { raw: patchedArsc, method: 0 }],
  ]);

  for (const [newRel, newBuf] of customAssetFiles) {
    modifiedDict[newRel] = newBuf;
    modifiedRawPayloads.set(newRel, { raw: newBuf, method: 0 });
    if (!byName.has(newRel)) {
      maxLfhOff += 100000;
      const newEntry = {
        cdIndex: rawEntries.length,
        rel: newRel,
        verMade: tplEntry.verMade,
        verExtr: tplEntry.verExtr,
        flags: tplEntry.flags,
        method: 0,
        time: tplEntry.time,
        date: tplEntry.date,
        crc: crc32(newBuf),
        compSize: newBuf.length,
        uncompSize: newBuf.length,
        lfhOff: maxLfhOff,
        compData: newBuf,
        inflate() {
          return Buffer.from(newBuf);
        },
      };
      rawEntries.push(newEntry);
      byName.set(newRel, newEntry);
    }
  }

  console.log('[2/4] Updating META-INF/MANIFEST.MF, CERT.SF, and CERT.RSA (JAR v1 signature)...');
  const signer = createSignerContext();
  const { manifestBytes, sfBytes } = updateManifestAndSignatureFile(
    byName.get('META-INF/MANIFEST.MF').inflate().toString('utf8'),
    byName.get('META-INF/CERT.SF').inflate().toString('utf8'),
    modifiedDict
  );
  const rsaBytes = signer.buildJarV1Signature(sfBytes);

  modifiedRawPayloads.set('META-INF/MANIFEST.MF', { raw: manifestBytes, method: 8 });
  modifiedRawPayloads.set('META-INF/CERT.SF', { raw: sfBytes, method: 8 });
  modifiedRawPayloads.set('META-INF/CERT.RSA', { raw: rsaBytes, method: 8 });

  console.log(`[3/4] Assembling ${rawEntries.length} ZIP entries with 4-byte alignment...`);
  const physicalEntries = [...rawEntries].sort((a, b) => a.lfhOff - b.lfhOff);
  const entryChunks = [];
  let offset = 0;

  for (const entry of physicalEntries) {
    const nameBuf = Buffer.from(entry.rel, 'utf8');
    let method = entry.method;
    let crc = entry.crc;
    let uncompSize = entry.uncompSize;
    let compData = entry.compData;

    const mod = modifiedRawPayloads.get(entry.rel);
    if (mod) {
      method = mod.method;
      uncompSize = mod.raw.length;
      crc = crc32(mod.raw);
      compData = method === 8 ? zlib.deflateRawSync(mod.raw, { level: 6 }) : mod.raw;
    }

    let extraLen = 0;
    if (method === 0) {
      const dataStart = offset + 30 + nameBuf.length;
      extraLen = (4 - (dataStart % 4)) % 4;
    }
    const extraBuf = Buffer.alloc(extraLen);

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(entry.verExtr, 4);
    lfh.writeUInt16LE(entry.flags, 6);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(entry.time, 10);
    lfh.writeUInt16LE(entry.date, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compData.length, 18);
    lfh.writeUInt32LE(uncompSize, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(extraBuf.length, 28);

    entry.newLfhOff = offset;
    entry.newMethod = method;
    entry.newCrc = crc;
    entry.newCompSize = compData.length;
    entry.newUncompSize = uncompSize;
    entry.nameBuf = nameBuf;

    entryChunks.push(lfh, nameBuf);
    if (extraBuf.length > 0) entryChunks.push(extraBuf);
    entryChunks.push(compData);
    offset += 30 + nameBuf.length + extraBuf.length + compData.length;
  }

  const entriesBuf = Buffer.concat(entryChunks);

  const cdChunks = [];
  for (const entry of rawEntries) {
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(entry.verMade, 4);
    cdh.writeUInt16LE(entry.verExtr, 6);
    cdh.writeUInt16LE(entry.flags, 8);
    cdh.writeUInt16LE(entry.newMethod, 10);
    cdh.writeUInt16LE(entry.time, 12);
    cdh.writeUInt16LE(entry.date, 14);
    cdh.writeUInt32LE(entry.newCrc, 16);
    cdh.writeUInt32LE(entry.newCompSize, 20);
    cdh.writeUInt32LE(entry.newUncompSize, 24);
    cdh.writeUInt16LE(entry.nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(entry.newLfhOff, 42);
    cdChunks.push(cdh, entry.nameBuf);
  }
  const cdBuf = Buffer.concat(cdChunks);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(rawEntries.length, 8);
  eocd.writeUInt16LE(rawEntries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(entriesBuf.length, 16);
  eocd.writeUInt16LE(0, 20);

  console.log('[4/4] Generating APK Signature Scheme v2 (APK Sig Block 42, ID 0x7109871a)...');
  const { sigBlock, topDigestHex } = signer.buildApkSigBlockV2(entriesBuf, cdBuf, eocd);
  const finalCdOff = entriesBuf.length + sigBlock.length;
  eocd.writeUInt32LE(finalCdOff, 16);

  const finalApkBuf = Buffer.concat([entriesBuf, sigBlock, cdBuf, eocd]);
  fs.writeFileSync(OUT_APK, finalApkBuf);

  const apkSha256 = crypto.createHash('sha256').update(finalApkBuf).digest('hex');
  console.log(
    `      APK Sig Block 42 size=${sigBlock.length} bytes, v2 Merkle SHA-256=${topDigestHex}`
  );
  console.log(
    `      Built ${OUT_APK} (${(finalApkBuf.length / 1024 / 1024).toFixed(2)} MB, ${rawEntries.length} entries, SHA-256: ${apkSha256})`
  );
}

buildApk();
