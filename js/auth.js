/* auth.js – Vương
 * Đăng ký / đăng nhập giả lập bằng localStorage + logic các trang dang-nhap, dang-ky, tai-khoan.
 * LƯU Ý: mật khẩu lưu dạng chữ thường chỉ vì đây là bài tập giả lập, thực tế không bao giờ làm vậy.
 */

const PASSWORD_MIN_LENGTH = 6;

// ---------- Hàm dùng chung (giao diện giữa các thành viên) ----------

/** Lấy danh sách user đã đăng ký (mảng rỗng nếu chưa có). */
function getStoredUsers() {
  const users = readJsonStorage(STORAGE_KEYS.users, []);
  return Array.isArray(users) ? users : [];
}

/**
 * Đăng ký tài khoản mới.
 * @param {{fullName: string, email: string, password: string}} data
 * @returns {{ok: boolean, message?: string}}
 */
function registerUser({ fullName, email, password }) {
  const cleanEmail = String(email).trim().toLowerCase();

  if (!isNotEmpty(fullName))
    return { ok: false, message: "Vui lòng nhập họ và tên." };
  if (!isValidEmail(cleanEmail))
    return { ok: false, message: "Email chưa đúng định dạng." };
  if (String(password).length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
    };
  }

  const users = getStoredUsers();
  if (users.some((user) => user.email === cleanEmail)) {
    return { ok: false, message: "Email này đã được đăng ký." };
  }

  users.push({
    fullName: String(fullName).trim(),
    email: cleanEmail,
    password: String(password),
    phone: "",
    address: "",
    createdAt: new Date().toISOString(),
  });
  if (!writeJsonStorage(STORAGE_KEYS.users, users)) {
    return {
      ok: false,
      message: "Không lưu được tài khoản, vui lòng thử lại.",
    };
  }
  return { ok: true };
}

/**
 * Đăng nhập. Thành công thì lưu email vào shop_currentUser.
 * @returns {{ok: boolean, message?: string}}
 */
function loginUser(email, password) {
  const cleanEmail = String(email).trim().toLowerCase();
  const user = getStoredUsers().find((item) => item.email === cleanEmail);

  if (!user || user.password !== password) {
    return { ok: false, message: "Email hoặc mật khẩu không đúng." };
  }
  writeJsonStorage(STORAGE_KEYS.currentUser, user.email);
  return { ok: true };
}

/** Đăng xuất: xóa shop_currentUser. */
function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
  } catch (error) {
    // Bỏ qua: trình duyệt chặn localStorage thì coi như chưa đăng nhập.
  }
}

/** Trả về object user (không có password) hoặc null nếu chưa đăng nhập. */
function getCurrentUser() {
  const email = readJsonStorage(STORAGE_KEYS.currentUser, null);
  if (!email) return null;
  const user = getStoredUsers().find((item) => item.email === email);
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

/** Chưa đăng nhập thì chuyển sang trang đăng nhập (kèm ?redirect=) và trả về false. */
function requireLogin() {
  if (getCurrentUser()) return true;
  const back = location.pathname + location.search;
  location.href = `${ROOT}pages/dang-nhap.html?redirect=${encodeURIComponent(back)}`;
  return false;
}

/**
 * Cập nhật thông tin cá nhân. Chỉ cho sửa: fullName, phone, address, password.
 * @returns {{ok: boolean, message?: string}}
 */
function updateUser(email, data) {
  const users = getStoredUsers();
  const index = users.findIndex((user) => user.email === email);
  if (index === -1) return { ok: false, message: "Không tìm thấy tài khoản." };

  ["fullName", "phone", "address", "password"].forEach((field) => {
    if (data[field] !== undefined) users[index][field] = data[field];
  });
  return writeJsonStorage(STORAGE_KEYS.users, users)
    ? { ok: true }
    : { ok: false, message: "Không lưu được thay đổi, vui lòng thử lại." };
}

// ---------- Logic các trang ----------

/** Chỉ cho quay lại trang cùng website (tránh chuyển hướng sang trang lạ). */
function getSafeRedirect() {
  const target = getQueryParam("redirect");
  if (!target) return null;
  try {
    const url = new URL(target, location.origin);
    return url.origin === location.origin ? url.pathname + url.search : null;
  } catch (error) {
    return null;
  }
}

/** Gắn xử lý cho trang đăng nhập. */
function initLoginPage(form) {
  const emailEl = form.querySelector("#login-email");
  const passwordEl = form.querySelector("#login-password");
  const formError = form.querySelector("#login-error");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    [emailEl, passwordEl].forEach(clearFieldError);
    formError.textContent = "";

    let valid = true;
    if (!isValidEmail(emailEl.value)) {
      showFieldError(emailEl, "Vui lòng nhập email hợp lệ.");
      valid = false;
    }
    if (!isNotEmpty(passwordEl.value)) {
      showFieldError(passwordEl, "Vui lòng nhập mật khẩu.");
      valid = false;
    }
    if (!valid) return;

    const result = loginUser(emailEl.value, passwordEl.value);
    if (!result.ok) {
      formError.textContent = result.message;
      return;
    }
    location.href = getSafeRedirect() || `${ROOT}pages/tai-khoan.html`;
  });
}

