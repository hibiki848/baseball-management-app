window.Analysis = {
  formatAverage(value) {
    return Number(value || 0).toFixed(3);
  },
  formatPercent(value) {
    return `${(Number(value || 0) * 100).toFixed(1)}%`;
  },
};
