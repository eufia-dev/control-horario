/**
 * Spain location data: regions, provinces, and postal code mappings.
 * Used for display labels and postal-code-based autofill/validation.
 */

// Region type
export type SpainRegion = {
	code: string;
	name: string;
};

// Province type with region association
export type SpainProvince = {
	code: string;
	name: string;
	regionCode: string;
};

// Region map: code → name
export const SPAIN_REGIONS: SpainRegion[] = [
	{ code: 'ES-AN', name: 'Andalucía' },
	{ code: 'ES-AR', name: 'Aragón' },
	{ code: 'ES-AS', name: 'Asturias' },
	{ code: 'ES-CB', name: 'Cantabria' },
	{ code: 'ES-CL', name: 'Castilla y León' },
	{ code: 'ES-CM', name: 'Castilla-La Mancha' },
	{ code: 'ES-CT', name: 'Cataluña' },
	{ code: 'ES-CE', name: 'Ceuta' },
	{ code: 'ES-EX', name: 'Extremadura' },
	{ code: 'ES-GA', name: 'Galicia' },
	{ code: 'ES-IB', name: 'Islas Baleares' },
	{ code: 'ES-CN', name: 'Islas Canarias' },
	{ code: 'ES-RI', name: 'La Rioja' },
	{ code: 'ES-MD', name: 'Madrid' },
	{ code: 'ES-ML', name: 'Melilla' },
	{ code: 'ES-MC', name: 'Murcia' },
	{ code: 'ES-NC', name: 'Navarra' },
	{ code: 'ES-PV', name: 'País Vasco' },
	{ code: 'ES-VC', name: 'Comunidad Valenciana' }
];

// Province map: all 52 provinces with their region codes
// Province codes are the 2-digit INE codes (01-52)
export const SPAIN_PROVINCES: SpainProvince[] = [
	// Andalucía (ES-AN)
	{ code: '04', name: 'Almería', regionCode: 'ES-AN' },
	{ code: '11', name: 'Cádiz', regionCode: 'ES-AN' },
	{ code: '14', name: 'Córdoba', regionCode: 'ES-AN' },
	{ code: '18', name: 'Granada', regionCode: 'ES-AN' },
	{ code: '21', name: 'Huelva', regionCode: 'ES-AN' },
	{ code: '23', name: 'Jaén', regionCode: 'ES-AN' },
	{ code: '29', name: 'Málaga', regionCode: 'ES-AN' },
	{ code: '41', name: 'Sevilla', regionCode: 'ES-AN' },

	// Aragón (ES-AR)
	{ code: '22', name: 'Huesca', regionCode: 'ES-AR' },
	{ code: '44', name: 'Teruel', regionCode: 'ES-AR' },
	{ code: '50', name: 'Zaragoza', regionCode: 'ES-AR' },

	// Asturias (ES-AS)
	{ code: '33', name: 'Asturias', regionCode: 'ES-AS' },

	// Cantabria (ES-CB)
	{ code: '39', name: 'Cantabria', regionCode: 'ES-CB' },

	// Castilla y León (ES-CL)
	{ code: '05', name: 'Ávila', regionCode: 'ES-CL' },
	{ code: '09', name: 'Burgos', regionCode: 'ES-CL' },
	{ code: '24', name: 'León', regionCode: 'ES-CL' },
	{ code: '34', name: 'Palencia', regionCode: 'ES-CL' },
	{ code: '37', name: 'Salamanca', regionCode: 'ES-CL' },
	{ code: '40', name: 'Segovia', regionCode: 'ES-CL' },
	{ code: '42', name: 'Soria', regionCode: 'ES-CL' },
	{ code: '47', name: 'Valladolid', regionCode: 'ES-CL' },
	{ code: '49', name: 'Zamora', regionCode: 'ES-CL' },

	// Castilla-La Mancha (ES-CM)
	{ code: '02', name: 'Albacete', regionCode: 'ES-CM' },
	{ code: '13', name: 'Ciudad Real', regionCode: 'ES-CM' },
	{ code: '16', name: 'Cuenca', regionCode: 'ES-CM' },
	{ code: '19', name: 'Guadalajara', regionCode: 'ES-CM' },
	{ code: '45', name: 'Toledo', regionCode: 'ES-CM' },

	// Cataluña (ES-CT)
	{ code: '08', name: 'Barcelona', regionCode: 'ES-CT' },
	{ code: '17', name: 'Girona', regionCode: 'ES-CT' },
	{ code: '25', name: 'Lleida', regionCode: 'ES-CT' },
	{ code: '43', name: 'Tarragona', regionCode: 'ES-CT' },

	// Ceuta (ES-CE)
	{ code: '51', name: 'Ceuta', regionCode: 'ES-CE' },

	// Extremadura (ES-EX)
	{ code: '06', name: 'Badajoz', regionCode: 'ES-EX' },
	{ code: '10', name: 'Cáceres', regionCode: 'ES-EX' },

	// Galicia (ES-GA)
	{ code: '15', name: 'A Coruña', regionCode: 'ES-GA' },
	{ code: '27', name: 'Lugo', regionCode: 'ES-GA' },
	{ code: '32', name: 'Ourense', regionCode: 'ES-GA' },
	{ code: '36', name: 'Pontevedra', regionCode: 'ES-GA' },

	// Islas Baleares (ES-IB)
	{ code: '07', name: 'Illes Balears', regionCode: 'ES-IB' },

	// Islas Canarias (ES-CN)
	{ code: '35', name: 'Las Palmas', regionCode: 'ES-CN' },
	{ code: '38', name: 'Santa Cruz de Tenerife', regionCode: 'ES-CN' },

	// La Rioja (ES-RI)
	{ code: '26', name: 'La Rioja', regionCode: 'ES-RI' },

	// Madrid (ES-MD)
	{ code: '28', name: 'Madrid', regionCode: 'ES-MD' },

	// Melilla (ES-ML)
	{ code: '52', name: 'Melilla', regionCode: 'ES-ML' },

	// Murcia (ES-MC)
	{ code: '30', name: 'Murcia', regionCode: 'ES-MC' },

	// Navarra (ES-NC)
	{ code: '31', name: 'Navarra', regionCode: 'ES-NC' },

	// País Vasco (ES-PV)
	{ code: '01', name: 'Álava', regionCode: 'ES-PV' },
	{ code: '48', name: 'Bizkaia', regionCode: 'ES-PV' },
	{ code: '20', name: 'Gipuzkoa', regionCode: 'ES-PV' },

	// Comunidad Valenciana (ES-VC)
	{ code: '03', name: 'Alicante', regionCode: 'ES-VC' },
	{ code: '12', name: 'Castellón', regionCode: 'ES-VC' },
	{ code: '46', name: 'Valencia', regionCode: 'ES-VC' }
];

