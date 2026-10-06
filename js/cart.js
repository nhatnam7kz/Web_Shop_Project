/**
 * js/cart.js - Quản lý Giỏ hàng (Phụ trách: Nam)
 * Quy ước: CONVENTIONS.md
 *
 * Thay đổi so với bản cũ:
 *  - addToCart yêu cầu đăng nhập, trả về true/false
 *  - Mỗi tài khoản một giỏ riêng (key shop_cart_<email>), đăng xuất không cần xóa giỏ
 *  - Chuẩn hóa id (số), size/color (null nếu rỗng) ở mọi hàm -> xóa/sửa số lượng không bị lệch
 *  - Trang giỏ hàng tải danh sách sản phẩm 1 lần, không còn bị trống do chạy đua dữ liệu
 *  - Hiện tên màu tiếng Việt, có cảnh báo trong Console khi không tìm thấy sản phẩm
 */

// ==========================================
// 0. HÀM HỖ TRỢ NỘI BỘ
// ==========================================

/**
 * Key localStorage của giỏ hàng: MỖI NGƯỜI MỘT GIỎ (shop_cart_<email>).
 * Trả về null nếu chưa đăng nhập (lúc đó coi như không có giỏ).
 */
function cartStorageKey() {
  const base = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.cart) ? STORAGE_KEYS.cart : "shop_cart";
  return typeof userStorageKey === "function" ? userStorageKey(base) : base;
}

/** Chuẩn hóa 1 dòng giỏ hàng: id là số, size/color rỗng thì thành null */
function normalizeLine(id, size, color) {
  return { id: Number(id), size: size || null, color: color || null };
}

/** So sánh dòng giỏ hàng với (id, size, color) đã chuẩn hóa */
function isSameLine(item, line) {
  return Number(item.id) === line.id
    && (item.size || null) === line.size
    && (item.color || null) === line.color;
}

/**
 * Kiểm tra đăng nhập (auth.js của Vương cung cấp requireLogin).
 * Nếu auth.js chưa có thì cho qua để không làm hỏng lúc đang phát triển.
 */
function ensureLoggedIn(message) {
  if (typeof requireLogin === "function") return requireLogin(message);
  return true;
}

// ==========================================
// 1. CÁC HÀM XỬ LÝ DỮ LIỆU DÙNG CHUNG (API)
// ==========================================

/**
 * Lấy danh sách sản phẩm trong giỏ hàng từ localStorage
 * @returns {Array} Mảng các phần tử [{ id, size, color, qty }]
 */
