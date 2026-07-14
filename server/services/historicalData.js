// historicalData.js
// Tracks gate occupancy over time for trend analysis and historical queries.
// Stores in-memory time-series data with configurable retention.

const MAX_HISTORY_POINTS = 288; // 24 hours at 5-minute intervals
const SAMPLE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// venueId -> { gateId -> [{timestamp, current, capacity, ratio, status}] }
const historyStore = new Map();
let lastSampleTime = 0;

/**
 * Record current gate statuses for a venue
 * @param {string} venueId - Venue identifier
 * @param {Array} gates - Array of classified gate objects
 */
export function recordSnapshot(venueId, gates) {
  const now = Date.now();
  
  // Sample at configured interval to avoid excessive storage
  if (now - lastSampleTime < SAMPLE_INTERVAL_MS) {
    return;
  }
  
  lastSampleTime = now;
  
  if (!historyStore.has(venueId)) {
    historyStore.set(venueId, new Map());
  }
  
  const venueHistory = historyStore.get(venueId);
  
  for (const gate of gates) {
    if (!venueHistory.has(gate.gate)) {
      venueHistory.set(gate.gate, []);
    }
    
    const gateHistory = venueHistory.get(gate.gate);
    
    // Add new data point
    gateHistory.push({
      timestamp: now,
      current: gate.current,
      capacity: gate.capacity,
      ratio: gate.ratio,
      status: gate.status,
    });
    
    // Trim to max history points (FIFO)
    if (gateHistory.length > MAX_HISTORY_POINTS) {
      gateHistory.shift();
    }
  }
}

/**
 * Get historical data for a specific gate
 * @param {string} venueId - Venue identifier
 * @param {string} gateId - Gate identifier
 * @param {number} sinceMs - Optional: only return data since this timestamp
 * @returns {Array} Array of historical data points
 */
export function getGateHistory(venueId, gateId, sinceMs = 0) {
  const venueHistory = historyStore.get(venueId);
  if (!venueHistory) return [];
  
  const gateHistory = venueHistory.get(gateId);
  if (!gateHistory) return [];
  
  if (sinceMs > 0) {
    return gateHistory.filter((point) => point.timestamp >= sinceMs);
  }
  
  return gateHistory;
}

/**
 * Get historical data for all gates in a venue
 * @param {string} venueId - Venue identifier
 * @param {number} sinceMs - Optional: only return data since this timestamp
 * @returns {Object} Object mapping gate IDs to their historical data
 */
export function getAllGatesHistory(venueId, sinceMs = 0) {
  const venueHistory = historyStore.get(venueId);
  if (!venueHistory) return {};
  
  const result = {};
  
  for (const [gateId, history] of venueHistory.entries()) {
    if (sinceMs > 0) {
      result[gateId] = history.filter((point) => point.timestamp >= sinceMs);
    } else {
      result[gateId] = history;
    }
  }
  
  return result;
}

/**
 * Analyze trends for a specific gate
 * @param {string} venueId - Venue identifier
 * @param {string} gateId - Gate identifier
 * @param {number} windowMinutes - Time window for analysis (default 60 minutes)
 * @returns {Object} Trend analysis {average, peak, growth_rate, prediction}
 */
export function analyzeGateTrend(venueId, gateId, windowMinutes = 60) {
  const sinceMs = Date.now() - windowMinutes * 60 * 1000;
  const history = getGateHistory(venueId, gateId, sinceMs);
  
  if (history.length < 2) {
    return {
      average: 0,
      peak: 0,
      growth_rate: 0,
      prediction: null,
      dataPoints: history.length,
    };
  }
  
  // Calculate statistics
  const ratios = history.map((h) => h.ratio);
  const average = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  const peak = Math.max(...ratios);
  
  // Simple linear regression for growth rate
  const recentPoints = history.slice(-10); // Last 10 data points
  if (recentPoints.length >= 2) {
    const firstRatio = recentPoints[0].ratio;
    const lastRatio = recentPoints[recentPoints.length - 1].ratio;
    const timeSpan = (recentPoints[recentPoints.length - 1].timestamp - recentPoints[0].timestamp) / (1000 * 60); // minutes
    const growth_rate = timeSpan > 0 ? (lastRatio - firstRatio) / timeSpan : 0; // ratio change per minute

    // Simple prediction: if growth continues, when will it reach critical (0.85)?
    let prediction = null;
    if (growth_rate > 0 && lastRatio < 0.85) {
      const minutesToCritical = (0.85 - lastRatio) / growth_rate;
      if (minutesToCritical > 0 && minutesToCritical < 120) {
        prediction = {
          minutes_to_critical: Math.round(minutesToCritical),
          projected_time: new Date(Date.now() + minutesToCritical * 60 * 1000).toISOString(),
        };
      }
    }
    
    return {
      average: Math.round(average * 100) / 100,
      peak: Math.round(peak * 100) / 100,
      current: lastRatio,
      growth_rate: Math.round(growth_rate * 10000) / 10000, // ratio/minute
      prediction,
      dataPoints: history.length,
    };
  }
  
  return {
    average: Math.round(average * 100) / 100,
    peak: Math.round(peak * 100) / 100,
    growth_rate: 0,
    prediction: null,
    dataPoints: history.length,
  };
}

/**
 * Clear all historical data (for testing or reset)
 */
export function clearHistory() {
  historyStore.clear();
  lastSampleTime = 0;
}
