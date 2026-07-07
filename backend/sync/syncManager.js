const dns = require('dns').promises;
const SyncQueue = require('./syncQueue');
require('dotenv').config();

let isSyncing = false;
let isOnline = false;
let syncIntervalId = null;
let onStatusChangeCallback = null;

// Target backend sync endpoint from environment variables
const RENDER_API_URL = process.env.RENDER_API_URL || 'https://civil-erp.onrender.com/api';

async function checkInternet() {
  try {
    // DNS resolution test to check active internet
    await dns.lookup('google.com');
    return true;
  } catch (err) {
    return false;
  }
}

async function checkRenderBackend() {
  try {
    // Trim '/api' to ping the root '/health' route or settings health route
    const healthUrl = RENDER_API_URL.replace(/\/api\/?$/, '') + '/health';
    
    // Call the backend health check with a 3s timeout
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const data = await response.json();
      return data.status === 'OK';
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function getPendingCount() {
  try {
    return await SyncQueue.count({
      where: { status: ['PENDING', 'FAILED'] }
    });
  } catch (err) {
    return 0;
  }
}

async function waitForActiveSync(timeoutMs = 10000) {
  const startedAt = Date.now();
  while (isSyncing && Date.now() - startedAt < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return !isSyncing;
}

// Helper to dynamically remap primary keys and foreign keys in SQLite upon sync ID clash
async function remapLocalId(tableName, oldId, newId) {
  const dbModels = require('../models');
  const sequelize = dbModels.sequelize;
  const SyncQueue = dbModels.SyncQueue;

  const modelName = Object.keys(dbModels).find(key => {
    const m = dbModels[key];
    return m && m.tableName === tableName;
  });
  if (!modelName) return;
  const Model = dbModels[modelName];

  console.log(`[Sync Remap] Remapping ${tableName} ID from ${oldId} to ${newId}`);

  // Update the primary key in local SQLite database (bypass scopes and hooks)
  await Model.unscoped().update(
    { id: newId },
    { where: { id: oldId }, hooks: false }
  );

  // Update all associated models' foreign keys pointing to this model
  for (const key of Object.keys(dbModels)) {
    if (key === 'sequelize' || key === 'SyncQueue') continue;
    const AssociateModel = dbModels[key];
    if (!AssociateModel || !AssociateModel.associations) continue;

    for (const assocName of Object.keys(AssociateModel.associations)) {
      const association = AssociateModel.associations[assocName];
      if (association.target === Model && association.foreignKey) {
        const fk = association.foreignKey;
        await AssociateModel.unscoped().update(
          { [fk]: newId },
          { where: { [fk]: oldId }, hooks: false }
        );
      }
    }
  }

  // Rewrite any pending SyncQueue item payloads that refer to the old ID
  const unsyncedItems = await SyncQueue.findAll({
    where: { status: ['PENDING', 'FAILED'] }
  });

  for (const item of unsyncedItems) {
    if (item.payload) {
      try {
        const payload = JSON.parse(item.payload);
        let updated = false;

        // If the payload is for the same table, update its own primary key
        if (item.tableName === tableName) {
          if (payload.id === oldId) { payload.id = newId; updated = true; }
          if (payload.Id === oldId) { payload.Id = newId; updated = true; }
        }

        // If the payload is for another table, scan and update any matching foreign key
        if (item.tableName !== tableName) {
          const AssociateModelName = Object.keys(dbModels).find(k => dbModels[k].tableName === item.tableName);
          const AssociateModel = dbModels[AssociateModelName];
          if (AssociateModel && AssociateModel.associations) {
            for (const assocName of Object.keys(AssociateModel.associations)) {
              const association = AssociateModel.associations[assocName];
              if (association.target === Model && association.foreignKey) {
                const fk = association.foreignKey;
                // Check exact field or lower-case variation in payload
                const fkField = Object.keys(payload).find(k => k.toLowerCase() === fk.toLowerCase());
                if (fkField && payload[fkField] === oldId) {
                  payload[fkField] = newId;
                  updated = true;
                }
              }
            }
          }
        }

        if (updated) {
          item.payload = JSON.stringify(payload);
          await item.save();
        }
      } catch (err) {
        console.error('[Sync Remap] Failed to update unsynced payload:', err.message);
      }
    }
  }
}

async function syncNow() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const onlineNow = await checkInternet();
    
    if (!onlineNow) {
      isOnline = false;
      if (onStatusChangeCallback) {
        onStatusChangeCallback({ isOnline, pendingCount: await getPendingCount() });
      }
      isSyncing = false;
      return;
    }

    // Check backend server availability
    const backendOnline = await checkRenderBackend();
    const statusChanged = (isOnline !== backendOnline);
    isOnline = backendOnline;

    if (!backendOnline) {
      if (statusChanged && onStatusChangeCallback) {
        onStatusChangeCallback({ 
          isOnline: false, 
          pendingCount: await getPendingCount(),
          error: 'Central API backend offline'
        });
      }
      isSyncing = false;
      return;
    }

    // Load pending entries
    const pendingItems = await SyncQueue.findAll({
      where: { status: ['PENDING', 'FAILED'] },
      order: [['id', 'ASC']]
    });

    for (const item of pendingItems) {
      try {
        const payload = item.payload ? JSON.parse(item.payload) : null;
        
        // Replay operation to the server unified sync endpoint
        const endpoint = `${RENDER_API_URL}/sync`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: item.tableName,
            action: item.action,
            uuid: item.recordUuid,
            payload: payload
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (response && response.ok) {
          const resData = await response.json().catch(() => ({}));
          const localId = payload ? (payload.id || payload.Id) : null;
          
          if (resData.newId && localId && resData.newId !== localId) {
            await remapLocalId(item.tableName, localId, resData.newId);
          }

          item.status = 'SYNCED';
          item.errorMessage = null;
          await item.save();
        } else {
          const errData = response ? await response.json().catch(() => ({})) : {};
          throw new Error(errData.error || `HTTP ${response ? response.status : 'error'}`);
        }
      } catch (err) {
        console.error(`Sync failure for item ${item.id}:`, err.message);
        item.status = 'FAILED';
        item.errorMessage = err.message;
        await item.save();
        
        // Halt sequence to preserve chronological integrity
        break;
      }
    }

    if (onStatusChangeCallback) {
      onStatusChangeCallback({ isOnline, pendingCount: await getPendingCount() });
    }
  } catch (err) {
    console.error('Error running sync queue:', err.message);
  } finally {
    isSyncing = false;
  }
}

async function _pullNow() {
  const dbModels = require('../models');
  const sequelize = dbModels.sequelize;
  let currentTable = '';
  try {
    const endpoint = `${RENDER_API_URL}/sync/pull`;
    const response = await fetch(endpoint, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} on pull`);
    }

    const cloudData = await response.json();
    const idMaps = {};
    const modelKeys = getPullModelOrder(dbModels, cloudData);

    // Disable foreign key checks during import to prevent constraint failures
    await sequelize.query('PRAGMA foreign_keys = OFF;').catch(() => {});

    // Loop through each table and merge records locally
    for (const modelKey of modelKeys) {
      const Model = dbModels[modelKey];
      const tableName = Model.tableName;
      currentTable = tableName;
      const records = cloudData[tableName];
      idMaps[tableName] = idMaps[tableName] || new Map();

      for (const cloudRecord of records) {
        const uuid = cloudRecord.uuid;
        if (!uuid) continue;
        const cloudId = cloudRecord.id || cloudRecord.Id;
        const pullPayload = remapPullForeignKeys(Model, { ...cloudRecord }, idMaps);

        // Check if record already exists locally (bypassing default soft-delete scopes)
        const existingRecord = await Model.unscoped().findOne({ where: { uuid } });

        if (existingRecord) {
          const updatePayload = { ...pullPayload };
          delete updatePayload.id;
          delete updatePayload.Id;
          await existingRecord.update(updatePayload, { hooks: false });
          if (cloudId) {
            idMaps[tableName].set(Number(cloudId), existingRecord.id || existingRecord.Id);
          }
        } else {
          const createPayload = { ...pullPayload };
          const requestedId = createPayload.id || createPayload.Id;

          if (requestedId) {
            const idClash = await Model.unscoped().findByPk(requestedId);
            if (idClash) {
              delete createPayload.id;
              delete createPayload.Id;
              console.log(`[Pull] Local ID clash on "${tableName}" for cloud ID ${requestedId}. Creating with a new local ID.`);
            }
          }

          const newRecord = await Model.create(createPayload, { hooks: false });
          if (cloudId) {
            idMaps[tableName].set(Number(cloudId), newRecord.id || newRecord.Id);
          }
        }
      }
    }

    console.log('Database pull synchronization complete.');
  } catch (err) {
    let msg = err.message;
    if (err.errors && err.errors.length > 0) {
      msg = `${err.message}: ${err.errors.map(e => `${e.path} (${e.value}) - ${e.message}`).join(', ')}`;
    }
    const finalErrorMsg = `Table [${currentTable || 'unknown'}]: ${msg}`;
    console.error('Error running pull sync:', finalErrorMsg);
    throw new Error(finalErrorMsg);
  } finally {
    // Re-enable foreign key checks
    await sequelize.query('PRAGMA foreign_keys = ON;').catch(() => {});
  }
}

function getPullModelOrder(dbModels, cloudData) {
  const preferredOrder = [
    'Client',
    'Payee',
    'Labour',
    'MaterialType',
    'Material',
    'Site',
    'SiteSection',
    'SiteProject',
    'ShiftMaster',
    'PersonType',
    'SiteWorkValue',
    'SiteMaterial',
    'Payment',
    'AttendanceSheet',
    'AttendanceRecord',
    'AttendanceMisc',
    'LiftingRecord',
    'WeeklyPaySheet',
    'WeeklyPaySheetItem',
    'PettyCash',
    'PersonalExpense'
  ];

  const cloudTables = new Set(Object.keys(cloudData));
  const syncableKeys = Object.keys(dbModels).filter(key => {
    const Model = dbModels[key];
    return Model && Model.tableName && cloudTables.has(Model.tableName);
  });

  const orderedKeys = preferredOrder.filter(key => syncableKeys.includes(key));
  const remainingKeys = syncableKeys.filter(key => !orderedKeys.includes(key));
  return [...orderedKeys, ...remainingKeys];
}

function remapPullForeignKeys(Model, payload, idMaps) {
  if (!Model.associations) return payload;

  for (const association of Object.values(Model.associations)) {
    if (association.associationType !== 'BelongsTo' || !association.target || !association.foreignKey) {
      continue;
    }

    const targetTable = association.target.tableName;
    const targetMap = idMaps[targetTable];
    if (!targetMap) continue;

    const fk = association.foreignKey;
    const payloadField = Object.keys(payload).find(key => key.toLowerCase() === fk.toLowerCase());
    if (!payloadField || payload[payloadField] == null) continue;

    const mappedId = targetMap.get(Number(payload[payloadField]));
    if (mappedId) {
      payload[payloadField] = mappedId;
    }
  }

  return payload;
}

async function pullNow() {
  if (isSyncing) {
    const canRun = await waitForActiveSync();
    if (!canRun) {
      throw new Error('Another sync is still running. Please try again in a few seconds.');
    }
  }
  isSyncing = true;
  try {
    const onlineNow = await checkInternet();
    if (!onlineNow) {
      isOnline = false;
      throw new Error('No internet connection');
    }
    const backendOnline = await checkRenderBackend();
    isOnline = backendOnline;
    if (!backendOnline) {
      throw new Error('Central API backend offline');
    }
    await _pullNow();
  } finally {
    isSyncing = false;
  }
}

let pullIntervalId = null;

function startSyncLoop(intervalMs = 15000) {
  if (syncIntervalId) clearInterval(syncIntervalId);
  if (pullIntervalId) clearInterval(pullIntervalId);
  
  // Initial startup synchronization
  syncNow();
  pullNow().catch(err => console.error('Background pull failed:', err.message));
  
  // Push local changes loop (default every 15 seconds)
  syncIntervalId = setInterval(() => {
    syncNow();
  }, intervalMs);

  // Pull cloud changes loop (every 5 minutes)
  pullIntervalId = setInterval(() => {
    pullNow().catch(err => console.error('Background pull failed:', err.message));
  }, 300000);
}

function setStatusCallback(callback) {
  onStatusChangeCallback = callback;
}

module.exports = {
  checkInternet,
  checkRenderBackend,
  syncNow,
  pullNow,
  getPendingCount,
  startSyncLoop,
  setStatusCallback,
  isOnlineStatus: () => isOnline
};
