const axios = require("axios");

module.exports = function elasticsearch(config) {
	const axiosConfig = {
		headers: {
			"Content-Type": "application/json",
			...(config.headers || {}),
		},
	};

	if (!config.host) {
		throw Error("No HOST set. The server.host is mandatory.");
	}

	return {
		createIndex,
		dropIndex,
		deleteItem,
		updateItem,
	};

	async function createIndex(collection) {
		try {
			return await axios.put(`${config.host}/${collection}`, null, axiosConfig);
		} catch (error) {
			if (
				error.response &&
				error.response.status === 400 &&
				error.response.error &&
				error.response.error.type === "resource_already_exists_exception"
			) {
				return;
			}
			throw error;
		}
	}

	async function dropIndex(collection) {
		try {
			return await axios.delete(`${config.host}/${collection}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				return;
			}
			throw error;
		}
	}

	async function deleteItem(collection, id) {
		try {
			return await axios.delete(
				`${config.host}/${collection}/_doc/${id}`,
				axiosConfig
			);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				return;
			}
			throw error;
		}
	}

	async function updateItem(collection, id, data) {
		return await axios.post(
			`${config.host}/${collection}/_doc/${id}`,
			data,
			axiosConfig
		);
	}
};
