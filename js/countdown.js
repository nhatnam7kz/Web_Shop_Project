document.addEventListener("DOMContentLoaded", () => {
	const hoursElement = document.getElementById("hours");
	const minutesElement = document.getElementById("minutes");
	const secondsElement = document.getElementById("seconds");
	if (!hoursElement || !minutesElement || !secondsElement) return;

	const initialDuration =
		Number(hoursElement.textContent) * 3600 +
		Number(minutesElement.textContent) * 60 +
		Number(secondsElement.textContent);
	let remainingSeconds = initialDuration;

	const updateCountdown = () => {
		if (remainingSeconds <= 0) remainingSeconds = initialDuration;

		const hours = Math.floor(remainingSeconds / 3600);
		const minutes = Math.floor((remainingSeconds % 3600) / 60);
		const seconds = remainingSeconds % 60;

		hoursElement.textContent = String(hours).padStart(2, "0");
		minutesElement.textContent = String(minutes).padStart(2, "0");
		secondsElement.textContent = String(seconds).padStart(2, "0");
		remainingSeconds -= 1;
	};

	updateCountdown();
	setInterval(updateCountdown, 1000);
});
