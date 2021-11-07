const { URL } = require('url');

/**
 * @type {import("axios").AxiosInstance}
 */
const axios = require('axios');

/**
 * @type {import("../../types.js").IndexerInterface}
 */
module.exports = function meilisearch(config) {
	const axiosConfig = {
		headers: config.headers || {},
	};

	if (config.key) {
		axiosConfig.headers['X-Meili-API-Key'] = config.key;
	}

	if (!config.host) {
		throw Error('No HOST set. The server.host is mandatory.');
	}

	const host = new URL(config.host);
	if (!host.hostname || !host.pathname || host.pathname === '/') {
		throw Error(`
			Invalid server.host, it must be like http://ee.example.com/indexname
		`);
	}

	return {
		createIndex,
		deleteItems,
		deleteItem,
		updateItem,
	};

	async function createIndex(collection) {}

	async function deleteItems(collection) {
		try {
			await axios.delete(`${config.host}/indexes/${collection}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	async function deleteItem(collection, id) {
		try {
			await axios.delete(`${config.host}/indexes/${collection}/documents/${id}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	async function updateItem(collection, id, data, pk) {
		try {
			await axios.post(
				`${config.host}/indexes/${collection}/documents?primaryKey=${pk}`,
				[{ id, ...data }],
				axiosConfig
			);
		} catch (error) {
			if (error.response) {
				throw { message: error.toString(), response: error.response };
			}

			throw error;
		}
	}
};
