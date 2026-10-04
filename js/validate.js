/* validate.js – Kiểm tra dữ liệu form (Người phụ trách: Vương – LÀM SỚM vì Nam cũng dùng)
   Cần viết (xem CONVENTIONS.md mục 7):
   isValidEmail(value), isValidPhone(value), isNotEmpty(value),
   showFieldError(inputEl, message), clearFieldError(inputEl) */
/* validate.js – Vương
 * Kiểm tra dữ liệu nhập + xử lý form liên hệ + form đăng ký nhận tin.
 * Nạp ngay sau config.js (Nam, Vương đều dùng).
 */

// ---------- Hàm đọc/ghi localStorage dùng chung (an toàn, có try/catch) ----------

/**
 * Đọc JSON từ localStorage.
 * @param {string} key - key lấy từ STORAGE_KEYS
 * @param {*} fallback - giá trị trả về khi chưa có dữ liệu hoặc dữ liệu hỏng
 */
function readJsonStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

/** Ghi JSON vào localStorage. Trả về true nếu thành công. */
function writeJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

// ---------- Hàm kiểm tra giá trị ----------

/** Email hợp lệ cơ bản: có @, có tên miền, không có khoảng trắng. */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

/** SĐT Việt Nam: đúng 10 số, bắt đầu bằng 0. */
function isValidPhone(value) {
  return /^0\d{9}$/.test(String(value).trim());
}

/** Không rỗng sau khi trim(). */
function isNotEmpty(value) {
  return String(value ?? "").trim().length > 0;
}

// ---------- Hiện / xóa lỗi dưới ô nhập ----------

/**
 * Hiện lỗi ngay dưới ô nhập.
 * @param {HTMLElement} inputEl - ô nhập bị lỗi
 * @param {string} message - nội dung lỗi (tiếng Việt)
 */
function showFieldError(inputEl, message) {
  if (!inputEl) return;
  let errorEl = inputEl.nextElementSibling;
  if (!errorEl || !errorEl.classList.contains("field-error")) {
    errorEl = document.createElement("p");
    errorEl.className = "field-error";
    errorEl.setAttribute("role", "alert");
    inputEl.insertAdjacentElement("afterend", errorEl);
  }
  errorEl.textContent = message;
  inputEl.classList.add("is-invalid");
  inputEl.setAttribute("aria-invalid", "true");
}

/** Xóa lỗi của một ô nhập. */
function clearFieldError(inputEl) {
  if (!inputEl) return;
  const errorEl = inputEl.nextElementSibling;
  if (errorEl && errorEl.classList.contains("field-error")) {
    errorEl.remove();
  }
  inputEl.classList.remove("is-invalid");
  inputEl.removeAttribute("aria-invalid");
}

// ---------- Form liên hệ và đăng ký nhận tin ----------

/**
 * Kiểm tra form liên hệ. Trả về true nếu hợp lệ (đồng thời hiện lỗi từng ô).
 * Số điện thoại không bắt buộc, nhưng nếu nhập thì phải đúng định dạng.
 */
function validateContactForm(form) {
  const nameEl = form.querySelector("#contact-name");
  const emailEl = form.querySelector("#contact-email");
  const phoneEl = form.querySelector("#contact-phone");
  const messageEl = form.querySelector("#contact-message");
  let valid = true;

  [nameEl, emailEl, phoneEl, messageEl].forEach(clearFieldError);

  if (!isNotEmpty(nameEl.value)) {
    showFieldError(nameEl, "Vui lòng nhập họ và tên.");
    valid = false;
  }
  if (!isValidEmail(emailEl.value)) {
    showFieldError(emailEl, "Email chưa đúng định dạng, ví dụ: ten@gmail.com.");
    valid = false;
  }
  if (isNotEmpty(phoneEl.value) && !isValidPhone(phoneEl.value)) {
    showFieldError(phoneEl, "Số điện thoại gồm 10 số và bắt đầu bằng 0.");
    valid = false;
  }
  if (messageEl.value.trim().length < 10) {
    showFieldError(messageEl, "Nội dung cần ít nhất 10 ký tự.");
    valid = false;
  }
  return valid;
}

/** Xử lý gửi form liên hệ: kiểm tra, lưu vào localStorage (giả lập gửi), thông báo. */
function handleContactSubmit(form) {
  if (!validateContactForm(form)) return;

  const key = STORAGE_KEYS.contacts || "shop_contacts";
  const contacts = readJsonStorage(key, []);
  contacts.push({
    fullName: form.querySelector("#contact-name").value.trim(),
    email: form.querySelector("#contact-email").value.trim(),
    phone: form.querySelector("#contact-phone").value.trim(),
    message: form.querySelector("#contact-message").value.trim(),
    createdAt: new Date().toISOString(),
  });

  if (writeJsonStorage(key, contacts)) {
    showToast(
      "Đã gửi liên hệ. Shop sẽ phản hồi bạn sớm nhất có thể.",
      "success",
    );
    form.reset();
  } else {
    showToast("Không gửi được liên hệ, vui lòng thử lại.", "error");
  }
}

/** Xử lý đăng ký nhận tin ở footer: kiểm tra email, chặn trùng, lưu. */
function handleNewsletterSubmit(form) {
  const emailEl = form.querySelector("#newsletter-email");
  clearFieldError(emailEl);

  if (!isValidEmail(emailEl.value)) {
    showFieldError(emailEl, "Vui lòng nhập email hợp lệ.");
    return;
  }

  const key = STORAGE_KEYS.newsletter || "shop_newsletter";
  const subscribers = readJsonStorage(key, []);
  const email = emailEl.value.trim().toLowerCase();

  if (subscribers.some((item) => item.email === email)) {
    showToast("Email này đã đăng ký nhận tin trước đó.", "error");
    return;
  }

  subscribers.push({ email, createdAt: new Date().toISOString() });
  if (writeJsonStorage(key, subscribers)) {
    showToast("Đăng ký nhận tin thành công. Cảm ơn bạn!", "success");
    form.reset();
  } else {
    showToast("Không đăng ký được, vui lòng thử lại.", "error");
  }
}

// Footer do main.js đổ vào sau khi tải trang, nên dùng event delegation trên document.
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (form.id === "contact-form") {
    event.preventDefault();
    handleContactSubmit(form);
  } else if (form.id === "newsletter-form") {
    event.preventDefault();
    handleNewsletterSubmit(form);
  }
});

// Người dùng sửa lại ô đang báo lỗi thì xóa lỗi ngay.
document.addEventListener("input", (event) => {
  if (event.target.classList && event.target.classList.contains("is-invalid")) {
    clearFieldError(event.target);
  }
});
