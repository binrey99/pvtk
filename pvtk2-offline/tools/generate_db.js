#!/usr/bin/env node
/**
 * Generates editable JSON databases for PVTK2 Offline Server Emulator
 * under D:\REA\app\pvtk2-offline\server\db\
 */

const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'server', 'db');
fs.mkdirSync(DB_DIR, { recursive: true });

const racesAndJobs = {
  races: [
    { id: 0, name: 'Đông Phương', desc: 'Tộc người phương Đông tinh thông võ học, kiếm thuật và nội công tâm pháp.' },
    { id: 1, name: 'Đế Quốc', desc: 'Chiến binh phương Tây khoác trọng giáp, sử dụng trọng kiếm và súng ống.' },
    { id: 2, name: 'Hồ Tộc', desc: 'Tộc người linh hoạt vùng thảo nguyên và rừng sâu, giỏi ám sát và bùa chú.' },
    { id: 3, name: 'Bắc Nguyên', desc: 'Tộc người phương Bắc mang huyết mạch cổ thần, sức mạnh thể chất phi thường.' }
  ],
  jobs: [
    { id: 0, name: 'Tân Thủ', baseStr: 15, baseCon: 15, baseAgi: 15, baseInt: 15, baseWis: 15 },
    { id: 1, name: 'Hiệp Khách', baseStr: 35, baseCon: 25, baseAgi: 30, baseInt: 15, baseWis: 15 },
    { id: 2, name: 'Chiến Binh', baseStr: 40, baseCon: 38, baseAgi: 18, baseInt: 12, baseWis: 12 },
    { id: 3, name: 'Pháp Sư', baseStr: 12, baseCon: 20, baseAgi: 20, baseInt: 42, baseWis: 26 },
    { id: 4, name: 'Tu Chân', baseStr: 14, baseCon: 22, baseAgi: 22, baseInt: 30, baseWis: 38 },
    { id: 5, name: 'Thánh Đồ', baseStr: 15, baseCon: 28, baseAgi: 18, baseInt: 28, baseWis: 40 },
    { id: 6, name: 'Dã Man', baseStr: 45, baseCon: 35, baseAgi: 20, baseInt: 10, baseWis: 10 },
    { id: 7, name: 'Thích Khách', baseStr: 32, baseCon: 20, baseAgi: 44, baseInt: 14, baseWis: 14 },
    { id: 8, name: 'Xạ Thủ', baseStr: 30, baseCon: 22, baseAgi: 42, baseInt: 16, baseWis: 14 },
    { id: 9, name: 'Võ Sư', baseStr: 38, baseCon: 32, baseAgi: 32, baseInt: 14, baseWis: 16 },
    { id: 10, name: 'Ám Vu', baseStr: 14, baseCon: 24, baseAgi: 22, baseInt: 40, baseWis: 32 },
    { id: 11, name: 'Tiên Pháp', baseStr: 12, baseCon: 22, baseAgi: 24, baseInt: 45, baseWis: 30 },
    { id: 12, name: 'Phá Quân', baseStr: 42, baseCon: 36, baseAgi: 28, baseInt: 15, baseWis: 15 }
  ]
};

