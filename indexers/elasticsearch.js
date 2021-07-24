const axios = require("axios");

/**
 * @type {import("./index.js").IndexerInterface}
 */
module.exports = function elasticsearch(config) {
	const axiosConfig = {
		headers: {
			"Content-Type": "application/json",
			...(config.headers || {}),
		},
	};

	if (!config.host) {
		throw Error(
			"directus-extension-searchsync: No HOST set. The server.host is mandatory."
		);
	}

	const host = new URL(config.host);
	if (!host.hostname || !host.pathname || host.pathname === "/") {
		throw Error(
			"directus-extension-searchsync: Invalid server.host, it must be like http://ee.example.com/indexname"
		);
	}

	return {
		createIndex,
		dropIndex,
		deleteItem,
		updateItem,
	};

	async function createIndex(collection) {}

	async function dropIndex(collection) {
		try {
			return await axios.post(`${config.host}/${collection}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;
			throw error;
		}
	}

	async function deleteItem(collection, id) {
		try {
			return await axios.delete(
				`${config.host}/${collection}/${id}`,
				axiosConfig
			);
		} catch (error) {
			if (error.response && error.response.status === 404) return;
			throw error;
		}
	}

	async function updateItem(collection, id, data) {
		return await axios.post(
			`${config.host}/${collection}/${id}`,
			data,
			axiosConfig
		);
	}
};
