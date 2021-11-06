const { dirname } = require('path');
const { existsSync } = require('fs');
const { cosmiconfigSync } = require('cosmiconfig');
const createIndexer = require('./create-indexer.js');

module.exports = registerHook;

function registerHook({ action, init }, { services, env, database, logger, getSchema }) {
	const extensionConfig = loadConfig();
	validateConfig(extensionConfig);

	const indexer = createIndexer(extensionConfig, {
		services,
		database,
		logger: logger.child({ extension: 'directus-extension-searchsync' }),
		getSchema,
	});

	init('server.start', () => {
		if (!extensionConfig.reindexOnStart) return;

		return indexer.initCollectionIndexes();
	});

	init('cli.before', ({ program }) => {
		const usersCommand = program.command('extension:searchsync');
		usersCommand
			.command('index')
			.description(
				'directus-extension-searchsync: Push all documents from all collections, that are setup in extension configuration'
			)
			.action(initCollectionIndexesCommand);
	});

	action('items.create', async (data) => {
		indexer.updateItemIndex(data.collection, [data.key]);
	});

	action('items.update', async (data) => {
		indexer.updateItemIndex(data.collection, data.keys);
	});

	action('items.delete', (data) => {
		indexer.deleteItemIndex(data.collection, data.payload);
	});

	// function prepareHookData(input) {
	// 	if (!extensionConfig.collections[input.collection]) return;

	// 	const items = Array.isArray(input.item) ? input.item : [input.item];

	// 	return {
	// 		collection: input.collection,
	// 		schema: input.schema,
	// 		items,
	// 	};
	// }

	async function initCollectionIndexesCommand() {
		try {
			await indexer.initCollectionIndexes();
			process.exit(0);
		} catch (error) {
			logger.error(error.toString());
			process.exit(1);
		}
	}

	function loadConfig() {
		const cosmiconfig = cosmiconfigSync('searchsync', {
			stopDir: dirname(env.CONFIG_PATH),
		});

		if (env.EXTENSION_SEARCHSYNC_CONFIG_PATH) {
			if (!existsSync(env.EXTENSION_SEARCHSYNC_CONFIG_PATH)) {
				throw Error(
					`EXTENSION_SEARCHSYNC_CONFIG_PATH env is set, but file "${env.EXTENSION_SEARCHSYNC_CONFIG_PATH}" does not exists.`
				);
			}

			return cosmiconfig.load(env.EXTENSION_SEARCHSYNC_CONFIG_PATH).config;
		}

		return cosmiconfig.search(dirname(env.CONFIG_PATH)).config;
	}

	/**
	 * @param {object} config
	 */
	function validateConfig(config) {
		if (!config.collections) {
			throw Error('Broken config file. Missing "collections" section.');
		}

		if (!config.server) {
			throw Error('Broken config file. Missing "server" section.');
		}
	}
}
