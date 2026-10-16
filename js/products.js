/* ==========================================================================
   1. HẰNG SỐ / DỮ LIỆU CẤU HÌNH
   Các biến như PRODUCTS_URL, IMAGE_DIR, ROOT, SHIPPING_FEE, SHOP_NAME,
   STORAGE_KEYS, PLACEHOLDER_IMG KHÔNG khai báo trong file này -> chúng nằm
   ở config.js, file đó phải được nạp (<script>) TRƯỚC products.js.
   ========================================================================== */

// Bảng tra: slug màu (dùng trong dữ liệu và class CSS) -> tên hiển thị cho khách
// Ví dụ: COLOR_LABELS["xanh-navy"] === "Xanh navy"
const COLOR_LABELS = {
  den: "Đen",
  trang: "Trắng",
  xam: "Xám",
  be: "Be",
  hong: "Hồng",
  "xanh-navy": "Xanh navy",         // key có dấu "-" nên phải đặt trong ngoặc kép
  do: "Đỏ",
  vang: "Vàng",
  "xanh-reu": "Xanh rêu",
  trong: "Trong suốt",
  "xanh-la": "Xanh lá",
};

// Bảng tra: giá trị product.tag trong dữ liệu -> chữ hiện trên nhãn nhỏ ở góc thẻ sản phẩm
const TAG_LABELS = {
  trending: "Trending",
  new: "Mới",
  sale: "Giảm giá",
};

// Các khoảng giá cho bộ lọc giá: id (dùng nội bộ), label (hiển thị), min/max (VND).
// Infinity = không có giới hạn trên. (Mảng này khai báo ở đây để file lọc/catalog dùng chung.)
const PRICE_RANGES = [
  { id: "under-150", label: "Giá dưới 150.000₫", min: 0, max: 150000 },
  { id: "150-200", label: "150.000₫ - 200.000₫", min: 150000, max: 200000 },
  { id: "200-250", label: "200.000₫ - 250.000₫", min: 200000, max: 250000 },
  { id: "250-350", label: "250.000₫ - 350.000₫", min: 250000, max: 350000 },
  { id: "over-350", label: "Giá trên 350.000₫", min: 350000, max: Infinity },
];

// Đoạn HTML hiện ra thay cho lưới sản phẩm khi tải dữ liệu thất bại
const LOAD_ERROR_HTML = "<p>Không thể tải sản phẩm lúc này.</p>";


/* ==========================================================================
   2. TẢI DỮ LIỆU SẢN PHẨM
   ========================================================================== */

// Hai biến "bộ nhớ đệm" dùng chung toàn file:
//  - products        : mảng sản phẩm sau khi đã tải xong
//  - productsPromise : lời hứa (Promise) của lần tải đang chạy, để nhiều nơi gọi cùng lúc
//                      cũng chỉ gửi đúng 1 request mạng
let products = [];
let productsPromise = null;

// Tải danh sách sản phẩm từ file JSON (PRODUCTS_URL).
// Luồng chạy:
//  1) Đã có dữ liệu -> trả về ngay, không tải lại.
//  2) Chưa có -> fetch. "||=" nghĩa là: nếu productsPromise đang rỗng mới tạo request mới,
//     còn đang có sẵn thì dùng lại (tránh tải trùng).
//  3) Server trả lỗi (404, 500...) -> ném lỗi để nơi gọi bắt bằng try/catch.
//  4) Thành công -> response.json() chuyển thành mảng, lưu vào biến products.
//  5) Thất bại -> reset productsPromise = null để lần gọi sau được thử lại, rồi ném lỗi tiếp.
async function loadProducts() {
  if (products.length) return products;

  productsPromise ||= fetch(PRODUCTS_URL)
    .then((response) => {
      if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm");
      return response.json();
    })
    .then((data) => (products = data))
    .catch((error) => {
      productsPromise = null;
      throw error;
    });

  return productsPromise;
}

// Tìm 1 sản phẩm theo id. Id lấy từ URL (?id=5) là chuỗi "5" nên phải ép sang số
// để so sánh đúng với product.id (kiểu số) trong dữ liệu. Không thấy -> trả về undefined.
async function getProductById(id) {
  const list = await loadProducts();
  return list.find((product) => product.id === Number(id));
}


/* ==========================================================================
   3. HÀM TIỆN ÍCH NHỎ (viết dạng arrow function một dòng)
   ========================================================================== */

// Giá phải trả: nếu có salePrice (khác null/undefined) thì dùng, không thì dùng giá gốc.
// "??" khác "||" ở chỗ: salePrice = 0 vẫn được xem là giá hợp lệ.
const getFinalPrice = (product) => product.salePrice ?? product.price;

// Định dạng số thành tiền Việt: 150000 -> "150.000₫" (toLocaleString("vi-VN") tự thêm dấu chấm ngăn cách)
const formatPrice = (number) => `${Number(number).toLocaleString("vi-VN")}₫`;

