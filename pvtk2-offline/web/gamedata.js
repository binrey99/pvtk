/**
 * Phong Vân Truyền Kỳ 2 (WorldOL v1.3 / vn.cmn.bokinhvan v1.0.8)
 * Complete Authoritative Game Data & Combat Formula Engine
 * Derived 100% from pvtk2_apk_analysis.md (Define, ProtocolDefine, UIDefine, PlayerInfoUIAction)
 */

window.PVTK2_DATA = {
  meta: {
    packageName: 'vn.cmn.bokinhvan',
    displayName: 'Phong Vân Truyền Kỳ 2 (Thế Giới OL v1.3)',
    versionName: '1.0.8',
    versionCode: 108,
    edition: 360075,
    cpId: 120,
    maxNormalLevel: 85,
    maxRoundWaitTime: 30,
    battleMaxPos: 34,
    gridSize: 24,
    hardCapPercent: 70
  },

  // 2 Chủng tộc gốc (Define.raceText)
  races: [
    { id: 0, name: 'Đông Phương', baseJobs: [1, 2], cityMapRange: [1000, 1999], countryMapRange: [3000, 3999], desc: 'Tinh thông võ học cổ truyền, kiếm pháp, đao pháp và ngũ hành đạo thuật.' },
    { id: 1, name: 'Tây Phương', baseJobs: [3, 4], cityMapRange: [2000, 2999], countryMapRange: [4000, 4999], desc: 'Tinh thông trọng giáp, kỵ thuật, súng pháo cơ quan và ma pháp nguyên tố.' }
  ],

  // 12 Hệ phái / Nghề nghiệp (Define.jobText)
  jobs: [
    { id: 0, code: 'JOB_NONE', name: 'Không (Tân Thủ)', group: 'Mặc định', raceId: 0, bonus: { str: 5, sta: 5, agi: 5, int: 5, wis: 5 }, weapons: [1, 4, 13], desc: 'Trạng thái chưa phân nghề.' },
    { id: 1, code: 'JOB_XIASHI', name: 'Hiệp Khách', group: 'Cơ bản — Đông Phương', raceId: 0, bonus: { str: 12, sta: 10, agi: 22, int: 5, wis: 8 }, weapons: [1, 2, 4, 5, 8, 9, 12], desc: 'Thiên về Nhanh Nhẹn (AGI), Tốc độ ra đòn, Đâm (Pierce), Liên kích (Multi-hit) và Chí Mạng.' },
    { id: 2, code: 'JOB_XIUZHEN', name: 'Tu Chân', group: 'Cơ bản — Đông Phương', raceId: 0, bonus: { str: 6, sta: 16, agi: 10, int: 14, wis: 22 }, weapons: [1, 14, 15, 21, 28], desc: 'Thiên về Thể Lực (STA) và Cảm Trí (WIS). Tinh thông Ngũ hành, Phù Chú khống chế và Chúc Phúc trị liệu.' },
    { id: 3, code: 'JOB_ZHANSHI', name: 'Chiến Sĩ', group: 'Cơ bản — Tây Phương', raceId: 1, bonus: { str: 24, sta: 20, agi: 8, int: 4, wis: 6 }, weapons: [2, 3, 5, 6, 7, 8, 20, 25, 26, 27], desc: 'Thiên về Sức Mạnh (STR) và Thể Lực (STA). Sát thương Chém (Slash) cực đại, sinh lực dồi dào, Vòng sáng (Aura).' },
    { id: 4, code: 'JOB_FASHI', name: 'Pháp Sư', group: 'Cơ bản — Tây Phương', raceId: 1, bonus: { str: 4, sta: 10, agi: 8, int: 26, wis: 18 }, weapons: [14, 15, 21, 28], desc: 'Thiên về Trí Lực (INT) và Cảm Trí (WIS). Sát thương Ma Pháp AoE, có Thuẫn Pháp Lực (Mana Shield).' },
    { id: 5, code: 'JOB_XIANZHE', name: 'Hiền Giả', group: 'Hệ phái Chuyển chức', raceId: 0, bonus: { str: 6, sta: 18, agi: 10, int: 16, wis: 26 }, weapons: [14, 15, 21, 28], desc: 'Chuyên sâu hỗ trợ, Chúc phúc, Kháng phép và Thấu Rõ (Động sát).' },
    { id: 6, code: 'JOB_WUSHENG', name: 'Võ Thánh', group: 'Hệ phái Chuyển chức', raceId: 0, bonus: { str: 22, sta: 20, agi: 18, int: 5, wis: 10 }, weapons: [13, 1, 4, 8], desc: 'Bậc thầy cận chiến & Tay không / Quyền sáo, phản kích và bạo kích cao.' },
    { id: 7, code: 'JOB_RUIZHI', name: 'Duệ Trí', group: 'Hệ phái Chuyển chức', raceId: 1, bonus: { str: 4, sta: 12, agi: 10, int: 30, wis: 20 }, weapons: [14, 15, 21, 28], desc: 'Nhánh chuyên sâu Trí Lực & Ma pháp hủy diệt cao cấp.' },
    { id: 8, code: 'JOB_YONGMENG', name: 'Dũng Mãnh', group: 'Hệ phái Chuyển chức', raceId: 1, bonus: { str: 30, sta: 22, agi: 10, int: 4, wis: 6 }, weapons: [3, 6, 7, 20, 27], desc: 'Nhánh chuyên sâu Sức Mạnh & Phá giáp công kích hạng nặng.' },
    { id: 9, code: 'JOB_XUNJIE', name: 'Tấn Tiệp', group: 'Hệ phái Chuyển chức', raceId: 0, bonus: { str: 14, sta: 12, agi: 30, int: 6, wis: 10 }, weapons: [1, 2, 9, 10, 12], desc: 'Nhánh chuyên sâu Tốc độ, Né tránh & Liên kích nhiều đòn.' },
    { id: 10, code: 'JOB_QIANGWANG', name: 'Vua Súng', group: 'Hệ phái Chuyển chức', raceId: 1, bonus: { str: 18, sta: 14, agi: 26, int: 8, wis: 10 }, weapons: [22, 23, 24, 9, 10, 11], desc: 'Chuyên sử dụng Súng nhẹ / Súng 2 tay / Súng hạng nặng (tầm xa & bạo phát).' },
    { id: 11, code: 'JOB_CHUISHI', name: 'Chùy Sư', group: 'Hệ phái Chuyển chức', raceId: 1, bonus: { str: 28, sta: 24, agi: 8, int: 4, wis: 8 }, weapons: [25, 26, 27, 7], desc: 'Chuyên sử dụng Chùy nhẹ / Chùy 2 tay / Chùy nặng (sát thương diện rộng & xuyên giáp).' },
    { id: 12, code: 'JOB_LANYU', name: 'Lam Vũ', group: 'Hệ phái Chuyển chức', raceId: 0, bonus: { str: 16, sta: 14, agi: 24, int: 14, wis: 14 }, weapons: [12, 9, 10, 11, 22, 28], desc: 'Hệ phái đặc biệt kết hợp linh hoạt vũ khí tầm xa và kỹ năng chiến thuật.' }
  ],

  // 30 Phân loại Vũ khí (Define.ITEM_TYPE_*)
  weaponTypes: [
    { id: 1, name: 'Kiếm đơn thủ', hand: 1, range: 'melee', mainAtk: 'pierce' },
    { id: 2, name: 'Kiếm song thủ', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 3, name: 'Kiếm nặng', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 4, name: 'Đao đơn thủ', hand: 1, range: 'melee', mainAtk: 'slash' },
    { id: 5, name: 'Đao song thủ', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 6, name: 'Đao nặng', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 7, name: 'Vũ khí nặng', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 8, name: 'Vũ khí dài', hand: 2, range: 'melee', mainAtk: 'pierce' },
    { id: 9, name: 'Nỏ nhẹ', hand: 1, range: 'ranged', mainAtk: 'pierce' },
    { id: 10, name: 'Nỏ 2 tay', hand: 2, range: 'ranged', mainAtk: 'pierce' },
    { id: 11, name: 'Nỏ hạng nặng', hand: 2, range: 'ranged', mainAtk: 'pierce' },
    { id: 12, name: 'Cung', hand: 2, range: 'ranged', mainAtk: 'pierce' },
    { id: 13, name: 'Tay không / Quyền sáo', hand: 1, range: 'melee', mainAtk: 'slash' },
    { id: 14, name: 'Trượng', hand: 2, range: 'magic', mainAtk: 'magic' },
    { id: 15, name: 'Pháp khí', hand: 1, range: 'magic', mainAtk: 'magic' },
    { id: 16, name: 'Khiên / Vũ khí phụ', hand: 1, range: 'melee', mainAtk: 'def' },
    { id: 17, name: 'Áo choàng / Cánh', hand: 0, range: 'equip', mainAtk: 'all' },
    { id: 18, name: 'Trang sức / Hộ phù', hand: 0, range: 'equip', mainAtk: 'all' },
    { id: 19, name: 'Đoản kiếm / Ám khí', hand: 1, range: 'melee', mainAtk: 'pierce' },
    { id: 20, name: 'Trường thương', hand: 2, range: 'melee', mainAtk: 'pierce' },
    { id: 21, name: 'Pháp cầu', hand: 1, range: 'magic', mainAtk: 'magic' },
    { id: 22, name: 'Súng nhẹ', hand: 1, range: 'ranged', mainAtk: 'pierce' },
    { id: 23, name: 'Súng 2 tay', hand: 2, range: 'ranged', mainAtk: 'pierce' },
    { id: 24, name: 'Súng hạng nặng', hand: 2, range: 'ranged', mainAtk: 'pierce' },
    { id: 25, name: 'Chùy nhẹ', hand: 1, range: 'melee', mainAtk: 'slash' },
    { id: 26, name: 'Chùy 2 tay', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 27, name: 'Chùy nặng', hand: 2, range: 'melee', mainAtk: 'slash' },
    { id: 28, name: 'Quạt', hand: 1, range: 'magic', mainAtk: 'magic' },
    { id: 29, name: 'Cổ cầm / Nhạc khí', hand: 2, range: 'magic', mainAtk: 'magic' },
    { id: 30, name: 'Thần Binh Đặc Biệt', hand: 2, range: 'melee', mainAtk: 'all' }
  ],

  // 18 Vị trí Trang bị trên người (EQUIP_POS_*)
  equipSlots: [
    { key: 'head', id: 1, name: 'Đầu (Nón)' },
    { key: 'shoulder', id: 2, name: 'Vai (Hộ kiên)' },
    { key: 'body', id: 3, name: 'Áo giáp' },
    { key: 'back', id: 4, name: 'Lưng (Áo choàng/Cánh)' },
    { key: 'hand', id: 5, name: 'Tay (Găng)' },
    { key: 'belt', id: 6, name: 'Thắt lưng (Đai)' },
    { key: 'legs', id: 7, name: 'Quần (Hộ thối)' },
    { key: 'feet', id: 8, name: 'Giày (Chiến ngoa)' },
    { key: 'weaponRight', id: 9, name: 'Vũ khí tay phải' },
    { key: 'weaponLeft', id: 10, name: 'Vũ khí tay trái / Khiên' },
    { key: 'ring1', id: 11, name: 'Nhẫn Trái' },
    { key: 'ring2', id: 12, name: 'Nhẫn Phải' },
    { key: 'necklace', id: 13, name: 'Dây chuyền' },
    { key: 'amulet', id: 14, name: 'Hộ phù' },
    { key: 'fashion', id: 15, name: 'Thời trang (Fashion)' },
    { key: 'mount', id: 16, name: 'Thú cưỡi (Mount)' },
    { key: 'pet', id: 17, name: 'Thú cưng (Pet)' },
    { key: 'turnCard', id: 18, name: 'Thẻ Biến Thân (TurnMonster)' }
  ],

  // 6 Phẩm chất Trang bị (GRADE_0..5)
  grades: [
    { id: 0, name: 'Thường (Trắng)', color: '#e2e8f0', mult: 1.0 },
    { id: 1, name: 'Tinh chế (Lục)', color: '#22c55e', mult: 1.25 },
    { id: 2, name: 'Hiếm có (Lam)', color: '#38bdf8', mult: 1.55 },
    { id: 3, name: 'Sử thi (Tím)', color: '#c084fc', mult: 1.95 },
    { id: 4, name: 'Truyền thuyết (Cam)', color: '#fb923c', mult: 2.5 },
    { id: 5, name: 'Thần thoại (Đỏ/Vàng)', color: '#facc15', mult: 3.4 }
  ],

  // 39 Phạm vi Mục tiêu Kỹ năng (Define.SKILL_AREA_*)
  skillAreas: [
    'SINGLE (Đơn mục tiêu)', 'TWO_FRONT_BACK (2 mục tiêu Trước-Sau)', 'TWO_UP_DOWN (2 mục tiêu Trên-Dưới)',
    'THREE_UP_DOWN (3 mục tiêu Trên-Dưới)', 'FOUR_UP_DOWN (4 mục tiêu Trên-Dưới)', 'FIVE_UP_DOWN (5 mục tiêu Trên-Dưới)',
    'CROSS (Hình chữ thập 5 ô)', 'SQUARE (Hình vuông 4 ô)', 'SIX_LINE (Đường thẳng 6 người)',
    'ALL_ENEMY (Toàn bộ phe địch)', 'ALL_ALLY (Toàn bộ phe ta)', 'LOWEST_HP (Mục tiêu HP thấp nhất)',
    'HIGHEST_HP (Mục tiêu HP cao nhất)', 'SELF (Bản thân)', 'OWNER (Chủ nhân)', 'PET_AND_PLAYER (Cả Người và Pet)',
    'FRONT_ROW (Toàn hàng trước)', 'BACK_ROW (Toàn hàng sau)', 'RANDOM_3 (Ngẫu nhiên 3 mục tiêu)'
  ],

  // Kho Vũ khí & Trang bị đầy đủ thuộc tính
  items: [
    { id: 1001, name: 'Tuyệt Thế Hảo Kiếm', slot: 'weaponRight', weaponTypeId: 3, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashAtk: 2850, pierceAtk: 1900, magicAtk: 0, hitCount: 3, crit: 25, armorBreak: 320, str: 160, sta: 120, agi: 110, gems: ['Hồng Bảo Thạch Lv10 (+800 Chém)', 'Kim Tinh Thạch Lv10 (+15% Bạo)'], enchant: '+1200 Lực Chém (Phụ Ma Hoàng Kim)', desc: 'Thần kiếm Bái Kiếm Sơn Trang đúc từ Hắc Hàn Thạch, chí tôn sát phạt.' },
    { id: 1002, name: 'Tuyết Ẩm Cuồng Đao', slot: 'weaponRight', weaponTypeId: 6, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashAtk: 3100, pierceAtk: 1400, magicAtk: 800, hitCount: 2, crit: 30, lifestealHp: 18, str: 180, sta: 150, agi: 90, gems: ['Băng Tinh Thạch Lv10 (+1000 Chém)'], enchant: '+15% Hút HP cận chiến', desc: 'Bảo đao gia truyền Nhiếp Gia đúc từ Bạch Lộ Hàn Thiết.' },
    { id: 1003, name: 'Anh Hùng Kiếm (Vô Danh)', slot: 'weaponRight', weaponTypeId: 1, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 2200, pierceAtk: 3200, magicAtk: 2200, hitCount: 5, crit: 35, ignoreBlock: 30, str: 150, agi: 220, wis: 150, gems: ['Thiên Kiếm Châu Lv10 (+2 Lần tấn công)'], enchant: '+950 Lực Đâm & Bỏ qua đỡ đòn', desc: 'Thần kiếm Vạn Kiếm Quy Tông của Võ Lâm Thần Thoại Vô Danh.' },
    { id: 1004, name: 'Cửu Không Pháp Trượng', slot: 'weaponRight', weaponTypeId: 14, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 400, pierceAtk: 400, magicAtk: 3800, hitCount: 1, magicPen: 450, manaShield: 600, int: 260, wis: 240, gems: ['Phượng Hoàng Châu Lv10 (+1200 Ma Pháp)'], enchant: '+500 Thuẫn Pháp Lực & Xuyên Ma Pháp', desc: 'Pháp trượng hội tụ linh khí Thiên Môn của Đế Thích Thiên.' },
    { id: 1005, name: 'Hỏa Thần Trọng Pháo', slot: 'weaponRight', weaponTypeId: 24, grade: 5, star: 5, advanceStar: 4, identified: true, suitId: 1, slashAtk: 1200, pierceAtk: 3400, magicAtk: 0, hitCount: 4, crit: 40, ignoreCounter: 100, str: 140, agi: 240, gems: ['Phá Giáp Châu Lv10'], enchant: '+100% Bỏ qua phản kích (Tầm xa)', desc: 'Súng hạng nặng của Vua Súng Tây Phương, bắn xuyên mọi lớp giáp.' },
    { id: 1006, name: 'Thiên Tội Trọng Chùy', slot: 'weaponRight', weaponTypeId: 27, grade: 5, star: 5, advanceStar: 4, identified: true, suitId: 1, slashAtk: 3600, pierceAtk: 1200, magicAtk: 0, hitCount: 2, armorBreak: 550, str: 250, sta: 200, gems: ['Cự Lực Bảo Thạch Lv10'], enchant: '+550 Phá Giáp tuyệt đối', desc: 'Trọng chùy bá đạo của Chùy Sư, một đòn chấn vỡ hộ thuẫn đối phương.' },
    { id: 1007, name: 'Ngọc Vũ Tiên Phiến (Quạt)', slot: 'weaponRight', weaponTypeId: 28, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 600, pierceAtk: 1200, magicAtk: 3300, hitCount: 2, talisman: 350, blessing: 400, int: 200, wis: 260, gems: ['Tiên Linh Ngọc Lv10'], enchant: '+400 Phù Chú & Chúc Phúc', desc: 'Bảo phiến của Tu Chân & Hiền Giả, vừa phong ấn vừa trị liệu.' },
    { id: 1008, name: 'Thiên Sương Quyền Sáo', slot: 'weaponRight', weaponTypeId: 13, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashAtk: 2900, pierceAtk: 2600, magicAtk: 1200, hitCount: 4, counter: 35, crit: 30, str: 200, sta: 180, agi: 180, gems: ['Võ Thánh Thạch Lv10'], enchant: '+35% Phản Kích & Liên Kích', desc: 'Quyền sáo hàn băng của Võ Thánh & Tần Sương.' },

    // 18 vị trí Trang bị trên người
    { id: 2001, name: 'Kim Lân Long Mạo (Nón)', slot: 'head', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashDef: 1400, pierceDef: 1400, magicDef: 1400, hp: 12000, sta: 140, critRes: 20, gems: ['Sinh Mệnh Thạch Lv10'], enchant: '+12,000 HP', desc: 'Chiến mạo vảy Kỳ Lân bảo vệ nguyên thần.' },
    { id: 2002, name: 'Thiên Sương Hộ Kiên (Vai)', slot: 'shoulder', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashDef: 1200, pierceDef: 1200, magicDef: 1100, dmgReduce: 15, sta: 120, str: 100, gems: ['Kiên Cố Thạch Lv10'], enchant: '+15% Miễn Sát Thương', desc: 'Hộ kiên hàn băng giảm sát thương trực tiếp.' },
    { id: 2003, name: 'Bất Diệt Kim Thân Giáp (Áo)', slot: 'body', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashDef: 2800, pierceDef: 2800, magicDef: 2500, hp: 25000, shieldHp: 15000, block: 25, dmgReduce: 20, sta: 220, gems: ['Kim Cang Thạch Lv10'], enchant: '+15,000 Hộ Thuẫn Miễn Thương', desc: 'Chiến giáp Kim Cang Bất Hoại của Tuyệt Vô Thần.' },
    { id: 2004, name: 'Cánh Hỏa Phượng Hoàng (Lưng)', slot: 'back', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 1500, pierceAtk: 1500, magicAtk: 1500, speed: 350, dodge: 180, agi: 180, wis: 150, gems: ['Thần Dực Châu Lv10'], enchant: '+350 Tốc Độ & Hồi Sinh Phượng Hoàng', desc: 'Đôi cánh Phượng Hoàng Bất Tử rực lửa.' },
    { id: 2005, name: 'Bài Vân Hộ Uyển (Tay)', slot: 'hand', grade: 5, star: 5, advanceStar: 4, identified: true, suitId: 1, slashAtk: 900, pierceAtk: 900, hit: 260, hitCount: 1, str: 140, agi: 120, gems: ['Chuẩn Xác Thạch Lv10'], enchant: '+1 Lần tấn công', desc: 'Hộ uyển gia tăng uy lực chưởng pháp.' },
    { id: 2006, name: 'Long Mạch Yêu Đai (Đai)', slot: 'belt', grade: 5, star: 5, advanceStar: 4, identified: true, suitId: 1, hp: 15000, mp: 8000, slashDef: 1000, pierceDef: 1000, sta: 160, wis: 120, gems: ['Long Mạch Châu Lv10'], enchant: '+15,000 HP & +8,000 MP', desc: 'Yêu đai kết tinh linh khí Long Mạch Trung Nguyên.' },
    { id: 2007, name: 'Kỳ Lân Chiến Quần (Quần)', slot: 'legs', grade: 5, star: 5, advanceStar: 4, identified: true, suitId: 1, slashDef: 1600, pierceDef: 1600, magicDef: 1500, hp: 14000, sta: 150, agi: 110, gems: ['Thủ Hộ Thạch Lv10'], enchant: '+1,600 Phòng Thủ Toàn Diện', desc: 'Hộ thối vảy Kỳ Lân chống đâm xuyên.' },
    { id: 2008, name: 'Phong Thần Chiến Ngoa (Giày)', slot: 'feet', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, speed: 420, dodge: 280, agi: 220, slashDef: 950, gems: ['Thần Tốc Thạch Lv10'], enchant: '+420 Tốc Độ Ra Đòn', desc: 'Chiến ngoa Phong Thần Cước nhanh như cuồng phong.' },
    { id: 2009, name: 'Long Quy Huyền Thuẫn (Khiên Trái)', slot: 'weaponLeft', weaponTypeId: 16, grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 1, slashDef: 2200, pierceDef: 2200, magicDef: 2200, block: 35, counter: 20, magicReflect: 20, shieldHp: 12000, sta: 180, gems: ['Huyền Vũ Thạch Lv10'], enchant: '+35% Đỡ Đòn & +20% Phản Ma', desc: 'Khiên mai Long Quy ngàn năm, đỡ đòn và phản ma.' },
    { id: 2010, name: 'Thiên Môn Long Giới (Nhẫn Trái)', slot: 'ring1', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 1100, pierceAtk: 1100, magicAtk: 1100, crit: 18, str: 120, int: 120, gems: ['Chí Mạng Thạch Lv10'], enchant: '+18% Chí Mạng', desc: 'Long giới chí tôn của Thiên Môn.' },
    { id: 2011, name: 'Đế Thích Thánh Giới (Nhẫn Phải)', slot: 'ring2', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 1100, pierceAtk: 1100, magicAtk: 1100, insight: 25, manaShield: 400, agi: 120, wis: 150, gems: ['Động Sát Thạch Lv10'], enchant: '+25% Thấu Rõ (Động Sát)', desc: 'Thánh giới nhìn thấu mọi ma pháp đối phương.' },
    { id: 2012, name: 'Băng Phách Thần Châu (Dây Chuyền)', slot: 'necklace', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, hp: 16000, mp: 12000, magicDef: 1800, statusRes: 35, wis: 160, sta: 140, gems: ['Băng Phách Ngọc Lv10'], enchant: '+35% Kháng Trạng Thái', desc: 'Bảo châu giữ thân bất lão, miễn nhiễm bùa chú.' },
    { id: 2013, name: 'Long Nguyên Hộ Phù (Hộ Phù)', slot: 'amulet', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 1400, pierceAtk: 1400, magicAtk: 1400, dmgReduce: 18, lifestealHp: 12, lifestealMp: 12, str: 130, sta: 130, agi: 130, int: 130, wis: 130, gems: ['Chân Nguyên Thạch Lv10'], enchant: '+130 Ngũ Hành Thuộc Tính', desc: 'Mảnh Chân Nguyên Rồng Thần hộ mệnh.' },
    { id: 2014, name: 'Chiến Bào Bá Chúa Thiên Hạ (Thời Trang)', slot: 'fashion', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, hp: 20000, mp: 10000, speed: 200, slashAtk: 1000, pierceAtk: 1000, magicAtk: 1000, gems: [], enchant: 'Hào Quang Hoàng Kim', desc: 'Thời trang Chí Tôn Phong Vân Truyền Kỳ 2.' },
    { id: 2015, name: 'Hỏa Kỳ Lân Tọa Kỵ (Thú Cưỡi)', slot: 'mount', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, hp: 30000, speed: 500, slashAtk: 1800, pierceAtk: 1800, magicAtk: 1800, dmgReduce: 15, gems: [], enchant: '+500 Tốc Độ Di Chuyển & Chiến Đấu', desc: 'Thần thú Hỏa Kỳ Lân Lăng Vân Động.' },
    { id: 2016, name: 'Thẻ Biến Thân: Ma Thần Đoạn Lãng', slot: 'turnCard', grade: 5, star: 5, advanceStar: 5, identified: true, suitId: 2, slashAtk: 2500, pierceAtk: 2500, magicAtk: 2500, crit: 25, shieldHp: 20000, gems: [], enchant: 'Hóa Hình Song Long Nguyên', desc: 'Thẻ biến thân quái vật/Boss (TurnMonster Card) biến hình và cộng siêu chỉ số.' }
  ],

  // Kỹ năng Chủ động / Tự động / Bị động / Trận pháp & Cây Thiên Phú 3 nhánh
  skills: [
    { id: 101, name: 'Vạn Kiếm Quy Tông', kind: 'Chủ động / Tự động', jobReq: 1, mpCost: 180, spCost: 50, area: 'ALL_ENEMY (Toàn bộ phe địch)', atkType: 'pierce', powerPct: 280, bonusHits: 3, desc: 'Cảnh giới tối cao của Kiếm Đạo Vô Danh: vạn kiếm hóa khí xuyên thủng toàn bộ đội hình địch.' },
    { id: 102, name: 'Bài Vân Chưởng', kind: 'Chủ động / Tự động', jobReq: 3, mpCost: 140, spCost: 35, area: 'CROSS (Hình chữ thập 5 ô)', atkType: 'slash', powerPct: 320, bonusHits: 1, desc: 'Tuyệt kỹ của Bộ Kinh Vân gây sát thương Chém cực đại và phá giáp mục tiêu.' },
    { id: 103, name: 'Phong Thần Cước', kind: 'Chủ động / Tự động', jobReq: 9, mpCost: 130, spCost: 35, area: 'THREE_UP_DOWN (3 mục tiêu Trên-Dưới)', atkType: 'pierce', powerPct: 260, bonusHits: 4, desc: 'Tuyệt kỹ cước pháp của Nhiếp Phong: Bão Vũ Cuồng Phong liên kích 4 đòn liên tiếp.' },
    { id: 104, name: 'Kiếm Nhị Thập Tam', kind: 'Chủ động / Tự động', jobReq: 4, mpCost: 250, spCost: 60, area: 'ALL_ENEMY (Toàn bộ phe địch)', atkType: 'magic', powerPct: 360, bonusHits: 1, desc: 'Kiếm pháp vượt ngoài tam giới của Kiếm Thánh, ngưng đọng không gian gây sát thương Ma Pháp toàn màn hình.' },
    { id: 105, name: 'Tam Nguyên Quy Nhất (Hùng Bá)', kind: 'Chủ động', jobReq: 6, mpCost: 220, spCost: 50, area: 'SIX_LINE (Đường thẳng 6 người)', atkType: 'slash', powerPct: 340, bonusHits: 2, desc: 'Dung hợp Phong Thần Cước, Bài Vân Chưởng, Thiên Sương Quyền thành một đòn hủy diệt.' },
    { id: 106, name: 'Thánh Tâm Tứ Tuyệt (Phù Chú)', kind: 'Chủ động / Khống chế', jobReq: 2, mpCost: 160, spCost: 40, area: 'SQUARE (Hình vuông 4 ô)', atkType: 'magic', powerPct: 240, bonusHits: 1, desc: 'Phù chú băng phong của Đế Thích Thiên đóng băng và giảm 30% phòng thủ mục tiêu.' },
    { id: 107, name: 'Phượng Vũ Cửu Thiên (Chúc Phúc)', kind: 'Chủ động / Trị liệu', jobReq: 5, mpCost: 200, spCost: 40, area: 'ALL_ALLY (Toàn bộ phe ta)', atkType: 'heal', powerPct: 300, bonusHits: 1, desc: 'Triệu hồi thánh quang Phượng Hoàng hồi phục lượng lớn HP và tạo Hộ Thuẫn Miễn Thương cho toàn đội.' },
    { id: 108, name: 'Bất Diệt Kim Thân (Bị Động)', kind: 'Bị động', jobReq: 0, mpCost: 0, spCost: 30, area: 'SELF (Bản thân)', atkType: 'passive', powerPct: 0, bonusHits: 0, desc: 'Vĩnh viễn tăng +25% HP tối đa, +15% Đỡ Đòn và +15% Miễn Sát Thương.' },
    { id: 109, name: 'Thiên Môn Thần Trận (Trận Pháp)', kind: 'Trận pháp (SKILL_TYPE_FORMATION)', jobReq: 0, mpCost: 0, spCost: 45, area: 'ALL_ALLY (Toàn bộ phe ta)', atkType: 'formation', powerPct: 0, bonusHits: 0, desc: 'Khi làm Đội trưởng: Toàn đội +20% Lực Chém/Đâm/Ma Pháp, +15% Tốc độ và +10% Thấu Rõ.' }
  ],

  // Cây Thiên Phú 3 nhánh (Công kích, Phòng thủ, Thông dụng)
  talentTrees: {
    offense: [
      { id: 't_off_1', name: 'Cuồng Bạo Chém Đâm', level: 10, maxLevel: 10, desc: '+15% Lực Chém & Lực Đâm cơ bản.' },
      { id: 't_off_2', name: 'Liên Kích Tinh Thông', level: 10, maxLevel: 10, desc: '+2 Số lần tấn công (Hit Count) và +20% Bỏ qua đỡ đòn.' },
      { id: 't_off_3', name: 'Thần Pháp Hủy Diệt', level: 10, maxLevel: 10, desc: '+20% Lực Ma Pháp và +300 Xuyên Ma Pháp.' }
    ],
    defense: [
      { id: 't_def_1', name: 'Kim Cang Hộ Thể', level: 10, maxLevel: 10, desc: '+20% Phòng thủ Chém/Đâm/Ma Pháp & +15% Miễn Sát Thương.' },
      { id: 't_def_2', name: 'Động Sát Huyền Cơ', level: 10, maxLevel: 10, desc: '+20% Thấu Rõ (vô hiệu hóa phép đối phương & đốt MP).' },
      { id: 't_def_3', name: 'Phản Chấn Càn Khôn', level: 10, maxLevel: 10, desc: '+20% Tỷ lệ Đỡ Đòn, Phản Kích và Phản Ma.' }
    ],
    utility: [
      { id: 't_uti_1', name: 'Linh Khí Thuẫn Pháp', level: 10, maxLevel: 10, desc: '+500 Thuẫn Pháp Lực (Mana Shield) và +15% Hút HP/MP.' },
      { id: 't_uti_2', name: 'Thần Hành Bách Biến', level: 10, maxLevel: 10, desc: '+300 Tốc độ ra đòn và +25% Né tránh.' },
      { id: 't_uti_3', name: 'Thiên Mệnh Thần Kì', level: 10, maxLevel: 10, desc: '+50% tốc độ tích lũy EXP Thần Kì & +30% Tỷ lệ rơi thần khí.' }
    ]
  },

  // 8 Phân vùng Dải ID Bản Đồ (Define.MAP_*)
  mapZones: [
    {
      id: 1,
      rangeLabel: '1 – 999 (MAP_COMMON)',
      name: 'Phong Vân Tân Thủ Thôn',
      category: 'Thế giới chung',
      weather: 'Hoa đào rơi (flow.png)',
      cols: 24,
      rows: 16,
      groundTileId: 0,
      pathTileId: 1,
      spawn: { gx: 6, gy: 8 },
      npcs: [
        { id: 1, name: 'GM Tiên Tử (Menu Offline)', role: 'PowerNPC (npcType=5)', gx: 10, gy: 6, sprite: 'assets/pet_icons/tx_546.png', dialog: 'Chào mừng Đại Hiệp! Tại đây ngươi có thể nhận Vàng/KNB vô hạn, lấy mọi Thần Khí 30 hệ vũ khí, Chuyển Phái tự do và Dịch chuyển khắp 8 phân vùng bản đồ!' },
        { id: 2, name: 'Vô Danh (Truyền Thừa Võ Học)', role: 'Chuyển Chức & Kỹ Năng', gx: 14, gy: 6, sprite: 'assets/pet_icons/tx_538.png', dialog: 'Muốn học Vạn Kiếm Quy Tông hay Chuyển Phái Tự Do (hoàn 100% SP), hãy tìm ta!' },
        { id: 3, name: 'Thợ Rèn Bái Kiếm Sơn Trang', role: 'Giám Định / Thăng Sao / Phụ Ma', gx: 8, gy: 10, sprite: 'assets/pet_icons/tx_525.png', dialog: 'Lò Luyện thần binh: Giám định, Thăng sao 5★, Khảm Bảo Thạch, Phụ Ma 10,000 điểm!' },
        { id: 4, name: 'Sơn Tặc Đầu Mục (Lv.15)', role: 'Monster', battleGroupId: 101, gx: 18, gy: 11, sprite: 'assets/pet_icons/tx_505.png' }
      ],
      jumpPoints: [
        { gx: 22, gy: 8, targetMapId: 2, label: '➔ Thiên Hạ Hội' },
        { gx: 12, gy: 1, targetMapId: 6001, label: '➔ Quốc Chiến (6001)' }
      ]
    },
    {
      id: 2,
      rangeLabel: '1 – 999 (MAP_COMMON)',
      name: 'Thiên Hạ Hội Tổng Đàn',
      category: 'Thế giới chung',
      weather: 'Nắng hoàng kim',
      cols: 24,
      rows: 16,
      groundTileId: 2,
      pathTileId: 3,
      spawn: { gx: 4, gy: 8 },
      npcs: [
        { id: 10, name: 'Bộ Kinh Vân (Phi Vân Đường)', role: 'NPC Cốt Truyện', gx: 9, gy: 5, sprite: 'assets/pet_icons/tx_540.png', dialog: 'Tuyệt Thế Hảo Kiếm và Bài Vân Chưởng sẽ tiễu trừ mọi kẻ thù!' },
        { id: 11, name: 'Nhiếp Phong (Thần Phong Đường)', role: 'NPC Cốt Truyện', gx: 15, gy: 5, sprite: 'assets/pet_icons/tx_541.png', dialog: 'Phong Thần Cước nhanh tựa cuồng phong!' },
        { id: 12, name: 'BOSS Hùng Bá (Lv.65)', role: 'World Boss', battleGroupId: 201, gx: 12, gy: 9, sprite: 'assets/pet_icons/tx_548.png' }
      ],
      jumpPoints: [
        { gx: 1, gy: 8, targetMapId: 1, label: '➔ Phong Vân Thôn' },
        { gx: 22, gy: 8, targetMapId: 5027, label: '➔ Đấu Trường (5027)' }
      ]
    },
    {
      id: 1001,
      rangeLabel: '1000 – 1999 (MAP_EAST_CITY)',
      name: 'Thành Trì Cá Nhân — Đông Phương',
      category: 'Thành trì cá nhân (Đông Phương)',
      weather: 'Thanh bình',
      cols: 24,
      rows: 16,
      groundTileId: 4,
      pathTileId: 5,
      spawn: { gx: 12, gy: 10 },
      npcs: [
        { id: 20, name: 'Quản Gia Thành Trì Đông Phương', role: 'Thu Thuế & Đổi Bảng Hiệu', gx: 12, gy: 6, sprite: 'assets/pet_icons/tx_530.png', dialog: 'Thành trì cá nhân tạo nguồn thu ngân lượng mỗi ngày cho Đại Hiệp!' }
      ],
      jumpPoints: [{ gx: 2, gy: 8, targetMapId: 1, label: '➔ Về Thế Giới Chung' }]
    },
    {
      id: 2001,
      rangeLabel: '2000 – 2999 (MAP_WEST_CITY)',
      name: 'Thành Trì Cá Nhân — Tây Phương',
      category: 'Thành trì cá nhân (Tây Phương)',
      weather: 'Hoàng hôn Đế Quốc',
      cols: 24,
      rows: 16,
      groundTileId: 6,
      pathTileId: 7,
      spawn: { gx: 12, gy: 10 },
      npcs: [
        { id: 21, name: 'Kỵ Sĩ Trưởng Thành Trì Tây Phương', role: 'Quản Lý Lãnh Địa', gx: 12, gy: 6, sprite: 'assets/pet_icons/tx_532.png', dialog: 'Pháo đài Tây Phương kiên cố bất khả xâm phạm!' }
      ],
      jumpPoints: [{ gx: 2, gy: 8, targetMapId: 1, label: '➔ Về Thế Giới Chung' }]
    },
    {
      id: 3001,
      rangeLabel: '3000 – 3999 (MAP_EAST_COUNTRY)',
      name: 'Thủ Đô Quốc Gia — Đông Phương',
      category: 'Lãnh thổ Quốc gia (Đông Phương)',
      weather: 'Long khí hội tụ',
      cols: 24,
      rows: 16,
      groundTileId: 8,
      pathTileId: 9,
      spawn: { gx: 12, gy: 11 },
      npcs: [
        { id: 30, name: 'Quốc Vương Đông Phương (Miễn Thuế 100%)', role: '13 Công Trình & 11 Quan Chức', gx: 12, gy: 5, sprite: 'assets/pet_icons/tx_545.png', dialog: 'Quốc gia sở hữu 13 công trình chiến lược và 11 cấp quan chức!' },
        { id: 31, name: 'BOSS Đế Thích Thiên (Lv.85)', role: 'World Boss', battleGroupId: 207, gx: 18, gy: 9, sprite: 'assets/pet_icons/tx_547.png' }
      ],
      jumpPoints: [{ gx: 2, gy: 8, targetMapId: 6001, label: '➔ Chiến Trường Quốc Chiến' }]
    },
    {
      id: 4001,
      rangeLabel: '4000 – 4999 (MAP_WEST_COUNTRY)',
      name: 'Thủ Đô Quốc Gia — Tây Phương',
      category: 'Lãnh thổ Quốc gia (Tây Phương)',
      weather: 'Thánh quang',
      cols: 24,
      rows: 16,
      groundTileId: 10,
      pathTileId: 11,
      spawn: { gx: 12, gy: 11 },
      npcs: [
        { id: 40, name: 'Nhiếp Chính Vương Tây Phương', role: 'Học Viện Quốc Gia', gx: 12, gy: 5, sprite: 'assets/pet_icons/tx_544.png', dialog: 'Võ quán Chiến Sĩ và Học Viện Pháp Sư luôn mở cửa cho công dân!' }
      ],
      jumpPoints: [{ gx: 2, gy: 8, targetMapId: 6001, label: '➔ Chiến Trường Quốc Chiến' }]
    },
    {
      id: 5027,
      rangeLabel: '5000 – 5999 (MAP_MIRROR / MAP_PK_ID=5027)',
      name: 'Đấu Trường Thiên Không & Phó Bản Bàn Cờ',
      category: 'Bản đồ Phản chiếu / Phó bản',
      weather: 'Sấm sét Cửu Không',
      cols: 24,
      rows: 16,
      groundTileId: 12,
      pathTileId: 13,
      spawn: { gx: 6, gy: 8 },
      npcs: [
        { id: 50, name: 'THẦN THÚ Hỏa Kỳ Lân (Lv.75)', role: 'Mirror Boss', battleGroupId: 203, gx: 14, gy: 7, sprite: 'assets/pet_icons/tx_542.png' },
        { id: 51, name: 'BOSS Ma Thần Đoạn Lãng (Lv.85)', role: 'Supreme Boss', battleGroupId: 208, gx: 18, gy: 10, sprite: 'assets/pet_icons/tx_548.png' }
      ],
      jumpPoints: [{ gx: 1, gy: 8, targetMapId: 1, label: '➔ Về Phong Vân Thôn' }]
    },
    {
      id: 6001,
      rangeLabel: '6000 – 6999 (MAP_COUNTRY_WAR / MAP_WAR_ID=6001)',
      name: 'Chiến Trường Quốc Chiến 10 Hiệp (6 Công Trình)',
      category: 'Chiến trường Quốc Chiến',
      weather: 'Khói lửa công thành',
      cols: 24,
      rows: 16,
      groundTileId: 14,
      pathTileId: 15,
      spawn: { gx: 5, gy: 8 },
      npcs: [
        { id: 60, name: 'Đại Nguyên Soái Công Thành', role: 'Quân Lệnh Quốc Chiến (WarCommand)', gx: 8, gy: 6, sprite: 'assets/pet_icons/tx_539.png', dialog: 'Bảo vệ 6 công trình: Hoàng Cung, Tường Thành Trên/Dưới, Tiễn Tháp Trên/Giữa/Dưới trong 10 hiệp!' },
        { id: 61, name: 'BOSS Tuyệt Vô Thần (Lv.80)', role: 'Siege Boss', battleGroupId: 206, gx: 17, gy: 8, sprite: 'assets/pet_icons/tx_543.png' }
      ],
      jumpPoints: [{ gx: 1, gy: 8, targetMapId: 1, label: '➔ Về Phong Vân Thôn' }]
    },
    {
      id: 7001,
      rangeLabel: '7000 – 7999 (MAP_ESCORT)',
      name: 'Tuyến Đường Áp Tiêu Bàn Cờ Liên Châu',
      category: 'Tuyến đường Áp Tiêu',
      weather: 'Gió cát biên ải',
      cols: 24,
      rows: 16,
      groundTileId: 16,
      pathTileId: 17,
      spawn: { gx: 4, gy: 8 },
      npcs: [
        { id: 70, name: 'Tổng Tiêu Đầu Long Môn', role: 'Vận Tiêu & Chống Cướp Tiêu', gx: 10, gy: 8, sprite: 'assets/pet_icons/tx_535.png', dialog: 'Đổ xúc xắc di chuyển xe tiêu qua các ô sự kiện bàn cờ để nhận thưởng lớn!' }
      ],
      jumpPoints: [{ gx: 1, gy: 8, targetMapId: 1, label: '➔ Về Phong Vân Thôn' }]
    }
  ],

  // 13 Công trình Quốc gia & 11 Quan chức (Section 3.7)
  countryBuildings: [
    { id: 1, name: 'Hoàng Cung', level: 10, desc: 'Trung tâm cấp độ quốc gia & kho báu hoàng thất.' },
    { id: 2, name: 'Quân Doanh', level: 10, desc: 'Tăng giới hạn quân số & lực phòng thủ công thành.' },
    { id: 3, name: 'Nhà Dân', level: 10, desc: 'Tăng dân số & thu nhập thuế quốc gia.' },
    { id: 4, name: 'Xưởng Đá', level: 10, desc: 'Sản xuất tài nguyên chiến lược: Đá.' },
    { id: 5, name: 'Xưởng Sắt', level: 10, desc: 'Sản xuất tài nguyên chiến lược: Sắt.' },
    { id: 6, name: 'Xưởng Gỗ', level: 10, desc: 'Sản xuất tài nguyên chiến lược: Gỗ.' },
    { id: 7, name: 'Võ Quán Chiến Sĩ', level: 10, desc: 'Nghiên cứu kỹ năng độc quyền hệ Chiến Sĩ / Dũng Mãnh / Chùy Sư.' },
    { id: 8, name: 'Võ Quán Hiệp Khách', level: 10, desc: 'Nghiên cứu kỹ năng độc quyền hệ Hiệp Khách / Võ Thánh / Tấn Tiệp.' },
    { id: 9, name: 'Học Viện Pháp Sư', level: 10, desc: 'Nghiên cứu kỹ năng độc quyền hệ Pháp Sư / Duệ Trí / Vua Súng.' },
    { id: 10, name: 'Quán Đạo Tu Chân', level: 10, desc: 'Nghiên cứu kỹ năng độc quyền hệ Tu Chân / Hiền Giả / Lam Vũ.' },
    { id: 11, name: 'Tiệm Trang Bị Quốc Gia', level: 10, desc: 'Rèn trang bị quốc gia phẩm chất Cam/Đỏ.' },
    { id: 12, name: 'Tiệm Đạo Cụ Quốc Gia', level: 10, desc: 'Cung cấp đan dược, cuộn giám định, bảo hiểm tinh luyện.' },
    { id: 13, name: 'Tiệm Chế Tạo Quốc Gia', level: 10, desc: 'Chế tạo vũ khí công thành và phù văn.' }
  ],

  countryRanks: [
    { rank: 1, title: 'Quốc Vương', taxDiscount: 100, note: 'Miễn thuế 100% (Offline > 30 ngày tự động truyền ngôi)' },
    { rank: 2, title: 'Nhiếp Chính Vương', taxDiscount: 85, note: 'Quyền điều hành quốc sự & phát Quân Lệnh' },
    { rank: 3, title: 'Nguyên Soái', taxDiscount: 75, note: 'Giảm 75% thuế — Tổng chỉ huy Quốc Chiến' },
    { rank: 4, title: 'Đại Tướng Quân', taxDiscount: 50, note: 'Giảm 50% thuế — Chỉ huy tiên phong' },
    { rank: 5, title: 'Thống Lĩnh', taxDiscount: 25, note: 'Giảm 25% thuế — Quản lý Quân Doanh' },
    { rank: 6, title: 'Chấp Chính Quan', taxDiscount: 20, note: 'Quản lý hành chính & nhiệm vụ quốc gia' },
    { rank: 7, title: 'Tài Chính Quan', taxDiscount: 20, note: 'Quản lý Kho Quốc Gia & Thuế suất' },
    { rank: 8, title: 'Nội Chính Quan', taxDiscount: 15, note: 'Quản lý 13 công trình xây dựng' },
    { rank: 9, title: 'Binh Sĩ (Bá Tước / Tử Tước)', taxDiscount: 10, note: 'Quân nhân chính quy quốc gia' },
    { rank: 10, title: 'Bá Tánh', taxDiscount: 0, note: 'Công dân quốc gia' },
    { rank: 11, title: 'Viện Quân (Đồng Minh)', taxDiscount: 10, note: 'Chi viện từ Thế lực đồng minh' }
  ],

  // Đội hình Boss & Quái vật chiến đấu theo lượt
  battleGroups: {
    101: {
      id: 101,
      name: 'Đội Sơn Tặc Đầu Mục (Tân Thủ Thôn)',
      expReward: 45000,
      miracleExpReward: 12000,
      goldReward: 150000,
      enemies: [
        { name: 'Sơn Tặc Đầu Mục', level: 15, hp: 18000, maxHp: 18000, mp: 3000, slashAtk: 950, slashDef: 300, pierceDef: 300, magicDef: 250, hitCount: 2, block: 15, counter: 10, insight: 5, sprite: 'assets/pet_icons/tx_505.png' },
        { name: 'Sơn Tặc Cung Thủ', level: 12, hp: 12000, maxHp: 12000, mp: 2000, slashAtk: 750, slashDef: 200, pierceDef: 200, magicDef: 200, hitCount: 3, block: 10, counter: 0, insight: 5, sprite: 'assets/pet_icons/tx_508.png' }
      ]
    },
    201: {
      id: 201,
      name: 'BOSS Hùng Bá Thiên Hạ (Thiên Hạ Hội)',
      expReward: 250000,
      miracleExpReward: 85000,
      goldReward: 1000000,
      enemies: [
        { name: 'Bang Chủ Hùng Bá', level: 65, hp: 125000, maxHp: 125000, mp: 20000, slashAtk: 4200, slashDef: 1400, pierceDef: 1400, magicDef: 1500, hitCount: 3, block: 35, counter: 25, insight: 20, sprite: 'assets/pet_icons/tx_548.png' },
        { name: 'Thiên Trì Quái Hiệp', level: 58, hp: 65000, maxHp: 65000, mp: 10000, slashAtk: 2800, slashDef: 900, pierceDef: 900, magicDef: 900, hitCount: 2, block: 20, counter: 15, insight: 10, sprite: 'assets/pet_icons/tx_528.png' }
      ]
    },
    203: {
      id: 203,
      name: 'THẦN THÚ Hỏa Kỳ Lân (Lăng Vân Động)',
      expReward: 400000,
      miracleExpReward: 150000,
      goldReward: 2500000,
      enemies: [
        { name: 'Thần Thú Hỏa Kỳ Lân', level: 75, hp: 210000, maxHp: 210000, mp: 30000, slashAtk: 5600, slashDef: 1800, pierceDef: 1800, magicDef: 2000, hitCount: 3, block: 30, counter: 30, magicReflect: 25, insight: 15, sprite: 'assets/pet_icons/tx_542.png' }
      ]
    },
    206: {
      id: 206,
      name: 'BOSS Tuyệt Vô Thần (Bất Diệt Kim Thân)',
      expReward: 550000,
      miracleExpReward: 220000,
      goldReward: 3500000,
      enemies: [
        { name: 'Bá Chủ Tuyệt Vô Thần', level: 80, hp: 280000, maxHp: 280000, mp: 30000, slashAtk: 6200, slashDef: 2600, pierceDef: 2600, magicDef: 2200, hitCount: 2, block: 55, counter: 35, dmgReduce: 35, insight: 20, sprite: 'assets/pet_icons/tx_543.png' }
      ]
    },
    207: {
      id: 207,
      name: 'BOSS Đế Thích Thiên (Thiên Môn Thánh Điện)',
      expReward: 800000,
      miracleExpReward: 350000,
      goldReward: 5000000,
      enemies: [
        { name: 'Chí Tôn Đế Thích Thiên', level: 85, hp: 360000, maxHp: 360000, mp: 50000, slashAtk: 7200, slashDef: 2400, pierceDef: 2400, magicDef: 3200, hitCount: 3, block: 40, magicReflect: 35, insight: 35, sprite: 'assets/pet_icons/tx_547.png' }
      ]
    },
    208: {
      id: 208,
      name: 'BOSS Ma Thần Đoạn Lãng (Song Long Nguyên)',
      expReward: 1500000,
      miracleExpReward: 600000,
      goldReward: 10000000,
      enemies: [
        { name: 'Ma Thần Đoạn Lãng (Cấp Thần)', level: 85, hp: 500000, maxHp: 500000, mp: 60000, slashAtk: 8800, slashDef: 3000, pierceDef: 3000, magicDef: 3000, hitCount: 4, block: 45, counter: 40, magicReflect: 30, dmgReduce: 40, insight: 30, sprite: 'assets/pet_icons/tx_548.png' }
      ]
    }
  }
};

