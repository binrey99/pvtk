const fs = require('fs');

const data = JSON.parse(fs.readFileSync('D:/REA/app/pvtk2-offline/work/all_captured_npcs.json', 'utf8'));

const mapOrder = [
  { id: 900, name: 'Cổng Làng', region: 'Tân Thủ (Cổng Làng)', size: '24x30' },
  { id: 901, name: 'Rừng Phong', region: 'Tân Thủ (Cổng Làng)', size: '30x30' },
  { id: 902, name: 'Khu Vong Giả', region: 'Tân Thủ (Cổng Làng)', size: '30x30' },
  { id: 5,   name: 'Tân Nguyệt Trấn', region: 'Phương Đông - Tân Nguyệt Trấn', size: '30x30' },
  { id: 14,  name: 'Quảng Trường Tân Nguyệt', region: 'Phương Đông - Tân Nguyệt Trấn', size: '36x40' },
  { id: 19,  name: 'Tân Nguyệt Cổ Trấn', region: 'Phương Đông - Tân Nguyệt Trấn', size: '36x40' },
  { id: 4,   name: 'Điện Đón Khách - Thục Sơn', region: 'Phương Đông - Thục Sơn', size: '30x36' },
  { id: 906, name: 'Thành Thái Dương', region: 'Phương Tây - Thành Thái Dương', size: '36x40' },
  { id: 254, name: 'Rừng Cổ Thụ', region: 'Luyện Cấp 20-35 - Rừng Tinh Linh', size: '36x40' },
  { id: 22,  name: 'Chân Núi Nguyệt Nha', region: 'Luyện Cấp 30-40 - Núi Nguyệt Nha', size: '36x40' },
  { id: 920, name: 'Đồng Tuyệt Vọng', region: 'Luyện Cấp 35-45 - Đồng Tuyệt Vọng', size: '40x40' },
  { id: 13,  name: 'Ngoại Ô Tử C.Thành', region: 'Khu Vực Trung Lập - Tử Cấm Thành (Lv 40-50)', size: '36x30' },
  { id: 824, name: 'Tử Cấm Thành', region: 'Khu Vực Trung Lập - Tử Cấm Thành (Lv 40-60)', size: '48x50' },
  { id: 825, name: 'Chân Núi Tử Vân', region: 'Khu Vực Cấp Cao - Núi Tử Vân (Lv 45-55)', size: '40x40' },
  { id: 820, name: 'Sa Mạc Xích Viêm', region: 'Khu Vực Cấp Cao - Sa Mạc Thất Hồn (Lv 50-60)', size: '48x48' },
];

function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').trim();
}

function getNpcTypeLabel(npcType) {
  switch (npcType) {
    case 0: return 'NPC Thường (`type=0`)';
    case 1: return 'Quái Chủ Động (`type=1`)';
    case 2: return 'Quái Bị Động (`type=2`)';
    case 3: return 'Cổng Dịch Chuyển (`type=3`)';
    case 4: return 'Quái Nhiệm Vụ (`type=4`)';
    case 5: return 'NPC Chức Năng (`type=5`)';
    case 9: return 'Sở Giao Dịch (`type=9`)';
    case 10: return 'Thương Khố (`type=10`)';
    case 11: return 'Quán Trọ / Hồi Sinh (`type=11`)';
    case 12: return 'Thợ Rèn / Sửa Đồ (`type=12`)';
    default: return `NPC (\`type=${npcType}\`)`;
  }
}

let totalNpcs = 0;
for (const entry of mapOrder) {
  const arr = data[`map_${entry.id}_2907.bin`] || [];
  totalNpcs += arr.length;
}