// Item Type Constants from com.hz.main.Define:
// 0=Handgun, 1=Rifle, 2=Dagger, 3=Sword1H, 4=Sword2H, 5=Spear, 6=Staff, 7=Bow, 8=Fist/Claw,
// 9=Helmet, 10=Armor, 11=Shoulder, 12=Boots, 13=Gloves, 14=Belt, 15=Necklace, 16=Ring, 17=Back/Wing, 18=Shield/Offhand,
// 21=Mount, 22=Ride, 23=Fashion, 30=PetEgg, 31=SkillBook, 35=Gem, 36=Consumable, 39=TreasureBox
const items = [
  // Vũ khí Thần Khí (Grade 5 - Vàng / Grade 4 - Cam)
  {
    id: 1001, name: 'Tuyệt Thế Hảo Kiếm', type: 4, icon: 4, grade: 5, bagIcon: 4,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 10, price: 100000,
    avatarId: 12, starLevel: 10, suitId: 1,
    desc: 'Thần binh Bái Kiếm Sơn Trang của Bộ Kinh Vân, hấp thu tinh hoa Hắc Hàn Thạch, uy lực kinh thiên động địa.',
    attrs: [
      { id: 30, value: 2800 }, // Vật Công Tối Đa
      { id: 29, value: 2200 }, // Vật Công Tối Thiểu
      { id: 6, value: 180 },   // Sức Mạnh (STR)
      { id: 8, value: 150 },   // Thân Pháp (AGI)
      { id: 45, value: 350 }   // Bạo Kích
    ]
  },
  {
    id: 1002, name: 'Tuyết Ẩm Cuồng Đao', type: 3, icon: 3, grade: 5, bagIcon: 3,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 10, price: 100000,
    avatarId: 11, starLevel: 10, suitId: 1,
    desc: 'Gia truyền bảo đao của Nhiếp Gia được đúc từ Bạch Lộ Hàn Thiết, hàn khí đóng băng vạn dặm.',
    attrs: [
      { id: 30, value: 2650 },
      { id: 29, value: 2100 },
      { id: 6, value: 160 },
      { id: 8, value: 190 },
      { id: 46, value: 320 }
    ]
  },
  {
    id: 1003, name: 'Hỏa Lân Thần Kiếm', type: 3, icon: 3, grade: 5, bagIcon: 3,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 10, price: 95000,
    avatarId: 13, starLevel: 9, suitId: 1,
    desc: 'Kiếm khảm vảy Hỏa Kỳ Lân của Đoạn Gia, tăng mạnh sát thương hỏa diễm và nội lực.',
    attrs: [
      { id: 30, value: 2400 },
      { id: 32, value: 2400 }, // Pháp Công
      { id: 6, value: 140 },
      { id: 9, value: 160 }    // Trí Lực (INT)
    ]
  },
  {
    id: 1004, name: 'Anh Hùng Kiếm (Vô Danh)', type: 3, icon: 3, grade: 5, bagIcon: 3,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 8, price: 120000,
    avatarId: 14, starLevel: 10, suitId: 2,
    desc: 'Thần kiếm chính khí hạo nhiên của Võ Lâm Thần Thoại Vô Danh, Vạn Kiếm Quy Tông.',
    attrs: [
      { id: 30, value: 3000 },
      { id: 32, value: 3000 },
      { id: 6, value: 200 },
      { id: 8, value: 200 },
      { id: 9, value: 200 }
    ]
  },
  {
    id: 1005, name: 'Thiên Tội Thần Thương', type: 5, icon: 5, grade: 5, bagIcon: 5,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 12, price: 95000,
    avatarId: 15, starLevel: 9, suitId: 1,
    desc: 'Hung khí nhân gian biến hóa khôn lường của Hoài Không, công thủ toàn diện.',
    attrs: [
      { id: 30, value: 2700 },
      { id: 7, value: 200 }, // Thể Chất (CON)
      { id: 6, value: 180 }
    ]
  },
  {
    id: 1006, name: 'Phượng Vũ Thần Cung', type: 7, icon: 7, grade: 5, bagIcon: 7,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 8, price: 95000,
    avatarId: 16, starLevel: 9, suitId: 1,
    desc: 'Thần cung chế tác từ lông vũ Băng Phượng Hoàng, bách phát bách trúng.',
    attrs: [
      { id: 30, value: 2600 },
      { id: 8, value: 250 },
      { id: 45, value: 400 }
    ]
  },
  {
    id: 1007, name: 'Cửu Không Pháp Trượng', type: 6, icon: 6, grade: 5, bagIcon: 6,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 8, price: 95000,
    avatarId: 17, starLevel: 10, suitId: 2,
    desc: 'Pháp trượng hội tụ linh khí Thiên Môn của Đế Thích Thiên, hủy thiên diệt địa.',
    attrs: [
      { id: 32, value: 3200 },
      { id: 9, value: 260 },
      { id: 10, value: 220 }, // Tinh Thần (WIS)
      { id: 27, value: 5000 } // Max MP
    ]
  },
  {
    id: 1008, name: 'Thiên Sương Thần Quyền', type: 8, icon: 8, grade: 5, bagIcon: 8,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 7, price: 90000,
    avatarId: 18, starLevel: 9, suitId: 1,
    desc: 'Quyền sáo băng tinh của Tần Sương và Hùng Bá, đóng băng kinh mạch đối thủ.',
    attrs: [
      { id: 30, value: 2550 },
      { id: 6, value: 190 },
      { id: 7, value: 190 }
    ]
  },
  {
    id: 1009, name: 'Kinh Tịch Ám Đao', type: 2, icon: 2, grade: 5, bagIcon: 2,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 6, price: 90000,
    avatarId: 19, starLevel: 9, suitId: 1,
    desc: 'Đoản đao tuyệt sát của Hoàng Ảnh, tốc độ xuất chiêu nhanh như chớp giật.',
    attrs: [
      { id: 30, value: 2500 },
      { id: 8, value: 280 },
      { id: 45, value: 450 }
    ]
  },
  {
    id: 1010, name: 'Hỏa Thần Trọng Pháo', type: 1, icon: 1, grade: 5, bagIcon: 1,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 12, price: 90000,
    avatarId: 20, starLevel: 9, suitId: 1,
    desc: 'Trọng pháo cơ quan thuật của Đế Quốc, sát thương tầm xa xuyên giáp.',
    attrs: [
      { id: 30, value: 2750 },
      { id: 8, value: 220 },
      { id: 6, value: 160 }
    ]
  },
  // Giáp Trụ, Trang Sức, Cánh, Thời Trang, Thú Cưỡi
  {
    id: 2001, name: 'Kim Lân Long Mạo (Nón)', type: 9, icon: 9, grade: 5, bagIcon: 9,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 5, price: 50000,
    avatarId: 30, starLevel: 10, suitId: 1,
    desc: 'Chiến mạo vảy Kỳ Lân bảo hộ nguyên thần, tăng mạnh sinh lực và phòng thủ.',
    attrs: [
      { id: 33, value: 1500 }, // Phòng Thủ Vật Lý
      { id: 34, value: 1500 }, // Phòng Thủ Phép
      { id: 26, value: 8000 }, // Max HP
      { id: 7, value: 150 }
    ]
  },
  {
    id: 2002, name: 'Bất Diệt Kim Thân Giáp (Áo)', type: 10, icon: 10, grade: 5, bagIcon: 10,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 10, price: 80000,
    avatarId: 31, starLevel: 10, suitId: 1,
    desc: 'Chiến giáp Kim Cang Bất Hoại của Tuyệt Vô Thần, vạn kiếm bất xâm.',
    attrs: [
      { id: 33, value: 2800 },
      { id: 34, value: 2800 },
      { id: 26, value: 15000 },
      { id: 7, value: 250 }
    ]
  },
  {
    id: 2003, name: 'Thiên Sương Hộ Kiên (Vai)', type: 11, icon: 11, grade: 5, bagIcon: 11,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 5, price: 45000,
    avatarId: 32, starLevel: 10, suitId: 1,
    desc: 'Hộ kiên hàn băng giảm sát thương chí mạng từ kẻ địch.',
    attrs: [
      { id: 33, value: 1200 },
      { id: 34, value: 1200 },
      { id: 26, value: 6000 }
    ]
  },
  {
    id: 2004, name: 'Phong Thần Chiến Ngoa (Giày)', type: 12, icon: 12, grade: 5, bagIcon: 12,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 4, price: 50000,
    avatarId: 33, starLevel: 10, suitId: 1,
    desc: 'Chiến ngoa Phong Thần Cước giúp thân pháp nhanh nhẹn như cuồng phong.',
    attrs: [
      { id: 33, value: 1100 },
      { id: 8, value: 240 },
      { id: 47, value: 300 } // Né Tránh
    ]
  },
  {
    id: 2005, name: 'Bài Vân Hộ Uyển (Găng)', type: 13, icon: 13, grade: 5, bagIcon: 13,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 4, price: 45000,
    avatarId: 34, starLevel: 10, suitId: 1,
    desc: 'Hộ uyển Bài Vân Chưởng gia tăng uy lực chưởng pháp và chính xác.',
    attrs: [
      { id: 30, value: 900 },
      { id: 6, value: 160 },
      { id: 44, value: 300 } // Chính Xác
    ]
  },
  {
    id: 2006, name: 'Long Mạch Yêu Đai (Đai)', type: 14, icon: 14, grade: 5, bagIcon: 14,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 4, price: 45000,
    avatarId: 35, starLevel: 10, suitId: 1,
    desc: 'Yêu đai kết tinh linh khí Long Mạch Trung Nguyên, hộ mệnh tuyệt đỉnh.',
    attrs: [
      { id: 26, value: 10000 },
      { id: 27, value: 5000 },
      { id: 7, value: 180 }
    ]
  },
  {
    id: 2007, name: 'Băngách Thần Châu (Dây Chuyền)', type: 15, icon: 15, grade: 5, bagIcon: 15,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 2, price: 60000,
    avatarId: 36, starLevel: 10, suitId: 2,
    desc: 'Bảo châu của Thiên Môn giữ thân bất lão, hồi phục sinh lực và nội lực.',
    attrs: [
      { id: 30, value: 1200 },
      { id: 32, value: 1200 },
      { id: 26, value: 8000 }
    ]
  },
  {
    id: 2008, name: 'Thiên Môn Long Giới (Nhẫn)', type: 16, icon: 16, grade: 5, bagIcon: 16,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 2, price: 60000,
    avatarId: 37, starLevel: 10, suitId: 2,
    desc: 'Long giới chí tôn gia tăng toàn bộ thuộc tính cơ bản +150.',
    attrs: [
      { id: 6, value: 150 },
      { id: 7, value: 150 },
      { id: 8, value: 150 },
      { id: 9, value: 150 },
      { id: 10, value: 150 }
    ]
  },
  {
    id: 2009, name: 'Cánh Hỏa Phượng Hoàng (Thần Dực)', type: 17, icon: 17, grade: 5, bagIcon: 17,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 5, price: 150000,
    avatarId: 40, starLevel: 10, suitId: 2,
    desc: 'Đôi cánh Phượng Hoàng Bất Tử rực lửa, tăng toàn diện công thủ và tốc độ.',
    attrs: [
      { id: 30, value: 2000 },
      { id: 32, value: 2000 },
      { id: 33, value: 2000 },
      { id: 26, value: 20000 }
    ]
  },
  {
    id: 2010, name: 'Hỏa Kỳ Lân Tọa Kỵ (Thú Cưỡi)', type: 21, icon: 21, grade: 5, bagIcon: 21,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 10, price: 150000,
    avatarId: 45, starLevel: 10, suitId: 2,
    desc: 'Thần thú Hỏa Kỳ Lân trong Lăng Vân Động đã được thu phục làm tọa kỵ bá chủ.',
    attrs: [
      { id: 26, value: 25000 },
      { id: 30, value: 1800 },
      { id: 8, value: 300 }
    ]
  },
  {
    id: 2011, name: 'Chiến Bào Bá Chúa Thiên Hạ (Thời Trang)', type: 23, icon: 23, grade: 5, bagIcon: 23,
    reqLv: 1, durability: 500, maxDurability: 500, weight: 3, price: 100000,
    avatarId: 50, starLevel: 10, suitId: 2,
    desc: 'Thời trang Chí Tôn Phong Vân Truyền Kỳ 2, tỏa hào quang hoàng kim.',
    attrs: [
      { id: 26, value: 12000 },
      { id: 30, value: 1500 },
      { id: 32, value: 1500 }
    ]
  },
  // Vật phẩm tiêu hao, Bảo thạch, Sách EXP, Trứng Pet, Gói Quà GM
  {
    id: 3001, name: 'Huyết Bồ Đề (Đại Hoàn Đan HP/MP)', type: 36, icon: 36, grade: 4, bagIcon: 36,
    reqLv: 1, durability: 1, maxDurability: 99, weight: 1, price: 100,
    avatarId: 0, starLevel: 0, suitId: 0,
    desc: 'Thánh quả mọc trong Lăng Vân Động, sử dụng lập tức hồi phục đầy HP & MP.',
    attrs: [{ id: 26, value: 50000 }, { id: 27, value: 50000 }]
  },
  {
    id: 3002, name: 'Chân Nguyên Đế Thích Thiên (Sách EXP Thần Tốc)', type: 36, icon: 31, grade: 5, bagIcon: 31,
    reqLv: 1, durability: 1, maxDurability: 99, weight: 1, price: 1000,
    avatarId: 0, starLevel: 0, suitId: 0,
    desc: 'Sử dụng nhận ngay 500,000 EXP và +5 Cấp Độ nhân vật + 1000 Điểm Kỹ Năng (SP)!',
    attrs: []
  },
  {
    id: 3003, name: 'Rương GM Phú Quý (9,999,999 Vàng + KNB + Lá)', type: 39, icon: 39, grade: 5, bagIcon: 39,
    reqLv: 1, durability: 1, maxDurability: 99, weight: 1, price: 0,
    avatarId: 0, starLevel: 0, suitId: 0,
    desc: 'Mở rương nhận ngay 9,999,999 KNB, 9,999,999 Kim Diệp và 99,999,999 Đồng Vàng!',
    attrs: []
  },
  {
    id: 3004, name: 'Trứng Thần Thú Hỏa Kỳ Lân', type: 30, icon: 30, grade: 5, bagIcon: 30,
    reqLv: 1, durability: 1, maxDurability: 1, weight: 5, price: 50000,
    avatarId: 0, starLevel: 10, suitId: 0,
    desc: 'Ấp nở Thần Thú Hỏa Kỳ Lân trợ chiến cùng nhân vật trong mọi trận đánh.',
    attrs: [{ id: 30, value: 2500 }, { id: 26, value: 30000 }]
  },
  {
    id: 3005, name: 'Long Nguyên Châu (Bảo Thạch Tối Thượng Lv10)', type: 35, icon: 35, grade: 5, bagIcon: 35,
    reqLv: 1, durability: 1, maxDurability: 99, weight: 1, price: 20000,
    avatarId: 0, starLevel: 0, suitId: 0,
    desc: 'Mảnh Chân Nguyên Rồng Thần khảm vào trang bị tăng +1000 Công Kích & +10000 HP.',
    attrs: [{ id: 30, value: 1000 }, { id: 26, value: 10000 }]
  }
];