// Ghép thư mục ảnh + tên file thành đường dẫn đầy đủ: "anh1.jpg" -> "<IMAGE_DIR>anh1.jpg"
const getImageUrl = (fileName) => `${IMAGE_DIR}${fileName}`;

// Đổi slug màu sang tên hiển thị; không có trong bảng thì trả luôn slug để không bị trống
const colorLabel = (slug) => COLOR_LABELS[slug] || slug;

// Tạo link tới trang chi tiết (chi-tiet.html?id=...) và trang danh mục (san-pham.html?category=...)
// ROOT là tiền tố đường dẫn gốc để link đúng dù đứng ở trang nào
const detailUrl = (id) => `${ROOT}pages/chi-tiet.html?id=${id}`;
const categoryUrl = (slug) => `${ROOT}pages/san-pham.html?category=${slug}`;

// Ép số lượng nằm trong khoảng 1..99 (max(1, ...) chặn số < 1, min(99, ...) chặn số > 99)
const clamp = (value) => Math.min(99, Math.max(1, value));

// Hiện thông báo nhỏ (toast) cho người dùng.
// Chỉ gọi nếu hàm showToast tồn tại (do file khác định nghĩa) -> không có cũng không báo lỗi.
function notify(message, type) {
  if (typeof showToast === "function") showToast(message, type);
}

// Đọc một mảng đã lưu trong localStorage theo key.
// Dữ liệu chưa có -> "[]"; JSON hỏng (parse lỗi) -> bắt lỗi và trả mảng rỗng, tránh làm sập trang.
function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    return [];
  }
}

