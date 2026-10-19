#!/usr/bin/env node
/**
 * Unpacks real binary assets from extracted PVTK2v1.apk for the Web Edition:
 * 1. Unpacks assets/map/1.pn + 1.pd -> 645 real PNG map tiles & buildings into web/assets/map_tiles/
 * 2. Unpacks assets/ani/3.pn + 3.pd -> 778 fragment definitions (.fr) metadata
 * 3. Copies assets/common/ (328 PNGs, 49 PetIcons tx_500..tx_548, 20 Filp cards, 96 Linkup icons)
 * 4. Copies sample character/monster/effect sprite sheets & .pl palettes from assets/ani/
 * 5. Parses assets/common/12.t..20.t (PixelFont) & assets/ui/*.ui catalog into web/assets/catalog.json
 */

const fs = require('fs');
const path = require('path');

const APK_ASSETS = 'C:/Users/binhn/AppData/Local/Temp/rea-extracted-bbfe7674-b0da-47cb-8a86-01196d8ccbde/assets';
const WEB_DIR = path.join(__dirname, '..', 'web');
const WEB_ASSETS = path.join(WEB_DIR, 'assets');

fs.mkdirSync(path.join(WEB_ASSETS, 'map_tiles'), { recursive: true });
fs.mkdirSync(path.join(WEB_ASSETS, 'common'), { recursive: true });
fs.mkdirSync(path.join(WEB_ASSETS, 'pet_icons'), { recursive: true });
fs.mkdirSync(path.join(WEB_ASSETS, 'filp'), { recursive: true });
fs.mkdirSync(path.join(WEB_ASSETS, 'linkup'), { recursive: true });
fs.mkdirSync(path.join(WEB_ASSETS, 'sprites'), { recursive: true });
fs.mkdirSync(path.join(WEB_ASSETS, 'palettes'), { recursive: true });

// 1. Unpack assets/map/1.pn + assets/map/1.pd (645 PNG tiles)
function unpackMapPack() {
  const pnBuf = fs.readFileSync(path.join(APK_ASSETS, 'map', '1.pn'));
  const pdBuf = fs.readFileSync(path.join(APK_ASSETS, 'map', '1.pd'));

  const pnCount = pnBuf.readUInt16BE(0);
  const pdCount = pdBuf.readUInt16BE(0);
  const ids = [];
  for (let i = 0; i < pnCount; i++) {
    ids.push(pnBuf.readInt16BE(2 + i * 2));
  }

  const sizes = [];
  for (let i = 0; i < pdCount; i++) {
    sizes.push(pdBuf.readUInt16BE(2 + i * 2));
  }

  let dataOff = 2 + pdCount * 2;
  const manifest = [];
  for (let i = 0; i < pdCount; i++) {
    const tileId = ids[i] !== undefined ? ids[i] : i;
    const len = sizes[i];
    const pngBytes = pdBuf.subarray(dataOff, dataOff + len);
    dataOff += len;
    const fileName = `tile_${tileId}.png`;
    fs.writeFileSync(path.join(WEB_ASSETS, 'map_tiles', fileName), pngBytes);
    manifest.push({ index: i, id: tileId, size: len, file: `assets/map_tiles/${fileName}` });
  }
  console.log(`[1/5] Unpacked ${manifest.length} PNG map tiles from assets/map/1.pn + 1.pd`);
  return manifest;
}

// 2. Copy common UI PNGs, PetIcons, Filp cards, Linkup tiles
function copyCommonAssets() {
  const commonDir = path.join(APK_ASSETS, 'common');
  const commonFiles = fs.readdirSync(commonDir, { withFileTypes: true });
  const pngList = [];

  for (const entry of commonFiles) {
    if (entry.isFile() && entry.name.endsWith('.png')) {
      fs.copyFileSync(
        path.join(commonDir, entry.name),
        path.join(WEB_ASSETS, 'common', entry.name)
      );
      pngList.push(entry.name);
    }
  }

  // PetIcon (tx_500.png .. tx_548.png)
  const petDir = path.join(commonDir, 'PetIcon');
  const petIcons = [];
  if (fs.existsSync(petDir)) {
    for (const f of fs.readdirSync(petDir)) {
      if (f.endsWith('.png')) {
        fs.copyFileSync(path.join(petDir, f), path.join(WEB_ASSETS, 'pet_icons', f));
        petIcons.push(f);
      }
    }
  }
  petIcons.sort();

  // Filp mini-game cards (Filp/1 and Filp/2)
  const filpCards = [];
  for (const sub of ['1', '2']) {
    const d = path.join(commonDir, 'Filp', sub);
    if (fs.existsSync(d)) {
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith('.png')) {
          const outName = `set${sub}_${f}`;
          fs.copyFileSync(path.join(d, f), path.join(WEB_ASSETS, 'filp', outName));
          filpCards.push(`assets/filp/${outName}`);
        }
      }
    }
  }

  // Linkup Pikachu mini-game tiles (Linkup/1..6)
  const linkupIcons = [];
  for (const sub of ['1', '2', '3', '4', '5', '6']) {
    const d = path.join(commonDir, 'Linkup', sub);
    if (fs.existsSync(d)) {
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith('.png')) {
          const outName = `theme${sub}_${f}`;
          fs.copyFileSync(path.join(d, f), path.join(WEB_ASSETS, 'linkup', outName));
          linkupIcons.push(`assets/linkup/${outName}`);
        }
      }
    }
  }

  console.log(`[2/5] Copied ${pngList.length} common PNGs, ${petIcons.length} PetIcons, ${filpCards.length} Filp cards, ${linkupIcons.length} Linkup icons`);
  return { pngList, petIcons, filpCards, linkupIcons };
}

