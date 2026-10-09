document.addEventListener("DOMContentLoaded", () => {
	const slider = document.querySelector("[data-review-slider]");
	if (!slider) return;

	const track = slider.querySelector(".review-grid");
	const slides = [...slider.querySelectorAll(".review-slide")];
	const dotsContainer = slider.querySelector("[data-review-dots]");
	const previousButton = slider.querySelector("[data-review-prev]");
	const nextButton = slider.querySelector("[data-review-next]");
	let currentIndex = 0;
	let autoplayId;

	const showSlide = (index) => {
		currentIndex = (index + slides.length) % slides.length;
		track.style.transform = `translateX(-${currentIndex * 100}%)`;
		dotsContainer?.querySelectorAll(".review-dot").forEach((dot, dotIndex) => {
			dot.classList.toggle("review-dot--active", dotIndex === currentIndex);
			dot.setAttribute("aria-current", dotIndex === currentIndex ? "true" : "false");
		});
	};

	const restartAutoplay = () => {
		clearInterval(autoplayId);
		autoplayId = setInterval(() => showSlide(currentIndex + 1), 3000);
	};

	slides.forEach((_, index) => {
		const dot = document.createElement("button");
		dot.type = "button";
		dot.className = "review-dot";
		dot.setAttribute("aria-label", `Chuyển đến nhóm đánh giá ${index + 1}`);
		dot.addEventListener("click", () => {
			showSlide(index);
			restartAutoplay();
		});
		dotsContainer?.appendChild(dot);
	});

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
	slider.addEventListener("focusout", restartAutoplay);

	showSlide(0);
	restartAutoplay();
});
