const { join, dirname } = require('path');
const { existsSync } = require('fs');
const createIndexer = require('./create-indexer.js');

module.exports = registerHook;

function registerHook({ action, init }, { services, env, database, logger, getSchema }) {
	const extensionConfig = readConfig(getConfigFile(), {
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

	const indexer = createIndexer(extensionConfig, { services, database, logger, getSchema });

	init('server.start', () => {
		if (!extensionConfig.reindexOnStart) return;

		return indexer.initCollectionIndexes();
	});

	init('cli.before', ({ program }) => {
		const usersCommand = program.command('extension:searchsync');
		usersCommand
			.command('index')
			.description('directus-extension-searchsync: (Re)Index documents from all collections')
			.action(initCollectionIndexesCommand);
	});

	action('items.create', (data) => {
		indexer.updateItemIndex(prepareHookData(data));
	});

	action('items.update', (data) => {
		indexer.updateItemIndex(prepareHookData(data));
	});

	action('items.delete', (data) => {
		indexer.deleteItemIndex(prepareHookData(data));
	});

	function prepareHookData(input) {
		if (!extensionConfig.collections[input.collection]) return;

		const items = Array.isArray(input.item) ? input.item : [input.item];

		return {
			collection: input.collection,
			schema: input.schema,
			items,
		};
	}

	async function initCollectionIndexesCommand() {
		try {
			await indexer.initCollectionIndexes();
			process.exit(0);
		} catch (error) {
			logger.error(error.toString());
			process.exit(1);
		}
	}

	function readConfig(configFile, deps) {
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
}
