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
 *
 * Các bước:
 *  1. Chọn tên gốc của key: ưu tiên STORAGE_KEYS.cart từ file config, không có thì dùng "shop_cart".
 *  2. Nếu có hàm userStorageKey (auth.js) thì gắn email người dùng vào tên gốc.
 *     Hàm này trả về null khi chưa đăng nhập.
 *  3. Không có hàm userStorageKey thì dùng luôn tên gốc.
 */
function cartStorageKey() {
  // Bước 1: chọn tên gốc
  let base;
  if (typeof STORAGE_KEYS !== "undefined" && STORAGE_KEYS.cart) {
    base = STORAGE_KEYS.cart;   // lấy từ file config
  } else {
    base = "shop_cart";         // không có thì dùng tên mặc định
  }

  // Bước 2 + 3: gắn thêm email người dùng (nếu có hàm hỗ trợ)
  if (typeof userStorageKey === "function") {
    return userStorageKey(base);  // vd: "shop_cart_a@gmail.com"
  } else {
    return base;                  // không có hàm đó thì dùng tên gốc
  }
}

/**
 * Chuẩn hóa 1 dòng giỏ hàng: id là số, size/color rỗng thì thành null
 *
 * Các bước:
 *  1. Ép id về kiểu số (vì id có thể là chuỗi khi lấy từ data-attribute trên HTML).
 *  2. Nếu size rỗng/undefined/"" thì đổi thành null.
 *  3. Nếu color rỗng/undefined/"" thì đổi thành null.
 *  4. Trả về object { id, size, color } đã chuẩn hóa.
 */
function normalizeLine(id, size, color) {
  return { id: Number(id), size: size || null, color: color || null };
}

/**
 * So sánh dòng giỏ hàng với (id, size, color) đã chuẩn hóa
 *
 * Các bước:
 *  1. Ép item.id về số rồi so với line.id.
 *  2. Chuẩn hóa item.size (rỗng -> null) rồi so với line.size.
 *  3. Chuẩn hóa item.color (rỗng -> null) rồi so với line.color.
 *  4. Chỉ trả về true khi cả 3 điều kiện đều khớp.
 */
function isSameLine(item, line) {
  return Number(item.id) === line.id
    && (item.size || null) === line.size
    && (item.color || null) === line.color;
}

/**
 * Kiểm tra đăng nhập (auth.js của Vương cung cấp requireLogin).
 * Nếu auth.js chưa có thì cho qua để không làm hỏng lúc đang phát triển.
 *
 * Các bước:
 *  1. Nếu hàm requireLogin tồn tại -> gọi nó với thông báo và trả về kết quả (true/false).
 *  2. Nếu chưa có requireLogin -> trả về true (cho qua).
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
 *
 * Các bước:
 *  1. Lấy key giỏ hàng của người dùng hiện tại; chưa đăng nhập (key = null) -> trả về mảng rỗng.
 *  2. Đọc chuỗi JSON từ localStorage theo key.
 *  3. Có dữ liệu thì JSON.parse, không có thì dùng mảng rỗng.
 *  4. Kiểm tra kết quả có phải mảng không; không phải thì trả về mảng rỗng.
 *  5. Nếu parse lỗi (dữ liệu hỏng) -> bắt lỗi và trả về mảng rỗng.
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
 *
 * Các bước:
 *  1. Lấy key giỏ hàng của người dùng hiện tại.
 *  2. Nếu có key thì chuyển mảng cart thành chuỗi JSON và lưu vào localStorage.
 *  3. Nếu lưu lỗi (vd: đầy bộ nhớ) thì ghi lỗi ra Console.
 *  4. Cập nhật lại số trên biểu tượng giỏ hàng ở header.
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
 *
 * Các bước:
 *  1. Kiểm tra đăng nhập; chưa đăng nhập -> dừng và trả về false.
 *  2. Ép qty về số nguyên; không hợp lệ hoặc <= 0 -> trả về false.
 *  3. Chuẩn hóa (id, size, color) thành 1 dòng giỏ hàng chuẩn.
 *  4. Lấy giỏ hàng hiện tại và tìm xem dòng này đã có trong giỏ chưa.
 *  5. Nếu đã có -> cộng dồn số lượng (tối đa 99).
 *     Nếu chưa có -> thêm dòng mới vào giỏ (số lượng tối đa 99).
 *  6. Lưu giỏ hàng (đồng thời cập nhật badge).
 *  7. Hiện thông báo toast "Đã thêm..." nếu có hàm showToast.
 *  8. Trả về true.
 */