/**
 * Exact Secondary Combat Stat Formula Engine (from com.hz.ui.PlayerInfoUIAction)
 */
window.computePVTK2Stats = function computePVTK2Stats(player) {
  const jobDef = window.PVTK2_DATA.jobs.find((j) => j.id === player.job) || window.PVTK2_DATA.jobs[1];
  const miracleLv = player.miracleLevel || 0;

  const str = (player.str || 100) + (jobDef.bonus.str || 0) * 5;
  const sta = (player.sta || 100) + (jobDef.bonus.sta || 0) * 5;
  const agi = (player.agi || 100) + (jobDef.bonus.agi || 0) * 5;
  const int = (player.int || 100) + (jobDef.bonus.int || 0) * 5;
  const wis = (player.wis || 100) + (jobDef.bonus.wis || 0) * 5;

  let equipBonus = {
    hp: 0, mp: 0, shieldHp: 0, manaShield: 0,
    slashAtk: 0, pierceAtk: 0, magicAtk: 0,
    slashDef: 0, pierceDef: 0, magicDef: 0,
    hitCount: 0, speed: 0, hit: 0, dodge: 0, crit: 0, critRes: 0,
    block: 0, ignoreBlock: 0, counter: 0, ignoreCounter: 0,
    magicReflect: 0, ignoreMagicReflect: 0,
    dmgReduce: 0, ignoreDmgReduce: 0,
    insight: 0, ignoreInsight: 0,
    armorBreak: 0, magicPen: 0, hitPress: 0,
    lifestealHp: 0, lifestealMp: 0,
    talisman: 0, blessing: 0, statusRes: 0, ignoreStatusRes: 0,
    weaponDmg: 0, isRangedWeapon: false
  };

  const equippedItems = Object.values(player.equipped || {}).filter(Boolean);
  for (const item of equippedItems) {
    const starMult = 1 + (item.star || 0) * 0.12 + (item.advanceStar || 0) * 0.18;
    equipBonus.hp += Math.round((item.hp || 0) * starMult);
    equipBonus.mp += Math.round((item.mp || 0) * starMult);
    equipBonus.shieldHp += Math.round((item.shieldHp || 0) * starMult);
    equipBonus.manaShield += Math.round((item.manaShield || 0) * starMult);
    equipBonus.slashAtk += Math.round((item.slashAtk || 0) * starMult);
    equipBonus.pierceAtk += Math.round((item.pierceAtk || 0) * starMult);
    equipBonus.magicAtk += Math.round((item.magicAtk || 0) * starMult);
    equipBonus.slashDef += Math.round((item.slashDef || 0) * starMult);
    equipBonus.pierceDef += Math.round((item.pierceDef || 0) * starMult);
    equipBonus.magicDef += Math.round((item.magicDef || 0) * starMult);
    equipBonus.hitCount += item.hitCount || 0;
    equipBonus.speed += item.speed || 0;
    equipBonus.hit += item.hit || 0;
    equipBonus.dodge += item.dodge || 0;
    equipBonus.crit += item.crit || 0;
    equipBonus.critRes += item.critRes || 0;
    equipBonus.block += item.block || 0;
    equipBonus.ignoreBlock += item.ignoreBlock || 0;
    equipBonus.counter += item.counter || 0;
    equipBonus.ignoreCounter += item.ignoreCounter || 0;
    equipBonus.magicReflect += item.magicReflect || 0;
    equipBonus.dmgReduce += item.dmgReduce || 0;
    equipBonus.insight += item.insight || 0;
    equipBonus.armorBreak += item.armorBreak || 0;
    equipBonus.magicPen += item.magicPen || 0;
    equipBonus.lifestealHp += item.lifestealHp || 0;
    equipBonus.lifestealMp += item.lifestealMp || 0;
    equipBonus.talisman += item.talisman || 0;
    equipBonus.blessing += item.blessing || 0;
    equipBonus.statusRes += item.statusRes || 0;
    if (item.slot === 'weaponRight') {
      equipBonus.weaponDmg = Math.round(Math.max(item.slashAtk || 0, item.pierceAtk || 0, item.magicAtk || 0) * 0.35);
      const wt = window.PVTK2_DATA.weaponTypes.find((w) => w.id === item.weaponTypeId);
      if (wt && wt.range === 'ranged') equipBonus.isRangedWeapon = true;
    }
  }

  // Pet Merge / Assist Bonus
  if (player.activePet) {
    const petGrowMult = 1 + (player.activePet.grow || 10) * 0.05;
    equipBonus.hp += Math.round((player.activePet.hp || 20000) * 0.25 * petGrowMult);
    equipBonus.slashAtk += Math.round((player.activePet.atk || 1500) * 0.3 * petGrowMult);
    equipBonus.pierceAtk += Math.round((player.activePet.atk || 1500) * 0.3 * petGrowMult);
    equipBonus.magicAtk += Math.round((player.activePet.atk || 1500) * 0.3 * petGrowMult);
  }

  // Primary -> Secondary conversions (Section 3.2 & 3.3)
  const maxHp = Math.round((player.level * 350 + sta * 48 + equipBonus.hp + miracleLv * 1800) * 1.25);
  const maxMp = Math.round(player.level * 160 + int * 22 + wis * 28 + equipBonus.mp + miracleLv * 900);
  const hpRegen = Math.round(sta * 3.5 + miracleLv * 50);
  const mpRegen = Math.round(wis * 4.0 + miracleLv * 40);

  const totalSlashAtk = Math.round((str * 9.5 + agi * 2.5 + equipBonus.slashAtk) * 1.15);
  const totalPierceAtk = Math.round((str * 5.0 + agi * 7.5 + equipBonus.pierceAtk) * 1.15);
  const totalMagicAtk = Math.round((int * 10.5 + wis * 4.5 + equipBonus.magicAtk) * 1.2);

  const slashDef = Math.round(sta * 5.5 + str * 1.5 + equipBonus.slashDef);
  const pierceDef = Math.round(sta * 5.5 + agi * 1.5 + equipBonus.pierceDef);
  const magicDef = Math.round(wis * 6.5 + int * 2.5 + equipBonus.magicDef);

  const hitCount = Math.max(1, 2 + equipBonus.hitCount);
  // Công thức sát thương mỗi đòn: (Tổng Lực Công / Số lần tấn công) + Sát thương Vũ khí
  const slashPerHit = Math.round(totalSlashAtk / hitCount + equipBonus.weaponDmg);
  const piercePerHit = Math.round(totalPierceAtk / hitCount + equipBonus.weaponDmg);

  const speed = Math.round(agi * 4.2 + wis * 1.2 + equipBonus.speed + 300);
  const dodge = Math.round(agi * 2.8 + equipBonus.dodge);
  const hit = Math.round(agi * 3.0 + str * 1.2 + equipBonus.hit + 200);

  // Hard Caps at 70% (Section 3.2)
  const HARD_CAP = 70;
  const crit = Math.min(85, Math.round(10 + agi * 0.04 + equipBonus.crit));
  const block = Math.min(HARD_CAP, Math.round(10 + equipBonus.block + 15));
  const counter = Math.min(HARD_CAP, Math.round(8 + equipBonus.counter + 15));
  const magicReflect = Math.min(HARD_CAP, Math.round(5 + equipBonus.magicReflect + 15));
  const dmgReduce = Math.min(HARD_CAP, Math.round(10 + equipBonus.dmgReduce + 15));
  const insight = Math.min(HARD_CAP, Math.round(8 + wis * 0.03 + equipBonus.insight + 15));

  return {
    str, sta, agi, int, wis,
    maxHp, maxMp, hpRegen, mpRegen,
    shieldHp: equipBonus.shieldHp + 15000,
    manaShield: equipBonus.manaShield + 500,
    totalSlashAtk, totalPierceAtk, totalMagicAtk,
    slashDef, pierceDef, magicDef,
    hitCount, weaponDmg: equipBonus.weaponDmg,
    slashPerHit, piercePerHit,
    speed, dodge, hit,
    crit, critMultiplier: 1.5, critRes: equipBonus.critRes + 25,
    block, blockDecayPerHit: 10, ignoreBlock: equipBonus.ignoreBlock + 20,
    counter, ignoreCounter: equipBonus.ignoreCounter,
    magicReflect, ignoreMagicReflect: equipBonus.ignoreMagicReflect + 15,
    dmgReduce, ignoreDmgReduce: equipBonus.ignoreDmgReduce + 15,
    insight, ignoreInsight: equipBonus.ignoreInsight + 15,
    armorBreak: equipBonus.armorBreak + 300,
    magicPen: equipBonus.magicPen + 300,
    hitPress: equipBonus.hitPress + 180,
    lifestealHp: Math.min(50, equipBonus.lifestealHp + 15),
    lifestealMp: Math.min(50, equipBonus.lifestealMp + 15),
    talisman: equipBonus.talisman + Math.round(wis * 0.8),
    blessing: equipBonus.blessing + Math.round(wis * 0.9),
    statusRes: equipBonus.statusRes + 30,
    ignoreStatusRes: equipBonus.ignoreStatusRes + 20,
    miracleEnemyDebuffPct: Math.min(35, miracleLv * 2),
    isRangedWeapon: equipBonus.isRangedWeapon
  };
};
