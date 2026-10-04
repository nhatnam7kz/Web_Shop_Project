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

   return `
      <article class="product-card${soldOutClass}">
         <a class="product-card__image" href="${ROOT}pages/chi-tiet.html?id=${product.id}">
            <img src="${image}" alt="${product.name}" loading="lazy">
            ${tag}
         </a>
         <button class="btn-wishlist product-card__wish" data-id="${product.id}" aria-label="Thêm vào yêu thích">♡</button>
         <div class="product-card__body">
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

   const categoryProducts = allProducts.filter(
      (product) => product.category === category
   );
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

document.addEventListener("DOMContentLoaded", () => {
   renderKingShopProducts();
   renderHotProductTabs();
   setupHotProductTabs();
});
