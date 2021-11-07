const { dirname } = require('path');
const { existsSync } = require('fs');
const { cosmiconfigSync } = require('cosmiconfig');
const createIndexer = require('./create-indexer.js');

module.exports = registerHook;

/**
 * @type {import('@directus/shared/types').HookConfig}
 */
function registerHook({ action, init }, { services, env, database, logger, getSchema }) {
	const extensionConfig = loadConfig();
	validateConfig(extensionConfig);

	const indexer = createIndexer(extensionConfig, {
		services,
		database,
		logger: logger.child({ extension: 'directus-extension-searchsync' }),
		getSchema,
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

	action('server.start', () => {
		if (!extensionConfig.reindexOnStart) return;
		indexer.initCollectionIndexes();
	});

	action('items.create', ({ collection, key }) => {
		indexer.updateItemIndex(collection, [key]);
	});

	action('items.update', ({ collection, keys }) => {
		indexer.updateItemIndex(collection, keys);
	});

	action('items.delete', ({ collection, payload }) => {
		indexer.deleteItemIndex(collection, payload);
	});

	async function initCollectionIndexesCommand() {
		try {
			await indexer.initCollectionIndexes();
			process.exit(0);
		} catch (error) {
			logger.error(error);
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

			// @ts-ignore
			return cosmiconfig.load(env.EXTENSION_SEARCHSYNC_CONFIG_PATH).config;
		}

		// @ts-ignore
		return cosmiconfig.search(dirname(env.CONFIG_PATH)).config;
	}

	/**
	 * @param {any} config
	 */
	function validateConfig(config) {
		if (typeof config !== 'object') {
			throw Error('Broken config file. Configuration is not an object.');
		}

		if (!config.collections) {
			throw Error('Broken config file. Missing "collections" section.');
		}

		if (!config.server) {
			throw Error('Broken config file. Missing "server" section.');
		}
	}
}
