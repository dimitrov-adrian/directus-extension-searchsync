/**
 * @typedef {(config: object) => {
 *   createIndex: (collection: string) => Promise,
 *   deleteItems: (collection: string) => Promise,
 *   deleteItem: (collection: string, id: string) => Promise,
 *   updateItem: (collection: string, id: string, data: object, pk: ?string) => Promise,
 * }} IndexerInterface
 */

/**
 * @type {Record<string, IndexerInterface>}
 */
module.exports = {
	algolia: require("./algolia"),
	elasticsearch: require("./elasticsearch"),
	meilisearch: require("./meilisearch"),
};
