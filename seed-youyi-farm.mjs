/**
 * 黑龙江省友谊农场 20万亩玉米秋季收获作业数据生成脚本
 * 
 * 基于专业农业知识设计的真实模拟数据：
 * - 车队配置：根据20万亩作业量合理配置
 * - 作业数据：模拟10天收获过程，包含天气、故障等因素
 * - 产量数据：符合黑龙江玉米实际产量水平
 */

import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'rice_agriculture'
};

// ============ 友谊农场配置参数 ============

// 农场基础信息
const FARM_CONFIG = {
  name: '黑龙江省友谊农场',
  totalArea: 200000, // 总面积20万亩
  cropType: '玉米',
  // 友谊农场位于黑龙江省双鸭山市，坐标约为 46.6°N, 131.8°E
  centerLat: 46.65,
  centerLng: 131.82,
  // 玉米产量参数（黑龙江平均亩产约1200-1400斤，即600-700kg）
  avgYieldPerMu: 650, // kg/亩
  yieldVariation: 0.15, // 产量波动范围 ±15%
  // 玉米水分参数（收获期水分通常在25-30%）
  avgMoisture: 27,
  moistureVariation: 3
};

// 车队配置（基于20万亩作业量计算）
// 大型收割机日作业能力约300-500亩，按400亩计算
// 20万亩 / 10天 = 2万亩/天，需要约50台收割机
// 运粮车与收割机比例约1:2，需要约25台
// 运输卡车根据距离配置，约30台
const FLEET_CONFIG = {
  harvesters: [
    // 约翰迪尔S系列收割机 - 主力机型
    { prefix: 'JD-S760', count: 20, model: 'John Deere S760', dailyCapacity: 450 },
    { prefix: 'JD-S770', count: 15, model: 'John Deere S770', dailyCapacity: 500 },
    { prefix: 'JD-S780', count: 10, model: 'John Deere S780', dailyCapacity: 550 },
    // 凯斯收割机
    { prefix: 'CASE-8250', count: 5, model: 'Case IH 8250', dailyCapacity: 480 }
  ],
  // 运粮车（拖拉机+粮斗）
  grainCarts: [
    { prefix: 'GC-JD', count: 15, model: 'John Deere 9R + Kinze 1100', capacity: 1100 },
    { prefix: 'GC-CASE', count: 10, model: 'Case IH Magnum + J&M 1501', capacity: 1500 }
  ],
  // 运输卡车
  trucks: [
    { prefix: 'TK-DFL', count: 20, model: '东风天龙 25吨', capacity: 25000 },
    { prefix: 'TK-FAW', count: 10, model: '一汽解放 30吨', capacity: 30000 }
  ]
};

// 地块划分配置（将20万亩划分为多个作业单元）
const FIELD_CONFIG = {
  // 按作业队划分，每个作业队负责约1万亩
  teams: 20,
  fieldsPerTeam: 5, // 每队5个地块
  avgFieldSize: 2000 // 平均每地块2000亩
};

// 10天作业模拟参数
const HARVEST_DAYS = 10;
const START_DATE = new Date('2025-10-01'); // 秋收开始日期

// 天气影响因子（影响当日作业效率）
const WEATHER_FACTORS = [
  { day: 1, weather: '晴', factor: 1.0, description: '天气晴好，适宜收获' },
  { day: 2, weather: '晴', factor: 1.0, description: '天气晴好，作业顺利' },
  { day: 3, weather: '多云', factor: 0.95, description: '多云，轻微影响' },
  { day: 4, weather: '小雨', factor: 0.4, description: '小雨，上午停工，下午抢收' },
  { day: 5, weather: '阴', factor: 0.85, description: '阴天，玉米水分偏高' },
  { day: 6, weather: '晴', factor: 1.05, description: '晴好，加班抢收' },
  { day: 7, weather: '晴', factor: 1.0, description: '天气晴好' },
  { day: 8, weather: '多云', factor: 0.9, description: '多云转阴' },
  { day: 9, weather: '晴', factor: 1.0, description: '天气好转' },
  { day: 10, weather: '晴', factor: 1.1, description: '最后冲刺，全力收尾' }
];

