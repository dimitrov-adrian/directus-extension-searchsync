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
						console.warn("directus-extension-searchsync", ...args);
					},
					error: (...args) => {
						console.error("directus-extension-searchsync", ...args);
					},
					debug: (...args) => {
						if (env.LOG_LEVEL !== "debug" && env.LOG_LEVEL !== "trace") return;
						console.error("directus-extension-searchsync", ...args);
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
				try {
					await indexer.deleteItems(collection);
				} catch (error) {
					logger.warn(
						`Cannot drop collection ${collection}. ${error.toString()}`
					);
					logger.debug(error);
				}

				if (await createCollectionIndex(collection)) {
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
			logger.error(
				`Cannot create collection ${collection}. ${error.toString()}`
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
		try {
			await indexer.deleteItem(collection, id);
		} catch (error) {
			logger.warn(`Cannot delete ${collection}/${id}`);
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
			logger.warn(`Cannot update ${collection}/${id}. ${error.toString()}`);
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