function addToCart(id, size = null, color = null, qty = 1) {
  // Bước 1: kiểm tra đăng nhập
  if (!ensureLoggedIn("Vui lòng đăng nhập để thêm vào giỏ hàng")) return false;

  // Bước 2: kiểm tra số lượng hợp lệ
  const quantityToAdd = parseInt(qty, 10);
  if (isNaN(quantityToAdd) || quantityToAdd <= 0) return false;

  // Bước 3 + 4: chuẩn hóa và tìm dòng trùng trong giỏ
  const line = normalizeLine(id, size, color);
  const cart = getCart();
  const existingIndex = cart.findIndex((item) => isSameLine(item, line));

  // Bước 5: cộng dồn hoặc thêm mới
  if (existingIndex !== -1) {
    // Trùng cả id, size, color -> Cộng dồn số lượng (tối đa 99)
    cart[existingIndex].qty = Math.min((Number(cart[existingIndex].qty) || 0) + quantityToAdd, 99);
  } else {
    // Món mới
    cart.push({ ...line, qty: Math.min(quantityToAdd, 99) });
  }

  // Bước 6: lưu giỏ hàng
  saveCart(cart);

  // Bước 7: thông báo
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
 *
 * Các bước:
 *  1. Ép qty về số nguyên.
 *  2. Nếu qty không hợp lệ hoặc <= 0 -> gọi removeFromCart để xóa dòng rồi kết thúc.
 *  3. Chuẩn hóa (id, size, color) và lấy giỏ hàng hiện tại.
 *  4. Tìm vị trí dòng cần sửa trong giỏ.
 *  5. Nếu tìm thấy -> gán số lượng mới (tối đa 99) và lưu giỏ hàng.
 *     Không tìm thấy -> không làm gì.
 */
function updateCartQty(id, size, color, qty) {
  // Bước 1 + 2: số lượng <= 0 nghĩa là xóa dòng
  const newQty = parseInt(qty, 10);
  if (isNaN(newQty) || newQty <= 0) {
    removeFromCart(id, size, color);
    return;
  }

  // Bước 3 + 4: tìm dòng cần cập nhật
  const line = normalizeLine(id, size, color);
  const cart = getCart();
  const index = cart.findIndex((item) => isSameLine(item, line));

  // Bước 5: cập nhật và lưu
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
 *
 * Các bước:
 *  1. Chuẩn hóa (id, size, color) thành dòng cần xóa.
 *  2. Lấy giỏ hàng và lọc bỏ dòng trùng khớp, giữ lại các dòng còn lại.
 *  3. Lưu giỏ hàng mới (đồng thời cập nhật badge).
 *  4. Hiện thông báo toast "Đã xóa..." nếu có hàm showToast.
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
 *
 * Các bước:
 *  1. Lấy key giỏ hàng của người dùng hiện tại.
 *  2. Nếu có key -> xóa hẳn key đó khỏi localStorage.
 *  3. Cập nhật lại badge (về 0 và ẩn đi).
 */
function clearCart() {
  const key = cartStorageKey();
  if (key) localStorage.removeItem(key);
  updateCartBadge();
}

/**
 * Tính tổng số lượng cái của tất cả mặt hàng trong giỏ
 * @returns {number}
 *
 * Các bước:
 *  1. Lấy giỏ hàng hiện tại.
 *  2. Duyệt từng dòng bằng reduce, cộng dồn qty (qty lỗi/không có thì tính là 0).
 *  3. Trả về tổng.
 */
function getCartCount() {
  return getCart().reduce((total, item) => total + (Number(item.qty) || 0), 0);
}

/**
 * Tải danh sách sản phẩm (dùng chung cho tính tiền và vẽ giỏ hàng).
 * Lỗi tải thì trả về mảng rỗng và báo trong Console.
 *
 * Các bước:
 *  1. Nếu có hàm loadProducts -> gọi và đợi (await) kết quả rồi trả về.
 *  2. Nếu loadProducts ném lỗi -> ghi lỗi ra Console.
 *  3. Các trường hợp còn lại (không có hàm / bị lỗi) -> trả về mảng rỗng.
 */
async function getCatalogForCart() {
  try {
    if (typeof loadProducts === "function") return await loadProducts();
  } catch (error) {
    console.error("Không tải được danh sách sản phẩm:", error);
  }
  return [];
}

/**
 * Giá bán thực tế của 1 sản phẩm
 *
 * Các bước:
 *  1. Nếu có hàm getFinalPrice (đã tính khuyến mãi) -> dùng kết quả của nó.
 *  2. Nếu không -> dùng salePrice; salePrice không có thì dùng price gốc.
 */
function unitPriceOf(product) {
  return typeof getFinalPrice === "function" ? getFinalPrice(product) : (product.salePrice ?? product.price);
}

/**
 * Tính tổng tiền tạm tính (chưa gồm phí ship) bằng cách đối chiếu products.json
 * @returns {Promise<number>}
 *
 * Các bước:
 *  1. Lấy giỏ hàng; nếu trống -> trả về 0 luôn.
 *  2. Tải danh sách sản phẩm 1 lần.
 *  3. Duyệt từng dòng trong giỏ, tìm sản phẩm tương ứng theo id.
 *  4. Không tìm thấy sản phẩm -> cảnh báo ở Console và bỏ qua dòng đó.
 *  5. Tìm thấy -> cộng (giá bán x số lượng) vào tổng.
 *  6. Trả về tổng tiền.
 */
async function getCartTotal() {
  // Bước 1
  const cart = getCart();
  if (cart.length === 0) return 0;

  // Bước 2
  const catalog = await getCatalogForCart();
  let total = 0;

  // Bước 3 -> 5
  for (const item of cart) {
    const product = catalog.find((p) => Number(p.id) === Number(item.id));
    if (!product) {
      console.warn("Giỏ hàng: không tìm thấy sản phẩm", item, "| số SP đã tải:", catalog.length);
      continue;
    }
    total += unitPriceOf(product) * (Number(item.qty) || 0);
  }

  // Bước 6
  return total;
}

/**
 * Cập nhật số hiển thị trên biểu tượng giỏ hàng ở header (#cart-badge)
 *
 * Các bước:
 *  1. Tìm phần tử #cart-badge; không có (trang không có header giỏ) -> kết thúc.
 *  2. Tính tổng số lượng trong giỏ.
 *  3. Ghi số đó vào badge.
 *  4. Số > 0 thì hiện badge, bằng 0 thì ẩn đi.
 */
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-block" : "none";
}

/**
 * Hàm hỗ trợ format tiền tệ độc lập
 *
 * Các bước:
 *  1. Nếu có hàm formatPrice dùng chung -> dùng nó.
 *  2. Nếu không -> format theo chuẩn Việt Nam (vd: 1.250.000) rồi thêm ký hiệu "₫".
 */
function formatMoneyLocal(amount) {
  if (typeof formatPrice === "function") return formatPrice(amount);
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// ==========================================
// 2. HIỂN THỊ GIAO DIỆN TRANG GIO-HANG.HTML
// ==========================================

/**
 * Vẽ toàn bộ nội dung trang giỏ hàng vào #cart-page-content
 *
 * Các bước:
 *  1. Tìm vùng chứa #cart-page-content; không có (không phải trang giỏ hàng) -> kết thúc.
 *  2. Lấy giỏ hàng, đường dẫn gốc (rootPath) và phí vận chuyển (có giá trị mặc định).
 *  3. Giỏ trống -> hiện thông báo "Giỏ hàng trống" kèm nút tiếp tục mua sắm rồi kết thúc.
 *  4. Tải danh sách sản phẩm 1 lần, xác định thư mục ảnh và ảnh thay thế.
 *  5. Duyệt từng dòng trong giỏ:
 *     5.1. Tìm sản phẩm theo id; không thấy -> cảnh báo Console và bỏ qua.
 *     5.2. Tính đơn giá, thành tiền và cộng vào tạm tính (subtotal).
 *     5.3. Xác định đường dẫn ảnh (có ảnh thì dùng, không thì dùng ảnh thay thế).
 *     5.4. Ghép chuỗi mô tả biến thể: "Size: ... | Màu: ..." (màu hiện tên tiếng Việt).
 *     5.5. Tạo HTML của dòng <tr> rồi nối vào itemsHtml.
 *  6. Nếu không dòng nào khớp sản phẩm -> báo lỗi rõ ràng kèm nút xóa giỏ rồi kết thúc.
 *  7. Tính tổng cộng = tạm tính + phí vận chuyển.
 *  8. Vẽ giao diện đầy đủ: bảng sản phẩm bên trái, hộp tóm tắt đơn hàng bên phải.
 */
async function renderCartPage() {
  // Bước 1
  const cartContainer = document.getElementById("cart-page-content");
  if (!cartContainer) return;

  // Bước 2
  const cart = getCart();
  const rootPath = typeof ROOT !== "undefined" ? ROOT : (location.pathname.includes("/pages/") ? "../" : "./");
  const shippingFee = typeof SHIPPING_FEE !== "undefined" ? SHIPPING_FEE : 30000;

  // Bước 3: giỏ trống
  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <p>Giỏ hàng của bạn đang trống</p>
        <a href="${rootPath}pages/san-pham.html" class="btn btn--primary">TIẾP TỤC MUA SẮM</a>
      </div>
    `;
    return;
  }

  // Bước 4: tải danh sách sản phẩm 1 lần rồi tra cứu, không gọi từng dòng
  const catalog = await getCatalogForCart();
  const imgDir = typeof IMAGE_DIR !== "undefined" ? IMAGE_DIR : `${rootPath}assets/images/products/`;
  const placeholder = typeof PLACEHOLDER_IMG !== "undefined" ? PLACEHOLDER_IMG : `${imgDir}placeholder.jpg`;

  let itemsHtml = "";
  let subtotal = 0;

  // Bước 5: duyệt từng sản phẩm trong giỏ hàng
  for (const item of cart) {
    // 5.1: tìm sản phẩm tương ứng
    const product = catalog.find((p) => Number(p.id) === Number(item.id));

    if (!product) {
      console.warn("Giỏ hàng: không tìm thấy sản phẩm", item, "| số SP đã tải:", catalog.length);
      continue;
    }

    // 5.2: tính tiền
    const unitPrice = unitPriceOf(product);
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;

    // 5.3: xác định ảnh
    const imgUrl = (typeof getImageUrl === "function" && product.images && product.images[0])
      ? getImageUrl(product.images[0])
      : (product.images && product.images[0] ? `${imgDir}${product.images[0]}` : placeholder);

    // 5.4: ghép mô tả size/màu
    const colorName = item.color
      ? (typeof colorLabel === "function" ? colorLabel(item.color) : item.color)
      : "";
    const sizeText = item.size ? `Size: ${item.size}` : "";
    const colorText = colorName ? `Màu: ${colorName}` : "";
    const variantText = [sizeText, colorText].filter(Boolean).join(" | ");
    // duyệt từng sản phẩm trong giỏ hàng và chuẩn bị các dữ liệu để hiện thị lên html

    // 5.5: tạo HTML cho dòng sản phẩm
    itemsHtml += `
      <tr class="cart-item-row" data-id="${item.id}" data-size="${item.size || ''}" data-color="${item.color || ''}">
        <td class=  "cart-item__info">
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

  // Bước 6: Giỏ có dữ liệu nhưng không khớp sản phẩm nào (vd: dữ liệu cũ bị lỗi) -> báo rõ thay vì hiện bảng trống
  if (!itemsHtml) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <p>Không hiển thị được sản phẩm trong giỏ hàng. Vui lòng thử tải lại trang.</p>
        <button type="button" id="btn-clear-cart" class="btn btn--outline">Xóa giỏ hàng</button>
      </div>
    `;
    return;
  }

  // Bước 7: tổng cộng
  const grandTotal = subtotal + shippingFee;

  // Bước 8: vẽ giao diện giỏ hàng
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

/**
 * Khởi tạo và bắt sự kiện trên giao diện Giỏ hàng (chạy khi trang tải xong)
 *
 * Các bước:
 *  1. Cập nhật badge giỏ hàng ở header (chạy trên mọi trang).
 *  2. Nếu trang hiện tại không có #cart-page-content (không phải trang giỏ) -> kết thúc.
 *  3. Yêu cầu đăng nhập để xem giỏ; chưa đăng nhập -> dừng.
 *  4. Vẽ giao diện giỏ hàng lần đầu.
 *  5. Gắn 1 listener "click" lên vùng giỏ hàng (event delegation) để xử lý:
 *     5.1. Nút "Xóa toàn bộ giỏ hàng": hỏi xác nhận -> clearCart -> vẽ lại.
 *     5.2. Với các nút trong 1 dòng: tìm dòng cha, đọc id/size/color từ data-attribute.
 *     5.3. Nút xóa dòng (×): removeFromCart -> vẽ lại.
 *     5.4. Nút giảm (-): lấy số lượng hiện tại, trừ 1 -> updateCartQty -> vẽ lại.
 *     5.5. Nút tăng (+): lấy số lượng hiện tại, cộng 1 -> updateCartQty -> vẽ lại.
 *  6. Gắn 1 listener "change" để xử lý khi người dùng gõ số lượng trực tiếp:
 *     đọc id/size/color của dòng -> updateCartQty với giá trị nhập -> vẽ lại.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Bước 1
  updateCartBadge();

  // Bước 2
  const cartPage = document.getElementById("cart-page-content");
  if (!cartPage) return;

  // Bước 3: Trang giỏ hàng yêu cầu đăng nhập
  if (!ensureLoggedIn("Vui lòng đăng nhập để xem giỏ hàng")) return;

  // Bước 4
  renderCartPage();

  // Bước 5: Lắng nghe sự kiện click: Tăng/giảm/xóa dòng/xóa hết
  cartPage.addEventListener("click", (e) => {
    // 5.1: Xóa toàn bộ giỏ
    if (e.target.id === "btn-clear-cart") {
      if (confirm("Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng không?")) {
        clearCart();
        renderCartPage();
      }
      return;
    }

    // 5.2: Tìm dòng sản phẩm chứa nút vừa bấm; bấm ngoài dòng nào thì bỏ qua
    const row = e.target.closest(".cart-item-row");
    if (!row) return;

    const id = parseInt(row.dataset.id, 10);
    const size = row.dataset.size || null;
    const color = row.dataset.color || null;

    // 5.3: Nút xóa một dòng
    if (e.target.classList.contains("btn-cart-delete")) {
      removeFromCart(id, size, color);
      renderCartPage();
      return;
    }

    // 5.4: Nút giảm số lượng
    if (e.target.classList.contains("btn-qty-decrease")) {
      const input = row.querySelector(".cart-qty-input");
      const currentVal = parseInt(input.value, 10);
      updateCartQty(id, size, color, currentVal - 1);
      renderCartPage();
      return;
    }

    // 5.5: Nút tăng số lượng
    if (e.target.classList.contains("btn-qty-increase")) {
      const input = row.querySelector(".cart-qty-input");
      const currentVal = parseInt(input.value, 10);
      updateCartQty(id, size, color, currentVal + 1);
      renderCartPage();
      return;
    }
  });

  // Bước 6: Lắng nghe sự kiện nhập số lượng trực tiếp
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