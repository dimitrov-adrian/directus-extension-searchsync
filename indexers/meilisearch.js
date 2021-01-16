const axios = require('axios');

module.exports = function meilisearch(config) {

	const axiosConfig = {
		headers: config.headers || {},
	};

	if (config.key) {
		axiosConfig.headers['X-Meili-API-Key'] = config.key;
	}

	return {
		createIndex,
		dropIndex,
		deleteItem,
		updateItem,
	};

	async function createIndex(collection)
	{
	}

	async function dropIndex(collection)
	{
		try {
			return await axios.delete(
					`${config.host}/indexes/${collection}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				return;
			}
			throw error;
		}
	}

	async function deleteItem(collection, id)
	{
		try {
			return await axios.delete(
					`${config.host}/indexes/${collection}/documents/${id}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				return;
			}
			throw error;
		}
	}

	async function updateItem(collection, id, data, pk)
	{
		return await axios.post(
				`${config.host}/indexes/${collection}/documents?primaryKey=${pk}`,
				[{id, ...data}], axiosConfig,
		);
	}
};
