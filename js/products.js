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

const PRICE_RANGES = [
  { id: "under-150", label: "Giá dưới 150.000₫", min: 0, max: 150000 },
  { id: "150-200", label: "150.000₫ - 200.000₫", min: 150000, max: 200000 },
  { id: "200-250", label: "200.000₫ - 250.000₫", min: 200000, max: 250000 },
  { id: "250-350", label: "250.000₫ - 350.000₫", min: 250000, max: 350000 },
  { id: "over-350", label: "Giá trên 350.000₫", min: 350000, max: Infinity },
];

let products = [];

async function loadProducts() {
  const response = await fetch(PRODUCTS_URL);
  if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm");
  products = await response.json();
  return products;
}

function getProductById(id) {
  return products.find((product) => product.id === Number(id));
}

function getFinalPrice(product) {
  return product.salePrice || product.price;
}

function formatPrice(number) {
  return `${Number(number).toLocaleString("vi-VN")}₫`;
}

function getImageUrl(fileName) {
  return `${IMAGE_DIR}${fileName}`;
}

function colorLabel(slug) {
  return COLOR_LABELS[slug] || slug;
}

function ensureShopFallbacks() {
  if (typeof window.getCart !== "function") {
    window.getCart = function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "[]");
      } catch (error) {
        return [];
      }
    };
  }
  if (typeof window.addToCart !== "function") {
    window.addToCart = function (id, size, color, qty) {
      const cart = getCart();
      const nextQty = Number(qty) || 1;
      const match = cart.find(
        (item) =>
          Number(item.id) === Number(id) &&
          (item.size || "") === (size || "") &&
          (item.color || "") === (color || "")
      );
      if (match) match.qty = Number(match.qty || 0) + nextQty;
      else cart.push({ id: Number(id), size: size || "", color: color || "", qty: nextQty });
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
      if (typeof updateCartBadge === "function") updateCartBadge();
    };
  }
  if (typeof window.getCartCount !== "function") {
    window.getCartCount = function () {
      return getCart().reduce((sum, item) => sum + Number(item.qty || 0), 0);
    };
  }
  if (typeof window.updateCartBadge !== "function") {
    window.updateCartBadge = function () {
      const el = document.getElementById("cart-badge");
      if (el) el.textContent = getCartCount();
    };
  }
  if (typeof window.getWishlist !== "function") {
    window.getWishlist = function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.wishlist) || "[]");
      } catch (error) {
        return [];
      }
    };
  }
  if (typeof window.isInWishlist !== "function") {
    window.isInWishlist = function (id) {
      return getWishlist().some((item) => Number(item) === Number(id));
    };
  }
  if (typeof window.toggleWishlist !== "function") {
    window.toggleWishlist = function (id) {
      const list = getWishlist().map(Number);
      const index = list.indexOf(Number(id));
      if (index >= 0) list.splice(index, 1);
      else list.push(Number(id));
      localStorage.setItem(STORAGE_KEYS.wishlist, JSON.stringify(list));
      if (typeof updateWishlistBadge === "function") updateWishlistBadge();
      return isInWishlist(id);
    };
  }
  if (typeof window.updateWishlistBadge !== "function") {
    window.updateWishlistBadge = function () {
      const el = document.getElementById("wishlist-badge");
      if (el) el.textContent = getWishlist().length;
    };
  }
}

function renderProductCard(product) {
  const image = product.images && product.images[0]
    ? getImageUrl(product.images[0])
    : PLACEHOLDER_IMG;
  const salePrice = getFinalPrice(product);
  const oldPrice = product.salePrice
    ? `<del class="price-old">${formatPrice(product.price)}</del>`
    : "";
  const tag = product.tag
    ? `<span class="product-card__tag">${product.tag}</span>`
    : "";
  const soldOutClass = product.inStock ? "" : " product-card--sold-out";
  const optionLabel = product.inStock ? "Tùy chọn" : "Hết hàng";
  const wished = typeof isInWishlist === "function" && isInWishlist(product.id) ? " is-active" : "";

  return `
    <article class="product-card${soldOutClass}">
      <div class="product-card__media">
        <a class="product-card__image" href="${ROOT}pages/chi-tiet.html?id=${product.id}">
          <img src="${image}" alt="${product.name}" loading="lazy">
          ${tag}
        </a>
        <button class="btn-wishlist product-card__wish${wished}" data-id="${product.id}" aria-label="Thêm vào yêu thích">♡</button>
        <div class="product-card__actions">
          <a class="product-card__option" href="${ROOT}pages/chi-tiet.html?id=${product.id}">${optionLabel}</a>
          <button type="button" class="product-card__quick" data-quick="${product.id}">Xem nhanh</button>
        </div>
      </div>
      <div class="product-card__body">
        <span class="product-card__vendor">${product.categoryName}</span>
        <a class="product-card__title" href="${ROOT}pages/chi-tiet.html?id=${product.id}">${product.name}</a>
        <div class="product-card__price">
          <span class="price-sale">${formatPrice(salePrice)}</span>
          ${oldPrice}
        </div>
      </div>
    </article>`;
}