function getCart() {
  const key = cartStorageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

/**
 * Lưu giỏ hàng vào localStorage và tự động cập nhật badge header
 * @param {Array} cart Mảng giỏ hàng cần lưu
 */
function saveCart(cart) {
  const key = cartStorageKey();
  try {
    if (key) localStorage.setItem(key, JSON.stringify(cart));
  } catch (error) {
    console.error("Lỗi khi lưu giỏ hàng:", error);
  }
  updateCartBadge();
}

/**
 * Thêm sản phẩm vào giỏ hàng (cộng dồn nếu trùng id, size, color).
 * Yêu cầu đăng nhập.
 * @param {number} id Mã sản phẩm
 * @param {string|null} size Kích thước
 * @param {string|null} color Màu sắc
 * @param {number} qty Số lượng muốn thêm (mặc định 1)
 * @returns {boolean} true nếu thêm thành công, false nếu bị chặn hoặc dữ liệu sai
 */
function addToCart(id, size = null, color = null, qty = 1) {
  if (!ensureLoggedIn("Vui lòng đăng nhập để thêm vào giỏ hàng")) return false;

  const quantityToAdd = parseInt(qty, 10);
  if (isNaN(quantityToAdd) || quantityToAdd <= 0) return false;

  const line = normalizeLine(id, size, color);
  const cart = getCart();
  const existingIndex = cart.findIndex((item) => isSameLine(item, line));

  if (existingIndex !== -1) {
    // Trùng cả id, size, color -> Cộng dồn số lượng (tối đa 99)
    cart[existingIndex].qty = Math.min((Number(cart[existingIndex].qty) || 0) + quantityToAdd, 99);
  } else {
    // Món mới
    cart.push({ ...line, qty: Math.min(quantityToAdd, 99) });
  }

  saveCart(cart);

  if (typeof showToast === "function") {
    showToast("Đã thêm sản phẩm vào giỏ hàng!", "success");
  }
  return true;
}

/**
 * Cập nhật số lượng của một dòng sản phẩm
 * @param {number} id Mã sản phẩm
 * @param {string|null} size Kích thước
 * @param {string|null} color Màu sắc
 * @param {number} qty Số lượng mới (<= 0 thì xóa dòng)
 */
function updateCartQty(id, size, color, qty) {
  const newQty = parseInt(qty, 10);
  if (isNaN(newQty) || newQty <= 0) {
    removeFromCart(id, size, color);
    return;
  }

  const line = normalizeLine(id, size, color);
  const cart = getCart();
  const index = cart.findIndex((item) => isSameLine(item, line));

  if (index !== -1) {
    cart[index].qty = Math.min(newQty, 99);
    saveCart(cart);
  }
}

/**
 * Xóa một dòng sản phẩm khỏi giỏ hàng
 * @param {number} id Mã sản phẩm
 * @param {string|null} size Kích thước
 * @param {string|null} color Màu sắc
 */
function removeFromCart(id, size, color) {
  const line = normalizeLine(id, size, color);
  const newCart = getCart().filter((item) => !isSameLine(item, line));
  saveCart(newCart);

  if (typeof showToast === "function") {
    showToast("Đã xóa sản phẩm khỏi giỏ hàng", "success");
  }
}

/**
 * Xóa toàn bộ giỏ hàng
 */
function clearCart() {
  const key = cartStorageKey();
  if (key) localStorage.removeItem(key);
  updateCartBadge();
}

/**
 * Tính tổng số lượng cái của tất cả mặt hàng trong giỏ
 * @returns {number}
 */
function getCartCount() {
  return getCart().reduce((total, item) => total + (Number(item.qty) || 0), 0);
}

/**
 * Tải danh sách sản phẩm (dùng chung cho tính tiền và vẽ giỏ hàng).
 * Lỗi tải thì trả về mảng rỗng và báo trong Console.
 */
async function getCatalogForCart() {
  try {
    if (typeof loadProducts === "function") return await loadProducts();
  } catch (error) {
    console.error("Không tải được danh sách sản phẩm:", error);
  }
  return [];
}

/** Giá bán thực tế của 1 sản phẩm */
function unitPriceOf(product) {
  return typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
}

/**
 * Tính tổng tiền tạm tính (chưa gồm phí ship) bằng cách đối chiếu products.json
 * @returns {Promise<number>}
 */
async function getCartTotal() {
  const cart = getCart();
  if (cart.length === 0) return 0;

  const catalog = await getCatalogForCart();
  let total = 0;
  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (!product) {
      console.warn("Giỏ hàng: không tìm thấy sản phẩm", item, "| số SP đã tải:", catalog.length);
      continue;
    }
    total += unitPriceOf(product) * (Number(item.qty) || 0);
  }
  return total;
}

/**
 * Cập nhật số hiển thị trên biểu tượng giỏ hàng ở header (#cart-badge)
 */
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

