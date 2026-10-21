/**
 * js/cart.js - Quản lý Giỏ hàng (King Shop)
 * Phụ trách: Nam
 */

// ==========================================
// 1. XỬ LÝ DỮ LIỆU GIỎ HÀNG (STORAGE & LOGIC)
// ==========================================

/*
 * Các bước thực hiện:
 * Bước 1: Lấy key lưu trữ theo tài khoản đang đăng nhập (dạng shop_cart_email).
 * Bước 2: Nếu chưa đăng nhập (key null) -> trả về mảng rỗng [].
 * Bước 3: Đọc chuỗi JSON từ localStorage và chuyển đổi ngược thành mảng.
 */
function getCart() {
  const key = userStorageKey(STORAGE_KEYS.cart);
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (error) {
    return []; // Dữ liệu JSON bị hỏng thì coi như giỏ rỗng để web không dừng đột ngột
  }
}

/*
 * Các bước thực hiện:
 * Bước 1: Chuyển mảng giỏ hàng thành chuỗi JSON rồi ghi đè vào key của user.
 * Bước 2: Cập nhật ngay con số hiển thị trên icon giỏ hàng ở header.
 */
function saveCart(cart) {
  const key = userStorageKey(STORAGE_KEYS.cart);
  if (key) localStorage.setItem(key, JSON.stringify(cart));
  updateCartBadge();
}

/*
 * Các bước thực hiện:
 * Bước 1: Duyệt qua mảng giỏ hàng bằng hàm findIndex.
 * Bước 2: So khớp đồng thời cả 3 điều kiện: ID, Size và Màu sắc.
 * Bước 3: Trả về chỉ số vị trí tìm thấy (0, 1, 2...) hoặc -1 nếu không có.
 */
function findLine(cart, id, size, color) {
  return cart.findIndex(
    (item) =>
      String(item.id) === String(id) &&
      (item.size || "") === (size || "") &&
      (item.color || "") === (color || "")
  );
}

/*
 * Các bước thực hiện:
 * Bước 1: Kiểm tra đăng nhập (chưa đăng nhập thì dừng và chuyển hướng).
 * Bước 2: Ép kiểu số lượng nhập vào, chặn số không hợp lệ hoặc <= 0.
 * Bước 3: Tìm xem sản phẩm cùng biến thể (id, size, color) đã có trong giỏ chưa.
 * Bước 4: Nếu có -> cộng dồn số lượng. Nếu chưa -> push dòng mới vào mảng.
 * Bước 5: Lưu lại vào localStorage và hiển thị toast thông báo thành công.
 */
function addToCart(id, size = null, color = null, qty = 1) {
  if (!requireLogin("Vui lòng đăng nhập để thêm vào giỏ hàng")) return false;

  const amount = parseInt(qty, 10);
  if (isNaN(amount) || amount <= 0) return false;

  const cart = getCart();
  const index = findLine(cart, id, size, color);

  if (index !== -1) {
    cart[index].qty = Math.min(cart[index].qty + amount, 99); // Giới hạn tối đa 99 món để chống spam
  } else {
    cart.push({
      id: Number(id),
      size: size || null,
      color: color || null,
      qty: Math.min(amount, 99),
    });
  }

  saveCart(cart);
  showToast("Đã thêm sản phẩm vào giỏ hàng!", "success");
  return true;
}

/*
 * Các bước thực hiện:
 * Bước 1: Chuẩn hóa số lượng mới. Nếu <= 0 -> gọi hàm xóa sản phẩm.
 * Bước 2: Tìm vị trí dòng sản phẩm cần sửa trong giỏ.
 * Bước 3: Cập nhật lại số lượng mới (tối đa 99) và lưu vào storage.
 */
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

/*
 * Các bước thực hiện:
 * Bước 1: Tìm vị trí dòng sản phẩm theo id, size, color.
 * Bước 2: Dùng splice để cắt bỏ 1 phần tử tại vị trí đó ra khỏi mảng.
 * Cú pháp cart.splice(vị_trí_bắt_đầu, số_lượng_cần_xóa)
 * Bước 3: Lưu lại mảng giỏ hàng mới vào storage.
 */
function removeFromCart(id, size, color) {
  const cart = getCart();
  const index = findLine(cart, id, size, color);
  if (index !== -1) {
    cart.splice(index, 1);
    saveCart(cart);
  }
}

/*
 * Các bước thực hiện:
 * Bước 1: Lưu mảng rỗng [] vào localStorage của user hiện tại.
 */
function clearCart() {
  saveCart([]);
}