// Ghi số lên một phần tử theo id (vd: chấm đỏ số lượng ở icon giỏ hàng).
// Không có phần tử đó trên trang thì bỏ qua.
function setBadge(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// Tạo key lưu localStorage riêng cho từng tài khoản (mỗi người có giỏ hàng riêng).
// userStorageKey nằm ở config.js và trả về null nếu chưa đăng nhập.
// Nếu không có hàm đó thì dùng luôn key gốc.
const userKey = (base) => (typeof userStorageKey === "function" ? userStorageKey(base) : base);


/* ==========================================================================
   4. HÀM DỰ PHÒNG CHO GIỎ HÀNG
   Toán tử "||=" : chỉ gán nếu window.xxx CHƯA tồn tại. Nghĩa là nếu cart.js đã
   định nghĩa sẵn thì giữ nguyên bản đó; còn thiếu file thì
   dùng bản dự phòng dưới đây để trang vẫn hoạt động.
   ========================================================================== */

function ensureShopFallbacks() {
  // Lấy giỏ hàng của user hiện tại: mảng các dòng { id, size, color, qty }.
  // Chưa đăng nhập (key = null) -> giỏ rỗng.
  window.getCart ||= () => {
    const key = userKey(STORAGE_KEYS.cart);
    return key ? readList(key) : [];
  };

  // Thêm vào giỏ. Trả về true nếu thêm được, false nếu bị chặn (để nơi gọi biết mà không chuyển trang).
  // Bản dự phòng khi cart.js chưa có: cũng yêu cầu đăng nhập và trả về true/false
  window.addToCart ||= (id, size, color, qty) => {
    // Chưa đăng nhập -> requireLogin hiện thông báo/mở form đăng nhập, ta dừng và trả false
    if (typeof requireLogin === "function" && !requireLogin("Vui lòng đăng nhập để thêm vào giỏ hàng")) {
      return false;
    }
    const cartKey = userKey(STORAGE_KEYS.cart);
    if (!cartKey) return false;
    const cart = getCart();
    const nextQty = Number(qty) || 1; // số lượng không hợp lệ thì mặc định 1
    // Tìm dòng đã có CÙNG id + size + màu (null và "" được coi như nhau nhờ "|| null")
    const match = cart.find(
      (item) =>
        Number(item.id) === Number(id) &&
        (item.size || null) === (size || null) &&
        (item.color || null) === (color || null)
    );
    // Có rồi -> cộng dồn số lượng; chưa có -> thêm dòng mới
    if (match) match.qty = Number(match.qty || 0) + nextQty;
    else cart.push({ id: Number(id), size: size || null, color: color || null, qty: nextQty });
    localStorage.setItem(cartKey, JSON.stringify(cart)); // lưu lại giỏ (dạng chuỗi JSON)
    if (typeof updateCartBadge === "function") updateCartBadge(); // cập nhật số trên icon giỏ
    notify("Đã thêm vào giỏ");
    return true;
  };

  // Tổng số lượng sản phẩm trong giỏ: reduce cộng dồn qty của từng dòng, bắt đầu từ 0
  window.getCartCount ||= () => getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  // Cập nhật số hiển thị ở phần tử có id "cart-badge"
  window.updateCartBadge ||= () => setBadge("cart-badge", getCartCount());
}


/* ==========================================================================
   5. RENDER THẺ SẢN PHẨM VÀ THẺ DANH MỤC
   "Render" ở đây = tạo ra chuỗi HTML từ dữ liệu, sau đó đưa vào trang bằng innerHTML.
   ========================================================================== */

// Tạo HTML phần giá: giá phải trả (class price-sale) + giá gốc gạch ngang (thẻ <del>) nếu đang giảm giá
function priceHtml(product) {
  const oldPrice = product.salePrice
    ? `<del class="price-old">${formatPrice(product.price)}</del>`
    : "";
  return `<span class="price-sale">${formatPrice(getFinalPrice(product))}</span>${oldPrice}`;
}

// Lấy đường dẫn ảnh đầu tiên của sản phẩm; không có ảnh nào thì dùng ảnh thay thế (PLACEHOLDER_IMG)
function firstImageUrl(product) {
  return product.images && product.images[0] ? getImageUrl(product.images[0]) : PLACEHOLDER_IMG;
}

// Tạo HTML cho 1 thẻ sản phẩm. Các bước chuẩn bị rồi ghép vào template:
//  - tag        : nhãn nhỏ (Mới / Giảm giá / Trending) nếu sản phẩm có
//  - soldOutClass: thêm class "product-card--sold-out" khi hết hàng để CSS làm mờ/đánh dấu
//  - optionLabel: chữ trên nút (còn hàng: "Tùy chọn", hết hàng: "Hết hàng")
function renderProductCard(product) {
  const tag = product.tag
    ? `<span class="product-card__tag">${TAG_LABELS[product.tag] || product.tag}</span>`
    : "";
  const soldOutClass = product.inStock ? "" : " product-card--sold-out";
  const optionLabel = product.inStock ? "Tùy chọn" : "Hết hàng";
  const url = detailUrl(product.id);

  return `
    <article class="product-card${soldOutClass}">
      <div class="product-card__media">
        <a class="product-card__image" href="${url}">
          <img src="${firstImageUrl(product)}" alt="${product.name}" loading="lazy">
          ${tag}
        </a>
        <div class="product-card__actions">
          <a class="product-card__option" href="${url}">${optionLabel}</a>
          <button type="button" class="product-card__quick" data-quick="${product.id}">Xem nhanh</button>
        </div>
      </div>
      <div class="product-card__body">
        <span class="product-card__vendor">${product.categoryName}</span>
        <a class="product-card__title" href="${url}">${product.name}</a>
        <div class="product-card__price">${priceHtml(product)}</div>
      </div>
    </article>`;
  // Ghi chú thuộc tính: loading="lazy" = chỉ tải ảnh khi cuộn gần tới (nhẹ trang);
  // data-id / data-quick = "gắn nhãn" id sản phẩm lên nút để JS biết nút này của sản phẩm nào.
}

// Tạo HTML cho 1 thẻ danh mục (ảnh đại diện lấy từ sản phẩm đầu tiên của danh mục, kèm số lượng sản phẩm)
function renderCategoryCard(category) {
  return `
    <a class="category-card" href="${categoryUrl(category.slug)}">
      <div class="category-card__image">
        <img src="${firstImageUrl(category.products[0])}" alt="${category.name}" loading="lazy">
      </div>
      <span class="category-card__name">${category.name}</span>
      <span class="category-card__count">${category.products.length} sản phẩm</span>
    </a>`;
}


/* ==========================================================================
   6. TRANG CHỦ: RENDER CÁC KHU VỰC SẢN PHẨM
   ========================================================================== */

// Vẽ lưới danh mục trong khu vực "Đồ hiệu King Shop".
// Cách làm: duyệt toàn bộ sản phẩm, GOM nhóm theo tên danh mục bằng Map
// (key = categoryName, value = { name, slug, products[] }), rồi mỗi nhóm vẽ thành 1 thẻ danh mục.
async function renderKingShopProducts() {
  const grid = document.querySelector(".do-hieu-king-shop .category-grid");
  if (!grid) return; // trang hiện tại không có khu vực này -> bỏ qua

  try {
    const categoryMap = new Map();
    (await loadProducts()).forEach((product) => {
      // Lần đầu gặp danh mục này -> tạo nhóm mới
      if (!categoryMap.has(product.categoryName)) {
        categoryMap.set(product.categoryName, {
          name: product.categoryName,
          slug: product.category,
          products: [],
        });
      }
      // Bỏ sản phẩm vào đúng nhóm
      categoryMap.get(product.categoryName).products.push(product);
    });

    // [...categoryMap.values()] đổi các nhóm thành mảng -> map ra HTML -> join thành 1 chuỗi
    grid.innerHTML = [...categoryMap.values()].map(renderCategoryCard).join("");
  } catch (error) {
    grid.innerHTML = LOAD_ERROR_HTML; // báo lỗi cho khách
    console.error(error);             // và in chi tiết ra console cho lập trình viên
  }
}

// Hàm dùng chung để vẽ 1 lưới sản phẩm:
//  - selector    : lưới nào trên trang (vd ".collection-grid")
//  - allProducts : mảng toàn bộ sản phẩm
//  - category    : chỉ lấy danh mục này (để trống = lấy tất cả)
//  - limit       : lấy tối đa bao nhiêu sản phẩm (để trống = không giới hạn)
function renderProductsByCategory(selector, allProducts, category, limit) {
  const grid = document.querySelector(selector);
  if (!grid) return;

  let list = Array.isArray(allProducts)
    ? allProducts.filter((product) => !category || product.category === category)
    : [];
  if (limit) list = list.slice(0, limit); // cắt lấy N sản phẩm đầu
  grid.innerHTML = list.map(renderProductCard).join("");
}

// Hai lưới cố định ở trang chủ: "Gợi ý" (3 sản phẩm áo xuân hè) và "Bộ sưu tập" (5 sản phẩm lego)
function renderHomeProductSections(allProducts) {
  renderProductsByCategory(".recommendation-grid", allProducts, "ao-xuan-he", 3);
  renderProductsByCategory(".collection-grid", allProducts, "lego", 5);
}

// Vẽ tất cả lưới sản phẩm ở trang chủ. Nếu trang không có lưới nào thì thoát sớm (đỡ tải dữ liệu thừa).
async function renderHotProductTabs() {
  const hasHomeGrids = document.querySelector(
    ".recommendation-grid, .collection-grid, .new-product-grid, .winter-product-grid"
  );
  if (!hasHomeGrids) return;

  try {
    const allProducts = await loadProducts();
    renderHomeProductSections(allProducts);
    renderProductsByCategory(".new-product-grid", allProducts, "ao-xuan-he");       // tab "Sản phẩm mới"
    renderProductsByCategory(".winter-product-grid", allProducts, "do-thu-dong");   // tab "Đồ thu đông"
  } catch (error) {
    // Lỗi tải -> thay nội dung mọi lưới ".hot-product-grid" bằng thông báo lỗi
    document.querySelectorAll(".hot-product-grid").forEach((grid) => {
      grid.innerHTML = LOAD_ERROR_HTML;
    });
    console.error(error);
  }
}

// Chuyển tab "Sản phẩm hot": mỗi nút .tab-btn có data-tab = id của panel tương ứng.
// Bấm nút -> bỏ highlight mọi nút, ẩn panel nào có id khác, rồi highlight nút vừa bấm.
function setupHotProductTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-content");
  if (!buttons.length || !panels.length) return; // trang không có tab -> bỏ qua

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("tab-btn--active"));
      panels.forEach((panel) => {
        panel.hidden = panel.id !== button.dataset.tab; // true = ẩn, false = hiện
      });
      button.classList.add("tab-btn--active");
    });
  });
}