/** Gắn xử lý cho trang đăng ký. Đăng ký xong tự đăng nhập. */
function initRegisterPage(form) {
  const nameEl = form.querySelector("#register-fullname");
  const emailEl = form.querySelector("#register-email");
  const passwordEl = form.querySelector("#register-password");
  const confirmEl = form.querySelector("#register-confirm");
  const formError = form.querySelector("#register-error");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    [nameEl, emailEl, passwordEl, confirmEl].forEach(clearFieldError);
    formError.textContent = "";

    let valid = true;
    if (!isNotEmpty(nameEl.value)) {
      showFieldError(nameEl, "Vui lòng nhập họ và tên.");
      valid = false;
    }
    if (!isValidEmail(emailEl.value)) {
      showFieldError(
        emailEl,
        "Email chưa đúng định dạng, ví dụ: ten@gmail.com.",
      );
      valid = false;
    }
    if (passwordEl.value.length < PASSWORD_MIN_LENGTH) {
      showFieldError(
        passwordEl,
        `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
      );
      valid = false;
    }
    if (confirmEl.value !== passwordEl.value) {
      showFieldError(confirmEl, "Mật khẩu nhập lại chưa khớp.");
      valid = false;
    }
    if (!valid) return;

    const result = registerUser({
      fullName: nameEl.value,
      email: emailEl.value,
      password: passwordEl.value,
    });
    if (!result.ok) {
      formError.textContent = result.message;
      return;
    }
    loginUser(emailEl.value, passwordEl.value);
    location.href = getSafeRedirect() || `${ROOT}pages/tai-khoan.html`;
  });
}

/** Tên hiển thị của trạng thái đơn hàng. */
const ORDER_STATUS_LABELS = {
  pending: "Chờ xử lý",
  shipping: "Đang giao",
  done: "Hoàn thành",
  cancelled: "Đã hủy",
};

/** Đổi ký tự đặc biệt thành HTML an toàn trước khi chèn vào innerHTML. */
function toSafeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

/** Vẽ danh sách đơn hàng của người dùng vào #account-orders. */
function renderAccountOrders(user) {
  const box = document.getElementById("account-orders");
  if (!box) return;

  const orders =
    typeof getOrdersByUser === "function" ? getOrdersByUser(user.email) : [];
  if (!orders.length) {
    box.innerHTML = `<p class="account-empty">Bạn chưa có đơn hàng nào. <a href="${ROOT}pages/san-pham.html">Mua sắm ngay</a></p>`;
    return;
  }

  box.innerHTML = orders
    .map((order) => {
      const items = order.items
        .map((item) => {
          const options = [item.size, item.color].filter(Boolean).join(" / ");
          return `<li>${toSafeHtml(item.name)}${options ? ` (${toSafeHtml(options)})` : ""} × ${Number(item.qty)}</li>`;
        })
        .join("");
      const date = new Date(order.createdAt).toLocaleDateString("vi-VN");
      return `
        <article class="order-card">
          <header class="order-card__header">
            <strong class="order-card__id">${toSafeHtml(order.orderId)}</strong>
            <span class="order-card__status order-card__status--${toSafeHtml(order.status)}">${
              ORDER_STATUS_LABELS[order.status] || toSafeHtml(order.status)
            }</span>
          </header>
          <p class="order-card__date">Ngày đặt: ${date}</p>
          <ul class="order-card__items">${items}</ul>
          <p class="order-card__total">Tổng thanh toán: <strong>${formatPrice(order.total)}</strong></p>
        </article>`;
    })
    .join("");
}

/** Gắn xử lý cho trang tài khoản: thông tin cá nhân, đơn hàng, đổi mật khẩu, chuyển tab. */
function initAccountPage() {
  if (!requireLogin()) return;
  const user = getCurrentUser();

  const profileForm = document.getElementById("profile-form");
  const passwordForm = document.getElementById("password-form");
  const nameEl = profileForm.querySelector("#profile-fullname");
  const emailEl = profileForm.querySelector("#profile-email");
  const phoneEl = profileForm.querySelector("#profile-phone");
  const addressEl = profileForm.querySelector("#profile-address");

  document.getElementById("account-greeting").textContent =
    `Xin chào, ${user.fullName}`;
  nameEl.value = user.fullName;
  emailEl.value = user.email;
  phoneEl.value = user.phone || "";
  addressEl.value = user.address || "";

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    [nameEl, phoneEl].forEach(clearFieldError);

    let valid = true;
    if (!isNotEmpty(nameEl.value)) {
      showFieldError(nameEl, "Vui lòng nhập họ và tên.");
      valid = false;
    }
    if (isNotEmpty(phoneEl.value) && !isValidPhone(phoneEl.value)) {
      showFieldError(phoneEl, "Số điện thoại gồm 10 số và bắt đầu bằng 0.");
      valid = false;
    }
    if (!valid) return;

    const result = updateUser(user.email, {
      fullName: nameEl.value.trim(),
      phone: phoneEl.value.trim(),
      address: addressEl.value.trim(),
    });
    if (result.ok) {
      document.getElementById("account-greeting").textContent =
        `Xin chào, ${nameEl.value.trim()}`;
      showToast("Đã lưu thông tin cá nhân.", "success");
    } else {
      showToast(result.message, "error");
    }
  });

  const oldEl = passwordForm.querySelector("#password-old");
  const newEl = passwordForm.querySelector("#password-new");
  const confirmEl = passwordForm.querySelector("#password-confirm");

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    [oldEl, newEl, confirmEl].forEach(clearFieldError);

    // getCurrentUser() không trả password nên đọc lại từ danh sách user để đối chiếu.
    const stored = getStoredUsers().find((item) => item.email === user.email);
    let valid = true;
    if (!stored || stored.password !== oldEl.value) {
      showFieldError(oldEl, "Mật khẩu hiện tại không đúng.");
      valid = false;
    }
    if (newEl.value.length < PASSWORD_MIN_LENGTH) {
      showFieldError(
        newEl,
        `Mật khẩu mới cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`,
      );
      valid = false;
    }
    if (confirmEl.value !== newEl.value) {
      showFieldError(confirmEl, "Mật khẩu nhập lại chưa khớp.");
      valid = false;
    }
    if (!valid) return;

    const result = updateUser(user.email, { password: newEl.value });
    if (result.ok) {
      showToast("Đã đổi mật khẩu.", "success");
      passwordForm.reset();
    } else {
      showToast(result.message, "error");
    }
  });

  // Chuyển tab (event delegation trên thanh tab).
  const tabs = document.getElementById("account-tabs");
  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    tabs.querySelectorAll("[data-tab]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("account-tabs__btn--active", active);
      item.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== button.dataset.tab;
    });
  });

  renderAccountOrders(user);

  // Link dạng tai-khoan.html#orders (hoặc #password, #profile) mở thẳng tab tương ứng.
  const initialTab = tabs.querySelector(
    `[data-tab="${location.hash.slice(1)}"]`,
  );
  if (initialTab) initialTab.click();
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // Đã đăng nhập thì không cần vào trang đăng nhập/đăng ký nữa.
  if ((loginForm || registerForm) && getCurrentUser()) {
    location.href = getSafeRedirect() || `${ROOT}pages/tai-khoan.html`;
    return;
  }
  if (loginForm) initLoginPage(loginForm);
  if (registerForm) initRegisterPage(registerForm);
  if (document.getElementById("profile-form")) initAccountPage();
});

// Nút đăng xuất ở bất kỳ đâu (header, trang tài khoản): <button data-action="logout">.
document.addEventListener("click", (event) => {
  if (event.target.closest('[data-action="logout"]')) {
    logoutUser();
    showToast("Bạn đã đăng xuất.", "success");
    setTimeout(() => {
      location.href = `${ROOT}index.html`;
    }, 600);
  }
});