// Skills catalog (Skill.fromBaseBytes compatible)
const skills = [
  {
    id: 101, name: 'Phong Thần Cước', level: 10, type: 1, icon: 1, reqJob: 0, reqLevel: 1,
    consumeMp: 20, learnSp: 10, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 3, range: 3,
    anime1: 101, anime2: 102, anime3: 103,
    powerType1: 1, powerValue1: 3500,
    desc: 'Tuyệt kỹ cước pháp của Nhiếp Phong: Bộ Phong Tróc Ảnh, Phong Trung Kình Thảo, Bão Vũ Cuồng Phong tấn công 3 mục tiêu.'
  },
  {
    id: 102, name: 'Bài Vân Chưởng', level: 10, type: 1, icon: 2, reqJob: 0, reqLevel: 1,
    consumeMp: 25, learnSp: 10, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 3, range: 3,
    anime1: 104, anime2: 105, anime3: 106,
    powerType1: 1, powerValue1: 3800,
    desc: 'Tuyệt kỹ chưởng pháp của Bộ Kinh Vân: Vân Hải Ngọc Cung, Bài Sơn Đảo Hải gây sát thương cực lớn.'
  },
  {
    id: 103, name: 'Thiên Sương Quyền', level: 10, type: 1, icon: 3, reqJob: 0, reqLevel: 1,
    consumeMp: 25, learnSp: 10, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 4, range: 4,
    anime1: 107, anime2: 108, anime3: 109,
    powerType1: 1, powerValue1: 3600,
    desc: 'Tuyệt kỹ hàn băng của Tần Sương, đóng băng toàn bộ đội hình địch.'
  },
  {
    id: 104, name: 'Tam Nguyên Quy Nhất (Hùng Bá)', level: 10, type: 1, icon: 4, reqJob: 0, reqLevel: 1,
    consumeMp: 50, learnSp: 20, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 6, range: 5,
    anime1: 110, anime2: 111, anime3: 112,
    powerType1: 1, powerValue1: 6500,
    desc: 'Dung hợp Phong Thần Cước, Bài Vân Chưởng và Thiên Sương Quyền thành một đòn hủy diệt toàn màn hình.'
  },
  {
    id: 105, name: 'Vạn Kiếm Quy Tông', level: 10, type: 1, icon: 5, reqJob: 1, reqLevel: 1,
    consumeMp: 60, learnSp: 30, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 10, range: 6,
    anime1: 113, anime2: 114, anime3: 115,
    powerType1: 1, powerValue1: 8800,
    desc: 'Cảnh giới tối cao của Kiếm Đạo Vô Danh: vạn thanh thần kiếm đồng loạt hóa khí xuyên thủng mọi kẻ địch.'
  },
  {
    id: 106, name: 'Ngạo Hàn Lục Quyết', level: 10, type: 1, icon: 6, reqJob: 2, reqLevel: 1,
    consumeMp: 35, learnSp: 15, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 4, range: 3,
    anime1: 116, anime2: 117, anime3: 118,
    powerType1: 1, powerValue1: 5200,
    desc: 'Đao pháp gia truyền Nhiếp Gia phối hợp Tuyết Ẩm Đao chém đứt không gian.'
  },
  {
    id: 107, name: 'Kiếm Nhị Thập Tam', level: 10, type: 1, icon: 7, reqJob: 3, reqLevel: 1,
    consumeMp: 70, learnSp: 35, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 10, range: 6,
    anime1: 119, anime2: 120, anime3: 121,
    powerType1: 1, powerValue1: 9500,
    desc: 'Kiếm pháp vượt ngoài tam giới của Kiếm Thánh Độc Cô Kiếm, ngưng đọng thời gian.'
  },
  {
    id: 108, name: 'Thánh Tâm Tứ Tuyệt (Đế Thích Thiên)', level: 10, type: 1, icon: 8, reqJob: 4, reqLevel: 1,
    consumeMp: 55, learnSp: 25, money1: 0, money2: 0, money3: 0,
    targetType: 1, targetNum: 6, range: 5,
    anime1: 122, anime2: 123, anime3: 124,
    powerType1: 1, powerValue1: 7500,
    desc: 'Võ công ngàn năm kết tinh từ máu Phượng Hoàng của Đế Thích Thiên.'
  },
  {
    id: 109, name: 'Phượng Vũ Cửu Thiên (Hồi Phục Thần Thánh)', level: 10, type: 1, icon: 9, reqJob: 5, reqLevel: 1,
    consumeMp: 40, learnSp: 15, money1: 0, money2: 0, money3: 0,
    targetType: 2, targetNum: 5, range: 5,
    anime1: 125, anime2: 126, anime3: 127,
    powerType1: 2, powerValue1: 15000,
    desc: 'Triệu hồi thánh quang Phượng Hoàng hồi phục lượng lớn HP cho toàn bộ đồng đội.'
  },
  {
    id: 110, name: 'Bất Diệt Kim Thân (Bị Động Hộ Thể)', level: 10, type: 0, icon: 10, reqJob: 0, reqLevel: 1,
    consumeMp: 0, learnSp: 10, money1: 0, money2: 0, money3: 0,
    targetType: 0, targetNum: 1, range: 1,
    anime1: 0, anime2: 0, anime3: 0,
    powerType1: 3, powerValue1: 5000,
    desc: 'Nội công thượng thừa vĩnh viễn gia tăng Sinh Lực, Phòng Thủ và Kháng Bạo Kích.'
  }
];

