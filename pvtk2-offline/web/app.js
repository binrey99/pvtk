/**
 * Phong Vân Truyền Kỳ 2 ("WorldOL" v1.3 - vn.cmn.bokinhvan v1.0.8)
 * Playable Web Edition Engine (Canvas Map + 34-Pos Turn-Based Battle + Full Systems)
 * Built from REA Reverse Engineering Report (pvtk2_apk_analysis.md)
 */
(function () {
  "use strict";

  const DATA = window.PVTK2_DATA;
  const SAVE_KEY = "PVTK2_WEB_SAVE_V1";

  // Preloaded Image Cache for Canvas & UI
  const imgCache = {};
  function getImg(src) {
    if (!imgCache[src]) {
      const img = new Image();
      img.src = src;
      imgCache[src] = img;
    }
    return imgCache[src];
  }

  // Default Initial Player State preserving all attributes from pvtk2_apk_analysis.md
  function createDefaultPlayer() {
    const equipment = {};
    // Pre-equip starter legendary/artifact gear across the 18 slots
    const starterGear = [
      { pos: 0, name: "Thiên Hoàng Chiến Khôi", typeId: 25, grade: 4, stars: 3, atk: 120, def: 480, hp: 1800, str: 35, sta: 45, gems: [{ stat: "STA", val: 30, lv: 3 }] },
      { pos: 4, name: "Huyền Vũ Bảo Giáp", typeId: 27, grade: 5, stars: 4, atk: 80, def: 950, hp: 4200, sta: 80, agi: 40, dmgReduce: 8, gems: [{ stat: "DEF", val: 150, lv: 4 }] },
      { pos: 9, name: "Tuyệt Thế Hảo Kiếm", typeId: 4, grade: 5, stars: 5, atk: 1650, magicAtk: 600, hit: 85, crit: 95, str: 95, agi: 65, armorBreak: 120, gems: [{ stat: "STR", val: 50, lv: 5 }], enchant: { name: "Phá Giáp +80, Bạo Kích +5%", atk: 80 } },
      { pos: 10, name: "Huyết Ẩm Cuồng Đao", typeId: 3, grade: 5, stars: 4, atk: 1420, hit: 60, crit: 80, str: 85, sta: 50, counter: 6, gems: [{ stat: "STR", val: 40, lv: 4 }] },
      { pos: 12, name: "Phong Thần Chiến Ngoa", typeId: 29, grade: 4, stars: 3, def: 360, speed: 95, dodge: 75, agi: 60, gems: [] },
      { pos: 13, name: "Long Lân Hộ Uyển", typeId: 28, grade: 4, stars: 3, atk: 240, def: 310, hit: 55, str: 40, block: 5, gems: [] },
      { pos: 14, name: "Cửu Thiên Thần Giới", typeId: 18, grade: 5, stars: 4, atk: 480, magicAtk: 480, crit: 65, int: 55, wis: 55, insight: 6, gems: [] },
      { pos: 15, name: "Hỏa Lân Hộ Phù", typeId: 19, grade: 4, stars: 3, hp: 2500, mp: 1800, sta: 50, wis: 60, magicReflect: 5, gems: [] },
      { pos: 16, name: "Xích Hỏa Thần Câu (Tọa Kỵ)", typeId: 21, grade: 5, stars: 4, hp: 3800, speed: 160, atk: 350, str: 50, agi: 70, gems: [] },
      { pos: 17, name: "Huyết Kỳ Lân Thời Trang", typeId: 23, grade: 5, stars: 5, hp: 3000, mp: 2000, atk: 300, def: 400, dmgReduce: 5, gems: [] }
    ];
    starterGear.forEach((g) => {
      equipment[g.pos] = {
        uid: "eq_" + g.pos + "_" + Date.now(),
        identified: true,
        insurance: false,
        ...g
      };
    });

    return {
      id: 10001,
      name: "BộKinhVân",
      race: 0, // 0: Đông Phương (Kiếm Tiên), 1: Tây Phương (Kỵ Sĩ)
      job: 1, // 1: Hiệp Khách
      level: 65,
      cankonLevel: 12, // Cấp Thần Kì (CanKon)
      exp: 42500,
      maxExp: 100000,
      gold: 8500000, // Vàng (Gold)
      silver: 12500000, // Bạc / Đồng (Copper/Silver)
      diamond: 50000, // Kim Cương / KNB
      vip: 9,
      title: "Thiên Hạ Đệ Nhất Hiệp",
      countryRankId: 1, // Quốc Vương
      countryContribution: 48500,
      statPoints: 50,
      skillPoints: 45,
      talentPoints: 25,
      // 5 Core Attributes
      baseStr: 220,
      baseSta: 190,
      baseAgi: 180,
      baseInt: 110,
      baseWis: 120,
      // Current Map & Coords (24x24 grid)
      mapId: 101,
      gridX: 11,
      gridY: 9,
      weatherRain: true,
      // 18 Equipment Slots
      equipment,
      selectedEquipPos: 9,
      // Bag & 9 Mobile Warehouses (Kho di động 1..9)
      bag: [
        { uid: "item_1", name: "Tuyệt Thế Bảo Giáp (Chưa giám định)", typeId: 27, pos: 4, grade: 5, stars: 2, identified: false, atk: 120, def: 1150, hp: 5000, sta: 95, dmgReduce: 10, gems: [] },
        { uid: "item_2", name: "Thiên Tội Thần Đao", typeId: 7, pos: 9, grade: 5, stars: 3, identified: true, atk: 1780, crit: 110, str: 105, armorBreak: 150, gems: [] },
        { uid: "item_3", name: "Vô Song Phổ Nghi", typeId: 15, pos: 9, grade: 4, stars: 3, identified: true, atk: 650, magicAtk: 1550, int: 110, wis: 85, insight: 8, gems: [] },
        { uid: "item_4", name: "Hỏa Diệm Trọng Pháo", typeId: 13, pos: 9, grade: 4, stars: 2, identified: true, atk: 1490, hit: 95, agi: 90, crit: 85, gems: [] }
      ],
      warehouses: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] },
      activeWarehouse: 1,
      // Learned Skills & Talents
      learnedSkills: {
        101: 10,
        102: 8,
        103: 6,
        104: 5,
        105: 5,
        106: 7,
        107: 5,
        108: 5
      },
      talents: {
        atk_1: 5,
        atk_2: 4,
        def_1: 5,
        def_2: 3,
        util_1: 4
      },
      formation: "Tật Phong Trận (+12% Tốc độ, +8% Công kích)",
      // Pets (with real tx_500..tx_548 icons)
      pets: [
        {
          id: 1,
          name: "Hỏa Kỳ Lân",
          icon: "tx_500.png",
          type: "Thần Thú",
          level: 65,
          grow: 185, // Trưởng thành
          comprehension: 12, // Ngộ tính
          rebirths: 2, // Chuyển sinh
          evolved: true, // Tiến hóa
          loyalty: 100,
          active: true,
          str: 260,
          sta: 210,
          agi: 200,
          int: 150,
          wis: 140,
          atk: 2450,
          hp: 18500
        },
        {
          id: 2,
          name: "Băng Phượng Hoàng",
          icon: "tx_512.png",
          type: "Linh Thú",
          level: 60,
          grow: 168,
          comprehension: 10,
          rebirths: 1,
          evolved: true,
          loyalty: 100,
          active: false,
          str: 140,
          sta: 190,
          agi: 230,
          int: 280,
          wis: 240,
          atk: 2320,
          hp: 16200
        },
        {
          id: 3,
          name: "Hắc Long Vương",
          icon: "tx_525.png",
          type: "Thần Thú",
          level: 65,
          grow: 195,
          comprehension: 15,
          rebirths: 3,
          evolved: true,
          loyalty: 100,
          active: false,
          str: 310,
          sta: 260,
          agi: 210,
          int: 180,
          wis: 170,
          atk: 2980,
          hp: 24000
        }
      ],
      // Mercenaries (Lính Đánh Thuê - Mercenary Group)
      mercenaries: [
        { id: 1, name: "Nhiếp Phong (Đao Hoàng)", job: "Chiến Sĩ", level: 65, atk: 2600, hp: 22000, active: true },
        { id: 2, name: "Đệ Nhị Mộng (Kiếm Cơ)", job: "Hiền Giả", level: 64, atk: 2150, hp: 19500, active: true },
        { id: 3, name: "Vô Danh (Thiên Kiếm)", job: "Võ Thánh", level: 65, atk: 2850, hp: 23500, active: false }
      ],
      // Personal City & Country Building Levels
      personalCity: {
        hallLevel: 10,
        mineLevel: 9,
        farmLevel: 9,
        petHouseLevel: 8,
        storedResources: 128000
      },
      countryBuildings: {
        1: 10, 2: 9, 3: 8, 4: 8, 5: 8, 6: 9, 7: 7, 8: 7, 9: 8, 10: 8, 11: 9, 12: 7, 13: 10
      }
    };
  }

  let player = loadState();
  let computedStats = window.computePVTK2Stats(player);
  let currentHP = computedStats.maxHP;
  let currentMP = computedStats.maxMP;

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...createDefaultPlayer(), ...parsed };
      }
    } catch (e) {
      console.warn("Could not load save:", e);
    }
    return createDefaultPlayer();
  }

  function saveState() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(player));
    } catch (e) {
      console.warn("Could not save state:", e);
    }
  }

  // Combat Log helper
  function addLog(msg, cls = "") {
    const box = document.getElementById("combatLogBody");
    if (!box) return;
    const div = document.createElement("div");
    div.className = "log-entry " + cls;
    const time = new Date().toLocaleTimeString("vi-VN", { hour12: false });
    div.textContent = `[${time}] ${msg}`;
    box.appendChild(div);
    while (box.children.length > 120) {
      box.removeChild(box.firstChild);
    }
    box.scrollTop = box.scrollHeight;
  }

  // =========================================================================
  // 1. 5-LAYER HTML5 CANVAS MAP ENGINE & A* PATHFINDING (`findPath`)
  // =========================================================================
  const GRID_COLS = 22;
  const GRID_ROWS = 16;
  const TILE_SIZE = 24;
  let pathQueue = [];
  let pathStepTimer = 0;
  let raindrops = Array.from({ length: 45 }, () => ({
    x: Math.random() * 528,
    y: Math.random() * 384,
    speed: 3 + Math.random() * 3
  }));

  function getCurrentMapMeta() {
    return DATA.MAPS.find((m) => m.id === Number(player.mapId)) || DATA.MAPS[0];
  }

  // Deterministic passability grid per map
  function isCellBlocked(mapId, gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_COLS || gy >= GRID_ROWS) return true;
    // Keep spawn & NPC cells walkable
    if ((gx === 11 && gy === 9) || (gx === 6 && gy === 5) || (gx === 16 && gy === 6) || (gx === 11 && gy === 4)) {
      return false;
    }
    const hash = ((gx * 37 + gy * 53 + mapId * 17) % 29);
    return hash === 0 || hash === 1;
  }

  // A* Pathfinding matching WorldScreen.findPath(startX, startY, endX, endY)
  function findPath(sx, sy, ex, ey) {
    if (isCellBlocked(player.mapId, ex, ey)) return [];
    const open = [{ x: sx, y: sy, g: 0, f: Math.abs(ex - sx) + Math.abs(ey - sy), parent: null }];
    const closed = new Set();
    const dirs = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
      [1, -1], [1, 1], [-1, 1], [-1, -1]
    ];

    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.x === ex && cur.y === ey) {
        const path = [];
        let node = cur;
        while (node.parent) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }
      closed.add(`${cur.x},${cur.y}`);
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = `${nx},${ny}`;
        if (closed.has(key) || isCellBlocked(player.mapId, nx, ny)) continue;
        const g = cur.g + (dx !== 0 && dy !== 0 ? 1.4 : 1);
        const h = Math.abs(ex - nx) + Math.abs(ey - ny);
        const existing = open.find((n) => n.x === nx && n.y === ny);
        if (!existing) {
          open.push({ x: nx, y: ny, g, f: g + h, parent: cur });
        } else if (g < existing.g) {
          existing.g = g;
          existing.f = g + h;
          existing.parent = cur;
        }
      }
    }
    return [];
  }

  // Map Entities (NPCs & Bosses on current map)
  function getMapEntities(mapMeta) {
    return [
      { type: "npc", name: mapMeta.npc, gx: 6, gy: 5, color: "#38bdf8", tileSprite: "assets/pet_icons/tx_501.png" },
      { type: "boss", name: mapMeta.boss, gx: 16, gy: 6, color: "#ef4444", tileSprite: "assets/pet_icons/tx_525.png" },
      { type: "mob", name: "Tinh Anh Hộ Vệ Lv." + mapMeta.level, gx: 15, gy: 12, color: "#f97316", tileSprite: "assets/pet_icons/tx_510.png" },
      { type: "portal", name: "Truyền Tống Trận", gx: 11, gy: 3, color: "#a855f7" }
    ];
  }

  // =========================================================================
  // 2. TURN-BASED BATTLE ENGINE (`Battle.MAX_POS = 34`, 30s Timer, Full Caps)
  // =========================================================================
  const battle = {
    active: false,
    auto: true,
    round: 1,
    timer: 30,
    lastTick: Date.now(),
    bannerImg: null,
    bannerTimer: 0,
    selectedSkillId: 101,
    units: [], // Up to 34 positions (0..16 Left Allies, 17..33 Right Enemies)
    countryWarRound: 0
  };

  function startBattle(enemyGroupTitle, isBoss = false, isCountryWar = false) {
    computedStats = window.computePVTK2Stats(player);
    const mapMeta = getCurrentMapMeta();
    battle.active = true;
    battle.round = 1;
    battle.timer = 30;
    battle.lastTick = Date.now();
    battle.bannerImg = "assets/common/bo.png";
    battle.bannerTimer = 60;
    if (isCountryWar && battle.countryWarRound === 0) {
      battle.countryWarRound = 1;
    }

    const activePet = player.pets.find((p) => p.active) || player.pets[0];
    const activeMercs = player.mercenaries.filter((m) => m.active);

    const units = [];
    // Left Side (Allies: positions 0..16)
    units.push({
      pos: 4,
      side: "ally",
      isPlayer: true,
      name: player.name,
      jobName: DATA.JOBS[player.job].name,
      icon: "assets/pet_icons/tx_504.png",
      hp: computedStats.maxHP,
      maxHP: computedStats.maxHP,
      mp: computedStats.maxMP,
      maxMP: computedStats.maxMP,
      shield: Math.floor(computedStats.maxHP * 0.15),
      manaShield: player.job === 4 || player.job === 2,
      atk: Math.max(computedStats.atkMax, computedStats.magicAtk),
      def: computedStats.def,
      speed: computedStats.speed,
      critPct: computedStats.critPct,
      blockPct: computedStats.blockPct,
      blocksThisTurn: 0,
      counterPct: computedStats.counterPct,
      magicReflectPct: computedStats.magicReflectPct,
      dmgReducePct: computedStats.dmgReducePct,
      insightPct: computedStats.insightPct
    });

    if (activePet) {
      units.push({
        pos: 1,
        side: "ally",
        isPet: true,
        name: activePet.name + " (Pet)",
        icon: "assets/pet_icons/" + activePet.icon,
        hp: activePet.hp,
        maxHP: activePet.hp,
        mp: 2500,
        maxMP: 2500,
        shield: 0,
        manaShield: false,
        atk: activePet.atk,
        def: 850,
        speed: computedStats.speed + 20,
        critPct: 22,
        blockPct: 18,
        blocksThisTurn: 0,
        counterPct: 15,
        magicReflectPct: 10,
        dmgReducePct: 12,
        insightPct: 8
      });
    }

    activeMercs.forEach((m, idx) => {
      units.push({
        pos: idx === 0 ? 7 : 10,
        side: "ally",
        name: m.name,
        icon: idx === 0 ? "assets/pet_icons/tx_518.png" : "assets/pet_icons/tx_532.png",
        hp: m.hp,
        maxHP: m.hp,
        mp: 2000,
        maxMP: 2000,
        shield: 0,
        manaShield: false,
        atk: m.atk,
        def: 900,
        speed: computedStats.speed - 15 * (idx + 1),
        critPct: 18,
        blockPct: 15,
        blocksThisTurn: 0,
        counterPct: 12,
        magicReflectPct: 8,
        dmgReducePct: 10,
        insightPct: 5
      });
    });

    // Right Side (Enemies: positions 17..33)
    const enemyCount = isBoss ? 4 : 3;
    const baseLv = mapMeta.level || 50;
    for (let i = 0; i < enemyCount; i++) {
      const isLeader = i === 0;
      const eHp = (isLeader ? 18000 : 9500) + baseLv * 180;
      units.push({
        pos: 19 + i * 3,
        side: "enemy",
        name: isLeader ? enemyGroupTitle : `Hộ Vệ ${mapMeta.name} #${i}`,
        icon: `assets/pet_icons/tx_${525 + ((mapMeta.id + i * 3) % 22)}.png`,
        hp: eHp,
        maxHP: eHp,
        mp: 3000,
        maxMP: 3000,
        shield: isLeader ? 2500 : 0,
        manaShield: false,
        atk: (isLeader ? 2100 : 1450) + baseLv * 18,
        def: 620 + baseLv * 8,
        speed: 220 + i * 15,
        critPct: isLeader ? 20 : 10,
        blockPct: isLeader ? 22 : 12,
        blocksThisTurn: 0,
        counterPct: isLeader ? 18 : 8,
        magicReflectPct: isLeader ? 12 : 5,
        dmgReducePct: isLeader ? 15 : 5,
        insightPct: isLeader ? 10 : 4
      });
    }

    battle.units = units;
    addLog(`⚔️ Khởi chiến tại [${mapMeta.name}] đối đầu ${enemyGroupTitle}! (Battle.MAX_POS = 34)`, "sys");
    updateBattleControlsUI();
  }

  // Execute one full Turn-Based Round with exact PVTK2 formulas & 70% caps
  function executeBattleRound(manualSkillId) {
    if (!battle.active) return;
    const skillId = manualSkillId || battle.selectedSkillId || 101;
    const skill = DATA.SKILLS.find((s) => s.id === Number(skillId)) || DATA.SKILLS[0];

    // Reset per-round block decay counter (`blocksThisTurn`)
    battle.units.forEach((u) => { u.blocksThisTurn = 0; });

    // Order actors by Speed descending
    const order = [...battle.units].filter((u) => u.hp > 0).sort((a, b) => b.speed - a.speed);

    addLog(`--- Hiệp ${battle.round} (Kỹ năng: ${skill.name} - ${skill.area}) ---`, "sys");

    for (const actor of order) {
      if (actor.hp <= 0) continue;
      const foes = battle.units.filter((u) => u.side !== actor.side && u.hp > 0);
      const allies = battle.units.filter((u) => u.side === actor.side && u.hp > 0);
      if (foes.length === 0) break;

      // Support / Heal skill for Player if selected
      if (actor.isPlayer && skill.type === "Hỗ trợ") {
        allies.forEach((al) => {
          const heal = Math.floor(al.maxHP * 0.25);
          al.hp = Math.min(al.maxHP, al.hp + heal);
          al.shield += Math.floor(al.maxHP * 0.12);
        });
        addLog(`✨ ${actor.name} thi triển [${skill.name}] (${skill.area}): Hồi 25% HP & tạo Hộ Thuẫn cho toàn đội!`, "sys");
        continue;
      }

      const useSkill = actor.isPlayer
        ? skill
        : { name: actor.side === "ally" ? "Tuyệt Kỹ Đồng Đội" : "Ma Sát Trảm", hits: 1, mult: 1.25, type: actor.pos % 2 === 0 ? "Ma pháp" : "Vật lý", area: "Đơn thể" };

      // Target count based on area
      const targetCount = useSkill.area.includes("Bản đồ") || useSkill.area.includes("Chữ thập") || useSkill.area.includes("Hàng") || useSkill.area.includes("9 Ô")
        ? Math.min(foes.length, 3)
        : 1;
      const targets = foes.slice(0, targetCount);

      for (const target of targets) {
        if (target.hp <= 0) continue;
        const hits = useSkill.hits || 1;

        for (let h = 1; h <= hits; h++) {
          if (target.hp <= 0) break;

          // 1. Check Insight (`Thấu Rõ` - nullifies magic & drains caster MP)
          if (useSkill.type === "Ma pháp" && Math.random() * 100 < Math.min(70, target.insightPct)) {
            const mpDrain = Math.min(actor.mp, 350);
            actor.mp = Math.max(0, actor.mp - mpDrain);
            addLog(`👁️ [Thấu Rõ] ${target.name} nhìn thấu ma pháp [${useSkill.name}] của ${actor.name}, hóa giải sát thương và hút ${mpDrain} MP!`, "insight");
            break;
          }

          // 2. Base Damage with multi-hit decay & Defense
          let rawDmg = Math.max(120, (actor.atk * (useSkill.mult || 1.2) / hits) - target.def * 0.42);

          // 3. Critical Hit (`1.5x` base multiplier)
          const isCrit = Math.random() * 100 < actor.critPct;
          if (isCrit) rawDmg *= 1.5;

          // 4. Block (`Đỡ Đòn` - 50% damage reduction, max 70% cap, -10% chance per hit taken in same turn)
          const effectiveBlockChance = Math.max(0, Math.min(70, target.blockPct) - target.blocksThisTurn * 10);
          const isBlock = Math.random() * 100 < effectiveBlockChance;
          if (isBlock) {
            rawDmg *= 0.5;
            target.blocksThisTurn += 1;
          }

          // 5. Damage Reduction (`Miễn Giảm Sát Thương` - hard capped at 70%)
          const dmgRed = Math.min(70, target.dmgReducePct) / 100;
          let finalDmg = Math.max(1, Math.floor(rawDmg * (1 - dmgRed)));

          // 6. Mana Shield (`Pháp Thuẫn`: 1 Damage = 1 MP + 1 Shield) & Shield HP (`Hộ Thuẫn`)
          let absorbedMsg = "";
          if (target.manaShield && target.mp > 0) {
            const mpAbsorb = Math.min(target.mp, Math.floor(finalDmg * 0.5));
            target.mp -= mpAbsorb;
            finalDmg -= mpAbsorb;
            absorbedMsg += ` [Pháp Thuẫn -${mpAbsorb} MP]`;
          }
          if (target.shield > 0 && finalDmg > 0) {
            const shAbsorb = Math.min(target.shield, finalDmg);
            target.shield -= shAbsorb;
            finalDmg -= shAbsorb;
            absorbedMsg += ` [Hộ Thuẫn -${shAbsorb}]`;
          }

          target.hp = Math.max(0, target.hp - finalDmg);
          addLog(
            `${actor.name} -> ${target.name} [${useSkill.name} đòn ${h}/${hits}]: -${finalDmg} HP` +
            (isCrit ? " (BẠO KÍCH 1.5x!)" : "") +
            (isBlock ? ` (ĐỠ ĐÒN -50%, hiệu suất còn ${Math.max(0, effectiveBlockChance - 10)}%)` : "") +
            absorbedMsg,
            isCrit ? "crit" : isBlock ? "block" : ""
          );

          // 7. Magic Reflect (`Phản Phệ Ma Pháp` - max 70% cap)
          if (useSkill.type === "Ma pháp" && target.hp > 0 && Math.random() * 100 < Math.min(70, target.magicReflectPct)) {
            const reflectDmg = Math.max(50, Math.floor(finalDmg * 0.35));
            actor.hp = Math.max(0, actor.hp - reflectDmg);
            addLog(`🔮 [Phản Phệ Ma Pháp] ${target.name} phản lại ${reflectDmg} sát thương phép vào ${actor.name}!`, "insight");
          }

          // 8. Counter-Attack (`Phản Kích` - max 70% cap)
          if (useSkill.type === "Vật lý" && target.hp > 0 && h === hits && Math.random() * 100 < Math.min(70, target.counterPct)) {
            const counterDmg = Math.max(80, Math.floor(target.atk * 0.65));
            actor.hp = Math.max(0, actor.hp - counterDmg);
            addLog(`⚡ [Phản Kích] ${target.name} phản đòn tức khắc gây -${counterDmg} HP lên ${actor.name}!`, "block");
          }
        }
      }
    }

    // Check Victory / Defeat
    const enemiesAlive = battle.units.some((u) => u.side === "enemy" && u.hp > 0);
    const alliesAlive = battle.units.some((u) => u.side === "ally" && u.hp > 0);

    const playerUnit = battle.units.find((u) => u.isPlayer);
    if (playerUnit) {
      currentHP = Math.max(1, playerUnit.hp);
      currentMP = Math.max(0, playerUnit.mp);
    }

    if (!enemiesAlive) {
      battle.bannerImg = "assets/common/bwin.png";
      battle.bannerTimer = 80;
      const expGain = 4800 + player.level * 120;
      const goldGain = 25000 + player.level * 500;
      player.exp += expGain;
      player.gold += goldGain;
      if (player.exp >= player.maxExp) {
        player.level += 1;
        player.exp -= player.maxExp;
        player.statPoints += 5;
        player.skillPoints += 3;
        player.talentPoints += 1;
        addLog(`🎉 THĂNG CẤP! Nhân vật đạt Lv.${player.level} (+5 Điểm tiềm năng, +3 Điểm kỹ năng, +1 Thiên phú)!`, "loot");
      }
      addLog(`🏆 CHIẾN THẮNG! Nhận +${expGain.toLocaleString()} EXP, +${goldGain.toLocaleString()} Vàng!`, "loot");

      if (battle.countryWarRound > 0 && battle.countryWarRound < 10) {
        battle.countryWarRound += 1;
        player.countryContribution += 500;
        addLog(`🏯 [Công Thành Chiến 6001] Vượt qua Hiệp ${battle.countryWarRound - 1}/10! (+500 Cống hiến Quốc gia)`, "loot");
      }

      setTimeout(() => {
        battle.active = false;
        battle.countryWarRound = 0;
        refreshAllUI();
      }, 1100);
    } else if (!alliesAlive) {
      battle.bannerImg = "assets/common/blost.png";
      battle.bannerTimer = 80;
      addLog(`💀 Chiến bại! Nhân vật được hồi phục tại thành chính.`, "crit");
      setTimeout(() => {
        battle.active = false;
        currentHP = computedStats.maxHP;
        currentMP = computedStats.maxMP;
        refreshAllUI();
      }, 1100);
    } else {
      battle.round += 1;
      battle.timer = 30;
    }

    saveState();
    updateTopHUD();
    updateBattleControlsUI();
  }

  // =========================================================================
  // 3. CANVAS RENDER LOOP (5-Layer World Map + 34-Slot Turn-Based Battle View)
  // =========================================================================
  function initCanvas() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;

      if (battle.active) {
        // Clicking in battle triggers immediate round
        executeBattleRound();
        return;
      }

      const gx = Math.floor(cx / TILE_SIZE);
      const gy = Math.floor(cy / TILE_SIZE);
      const mapMeta = getCurrentMapMeta();
      const entities = getMapEntities(mapMeta);
      const clickedEntity = entities.find((en) => Math.abs(en.gx - gx) <= 1 && Math.abs(en.gy - gy) <= 1);

      const path = findPath(player.gridX, player.gridY, gx, gy);
      if (path.length > 0) {
        pathQueue = path;
        addLog(`🧭 A* Auto-Pathfinding tới tọa độ (${gx}, ${gy}) [${path.length} bước]...`);
      } else if (!isCellBlocked(player.mapId, gx, gy)) {
        player.gridX = gx;
        player.gridY = gy;
      }

      if (clickedEntity) {
        if (clickedEntity.type === "boss" || clickedEntity.type === "mob") {
          setTimeout(() => startBattle(clickedEntity.name, clickedEntity.type === "boss"), 350);
        } else if (clickedEntity.type === "npc") {
          addLog(`💬 NPC [${clickedEntity.name}]: "Chào mừng đại hiệp ${player.name} đến với ${mapMeta.name}! Hãy giữ vững bá nghiệp Phong Vân!"`, "sys");
        } else if (clickedEntity.type === "portal") {
          const idx = DATA.MAPS.findIndex((m) => m.id === Number(player.mapId));
          const nextMap = DATA.MAPS[(idx + 1) % DATA.MAPS.length];
          player.mapId = nextMap.id;
          addLog(`🌀 Truyền tống sang bản đồ [${nextMap.id}] ${nextMap.name}!`, "sys");
          refreshAllUI();
        }
      }
    });

    function renderLoop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mapMeta = getCurrentMapMeta();

      if (!battle.active) {
        // Step along A* path
        pathStepTimer++;
        if (pathQueue.length > 0 && pathStepTimer % 6 === 0) {
          const next = pathQueue.shift();
          player.gridX = next.x;
          player.gridY = next.y;
          const coordEl = document.getElementById("mapCoordsLabel");
          if (coordEl) coordEl.textContent = `Tọa độ: (${player.gridX}, ${player.gridY}) | Zone: ${mapMeta.zone}`;
        }

        // LAYER 1: Ground Tile Grid (using unpacked real PNG tiles from 1.pd)
        const groundImg = getImg("assets/map_tiles/tile_1.png");

        for (let y = 0; y < GRID_ROWS; y++) {
          for (let x = 0; x < GRID_COLS; x++) {
            const blocked = isCellBlocked(player.mapId, x, y);
            ctx.fillStyle = blocked ? "#141e33" : ((x + y) % 2 === 0 ? "#0f2922" : "#123027");
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            if (groundImg.complete && groundImg.naturalWidth > 0 && !blocked) {
              ctx.globalAlpha = 0.32;
              ctx.drawImage(groundImg, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              ctx.globalAlpha = 1.0;
            }
            ctx.strokeStyle = "rgba(255,255,255,0.04)";
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }

        // LAYER 2: Real Unpacked Scenery / Building Tiles from `assets/map_tiles/`
        const decors = [
          { gx: 2, gy: 2, w: 72, h: 72, tile: "assets/map_tiles/tile_10.png" },
          { gx: 17, gy: 2, w: 72, h: 72, tile: "assets/map_tiles/tile_100.png" },
          { gx: 3, gy: 11, w: 64, h: 64, tile: "assets/map_tiles/tile_102.png" }
        ];
        decors.forEach((d) => {
          const im = getImg(d.tile);
          if (im.complete && im.naturalWidth > 0) {
            ctx.drawImage(im, d.gx * TILE_SIZE, d.gy * TILE_SIZE, d.w, d.h);
          }
        });

        // Draw A* Path Preview
        if (pathQueue.length > 0) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.38)";
          pathQueue.forEach((pt) => {
            ctx.fillRect(pt.x * TILE_SIZE + 4, pt.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          });
        }

        // LAYER 3: Z-Sorted Entities (NPCs, Bosses, Active Pet, Player)
        const entities = getMapEntities(mapMeta);
        entities.forEach((en) => {
          const ex = en.gx * TILE_SIZE;
          const ey = en.gy * TILE_SIZE;
          if (en.tileSprite) {
            const sp = getImg(en.tileSprite);
            if (sp.complete && sp.naturalWidth > 0) {
              ctx.drawImage(sp, ex - 6, ey - 10, 36, 36);
            }
          } else {
            ctx.fillStyle = en.color;
            ctx.beginPath();
            ctx.arc(ex + 12, ey + 12, 11, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#000";
          ctx.fillRect(ex - 28, ey - 22, 84, 13);
          ctx.fillStyle = en.color;
          ctx.font = "bold 10px Segoe UI";
          ctx.textAlign = "center";
          ctx.fillText(en.name.slice(0, 16), ex + 12, ey - 12);
        });

        // Active Pet following Player
        const activePet = player.pets.find((p) => p.active);
        if (activePet) {
          const px = Math.max(0, player.gridX - 1) * TILE_SIZE;
          const py = player.gridY * TILE_SIZE;
          const petIm = getImg("assets/pet_icons/" + activePet.icon);
          if (petIm.complete && petIm.naturalWidth > 0) {
            ctx.drawImage(petIm, px - 4, py - 6, 30, 30);
          }
        }

        // Player Avatar
        const plX = player.gridX * TILE_SIZE;
        const plY = player.gridY * TILE_SIZE;
        const plIm = getImg("assets/pet_icons/tx_504.png");
        if (plIm.complete && plIm.naturalWidth > 0) {
          ctx.drawImage(plIm, plX - 8, plY - 12, 40, 40);
        }
        ctx.strokeStyle = "#f6c453";
        ctx.lineWidth = 2;
        ctx.strokeRect(plX - 6, plY - 10, 36, 36);

        // LAYER 4: Overhead Title & Nameplate
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(plX - 38, plY - 30, 100, 16);
        ctx.fillStyle = "#f6c453";
        ctx.font = "bold 10.5px Segoe UI";
        ctx.textAlign = "center";
        ctx.fillText(`[Lv.${player.level}] ${player.name}`, plX + 12, plY - 19);

        // LAYER 5: Weather Particle Overlay (`flow.png` / Rain)
        if (player.weatherRain) {
          ctx.strokeStyle = "rgba(147, 197, 253, 0.45)";
          ctx.lineWidth = 1.2;
          raindrops.forEach((r) => {
            ctx.beginPath();
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.x - 3, r.y + 9);
            ctx.stroke();
            r.y += r.speed;
            r.x -= 0.8;
            if (r.y > canvas.height) {
              r.y = -10;
              r.x = Math.random() * canvas.width;
            }
          });
        }
      } else {
        // =====================================================================
        // TURN-BASED BATTLE SCENE (`Battle.MAX_POS = 34`, 30s Round Timer)
        // =====================================================================
        const now = Date.now();
        if (now - battle.lastTick >= 1000) {
          battle.lastTick = now;
          battle.timer = Math.max(0, battle.timer - 1);
          if (battle.auto || battle.timer === 0) {
            executeBattleRound();
          }
        }

        // Battle Arena Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, "#1e1b4b");
        bgGrad.addColorStop(0.5, "#0f172a");
        bgGrad.addColorStop(1, "#172554");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Top Battle HUD bar
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, 32);
        ctx.fillStyle = "#f6c453";
        ctx.font = "bold 12px Segoe UI";
        ctx.textAlign = "left";
        ctx.fillText(
          `⚔️ HIỆP ${battle.round} | Đếm ngược: ${battle.timer}s | Vị trí tối đa: Battle.MAX_POS = 34`,
          12,
          20
        );

        // Render Allies (Left) & Enemies (Right)
        const allies = battle.units.filter((u) => u.side === "ally");
        const enemies = battle.units.filter((u) => u.side === "enemy");

        function drawUnit(u, x, y) {
          ctx.save();
          if (u.hp <= 0) ctx.globalAlpha = 0.28;
          ctx.fillStyle = u.side === "ally" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";
          ctx.strokeStyle = u.side === "ally" ? "#22c55e" : "#ef4444";
          ctx.lineWidth = 1.5;
          ctx.fillRect(x, y, 135, 62);
          ctx.strokeRect(x, y, 135, 62);

          const ic = getImg(u.icon);
          if (ic.complete && ic.naturalWidth > 0) {
            ctx.drawImage(ic, x + 6, y + 12, 38, 38);
          }

          ctx.fillStyle = "#fff";
          ctx.font = "bold 10.5px Segoe UI";
          ctx.textAlign = "left";
          ctx.fillText(`[Pos ${u.pos}] ${u.name.slice(0, 13)}`, x + 48, y + 16);

          // HP Bar
          const hpRatio = Math.max(0, Math.min(1, u.hp / u.maxHP));
          ctx.fillStyle = "#090d16";
          ctx.fillRect(x + 48, y + 23, 80, 9);
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(x + 48, y + 23, 80 * hpRatio, 9);
          ctx.fillStyle = "#fff";
          ctx.font = "9px Consolas";
          ctx.fillText(`${u.hp}/${u.maxHP}`, x + 50, y + 31);

          // MP / Shield Bar
          const mpRatio = Math.max(0, Math.min(1, u.mp / Math.max(1, u.maxMP)));
          ctx.fillStyle = "#090d16";
          ctx.fillRect(x + 48, y + 36, 80, 7);
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(x + 48, y + 36, 80 * mpRatio, 7);

          ctx.fillStyle = "#facc15";
          ctx.font = "9.5px Segoe UI";
          ctx.fillText(`Thuẫn: ${u.shield} | Đỡ: ${u.blockPct}%`, x + 48, y + 55);
          ctx.restore();
        }

        allies.forEach((u, idx) => drawUnit(u, 22, 46 + idx * 78));
        enemies.forEach((u, idx) => drawUnit(u, canvas.width - 160, 46 + idx * 78));

        // Draw Unpacked Battle Banner (`bo.png`, `bwin.png`, `blost.png`)
        if (battle.bannerImg && battle.bannerTimer > 0) {
          battle.bannerTimer--;
          const bIm = getImg(battle.bannerImg);
          if (bIm.complete && bIm.naturalWidth > 0) {
            ctx.drawImage(bIm, canvas.width / 2 - 70, canvas.height / 2 - 40, 140, 80);
          }
        }
      }

      requestAnimationFrame(renderLoop);
    }

    requestAnimationFrame(renderLoop);
  }

  // =========================================================================
  // 4. UI PANELS & ALL GAMEPLAY SYSTEMS FROM `pvtk2_apk_analysis.md`
  // =========================================================================
  function updateTopHUD() {
    computedStats = window.computePVTK2Stats(player);
    currentHP = Math.min(currentHP, computedStats.maxHP);
    currentMP = Math.min(currentMP, computedStats.maxMP);

    const raceName = DATA.RACES[player.race]?.name || "Đông Phương";
    const jobName = DATA.JOBS[player.job]?.name || "Hiệp Khách";
    const rankObj = DATA.COUNTRY_RANKS.find((r) => r.id === player.countryRankId) || DATA.COUNTRY_RANKS[10];

    document.getElementById("hudCharSummary").textContent =
      `${player.name} | Lv.${player.level} (Thần Kì +${player.cankonLevel}) | ${raceName} - ${jobName} | Quan chức: ${rankObj.name} | VIP ${player.vip}`;

    const hpPct = Math.round((currentHP / computedStats.maxHP) * 100);
    const mpPct = Math.round((currentMP / computedStats.maxMP) * 100);
    const expPct = Math.min(100, Math.round((player.exp / player.maxExp) * 100));

    document.getElementById("hudHpFill").style.width = `${hpPct}%`;
    document.getElementById("hudHpLabel").textContent = `HP: ${currentHP.toLocaleString()} / ${computedStats.maxHP.toLocaleString()}`;
    document.getElementById("hudMpFill").style.width = `${mpPct}%`;
    document.getElementById("hudMpLabel").textContent = `MP: ${currentMP.toLocaleString()} / ${computedStats.maxMP.toLocaleString()}`;
    document.getElementById("hudExpFill").style.width = `${expPct}%`;
    document.getElementById("hudExpLabel").textContent = `EXP: ${expPct}%`;

    document.getElementById("hudGold").textContent = player.gold.toLocaleString();
    document.getElementById("hudSilver").textContent = player.silver.toLocaleString();
    document.getElementById("hudDiamond").textContent = player.diamond.toLocaleString();

    const mapMeta = getCurrentMapMeta();
    document.getElementById("mapTitleLabel").textContent = `[Map ${mapMeta.id}] ${mapMeta.name} (Lv.${mapMeta.level})`;
    document.getElementById("mapCoordsLabel").textContent = `Tọa độ: (${player.gridX}, ${player.gridY}) | Zone: ${mapMeta.zone}`;
  }

  function updateBattleControlsUI() {
    const btnAuto = document.getElementById("btnToggleAutoBattle");
    if (btnAuto) {
      btnAuto.textContent = `Auto Chiến Đấu: ${battle.auto ? "BẬT" : "TẮT"}`;
      btnAuto.className = battle.auto ? "btn btn-green btn-sm" : "btn btn-sm";
    }
  }

  // TAB 1: CHARACTER, 5 BASE STATS, 36 SECONDARY STATS, FREE JOB CHANGE (`Chuyển Phái Tự Do`)
  function renderCharacterTab() {
    computedStats = window.computePVTK2Stats(player);
    const container = document.getElementById("pane-char");
    if (!container) return;

    const jobInfo = DATA.JOBS[player.job] || DATA.JOBS[1];
    const raceInfo = DATA.RACES[player.race] || DATA.RACES[0];

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>1. Thuộc Tính Cơ Bản & Chuyển Phái Tự Do</span>
            <span class="badge">Điểm tiềm năng: ${player.statPoints}</span>
          </h3>
          <div style="margin-bottom:8px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            <label>Chủng tộc:</label>
            <select id="selRace">
              ${Object.values(DATA.RACES).map((r) => `<option value="${r.id}" ${r.id === player.race ? "selected" : ""}>${r.name} (${r.desc})</option>`).join("")}
            </select>
            <label>Chuyển Phái (Hoàn 100% SP):</label>
            <select id="selJob">
              ${Object.values(DATA.JOBS).map((j) => `<option value="${j.id}" ${j.id === player.job ? "selected" : ""}>[${j.id}] ${j.name}</option>`).join("")}
            </select>
          </div>
          <p style="font-size:11.5px; color:var(--text-muted); margin-bottom:8px;">
            Đặc tính phái <b>${jobInfo.name}</b>: ${jobInfo.desc} | Tỷ lệ tăng trưởng (STR/STA/AGI/INT/WIS): <code>${raceInfo.weights.join(" / ")}</code>
          </p>
          <div class="stat-list">
            ${[
              ["STR (Lực lượng)", "baseStr", computedStats.str],
              ["STA (Thể chất)", "baseSta", computedStats.sta],
              ["AGI (Thân pháp)", "baseAgi", computedStats.agi],
              ["INT (Trí lực)", "baseInt", computedStats.int],
              ["WIS (Tinh thần)", "baseWis", computedStats.wis],
              ["Cấp Thần Kì (CanKon)", "cankonLevel", player.cankonLevel]
            ].map(([label, key, total]) => `
              <div class="stat-row">
                <span class="k">${label}</span>
                <span>
                  <b class="v">${total}</b>
                  <button class="btn btn-gold btn-sm" data-add-stat="${key}" style="margin-left:4px;">+5</button>
                </span>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>2. Bảng Công Thức Quy Đổi & Giới Hạn Trần 70%</span>
            <span class="badge">PlayerInfoUIAction</span>
          </h3>
          <div class="stat-list">
            <div class="stat-row"><span class="k">HP Tối đa</span><span class="v">${computedStats.maxHP.toLocaleString()}</span></div>
            <div class="stat-row"><span class="k">MP Tối đa</span><span class="v">${computedStats.maxMP.toLocaleString()}</span></div>
            <div class="stat-row"><span class="k">Công Vật Lý</span><span class="v">${computedStats.atkMin} - ${computedStats.atkMax}</span></div>
            <div class="stat-row"><span class="k">Công Ma Pháp</span><span class="v">${computedStats.magicAtk}</span></div>
            <div class="stat-row"><span class="k">Phòng Thủ (DEF)</span><span class="v">${computedStats.def}</span></div>
            <div class="stat-row"><span class="k">Tốc Độ Xuất Chiêu</span><span class="v">${computedStats.speed}</span></div>
            <div class="stat-row"><span class="k">Chính Xác (Hit)</span><span class="v">${computedStats.hit} (${computedStats.hitPct}%)</span></div>
            <div class="stat-row"><span class="k">Né Tránh (Dodge)</span><span class="v">${computedStats.dodge} (${computedStats.dodgePct}%)</span></div>
            <div class="stat-row"><span class="k">Bạo Kích (Crit 1.5x)</span><span class="v">${computedStats.crit} (${computedStats.critPct}%)</span></div>
            <div class="stat-row"><span class="k">Phá Giáp (Armor Break)</span><span class="v">${computedStats.armorBreak}</span></div>
            <div class="stat-row"><span class="k">Đỡ Đòn (Trần 70%, -10%/đòn)</span><span class="v capped">${computedStats.blockPct}% / 70%</span></div>
            <div class="stat-row"><span class="k">Phản Kích (Trần 70%)</span><span class="v capped">${computedStats.counterPct}% / 70%</span></div>
            <div class="stat-row"><span class="k">Phản Phệ Phép (Trần 70%)</span><span class="v capped">${computedStats.magicReflectPct}% / 70%</span></div>
            <div class="stat-row"><span class="k">Miễn Giảm Sát Thương (Trần 70%)</span><span class="v capped">${computedStats.dmgReducePct}% / 70%</span></div>
            <div class="stat-row"><span class="k">Thấu Rõ (Hóa giải phép & Hút MP)</span><span class="v capped">${computedStats.insightPct}% / 70%</span></div>
            <div class="stat-row"><span class="k">Kháng Bạo / Xuyên Phép</span><span class="v">${computedStats.toughness} / ${computedStats.magicPen}</span></div>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#selRace")?.addEventListener("change", (e) => {
      player.race = Number(e.target.value);
      addLog(`🧬 Đổi chủng tộc sang [${DATA.RACES[player.race].name}]!`, "sys");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#selJob")?.addEventListener("change", (e) => {
      player.job = Number(e.target.value);
      player.skillPoints = Math.max(player.skillPoints, 45);
      addLog(`🔄 Chuyển Phái Tự Do sang [${DATA.JOBS[player.job].name}] — Hoàn trả 100% Điểm Kỹ Năng!`, "sys");
      saveState();
      refreshAllUI();
    });

    container.querySelectorAll("[data-add-stat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-add-stat");
        if (key === "cankonLevel") {
          player.cankonLevel += 1;
          addLog(`🌟 Đột phá Cấp Thần Kì (CanKon) lên +${player.cankonLevel}!`, "loot");
        } else if (player.statPoints >= 5) {
          player[key] += 5;
          player.statPoints -= 5;
        } else {
          player[key] += 5;
        }
        saveState();
        refreshAllUI();
      });
    });
  }

  // TAB 2: 18 EQUIPMENT SLOTS, 30 WEAPON TYPES, CRAFTING (STAR UPGRADE, GEM, ENCHANT, FURNACE)
  function renderEquipTab() {
    const container = document.getElementById("pane-equip");
    if (!container) return;

    const selectedItem = player.equipment[player.selectedEquipPos];

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>18 Ô Trang Bị Chuẩn (EQUIP_POS_0 .. 17)</span>
            <span class="badge">6 Phẩm chất & 30 Vũ khí</span>
          </h3>
          <div class="equip-grid">
            ${DATA.EQUIP_SLOTS.map((slot) => {
              const eq = player.equipment[slot.pos];
              const isSel = Number(player.selectedEquipPos) === slot.pos;
              const gradeCls = eq ? `grade-${eq.grade}` : "";
              const stars = eq ? "★".repeat(eq.stars || 0) : "";
              return `
                <div class="equip-slot ${isSel ? "selected" : ""}" data-eq-pos="${slot.pos}">
                  <span class="slot-pos">[${slot.pos}] ${slot.name}</span>
                  <span class="slot-item ${gradeCls}">${eq ? eq.name : "<i>(Trống)</i>"}</span>
                  <span class="slot-meta">${eq ? `${stars} ${DATA.ITEM_GRADES[eq.grade]?.name || ""}` : ""}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>Rèn Đúc: Cường Hóa Sao, Khảm Ngọc, Phụ Ma & Lò Luyện</span>
            <span class="badge">10,000 Đồng / Phụ Ma</span>
          </h3>
          ${selectedItem ? `
            <div style="margin-bottom:10px; padding:8px; background:#091020; border:1px solid var(--border-gold); border-radius:6px;">
              <div class="grade-${selectedItem.grade}" style="font-size:14px; font-weight:700;">
                ${selectedItem.name} ${"★".repeat(selectedItem.stars || 0)}
              </div>
              <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">
                Phẩm chất: <b>${DATA.ITEM_GRADES[selectedItem.grade]?.name}</b> |
                Giám định: <b>${selectedItem.identified ? "Đã giám định" : "Chưa giám định"}</b>
              </div>
              <div style="margin-top:6px; font-size:12px;">
                Công: <b>+${selectedItem.atk || 0}</b> | Thủ: <b>+${selectedItem.def || 0}</b> | HP: <b>+${selectedItem.hp || 0}</b> |
                Ngọc đã khảm: <b>${(selectedItem.gems || []).map((g) => `${g.stat}+${g.val} (Lv.${g.lv})`).join(", ") || "Chưa có"}</b>
              </div>
              <div style="margin-top:4px; font-size:11.5px; color:var(--accent-cyan);">
                Phụ Ma (Enchant): <b>${selectedItem.enchant ? selectedItem.enchant.name : "Chưa phụ ma"}</b>
              </div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
              <button class="btn btn-gold" id="btnStarUp">⭐ Thăng Sao (${(selectedItem.stars || 0) + 1}★)</button>
              <button class="btn btn-green" id="btnStarUpInsured">🛡️ Thăng Sao + Bảo Hiểm</button>
              <button class="btn btn-purple" id="btnInlayGem">💎 Khảm Bảo Thạch Lv.5</button>
              <button class="btn" id="btnEnchant">✨ Phụ Ma (10,000 Đồng)</button>
              <button class="btn" id="btnFurnace">🔥 Lò Luyện Đổi Phẩm Chất Đỏ</button>
            </div>
          ` : `<p>Hãy chọn một ô trang bị bên trái để cường hóa.</p>`}

          <h3><span>Danh Mục 30 Loại Vũ Khí & Trang Bị (Define.ITEM_TYPE_*)</span></h3>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <select id="selForgeWeaponType">
              ${DATA.WEAPON_TYPES.map((w) => `<option value="${w.id}">[ID ${w.id}] ${w.name} (${w.hand})</option>`).join("")}
            </select>
            <button class="btn btn-gold btn-sm" id="btnCraftWeapon">⚒️ Chế Tạo Thần Binh Vào Túi</button>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll("[data-eq-pos]").forEach((el) => {
      el.addEventListener("click", () => {
        player.selectedEquipPos = Number(el.getAttribute("data-eq-pos"));
        renderEquipTab();
      });
    });

    container.querySelector("#btnStarUp")?.addEventListener("click", () => {
      if (!selectedItem) return;
      if ((selectedItem.stars || 0) >= 5) {
        addLog(`⭐ [${selectedItem.name}] đã đạt tối đa 5 Sao!`, "loot");
        return;
      }
      const success = Math.random() < 0.75;
      if (success) {
        selectedItem.stars = (selectedItem.stars || 0) + 1;
        addLog(`⭐ Thăng sao thành công! [${selectedItem.name}] đạt ${selectedItem.stars}★ (+15% thuộc tính)!`, "loot");
      } else {
        selectedItem.stars = Math.max(0, (selectedItem.stars || 0) - 1);
        addLog(`💥 Thăng sao thất bại! [${selectedItem.name}] bị rớt xuống ${selectedItem.stars}★ (Nên dùng Bảo Hiểm Cường Hóa)!`, "crit");
      }
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnStarUpInsured")?.addEventListener("click", () => {
      if (!selectedItem) return;
      selectedItem.stars = Math.min(5, (selectedItem.stars || 0) + 1);
      addLog(`🛡️ [Bảo Hiểm Cường Hóa] Thăng sao an toàn! [${selectedItem.name}] đạt ${selectedItem.stars}★!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnInlayGem")?.addEventListener("click", () => {
      if (!selectedItem) return;
      selectedItem.gems = selectedItem.gems || [];
      selectedItem.gems.push({ stat: "STR", val: 55, lv: 5 });
      addLog(`💎 Khảm thành công Bảo Thạch Lực Lượng Lv.5 (+55 STR) vào [${selectedItem.name}]!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnEnchant")?.addEventListener("click", () => {
      if (!selectedItem) return;
      player.silver = Math.max(0, player.silver - 10000);
      const rolls = [
        { name: "Cuồng Bạo (+180 Công, +6% Bạo Kích)", atk: 180 },
        { name: "Thiên Cang (+240 Công, +8% Đỡ Đòn)", atk: 240 },
        { name: "Phá Quân (+320 Công, +150 Phá Giáp)", atk: 320 }
      ];
      const pick = rolls[Math.floor(Math.random() * rolls.length)];
      selectedItem.enchant = pick;
      selectedItem.atk = (selectedItem.atk || 0) + pick.atk;
      addLog(`✨ Phụ Ma (tiêu 10,000 Đồng): [${selectedItem.name}] nhận dòng [${pick.name}]!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnFurnace")?.addEventListener("click", () => {
      if (!selectedItem) return;
      selectedItem.grade = 5;
      selectedItem.atk = (selectedItem.atk || 200) + 350;
      addLog(`🔥 [Lò Luyện] Dung luyện [${selectedItem.name}] lên Phẩm chất Đỏ (Thần Khí) +350 Công!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnCraftWeapon")?.addEventListener("click", () => {
      const sel = container.querySelector("#selForgeWeaponType");
      const typeId = Number(sel?.value || 4);
      const wType = DATA.WEAPON_TYPES.find((w) => w.id === typeId) || DATA.WEAPON_TYPES[3];
      const newWeapon = {
        uid: "wp_" + Date.now(),
        name: `Thần Binh ${wType.name}`,
        typeId: wType.id,
        pos: 9,
        grade: 5,
        stars: 4,
        identified: true,
        atk: 1850,
        crit: 100,
        str: 95,
        agi: 75,
        gems: [{ stat: "STR", val: 50, lv: 5 }]
      };
      player.bag.push(newWeapon);
      addLog(`⚒️ Đã chế tạo [${newWeapon.name}] (${wType.hand}) vào Túi đồ!`, "loot");
      saveState();
      refreshAllUI();
    });
  }

  // TAB 3: BAG & 9 MOBILE WAREHOUSES (`Kho di động 1..9`)
  function renderBagTab() {
    const container = document.getElementById("pane-bag");
    if (!container) return;

    const whNum = player.activeWarehouse || 1;
    const whItems = player.warehouses[whNum] || [];

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>Túi Đồ Nhân Vật (${player.bag.length} vật phẩm)</span>
            <span class="badge">Giám định & Trang bị</span>
          </h3>
          <div class="bag-grid">
            ${player.bag.map((it, idx) => `
              <div class="bag-item">
                <div class="grade-${it.grade}" style="font-weight:700;">${it.name} ${"★".repeat(it.stars || 0)}</div>
                <div style="font-size:11px; color:var(--text-muted);">
                  Ô: [${it.pos ?? 9}] | Công: +${it.atk || 0} | Thủ: +${it.def || 0}
                </div>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                  ${!it.identified ? `<button class="btn btn-gold btn-sm" data-bag-id="${idx}">🔍 Giám định</button>` : ""}
                  <button class="btn btn-green btn-sm" data-bag-equip="${idx}">Mặc</button>
                  <button class="btn btn-sm" data-bag-store="${idx}">Cất Kho ${whNum}</button>
                </div>
              </div>
            `).join("") || `<p>Túi đồ đang trống.</p>`}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>Hệ Thống 9 Kho Di Động (Kho di động 1 .. 9)</span>
            <select id="selWarehouse">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<option value="${n}" ${n === whNum ? "selected" : ""}>Kho di động ${n} (${(player.warehouses[n] || []).length} món)</option>`).join("")}
            </select>
          </h3>
          <div class="bag-grid">
            ${whItems.map((it, idx) => `
              <div class="bag-item">
                <div class="grade-${it.grade}" style="font-weight:700;">${it.name} ${"★".repeat(it.stars || 0)}</div>
                <div style="font-size:11px; color:var(--text-muted);">Công: +${it.atk || 0} | Thủ: +${it.def || 0}</div>
                <button class="btn btn-gold btn-sm" data-wh-take="${idx}">Lấy Ra Túi</button>
              </div>
            `).join("") || `<p style="color:var(--text-muted);">Kho di động ${whNum} đang trống. Có thể cất trang bị từ Túi sang bất kỳ Kho 1..9 nào!</p>`}
          </div>
        </div>
      </div>
    `;

    container.querySelector("#selWarehouse")?.addEventListener("change", (e) => {
      player.activeWarehouse = Number(e.target.value);
      renderBagTab();
    });

    container.querySelectorAll("[data-bag-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-bag-id"));
        const item = player.bag[idx];
        if (item) {
          item.identified = true;
          item.name = item.name.replace(" (Chưa giám định)", "");
          item.atk = (item.atk || 100) + 250;
          addLog(`🔍 Giám định thành công [${item.name}] — Phát hiện thuộc tính ẩn +250 Công!`, "loot");
          saveState();
          refreshAllUI();
        }
      });
    });

    container.querySelectorAll("[data-bag-equip]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-bag-equip"));
        const item = player.bag[idx];
        if (!item) return;
        const pos = item.pos ?? 9;
        const prev = player.equipment[pos];
        player.equipment[pos] = item;
        player.bag.splice(idx, 1);
        if (prev) player.bag.push(prev);
        addLog(`🛡️ Đã trang bị [${item.name}] vào ô [${pos}]!`, "sys");
        saveState();
        refreshAllUI();
      });
    });

    container.querySelectorAll("[data-bag-store]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-bag-store"));
        const item = player.bag[idx];
        if (!item) return;
        player.warehouses[whNum] = player.warehouses[whNum] || [];
        player.warehouses[whNum].push(item);
        player.bag.splice(idx, 1);
        addLog(`📦 Đã cất [${item.name}] vào Kho di động ${whNum}!`, "sys");
        saveState();
        refreshAllUI();
      });
    });

    container.querySelectorAll("[data-wh-take]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-wh-take"));
        const item = whItems[idx];
        if (!item) return;
        player.bag.push(item);
        whItems.splice(idx, 1);
        addLog(`📤 Đã lấy [${item.name}] từ Kho di động ${whNum} ra Túi!`, "sys");
        saveState();
        refreshAllUI();
      });
    });
  }

  // TAB 4: SKILLS (39 TARGET AREAS `SKILL_AREA_*`), 3-BRANCH TALENTS (`Thiên Phú`), FORMATION (`Trận Pháp`)
  function renderSkillTab() {
    const container = document.getElementById("pane-skill");
    if (!container) return;

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>Kỹ Năng Chiến Đấu & 39 Phạm Vi Mục Tiêu (SKILL_AREA_*)</span>
            <span class="badge">Điểm KN: ${player.skillPoints}</span>
          </h3>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${DATA.SKILLS.map((sk) => {
              const lv = player.learnedSkills[sk.id] || 1;
              const isSelected = battle.selectedSkillId === sk.id;
              return `
                <div class="stat-row" style="padding:6px;">
                  <div>
                    <b style="color:var(--accent-gold);">[${sk.id}] ${sk.name} (Lv.${lv})</b>
                    <div style="font-size:11px; color:var(--text-muted);">
                      Loại: ${sk.type} | Đòn: ${sk.hits} | Hệ số: ${(sk.mult * 100).toFixed(0)}% | Phạm vi: <span class="badge">${sk.area}</span>
                    </div>
                  </div>
                  <div style="display:flex; gap:4px;">
                    <button class="btn ${isSelected ? "btn-green" : ""} btn-sm" data-sel-skill="${sk.id}">${isSelected ? "Đang Dùng" : "Chọn"}</button>
                    <button class="btn btn-gold btn-sm" data-up-skill="${sk.id}">+Cấp</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>Cây Thiên Phú 3 Nhánh (Công Kích / Phòng Thủ / Thông Dụng)</span>
            <span class="badge">Điểm Thiên Phú: ${player.talentPoints}</span>
          </h3>
          ${Object.values(DATA.TALENT_TREES).map((branch) => `
            <div style="margin-bottom:8px;">
              <div style="font-weight:700; color:var(--accent-cyan); margin-bottom:4px;">❖ Nhánh ${branch.name}</div>
              ${branch.nodes.map((nd) => {
                const cur = player.talents[nd.id] || 0;
                return `
                  <div class="stat-row" style="margin-bottom:3px;">
                    <span><b>${nd.name}</b> (${nd.bonus})</span>
                    <span>
                      <b class="v">${cur}/${nd.max}</b>
                      <button class="btn btn-gold btn-sm" data-up-talent="${nd.id}">+1</button>
                    </span>
                  </div>
                `;
              }).join("")}
            </div>
          `).join("")}

          <h3 style="margin-top:10px;"><span>39 Phạm Vi Kỹ Năng Trong Engine (Define.SKILL_AREA_*)</span></h3>
          <div style="max-height:110px; overflow-y:auto; font-size:11px; color:var(--text-muted); line-height:1.5;">
            ${DATA.SKILL_AREAS.map((a, i) => `<span class="badge" style="margin:2px;">#${i + 1}: ${a}</span>`).join(" ")}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll("[data-sel-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        battle.selectedSkillId = Number(btn.getAttribute("data-sel-skill"));
        const sk = DATA.SKILLS.find((s) => s.id === battle.selectedSkillId);
        addLog(`⚔️ Đã chọn kỹ năng chủ động [${sk?.name}] (${sk?.area})!`, "sys");
        renderSkillTab();
      });
    });

    container.querySelectorAll("[data-up-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-up-skill"));
        player.learnedSkills[id] = (player.learnedSkills[id] || 1) + 1;
        if (player.skillPoints > 0) player.skillPoints -= 1;
        saveState();
        renderSkillTab();
      });
    });

    container.querySelectorAll("[data-up-talent]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-up-talent");
        player.talents[id] = Math.min(10, (player.talents[id] || 0) + 1);
        if (player.talentPoints > 0) player.talentPoints -= 1;
        saveState();
        refreshAllUI();
      });
    });
  }

  // TAB 5: PETS (49 REAL `tx_500..548.png`) & MERCENARIES (`Lính Đánh Thuê`)
  function renderPetTab() {
    const container = document.getElementById("pane-pet");
    if (!container) return;

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>Hệ Thống Thú Cưng (Trưởng Thành, Ngộ Tính, Chuyển Sinh, Phong Ấn)</span>
            <span class="badge">49 Pet Icons Gốc</span>
          </h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${player.pets.map((p, idx) => `
              <div class="bag-item" style="flex-direction:row; align-items:center; gap:10px;">
                <img src="assets/pet_icons/${p.icon}" style="width:52px; height:52px; image-rendering:pixelated; border:1px solid var(--border-gold); border-radius:6px;" />
                <div style="flex:1;">
                  <div style="font-weight:700; color:var(--accent-gold);">
                    ${p.name} (Lv.${p.level}) — <span class="badge">${p.type}</span>
                    ${p.active ? `<span class="badge" style="color:var(--accent-green);">Đang Xuất Chiến</span>` : ""}
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                    Trưởng thành: <b>${p.grow}</b> | Ngộ tính: <b>+${p.comprehension}</b> | Chuyển sinh: <b>${p.rebirths} lần</b> |
                    Công: <b>${p.atk}</b> | HP: <b>${p.hp}</b>
                  </div>
                  <div style="display:flex; gap:4px; margin-top:5px; flex-wrap:wrap;">
                    <button class="btn btn-green btn-sm" data-pet-active="${idx}">Xuất Chiến</button>
                    <button class="btn btn-gold btn-sm" data-pet-train="${idx}">Tẩy Tủy & Ngộ Tính</button>
                    <button class="btn btn-purple btn-sm" data-pet-rebirth="${idx}">Chuyển Sinh & Tiến Hóa</button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
          <div style="margin-top:10px; display:flex; gap:6px; align-items:center;">
            <select id="selSummonPetIcon">
              ${Array.from({ length: 49 }, (_, i) => `tx_${500 + i}.png`).map((ic) => `<option value="${ic}">Pet Icon gốc: ${ic}</option>`).join("")}
            </select>
            <button class="btn btn-gold btn-sm" id="btnSummonPet">🥚 Giải Phong Ấn Thú Cưng Mới</button>
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>Đội Hình Lính Đánh Thuê (Mercenary Group)</span>
            <span class="badge">Trợ chiến cùng Pet</span>
          </h3>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${player.mercenaries.map((m, idx) => `
              <div class="stat-row" style="padding:8px;">
                <div>
                  <b style="color:var(--accent-gold);">${m.name}</b> (${m.job} Lv.${m.level})
                  <div style="font-size:11px; color:var(--text-muted);">Công: ${m.atk} | HP: ${m.hp}</div>
                </div>
                <button class="btn ${m.active ? "btn-green" : ""} btn-sm" data-merc-toggle="${idx}">
                  ${m.active ? "Đang Trợ Chiến" : "Triệu Hồi"}
                </button>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll("[data-pet-active]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-pet-active"));
        player.pets.forEach((p, i) => { p.active = i === idx; });
        addLog(`🐾 Đã cho thú cưng [${player.pets[idx].name}] xuất chiến!`, "sys");
        saveState();
        refreshAllUI();
      });
    });

    container.querySelectorAll("[data-pet-train]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-pet-train"));
        const p = player.pets[idx];
        p.grow += 8;
        p.comprehension += 1;
        p.atk += 180;
        p.hp += 1200;
        addLog(`✨ Tẩy tủy [${p.name}]: Trưởng thành lên ${p.grow}, Ngộ tính +${p.comprehension}, Công +180!`, "loot");
        saveState();
        refreshAllUI();
      });
    });

    container.querySelectorAll("[data-pet-rebirth]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-pet-rebirth"));
        const p = player.pets[idx];
        p.rebirths += 1;
        p.evolved = true;
        p.atk += 450;
        p.hp += 3500;
        addLog(`🔥 Chuyển sinh & Tiến hóa [${p.name}] lần ${p.rebirths}: Công +450, HP +3500!`, "loot");
        saveState();
        refreshAllUI();
      });
    });

    container.querySelector("#btnSummonPet")?.addEventListener("click", () => {
      const icon = container.querySelector("#selSummonPetIcon")?.value || "tx_515.png";
      const newPet = {
        id: Date.now(),
        name: "Thần Thú " + icon.replace(".png", ""),
        icon,
        type: "Thần Thú",
        level: player.level,
        grow: 175,
        comprehension: 10,
        rebirths: 1,
        evolved: true,
        loyalty: 100,
        active: false,
        str: 240,
        sta: 200,
        agi: 200,
        int: 160,
        wis: 160,
        atk: 2400,
        hp: 18000
      };
      player.pets.push(newPet);
      addLog(`🥚 Giải phong ấn thành công [${newPet.name}] (${icon})!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelectorAll("[data-merc-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-merc-toggle"));
        player.mercenaries[idx].active = !player.mercenaries[idx].active;
        saveState();
        renderPetTab();
      });
    });
  }

  // TAB 6: PERSONAL CITY (`Thành Thị Cá Nhân`), COUNTRY (`13 Kiến Trúc`, `11 Quan Chức`, `Công Thành Chiến 6001`)
  function renderCountryTab() {
    const container = document.getElementById("pane-country");
    if (!container) return;

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>Thành Thị Cá Nhân (Map 1001..2999) & Thu Hoạch Tài Nguyên</span>
            <span class="badge">Kho Thành: ${player.personalCity.storedResources.toLocaleString()}</span>
          </h3>
          <div class="stat-list" style="margin-bottom:10px;">
            <div class="stat-row"><span class="k">Phủ Thành Chủ</span><span class="v">Lv.${player.personalCity.hallLevel}</span></div>
            <div class="stat-row"><span class="k">Mỏ Khoáng Thạch</span><span class="v">Lv.${player.personalCity.mineLevel}</span></div>
            <div class="stat-row"><span class="k">Nông Trại Linh Thảo</span><span class="v">Lv.${player.personalCity.farmLevel}</span></div>
            <div class="stat-row"><span class="k">Chuồng Nuôi Thú Cưng</span><span class="v">Lv.${player.personalCity.petHouseLevel}</span></div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-gold" id="btnHarvestCity">🌾 Thu Hoạch Tài Nguyên Thành</button>
            <button class="btn btn-green" id="btnUpgradeCity">🔨 Nâng Cấp Kiến Trúc Cá Nhân</button>
            <button class="btn" id="btnEnterPersonalCity">🏰 Dịch Chuyển Về Thành Cá Nhân</button>
          </div>

          <h3 style="margin-top:14px;">
            <span>11 Cấp Quan Chức Quốc Gia & Chiến Trường 10 Hiệp (Map 6001)</span>
          </h3>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
            <select id="selCountryRank">
              ${DATA.COUNTRY_RANKS.map((rk) => `<option value="${rk.id}" ${rk.id === player.countryRankId ? "selected" : ""}>[${rk.id}] ${rk.name} (+${rk.bonusHp} HP, +${rk.bonusAtk} Công)</option>`).join("")}
            </select>
            <button class="btn btn-red" id="btnStartCountryWar">⚔️ Phát Động Công Thành Chiến (10 Hiệp)</button>
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>13 Kiến Trúc Quốc Gia (Map 3001..4999)</span>
            <span class="badge">Cống hiến: ${player.countryContribution.toLocaleString()}</span>
          </h3>
          <div style="display:flex; flex-direction:column; gap:5px; max-height:330px; overflow-y:auto;">
            ${DATA.COUNTRY_BUILDINGS.map((b) => {
              const lv = player.countryBuildings[b.id] || 1;
              return `
                <div class="stat-row" style="padding:5px;">
                  <div>
                    <b style="color:var(--accent-gold);">[${b.id}] ${b.name} (Lv.${lv})</b>
                    <div style="font-size:11px; color:var(--text-muted);">${b.desc}</div>
                  </div>
                  <button class="btn btn-gold btn-sm" data-up-cbuild="${b.id}">Nâng Cấp</button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    container.querySelector("#btnHarvestCity")?.addEventListener("click", () => {
      const gain = player.personalCity.hallLevel * 35000;
      player.gold += gain;
      player.personalCity.storedResources += 25000;
      addLog(`🌾 Thu hoạch Thành Thị Cá Nhân: Nhận +${gain.toLocaleString()} Vàng!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnUpgradeCity")?.addEventListener("click", () => {
      player.personalCity.hallLevel += 1;
      player.personalCity.mineLevel += 1;
      player.personalCity.farmLevel += 1;
      player.personalCity.petHouseLevel += 1;
      addLog(`🔨 Nâng cấp toàn bộ Kiến Trúc Thành Thị Cá Nhân lên Lv.${player.personalCity.hallLevel}!`, "sys");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnEnterPersonalCity")?.addEventListener("click", () => {
      player.mapId = player.race === 0 ? 1001 : 2001;
      addLog(`🏰 Đã dịch chuyển về Thành Thị Cá Nhân (Map ${player.mapId})!`, "sys");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#selCountryRank")?.addEventListener("change", (e) => {
      player.countryRankId = Number(e.target.value);
      const rk = DATA.COUNTRY_RANKS.find((r) => r.id === player.countryRankId);
      addLog(`👑 Nhậm chức Quan Quốc Gia: [${rk?.name}] (+${rk?.bonusHp} HP, +${rk?.bonusAtk} Công)!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#btnStartCountryWar")?.addEventListener("click", () => {
      player.mapId = 6001;
      battle.countryWarRound = 1;
      startBattle("Hộ Quốc Đại Tướng Quân (Công Thành Hiệp 1/10)", true, true);
      refreshAllUI();
    });

    container.querySelectorAll("[data-up-cbuild]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-up-cbuild"));
        player.countryBuildings[id] = (player.countryBuildings[id] || 1) + 1;
        player.countryContribution += 250;
        addLog(`🏯 Đóng góp xây dựng Kiến Trúc Quốc Gia #${id} lên Lv.${player.countryBuildings[id]}!`, "loot");
        saveState();
        renderCountryTab();
      });
    });
  }

  // TAB 7: 8 MAP ZONES (`1..7999`) & QUICK TELEPORT / BOSS CHALLENGE
  function renderMapsTab() {
    const container = document.getElementById("pane-maps");
    if (!container) return;

    container.innerHTML = `
      <div class="panel-box">
        <h3>
          <span>8 Phân Vùng Bản Đồ Theo Map ID (1 .. 7999)</span>
          <span class="badge">WorldScreen.findPath A*</span>
        </h3>
        <div class="grid-4" style="margin-bottom:10px;">
          ${DATA.MAP_ZONES.map((z) => `
            <div style="background:#0a1122; border:1px solid var(--border-subtle); padding:6px; border-radius:5px;">
              <div style="color:var(--accent-gold); font-weight:700;">[${z.range}] ${z.name}</div>
              <div style="font-size:11px; color:var(--text-muted);">${z.desc}</div>
            </div>
          `).join("")}
        </div>

        <h3><span>Danh Sách Bản Đồ & Khiêu Chiến Boss Trực Tiếp</span></h3>
        <div class="grid-3">
          ${DATA.MAPS.map((m) => `
            <div class="bag-item">
              <div style="font-weight:700; color:var(--accent-gold);">[ID ${m.id}] ${m.name} (Lv.${m.level})</div>
              <div style="font-size:11px; color:var(--text-muted);">
                Phân vùng: <b>${m.zone}</b><br/>
                NPC: ${m.npc} | Boss: <b style="color:var(--accent-red);">${m.boss}</b>
              </div>
              <div style="display:flex; gap:5px; margin-top:4px;">
                <button class="btn btn-sm" data-goto-map="${m.id}">Dịch Chuyển</button>
                <button class="btn btn-red btn-sm" data-fight-boss="${m.id}">⚔️ Đánh Boss</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    container.querySelectorAll("[data-goto-map]").forEach((btn) => {
      btn.addEventListener("click", () => {
        player.mapId = Number(btn.getAttribute("data-goto-map"));
        battle.active = false;
        const m = getCurrentMapMeta();
        addLog(`🗺️ Đã dịch chuyển tới [${m.id}] ${m.name}!`, "sys");
        saveState();
        refreshAllUI();
      });
    });

    container.querySelectorAll("[data-fight-boss]").forEach((btn) => {
      btn.addEventListener("click", () => {
        player.mapId = Number(btn.getAttribute("data-fight-boss"));
        const m = getCurrentMapMeta();
        startBattle(m.boss, true, m.id === 6001);
        refreshAllUI();
      });
    });
  }

  // TAB 8: 4 PLAYABLE MINI-GAMES (`FilpGame`, `LinkupGame`, `WaterPipeGame`, `LotteryDraw`)
  const miniGameState = {
    filpCards: [],
    filpFlipped: [],
    linkupBoard: [],
    linkupSelected: null,
    pipes: [1, 2, 0, 3, 1, 2, 2, 0, 1, 2, 3, 0, 1, 3, 2, 0, 1, 2]
  };

  function initMiniGames() {
    // 1. FilpGame (6 pairs = 12 cards using real assets/filp/set1_filp1..6.png)
    const pairs = [1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
    miniGameState.filpCards = pairs.map((imgId, idx) => ({ idx, imgId, revealed: false, matched: false }));
    miniGameState.filpFlipped = [];

    // 2. LinkupGame (16 cells = 8 pairs using real assets/linkup/theme1_linkup1..8.png)
    const lPairs = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);
    miniGameState.linkupBoard = lPairs.map((id, idx) => ({ idx, id, matched: false }));
    miniGameState.linkupSelected = null;
  }
  initMiniGames();

  function renderMiniGamesTab() {
    const container = document.getElementById("pane-minigames");
    if (!container) return;

    const pipeChars = ["━", "┃", "┏", "┛"];

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>1. Lật Hình Nhận Thưởng (FilpGame — assets/filp/*.png)</span>
            <button class="btn btn-sm" id="btnResetFilp">Chơi Lại</button>
          </h3>
          <div class="filp-board">
            ${miniGameState.filpCards.map((c) => `
              <div class="filp-card" data-filp-idx="${c.idx}">
                <img src="assets/filp/${c.revealed || c.matched ? "set1_filp" + c.imgId : "set2_filp10"}.png" />
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>2. Nối Hình Pikachu (LinkupGame — assets/linkup/*.png)</span>
            <button class="btn btn-sm" id="btnResetLinkup">Xáo Bàn</button>
          </h3>
          <div class="linkup-board">
            ${miniGameState.linkupBoard.map((cell) => `
              <div class="linkup-cell ${cell.matched ? "matched" : ""} ${miniGameState.linkupSelected === cell.idx ? "selected" : ""}" data-linkup-idx="${cell.idx}">
                <img src="assets/linkup/theme1_linkup${cell.id}.png" />
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>3. Nối Ống Nước (WaterPipeGame)</span>
            <span class="badge">Xoay tất cả về đường ngang ━</span>
          </h3>
          <div class="pipe-board">
            ${miniGameState.pipes.map((p, idx) => `
              <div class="pipe-cell ${p === 0 ? "connected" : ""}" data-pipe-idx="${idx}">
                ${pipeChars[p % 4]}
              </div>
            `).join("")}
          </div>
        </div>

        <div class="panel-box">
          <h3>
            <span>4. Vòng Quay Xổ Số (LotteryDraw)</span>
            <span class="badge">Thưởng KNB & Bảo Thạch</span>
          </h3>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
            Quay thưởng trực tiếp nhận Kim Cương, Vàng, Bảo Thạch Lv.5 hoặc Thần Binh Đỏ!
          </p>
          <button class="btn btn-gold" id="btnSpinLottery">🎰 Quay Xổ Số Ngay (Miễn Phí Offline)</button>
          <div id="lotteryResultText" style="margin-top:10px; font-weight:700; color:var(--accent-gold);"></div>
        </div>
      </div>
    `;

    container.querySelector("#btnResetFilp")?.addEventListener("click", () => {
      initMiniGames();
      renderMiniGamesTab();
    });

    container.querySelectorAll("[data-filp-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-filp-idx"));
        const card = miniGameState.filpCards[idx];
        if (!card || card.revealed || card.matched || miniGameState.filpFlipped.length >= 2) return;
        card.revealed = true;
        miniGameState.filpFlipped.push(card);
        renderMiniGamesTab();

        if (miniGameState.filpFlipped.length === 2) {
          const [a, b] = miniGameState.filpFlipped;
          if (a.imgId === b.imgId) {
            a.matched = true;
            b.matched = true;
            miniGameState.filpFlipped = [];
            player.gold += 50000;
            addLog(`🃏 [FilpGame] Ghép cặp hình #${a.imgId} thành công! Nhận +50,000 Vàng!`, "loot");
            saveState();
            updateTopHUD();
            renderMiniGamesTab();
          } else {
            setTimeout(() => {
              a.revealed = false;
              b.revealed = false;
              miniGameState.filpFlipped = [];
              renderMiniGamesTab();
            }, 500);
          }
        }
      });
    });

    container.querySelector("#btnResetLinkup")?.addEventListener("click", () => {
      initMiniGames();
      renderMiniGamesTab();
    });

    container.querySelectorAll("[data-linkup-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-linkup-idx"));
        const cell = miniGameState.linkupBoard[idx];
        if (!cell || cell.matched) return;
        if (miniGameState.linkupSelected === null) {
          miniGameState.linkupSelected = idx;
        } else if (miniGameState.linkupSelected === idx) {
          miniGameState.linkupSelected = null;
        } else {
          const prev = miniGameState.linkupBoard[miniGameState.linkupSelected];
          if (prev && prev.id === cell.id) {
            prev.matched = true;
            cell.matched = true;
            player.diamond += 500;
            addLog(`⚡ [LinkupGame] Nối cặp Pikachu #${cell.id} thành công! Nhận +500 Kim Cương!`, "loot");
            saveState();
            updateTopHUD();
          }
          miniGameState.linkupSelected = null;
        }
        renderMiniGamesTab();
      });
    });

    container.querySelectorAll("[data-pipe-idx]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-pipe-idx"));
        miniGameState.pipes[idx] = (miniGameState.pipes[idx] + 1) % 4;
        if (miniGameState.pipes.every((p) => p === 0)) {
          player.gold += 200000;
          addLog(`🚰 [WaterPipeGame] Đã thông suốt toàn bộ đường ống nước! Thưởng +200,000 Vàng!`, "loot");
          saveState();
          updateTopHUD();
        }
        renderMiniGamesTab();
      });
    });

    container.querySelector("#btnSpinLottery")?.addEventListener("click", () => {
      const prizes = [
        { text: "🎁 Giải Đặc Biệt: +5,000 Kim Cương & +500,000 Vàng!", dia: 5000, gold: 500000 },
        { text: "💎 Giải Nhất: +2,000 Kim Cương & +200,000 Vàng!", dia: 2000, gold: 200000 },
        { text: "🌟 Giải Nhì: +10 Điểm Tiềm Năng & +5 Điểm Kỹ Năng!", sp: 5, st: 10 }
      ];
      const p = prizes[Math.floor(Math.random() * prizes.length)];
      if (p.dia) player.diamond += p.dia;
      if (p.gold) player.gold += p.gold;
      if (p.sp) player.skillPoints += p.sp;
      if (p.st) player.statPoints += p.st;
      addLog(`🎰 [LotteryDraw] ${p.text}`, "loot");
      saveState();
      updateTopHUD();
      const resEl = container.querySelector("#lotteryResultText");
      if (resEl) resEl.textContent = p.text;
    });
  }

  // TAB 9: GM CONSOLE, `.pl` PALETTE VIEWER & REA ASSET ARCHIVE
  function renderGmTab() {
    const container = document.getElementById("pane-gm");
    if (!container) return;

    container.innerHTML = `
      <div class="grid-2">
        <div class="panel-box">
          <h3>
            <span>Bảng Điều Khiển GM Offline (Tích Hợp Trực Tiếp)</span>
            <span class="badge">Full Authority</span>
          </h3>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
            <button class="btn btn-gold" id="gmAddCurrency">💰 +10 Triệu Vàng / Bạc & +50,000 KNB</button>
            <button class="btn btn-green" id="gmLevelUp10">⬆️ +10 Cấp Độ & +5 Cấp Thần Kì</button>
            <button class="btn btn-purple" id="gmMaxAllEquips">🔥 Nâng Toàn Bộ 18 Ô Trang Bị Lên 5★ Đỏ</button>
            <button class="btn btn-red" id="gmFullHeal">❤️ Hồi Đầy 100% HP / MP</button>
            <button class="btn" id="gmResetSave">♻️ Khôi Phục Mặc Định</button>
          </div>
          <p style="font-size:11.5px; color:var(--text-muted);">
            Mọi thay đổi GM được lưu tự động vào bộ nhớ trình duyệt (LocalStorage) và áp dụng tức thì vào công thức chiến đấu.
          </p>
        </div>

        <div class="panel-box">
          <h3>
            <span>Kho Tài Nguyên Gốc Đã Giải Nén Từ APK (REA Verified)</span>
            <span class="badge">assets/catalog.json</span>
          </h3>
          <div class="stat-list">
            <div class="stat-row"><span class="k">Map Tiles (1.pn + 1.pd)</span><span class="v">645 PNGs</span></div>
            <div class="stat-row"><span class="k">Common UI Sprites</span><span class="v">328 PNGs</span></div>
            <div class="stat-row"><span class="k">Pet Icons (tx_500..548)</span><span class="v">49 PNGs</span></div>
            <div class="stat-row"><span class="k">Mini-game Filp / Linkup</span><span class="v">20 + 96 PNGs</span></div>
            <div class="stat-row"><span class="k">Animation Sprite Sheets</span><span class="v">204 PNGs</span></div>
            <div class="stat-row"><span class="k">Palette Swaps (.pl RGB+CRC32)</span><span class="v">40 Files</span></div>
            <div class="stat-row"><span class="k">Binary UI Screens (.ui)</span><span class="v">165 Files</span></div>
            <div class="stat-row"><span class="k">Pixel Fonts (.t)</span><span class="v">5 Files</span></div>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#gmAddCurrency")?.addEventListener("click", () => {
      player.gold += 10000000;
      player.silver += 10000000;
      player.diamond += 50000;
      addLog(`🛠️ [GM] Đã cộng +10,000,000 Vàng, +10,000,000 Đồng, +50,000 Kim Cương!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#gmLevelUp10")?.addEventListener("click", () => {
      player.level += 10;
      player.cankonLevel += 5;
      player.statPoints += 50;
      player.skillPoints += 30;
      player.talentPoints += 10;
      addLog(`🛠️ [GM] Đã tăng +10 Cấp (Lv.${player.level}) và +5 Cấp Thần Kì (+${player.cankonLevel})!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#gmMaxAllEquips")?.addEventListener("click", () => {
      DATA.EQUIP_SLOTS.forEach((slot) => {
        player.equipment[slot.pos] = {
          uid: "gm_eq_" + slot.pos,
          pos: slot.pos,
          name: `Thần Khí ${slot.name}`,
          typeId: 4,
          grade: 5,
          stars: 5,
          identified: true,
          atk: 950,
          magicAtk: 950,
          def: 650,
          hp: 3500,
          mp: 2200,
          str: 65,
          sta: 65,
          agi: 65,
          int: 65,
          wis: 65,
          hit: 45,
          dodge: 45,
          crit: 55,
          block: 4,
          counter: 4,
          magicReflect: 4,
          dmgReduce: 4,
          insight: 4,
          gems: [{ stat: "STR", val: 50, lv: 5 }]
        };
      });
      addLog(`🛠️ [GM] Đã trang bị full 18 Ô Thần Khí 5★ Phẩm Chất Đỏ!`, "loot");
      saveState();
      refreshAllUI();
    });

    container.querySelector("#gmFullHeal")?.addEventListener("click", () => {
      computedStats = window.computePVTK2Stats(player);
      currentHP = computedStats.maxHP;
      currentMP = computedStats.maxMP;
      addLog(`❤️ [GM] Đã hồi phục 100% HP (${currentHP}) & MP (${currentMP})!`, "sys");
      updateTopHUD();
    });

    container.querySelector("#gmResetSave")?.addEventListener("click", () => {
      localStorage.removeItem(SAVE_KEY);
      player = createDefaultPlayer();
      computedStats = window.computePVTK2Stats(player);
      currentHP = computedStats.maxHP;
      currentMP = computedStats.maxMP;
      addLog(`♻️ Đã khôi phục dữ liệu nhân vật về mặc định!`, "sys");
      refreshAllUI();
    });
  }

  function refreshAllUI() {
    updateTopHUD();
    updateBattleControlsUI();
    renderCharacterTab();
    renderEquipTab();
    renderBagTab();
    renderSkillTab();
    renderPetTab();
    renderCountryTab();
    renderMapsTab();
    renderMiniGamesTab();
    renderGmTab();
  }

  // Wire up Top-level Navigation Tabs & Viewport Buttons
  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");
        document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("pane-" + target)?.classList.add("active");
      });
    });

    document.getElementById("btnStartWildBattle")?.addEventListener("click", () => {
      const m = getCurrentMapMeta();
      startBattle(`Quái Tinh Anh ${m.name}`, false, false);
    });

    document.getElementById("btnStartBossBattle")?.addEventListener("click", () => {
      const m = getCurrentMapMeta();
      startBattle(m.boss, true, m.id === 6001);
    });

    document.getElementById("btnManualAttack")?.addEventListener("click", () => {
      if (!battle.active) {
        const m = getCurrentMapMeta();
        startBattle(m.boss, true, false);
      } else {
        executeBattleRound();
      }
    });

    document.getElementById("btnToggleAutoBattle")?.addEventListener("click", () => {
      battle.auto = !battle.auto;
      updateBattleControlsUI();
    });

    document.getElementById("btnToggleWeather")?.addEventListener("click", () => {
      player.weatherRain = !player.weatherRain;
      saveState();
    });

    document.getElementById("btnClearLog")?.addEventListener("click", () => {
      const box = document.getElementById("combatLogBody");
      if (box) box.innerHTML = "";
    });

    initCanvas();
    refreshAllUI();
    addLog("🌟 Chào mừng đến với Phong Vân Truyền Kỳ 2 (WorldOL v1.3) — Bản Web Trực Tiếp!", "sys");
    addLog("📌 Click trực tiếp lên Bản Đồ Canvas để寻路 A* (findPath) hoặc chạm vào Boss để giao chiến!", "loot");
  });
})();
