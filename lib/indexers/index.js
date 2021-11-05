/**
 * @typedef {(config: IndexerConfig) => {
 *   createIndex: (collection: string) => Promise<void>,
 *   deleteItems: (collection: string) => Promise<void>,
 *   deleteItem: (collection: string, id: string) => Promise<void>,
 *   updateItem: (collection: string, id: string, data: object, pk: ?string) => Promise<void>,
 * }} IndexerInterface
 *
 * @typedef {{
 * 	appId?: string,
 * 	key?: string,
 * 	host?: string,
 * 	headers?: Record<string, string>
 * }} IndexerConfig
 */

/**
 * @type {Record<string, IndexerInterface>}
 */
module.exports = {
	algolia: require('./algolia'),
	meilisearch: require('./meilisearch'),
	elasticsearch: require('./elasticsearch'),
	elasticsearch_legacy: require('./elasticsearch-legacy.js'),
};