// Maps catalog backed by the 12 tile palettes (0.pn..11.pn) and map animations
const maps = [
  {
    id: 1,
    name: 'Phong Vân Tân Thủ Thôn',
    weather: 1,
    tileSetId: 0,
    width: 24,
    height: 20,
    spawnX: 12,
    spawnY: 10,
    jumpPoints: [
      { gx: 22, gy: 10, targetMapId: 2, targetGx: 3, targetGy: 10, label: 'Đến Thiên Hạ Hội' },
      { gx: 12, gy: 2, targetMapId: 4, targetGx: 12, targetGy: 17, label: 'Đến Lăng Vân Động' },
      { gx: 2, gy: 10, targetMapId: 5, targetGx: 20, targetGy: 10, label: 'Đến Bái Kiếm Sơn Trang' },
      { gx: 12, gy: 18, targetMapId: 6, targetGx: 12, targetGy: 3, label: 'Đến Trung Hoa Các' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Menu Offline)', icon1: 101, gx: 11, gy: 9, dir: 2,
        welcome: 'Chào mừng Đại Hiệp đến với Phong Vân Truyền Kỳ 2 Offline!\nTất cả Vàng, KNB, Thần Khí, Kỹ Năng, Thú Cưỡi đều mở khóa miễn phí 100% tại đây!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: [1, 2, 3]
      },
      {
        id: 2, npcType: 0, name: 'Văn Sửu Sửu (Hướng Dẫn)', icon1: 102, gx: 14, gy: 9, dir: 2,
        welcome: 'Thiên Hạ Hội đang chiêu mộ anh hùng hào kiệt khắp thiên hạ! Hãy nhận nhiệm vụ tân thủ để lên đường.',
        shopIds: [901],
        skillShopId: 1,
        teleportMapIds: [2, 3],
        missions: [1, 2]
      },
      {
        id: 3, npcType: 0, name: 'Thợ Rèn Bái Kiếm (Thần Khí)', icon1: 103, gx: 9, gy: 11, dir: 2,
        welcome: 'Tuyệt Thế Hảo Kiếm và Tuyết Ẩm Cuồng Đao đã ra lò! Đại hiệp muốn chọn thần binh nào?',
        shopIds: [902, 903],
        skillShopId: 0,
        teleportMapIds: [5],
        missions: [3]
      },
      {
        id: 4, npcType: 0, name: 'Vô Danh (Truyền Thừa Võ Học)', icon1: 104, gx: 15, gy: 11, dir: 2,
        welcome: 'Vạn Kiếm Quy Tông, Phong Thần Cước, Bài Vân Chưởng đều nằm trong Tàng Kinh Các này.',
        shopIds: [904],
        skillShopId: 1,
        teleportMapIds: [6, 8],
        missions: []
      },
      {
        id: 5, npcType: 1, name: 'Sơn Tặc Đầu Mục (Tập Luyện)', icon1: 201, gx: 17, gy: 14, dir: 2,
        battleGroupId: 101,
        welcome: 'Muốn qua Phong Vân Thôn phải bước qua lưỡi đao của ta!'
      },
      {
        id: 6, npcType: 1, name: 'Đệ Tử Thiên Hạ Hội', icon1: 202, gx: 7, gy: 14, dir: 2,
        battleGroupId: 102,
        welcome: 'Phụng mệnh Hùng Bá Bang Chủ tuần tra vùng này!'
      }
    ]
  },
  {
    id: 2,
    name: 'Thiên Hạ Hội Tổng Đàn',
    weather: 0,
    tileSetId: 1,
    width: 28,
    height: 22,
    spawnX: 14,
    spawnY: 11,
    jumpPoints: [
      { gx: 2, gy: 10, targetMapId: 1, targetGx: 20, targetGy: 10, label: 'Về Phong Vân Thôn' },
      { gx: 25, gy: 10, targetMapId: 3, targetGx: 3, targetGy: 10, label: 'Đến Vô Song Thành' },
      { gx: 14, gy: 2, targetMapId: 7, targetGx: 14, targetGy: 19, label: 'Đến Vô Tuyệt Thần Cung' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Thiên Hạ Hội)', icon1: 101, gx: 12, gy: 10, dir: 2,
        welcome: 'Menu GM Offline tại Thiên Hạ Hội: Nhận Vàng/KNB, Mua Thần Khí 0 Đồng, Dịch Chuyển Nhanh!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: [1, 2, 3]
      },
      {
        id: 2, npcType: 0, name: 'Bộ Kinh Vân (Đường Chủ Phi Vân Đường)', icon1: 105, gx: 10, gy: 8, dir: 2,
        welcome: 'Không ai được phép chạm vào Khổng Từ! Hãy lĩnh hội Bài Vân Chưởng cùng ta!',
        shopIds: [902],
        skillShopId: 1,
        teleportMapIds: [4, 5],
        missions: [2]
      },
      {
        id: 3, npcType: 0, name: 'Nhiếp Phong (Đường Chủ Thần Phong Đường)', icon1: 106, gx: 18, gy: 8, dir: 2,
        welcome: 'Tâm như chỉ thủy mới khống chế được Ma Đao và Phong Thần Cước!',
        shopIds: [902],
        skillShopId: 1,
        teleportMapIds: [4, 6],
        missions: [2]
      },
      {
        id: 4, npcType: 1, name: 'BOSS Hùng Bá (Bang Chủ Thiên Hạ Hội)', icon1: 205, gx: 14, gy: 6, dir: 2,
        battleGroupId: 201,
        welcome: 'Thành cũng Phong Vân, Bại cũng Phong Vân! Ngươi dám khiêu chiến Tam Nguyên Quy Nhất của lão phu sao?!'
      }
    ]
  },
  {
    id: 3,
    name: 'Vô Song Thành',
    weather: 0,
    tileSetId: 2,
    width: 28,
    height: 22,
    spawnX: 14,
    spawnY: 12,
    jumpPoints: [
      { gx: 2, gy: 10, targetMapId: 2, targetGx: 23, targetGy: 10, label: 'Về Thiên Hạ Hội' },
      { gx: 25, gy: 10, targetMapId: 1, targetGx: 12, targetGy: 10, label: 'Về Phong Vân Thôn' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Vô Song Thành)', icon1: 101, gx: 12, gy: 11, dir: 2,
        welcome: 'Trạm hỗ trợ GM Vô Song Thành!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: []
      },
      {
        id: 2, npcType: 1, name: 'BOSS Kiếm Thánh (Kiếm Nhị Thập Tam)', icon1: 206, gx: 14, gy: 7, dir: 2,
        battleGroupId: 202,
        welcome: 'Hãy đỡ một chiêu Kiếm Nhị Thập Tam của lão phu!'
      }
    ]
  },
  {
    id: 4,
    name: 'Lăng Vân Động (Hang Hỏa Kỳ Lân)',
    weather: 2,
    tileSetId: 3,
    width: 26,
    height: 20,
    spawnX: 13,
    spawnY: 15,
    jumpPoints: [
      { gx: 12, gy: 18, targetMapId: 1, targetGx: 12, targetGy: 4, label: 'Về Phong Vân Thôn' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Lăng Vân Động)', icon1: 101, gx: 11, gy: 14, dir: 2,
        welcome: 'Huyết Bồ Đề và Hỏa Kỳ Lân đang ở phía trước! Nhận trang bị GM trước khi khiêu chiến.',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: []
      },
      {
        id: 2, npcType: 1, name: 'THẦN THÚ Hỏa Kỳ Lân (World Boss)', icon1: 207, gx: 13, gy: 7, dir: 2,
        battleGroupId: 203,
        welcome: 'GRÀOOOO! Lửa cháy ngập tràn Lăng Vân Động!'
      }
    ]
  },
  {
    id: 5,
    name: 'Bái Kiếm Sơn Trang',
    weather: 0,
    tileSetId: 4,
    width: 26,
    height: 20,
    spawnX: 13,
    spawnY: 12,
    jumpPoints: [
      { gx: 22, gy: 10, targetMapId: 1, targetGx: 4, targetGy: 10, label: 'Về Phong Vân Thôn' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Bái Kiếm Sơn Trang)', icon1: 101, gx: 11, gy: 11, dir: 2,
        welcome: 'Nơi rèn đúc Tuyệt Thế Hảo Kiếm!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: [3]
      },
      {
        id: 2, npcType: 1, name: 'BOSS Kiếm Ma & Ngạo Thiên', icon1: 208, gx: 13, gy: 6, dir: 2,
        battleGroupId: 204,
        welcome: 'Tuyệt Thế Hảo Kiếm thuộc về Bái Kiếm Sơn Trang!'
      }
    ]
  },
  {
    id: 6,
    name: 'Trung Hoa Các',
    weather: 1,
    tileSetId: 5,
    width: 24,
    height: 20,
    spawnX: 12,
    spawnY: 12,
    jumpPoints: [
      { gx: 12, gy: 2, targetMapId: 1, targetGx: 12, targetGy: 16, label: 'Về Phong Vân Thôn' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Trung Hoa Các)', icon1: 101, gx: 10, gy: 11, dir: 2,
        welcome: 'Trung Hoa Các - Thánh địa võ lâm Trung Nguyên!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: []
      },
      {
        id: 2, npcType: 1, name: 'Võ Lâm Thần Thoại Vô Danh (Tỉ Thí)', icon1: 209, gx: 12, gy: 7, dir: 2,
        battleGroupId: 205,
        welcome: 'Hãy để ta kiểm chứng kiếm đạo của đại hiệp!'
      }
    ]
  },
  {
    id: 7,
    name: 'Vô Tuyệt Thần Cung',
    weather: 0,
    tileSetId: 6,
    width: 28,
    height: 22,
    spawnX: 14,
    spawnY: 14,
    jumpPoints: [
      { gx: 14, gy: 20, targetMapId: 2, targetGx: 14, targetGy: 4, label: 'Về Thiên Hạ Hội' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Vô Tuyệt Thần Cung)', icon1: 101, gx: 12, gy: 13, dir: 2,
        welcome: 'Trạm tiếp tế GM trước đại chiến Tuyệt Vô Thần!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: []
      },
      {
        id: 2, npcType: 1, name: 'BOSS Tuyệt Vô Thần (Bất Diệt Kim Thân)', icon1: 210, gx: 14, gy: 7, dir: 2,
        battleGroupId: 206,
        welcome: 'Sát Quyền của bản tọa sẽ nghiền nát võ lâm Trung Nguyên!'
      }
    ]
  },
  {
    id: 8,
    name: 'Thiên Môn Thánh Điện',
    weather: 3,
    tileSetId: 7,
    width: 30,
    height: 24,
    spawnX: 15,
    spawnY: 16,
    jumpPoints: [
      { gx: 15, gy: 22, targetMapId: 1, targetGx: 12, targetGy: 10, label: 'Về Phong Vân Thôn' },
      { gx: 15, gy: 2, targetMapId: 9, targetGx: 15, targetGy: 20, label: 'Vào Cửu Không Vô Giới' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Thiên Môn)', icon1: 101, gx: 13, gy: 15, dir: 2,
        welcome: 'Thiên Môn Thánh Điện - Nơi ngự trị của Đế Thích Thiên!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: []
      },
      {
        id: 2, npcType: 1, name: 'BOSS Đế Thích Thiên (Thánh Tâm Quyết)', icon1: 211, gx: 15, gy: 8, dir: 2,
        battleGroupId: 207,
        welcome: 'Ta đã sống gần hai ngàn năm, phàm nhân như ngươi dám nghịch thiên sao?!'
      }
    ]
  },
  {
    id: 9,
    name: 'Cửu Không Vô Giới (Đỉnh Cao Chiến Thần)',
    weather: 2,
    tileSetId: 8,
    width: 30,
    height: 24,
    spawnX: 15,
    spawnY: 18,
    jumpPoints: [
      { gx: 15, gy: 22, targetMapId: 8, targetGx: 15, targetGy: 4, label: 'Về Thiên Môn Thánh Điện' }
    ],
    npcs: [
      {
        id: 1, npcType: 5, name: 'GM Tiên Tử (Cửu Không Vô Giới)', icon1: 101, gx: 13, gy: 17, dir: 2,
        welcome: 'Cửu Không Vô Giới - Đấu trường tối thượng!',
        shopIds: [901, 902, 903, 904],
        skillShopId: 1,
        teleportMapIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        missions: []
      },
      {
        id: 2, npcType: 1, name: 'BOSS Đoạn Lãng Song Long Nguyên (Cấp Thần)', icon1: 212, gx: 15, gy: 8, dir: 2,
        battleGroupId: 208,
        welcome: 'Thôn phệ hai viên Long Nguyên, ta đã là Chân Thần bất tử của thế giới này!'
      }
    ]
  }
];

