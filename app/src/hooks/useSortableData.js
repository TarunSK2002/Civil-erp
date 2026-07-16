import { useState, useMemo } from 'react';

export const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const getValue = (obj, path) => {
          if (!path) return '';
          return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };

        let aValue = getValue(a, sortConfig.key);
        let bValue = getValue(b, sortConfig.key);

        const normalize = (val) => {
          if (val === null || val === undefined) return '';
          if (typeof val === 'number') return val;
          if (val instanceof Date) return val.getTime();

          // Check for date string
          if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
            const parsed = Date.parse(val);
            if (!isNaN(parsed)) return parsed;
          }

          if (typeof val === 'string') {
            // Clean currency, commas, trim
            let clean = val.replace(/[₹,]/g, '').trim();
            // Try to extract starting number
            let match = clean.match(/^([\d.]+)/);
            if (match) {
              const num = parseFloat(match[1]);
              if (!isNaN(num)) return num;
            }
            return clean.toLowerCase();
          }
          return val;
        };

        let aNorm = normalize(aValue);
        let bNorm = normalize(bValue);

        // Put empty/null values at the end regardless of direction
        if (aNorm === '' && bNorm !== '') return 1;
        if (bNorm === '' && aNorm !== '') return -1;
        if (aNorm === '' && bNorm === '') return 0;

        if (aNorm < bNorm) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aNorm > bNorm) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    } else if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'descending'
    ) {
      setSortConfig(null);
      return;
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};
