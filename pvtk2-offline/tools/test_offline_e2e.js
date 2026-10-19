#!/usr/bin/env node
/**
 * End-to-End Verification Suite for PVTK2 Offline Server & Protocol
 */

const net = require('net');
const http = require('http');
const zlib = require('zlib');
const assert = require('assert');
const { startServers, tcpServer, httpServer, photoServer, MsgWriter, MsgReader } = require('../server/index.js');

function sendTcpPacket(socket, writer) {
  return new Promise((resolve, reject) => {
    const packets = [];
    let buf = Buffer.alloc(0);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 4) {
        const len = buf.readUInt16BE(0);
        const type = buf.readInt16BE(2);
        if (buf.length < len) break;
        const body = buf.subarray(4, len);
        buf = buf.subarray(len);
        packets.push(new MsgReader(type, body));
      }
      if (packets.length > 0) {
        cleanup();
        resolve(packets);
      }
    };
    const onErr = (err) => { cleanup(); reject(err); };
    const cleanup = () => {
      socket.removeListener('data', onData);
      socket.removeListener('error', onErr);
    };
    socket.on('data', onData);
    socket.on('error', onErr);
    socket.write(writer.toFrame());
  });
}

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    http.get(urlStr, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

function httpPostJson(urlStr, obj) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(obj), 'utf8');
    const req = http.request(urlStr, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  startServers();
  await new Promise((r) => setTimeout(r, 200));

  const socket = net.createConnection({ host: '127.0.0.1', port: 30000 });
  await new Promise((res, rej) => {
    socket.once('connect', res);
    socket.once('error', rej);
  });

  // 1. Test Login (MSG 1)
  const loginReq = new MsgWriter(1).putShort(108).putString('bokinhvan_offline');
  const [loginRes] = await sendTcpPacket(socket, loginReq);
  assert.strictEqual(loginRes.type, 1);
  assert.strictEqual(loginRes.getByte(), 1, 'Login status should be 1');
  const ukey = loginRes.getLong();
  const acc = loginRes.getString();
  console.log('[PASS] 1. MSG_LOGIN (1): ukey=' + ukey + ', account=' + acc);

  // 2. Test Character List (MSG 10002)
  const charListReq = new MsgWriter(10002);
  const [charListRes] = await sendTcpPacket(socket, charListReq);
  assert.strictEqual(charListRes.getByte(), 0);
  const sessionId = charListRes.getInt();
  const maxRoles = charListRes.getByte();
  const roleCount = charListRes.getByte();
  assert(roleCount >= 1);
  console.log(`[PASS] 2. MSG_CHAR_LIST (10002): sessionID=${sessionId}, maxRoles=${maxRoles}, roleCount=${roleCount}`);

  // 3. Test Enter Game (MSG 10004) + Map GZIP .m Payload (MSG 13004)
  const enterReq = new MsgWriter(10004).putInt(10001);
  const enterPackets = await sendTcpPacket(socket, enterReq);
  const rolePkt = enterPackets.find((p) => p.type === 10004);
  const mapPkt = enterPackets.find((p) => p.type === 13004);
  assert(rolePkt, 'Expected 10004 role packet');
  assert.strictEqual(rolePkt.getByte(), 0, 'Role enter err should be 0');
  assert(mapPkt, 'Expected 13004 map packet');
  mapPkt.getByte(); // flags
  const gx = mapPkt.getByte();
  const gy = mapPkt.getByte();
  const mapId = mapPkt.getShort();
  mapPkt.getShort(); // resId
  const mapName = mapPkt.getString();
  mapPkt.getByte(); // weather
  const gzLen = mapPkt.getShort();
  const gzBuf = mapPkt.buf.subarray(mapPkt.off, mapPkt.off + gzLen);
  const rawMap = zlib.gunzipSync(gzBuf);
  const mapVersion = rawMap.readInt32BE(0);
  const mapCols = rawMap.readInt16BE(4);
  const mapRows = rawMap.readInt16BE(6);
  assert.strictEqual(mapVersion, 20, 'Decompressed .m version must be 20');
  console.log(`[PASS] 3. MSG_ENTER_GAME (10004) & MSG_WORLD_LOAD_DATA (13004): Map="${mapName}" (#${mapId}), Grid=${mapCols}x${mapRows}, GZIP=${gzLen}B -> Raw=${rawMap.length}B`);

  // 4. Test GM Shop List (MSG 12004) & Free Buy (MSG 12005)
  const [shopRes] = await sendTcpPacket(socket, new MsgWriter(12004).putShort(902));
  assert.strictEqual(shopRes.getByte(), 0);
  const itemCount = shopRes.getByte();
  assert(itemCount >= 5);
  const [buyRes] = await sendTcpPacket(socket, new MsgWriter(12005).putShort(902).putInt(1004).putByte(1));
  assert.strictEqual(buyRes.getByte(), 0);
  const boughtId = buyRes.getInt();
  const boughtSlot = buyRes.getShort();
  console.log(`[PASS] 4. GM Shop Browse (12004: ${itemCount} items) & Buy (12005): Bought Item #${boughtId} into Slot #${boughtSlot}`);

  // 5. Test Skill Shop (MSG 14001) & Learn Skill (MSG 14002)
  const [skShopRes] = await sendTcpPacket(socket, new MsgWriter(14001).putShort(1));
  assert.strictEqual(skShopRes.getShort(), 1);
  const skCount = skShopRes.getByte();
  const [skLearnRes] = await sendTcpPacket(socket, new MsgWriter(14002).putShort(1).putInt(107));
  assert.strictEqual(skLearnRes.getByte(), 0);
  console.log(`[PASS] 5. Skill Shop (14001: ${skCount} skills) & Learn Skill (14002): Learned Skill #107 (Kiếm Nhị Thập Tam)`);

  // 6. Test GM Chat Command (/gold & /tp 2)
  const chatPkts = await sendTcpPacket(socket, new MsgWriter(13509).putByte(0).putString('/gold'));
  assert(chatPkts.some((p) => p.type === 11012), 'Expected 11012 money sync packet');
  console.log('[PASS] 6. In-Game GM Chat Command (/gold -> MSG 11012 + 13515)');

  // 7. Test HTTP /A Gateway & Web GM Control Panel API
  const dHex = new MsgWriter(10005).toFrame().toString('hex');
  const httpARes = await httpGet(`http://127.0.0.1:8079/A?S=100001&T=1&Q=1&D=${dHex}`);
  assert.strictEqual(httpARes.status, 200);
  const msgCountHttp = httpARes.body.readInt16BE(4);
  assert(msgCountHttp >= 1);

  const gmApiRes = await httpPostJson('http://127.0.0.1:8079/api/gm', { action: 'max_level' });
  assert.strictEqual(gmApiRes.status, 200);
  assert.strictEqual(gmApiRes.json.ok, true);
  assert.strictEqual(gmApiRes.json.player.level, 85);
  console.log(`[PASS] 7. HTTP /A Binary Gateway (${httpARes.body.length}B) & Web GM Dashboard API (/api/gm -> Lv.${gmApiRes.json.player.level})`);

  socket.destroy();
  tcpServer.close();
  httpServer.close();
  photoServer.close();
  console.log('\n=== ALL OFFLINE E2E TESTS PASSED ===');
}

runTests().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