// ============ 数据生成函数 ============

// 生成随机数（正态分布近似）
function randomNormal(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

// 生成地块边界GeoJSON（简化的矩形）
function generateFieldBoundary(centerLat, centerLng, areaMu) {
  // 1亩 ≈ 666.67平方米
  const areaM2 = areaMu * 666.67;
  const side = Math.sqrt(areaM2); // 假设正方形
  
  // 经纬度偏移（粗略计算，1度纬度≈111km，1度经度≈111*cos(lat)km）
  const latOffset = (side / 2) / 111000;
  const lngOffset = (side / 2) / (111000 * Math.cos(centerLat * Math.PI / 180));
  
  return JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [centerLng - lngOffset, centerLat - latOffset],
      [centerLng + lngOffset, centerLat - latOffset],
      [centerLng + lngOffset, centerLat + latOffset],
      [centerLng - lngOffset, centerLat + latOffset],
      [centerLng - lngOffset, centerLat - latOffset]
    ]]
  });
}

// 生成作业轨迹GeoJSON
function generateWorkPath(centerLat, centerLng, areaMu) {
  const areaM2 = areaMu * 666.67;
  const side = Math.sqrt(areaM2);
  const latOffset = (side / 2) / 111000;
  const lngOffset = (side / 2) / (111000 * Math.cos(centerLat * Math.PI / 180));
  
  // 生成往返作业路径
  const points = [];
  const rows = 10;
  for (let i = 0; i < rows; i++) {
    const lat = centerLat - latOffset + (2 * latOffset * i / (rows - 1));
    if (i % 2 === 0) {
      points.push([centerLng - lngOffset * 0.9, lat]);
      points.push([centerLng + lngOffset * 0.9, lat]);
    } else {
      points.push([centerLng + lngOffset * 0.9, lat]);
      points.push([centerLng - lngOffset * 0.9, lat]);
    }
  }
  
  return JSON.stringify({
    type: 'LineString',
    coordinates: points
  });
}

