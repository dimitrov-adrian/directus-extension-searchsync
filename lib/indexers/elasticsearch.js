const { URL } = require('url');
const https = require('https');

/**
 * @type {import("axios").AxiosInstance}
 */
const axios = require('axios');

/**
 * @type {import("../../types.js").IndexerInterface}
 */
module.exports = function elasticsearch(config) {

	const axiosConfig = {
		headers: {
			'Content-Type': 'application/json',
			...(config.headers || {}),
		}
	};

	if(config.username && config.password) {
		axiosConfig.auth = {
			username: config.username,
			password: config.password
		}
	}

	if(config.ignore_cert) {
		const agent = new https.Agent({  
			rejectUnauthorized: false
		});
	
		axiosConfig.httpsAgent = agent;
	}

	if (!config.host) {
		throw Error('No HOST set. The server.host is mandatory.');
	}

	const host = new URL(config.host);
	if (!host.hostname || !host.pathname || host.pathname !== '/') {
		throw Error('Invalid server.host, it must be like http://ee.example.com and without path for index');
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
			await axios.post(
				`${config.host}/${collection}/_delete_by_query`,
				{
					query: {
						match_all: {},
					},
				},
				axiosConfig
			);
		} catch (error) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	async function deleteItem(collection, id) {
		try {
			await axios.delete(`${config.host}/${collection}/_doc/${id}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;

			throw error;
		}
	}

	async function updateItem(collection, id, data) {
		try {
			await axios.post(`${config.host}/${collection}/_doc/${id}`, data, axiosConfig);
		} catch (error) {
			if (error.response) {
				throw { message: error.toString(), response: error.response };
			}

			throw error;
		}
	}
};
