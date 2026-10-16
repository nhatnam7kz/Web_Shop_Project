/* main.js – Khởi tạo chung, header, footer, toast (Người phụ trách: Nguyên) */

/** Đọc tham số trên URL. Ví dụ getQueryParam("id") với ?id=5 → "5" */
function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

/** Bỏ dấu tiếng Việt để tìm kiếm: "Áo phông" → "Ao phong" */
function removeVietnameseTones(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Hiện thông báo nhỏ. type: "success" hoặc "error" */
function showToast(message, type = "success") {
  const box = document.getElementById("toast-container");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.classList.add("toast--hide"), 2500);
  setTimeout(() => el.remove(), 3000);
}

/** Đổ header vào #site-header */
function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  const page = (name) => `${ROOT}pages/${name}.html`;
  const catLinks = CATEGORIES.map(
    (c) =>
      `<li><a href="${page("san-pham")}?category=${c.slug}">${c.name}</a></li>`,
  ).join("");

  el.innerHTML = `
    <div class="topbar" id="topbar">
      <span>Website chính thức của ${SHOP_NAME}</span>
      <button class="topbar__close" id="topbar-close" aria-label="Đóng thông báo">×</button>
    </div>
    <header class="header">
      <div class="container header__inner">
        <button class="header__menu-btn" id="menu-btn" aria-label="Mở menu">☰</button>

        <a class="header__logo" href="${ROOT}index.html">
        <img src="${ROOT}assets/images/logo.png" alt="${SHOP_NAME}">
        </a>
        
        <nav class="nav" id="main-nav">
          <ul class="nav__list">
            <li><a href="${ROOT}index.html">Trang chủ</a></li>
            <li class="nav__item--dropdown">
              <a href="${page("san-pham")}">Sản phẩm</a>
              <ul class="nav__dropdown">${catLinks}</ul>
            </li>
            <li><a href="${page("gioi-thieu")}">Giới thiệu</a></li>
            <li><a href="${page("lien-he")}">Liên hệ</a></li>
          </ul>
        </nav>
        <form class="header__search" id="search-form" role="search">
          <input id="search-input" type="search" placeholder="Tìm sản phẩm..." autocomplete="off">
          <button id="search-btn" type="submit" aria-label="Tìm kiếm">
            <svg class="header__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"></circle><path d="m16 16 4.5 4.5"></path></svg>
          </button>
        </form>
        <div class="header__actions">
          <a href="${page("tai-khoan")}" id="user-link" class="header__icon" title="Tài khoản" aria-label="Tài khoản">
            <svg class="header__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c.8-3.3 3.2-5 7.5-5s6.7 1.7 7.5 5"></path></svg>
          </a>
          <a href="${page("gio-hang")}" class="header__icon" title="Giỏ hàng" aria-label="Giỏ hàng">
            <svg class="header__icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.5L20.5 8H6"></path><circle cx="9" cy="20" r="1"></circle><circle cx="17" cy="20" r="1"></circle></svg>
            <span class="badge" id="cart-badge">0</span>
          </a>
        </div>
      </div>
    </header>`;
}

/** Đổ footer và các nút nổi vào #site-footer */
function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const page = (name) => `${ROOT}pages/${name}.html`;
  const policy = (key, label) =>
    `<li><a href="${page("chinh-sach")}?p=${key}">${label}</a></li>`;

  el.innerHTML = `
    <footer class="footer">
      <div class="container footer__grid">
        <div>
          <a class="footer__brand" href="${ROOT}index.html">
          <img src="${ROOT}assets/images/logo.png" alt="">
          <span>${SHOP_NAME}</span>
          </a>

          <p>Đồ lưu niệm và thời trang phong cách gaming.</p>
          <p>Hotline: <a href="tel:${HOTLINE.replace(/\s/g, "")}">${HOTLINE}</a></p>
        </div>
        <div>
          <h3 class="footer__title">Chính sách</h3>
          <ul>
            ${policy("bao-mat", "Chính sách bảo mật")}
            ${policy("dieu-khoan", "Điều khoản dịch vụ")}
            ${policy("giao-nhan", "Giao nhận")}
            ${policy("thanh-toan", "Thanh toán")}
            ${policy("doi-tra", "Đổi trả")}
          </ul>
        </div>
        <div>
          <h3 class="footer__title">Hỗ trợ</h3>
          <ul>
            <li><a href="${page("gioi-thieu")}">Giới thiệu</a></li>
            <li><a href="${page("lien-he")}">Liên hệ</a></li>
            <li><a href="${page("tai-khoan")}">Tra cứu đơn hàng</a></li>
          </ul>
        </div>
        <div>
          <h3 class="footer__title">Nhận tin khuyến mãi</h3>
          <!-- Logic xử lý form này do Vương làm (validate email, thông báo) -->
          <form id="newsletter-form" class="footer__newsletter" novalidate>
            <input type="email" id="newsletter-email" placeholder="Email của bạn">
            <button type="submit" class="btn btn--primary">Đăng ký</button>
          </form>
        </div>
      </div>
      <div class="footer__bottom">© ${new Date().getFullYear()} ${SHOP_NAME} – Bài tập lớn môn Thiết kế Web</div>
    </footer>
    <div class="floating">
      <a class="floating__btn floating__phone" href="tel:${HOTLINE.replace(/\s/g, "")}" title="Gọi điện" aria-label="Gọi điện">
        <img src="https://theme.hstatic.net/200000881795/1001243022/14/addthis-phone.svg?v=181" alt="">
      </a>
      <a class="floating__btn floating__messenger" href="${MESSENGER_URL}" target="_blank" rel="noopener" title="Messenger" aria-label="Mở Messenger">
        <img src="${ROOT}assets/images/banner/mess.png" alt="">
      </a>
      <button class="floating__btn floating__top" id="back-to-top" title="Lên đầu trang">↑</button>
    </div>`;
}

/** Gắn sự kiện cho header và các nút nổi */
function initHeaderEvents() {
  document.getElementById("menu-btn")?.addEventListener("click", () => {
    document.getElementById("main-nav").classList.toggle("nav--open");
  });
  document.getElementById("topbar-close")?.addEventListener("click", () => {
    document.getElementById("topbar").remove();
  });
  // Tìm kiếm cơ bản: chuyển sang trang kết quả (Kiệt xử lý tiếp ở search.js)
  document.getElementById("search-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("search-input").value.trim();
    if (q)
      location.href = `${ROOT}pages/tim-kiem.html?q=${encodeURIComponent(q)}`;
  });
  const topBtn = document.getElementById("back-to-top");
  if (topBtn) {
    topBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    );
    window.addEventListener("scroll", () => {
      topBtn.classList.toggle("floating__top--show", window.scrollY > 300);
    });
  }
}

/** Gắn icon cho tab trình duyệt */
function setFavicon() {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = ROOT + "/assets/images/logo.png";
}

document.addEventListener("DOMContentLoaded", () => {
  setFavicon();
  renderHeader();
  renderFooter();
  initHeaderEvents();
  // Các hàm này do người khác viết; có thì gọi, chưa có thì bỏ qua
  ["updateCartBadge", "updateWishlistBadge"].forEach((fn) => {
    if (typeof window[fn] === "function") window[fn]();
  });
});
