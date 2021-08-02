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
			'directus-extension-searchsync: Broken config file. Missing "collections" section.'
		);
	}

	if (!extensionConfig.server) {
		throw Error(
			'directus-extension-searchsync: Broken config file. Missing "server" section.'
		);
	}

	const indexer = availableIndexers[extensionConfig.server.type](
		extensionConfig.server
	);

	const logger =
		typeof extensionConfig.logger === "object"
			? extensionConfig.logger
			: {
					warn: (...args) => {
						if (env.LOG_LEVEL === "fatal" && env.LOG_LEVEL === "error") return;
						console.warn("directus-extension-searchsync:", ...args);
					},
					error: (...args) => {
						console.error("directus-extension-searchsync:", ...args);
					},
					debug: (...args) => {
						if (env.LOG_LEVEL !== "debug" && env.LOG_LEVEL !== "trace") return;
						console.error("directus-extension-searchsync:", ...args);
					},
			  };

	return {
		"server.start": initCollectionIndexes,
		"items.create": hookItemEventHandler.bind(null, updateItemIndex),
		"items.update": hookItemEventHandler.bind(null, updateItemIndex),
		"items.delete": hookItemEventHandler.bind(null, deleteItemIndex),
	};

	async function initCollectionIndexes() {
		for (const collection of Object.keys(extensionConfig.collections)) {
			if (extensionConfig.reindexOnStart) {
				const collectionIndex = getCollectionIndexName(collection);
				try {
					await indexer.deleteItems(collectionIndex);
				} catch (error) {
					logger.warn(
						`Cannot drop collection ${collectionIndex}. ${error.toString()}`
					);
					logger.debug(error);
				}

				if (await createCollectionIndex(collection)) {
					await reindexCollection(collection);
				}
			} else {
				await createCollectionIndex(collection);
			}
		}
	}

	async function createCollectionIndex(collection) {
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.createIndex(collectionIndex);
		} catch (error) {
			logger.error(
				`Cannot create collection ${collectionIndex}. ${error.toString()}`
			);
			logger.debug(error);
			return false;
		}
		return true;
	}

	async function reindexCollection(collection) {
		const schema = await getSchema();
		const query = new services.ItemsService(collection, { database, schema });
		if (!schema.collections[collection]) {
			logger.warn(`Collection ${collection} does not exists`);
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
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.deleteItem(collectionIndex, id);
		} catch (error) {
			logger.warn(`Cannot delete ${collectionIndex}/${id}`);
		}
	}

	async function updateItemIndex(collection, id, schema) {
		const body = await getItemObject(collection, id, schema);
		const collectionIndex = getCollectionIndexName(collection);
		try {
			if (body) {
				await indexer.updateItem(
					collectionIndex,
					id,
					body,
					schema.collections[collection].primary
				);
			} else {
				await indexer.deleteItem(collectionIndex, id);
			}
		} catch (error) {
			logger.warn(
				`Cannot update ${collectionIndex}/${id}. ${error.toString()}`
			);
			logger.debug(error);
		}
	}

	async function getItemObject(collection, id, schema) {
		const query = new services.ItemsService(collection, {
			knex: database,
			schema: schema,
		});

		const data = await query.readOne(id, {
			fields: extensionConfig.collections[collection].fields || ["*"],
			filter: extensionConfig.collections[collection].filter || [],
		});

		if (extensionConfig.collectionField) {
			data[extensionConfig.collectionField] = collection;
		}

		if (extensionConfig.collections[collection].transform) {
			return extensionConfig.collections[collection].transform(data, {
				striptags,
				flattenObject,
				objectMap,
			});
		}

		return data;
	}

	function getCollectionIndexName(collection) {
		return extensionConfig.collections[collection].indexName || collection;
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
					`directus-extension-searchsync: ENV EXTENSION_SEARCHSYNC_CONFIG_PATH is set but file ${env.EXTENSION_SEARCHSYNC_CONFIG_PATH} does not exists.`
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
			`directus-extension-searchsync: Configuration file does not exists in ${configPath}/searchsync.config.<json|js>`
		);
	}
};
