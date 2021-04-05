function flattenObject(ob) {
	var toReturn = {};

	for (var i in ob) {
		if (!ob.hasOwnProperty(i)) continue;

		if (typeof ob[i] == 'object' && ob[i] !== null) {
			var flatObject = flattenObject(ob[i]);
			for (var x in flatObject) {
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
  return Object.keys(object).reduce(function(result, key) {
		const value = object[key];
		if (value instanceof Object) {
			result[key] = value;
		} else {
    	result[key] = mapFn(object[key]);
		}
    return result;
  }, {});
}

module.exports = { flattenObject, objectMap };
