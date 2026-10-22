const COLOR_LABELS = {
  den: "Đen",
  trang: "Trắng",
  xam: "Xám",
  be: "Be",
  hong: "Hồng",
  "xanh-navy": "Xanh navy",
  do: "Đỏ",
  vang: "Vàng",
  "xanh-reu": "Xanh rêu",
  trong: "Trong suốt",
  "xanh-la": "Xanh lá",
};

const LOAD_ERROR_HTML = "<p>Không thể tải sản phẩm lúc này.</p>";

/* ---------- Dữ liệu ---------- */

let products = [];
let productsPromise = null;

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

async function getProductById(id) {
  return (await loadProducts()).find((product) => product.id === Number(id));
}

/* ---------- Tiện ích ---------- */

const getFinalPrice = (product) => product.salePrice ?? product.price;
const formatPrice = (number) => `${Number(number).toLocaleString("vi-VN")}₫`;
const getImageUrl = (fileName) => `${IMAGE_DIR}${fileName}`;
const colorLabel = (slug) => COLOR_LABELS[slug] || slug;
const detailUrl = (id) => `${ROOT}pages/chi-tiet.html?id=${id}`;
const categoryUrl = (slug) => `${ROOT}pages/san-pham.html?category=${slug}`;
const clamp = (value) => Math.min(99, Math.max(1, value));
function notify(message, type) {
  if (typeof showToast === "function") showToast(message, type);
}

function readList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch (error) {
    return [];
  }
}

