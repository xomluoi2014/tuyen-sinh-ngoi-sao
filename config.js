/**
 * ============================================================================
 * FILE: config.js — CẤU HÌNH DUY NHẤT CHO TOÀN BỘ HỆ THỐNG GITHUB PAGES
 * ============================================================================
 * Lưu ý: Nếu anh chọn "Quản lý các bản triển khai -> Phiên bản mới" trên GAS,
 * đường link Web App giữ nguyên như bên dưới (không cần sửa lại).
 * Nếu anh tạo một bản triển khai mới có link khác, chỉ cần dán link mới vào dòng GAS_API_URL.
 */

window.APP_CONFIG = {
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbxOU7-IYX10t-4NQbn7VevNK4YZFFOTxcSL-pyznQ8J2V5ma-P749gBy7vpZYitLYVc_w/exec',
  SYNC_CHANNEL: 'ts-sync-channel',
  PROTECT_DEVTOOLS: true
};

/**
 * Gọi Backend GAS (Code2.gs doPost) dùng text/plain để tránh CORS Preflight
 */
window.callBackend = async function(action, payload, authOverride) {
  var url = (window.APP_CONFIG.GAS_API_URL || '').trim();
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\//i.test(url)) {
    throw new Error('Link GAS_API_URL trong config.js chưa hợp lệ! Vui lòng dán link Web App .../exec vào file config.js.');
  }

  var auth = authOverride || null;
  if (!auth) {
    try {
      var saved = localStorage.getItem('ts_auth_session');
      if (saved) {
        var p = JSON.parse(saved);
        if (p && (p.token || p.password)) {
          auth = { username: p.username || '', password: p.password || '', token: p.token || '' };
        }
      }
    } catch (e) {}
  }

  var resp = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: action,
      payload: payload || {},
      auth: auth || {}
    })
  });

  if (!resp.ok) {
    throw new Error('Máy chủ Apps Script phản hồi lỗi HTTP ' + resp.status);
  }
  return await resp.json();
};

/**
 * Tải siêu tốc cấu hình + ghép danh mục hành chính tĩnh (DM_Tinh, DM_Xa, DM_Quoc_Tich)
 * giúp giảm >90% dung lượng từ GAS và mở trang dưới 1 giây.
 */
window.fetchSystemDataFast = async function(includeStaffFields) {
  var staticPromise = fetch('danhmuc_hanhchinh.json', { cache: 'force-cache' })
    .then(function(r) { return r.ok ? r.json() : null; })
    .catch(function() { return null; });

  var staticDm = await staticPromise;
  var hasStatic = Boolean(staticDm && staticDm.DM_Tinh && staticDm.DM_Xa);

  var res = await window.callBackend('getData', {
    includeStaffFields: Boolean(includeStaffFields),
    skipHeavyDanhMuc: hasStatic
  });

  if (!res || res.success === false) {
    throw new Error((res && res.error) ? res.error : 'Không tải được dữ liệu hệ thống!');
  }

  res.danh_muc = res.danh_muc || {};
  if (hasStatic) {
    res.danh_muc.DM_Tinh = staticDm.DM_Tinh;
    res.danh_muc.DM_Xa = staticDm.DM_Xa;
    if (!res.danh_muc.DM_Quoc_Tich && staticDm.DM_Quoc_Tich) {
      res.danh_muc.DM_Quoc_Tich = staticDm.DM_Quoc_Tich;
    }
  }
  return res;
};

/**
 * Tạo đường link chuẩn tới trang phụ huynh (dùng cho QR bổ sung & Copy gửi Zalo)
 */
window.buildParentRevisionLink = function(ticket) {
  var base = window.location.href.split('?')[0].split('#')[0];
  var dir = base.substring(0, base.lastIndexOf('/') + 1);
  return dir + 'phuhuynh.html?ticket=' + encodeURIComponent(String(ticket || '').trim());
};

/**
 * Chặn chuột phải / F12 (Mở ngoại lệ cho #ticketCardImage & .allow-context để phụ huynh nhấn giữ lưu ảnh QR)
 */
(function initAntiInspect() {
  if (!window.APP_CONFIG.PROTECT_DEVTOOLS) return;
  document.addEventListener('contextmenu', function(e) {
    if (e.target && (e.target.id === 'ticketCardImage' || (e.target.closest && e.target.closest('.allow-context')))) {
      return;
    }
    e.preventDefault();
  }, true);
  document.addEventListener('keydown', function(e) {
    var k = (e.key || '').toUpperCase();
    var code = e.keyCode || e.which;
    if (code === 123 || k === 'F12') { e.preventDefault(); e.stopPropagation(); return false; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C', 'K'].indexOf(k) !== -1) { e.preventDefault(); e.stopPropagation(); return false; }
    if ((e.ctrlKey || e.metaKey) && ['U', 'S'].indexOf(k) !== -1) { e.preventDefault(); e.stopPropagation(); return false; }
  }, true);
})();
