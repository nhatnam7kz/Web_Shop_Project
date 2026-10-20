/**
 * js/cart.js - Quản lý Giỏ hàng (bản rút gọn)
 * Giả định các file chung đã có: STORAGE_KEYS, ROOT, SHIPPING_FEE, userStorageKey,
 * requireLogin, loadProducts, getFinalPrice, getImageUrl, formatPrice, colorLabel, showToast
 */

// ==========================================
// 1. XỬ LÝ DỮ LIỆU GIỎ HÀNG
// ==========================================

/** Lấy giỏ hàng của người đang đăng nhập từ localStorage (chưa đăng nhập -> []) */
function getCart() {
  const key = userStorageKey(STORAGE_KEYS.cart); // vd: shop_cart_a@gmail.com
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (error) {
    return []; // dữ liệu hỏng thì coi như giỏ trống
  }
}

/** Lưu giỏ hàng rồi cập nhật số trên header */
function saveCart(cart) {
  const key = userStorageKey(STORAGE_KEYS.cart);
  if (key) localStorage.setItem(key, JSON.stringify(cart));
  updateCartBadge();
}

/** Tìm vị trí dòng trong giỏ theo (id, size, color); không thấy trả về -1 */
function findLine(cart, id, size, color) {
  return cart.findIndex(
    (item) =>
      String(item.id) === String(id) &&
      (item.size || "") === (size || "") &&
      (item.color || "") === (color || "")
  );
}

/**
 * Thêm sản phẩm vào giỏ (cộng dồn nếu trùng id, size, color)
 * @returns {boolean} true nếu thêm được, false nếu chưa đăng nhập hoặc số lượng sai
 */
function addToCart(id, size = null, color = null, qty = 1) {
  if (!requireLogin("Vui lòng đăng nhập để thêm vào giỏ hàng")) return false;

  const amount = parseInt(qty, 10);
  if (isNaN(amount) || amount <= 0) return false;

  const cart = getCart();
  const index = findLine(cart, id, size, color);

  if (index !== -1) {
    cart[index].qty = Math.min(cart[index].qty + amount, 99); // trùng -> cộng dồn
  } else {
    cart.push({ id: Number(id), size: size || null, color: color || null, qty: Math.min(amount, 99) });
  }

  saveCart(cart);
  showToast("Đã thêm sản phẩm vào giỏ hàng!", "success");
  return true;
}

/** Đổi số lượng của một dòng (<= 0 thì xóa dòng) */
function updateCartQty(id, size, color, qty) {
  const newQty = parseInt(qty, 10);
  if (isNaN(newQty) || newQty <= 0) {
    removeFromCart(id, size, color);
    return;
  }

  const cart = getCart();
  const index = findLine(cart, id, size, color);
  if (index !== -1) {
    cart[index].qty = Math.min(newQty, 99);
    saveCart(cart);
  }
}

/** Xóa một dòng khỏi giỏ */
function removeFromCart(id, size, color) {
  const cart = getCart();
  const index = findLine(cart, id, size, color);
  if (index !== -1) {
    cart.splice(index, 1);
    saveCart(cart);
  }
}

/** Xóa toàn bộ giỏ */
function clearCart() {
  saveCart([]);
}

/** Tổng số lượng cái trong giỏ */
function getCartCount() {
  return getCart().reduce((total, item) => total + item.qty, 0);
}

/** Tạm tính (chưa gồm phí ship), đối chiếu giá từ products.json */
async function getCartTotal() {
  const catalog = await loadProducts();
  let total = 0;
  for (const item of getCart()) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (product) total += getFinalPrice(product) * item.qty;
  }
  return total;
}

/** Cập nhật số trên biểu tượng giỏ hàng ở header */
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

// ==========================================
// 2. HIỂN THỊ TRANG GIO-HANG.HTML
// ==========================================