async function main() {
  const connection = await mysql.createConnection(dbConfig);
  
  console.log('🌽 开始生成友谊农场20万亩玉米收获作业数据...\n');
  
  try {
    // ============ 1. 清理现有数据 ============
    console.log('📋 清理现有数据...');
    await connection.execute('DELETE FROM workLogs');
    await connection.execute('DELETE FROM maintenancePlans');
    await connection.execute('DELETE FROM maintenanceLogs');
    await connection.execute('DELETE FROM machines');
    await connection.execute('DELETE FROM fields');
    console.log('✅ 数据清理完成\n');
    
    // ============ 2. 创建地块数据 ============
    console.log('🗺️  创建地块数据...');
    const fields = [];
    let fieldId = 1;
    
    for (let team = 1; team <= FIELD_CONFIG.teams; team++) {
      for (let f = 1; f <= FIELD_CONFIG.fieldsPerTeam; f++) {
        // 计算地块位置（在农场范围内分散）
        const latOffset = ((team - 1) % 5 - 2) * 0.05;
        const lngOffset = (Math.floor((team - 1) / 5) - 2) * 0.08;
        const centerLat = FARM_CONFIG.centerLat + latOffset + (Math.random() - 0.5) * 0.02;
        const centerLng = FARM_CONFIG.centerLng + lngOffset + (Math.random() - 0.5) * 0.03;
        
        // 地块面积有一定波动
        const area = FIELD_CONFIG.avgFieldSize * (0.8 + Math.random() * 0.4);
        
        const field = {
          id: fieldId++,
          name: `第${team}作业队-${String(f).padStart(2, '0')}号地块`,
          cropType: FARM_CONFIG.cropType,
          area: area.toFixed(2),
          boundaryGeoJson: generateFieldBoundary(centerLat, centerLng, area),
          centerLat: centerLat.toFixed(6),
          centerLng: centerLng.toFixed(6),
          status: 'completed', // 收获完成
          harvestProgress: '100.00',
          avgYield: (FARM_CONFIG.avgYieldPerMu * (1 + (Math.random() - 0.5) * FARM_CONFIG.yieldVariation * 2)).toFixed(2),
          avgMoisture: (FARM_CONFIG.avgMoisture + (Math.random() - 0.5) * FARM_CONFIG.moistureVariation * 2).toFixed(2),
          ownerId: 1
        };
        fields.push(field);
        
        await connection.execute(
          `INSERT INTO fields (id, name, cropType, area, boundaryGeoJson, centerLat, centerLng, status, harvestProgress, avgYield, avgMoisture, ownerId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [field.id, field.name, field.cropType, field.area, field.boundaryGeoJson, field.centerLat, field.centerLng, field.status, field.harvestProgress, field.avgYield, field.avgMoisture, field.ownerId]
        );
      }
    }
    console.log(`✅ 创建了 ${fields.length} 个地块，总面积 ${fields.reduce((sum, f) => sum + parseFloat(f.area), 0).toFixed(0)} 亩\n`);
    
    // ============ 3. 创建农机设备数据 ============
    console.log('🚜 创建农机设备数据...');
    const machines = [];
    let machineId = 1;
    
    // 创建收割机
    for (const harvesterType of FLEET_CONFIG.harvesters) {
      for (let i = 1; i <= harvesterType.count; i++) {
        const machine = {
          id: machineId++,
          name: `${harvesterType.prefix}-${String(i).padStart(3, '0')}`,
          type: 'harvester',
          model: harvesterType.model,
          licensePlate: `黑J-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          status: 'online',
          currentLat: (FARM_CONFIG.centerLat + (Math.random() - 0.5) * 0.1).toFixed(6),
          currentLng: (FARM_CONFIG.centerLng + (Math.random() - 0.5) * 0.15).toFixed(6),
          currentSpeed: (Math.random() * 2 + 4).toFixed(2), // 4-6 km/h
          fuelLevel: (60 + Math.random() * 40).toFixed(2),
          engineHours: (800 + Math.random() * 1500).toFixed(2),
          dailyCapacity: harvesterType.dailyCapacity,
          ownerId: 1
        };
        machines.push(machine);
        
        await connection.execute(
          `INSERT INTO machines (id, name, type, model, licensePlate, status, currentLat, currentLng, currentSpeed, fuelLevel, engineHours, ownerId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [machine.id, machine.name, machine.type, machine.model, machine.licensePlate, machine.status, machine.currentLat, machine.currentLng, machine.currentSpeed, machine.fuelLevel, machine.engineHours, machine.ownerId]
        );
      }
    }
    const harvesterCount = machineId - 1;
    console.log(`  - 收割机: ${harvesterCount} 台`);
    
    // 创建运粮车（作为拖拉机类型）
    for (const cartType of FLEET_CONFIG.grainCarts) {
      for (let i = 1; i <= cartType.count; i++) {
        const machine = {
          id: machineId++,
          name: `${cartType.prefix}-${String(i).padStart(3, '0')}`,
          type: 'tractor',
          model: cartType.model,
          licensePlate: `黑J-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          status: 'online',
          currentLat: (FARM_CONFIG.centerLat + (Math.random() - 0.5) * 0.1).toFixed(6),
          currentLng: (FARM_CONFIG.centerLng + (Math.random() - 0.5) * 0.15).toFixed(6),
          currentSpeed: (Math.random() * 5 + 10).toFixed(2), // 10-15 km/h
          fuelLevel: (50 + Math.random() * 50).toFixed(2),
          engineHours: (600 + Math.random() * 1200).toFixed(2),
          capacity: cartType.capacity,
          ownerId: 1
        };
        machines.push(machine);
        
        await connection.execute(
          `INSERT INTO machines (id, name, type, model, licensePlate, status, currentLat, currentLng, currentSpeed, fuelLevel, engineHours, ownerId) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [machine.id, machine.name, machine.type, machine.model, machine.licensePlate, machine.status, machine.currentLat, machine.currentLng, machine.currentSpeed, machine.fuelLevel, machine.engineHours, machine.ownerId]
        );
      }
    }
    const grainCartCount = machineId - 1 - harvesterCount;
    console.log(`  - 运粮车: ${grainCartCount} 台`);
    console.log(`✅ 共创建 ${machines.length} 台农机设备\n`);
    
    // ============ 4. 生成10天作业记录 ============
    console.log('📊 生成10天收获作业记录...');
    
    const harvesters = machines.filter(m => m.type === 'harvester');
    let totalWorkArea = 0;
    let totalYield = 0;
    let totalFuel = 0;
    let workLogId = 1;
    
    // 为每个地块分配收割任务
    let fieldIndex = 0;
    const dailyStats = [];
    
    for (let day = 1; day <= HARVEST_DAYS; day++) {
      const weatherInfo = WEATHER_FACTORS[day - 1];
      const workDate = new Date(START_DATE);
      workDate.setDate(workDate.getDate() + day - 1);
      
      let dayWorkArea = 0;
      let dayYield = 0;
      let dayFuel = 0;
      let dayWorkLogs = 0;
      
      // 每台收割机当天的作业
      for (const harvester of harvesters) {
        // 根据天气因子调整作业能力
        const actualCapacity = harvester.dailyCapacity * weatherInfo.factor;
        
        // 随机故障影响（5%概率）
        const hasFault = Math.random() < 0.05;
        const faultFactor = hasFault ? 0.3 : 1.0;
        
        // 当天实际作业面积
        const workArea = actualCapacity * faultFactor * (0.9 + Math.random() * 0.2);
        
        if (fieldIndex >= fields.length) continue;
        
        const field = fields[fieldIndex];
        const fieldYield = parseFloat(field.avgYield);
        const fieldMoisture = parseFloat(field.avgMoisture);
        
        // 计算产量和油耗
        const yieldKg = workArea * fieldYield;
        // 油耗约 15-20 升/亩
        const fuelConsumed = workArea * (15 + Math.random() * 5);
        
        // 作业时间（早6点到晚8点，约14小时）
        const startHour = 6 + Math.floor(Math.random() * 2);
        const workHours = 10 + Math.random() * 4;
        
        const startTime = new Date(workDate);
        startTime.setHours(startHour, Math.floor(Math.random() * 60), 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + Math.floor(workHours));
        endTime.setMinutes(Math.floor(Math.random() * 60));
        
        // 插入作业记录
        await connection.execute(
          `INSERT INTO workLogs (id, machineId, fieldId, startTime, endTime, workArea, totalYield, avgYield, avgMoisture, fuelConsumed, pathGeoJson) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workLogId++,
            harvester.id,
            field.id,
            startTime.toISOString().slice(0, 19).replace('T', ' '),
            endTime.toISOString().slice(0, 19).replace('T', ' '),
            workArea.toFixed(2),
            yieldKg.toFixed(2),
            fieldYield.toFixed(2),
            (fieldMoisture + (Math.random() - 0.5) * 2).toFixed(2),
            fuelConsumed.toFixed(2),
            generateWorkPath(parseFloat(field.centerLat), parseFloat(field.centerLng), workArea)
          ]
        );
        
        dayWorkArea += workArea;
        dayYield += yieldKg;
        dayFuel += fuelConsumed;
        dayWorkLogs++;
        
        // 检查是否需要切换到下一个地块
        if (Math.random() < 0.1 && fieldIndex < fields.length - 1) {
          fieldIndex++;
        }
      }
      
      totalWorkArea += dayWorkArea;
      totalYield += dayYield;
      totalFuel += dayFuel;
      
      dailyStats.push({
        day,
        date: workDate.toISOString().slice(0, 10),
        weather: weatherInfo.weather,
        description: weatherInfo.description,
        workArea: dayWorkArea.toFixed(0),
        yield: (dayYield / 1000).toFixed(1), // 转换为吨
        fuel: dayFuel.toFixed(0),
        logs: dayWorkLogs
      });
      
      console.log(`  第${day}天 (${workDate.toISOString().slice(0, 10)}) ${weatherInfo.weather}: 作业 ${dayWorkArea.toFixed(0)} 亩, 收获 ${(dayYield/1000).toFixed(1)} 吨`);
    }
    
    console.log(`\n✅ 生成了 ${workLogId - 1} 条作业记录`);
    console.log(`📈 10天收获统计:`);
    console.log(`   - 总作业面积: ${totalWorkArea.toFixed(0)} 亩`);
    console.log(`   - 总收获量: ${(totalYield / 1000).toFixed(1)} 吨`);
    console.log(`   - 总油耗: ${totalFuel.toFixed(0)} 升`);
    console.log(`   - 平均亩产: ${(totalYield / totalWorkArea).toFixed(1)} kg/亩\n`);
    
    // ============ 5. 生成保养记录和计划 ============
    console.log('🔧 生成设备保养记录...');
    
    let maintenanceLogId = 1;
    let maintenancePlanId = 1;
    
    for (const machine of harvesters.slice(0, 20)) { // 为前20台收割机生成保养记录
      // 生成历史保养记录
      const maintenanceDate = new Date(START_DATE);
      maintenanceDate.setDate(maintenanceDate.getDate() - Math.floor(Math.random() * 30));
      
      await connection.execute(
        `INSERT INTO maintenanceLogs (id, machineId, maintenanceType, maintenanceDate, engineHoursAtMaintenance, description, partsReplaced, laborCost, partsCost, totalCost, technician, nextMaintenanceHours) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          maintenanceLogId++,
          machine.id,
          'routine',
          maintenanceDate.toISOString().slice(0, 19).replace('T', ' '),
          (parseFloat(machine.engineHours) - 100).toFixed(2),
          '秋收前例行保养：更换机油、检查皮带、清洗滤芯',
          JSON.stringify([
            { name: '机油', quantity: 15, unit: '升' },
            { name: '机油滤芯', quantity: 1, unit: '个' },
            { name: '空气滤芯', quantity: 1, unit: '个' }
          ]),
          500,
          1200,
          1700,
          '张师傅',
          (parseFloat(machine.engineHours) + 250).toFixed(2)
        ]
      );
      
      // 生成保养计划
      const nextServiceHours = parseFloat(machine.engineHours) + 150 + Math.random() * 100;
      const priority = nextServiceHours - parseFloat(machine.engineHours) < 50 ? 'high' : 'medium';
      
      await connection.execute(
        `INSERT INTO maintenancePlans (id, machineId, planType, intervalHours, lastServiceHours, nextServiceHours, priority, status, estimatedCost) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          maintenancePlanId++,
          machine.id,
          'oil_change',
          250,
          (parseFloat(machine.engineHours) - 100).toFixed(2),
          nextServiceHours.toFixed(2),
          priority,
          priority === 'high' ? 'due' : 'pending',
          1500
        ]
      );
    }
    
    console.log(`✅ 生成了 ${maintenanceLogId - 1} 条保养记录和 ${maintenancePlanId - 1} 条保养计划\n`);
    
    // ============ 6. 输出统计摘要 ============
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                 友谊农场秋季玉米收获作业数据摘要');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📍 农场位置: ${FARM_CONFIG.name}`);
    console.log(`🌽 作物类型: ${FARM_CONFIG.cropType}`);
    console.log(`📐 总面积: ${FARM_CONFIG.totalArea.toLocaleString()} 亩`);
    console.log(`📅 收获周期: ${START_DATE.toISOString().slice(0, 10)} 至 ${new Date(START_DATE.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`);
    console.log('');
    console.log('🚜 车队配置:');
    console.log(`   - 收割机: ${harvesterCount} 台`);
    console.log(`   - 运粮车: ${grainCartCount} 台`);
    console.log('');
    console.log('📊 收获成果:');
    console.log(`   - 实际作业面积: ${totalWorkArea.toFixed(0).toLocaleString()} 亩`);
    console.log(`   - 总收获量: ${(totalYield / 1000).toFixed(1)} 吨 (${(totalYield / 1000 * 2).toFixed(1)} 万斤)`);
    console.log(`   - 平均亩产: ${(totalYield / totalWorkArea).toFixed(1)} kg/亩 (${((totalYield / totalWorkArea) * 2).toFixed(1)} 斤/亩)`);
    console.log(`   - 总油耗: ${totalFuel.toFixed(0).toLocaleString()} 升`);
    console.log(`   - 亩均油耗: ${(totalFuel / totalWorkArea).toFixed(2)} 升/亩`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    console.log('\n✅ 数据生成完成！');
    
  } catch (error) {
    console.error('❌ 数据生成失败:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
