module.exports = {
	flattenObject,
	objectMap,
	filteredObject,
};

function flattenObject(ob, glue = '.') {
	const toReturn = {};

	for (const i in ob) {
		if (!ob.hasOwnProperty(i)) continue;

		if (typeof ob[i] == 'object' && ob[i] !== null) {
			const flatObject = flattenObject(ob[i], glue);
			for (const x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) continue;

				toReturn[i + glue + x] = flatObject[x];
			}
		} else {
			toReturn[i] = ob[i];
		}
	}

	return toReturn;
}

/**
 * Returns a new object with the values at each key mapped using mapFn(value)
 * @param {Record<string, any>} object
 * @param {(value: any, key: string) => any} mapFn
 * @return {Record<string, any>}
 */
function objectMap(object, mapFn) {
	return Object.keys(object).reduce(function (result, key) {
		const value = object[key];
		if (value instanceof Object) {
			result[key] = value;
		} else {
			result[key] = mapFn(object[key], key);
		}

		return result;
	}, {});
}

/**
 * @param {Record<string, any>} object
 * @param {string[]} keys
 * @return {Record<string, any>}
 */
function filteredObject(object, keys) {
	return Object.keys(object)
		.filter((key) => keys.includes(key))
		.reduce((obj, key) => {
			return {
				...obj,
				[key]: object[key],
			};
		}, {});
}
