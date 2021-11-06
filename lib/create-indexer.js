const striptags = require('striptags');
const { flattenObject, objectMap } = require('./utils.js');
const availableIndexers = require('./indexers/index.js');

module.exports = createIndexer;

/**
 * @param {{
 * 	server: import('./indexers/index.js').IndexerConfig,
 * 	collections: Record<string, object>
 * }} config
 * @param {{
 * 	logger: import('pino').BaseLogger,
 * 	database: () => {},
 * 	services: () => {},
 * 	getSchema: () => {},
 * }} _
 */
function createIndexer(config, { logger, database, services, getSchema }) {
	if (!config.server.type || !availableIndexers[config.server.type]) {
		throw Error(`Broken config file. Missing or invalid indexer type "${config.server.type}".`);
	}

	const indexer = availableIndexers[config.server.type](config.server);

	const schema = getSchema();

	return {
		createCollectionIndex,
		initCollectionIndexes,
		reindexCollection,

		updateItemIndex,
		deleteItemIndex,
		getItemObject,

		getCollectionIndexName,
	};

	async function createCollectionIndex(collection) {
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.createIndex(collectionIndex);
		} catch (error) {
			logger.warn(`Cannot create collection "${collectionIndex}".`, getErrorMessage(error));
			logger.debug(error);
			return false;
		}

		return true;
	}

	async function initCollectionIndexes() {
		for (const collection of Object.keys(config.collections)) {
			await reindexCollection(collection);
		}

		return true;
	}

	async function reindexCollection(collection) {
		const query = new services.ItemsService(collection, { database, schema });

		if (!schema.collections[collection]) {
			logger.warn(`Collection "${collection}" does not exists`);
			return;
		}

		try {
			await indexer.deleteItems(getCollectionIndexName(collection));
		} catch (error) {
			logger.warn(`Cannot drop collection "${collection}". ${error.toString()}`);
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

			for (const item of items) {
				await updateItemIndex(collection, item[pk], schema);
			}
		}
	}

	async function deleteItemIndex(collection, id) {
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.deleteItem(collectionIndex, id);
		} catch (error) {
			logger.warn(`Cannot delete "${collectionIndex}/${id}".`, getErrorMessage(error));
			logger.debug(error);
		}
	}

	async function updateItemIndex(collection, id) {
		const body = await getItemObject(collection, id, schema);
		const collectionIndex = getCollectionIndexName(collection);
		try {
			if (body) {
				await indexer.updateItem(collectionIndex, id, body, schema.collections[collection].primary);
			} else {
				await indexer.deleteItem(collectionIndex, id);
			}
		} catch (error) {
			logger.warn(`Cannot index "${collectionIndex}/${id}".`, getErrorMessage(error));
			logger.debug(error);
		}
	}

	async function getItemObject(collection, id) {
		const query = new services.ItemsService(collection, {
			knex: database,
			schema: schema,
		});

		const data = await query.readOne(id, {
			fields: config.collections[collection].fields || ['*'],
			filter: config.collections[collection].filter || [],
		});

		if (config.collections[collection].collectionField) {
			data[config.collections[collection].collectionField] = collection;
		}

		if (config.collections[collection].transform) {
			return config.collections[collection].transform(
				data,
				{
					striptags,
					flattenObject,
					objectMap,
				},
				collection
			);
		}

		return data;
	}

	function getCollectionIndexName(collection) {
		return config.collections[collection].indexName || collection;
	}

	function getErrorMessage(error) {
		if (error && error.response && error.response.data && error.response.data.error) return error.response.data.error;

		return error.toString();
	}
}