let md = `# Danh Mục Toàn Bộ 495 NPC, Lời Thoại & Chức Năng Theo Bản Gốc PVTK2 (\`vn.cmn.bokinhvan\`)\n\n`;
md += `> [!NOTE]\n`;
md += `> Tài liệu này tổng hợp đầy đủ **15 bản đồ chính thức** và **${totalNpcs} NPC / Quái vật / Cổng dịch chuyển** đã được trích xuất gói tin mạng (\`0x2907\`, \`0x290E\`, \`0x2EE4\`, \`0x36B1\`, \`0x291A\`) và giao tiếp trực tiếp trên **LDPlayer Tab 1** (\`vn.cmn.bokinhvan\`), đồng thời đã được đóng gói nguyên bản vào **\`PVTK2v1_Offline.apk\`** (\`vn.cmn.bokinhvao\`) và kiểm chứng trực tiếp trên **LDPlayer Tab 0**.\n\n`;

md += `## 1. Tổng Quan 15 Bản Đồ Chính Thức & Hệ Thống Chức Năng NPC\n\n`;
md += `| STT | Map ID | Tên Bản Đồ | Khu Vực | Kích Thước | Số NPC/Quái | Các Nhóm Chức Năng Chính |\n`;
md += `|---|---|---|---|---|---|---|\n`;

mapOrder.forEach((entry, idx) => {
  const npcs = data[`map_${entry.id}_2907.bin`] || [];
  const funcs = new Set();
  for (const n of npcs) {
    if (n.npcType === 3) funcs.add('Cổng chuyển map');
    else if (n.npcType === 1 || n.npcType === 2 || n.npcType === 4) funcs.add('Quái luyện cấp / Nhiệm vụ');
    else if (n.npcType === 9) funcs.add('Sở Giao Dịch');
    else if (n.npcType === 10) funcs.add('Thương khố');
    else if (n.npcType === 11) funcs.add('Lưu điểm hồi sinh');
    else if (n.npcType === 12) funcs.add('Sửa trang bị');
    if (n.extra?.shops?.length) funcs.add('Shop Vật Phẩm / Vũ Khí / Thuốc');
    if (n.extra?.teachers?.length) funcs.add('Huấn luyện viên Skill');
    if (n.extra?.jumps?.length) funcs.add('NPC Dịch chuyển');
    if (n.mssData?.missions?.length) funcs.add('Nhiệm vụ cốt truyện');
  }
  md += `| ${idx + 1} | \`${entry.id}\` | **${entry.name}** | ${entry.region} | \`${entry.size}\` | **${npcs.length}** | ${Array.from(funcs).join(', ')} |\n`;
});

md += `\n---\n\n## 2. Chi Tiết Chức Năng, Tọa Độ & Lời Thoại Từng NPC Trên 15 Bản Đồ\n\n`;

