/**
 * js/cart.js - Quản lý Giỏ hàng (Phụ trách: Nam)
 * Quy ước: CONVENTIONS.md
 */

// ==========================================
// 1. CÁC HÀM XỬ LÝ DỮ LIỆU DÙNG CHUNG (API)
// ==========================================

/**
 * Lấy danh sách sản phẩm trong giỏ hàng từ localStorage
 * @returns {Array} Mảng các phần tử [{ id, size, color, qty }]
 */
function getCart() {
  try {
    const key = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.cart) ? STORAGE_KEYS.cart : "shop_cart";
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Lưu giỏ hàng vào localStorage và tự động cập nhật badge header
 * @param {Array} cart Mảng giỏ hàng cần lưu
 */
function saveCart(cart) {
  try {
    const key = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.cart) ? STORAGE_KEYS.cart : "shop_cart";
    localStorage.setItem(key, JSON.stringify(cart));
  } catch (error) {
    console.error("Lỗi khi lưu giỏ hàng:", error);
  }
  updateCartBadge();
}

/**
 * Thêm sản phẩm vào giỏ hàng (cộng dồn nếu trùng id, size, color)
 * @param {number} id Mã sản phẩm
 * @param {string|null} size Kích thước
 * @param {string|null} color Màu sắc
 * @param {number} qty Số lượng muốn thêm (mặc định 1)
 */
function addToCart(id, size = null, color = null, qty = 1) {
  const quantityToAdd = parseInt(qty, 10);
  if (isNaN(quantityToAdd) || quantityToAdd <= 0) return;

  const cart = getCart();
  const existingIndex = cart.findIndex(
    item => item.id === id && item.size === size && item.color === color
  );

  if (existingIndex !== -1) {
    // Trùng cả id, size, color -> Cộng dồn số lượng (tối đa 99)
    cart[existingIndex].qty = Math.min(cart[existingIndex].qty + quantityToAdd, 99);
  } else {
    // Món mới
    cart.push({
      id: id,
      size: size,
      color: color,
      qty: Math.min(quantityToAdd, 99)
    });
  }

  saveCart(cart);

  if (typeof showToast === "function") {
    showToast("Đã thêm sản phẩm vào giỏ hàng!", "success");
  }
}

/**
 * Cập nhật số lượng của một dòng sản phẩm
 * @param {number} id Mã sản phẩm
 * @param {string|null} size Kích thước
 * @param {string|null} color Màu sắc
 * @param {number} qty Số lượng mới
 */
function updateCartQty(id, size, color, qty) {
  const newQty = parseInt(qty, 10);
  if (isNaN(newQty) || newQty <= 0) {
    removeFromCart(id, size, color);
    return;
  }

  const cart = getCart();
  const index = cart.findIndex(
    item => item.id === id && item.size === size && item.color === color
  );

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
  const cart = getCart();
  const newCart = cart.filter(
    item => !(item.id === id && item.size === size && item.color === color)
  );
  saveCart(newCart);

  if (typeof showToast === "function") {
    showToast("Đã xóa sản phẩm khỏi giỏ hàng", "success");
  }
}

/**
 * Xóa toàn bộ giỏ hàng
 */
function clearCart() {
  const key = (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.cart) ? STORAGE_KEYS.cart : "shop_cart";
  localStorage.removeItem(key);
  updateCartBadge();
}

/**
 * Tính tổng số lượng cái của tất cả mặt hàng trong giỏ
 * @returns {number}
 */
function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (item.qty || 0), 0);
}

/**
 * Tính tổng tiền tạm tính (chưa gồm phí ship) bằng cách đối chiếu products.json
 * @returns {Promise<number>}
 */
async function getCartTotal() {
  const cart = getCart();
  if (cart.length === 0) return 0;

  let total = 0;
  for (const item of cart) {
    let product = null;
    if (typeof getProductById === "function") {
      product = await getProductById(item.id);
    }
    if (product) {
      const price = typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
      total += price * item.qty;
    }
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

  let itemsHtml = "";
  let subtotal = 0;

  for (const item of cart) {
    let product = null;
    if (typeof getProductById === "function") {
      product = await getProductById(item.id);
    }

    if (!product) continue;

    const unitPrice = typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;

    const imgDir = typeof IMAGE_DIR !== "undefined" ? IMAGE_DIR : `${rootPath}assets/images/products/`;
    const placeholder = typeof PLACEHOLDER_IMG !== "undefined" ? PLACEHOLDER_IMG : `${imgDir}placeholder.jpg`;
    const imgUrl = (typeof getImageUrl === "function" && product.images && product.images[0])
      ? getImageUrl(product.images[0])
      : (product.images && product.images[0] ? `${imgDir}${product.images[0]}` : placeholder);

    const sizeText = item.size ? `Size: ${item.size}` : "";
    const colorText = item.color ? `Màu: ${item.color}` : "";
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
  renderCartPage();

  const cartPage = document.getElementById("cart-page-content");
  if (!cartPage) return;

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