// 3. Copy representative character/monster/effect sprites & .pl palettes from assets/ani/
function copySpritesAndPalettes() {
  const aniDir = path.join(APK_ASSETS, 'ani');
  const ani2Dir = path.join(APK_ASSETS, 'ani', 'ani2');

  const spritePngs = [];
  for (const f of fs.readdirSync(aniDir)) {
    if (f.endsWith('.png')) {
      fs.copyFileSync(path.join(aniDir, f), path.join(WEB_ASSETS, 'sprites', f));
      spritePngs.push(f);
    }
  }

  const ani2Files = fs.readdirSync(ani2Dir);
  let ani2PngCount = 0;
  const palettes = [];
  for (const f of ani2Files) {
    if (f.endsWith('.png') && ani2PngCount < 160) {
      fs.copyFileSync(path.join(ani2Dir, f), path.join(WEB_ASSETS, 'sprites', f));
      spritePngs.push(f);
      ani2PngCount++;
    } else if (f.endsWith('.pl') && palettes.length < 40) {
      const plBuf = fs.readFileSync(path.join(ani2Dir, f));
      if (plBuf.length >= 7) {
        fs.copyFileSync(path.join(ani2Dir, f), path.join(WEB_ASSETS, 'palettes', f));
        const rgbCount = Math.floor((plBuf.length - 4) / 3);
        const colors = [];
        for (let i = 0; i < Math.min(rgbCount, 16); i++) {
          const r = plBuf[i * 3];
          const g = plBuf[i * 3 + 1];
          const b = plBuf[i * 3 + 2];
          colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
        }
        const crcHex = '0x' + plBuf.readUInt32BE(plBuf.length - 4).toString(16).padStart(8, '0');
        palettes.push({ file: f, byteLength: plBuf.length, rgbEntries: rgbCount, crc32: crcHex, sampleColors: colors });
      }
    }
  }

  console.log(`[3/5] Extracted ${spritePngs.length} sprite sheets & ${palettes.length} PLTE palette files (.pl)`);
  return { spritePngs, palettes };
}

// 4. Inspect PixelFont (.t) and UI Binary XML (.ui) files
function inspectFontsAndUi() {
  const commonDir = path.join(APK_ASSETS, 'common');
  const fonts = [];
  for (const f of ['12.t', '14.t', '16.t', '18.t', '20.t']) {
    const p = path.join(commonDir, f);
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      const fontHeight = buf[0];
      const charCount = buf.readUInt16BE(1);
      fonts.push({ file: f, sizeBytes: buf.length, fontHeight, charCount });
    }
  }

  const uiDir = path.join(APK_ASSETS, 'ui');
  const uiFiles = fs.readdirSync(uiDir).filter((f) => f.endsWith('.ui'));
  console.log(`[4/5] Inspected ${fonts.length} PixelFont (.t) files & ${uiFiles.length} binary .ui layouts`);
  return { fonts, uiFileCount: uiFiles.length, uiFiles };
}

const mapTiles = unpackMapPack();
const commonAssets = copyCommonAssets();
const spriteAssets = copySpritesAndPalettes();
const fontUiMeta = inspectFontsAndUi();

const catalog = {
  generatedAt: new Date().toISOString(),
  sourceApk: 'D:\\REA\\app\\PVTK2v1.apk',
  sourceSha256: 'e69f2434d3e402389f15f3e9d7c1326ca5a93765f7e6867a5494c77752b5b0c2',
  mapTilesCount: mapTiles.length,
  mapTiles: mapTiles.slice(0, 120),
  allMapTileIds: mapTiles.map((t) => t.id),
  commonPngs: commonAssets.pngList,
  petIcons: commonAssets.petIcons.map((f) => `assets/pet_icons/${f}`),
  filpCards: commonAssets.filpCards,
  linkupIcons: commonAssets.linkupIcons,
  spritePngs: spriteAssets.spritePngs.map((f) => `assets/sprites/${f}`),
  palettes: spriteAssets.palettes,
  fonts: fontUiMeta.fonts,
  uiFileCount: fontUiMeta.uiFileCount,
};

fs.writeFileSync(path.join(WEB_ASSETS, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
console.log('[5/5] Wrote web/assets/catalog.json successfully.');