const shops = {
  901: {
    id: 901,
    name: 'GM Tiệm Phú Quý & Tiếp Tế (0 Đồng)',
    itemIds: [3003, 3002, 3001, 3004, 3005]
  },
  902: {
    id: 902,
    name: 'GM Tiệm Thần Binh Phong Vân (0 Đồng)',
    itemIds: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010]
  },
  903: {
    id: 903,
    name: 'GM Tiệm Chiến Giáp, Cánh & Thời Trang (0 Đồng)',
    itemIds: [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2011]
  },
  904: {
    id: 904,
    name: 'GM Tiệm Thú Cưỡi, Pet & Bảo Thạch (0 Đồng)',
    itemIds: [2010, 3004, 3005, 3001, 3002, 3003]
  }
};

const missions = [
  {
    id: 1,
    name: '[GM] Quà Tân Thủ Phú Quý (9,999,999 Vàng & KNB)',
    level: 1,
    desc: 'Nhận ngay gói hỗ trợ Offline GM: 9,999,999 KNB, 9,999,999 Kim Diệp, 99,999,999 Đồng Vàng và Tuyệt Thế Hảo Kiếm!',
    dialogStart: 'Chào đại hiệp! Hãy nhận ngay gói đặc quyền Offline để thỏa sức hành tẩu giang hồ.',
    dialogComplete: 'Chúc mừng đại hiệp đã nhận toàn bộ kho báu Phong Vân Truyền Kỳ 2!',
    exp: 50000,
    money1: 9999999,
    money2: 9999999,
    money3: 99999999,
    rewardItemIds: [1001, 2009, 2010]
  },
  {
    id: 2,
    name: '[Chính Tuyến] Phong Vân Hợp Bích - Đại Chiến Hùng Bá',
    level: 10,
    desc: 'Tìm gặp Bộ Kinh Vân và Nhiếp Phong tại Thiên Hạ Hội Tổng Đàn, phá giải dã tâm của Hùng Bá.',
    dialogStart: 'Kim Lân Khởi Thị Trì Trung Vật, Nhất Ngộ Phong Vân Tiện Hóa Long!',
    dialogComplete: 'Thiên Hạ Hội đã quy thuận, uy danh của đại hiệp vang dội khắp võ lâm!',
    exp: 250000,
    money1: 500000,
    money2: 500000,
    money3: 5000000,
    rewardItemIds: [1002, 2002]
  },
  {
    id: 3,
    name: '[Thần Khí] Xuất Thế Tuyệt Thế Hảo Kiếm & Tuyết Ẩm Đao',
    level: 30,
    desc: 'Đến Bái Kiếm Sơn Trang nhận thần binh truyền thuyết và lĩnh ngộ Vạn Kiếm Quy Tông.',
    dialogStart: 'Thần binh chỉ nhận bậc anh hùng chân chính làm chủ nhân!',
    dialogComplete: 'Thần binh đã nhận chủ, hãy tiến lên Thiên Môn và Cửu Không Vô Giới!',
    exp: 1000000,
    money1: 1000000,
    money2: 1000000,
    money3: 10000000,
    rewardItemIds: [1004, 3004]
  }
];