/* ==========================================================================
   7. FORM CHỌN SIZE / MÀU / SỐ LƯỢNG
   Dùng chung cho trang chi tiết và popup Quick View.
   ========================================================================== */

// Tạo danh sách "chip" dạng radio (dùng cho cả size và màu).
//  - items   : mảng giá trị (vd ["S","M","L"] hoặc ["den","trang"])
//  - name    : tên nhóm radio ("size" hoặc "color") - cùng name thì chỉ chọn được 1
//  - selected: giá trị chọn sẵn; để trống thì chọn mục đầu tiên (index === 0)
//  - labelFn : hàm đổi giá trị sang chữ hiển thị (vd colorLabel)
// Với màu (name === "color") sẽ thêm chấm màu <i class="swatch swatch--xxx"> trước chữ.
function optionButtons(items, name, selected, labelFn) {
  if (!items || !items.length) return "";
  return items.map((item, index) => {
    const checked = (selected ? item === selected : index === 0) ? " checked" : "";
    const text = labelFn ? labelFn(item) : item;
    const dot = name === "color" ? `<i class="swatch swatch--${item}"></i>` : "";
    return `
      <label class="option-chip">
        <input type="radio" name="${name}" value="${item}"${checked}>
        ${dot}<span>${text}</span>
      </label>`;
  }).join("");
}

// Ô chọn số lượng: nút "−" (data-qty="-1"), ô nhập số (1..99), nút "+" (data-qty="1").
// Thuộc tính data-qty cho biết bấm nút thì cộng/trừ bao nhiêu.
function qtyControl(id) {
  return `
    <div class="qty-box" data-qty-for="${id}">
      <button type="button" class="qty-box__btn" data-qty="-1" aria-label="Giảm">−</button>
      <input class="qty-box__input" type="number" min="1" max="99" value="1">
      <button type="button" class="qty-box__btn" data-qty="1" aria-label="Tăng">+</button>
    </div>`;
}

// Hộp "Khuyến mãi - ưu đãi" (phí ship lấy từ SHIPPING_FEE trong config.js)
function promoBox() {
  return `
    <div class="promo-box">
      <strong>🎁 KHUYẾN MÃI - ƯU ĐÃI</strong>
      <ul>
        <li>Đồng giá ship toàn quốc ${formatPrice(SHIPPING_FEE)}</li>
        <li>Hỗ trợ trả lời thắc mắc qua fanpage chính thức</li>
        <li>Khuyến mãi trực tiếp trên giá sản phẩm</li>
        <li>Đổi trả nếu sản phẩm lỗi bất kì</li>
      </ul>
    </div>`;
}

