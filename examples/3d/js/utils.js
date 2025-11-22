// Cache some commonly used values.
export const circle = Math.PI * 2;
export const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk/i.test(
	navigator.userAgent,
);
export const canvas = document.getElementById("canvas");
export const ctx = canvas.getContext("2d");
