const axios = require('axios');

module.exports = function elasticsearch(config) {

	const axiosConfig = {
		headers: {
			'Content-Type': 'application/json',
			...(config.headers || {}),
		},
	};

	return {
		createIndex,
		dropIndex,
		deleteItem,
		updateItem,
	};

	async function createIndex(collection)
	{
		try {
			return await axios.put(`${config.host}/${collection}`, null, axiosConfig);
		} catch (error) {
			if (error.response &&
					error.response.status === 400 &&
					error.response.error &&
					error.response.error.type === 'resource_already_exists_exception') {
				return;
			}
			console.warn(
					'INDEXER', 'Cannot create index', collection, error.toString());
			throw error;
		}
	}

	async function dropIndex(collection)
	{
		try {
			return await axios.delete(`${config.host}/${collection}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				return;
			}
			console.warn(
					'INDEXER', 'Cannot drop index', collection, error.toString());
		}
	}

	async function deleteItem(collection, id)
	{
		try {
			return await axios.delete(
					`${config.host}/${collection}/_doc/${id}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				return;
			}
			console.warn(
					'INDEXER', 'Cannot delete', `${collection}/${id}`, error.toString());
		}
	}

	async function updateItem(collection, id, data)
	{
		try {
			return await axios.post(
					`${config.host}/${collection}/_doc/${id}`, data, axiosConfig);
		} catch (error) {
			console.warn(
					'INDEXER', 'Cannot index', `${collection}/${id}`, error.toString());
		}
	}
};