// Helper functions

/**
 * Get region by code
 */
export function getRegionByCode(code: string): SpainRegion | undefined {
	return SPAIN_REGIONS.find((r) => r.code === code);
}

/**
 * Get region name by code
 */
export function getRegionName(code: string): string {
	return getRegionByCode(code)?.name ?? code;
}

/**
 * Get province by code
 */
export function getProvinceByCode(code: string): SpainProvince | undefined {
	return SPAIN_PROVINCES.find((p) => p.code === code);
}

/**
 * Get province name by code
 */
export function getProvinceName(code: string): string {
	return getProvinceByCode(code)?.name ?? code;
}

/**
 * Get all provinces for a given region
 */
export function getProvincesByRegion(regionCode: string): SpainProvince[] {
	return SPAIN_PROVINCES.filter((p) => p.regionCode === regionCode);
}

/**
 * Get region code from province code
 */
export function getRegionCodeFromProvince(provinceCode: string): string | undefined {
	return getProvinceByCode(provinceCode)?.regionCode;
}

/**
 * Get province code from postal code (first 2 digits)
 * In Spain, the postal code prefix IS the province code
 */
export function getProvinceCodeFromPostalCode(postalCode: string): string | undefined {
	if (!postalCode || postalCode.length < 2) return undefined;
	const prefix = postalCode.substring(0, 2);
	// Verify it's a valid province code (01-52)
	const province = getProvinceByCode(prefix);
	return province ? prefix : undefined;
}

/**
 * Validate postal code format (5 digits)
 */
export function isValidPostalCodeFormat(postalCode: string): boolean {
	return /^\d{5}$/.test(postalCode);
}

/**
 * Check if postal code is consistent with province code
 */
export function isPostalCodeConsistentWithProvince(
	postalCode: string,
	provinceCode: string
): boolean {
	const derivedProvinceCode = getProvinceCodeFromPostalCode(postalCode);
	return derivedProvinceCode === provinceCode;
}

/**
 * Derive province and region from postal code
 * Returns { provinceCode, regionCode } or undefined if invalid
 */
export function deriveLocationFromPostalCode(
	postalCode: string
): { provinceCode: string; regionCode: string } | undefined {
	const provinceCode = getProvinceCodeFromPostalCode(postalCode);
	if (!provinceCode) return undefined;

	const regionCode = getRegionCodeFromProvince(provinceCode);
	if (!regionCode) return undefined;

	return { provinceCode, regionCode };
}