// Hai hàm đọc dữ liệu người dùng đã chọn trong form (root = vùng chứa form):
//  - selectedValue: lấy value của radio đang được tick theo name; không có thì trả ""
//  - selectedQty  : đọc số trong ô số lượng, không hợp lệ thì coi là 1, rồi ép vào 1..99
const selectedValue = (root, name) => root.querySelector(`input[name="${name}"]:checked`)?.value || "";
const selectedQty = (root) => clamp(Number(root.querySelector(".qty-box__input")?.value) || 1);

// Xử lý khi bấm "Thêm vào giỏ" (goCheckout = false) hoặc "Mua ngay" (goCheckout = true).
// Các bước kiểm tra theo thứ tự:
//  1) Hết hàng -> báo lỗi, dừng.
//  2) Sản phẩm có size mà chưa chọn -> báo lỗi, dừng.
//  3) Gọi addToCart. Nếu thành công và là "Mua ngay" thì chuyển sang trang giỏ hàng.
function handleAddToCart(product, root, goCheckout) {
  if (!product.inStock) {
    notify("Sản phẩm đã hết hàng", "error");
    return;
  }
  const size = selectedValue(root, "size");
  if (product.sizes?.length && !size) {
    notify("Vui lòng chọn kích thước", "error");
    return;
  }

  // addToCart trả về false khi bị chặn (chưa đăng nhập) -> không chuyển sang giỏ hàng
  const added = addToCart(product.id, size || null, selectedValue(root, "color") || null, selectedQty(root));
  if (added !== false && goCheckout) location.href = `${ROOT}pages/gio-hang.html`;
}

// Tạo 1 hàng "Nhãn: nội dung" (vd "Kích thước: [S][M][L]").
// Không có nội dung (sản phẩm không có size/màu) thì trả chuỗi rỗng -> hàng đó không hiện.
function optionRow(label, content) {
  return content
    ? `<div class="option-row"><span>${label}:</span>${content}</div>`
    : "";
}

// LƯU Ý: hàm optionRow bên dưới bị khai báo TRÙNG với hàm ngay trên (nội dung giống hệt).
// Hàm khai báo sau sẽ ghi đè hàm trước nên không gây lỗi, nhưng nên xóa bớt một bản cho gọn.
function optionRow(label, content) {
  return content
    ? `<div class="option-row"><span>${label}:</span>${content}</div>`
    : "";
}

// Ghép toàn bộ form mua hàng: hàng Kích thước, hàng Màu sắc, hàng Số lượng,
// 2 nút (Thêm vào giỏ / Mua ngay) và phần hành động thêm (extraActions, vd link "Xem chi tiết" trong Quick View).
// Hết hàng -> thuộc tính "disabled" khóa cả 2 nút và nút Mua ngay đổi chữ thành "HẾT HÀNG".
// Class js-add-cart / js-buy-now chỉ để JS tìm nút, không dùng để tạo kiểu.
function productFormHtml(product, extraActions) {
  const list = (items, name, labelFn) =>
    items?.length ? `<div class="option-list">${optionButtons(items, name, "", labelFn)}</div>` : "";
  const addDisabled = product.inStock ? "" : " disabled";

  return `
    ${optionRow("Kích thước", list(product.sizes, "size"))}
    ${optionRow("Màu sắc", list(product.colors, "color", colorLabel))}
    ${optionRow("Số lượng", qtyControl(product.id))}
    <div class="product-cta">
      <button type="button" class="btn btn--outline js-add-cart"${addDisabled}>THÊM VÀO GIỎ</button>
      <button type="button" class="btn btn--primary js-buy-now"${addDisabled}>${product.inStock ? "MUA NGAY" : "HẾT HÀNG"}</button>
    </div>
    ${extraActions || ""}`;
}

// Gắn sự kiện cho form bằng "event delegation": chỉ đặt 1 bộ lắng nghe click trên root,
// rồi dùng event.target.closest(...) xem người dùng vừa bấm vào cái gì:
//  - nút có data-qty : cộng/trừ số lượng trong ô nhập (luôn ép lại trong 1..99)
//  - .js-add-cart    : thêm vào giỏ
//  - .js-buy-now     : thêm vào giỏ rồi chuyển sang giỏ hàng
function bindProductForm(root, product) {
  root.addEventListener("click", (event) => {
    const qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      const input = root.querySelector(".qty-box__input");
      input.value = clamp(Number(input.value || 1) + Number(qtyBtn.dataset.qty));
    }
    if (event.target.closest(".js-add-cart")) handleAddToCart(product, root, false);
    if (event.target.closest(".js-buy-now")) handleAddToCart(product, root, true);
  });
}


/* ==========================================================================
   8. QUICK VIEW (POPUP XEM NHANH SẢN PHẨM)
   ========================================================================== */

