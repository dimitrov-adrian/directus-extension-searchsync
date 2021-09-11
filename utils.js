function flattenObject(ob) {
	const toReturn = {};

	for (const i in ob) {
		if (!ob.hasOwnProperty(i)) continue;

		if (typeof ob[i] == 'object' && ob[i] !== null) {
			const flatObject = flattenObject(ob[i]);
			for (const x in flatObject) {
				if (!flatObject.hasOwnProperty(x)) continue;

				toReturn[i + '.' + x] = flatObject[x];
			}
		} else {
			toReturn[i] = ob[i];
		}
	}
	return toReturn;
}

/**
 * Returns a new object with the values at each key mapped using mapFn(value)
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

module.exports = { flattenObject, objectMap };
