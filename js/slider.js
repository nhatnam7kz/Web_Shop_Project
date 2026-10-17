document.addEventListener("DOMContentLoaded", () => {
	const slider = document.querySelector("[data-slider]");
	if (!slider) return;

	const track = slider.querySelector(".banner-slides");
	const slides = [...slider.querySelectorAll(".banner-slide")];
	const dotsContainer = slider.querySelector("[data-slide-dots]");
	const previousButton = slider.querySelector("[data-slide-prev]");
	const nextButton = slider.querySelector("[data-slide-next]");
	if (!track || !slides.length) return;

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	let currentIndex = 0;
	let autoplayId;

	const showSlide = (index) => {
		currentIndex = (index + slides.length) % slides.length;
		track.style.transform = `translateX(-${currentIndex * 100}%)`;
		slides.forEach((slide, slideIndex) => {
			const isActive = slideIndex === currentIndex;
			slide.tabIndex = isActive ? 0 : -1;
			slide.setAttribute("aria-hidden", String(!isActive));
		});
		dotsContainer?.querySelectorAll(".banner-dot").forEach((dot, dotIndex) => {
			dot.classList.toggle("banner-dot--active", dotIndex === currentIndex);
			dot.setAttribute("aria-current", dotIndex === currentIndex ? "true" : "false");
		});
	};

	slides.forEach((_, index) => {
		const dot = document.createElement("button");
		dot.type = "button";
		dot.className = "banner-dot";
		dot.setAttribute("aria-label", `Chuyển đến ảnh ${index + 1}`);
		dot.addEventListener("click", () => {
			showSlide(index);
			restartAutoplay();
		});
		dotsContainer?.appendChild(dot);
	});

	const restartAutoplay = () => {
		clearInterval(autoplayId);
		if (slides.length < 2 || reducedMotion.matches || document.hidden ||
			slider.matches(":hover") || slider.contains(document.activeElement)) return;
		autoplayId = setInterval(() => showSlide(currentIndex + 1), 5000);
	};

	previousButton?.addEventListener("click", () => {
		showSlide(currentIndex - 1);
		restartAutoplay();
	});
	nextButton?.addEventListener("click", () => {
		showSlide(currentIndex + 1);
		restartAutoplay();
	});
	slider.addEventListener("mouseenter", () => clearInterval(autoplayId));
	slider.addEventListener("mouseleave", restartAutoplay);
	slider.addEventListener("focusin", () => clearInterval(autoplayId));
	slider.addEventListener("focusout", () => setTimeout(restartAutoplay, 0));
	document.addEventListener("visibilitychange", restartAutoplay);
	reducedMotion.addEventListener("change", restartAutoplay);

	showSlide(0);
	restartAutoplay();
});