// Tạo sẵn khung popup rỗng, đang ẩn (hidden) và gắn vào cuối <body>.
// Chỉ tạo khi cần (lần đầu bấm "Xem nhanh").
function createQuickViewHost() {
  const box = document.createElement("div");
  box.id = "quick-view";
  box.className = "quick-view";
  box.hidden = true;
  document.body.appendChild(box);
  return box;
}

// Mở popup xem nhanh của sản phẩm có id tương ứng:
//  1) Đảm bảo có hàm giỏ hàng, lấy sản phẩm, lấy (hoặc tạo) khung popup.
//  2) Không tìm thấy sản phẩm -> dừng.
//  3) Hiện popup và đổ HTML: nền mờ + hộp (nút đóng, gallery, tên, giá, khuyến mãi, form mua, link chi tiết).
//     Các phần tử có thuộc tính data-close-quick sẽ đóng popup khi bấm (xem bindProductEvents).
//  4) Gắn sự kiện cho form và gallery vừa tạo (vì HTML mới sinh ra chưa có sự kiện).
//  5) Khóa cuộn trang nền bằng class no-scroll.
async function openQuickView(id) {
  ensureShopFallbacks();
  const product = await getProductById(id);
  const box = document.getElementById("quick-view") || createQuickViewHost();
  if (!product) return;

  box.hidden = false;
  box.innerHTML = `
    <div class="quick-view__backdrop" data-close-quick></div>
    <div class="quick-view__dialog" role="dialog" aria-modal="true" aria-label="Xem nhanh ${product.name}">
      <button class="quick-view__close" type="button" data-close-quick aria-label="Đóng">×</button>
      <div class="quick-view__grid">
        ${galleryHtml(product)}
        <div class="quick-view__info">
          <p class="product-card__vendor">${product.categoryName}</p>
          <h2>${product.name}</h2>
          <div class="product-card__price">${priceHtml(product)}</div>
          ${promoBox()}
          ${productFormHtml(product, `<a class="quick-view__detail" href="${detailUrl(product.id)}">Xem chi tiết</a>`)}
        </div>
      </div>
    </div>`;
  bindProductForm(box.querySelector(".quick-view__info"), product);
  bindGallery(box.querySelector(".product-gallery"));
  document.body.classList.add("no-scroll");
}

// Đóng popup: ẩn khung, xóa sạch nội dung (giải phóng ảnh/sự kiện cũ), cho phép cuộn trang lại
function closeQuickView() {
  const box = document.getElementById("quick-view");
  if (!box) return;
  box.hidden = true;
  box.innerHTML = "";
  document.body.classList.remove("no-scroll");
}


/* ==========================================================================
   9. GALLERY ẢNH (THUMBNAIL + MŨI TÊN + VUỐT/KÉO)
   Cơ chế: tất cả ảnh lớn xếp NGANG trong 1 "track"; mỗi ảnh rộng 100% khung.
   Muốn xem ảnh thứ i thì dịch track sang trái i x 100%. Khung ngoài overflow:hidden
   nên chỉ thấy 1 ảnh tại 1 thời điểm.
   ========================================================================== */

// Tạo HTML gallery gồm cột thumbnail + khung ảnh lớn.
// - Không có ảnh -> dùng ảnh thay thế. Chỉ 1 ảnh -> không hiện mũi tên.
// - data-index="0" trên .product-gallery lưu "đang xem ảnh số mấy" (bắt đầu từ 0).
// - draggable="false" chặn trình duyệt kéo ảnh ra (để không xung đột với vuốt).
function galleryHtml(product) {
  const images = (product.images || []).map(getImageUrl);
  if (!images.length) images.push(PLACEHOLDER_IMG);

  const thumbs = images.map((src, index) => `
    <button type="button" class="gallery-thumb${index === 0 ? " is-active" : ""}" data-src="${src}" data-index="${index}">
      <img src="${src}" alt="${product.name} ${index + 1}">
    </button>`).join("");

  const arrows = images.length > 1
    ? `<button type="button" class="gallery-arrow gallery-prev" aria-label="Ảnh trước">‹</button>
       <button type="button" class="gallery-arrow gallery-next" aria-label="Ảnh sau">›</button>`
    : "";

  return `
    <div class="product-gallery" data-index="0">
      <div class="product-gallery__thumbs">${thumbs}</div>
      <div class="product-gallery__main">
        <div class="gallery-track">${images.map((src) => `<img class="gallery-main-img" src="${src}" alt="${product.name}" draggable="false">`).join("")}</div>
        ${arrows}
      </div>
    </div>`;
}

// Chuyển tới ảnh số `index`:
//  - (index + n) % n : đi vòng tròn (từ ảnh cuối bấm tiếp sẽ về ảnh đầu, và ngược lại;
//    cộng n trước để số âm như -1 vẫn ra đúng)
//  - lưu vị trí mới vào root.dataset.index
//  - đánh dấu thumbnail tương ứng là is-active
//  - transition = "" trả lại hiệu ứng trượt mặc định (đã bị tắt khi đang kéo)
//  - dịch track sang trái index x 100%
function showGalleryImage(root, index) {
  const thumbs = root.querySelectorAll(".gallery-thumb");
  const track = root.querySelector(".gallery-track");
  if (!thumbs.length) return;

  index = (index + thumbs.length) % thumbs.length;
  root.dataset.index = index;
  thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === index));
  track.style.transition = "";
  track.style.transform = `translateX(${-index * 100}%)`;
}

