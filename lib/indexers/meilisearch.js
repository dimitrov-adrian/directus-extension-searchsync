/**
 * @type {import("axios").AxiosInstance}
 */
const axios = require('axios');

/**
 * @type {import("./index.js").IndexerInterface}
 */
module.exports = function meilisearch(config) {
	const axiosConfig = {
		headers: config.headers || {},
	};

	if (config.key) {
		axiosConfig.headers['X-Meili-API-Key'] = config.key;
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
