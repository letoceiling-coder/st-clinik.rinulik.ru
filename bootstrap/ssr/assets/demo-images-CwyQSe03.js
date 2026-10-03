//#region resources/js/lib/demo-images.ts
var CLINIC = {
	exterior: ["/images/demo/clinic-exterior-01.jpg", "/images/demo/clinic-exterior-02.jpg"],
	interior: [
		"/images/demo/clinic-interior-01.jpg",
		"/images/demo/clinic-interior-02.jpg",
		"/images/demo/clinic-interior-03.jpg"
	],
	office: ["/images/demo/clinic-interior-02.jpg", "/images/demo/clinic-interior-03.jpg"],
	equipment: ["/images/demo/clinic-equipment-01.jpg", "/images/demo/clinic-equipment-02.jpg"],
	team: ["/images/demo/clinic-team-01.jpg", "/images/demo/procedure-01.jpg"]
};
var DOCTORS = [
	"/images/demo/doctor-01.jpg",
	"/images/demo/doctor-02.jpg",
	"/images/demo/doctor-03.jpg",
	"/images/demo/doctor-04.jpg",
	"/images/demo/doctor-05.jpg",
	"/images/demo/doctor-06.jpg",
	"/images/demo/doctor-07.jpg",
	"/images/demo/doctor-08.jpg"
];
var DEFAULT_CLINIC = [
	...CLINIC.interior,
	...CLINIC.exterior,
	"/images/demo/procedure-01.jpg",
	"/images/demo/procedure-02.jpg"
];
function clinicPhoto(seed, kind = "interior") {
	const pool = CLINIC[kind] ?? DEFAULT_CLINIC;
	return pool[Math.abs(seed) % pool.length];
}
function doctorPhoto(seed) {
	return DOCTORS[Math.abs(seed) % DOCTORS.length];
}
var HERO_PHOTOS = [
	"/images/demo/hero-01.jpg",
	"/images/demo/hero-02.jpg",
	"/images/demo/hero-03.jpg"
];
//#endregion
export { clinicPhoto as n, doctorPhoto as r, HERO_PHOTOS as t };

//# sourceMappingURL=demo-images-CwyQSe03.js.map