const battleGroups = {
  101: {
    id: 101,
    name: 'Đội Sơn Tặc Đầu Mục',
    rewardExp: 15000,
    rewardMoney3: 50000,
    rewardItemId: 3001,
    monsters: [
      { id: 1001, name: 'Sơn Tặc Đầu Mục', level: 10, job: 2, hp: 3500, mp: 500, icon1: 201, atk: 280, def: 120 },
      { id: 1002, name: 'Sơn Tặc Tinh Nhuệ', level: 8, job: 1, hp: 2200, mp: 300, icon1: 202, atk: 200, def: 90 }
    ]
  },
  102: {
    id: 102,
    name: 'Đội Tuần Tra Thiên Hạ Hội',
    rewardExp: 25000,
    rewardMoney3: 80000,
    rewardItemId: 3002,
    monsters: [
      { id: 1003, name: 'Đệ Tử Thần Phong Đường', level: 18, job: 7, hp: 6000, mp: 800, icon1: 202, atk: 420, def: 200 },
      { id: 1004, name: 'Đệ Tử Phi Vân Đường', level: 18, job: 1, hp: 6500, mp: 800, icon1: 203, atk: 450, def: 220 }
    ]
  },
  201: {
    id: 201,
    name: 'BOSS Hùng Bá Thiên Hạ',
    rewardExp: 150000,
    rewardMoney3: 500000,
    rewardItemId: 1008,
    monsters: [
      { id: 2001, name: 'Bang Chủ Hùng Bá', level: 55, job: 9, hp: 45000, mp: 9999, icon1: 205, atk: 1800, def: 900 },
      { id: 2002, name: 'Thiên Trì Quái Hiệp', level: 48, job: 7, hp: 22000, mp: 5000, icon1: 203, atk: 1200, def: 600 }
    ]
  },
  202: {
    id: 202,
    name: 'BOSS Kiếm Thánh Vô Song',
    rewardExp: 200000,
    rewardMoney3: 800000,
    rewardItemId: 1004,
    monsters: [
      { id: 2003, name: 'Kiếm Thánh Độc Cô Kiếm', level: 65, job: 3, hp: 68000, mp: 9999, icon1: 206, atk: 2400, def: 1100 },
      { id: 2004, name: 'Độc Cô Nhất Phương', level: 58, job: 2, hp: 35000, mp: 5000, icon1: 204, atk: 1600, def: 850 }
    ]
  },
  203: {
    id: 203,
    name: 'THẦN THÚ Hỏa Kỳ Lân',
    rewardExp: 350000,
    rewardMoney3: 1500000,
    rewardItemId: 3004,
    monsters: [
      { id: 2005, name: 'Thần Thú Hỏa Kỳ Lân', level: 70, job: 6, hp: 95000, mp: 9999, icon1: 207, atk: 3200, def: 1500 }
    ]
  },
  204: {
    id: 204,
    name: 'BOSS Bái Kiếm Sơn Trang',
    rewardExp: 250000,
    rewardMoney3: 1000000,
    rewardItemId: 1001,
    monsters: [
      { id: 2006, name: 'Kiếm Ma', level: 62, job: 1, hp: 55000, mp: 8000, icon1: 208, atk: 2200, def: 1000 },
      { id: 2007, name: 'Ngạo Thiên Trang Chủ', level: 60, job: 2, hp: 48000, mp: 6000, icon1: 204, atk: 1900, def: 950 }
    ]
  },
  205: {
    id: 205,
    name: 'Võ Lâm Thần Thoại Vô Danh',
    rewardExp: 450000,
    rewardMoney3: 2000000,
    rewardItemId: 1004,
    monsters: [
      { id: 2008, name: 'Thần Thoại Vô Danh', level: 78, job: 1, hp: 120000, mp: 9999, icon1: 209, atk: 3800, def: 1800 }
    ]
  },
  206: {
    id: 206,
    name: 'BOSS Tuyệt Vô Thần',
    rewardExp: 500000,
    rewardMoney3: 2500000,
    rewardItemId: 2002,
    monsters: [
      { id: 2009, name: 'Bá Chủ Tuyệt Vô Thần', level: 80, job: 6, hp: 150000, mp: 9999, icon1: 210, atk: 4200, def: 2400 },
      { id: 2010, name: 'Thiếu Chủ Tuyệt Tâm', level: 72, job: 7, hp: 75000, mp: 8000, icon1: 203, atk: 2800, def: 1400 }
    ]
  },
  207: {
    id: 207,
    name: 'BOSS Đế Thích Thiên',
    rewardExp: 800000,
    rewardMoney3: 5000000,
    rewardItemId: 1007,
    monsters: [
      { id: 2011, name: 'Chí Tôn Đế Thích Thiên', level: 85, job: 4, hp: 220000, mp: 9999, icon1: 211, atk: 5200, def: 2800 }
    ]
  },
  208: {
    id: 208,
    name: 'BOSS Đoạn Lãng Song Long Nguyên',
    rewardExp: 1500000,
    rewardMoney3: 10000000,
    rewardItemId: 3005,
    monsters: [
      { id: 2012, name: 'Ma Thần Đoạn Lãng', level: 85, job: 12, hp: 350000, mp: 9999, icon1: 212, atk: 6500, def: 3500 }
    ]
  }
};