// Cho phép vuốt (cảm ứng) hoặc kéo chuột để đổi ảnh. Dùng Pointer Events nên 1 đoạn code chạy cho cả chuột lẫn ngón tay.
//  - startX : vị trí ngang lúc bắt đầu kéo;  dx : quãng đã kéo (âm = kéo sang trái);  dragging : đang kéo hay không
//  - pointerdown : bắt đầu kéo (bỏ qua nếu bấm vào mũi tên), tắt transition để ảnh bám sát tay,
//                  setPointerCapture để vẫn nhận sự kiện khi con trỏ ra khỏi khung
//  - pointermove : dịch track theo dx. Nếu đang ở ảnh đầu mà kéo phải, hoặc ảnh cuối mà kéo trái (atEdge)
//                  thì chỉ dịch dx/3 -> cảm giác "nặng tay", báo hiệu hết ảnh
//  - end (thả tay/hủy): nếu kéo quá 20% chiều rộng khung thì sang ảnh kế/trước (có chặn ở hai đầu),
//                  ngược lại bật về ảnh hiện tại
function bindGallerySwipe(root) {
  const main = root.querySelector(".product-gallery__main");
  const track = root.querySelector(".gallery-track");
  const count = root.querySelectorAll(".gallery-thumb").length;
  if (!main || !track || count < 2) return; // chỉ 1 ảnh thì không cần vuốt

  let startX = 0;
  let dx = 0;
  let dragging = false;

  main.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".gallery-arrow")) return;
    dragging = true;
    startX = event.clientX;
    dx = 0;
    track.style.transition = "none";
    main.setPointerCapture(event.pointerId);
  });

  main.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    dx = event.clientX - startX;
    const index = Number(root.dataset.index || 0);
    const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
    track.style.transform = `translateX(calc(${-index * 100}% + ${atEdge ? dx / 3 : dx}px))`;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    const index = Number(root.dataset.index || 0);
    const threshold = main.offsetWidth * 0.2;
    let next = index;
    if (dx < -threshold) next = Math.min(index + 1, count - 1);
    else if (dx > threshold) next = Math.max(index - 1, 0);
    showGalleryImage(root, next);
  };

  main.addEventListener("pointerup", end);
  main.addEventListener("pointercancel", end);
}

// Chèn một thẻ <style> vào <head> bằng JS (chỉ chèn 1 lần, kiểm tra bằng id để khỏi trùng).
//  - .product-gallery__main : cắt phần ảnh thừa; touch-action:pan-y cho phép cuộn dọc trang nhưng
//    để JS xử lý vuốt ngang; user-select:none chặn bôi đen khi kéo; cursor grab/grabbing = bàn tay nắm
//  - .gallery-track : xếp ảnh ngang (flex), hiệu ứng trượt 0.35s; will-change báo trình duyệt tối ưu animation
//  - ảnh trong track : mỗi ảnh rộng đúng 100% khung, không bắt chuột (để kéo trên khung ngoài)
function injectGalleryStyles() {
  if (document.getElementById("gallery-swipe-style")) return;
  const style = document.createElement("style");
  style.id = "gallery-swipe-style";
  style.textContent = `
    .product-gallery__main{overflow:hidden;touch-action:pan-y;user-select:none;cursor:grab}
    .product-gallery__main:active{cursor:grabbing}
    .gallery-track{display:flex;transition:transform .35s cubic-bezier(.22,.61,.36,1);will-change:transform}
    .gallery-track .gallery-main-img{flex:0 0 100%;width:100%;min-width:0;pointer-events:none;opacity:1}`;
  document.head.appendChild(style);
}

// Gắn toàn bộ sự kiện cho 1 gallery: vuốt/kéo + click thumbnail + click mũi tên trái/phải
// (dùng event delegation: 1 listener click trên root, xem người dùng bấm vào đâu)
function bindGallery(root) {
  if (!root) return;
  bindGallerySwipe(root);
  root.addEventListener("click", (event) => {
    const current = Number(root.dataset.index || 0);
    const thumb = event.target.closest(".gallery-thumb");
    if (thumb) showGalleryImage(root, Number(thumb.dataset.index));
    if (event.target.closest(".gallery-prev")) showGalleryImage(root, current - 1);
    if (event.target.closest(".gallery-next")) showGalleryImage(root, current + 1);
  });
}


/* ==========================================================================
   10. TRANG CHI TIẾT SẢN PHẨM
   ========================================================================== */

