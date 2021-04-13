const { flattenObject, objectMap } = require("./utils");
const striptags = require("striptags");

module.exports = function registerHook({ services, env, database, getSchema }) {
	const extensionConfig = require(env.EXTENSION_SEARCHSYNC_CONFIG ||
		"./config.json");

	if (!("collections" in extensionConfig)) {
		throw Error('Broken config file. Missing "collections" section.');
	}

	if (!("server" in extensionConfig)) {
		throw Error('Broken config file. Missing "server" section.');
	}

	const indexer = require(`./indexers/${extensionConfig.server.type}`)(
		extensionConfig.server
	);

	return {
		"server.start": initCollectionIndexes,
		"items.create": hookEventHandler.bind(null, updateItemIndex),
		"items.update": hookEventHandler.bind(null, updateItemIndex),
		"items.delete": hookEventHandler.bind(null, deleteItemIndex),
	};

	async function initCollectionIndexes() {
		for (const collection of Object.keys(extensionConfig.collections)) {
			if (extensionConfig.reindexOnStart) {
				try {
					await indexer.dropIndex(collection);
				} catch (error) {
					errorLog("DROP", collection, null, error);
				}

				try {
					await indexer.createIndex(collection);
				} catch (error) {
					errorLog("CREATE", collection, null, error);
					continue;
				}

				reindexCollection(collection);
			} else {
				try {
					await indexer.createIndex(collection);
				} catch (error) {
					errorLog("CREATE", collection, null, error);
					continue;
				}
			}
		}
	}

	async function reindexCollection(collection) {
		const schema = await getSchema();
		const query = new services.ItemsService(collection, { database, schema });
		const pk = schema.collections[collection].primary;
		const items = await query.readByQuery({
			fields: [pk],
			filter: extensionConfig.collections[collection].filter || [],
		});
		for (const item of items) {
			await updateItemIndex(collection, item[pk], schema);
		}
	}

	async function deleteItemIndex(collection, id) {
		try {
			indexer.deleteItem(collection, id);
		} catch (error) {
			errorLog("delete", collection, id, error);
		}
	}

	async function updateItemIndex(collection, id, schema) {
		const body = await getItemObject(collection, id, schema);
		try {
			if (body) {
				indexer.updateItem(
					collection,
					id,
					body,
					schema.collections[collection].primary
				);
			} else {
				indexer.deleteItem(collection, id);
			}
		} catch (error) {
			errorLog("update", collection, id, error);
		}
	}

	async function getItemObject(collection, id, schema) {
		const query = new services.ItemsService(collection, {
			knex: database,
			schema: schema,
		});

		let data = await query.readByKey(id, {
			fields: extensionConfig.collections[collection].fields,
			filter: extensionConfig.collections[collection].filter || [],
		});

		if (extensionConfig.collections[collection].flatten) {
			data = flattenObject(data);
		}

		if (extensionConfig.collections[collection].stripHtml) {
			data = objectMap(data, (value) =>
				typeof value === "string" ? striptags(value) : value
			);
		}

		return data;
	}

	function hookEventHandler(callback, input) {
		if (!(input.collection in extensionConfig.collections)) {
			return;
		}
		const items = Array.isArray(input.item) ? input.item : [input.item];
		for (const item of items) {
			callback(input.collection, item, input.schema);
		}
	}

	function errorLog(action, collection, id, error) {
		console.warn(
			"SEARCHSYNC",
			`Error when ${action} ${collection}/${id || ""}`,
			error ? "" : error.toString()
		);
	}
};
