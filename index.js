const { join, dirname } = require("path");
const { existsSync } = require("fs");
const striptags = require("striptags");
const { flattenObject, objectMap } = require("./utils");
const availableIndexers = require("./indexers");

module.exports = function registerHook({ services, env, database, getSchema }) {
	const extensionConfig = getConfig(getConfigFile(), {
		services,
		env,
		database,
		getSchema,
	});

	if (!extensionConfig.collections) {
		throw Error(
			'SEARCHSYNC: Broken config file. Missing "collections" section.'
		);
	}

	if (!extensionConfig.server) {
		throw Error('SEARCHSYNC: Broken config file. Missing "server" section.');
	}

	const indexer = availableIndexers[extensionConfig.server.type](
		extensionConfig.server
	);

	return {
		"server.start": initCollectionIndexes,
		"items.create": hookItemEventHandler.bind(null, updateItemIndex),
		"items.update": hookItemEventHandler.bind(null, updateItemIndex),
		"items.delete": hookItemEventHandler.bind(null, deleteItemIndex),
	};

	async function initCollectionIndexes() {
		for (const collection of Object.keys(extensionConfig.collections)) {
			if (extensionConfig.reindexOnStart) {
				try {
					await indexer.dropIndex(collection);
				} catch (error) {
					errorLog({ action: "DROP", collection, error });
				}

				if (createCollectionIndex(collection)) {
					reindexCollection(collection);
				}
			} else {
				createCollectionIndex(collection);
			}
		}
	}

	async function createCollectionIndex(collection) {
		try {
			await indexer.createIndex(collection);
		} catch (error) {
			errorLog({ action: "CREATE", collection, error });
			return false;
		}
		return true;
	}

	async function reindexCollection(collection) {
		const schema = await getSchema();
		const query = new services.ItemsService(collection, { database, schema });
		if (!schema.collections[collection]) {
			errorLog({
				action: "INDEX",
				collection,
				error: "Collection does not exists",
			});
			return;
		}
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
			await indexer.deleteItem(collection, id);
		} catch (error) {
			errorLog({ action: "DELETE", collection, id, error });
		}
	}

	async function updateItemIndex(collection, id, schema) {
		const body = await getItemObject(collection, id, schema);
		try {
			if (body) {
				await indexer.updateItem(
					collection,
					id,
					body,
					schema.collections[collection].primary
				);
			} else {
				await indexer.deleteItem(collection, id);
			}
		} catch (error) {
			errorLog({ action: "UPDATE", collection, id, error });
		}
	}

	async function getItemObject(collection, id, schema) {
		const query = new services.ItemsService(collection, {
			knex: database,
			schema: schema,
		});

		const data = await query.readByKey(id, {
			fields: extensionConfig.collections[collection].fields,
			filter: extensionConfig.collections[collection].filter || [],
		});

		if (extensionConfig.collections[collection].transform) {
			return extensionConfig.collections[collection].transform(data, {
				striptags,
				flattenObject,
				objectMap,
			});
		}

		return data;
	}

	function hookItemEventHandler(callback, input) {
		if (!extensionConfig.collections[input.collection]) return;
		const items = Array.isArray(input.item) ? input.item : [input.item];
		for (const item of items) {
			callback(input.collection, item, input.schema);
		}
	}

	function getConfig(configFile, deps) {
		const config = require(configFile);
		if (typeof config === "function") return config(deps);
		return config;
	}

	function getConfigFile() {
		if (env.EXTENSION_SEARCHSYNC_CONFIG_PATH) {
			if (!existsSync(env.EXTENSION_SEARCHSYNC_CONFIG_PATH)) {
				throw Error(
					`SEARCHSYNC: ENV EXTENSION_SEARCHSYNC_CONFIG_PATH is set but file ${env.EXTENSION_SEARCHSYNC_CONFIG_PATH} does not exists.`
				);
			}
			return env.EXTENSION_SEARCHSYNC_CONFIG_PATH;
		}

		const configPath = dirname(env.CONFIG_PATH);

		if (existsSync(join(configPath, "searchsync.config.json"))) {
			return join(configPath, "searchsync.config.json");
		}

		if (existsSync(join(configPath, "searchsync.config.js"))) {
			return join(configPath, "searchsync.config.js");
		}

		throw Error(
			`SEARCHSYNC: Configuration file does not exists in ${configPath}/searchsync.config.<json|js>`
		);
	}

	function errorLog(log) {
		if (extensionConfig.logger === false) return;

		if (extensionConfig.logger && "error" in extensionConfig.logger) {
			extensionConfig.logger.error("SEARCHSYNC", log);
		} else {
			console.error("SEARCHSYNC", log);
		}
	}
};
