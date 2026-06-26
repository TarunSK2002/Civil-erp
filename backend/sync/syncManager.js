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

function startSyncLoop(intervalMs = 15000) {
  if (syncIntervalId) clearInterval(syncIntervalId);
  
  syncNow();
  
  syncIntervalId = setInterval(() => {
    syncNow();
  }, intervalMs);
}

function setStatusCallback(callback) {
  onStatusChangeCallback = callback;
}

module.exports = {
  checkInternet,
  checkRenderBackend,
  syncNow,
  getPendingCount,
  startSyncLoop,
  setStatusCallback,
  isOnlineStatus: () => isOnline
};