// Hàm hỗ trợ format tiền tệ độc lập
function formatMoneyLocal(amount) {
  if (typeof formatPrice === "function") return formatPrice(amount);
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// ==========================================
// 2. HIỂN THỊ GIAO DIỆN TRANG GIO-HANG.HTML
// ==========================================

async function renderCartPage() {
  const cartContainer = document.getElementById("cart-page-content");
  if (!cartContainer) return;

  const cart = getCart();
  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
  const shippingFee = typeof SHIPPING_FEE !== "undefined" ? SHIPPING_FEE : 30000;

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <p>Giỏ hàng của bạn đang trống</p>
        <a href="${rootPath}pages/san-pham.html" class="btn btn--primary">TIẾP TỤC MUA SẮM</a>
      </div>
    `;
    return;
  }

  // Tải danh sách sản phẩm 1 lần rồi tra cứu, không gọi từng dòng
  const catalog = await getCatalogForCart();
  const imgDir = typeof IMAGE_DIR !== "undefined" ? IMAGE_DIR : `${rootPath}assets/images/products/`;
  const placeholder = typeof PLACEHOLDER_IMG !== "undefined" ? PLACEHOLDER_IMG : `${imgDir}placeholder.jpg`;

  let itemsHtml = "";
  let subtotal = 0;

  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));

    if (!product) {
      console.warn("Giỏ hàng: không tìm thấy sản phẩm", item, "| số SP đã tải:", catalog.length);
      continue;
    }

    const unitPrice = unitPriceOf(product);
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;

    const imgUrl = (typeof getImageUrl === "function" && product.images && product.images[0])
      ? getImageUrl(product.images[0])
      : (product.images && product.images[0] ? `${imgDir}${product.images[0]}` : placeholder);

    const colorName = item.color
      ? (typeof colorLabel === "function" ? colorLabel(item.color) : item.color)
      : "";
    const sizeText = item.size ? `Size: ${item.size}` : "";
    const colorText = colorName ? `Màu: ${colorName}` : "";
    const variantText = [sizeText, colorText].filter(Boolean).join(" | ");

    itemsHtml += `
      <tr class="cart-item-row" data-id="${item.id}" data-size="${item.size || ''}" data-color="${item.color || ''}">
        <td class="cart-item__info">
          <img src="${imgUrl}" alt="${product.name}">
          <div>
            <a href="${rootPath}pages/chi-tiet.html?id=${product.id}">${product.name}</a>
            ${variantText ? `<div class="cart-item__variant">${variantText}</div>` : ""}
          </div>
        </td>
        <td class="cart-item__price">${formatMoneyLocal(unitPrice)}</td>
        <td class="cart-item__qty">
          <div class="cart-qty-control">
            <button type="button" class="btn-qty-decrease">-</button>
            <input type="number" class="cart-qty-input" value="${item.qty}" min="1" max="99">
            <button type="button" class="btn-qty-increase">+</button>
          </div>
        </td>
        <td class="cart-item__total">${formatMoneyLocal(lineTotal)}</td>
        <td class="cart-item__action">
          <button type="button" class="btn-cart-delete" title="Xóa">&times;</button>
        </td>
      </tr>
    `;
  }

  // Giỏ có dữ liệu nhưng không khớp sản phẩm nào (vd: dữ liệu cũ bị lỗi) -> báo rõ thay vì hiện bảng trống
  if (!itemsHtml) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <p>Không hiển thị được sản phẩm trong giỏ hàng. Vui lòng thử tải lại trang.</p>
        <button type="button" id="btn-clear-cart" class="btn btn--outline">Xóa giỏ hàng</button>
      </div>
    `;
    return;
  }

  const grandTotal = subtotal + shippingFee;

  cartContainer.innerHTML = `
    <div class="cart-layout">
      <!-- Bảng danh sách hàng bên trái -->
      <div class="cart-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Đơn giá</th>
              <th>Số lượng</th>
              <th>Thành tiền</th>
              <th>Xóa</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="cart-table-footer">
          <a href="${rootPath}pages/san-pham.html">&larr; Tiếp tục mua hàng</a>
          <button type="button" id="btn-clear-cart">Xóa toàn bộ giỏ hàng</button>
        </div>
      </div>

      <!-- Hộp tóm tắt đơn hàng bên phải -->
      <div class="cart-summary-box">
        <h3>TÓM TẮT ĐƠN HÀNG</h3>
        <div class="summary-line">
          <span>Tạm tính:</span>
          <span>${formatMoneyLocal(subtotal)}</span>
        </div>
        <div class="summary-line">
          <span>Phí vận chuyển:</span>
          <span>${formatMoneyLocal(shippingFee)}</span>
        </div>
        <hr>
        <div class="summary-line summary-total">
          <span>TỔNG CỘNG:</span>
          <span>${formatMoneyLocal(grandTotal)}</span>
        </div>
        <a href="${rootPath}pages/thanh-toan.html" class="btn-checkout">TIẾN HÀNH THANH TOÁN</a>
      </div>
    </div>
  `;
}

// Bắt sự kiện trên giao diện Giỏ hàng
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  const cartPage = document.getElementById("cart-page-content");
  if (!cartPage) return;

  // Trang giỏ hàng yêu cầu đăng nhập
  if (!ensureLoggedIn("Vui lòng đăng nhập để xem giỏ hàng")) return;

  renderCartPage();

  // Lắng nghe sự kiện click: Tăng/giảm/xóa dòng/xóa hết
  cartPage.addEventListener("click", (e) => {
    // Xóa toàn bộ giỏ
    if (e.target.id === "btn-clear-cart") {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?")) {
        clearCart();
        renderCartPage();
      }
      return;
    }

    const row = e.target.closest(".cart-item-row");
    if (!row) return;

    const id = parseInt(row.dataset.id, 10);
    const size = row.dataset.size || null;
    const color = row.dataset.color || null;

    // Nút xóa một dòng
    if (e.target.classList.contains("btn-cart-delete")) {
      removeFromCart(id, size, color);
      renderCartPage();
      return;
    }

    // Nút giảm số lượng
    if (e.target.classList.contains("btn-qty-decrease")) {
      const input = row.querySelector(".cart-qty-input");
      const currentVal = parseInt(input.value, 10);
      updateCartQty(id, size, color, currentVal - 1);
      renderCartPage();
      return;
    }

    // Nút tăng số lượng
    if (e.target.classList.contains("btn-qty-increase")) {
      const input = row.querySelector(".cart-qty-input");
      const currentVal = parseInt(input.value, 10);
      updateCartQty(id, size, color, currentVal + 1);
      renderCartPage();
      return;
    }
  });

  // Lắng nghe sự kiện nhập số lượng trực tiếp
  cartPage.addEventListener("change", (e) => {
    if (e.target.classList.contains("cart-qty-input")) {
      const row = e.target.closest(".cart-item-row");
      const id = parseInt(row.dataset.id, 10);
      const size = row.dataset.size || null;
      const color = row.dataset.color || null;
      updateCartQty(id, size, color, e.target.value);
      renderCartPage();
    }
  });
});