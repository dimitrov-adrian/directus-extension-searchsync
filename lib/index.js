import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import striptags from 'striptags';
import { flattenObject, objectMap } from './utils.js';
import * as availableIndexers from './indexers/index.js';

export default function registerHook({ services, env, database, getSchema, logger }) {
	const extensionConfig = getConfig(getConfigFile(), {
		services,
		env,
		database,
		getSchema,
	});

	if (!extensionConfig.collections) {
		throw Error('directus-extension-searchsync: Broken config file. Missing "collections" section.');
	}

	if (!extensionConfig.server) {
		throw Error('directus-extension-searchsync: Broken config file. Missing "server" section.');
	}

	if (!extensionConfig.server.type || !availableIndexers[extensionConfig.server.type]) {
		throw Error(
			`directus-extension-searchsync: Broken config file. Missing or invalid type "${extensionConfig.server.type}".`
		);
	}

	const indexer = availableIndexers[extensionConfig.server.type](extensionConfig.server);

	const verbose = env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace';

	const hooks = {
		'cli.init.before': registerCli,
		'server.start': onServerStart,
		'items.create': hookItemEventHandler.bind(null, updateItemIndex),
		'items.update': hookItemEventHandler.bind(null, updateItemIndex),
		'items.delete': hookItemEventHandler.bind(null, deleteItemIndex),
	};

	return hooks;

	function registerCli({ program }) {
		const usersCommand = program.command('extension:searchsync');
		usersCommand
			.command('index')
			.description('directus-extension-searchsync: Reindex documents from all collections')
			.action(initCollectionIndexesCommand);
	}

	async function onServerStart() {
		if (!extensionConfig.reindexOnStart) return;
		await initCollectionIndexes();
	}

	async function initCollectionIndexesCommand() {
		try {
			await initCollectionIndexes();
			process.exit(0);
		} catch (error) {
			logger.error(error.toString());
			process.exit(1);
		}
	}

	async function createCollectionIndex(collection) {
		const collectionIndex = getCollectionIndexName(collection);
		try {
			await indexer.createIndex(collectionIndex);
		} catch (error) {
			logger.warn(
				`directus-extension-searchsync: Cannot create collection ${collectionIndex}.`,
				getErrorMessage(error)
			);
			if (verbose) logger.debug(error);
			return false;
		}
		return true;
	}

	async function initCollectionIndexes() {
		for (const collection of Object.keys(extensionConfig.collections)) {
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
			if (verbose) logger.debug(error);
		}

		const pk = schema.collections[collection].primary;
		const limit = extensionConfig.batchLimit || 100;

		for (let offset = 0; ; offset += limit) {
			const items = await query.readByQuery({
				fields: [pk],
				filter: extensionConfig.collections[collection].filter || [],
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
			if (verbose) logger.debug(error);
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
			if (verbose) logger.debug(error);
		}
	}

	async function getItemObject(collection, id, schema) {
		const query = new services.ItemsService(collection, {
			knex: database,
			schema: schema,
		});

		const data = await query.readOne(id, {
			fields: extensionConfig.collections[collection].fields || ['*'],
			filter: extensionConfig.collections[collection].filter || [],
		});

		if (extensionConfig.collections[collection].collectionField) {
			data[extensionConfig.collections[collection].collectionField] = collection;
		}

		if (extensionConfig.collections[collection].transform) {
			return extensionConfig.collections[collection].transform(
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

	function hookItemEventHandler(callback, input) {
		if (!extensionConfig.collections[input.collection]) return;
		const items = Array.isArray(input.item) ? input.item : [input.item];
		for (const item of items) {
			callback(input.collection, item, input.schema);
		}
	}

	function getCollectionIndexName(collection) {
		return extensionConfig.collections[collection].indexName || collection;
	}

	function getConfig(configFile, deps) {
		const config = require(configFile);
		if (typeof config === 'function') return config(deps);
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

		if (existsSync(join(configPath, 'searchsync.config.json'))) {
			return join(configPath, 'searchsync.config.json');
		}

		if (existsSync(join(configPath, 'searchsync.config.js'))) {
			return join(configPath, 'searchsync.config.js');
		}

		throw Error(
			`directus-extension-searchsync: Configuration file does not exists in ${configPath}/searchsync.config.<json|js>`
		);
	}

	function getErrorMessage(error) {
		if (error && error.response && error.response.data && error.response.data.error) return error.response.data.error;
		return error.toString();
	}
}
