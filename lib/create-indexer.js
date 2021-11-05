const striptags = require('striptags');
const { flattenObject, objectMap } = require('./utils.js');
const availableIndexers = require('./indexers/index.js');

module.exports = createIndexer;

function createIndexer(config, { logger, database, services, getSchema }) {
	if (!config.server.type || !availableIndexers[config.server.type]) {
		throw Error(
			`directus-extension-searchsync: Broken config file. Missing or invalid type "${extensionConfig.server.type}".`
		);
	}

	const indexer = availableIndexers[config.server.type](config.server);

	return {
		createCollectionIndex,
		initCollectionIndexes,
		reindexCollection,
		deleteItemIndex,
		updateItemIndex,
		getItemObject,
		getCollectionIndexName,
	};

	async function createCollectionIndex(collection) {
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.createIndex(collectionIndex);
		} catch (error) {
			logger.warn(
				`directus-extension-searchsync: Cannot create collection ${collectionIndex}.`,
				getErrorMessage(error)
			);
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
		const schema = await getSchema();
		const query = new services.ItemsService(collection, { database, schema });

		if (!schema.collections[collection]) {
			logger.warn(`directus-extension-searchsync: Collection ${collection} does not exists`);
			return;
		}

		try {
			await indexer.deleteItems(getCollectionIndexName(collection));
		} catch (error) {
			logger.warn(`directus-extension-searchsync: Cannot drop collection ${collection}. ${error.toString()}`);
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
			logger.warn(`directus-extension-searchsync: Cannot delete ${collectionIndex}/${id}.`, getErrorMessage(error));
			logger.debug(error);
		}
	}

	async function updateItemIndex(collection, id, schema) {
		const body = await getItemObject(collection, id, schema);
		const collectionIndex = getCollectionIndexName(collection);
		try {
			if (body) {
				await indexer.updateItem(collectionIndex, id, body, schema.collections[collection].primary);
			} else {
				await indexer.deleteItem(collectionIndex, id);
			}
		} catch (error) {
			logger.warn(`directus-extension-searchsync: Cannot index ${collectionIndex}/${id}.`, getErrorMessage(error));
			logger.debug(error);
		}
	}

	async function getItemObject(collection, id, schema) {
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