// Khởi tạo trang chi tiết. Luồng chạy:
//  1) Không có phần tử #product-detail -> không phải trang này, thoát.
//  2) Đọc ?id= từ URL (getQueryParam định nghĩa ở file khác), tải sản phẩm; lỗi tải -> báo lỗi.
//  3) Không tìm thấy sản phẩm -> thông báo + link quay lại cửa hàng.
//  4) Đổi tiêu đề tab trình duyệt, dựng breadcrumb (Trang chủ / Sản phẩm / Danh mục / Tên SP).
//  5) Dựng giao diện: gallery (trái) + thông tin (phải) gồm tên, meta, giá, khuyến mãi, form mua,
//     3 cam kết, mô tả. Mã sản phẩm hiển thị dạng "KS" + id đệm số 0 cho đủ 3 chữ số (id 7 -> KS007).
//  6) Gắn sự kiện cho form và gallery vừa tạo.
//  7) Vẽ "Sản phẩm liên quan": cùng danh mục, loại chính nó ra, lấy tối đa 5.
async function initProductDetail() {
  const mount = document.getElementById("product-detail");
  if (!mount) return;
  ensureShopFallbacks();

  let product;
  try {
    product = await getProductById(getQueryParam("id"));
  } catch (error) {
    mount.innerHTML = LOAD_ERROR_HTML;
    console.error(error);
    return;
  }

  if (!product) {
    mount.innerHTML = `<p class="empty-state">Không tìm thấy sản phẩm. <a href="${ROOT}pages/san-pham.html">Quay lại cửa hàng</a></p>`;
    return;
  }

  document.title = `${product.name} | ${SHOP_NAME}`;
  const crumb = document.getElementById("product-breadcrumb");
  if (crumb) {
    crumb.innerHTML = `
      <a href="${ROOT}index.html">Trang chủ</a>
      <span>/</span>
      <a href="${ROOT}pages/san-pham.html">Sản phẩm</a>
      <span>/</span>
      <a href="${categoryUrl(product.category)}">${product.categoryName}</a>
      <span>/</span>
      <span>${product.name}</span>`;
  }

  mount.innerHTML = `
    <div class="product-detail">
      ${galleryHtml(product)}
      <div class="product-info">
        <h1>${product.name}</h1>
        <p class="product-meta">
          Thương hiệu: <strong>${SHOP_NAME}</strong>
          · Mã sản phẩm: <strong>KS${String(product.id).padStart(3, "0")}</strong>
          · Danh mục: <a href="${categoryUrl(product.category)}">${product.categoryName}</a>
        </p>
        <div class="product-info__price">${priceHtml(product)}</div>
        ${promoBox()}
        ${productFormHtml(product)}
        <div class="product-assures">
          <span>Giao hàng toàn quốc</span>
          <span>Ưu đãi hấp dẫn</span>
          <span>Sản phẩm chính hãng</span>
        </div>
        <div class="product-desc">
          <h2>Mô tả sản phẩm</h2>
          <p>${product.description}</p>
        </div>
      </div>
    </div>`;

  bindProductForm(mount.querySelector(".product-info"), product);
  bindGallery(mount.querySelector(".product-gallery"));

  const relatedGrid = document.getElementById("related-products");
  if (relatedGrid) {
    relatedGrid.innerHTML = products
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, 5)
      .map(renderProductCard)
      .join("");
  }
}


/* ==========================================================================
   11. SỰ KIỆN TOÀN TRANG VÀ KHỞI CHẠY
   ========================================================================== */

// Lắng nghe click trên TOÀN document (event delegation). Cách này dùng được cho cả các thẻ sản phẩm
// được JS tạo ra sau này (gắn sự kiện riêng cho từng nút sẽ không áp dụng được cho phần tử sinh sau).
//  - [data-quick]       : nút "Xem nhanh" -> chặn hành vi mặc định, mở Quick View, rồi return (không xử lý tiếp)
//  - [data-close-quick] : nút × hoặc nền mờ -> đóng Quick View
// Bấm phím Escape cũng đóng Quick View.
function bindProductEvents() {
  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-quick]");
    if (quick) {
      event.preventDefault();
      openQuickView(quick.dataset.quick);
      return;
    }
    if (event.target.closest("[data-close-quick]")) closeQuickView();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeQuickView();
  });
}

// ĐIỂM KHỞI CHẠY: khi HTML đã đọc xong (DOMContentLoaded) thì chạy lần lượt các việc dưới đây.
// Mỗi hàm tự kiểm tra trang hiện tại có phần tử mình cần không, không có thì bỏ qua;
// nhờ vậy một file này dùng chung được cho trang chủ, trang danh mục và trang chi tiết.
document.addEventListener("DOMContentLoaded", () => {
  ensureShopFallbacks();   // đảm bảo có các hàm giỏ hàng
  injectGalleryStyles();   // chèn CSS cho gallery
  bindProductEvents();     // gắn sự kiện click/phím toàn trang
  renderKingShopProducts();// vẽ lưới danh mục (trang chủ)
  renderHotProductTabs();  // vẽ các lưới sản phẩm (trang chủ)
  setupHotProductTabs();   // bật chức năng chuyển tab
  initProductDetail();     // dựng trang chi tiết (nếu đang ở trang đó)
});