for (const entry of mapOrder) {
  const npcs = data[`map_${entry.id}_2907.bin`] || [];
  md += `### Bản Đồ \`${entry.id}\`: ${entry.name} (${entry.region})\n\n`;
  md += `- **Kích thước bản đồ**: \`${entry.size}\` — **Tổng số thực thể (NPC / Cổng / Quái)**: \`${npcs.length}\`\n\n`;
  md += `| ID | Tên NPC / Thực Thể | Loại | Tọa Độ \`(gx, gy)\` | Lời Chào (\`welcome\`) & Đối Thoại (\`talkDetail\`) | Chức Năng Giao Tiếp (Nhiệm Vụ / Shop / Học Skill / Dịch Chuyển) |\n`;
  md += `|---|---|---|---|---|---|\n`;

  for (const n of npcs) {
    const typeLabel = getNpcTypeLabel(n.npcType);
    const talks = [];
    if (n.welcome) talks.push(`👋 *"${cleanText(n.welcome)}"*`);
    if (n.talkDetail) talks.push(`💬 *"${cleanText(n.talkDetail)}"*`);
    const talkStr = talks.length > 0 ? talks.join('<br>') : '-';

    const funcs = [];
    if (n.extra) {
      if (n.extra.topic && n.npcType === 3) {
        funcs.push(`🚪 **Cổng chuyển map**: \`${cleanText(n.extra.topic)}\` ➔ tới Map \`${n.extra.jumpMapID}\` tại \`(${n.extra.jumpMapGx}, ${n.extra.jumpMapGy})\``);
      } else if (n.extra.topic) {
        funcs.push(`📌 **Chức năng**: \`${cleanText(n.extra.topic)}\``);
      }
      if (n.extra.jumps && n.extra.jumps.length > 0) {
        const jStr = n.extra.jumps.map(j => `\`${cleanText(j.jumpName || j.name)}\` (Map đích: \`${cleanText(j.destMapName || j.destMap)}\`, Lv ${j.level || 0}, phí ${j.fee || 0})`).join('; ');
        funcs.push(`🚀 **Dịch chuyển (${n.extra.jumps.length})**: ${jStr}`);
      }
      if (n.extra.shops && n.extra.shops.length > 0) {
        const sStr = n.extra.shops.map(s => `\`${cleanText(s.shopName || s.name)}\` (\`shopId=${s.shopId || s.id}\`)`).join(', ');
        funcs.push(`🛒 **Cửa hàng (${n.extra.shops.length})**: ${sStr}`);
      }
      if (n.extra.teachers && n.extra.teachers.length > 0) {
        const tStr = n.extra.teachers.map(t => `\`${cleanText(t.teacherName || t.name)}\` (\`teacherId=${t.teacherId || t.id}\`)`).join(', ');
        funcs.push(`🎓 **Học Kỹ Năng (${n.extra.teachers.length})**: ${tStr}`);
      }
      if (n.extra.battles && n.extra.battles.length > 0) {
        const bStr = n.extra.battles.map(b => `\`${cleanText(b.battleName || b.name)}\` (group=\`${b.monsterGroupId || b.id}\`)`).join(', ');
        funcs.push(`⚔️ **Khiêu chiến (${n.extra.battles.length})**: ${bStr}`);
      }
      if (n.extra.monsterGroupID !== undefined) {
        funcs.push(`👾 **Nhóm quái**: \`monsterGroupID=${n.extra.monsterGroupID}\` (Lv \`${n.extra.level || '?'}\`)`);
      }
    }
    if (n.mssData && n.mssData.missions && n.mssData.missions.length > 0) {
      const mStr = n.mssData.missions.map(m => `\`${cleanText(m.name)}\` (\`missionId=${m.id}\`, Lv ${m.level})`).join('; ');
      funcs.push(`📜 **Nhiệm vụ (${n.mssData.missions.length})**: ${mStr}`);
    }
    if (n.npcType === 11) {
      funcs.push(`🏨 **Lưu điểm hồi sinh**: \`Đặt làm điểm hồi sinh\` (\`doSpecialShop(10)\`)`);
    }
    if (n.npcType === 12) {
      funcs.push(`🔨 **Sửa đồ**: \`Sửa tất cả trang bị\` (\`doRepairEquip\`)`);
    }
    if (n.npcType === 10) {
      funcs.push(`📦 **Thương khố**: Mở kho chứa đồ cá nhân`);
    }

    const funcStr = funcs.length > 0 ? funcs.join('<br>') : (n.npcType === 0 ? '🔹 NPC cảnh quan / đối thoại' : '-');
    md += `| \`${n.id}\` | **${cleanText(n.name)}** | ${typeLabel} | \`(${n.gx}, ${n.gy})\` | ${talkStr} | ${funcStr} |\n`;
  }
  md += `\n`;
}

fs.writeFileSync('C:/Users/binhn/.gemini/antigravity/brain/6652e3e0-be76-4656-a274-c6dc5d7a2bdb/pvtk2_npc_catalog.md', md, 'utf8');
console.log('Generated pvtk2_npc_catalog.md successfully, size=' + md.length + ', totalNpcs=' + totalNpcs);
