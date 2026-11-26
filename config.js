/**
 * ============================================================================
 * FILE: config.js — CẤU HÌNH KẾT NỐI DUY NHẤT CHO TOÀN BỘ GITHUB PAGES
 * ============================================================================
 * HƯỚNG DẪN:
 * Sau khi dán Code2.gs vào Google Apps Script và Triển khai (Deploy Web App),
 * anh chỉ cần dán đường link .../exec vào biến GAS_API_URL bên dưới (1 chỗ duy nhất).
 */

window.APP_CONFIG = {
  // >>> DÁN ĐƯỜNG LINK WEB APP APPS SCRIPT CỦA ANH VÀO DÒNG DƯỚI ĐÂY <<<
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbxOU7-IYX10t-4NQbn7VevNK4YZFFOTxcSL-pyznQ8J2V5ma-P749gBy7vpZYitLYVc_w/exec',

  // Kênh đồng bộ giữa Màn hình Nhân viên và Màn hình Phụ huynh
  SYNC_CHANNEL_NAME: 'NgoiSao_TuyenSinh_Sync_v2',

  // Bật chống mở DevTools (true = bật, false = tắt khi anh đang cần debug)
  PROTECT_DEVTOOLS: true
};

/**
 * Hàm gọi Backend API thông minh (dùng POST text/plain để né CORS Preflight của GAS)
 */
window.callBackend = async function(action, payload = {}, token = '') {
  const url = (window.APP_CONFIG.GAS_API_URL || '').trim();
  if (!url || url.includes('DÁN_MÃ_TRIỂN_KHAI')) {
    throw new Error('Chưa cấu hình GAS_API_URL trong file config.js! Vui lòng mở config.js và dán link Web App của Google Apps Script vào.');
  }

  const body = JSON.stringify({
    action: action,
    payload: payload || {},
    token: token || localStorage.getItem('ns_staff_token') || ''
  });

  const resp = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: body
  });

  if (!resp.ok) {
    throw new Error('Máy chủ phản hồi lỗi HTTP ' + resp.status);
  }
  const data = await resp.json();
  return data;
};

/**
 * Chống XSS an toàn
 */
window.escapeHtml = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Tạo / lấy Device_ID chuẩn crypto.randomUUID() (128-bit entropy)
 */
window.getDeviceId = function() {
  let id = localStorage.getItem('ns_device_uuid');
  if (!id) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      id = 'DEV_' + window.crypto.randomUUID();
    } else {
      id = 'DEV_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
    }
    localStorage.setItem('ns_device_uuid', id);
  }
  return id;
};

/**
 * Chuẩn hóa chuỗi ngày dd/mm/yyyy
 */
window.formatDateInput = function(val) {
  let digits = String(val || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length >= 5) return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
};

window.isValidDateVN = function(str) {
  const m = String(str || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  if (y < 1930 || y > 2035 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
};

/**
 * Hiển thị thông báo Toast góc trên bên phải
 */
window.showToast = function(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('ns-toast-box');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ns-toast-box';
    container.className = 'ns-toast-box';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'ns-toast ns-toast-' + type;
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
};

/**
 * Gắn ảnh Logo an toàn bằng DOM element
 */
window.renderBrandLogo = function(containerEl, logoUrl) {
  if (!containerEl) return;
  containerEl.innerHTML = '';
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = 'Logo Trường';
    img.onerror = function() {
      containerEl.innerHTML = '<span style="font-size:24px;">⭐</span>';
    };
    containerEl.appendChild(img);
  } else {
    containerEl.innerHTML = '<span style="font-size:24px;">⭐</span>';
  }
};

/**
 * Bảo vệ giao diện chống nhấn F12 / Chuột phải
 * ĐÃ MỞ NGOẠI LỆ cho #ticketCardImage để phụ huynh nhấn giữ lưu ảnh QR trên Zalo/iPhone
 */
(function initProtection() {
  if (!window.APP_CONFIG.PROTECT_DEVTOOLS) return;
  document.addEventListener('contextmenu', function(e) {
    if (e.target && (e.target.id === 'ticketCardImage' || e.target.closest && e.target.closest('.allow-context'))) {
      return; // Cho phép nhấn giữ lưu ảnh thẻ QR
    }
    e.preventDefault();
  });
  document.addEventListener('keydown', function(e) {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
      (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
    ) {
      e.preventDefault();
    }
  });
})();