/*
 * Các bước thực hiện:
 * Bước 1: Lấy mảng giỏ hàng ra.
 * Bước 2: Dùng hàm reduce cộng dồn số lượng (qty) của tất cả các dòng.
 */
function getCartCount() {
  return getCart().reduce((total, item) => total + item.qty, 0);
}

/*
 * Các bước thực hiện:
 * Bước 1: Đọc danh mục sản phẩm từ file products.json.
 * Bước 2: Duyệt từng món trong giỏ hàng với catalog, dùng id đối chiếu để lấy giá bán mới nhất.
 * Bước 3: Nhân đơn giá với số lượng từng món rồi cộng dồn thành tiền tạm tính.
 * 
 * Luu i: Phải đặt async trước tên hàm getCartTotal() để biến nó thành một hàm bất đồng bộ.
 * Phải đặt await trước loadProducts() để ra lệnh cho JavaScript: 
 * "Hãy đợi tải xong toàn bộ danh mục sản phẩm từ file JSON rồi mới chạy tiếp các dòng bên dưới".   
 */
async function getCartTotal() {
  const catalog = await loadProducts();
  let total = 0;
  for (const item of getCart()) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (product) total += getFinalPrice(product) * item.qty; // Luôn lấy giá từ catalog gốc để chống sửa giá ở client
  }
  return total;
}

/*
 * Các bước thực hiện:
 * Bước 1: Tìm thẻ badge số lượng trên thanh header (#cart-badge).
 * Bước 2: Gọi getCartCount() lấy tổng số món và gán vào thẻ.
 * Bước 3: Ẩn badge nếu bằng 0, hiển thị nếu lớn hơn 0.
 */
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

/*
 * Các bước thực hiện:
 * Bước 1: Tính đơn giá sau khuyến mãi và ghép chuỗi hiển thị phân loại (Size | Màu).
 * Bước 2: Gắn data-id, data-size, data-color vào thẻ <tr> để JS tiện đọc lại.
 * Bước 3: Trả về chuỗi HTML đại diện cho một hàng sản phẩm trong bảng.
 */
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

/*
 * Các bước thực hiện:
 * Bước 1: Kiểm tra container chứa trang giỏ hàng, nếu không có thì dừng.
 * Bước 2: Nếu giỏ rỗng -> render khối thông báo trống và nút quay lại mua sắm.
 * Bước 3: Nếu có hàng -> tải products.json, chạy vòng lặp sinh các thẻ <tr> và tính tổng tiền.
 * Bước 4: Đổ toàn bộ bảng sản phẩm kèm khung tóm tắt đơn hàng vào giao diện.
 */
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

  const catalog = await loadProducts();
  let rowsHtml = "";
  let subtotal = 0;

  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (!product) continue;
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

/*
 * Các bước thực hiện:
 * Bước 1: Trích xuất các thuộc tính dataset (id, size, color) được nhúng trên thẻ <tr>.
 * Bước 2: Tìm thẻ input số lượng nằm bên trong dòng đó để lấy dữ liệu.
 */
function readRow(row) {
  return {
    id: row.dataset.id,
    size: row.dataset.size || null,
    color: row.dataset.color || null,
    input: row.querySelector(".cart-qty-input"), // thẻ input dữ liệu
  };
}

/*
 * Các bước thực hiện:
 * Bước 1: Khi DOM sẵn sàng, cập nhật badge giỏ hàng và kiểm tra đăng nhập.
 * Bước 2: Gọi renderCartPage() để vẽ bảng giỏ hàng lần đầu.
 * Bước 3: Lắng nghe sự kiện click trên khung cha (Event Delegation) để xử lý xóa hoặc tăng/giảm số lượng.
 * Bước 4: Lắng nghe sự kiện change khi khách tự gõ trực tiếp số lượng vào ô input.
 * Bước 5: Sau mỗi thao tác dữ liệu, gọi lại renderCartPage() để làm mới giao diện.
 */
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  const page = document.getElementById("cart-page-content");
  if (!page) return;
  if (!requireLogin("Vui lòng đăng nhập để xem giỏ hàng")) return;

  renderCartPage();

  // Dùng Event Delegation gắn vào phần tử cha để không bị mất sự kiện sau mỗi lần render lại innerHTML
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

  page.addEventListener("change", (e) => {
    if (!e.target.classList.contains("cart-qty-input")) return;
    const { id, size, color } = readRow(e.target.closest(".cart-item-row"));
    updateCartQty(id, size, color, e.target.value);
    renderCartPage();
  });
});