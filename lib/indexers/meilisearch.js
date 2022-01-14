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
		// Meilisearch changed their authorization in 0.25 from the
		// 'X-Meili-API-Key' header to Authorization bearer.

		// Include old headers for compatibility with pre-0.25 versions of Meilisearch
		axiosConfig.headers['X-Meili-API-Key'] = config.key;

		// New auth headers for 0.25+
		axiosConfig.headers['Authorization'] = `Bearer ${config.key}`;
	}

	if (!config.host) {
		throw Error('No HOST set. The server.host is mandatory.');
	}

	const host = new URL(config.host);
	if (!host.hostname || (host.pathname && host.pathname !== '/')) {
		throw Error(`Invalid server.host, it must be like http://meili.example.com/`);
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
				[{ [pk]: id, ...data }],
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
