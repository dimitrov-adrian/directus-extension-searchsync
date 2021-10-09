import axios from 'axios';

export default function elasticsearch(config) {
	const axiosConfig = {
		headers: {
			'Content-Type': 'application/json',
			...(config.headers || {}),
		},
	};

	if (!config.host) {
		throw Error('directus-extension-searchsync: No HOST set. The server.host is mandatory.');
	}

	const host = new URL(config.host);
	if (!host.hostname || !host.pathname || host.pathname !== '/') {
		throw Error(
			'directus-extension-searchsync: Invalid server.host, it must be like http://ee.example.com and without path for index'
		);
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
			return await axios.post(
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
			return await axios.delete(`${config.host}/${collection}/_doc/${id}`, axiosConfig);
		} catch (error) {
			if (error.response && error.response.status === 404) return;
			throw error;
		}
	}

	async function updateItem(collection, id, data) {
		try {
			return await axios.post(`${config.host}/${collection}/_doc/${id}`, data, axiosConfig);
		} catch (error) {
			if (error.response) {
				throw { message: error.toString(), response: error.response };
			}
			throw error;
		}
	}
}
