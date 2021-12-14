const striptags = require('striptags');
const { flattenObject, objectMap, filteredObject } = require('./utils.js');
const availableIndexers = require('./indexers/index.js');

module.exports = createIndexer;

/**
 * @param {import('../types.js').ExtensionConfig} config
 * @param {any} context
 */
function createIndexer(config, { logger, database, services, getSchema }) {
	if (!config.server.type || !availableIndexers[config.server.type]) {
		throw Error(`Broken config file. Missing or invalid indexer type "${config.server.type || 'Unknown'}".`);
	}

	const indexer = availableIndexers[config.server.type](config.server);

	return {
		ensureCollectionIndex,
		initCollectionIndexes,

		initItemsIndex,
		updateItemIndex,
		deleteItemIndex,

		getCollectionIndexName,
	};

	/**
	 * @param {string} collection
	 */
	async function ensureCollectionIndex(collection) {
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.createIndex(collectionIndex);
		} catch (error) {
			logger.warn(`Cannot create collection "${collectionIndex}". ${getErrorMessage(error)}`);
			logger.debug(error);
		}
	}

	async function initCollectionIndexes() {
		for (const collection of Object.keys(config.collections)) {
			await ensureCollectionIndex(collection);
			await initItemsIndex(collection);
		}
	}

	/**
	 * @param {string} collection
	 */
	async function initItemsIndex(collection) {
		const schema = await getSchema();

		if (!schema.collections[collection]) {
			logger.warn(`Collection "${collection}" does not exists.`);
			return;
		}

		const query = new services.ItemsService(collection, { database, schema });

		try {
			await indexer.deleteItems(getCollectionIndexName(collection));
		} catch (error) {
			logger.warn(`Cannot drop collection "${collection}". ${getErrorMessage(error)}`);
			logger.debug(error);
		}

		const pk = schema.collections[collection].primary;
		const limit = config.batchLimit || 100;

		for (let offset = 0; ; offset += limit) {
			const items = await query.readByQuery({
				fields: [pk],
				filter: config.collections[collection].filter || [],
				limit,
				offset,
			});

			if (!items || !items.length) break;

			await updateItemIndex(
				collection,
				items.map((/** @type {{ [x: string]: any; }} */ i) => i[pk])
			);
		}
	}

	/**
	 * @param {string} collection
	 * @param {string[]} ids
	 */
	async function deleteItemIndex(collection, ids) {
		const collectionIndex = getCollectionIndexName(collection);
		for (const id of ids) {
			try {
				await indexer.deleteItem(collectionIndex, id);
			} catch (error) {
				logger.warn(`Cannot delete "${collectionIndex}/${id}". ${getErrorMessage(error)}`);
				logger.debug(error);
			}
		}
	}

	/**
	 * @param {string} collection
	 * @param {string[]} ids
	 */
	async function updateItemIndex(collection, ids) {
		const schema = await getSchema();

		const collectionIndex = getCollectionIndexName(collection);

		const query = new services.ItemsService(collection, {
			knex: database,
			schema: schema,
		});

		const pk = schema.collections[collection].primary;

		const items = await query.readMany(ids, {
			fields: config.collections[collection].fields ? [pk, ...config.collections[collection].fields] : ['*'],
			filter: config.collections[collection].filter || [],
		});

		/**
		 * @type {string[]}
		 */
		const processedIds = [];

		for (const item of items) {
			const id = item[pk];

			try {
				await indexer.updateItem(collectionIndex, id, prepareObject(item, collection), pk);

				processedIds.push(id);
			} catch (error) {
				logger.warn(`Cannot index "${collectionIndex}/${id}". ${getErrorMessage(error)}`);
				logger.debug(error);
			}
		}

		if (items.length < ids.length) {
			for (const id of ids.filter((x) => !processedIds.includes(x))) {
				try {
					await indexer.deleteItem(collectionIndex, id);
				} catch (error) {
					logger.warn(`Cannot index "${collectionIndex}/${id}". ${getErrorMessage(error)}`);
					logger.debug(error);
				}
			}
		}
	}

	/**
	 * @param {object} body
	 * @param {string} collection
	 */
	function prepareObject(body, collection) {
		const meta = {};

		if (config.collections[collection].collectionField) {
			// @ts-ignore
			meta[config.collections[collection].collectionField] = collection;
		}

		if (config.collections[collection].transform) {
			return {
				// @ts-ignore
				...config.collections[collection].transform(
					body,
					{
						striptags,
						flattenObject,
						objectMap,
						filteredObject,
					},
					collection
				),
				...meta,
			};
		} else if (config.collections[collection].fields) {
			return {
				...filteredObject(body, config.collections[collection].fields),
				...meta,
			};
		}

		return {
			...body,
			...meta,
		};
	}

	/**
	 * @param {string} collection
	 * @returns {string}
	 */
	function getCollectionIndexName(collection) {
		return config.collections[collection].indexName || collection;
	}

	/**
	 * @param {any} error
	 * @returns {string}
	 */
	function getErrorMessage(error) {
		if (error && error.message) return error.message;

		if (error && error.response && error.response.data && error.response.data.error) return error.response.data.error;

		return error.toString();
	}
}
