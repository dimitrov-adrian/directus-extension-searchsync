module.exports = function registerHook({services, env, database}) {

	const {schemaInspector} = require(env.DIRECTUS_DEV
			? require.main.path + '/../dist/database'
			: 'directus/dist/database');

	const extensionConfig = require(
			env.EXTENSION_SEARCHSYNC_CONFIG || './config.json');

	if (!('collections' in extensionConfig)) {
		throw Error('Broken config file. Missing "collections" section.');
	}

	if (!('server' in extensionConfig)) {
		throw Error('Broken config file. Missing "server" section.');
	}

	const indexer = require(`./indexers/${extensionConfig.server.type}`)(
			extensionConfig.server);

	return {
		'server.start': initCollectionIndexes,
		'items.create': hookEventHandler.bind(null, updateItemIndex),
		'items.update': hookEventHandler.bind(null, updateItemIndex),
		'items.delete': hookEventHandler.bind(null, deleteItemIndex),
	};

	async function initCollectionIndexes()
	{
		for (const collection of Object.keys(extensionConfig.collections)) {
			if (extensionConfig.reindexOnStart) {
				await indexer.dropIndex(collection);
				await indexer.createIndex(collection);
				reindexCollection(collection);
			} else {
				indexer.createIndex(collection);
			}
		}
	}

	async function reindexCollection(collection)
	{
		const schema = await schemaInspector.overview();
		const query = new services.ItemsService(collection, {database, schema});
		const pk = schema[collection].primary;
		const items = await query.readByQuery({
			fields: [pk],
			filter: extensionConfig.collections[collection].filter || [],
		});
		for (const item of items) {
			const body = await getItemObject(collection, item[pk], schema);
			indexer.updateItem(collection, item[pk], body, pk);
		}
	}

	async function deleteItemIndex(collection, id)
	{
		indexer.deleteItem(collection, id);
	}

	async function updateItemIndex(collection, id, schema)
	{
		const body = getItemObject(collection, id, schema);
		if (body) {
			indexer.updateItem(collection, id, body);
		} else {
			indexer.deleteItem(collection, id);
		}
	}

	async function getItemObject(collection, id, schema)
	{
		const query = new services.ItemsService(
				collection, {knex: database, schema: schema});
		return await query.readByKey(id, {
			fields: extensionConfig.collections[collection].fields,
			filter: extensionConfig.collections[collection].filter || [],
		});
	}

	function hookEventHandler(callback, input)
	{
		if (!(input.collection in extensionConfig.collections)) {
			return;
		}
		const items = (Array.isArray(input.item)
				? input.item
				: [input.item]);
		for (const item of items) {
			callback(input.collection, item, input.schema);
		}
	}

};