function renderCategoryCard(category) {
  const image = category.products[0].images && category.products[0].images[0]
    ? getImageUrl(category.products[0].images[0])
    : PLACEHOLDER_IMG;

  return `
    <a class="category-card" href="${ROOT}pages/san-pham.html?category=${category.slug}">
      <div class="category-card__image">
        <img src="${image}" alt="${category.name}" loading="lazy">
      </div>
      <span class="category-card__name">${category.name}</span>
      <span class="category-card__count">${category.products.length} sản phẩm</span>
    </a>`;
}

async function renderKingShopProducts() {
  const grid = document.querySelector(".do-hieu-king-shop .category-grid");
  if (!grid) return;

  try {
    const allProducts = products.length ? products : await loadProducts();
    const categories = [];
    const categoryMap = new Map();

    allProducts.forEach((product) => {
      if (!categoryMap.has(product.categoryName)) {
        const category = {
          name: product.categoryName,
          slug: product.category,
          products: []
        };
        categoryMap.set(product.categoryName, category);
        categories.push(category);
      }
      categoryMap.get(product.categoryName).products.push(product);
    });

    grid.innerHTML = categories.map(renderCategoryCard).join("");
  } catch (error) {
    grid.innerHTML = "<p>Không thể tải sản phẩm lúc này.</p>";
    console.error(error);
  }
}

function renderProductsByCategory(selector, allProducts, category) {
  const grid = document.querySelector(selector);
  if (!grid) return;

  const categoryProducts = Array.isArray(allProducts)
    ? allProducts.filter((product) => !category || product.category === category)
    : [];
  grid.innerHTML = categoryProducts.map(renderProductCard).join("");
}

function renderHomeProductSections(allProducts) {
  renderProductsByCategory(
    ".recommendation-grid",
    allProducts.filter((product) => product.category === "ao-xuan-he").slice(0, 3),
    "ao-xuan-he"
  );
  renderProductsByCategory(
    ".collection-grid",
    allProducts.filter((product) => product.category === "lego").slice(0, 5),
    "lego"
  );
}

async function renderHotProductTabs() {
  try {
    const allProducts = products.length ? products : await loadProducts();
    renderHomeProductSections(allProducts);
    renderProductsByCategory(".new-product-grid", allProducts, "ao-xuan-he");
    renderProductsByCategory(".winter-product-grid", allProducts, "do-thu-dong");
  } catch (error) {
    document.querySelectorAll(".hot-product-grid").forEach((grid) => {
      grid.innerHTML = "<p>Không thể tải sản phẩm lúc này.</p>";
    });
    console.error(error);
  }
}

function setupHotProductTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-content");
  if (!buttons.length || !panels.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((item) => item.classList.remove("tab-btn--active"));
      panels.forEach((panel) => {
        panel.hidden = panel.id !== button.dataset.tab;
      });
      button.classList.add("tab-btn--active");
    });
  });
}

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