/** Tạo HTML cho một dòng sản phẩm trong bảng giỏ */
function buildCartRow(item, product) {
  const price = getFinalPrice(product);
  const variant = [
    item.size ? `Size: ${item.size}` : "",
    item.color ? `Màu: ${colorLabel(item.color)}` : "",
  ].filter(Boolean).join(" | ");

  return `
    <tr class="cart-item-row" data-id="${item.id}" data-size="${item.size || ""}" data-color="${item.color || ""}">
      <td class="cart-item__info">
        <img src="${getImageUrl(product.images[0])}" alt="${product.name}">
        <div>
          <a href="${ROOT}pages/chi-tiet.html?id=${product.id}">${product.name}</a>
          ${variant ? `<div class="cart-item__variant">${variant}</div>` : ""}
        </div>
      </td>
      <td class="cart-item__price">${formatPrice(price)}</td>
      <td class="cart-item__qty">
        <div class="cart-qty-control">
          <button type="button" class="btn-qty-decrease">-</button>
          <input type="number" class="cart-qty-input" value="${item.qty}" min="1" max="99">
          <button type="button" class="btn-qty-increase">+</button>
        </div>
      </td>
      <td class="cart-item__total">${formatPrice(price * item.qty)}</td>
      <td class="cart-item__action">
        <button type="button" class="btn-cart-delete" title="Xóa">&times;</button>
      </td>
    </tr>
  `;
}

/** Vẽ toàn bộ trang giỏ hàng */
async function renderCartPage() {
  const container = document.getElementById("cart-page-content");
  if (!container) return;

  const cart = getCart();
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>Giỏ hàng của bạn đang trống</p>
        <a href="${ROOT}pages/san-pham.html" class="btn btn--primary">TIẾP TỤC MUA SẮM</a>
      </div>
    `;
    return;
  }

  const catalog = await loadProducts(); // tải 1 lần rồi tra cứu từng dòng
  let rowsHtml = "";
  let subtotal = 0;

  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (!product) continue; // sản phẩm không còn trong danh sách thì bỏ qua
    rowsHtml += buildCartRow(item, product);
    subtotal += getFinalPrice(product) * item.qty;
  }

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Thành tiền</th><th>Xóa</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="cart-table-footer">
          <a href="${ROOT}pages/san-pham.html">&larr; Tiếp tục mua hàng</a>
          <button type="button" id="btn-clear-cart">Xóa toàn bộ giỏ hàng</button>
        </div>
      </div>

      <div class="cart-summary-box">
        <h3>TÓM TẮT ĐƠN HÀNG</h3>
        <div class="summary-line"><span>Tạm tính:</span><span>${formatPrice(subtotal)}</span></div>
        <div class="summary-line"><span>Phí vận chuyển:</span><span>${formatPrice(SHIPPING_FEE)}</span></div>
        <hr>
        <div class="summary-line summary-total">
          <span>TỔNG CỘNG:</span><span>${formatPrice(subtotal + SHIPPING_FEE)}</span>
        </div>
        <a href="${ROOT}pages/thanh-toan.html" class="btn-checkout">TIẾN HÀNH THANH TOÁN</a>
      </div>
    </div>
  `;
}

// ==========================================
// 3. SỰ KIỆN TRÊN TRANG GIỎ HÀNG
// ==========================================

/** Đọc id/size/color từ dòng <tr> */
function readRow(row) {
  return {
    id: row.dataset.id,
    size: row.dataset.size || null,
    color: row.dataset.color || null,
    input: row.querySelector(".cart-qty-input"),
  };
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  const page = document.getElementById("cart-page-content");
  if (!page) return; // không phải trang giỏ hàng
  if (!requireLogin("Vui lòng đăng nhập để xem giỏ hàng")) return;

  renderCartPage();

  // Một listener duy nhất (event delegation) nên vẫn hoạt động sau mỗi lần vẽ lại
  page.addEventListener("click", (e) => {
    const cls = e.target.classList;

    if (e.target.id === "btn-clear-cart") {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?")) {
        clearCart();
        renderCartPage();
      }
      return;
    }

    const row = e.target.closest(".cart-item-row");
    if (!row) return;
    const { id, size, color, input } = readRow(row);
    const current = parseInt(input.value, 10);

    if (cls.contains("btn-cart-delete")) removeFromCart(id, size, color);
    else if (cls.contains("btn-qty-decrease")) updateCartQty(id, size, color, current - 1);
    else if (cls.contains("btn-qty-increase")) updateCartQty(id, size, color, current + 1);
    else return;

    renderCartPage();
  });

  // Người dùng gõ số lượng trực tiếp
  page.addEventListener("change", (e) => {
    if (!e.target.classList.contains("cart-qty-input")) return;
    const { id, size, color } = readRow(e.target.closest(".cart-item-row"));
    updateCartQty(id, size, color, e.target.value);
    renderCartPage();
  });
});