const defaultPlayers = [
  {
    id: 10001,
    name: 'Bộ Kinh Vân',
    sex: 0,
    race: 0,
    job: 1,
    level: 60,
    exp: 125000,
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
    money1: 8888888, // KNB (Vàng)
    money2: 8888888, // Kim Diệp (Lá)
    money3: 99999999, // Đồng (Bạc)
    vipLevel: 12,
    vipExp: 100000,
    mapId: 1,
    gx: 12,
    gy: 10,
    icon1: 1,
    icon2: 12,
    icon3: 45,
    title: 'Bất Khốc Tử Thần',
    countryId: 1,
    countryName: 'Thiên Hạ Hội',
    countryRank: 7,
    equipped: [
      { slotPos: 3, itemId: 1001 },  // Vũ khí: Tuyệt Thế Hảo Kiếm
      { slotPos: 9, itemId: 2001 },  // Nón: Kim Lân Long Mạo
      { slotPos: 10, itemId: 2002 }, // Áo: Bất Diệt Kim Thân Giáp
      { slotPos: 12, itemId: 2004 }, // Giày: Phong Thần Chiến Ngoa
      { slotPos: 17, itemId: 2009 }, // Cánh: Cánh Hỏa Phượng Hoàng
      { slotPos: 21, itemId: 2010 }  // Thú cưỡi: Hỏa Kỳ Lân Tọa Kỵ
    ],
    bag: [
      { slotPos: 30, itemId: 1002, count: 1 },
      { slotPos: 31, itemId: 1003, count: 1 },
      { slotPos: 32, itemId: 1004, count: 1 },
      { slotPos: 33, itemId: 2011, count: 1 },
      { slotPos: 34, itemId: 3001, count: 50 },
      { slotPos: 35, itemId: 3002, count: 20 },
      { slotPos: 36, itemId: 3003, count: 10 },
      { slotPos: 37, itemId: 3004, count: 1 },
      { slotPos: 38, itemId: 3005, count: 10 }
    ],
    skillIds: [101, 102, 103, 104, 105, 109, 110],
    completedMissions: [],
    activeMissions: [1, 2],
    pet: {
      id: 50001,
      name: 'Thần Thú Hỏa Kỳ Lân',
      level: 60,
      job: 6,
      grade: 5,
      age: 10,
      intimate: 100,
      icon1: 207,
      hp: 45000,
      mp: 10000,
      str: 380,
      con: 380,
      agi: 350,
      int: 250,
      wis: 250
    }
  }
];

fs.writeFileSync(path.join(DB_DIR, 'races_jobs.json'), JSON.stringify(racesAndJobs, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'items.json'), JSON.stringify(items, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'skills.json'), JSON.stringify(skills, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'maps.json'), JSON.stringify(maps, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'shops.json'), JSON.stringify(shops, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'missions.json'), JSON.stringify(missions, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'battle_groups.json'), JSON.stringify(battleGroups, null, 2), 'utf8');
fs.writeFileSync(path.join(DB_DIR, 'players.json'), JSON.stringify(defaultPlayers, null, 2), 'utf8');

console.log('Generated editable JSON databases in:', DB_DIR);
