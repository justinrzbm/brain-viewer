/**
 * DataLoader - Loads and processes region feature importance data
 */

export class DataLoader {
  constructor() {
    this.featureData = new Map();
    this.availableMetrics = [];
  }

  /**
   * Load CSV data from file
   * @param {string} csvPath - Path to CSV file
   */
  async loadFeatureImportance(csvPath) {
    try {
      const response = await fetch(csvPath);
      const csvText = await response.text();
      
      this.parseCSV(csvText);
      console.log(`Loaded ${this.featureData.size} regions from feature importance data`);
      
      return this.featureData;
    } catch (error) {
      console.error('Error loading feature importance data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV text into structured data
   * @param {string} csvText - Raw CSV text
   */
  parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    
    // Parse header
    const header = lines[0].split(',');
    this.availableMetrics = header.slice(1).filter(h => h.trim() !== '');
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === ',,,') continue;
      
      const values = line.split(',');
      const feature = values[0].trim();
      
      if (!feature) continue;
      
      const data = {};
      this.availableMetrics.forEach((metric, idx) => {
        const value = parseFloat(values[idx + 1]);
        data[metric] = isNaN(value) ? 0 : value;
      });
      
      this.featureData.set(feature, data);
    }
  }

  /**
   * Get feature importance value for a specific region and metric
   * @param {string} regionName - Name of the brain region
   * @param {string} metric - Metric name (column from CSV)
   */
  getFeatureImportance(regionName, metric) {
    // Try exact match first
    if (this.featureData.has(regionName)) {
      return this.featureData.get(regionName)[metric] || 0;
    }
    
    // Try with _thickness suffix
    const thicknessKey = `${regionName}_thickness`;
    if (this.featureData.has(thicknessKey)) {
      return this.featureData.get(thicknessKey)[metric] || 0;
    }
    
    // Try with _thicknessstd suffix
    const thicknessstdKey = `${regionName}_thicknessstd`;
    if (this.featureData.has(thicknessstdKey)) {
      return this.featureData.get(thicknessstdKey)[metric] || 0;
    }
    
    return 0;
  }

  /**
   * Get min and max values for a specific metric across all regions
   * @param {string} metric - Metric name
   */
  getMetricRange(metric) {
    const values = Array.from(this.featureData.values())
      .map(data => data[metric])
      .filter(v => v !== undefined && v !== null && !isNaN(v));
    
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Normalize a value to 0-1 range based on metric range
   * @param {number} value - Raw value
   * @param {string} metric - Metric name
   */
  normalizeValue(value, metric) {
    const range = this.getMetricRange(metric);
    if (range.max === range.min) return 0.5;
    return (value - range.min) / (range.max - range.min);
  }

  /**
   * Convert normalized value to color
   * @param {number} normalizedValue - Value between 0 and 1
   */
valueToColor(normalizedValue) {
    // White to Blue gradient
    const r = Math.floor((1 - normalizedValue) * 255);
    const g = Math.floor((1 - normalizedValue) * 255);
    const b = 255;
    
    return (r << 16) | (g << 8) | b;
}

  /**
   * Get available metrics (column names)
   */
  getAvailableMetrics() {
    return this.availableMetrics;
  }
}