function qtyControl(id) {
  return `
    <div class="qty-box" data-qty-for="${id}">
      <button type="button" class="qty-box__btn" data-qty="-1" aria-label="Giảm">−</button>
      <input class="qty-box__input" type="number" min="1" value="1">
      <button type="button" class="qty-box__btn" data-qty="1" aria-label="Tăng">+</button>
    </div>`;
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

function selectedValue(root, name) {
  return root.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function selectedQty(root) {
  return Math.max(1, Number(root.querySelector(".qty-box__input")?.value) || 1);
}

function handleAddToCart(product, root, goCheckout) {
  if (!product.inStock) {
    if (typeof showToast === "function") showToast("Sản phẩm đã hết hàng", "error");
    return;
  }
  if (product.sizes?.length && !selectedValue(root, "size")) {
    if (typeof showToast === "function") showToast("Vui lòng chọn kích thước", "error");
    return;
  }
  addToCart(product.id, selectedValue(root, "size"), selectedValue(root, "color"), selectedQty(root));
  if (typeof showToast === "function") showToast("Đã thêm vào giỏ");
  if (goCheckout) location.href = `${ROOT}pages/gio-hang.html`;
}

function productFormHtml(product, extraActions) {
  const sizeRow = product.sizes?.length
    ? `<div class="option-row"><span>Kích thước:</span><div class="option-list">${optionButtons(product.sizes, "size")}</div></div>`
    : "";
  const colorRow = product.colors?.length
    ? `<div class="option-row"><span>Màu sắc:</span><div class="option-list">${optionButtons(product.colors, "color", "", colorLabel)}</div></div>`
    : "";
  const addDisabled = product.inStock ? "" : " disabled";
  return `
    ${sizeRow}
    ${colorRow}
    <div class="option-row">
      <span>Số lượng:</span>
      ${qtyControl(product.id)}
    </div>
    <div class="product-cta">
      <button type="button" class="btn btn--outline js-add-cart"${addDisabled}>THÊM VÀO GIỎ</button>
      <button type="button" class="btn btn--primary js-buy-now"${addDisabled}>${product.inStock ? "MUA NGAY" : "HẾT HÀNG"}</button>
    </div>
    ${extraActions || ""}`;
}

function bindProductForm(root, product) {
  root.addEventListener("click", (event) => {
    const qtyBtn = event.target.closest("[data-qty]");
    if (qtyBtn) {
      const input = root.querySelector(".qty-box__input");
      input.value = Math.max(1, Number(input.value || 1) + Number(qtyBtn.dataset.qty));
    }
    if (event.target.closest(".js-add-cart")) handleAddToCart(product, root, false);
    if (event.target.closest(".js-buy-now")) handleAddToCart(product, root, true);
  });
}

async function openQuickView(id) {
  ensureShopFallbacks();
  if (!products.length) await loadProducts();
  const product = getProductById(id);
  const box = document.getElementById("quick-view") || createQuickViewHost();
  if (!product) return;

  const image = product.images?.[0] ? getImageUrl(product.images[0]) : PLACEHOLDER_IMG;
  box.hidden = false;
  box.innerHTML = `
    <div class="quick-view__backdrop" data-close-quick></div>
    <div class="quick-view__dialog" role="dialog" aria-modal="true" aria-label="Xem nhanh ${product.name}">
      <button class="quick-view__close" type="button" data-close-quick aria-label="Đóng">×</button>
      <div class="quick-view__grid">
        <img src="${image}" alt="${product.name}">
        <div class="quick-view__info">
          <p class="product-card__vendor">${product.categoryName}</p>
          <h2>${product.name}</h2>
          <div class="product-card__price">
            <span class="price-sale">${formatPrice(getFinalPrice(product))}</span>
            ${product.salePrice ? `<del class="price-old">${formatPrice(product.price)}</del>` : ""}
          </div>
          ${promoBox()}
          ${productFormHtml(product, `<a class="quick-view__detail" href="${ROOT}pages/chi-tiet.html?id=${product.id}">Xem chi tiết</a>`)}
        </div>
      </div>
    </div>`;
  bindProductForm(box.querySelector(".quick-view__info"), product);
  document.body.classList.add("no-scroll");
}

function closeQuickView() {
  const box = document.getElementById("quick-view");
  if (!box) return;
  box.hidden = true;
  box.innerHTML = "";
  document.body.classList.remove("no-scroll");
}

function createQuickViewHost() {
  const box = document.createElement("div");
  box.id = "quick-view";
  box.className = "quick-view";
  box.hidden = true;
  document.body.appendChild(box);
  return box;
}

function galleryHtml(product) {
  const images = (product.images || []).map(getImageUrl);
  if (!images.length) images.push(PLACEHOLDER_IMG);
  const thumbs = images.map((src, index) => `
    <button type="button" class="gallery-thumb${index === 0 ? " is-active" : ""}" data-src="${src}">
      <img src="${src}" alt="${product.name} ${index + 1}">
    </button>`).join("");
  return `
    <div class="product-gallery">
      <div class="product-gallery__thumbs">${thumbs}</div>
      <div class="product-gallery__main">
        <img id="gallery-main" src="${images[0]}" alt="${product.name}">
      </div>
    </div>`;
}

async function initProductDetail() {
  const mount = document.getElementById("product-detail");
  if (!mount) return;
  ensureShopFallbacks();
  try {
    if (!products.length) await loadProducts();
  } catch (error) {
    mount.innerHTML = "<p>Không thể tải sản phẩm lúc này.</p>";
    return;
  }

  const product = getProductById(getQueryParam("id"));
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
      <a href="${ROOT}pages/san-pham.html?category=${product.category}">${product.categoryName}</a>
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
          · Danh mục: <a href="${ROOT}pages/san-pham.html?category=${product.category}">${product.categoryName}</a>
        </p>
        <div class="product-info__price">
          <span class="price-sale">${formatPrice(getFinalPrice(product))}</span>
          ${product.salePrice ? `<del class="price-old">${formatPrice(product.price)}</del>` : ""}
        </div>
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
  mount.querySelectorAll(".gallery-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mount.querySelectorAll(".gallery-thumb").forEach((item) => item.classList.remove("is-active"));
      thumb.classList.add("is-active");
      document.getElementById("gallery-main").src = thumb.dataset.src;
    });
  });

  const related = products
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 5);
  const relatedGrid = document.getElementById("related-products");
  if (relatedGrid) relatedGrid.innerHTML = related.map(renderProductCard).join("");
}

function bindProductEvents() {
  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-quick]");
    if (quick) {
      event.preventDefault();
      openQuickView(quick.dataset.quick);
      return;
    }
    if (event.target.closest("[data-close-quick]")) closeQuickView();

    const wish = event.target.closest(".btn-wishlist[data-id]");
    if (wish && typeof toggleWishlist === "function") {
      const active = toggleWishlist(wish.dataset.id);
      wish.classList.toggle("is-active", active);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeQuickView();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureShopFallbacks();
  bindProductEvents();
  renderKingShopProducts();
  renderHotProductTabs();
  setupHotProductTabs();
  initProductDetail();
});