function setBadge(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

const userKey = (base) => (typeof userStorageKey === "function" ? userStorageKey(base) : base);

function ensureShopFallbacks() {
  window.getCart ||= () => {
    const key = userKey(STORAGE_KEYS.cart);
    return key ? readList(key) : [];
  };

  window.addToCart ||= (id, size, color, qty) => {
    if (typeof requireLogin === "function" && !requireLogin("Vui lòng đăng nhập để thêm vào giỏ hàng")) {
      return false;
    }
    const cartKey = userKey(STORAGE_KEYS.cart);
    if (!cartKey) return false;
    const cart = getCart();
    const nextQty = Number(qty) || 1;
    const match = cart.find(
      (item) =>
        Number(item.id) === Number(id) &&
        (item.size || null) === (size || null) &&
        (item.color || null) === (color || null)
    );
    if (match) match.qty = Number(match.qty || 0) + nextQty;
    else cart.push({ id: Number(id), size: size || null, color: color || null, qty: nextQty });
    localStorage.setItem(cartKey, JSON.stringify(cart));
    if (typeof updateCartBadge === "function") updateCartBadge();
    notify("Đã thêm vào giỏ");
    return true;
  };

  window.getCartCount ||= () => getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
  window.updateCartBadge ||= () => setBadge("cart-badge", getCartCount());
}

/* ---------- Thẻ sản phẩm / danh mục ---------- */

function priceHtml(product) {
  const oldPrice = product.salePrice
    ? `<del class="price-old">${formatPrice(product.price)}</del>`
    : "";
  return `<span class="price-sale">${formatPrice(getFinalPrice(product))}</span>${oldPrice}`;
}

function firstImageUrl(product) {
  return product.images?.[0] ? getImageUrl(product.images[0]) : PLACEHOLDER_IMG;
}

function renderProductCard(product) {
  const soldOutClass = product.inStock ? "" : " product-card--sold-out";
  const optionLabel = product.inStock ? "Tùy chọn" : "Hết hàng";
  const url = detailUrl(product.id);

  return `
    <article class="product-card${soldOutClass}">
      <div class="product-card__media">
        <a class="product-card__image" href="${url}">
          <img src="${firstImageUrl(product)}" alt="${product.name}" loading="lazy">
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
}

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

/* ---------- Trang chủ ---------- */

function renderProductGrid(selector, list, category, limit) {
  const grid = document.querySelector(selector);
  if (!grid) return;
  let items = list.filter((product) => !category || product.category === category);
  if (limit) items = items.slice(0, limit);
  grid.innerHTML = items.map(renderProductCard).join("");
}

async function renderHome() {
  const categoryGrid = document.querySelector(".do-hieu-king-shop .category-grid");
  const hasGrids = document.querySelector(
    ".recommendation-grid, .collection-grid, .new-product-grid, .winter-product-grid"
  );
  if (!categoryGrid && !hasGrids) return;

  try {
    const all = await loadProducts();

    if (categoryGrid) {
      const categories = new Map();
      all.forEach((product) => {
        if (!categories.has(product.categoryName)) {
          categories.set(product.categoryName, {
            name: product.categoryName,
            slug: product.category,
            products: [],
          });
        }
        categories.get(product.categoryName).products.push(product);
      });
      categoryGrid.innerHTML = [...categories.values()].map(renderCategoryCard).join("");
    }

    renderProductGrid(".recommendation-grid", all, "ao-xuan-he", 3);
    renderProductGrid(".collection-grid", all, "lego", 5);
    renderProductGrid(".new-product-grid", all, "ao-xuan-he");
    renderProductGrid(".winter-product-grid", all, "do-thu-dong");
  } catch (error) {
    document
      .querySelectorAll(".do-hieu-king-shop .category-grid, .hot-product-grid")
      .forEach((grid) => (grid.innerHTML = LOAD_ERROR_HTML));
    console.error(error);
  }
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-content");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("tab-btn--active"));
      panels.forEach((panel) => (panel.hidden = panel.id !== button.dataset.tab));
      button.classList.add("tab-btn--active");
    });
  });
}

/* ---------- Form chọn size / màu / số lượng ---------- */

function optionButtons(items, name, labelFn) {
  return items
    .map((item, index) => {
      const dot = name === "color" ? `<i class="swatch swatch--${item}"></i>` : "";
      return `
      <label class="option-chip">
        <input type="radio" name="${name}" value="${item}"${index === 0 ? " checked" : ""}>
        ${dot}<span>${labelFn ? labelFn(item) : item}</span>
      </label>`;
    })
    .join("");
}

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

function productFormHtml(product, extraActions = "") {
  const row = (label, content) =>
    content ? `<div class="option-row"><span>${label}:</span>${content}</div>` : "";
  const list = (items, name, labelFn) =>
    items?.length ? `<div class="option-list">${optionButtons(items, name, labelFn)}</div>` : "";
  const disabled = product.inStock ? "" : " disabled";

  return `
    ${row("Kích thước", list(product.sizes, "size"))}
    ${row("Màu sắc", list(product.colors, "color", colorLabel))}
    ${row("Số lượng", `
      <div class="qty-box">
        <button type="button" class="qty-box__btn" data-qty="-1" aria-label="Giảm">−</button>
        <input class="qty-box__input" type="number" min="1" max="99" value="1">
        <button type="button" class="qty-box__btn" data-qty="1" aria-label="Tăng">+</button>
      </div>`)}
    <div class="product-cta">
      <button type="button" class="btn btn--outline js-add-cart"${disabled}>THÊM VÀO GIỎ</button>
      <button type="button" class="btn btn--primary js-buy-now"${disabled}>${product.inStock ? "MUA NGAY" : "HẾT HÀNG"}</button>
    </div>
    ${extraActions}`;
}

const selectedValue = (root, name) =>
  root.querySelector(`input[name="${name}"]:checked`)?.value || "";

function handleAddToCart(product, root, buyNow) {
  if (!product.inStock) return notify("Sản phẩm đã hết hàng", "error");

  const size = selectedValue(root, "size");
  if (product.sizes?.length && !size) return notify("Vui lòng chọn kích thước", "error");

  const qty = clamp(Number(root.querySelector(".qty-box__input").value) || 1);
  const added = addToCart(product.id, size || null, selectedValue(root, "color") || null, qty);
  if (added !== false && buyNow) location.href = `${ROOT}pages/gio-hang.html`;
}

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

/* ---------- Gallery ảnh ---------- */

function galleryHtml(product) {
  const images = product.images?.length ? product.images.map(getImageUrl) : [PLACEHOLDER_IMG];

  const thumbs = images
    .map(
      (src, index) => `
    <button type="button" class="gallery-thumb${index === 0 ? " is-active" : ""}" data-src="${src}" data-index="${index}">
      <img src="${src}" alt="${product.name} ${index + 1}">
    </button>`
    )
    .join("");

  const arrows =
    images.length > 1
      ? `<button type="button" class="gallery-arrow gallery-prev" aria-label="Ảnh trước">‹</button>
         <button type="button" class="gallery-arrow gallery-next" aria-label="Ảnh sau">›</button>`
      : "";

  return `
    <div class="product-gallery" data-index="0">
      <div class="product-gallery__thumbs">${thumbs}</div>
      <div class="product-gallery__main">
        <img class="gallery-main-img" src="${images[0]}" alt="${product.name}">
        ${arrows}
      </div>
    </div>`;
}

function bindGallery(root) {
  if (!root) return;
  const thumbs = root.querySelectorAll(".gallery-thumb");
  const mainImg = root.querySelector(".gallery-main-img");

  const show = (index) => {
    index = (index + thumbs.length) % thumbs.length;
    root.dataset.index = index;
    thumbs.forEach((thumb, i) => thumb.classList.toggle("is-active", i === index));
    mainImg.src = thumbs[index].dataset.src;
  };

  root.addEventListener("click", (event) => {
    const current = Number(root.dataset.index);
    const thumb = event.target.closest(".gallery-thumb");
    if (thumb) show(Number(thumb.dataset.index));
    if (event.target.closest(".gallery-prev")) show(current - 1);
    if (event.target.closest(".gallery-next")) show(current + 1);
  });
}

/* ---------- Quick View ---------- */

async function openQuickView(id) {
  const product = await getProductById(id);
  if (!product) return;

  let box = document.getElementById("quick-view");
  if (!box) {
    box = document.createElement("div");
    box.id = "quick-view";
    box.className = "quick-view";
    document.body.appendChild(box);
  }

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

function closeQuickView() {
  const box = document.getElementById("quick-view");
  if (!box) return;
  box.hidden = true;
  box.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

/* ---------- Trang chi tiết ---------- */

async function initProductDetail() {
  const mount = document.getElementById("product-detail");
  if (!mount) return;

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
      <a href="${ROOT}index.html">Trang chủ</a><span>/</span>
      <a href="${ROOT}pages/san-pham.html">Sản phẩm</a><span>/</span>
      <a href="${categoryUrl(product.category)}">${product.categoryName}</a><span>/</span>
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

/* ---------- Khởi chạy ---------- */

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

document.addEventListener("DOMContentLoaded", () => {
  ensureShopFallbacks();
  renderHome();
  setupTabs();
  initProductDetail();
});