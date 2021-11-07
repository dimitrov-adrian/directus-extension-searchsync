/**
 * @type {import("axios").AxiosInstance}
 */
const axios = require('axios');

/**
 * @type {import("../../types.js").IndexerInterface}
 */
module.exports = function algolia(config) {
	const axiosConfig = {
		headers: {
			'Content-Type': 'application/json; charset=UTF-8',
			...(config.headers || {}),
		},
	};

	if (config.key) {
		axiosConfig.headers['X-Algolia-API-Key'] = config.key;
	} else {
		throw Error('No API Key set. The server.key is mandatory.');
	}

	if (config.appId) {
		axiosConfig.headers['X-Algolia-Application-Id'] = config.appId;
	} else {
		throw Error('No Application ID set. The server.appId is mandatory.');
	}

	const endpoint = `https://${config.appId}.algolia.net/1/indexes`;

	return {
		createIndex,
		deleteItems,
		deleteItem,
		updateItem,
	};

	async function createIndex() {}

	async function deleteItems(collection) {
		try {
			await axios.post(`${endpoint}/${collection}/clear`, null, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	async function deleteItem(collection, id) {
		try {
			await axios.delete(`${endpoint}/${collection}/${id}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	async function updateItem(collection, id, data) {
		try {
			await axios.put(`${endpoint}/${collection}/${id}`, data, axiosConfig);
		} catch (error) {
			if (error.response) {
				throw { message: error.toString(), response: error.response };
			}

			throw error;
		}
	}
};
