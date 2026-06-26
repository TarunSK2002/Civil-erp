const dns = require('dns').promises;
const SyncQueue = require('./syncQueue');
require('dotenv').config();

let isSyncing = false;
let isOnline = false;
let syncIntervalId = null;
let onStatusChangeCallback = null;

// Target backend sync endpoint from environment variables
const RENDER_API_URL = process.env.RENDER_API_URL || 'http://localhost:5000/api';

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
      const statusChanged = (isOnline !== false);
      isOnline = false;
      if (statusChanged && onStatusChangeCallback) {
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
        let response;

        // Replay operation to the server sync endpoints
        const endpoint = `${RENDER_API_URL}/sync/${item.tableName.toLowerCase()}`;
        
        if (item.action === 'CREATE' || item.action === 'UPDATE') {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uuid: item.recordUuid,
              action: item.action,
              payload: payload
            }),
            signal: AbortSignal.timeout(5000)
          });
        } else if (item.action === 'DELETE') {
          response = await fetch(`${endpoint}/${item.recordUuid}`, {
            method: 'DELETE',
            signal: AbortSignal.timeout(5000)
          });
        }

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
