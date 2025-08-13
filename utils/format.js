function formatUSCurrency(number) {
  return number.toLocaleString('en-US');
}

function formatVNCurrency(num) {
  return num.toLocaleString('vi-VN');
}

module.exports = { formatVNCurrency, formatUSCurrency };
