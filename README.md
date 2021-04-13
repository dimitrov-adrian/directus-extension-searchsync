# Simple search engine indexer

### Supported engines

- MeiliSearch
- ElasticSearch
- Algolia

### Environment variables

- `EXTENSION_SEARCHSYNC_CONFIG` to `json` or `js` configuration file. If not specified, then
  will lookup on same directory like `.env` file

### Example `searchsync.config.json`

```json
{
	"server": {
		"type": "meilisearch",
		"host": "http://search:7700",
		"key": "the-private-key"
	},
	"reindexOnStart": true,
	"collections": {
		"products": {
			"filter": {
				"status": "published",
				"stock": "inStock"
			},
			"fields": [
				"title",
				"image.id",
				"category.title",
				"brand.title",
				"tags",
				"description",
				"price",
				"rating"
			]
		},
		"blog_posts": {
			"filter": {
				"status": "published"
			},
			"fields": ["title", "teaser", "body", "thumbnail.id"]
		}
	}
}
```

### Example `searchsync.config.js`

```javascript
module.exports = {
	server: {
		type: "meilisearch",
		host: "http://search:7700",
		key: "the-private-key",
	},
	reindexOnStart: true,
	collections: {
		pages: {
			filter: {
				status: "published",
			},
			fields: ["title", "teaser", "body", "thumbnail.id"],
			transform: (item, { flattenObject, striptags }) => {
				item = flattenObject(item);
				item.body = striptags(item.body);
				return item;
			},
		},
	},
};
```

### References

- `server` holds configuration for the search engine
- `reindexOnStart` boolean causing to reindex all documents upon directus starts
- `collections` object that contain definition of how to index items
- `collections.*.filter` the filter query in format like directus on which item must match to be indexed
- `collections.*.fields` array of fields that will be indexed in directus format
- `collections.*.transform` (Applied on js files only) a callback to return transformed/formatted data for indexing.

Collection transformation callback

```javascript
/**
 * @param {Object} item
 * @param {{striptags, flattenObject, objectMap}} tools
 * @returns {Object}
 */
function (item, { striptags, flattenObject, objectMap }) {
	return item
}
```

##### Meilisearch server config

```json
{
	"type": "meilisearch",
	"host": "http://search:7700",
	"key": "the-private-key"
}
```

##### ElasticSearch server config

```json
{
	"type": "elasticsearch",
	"host": "http://search:9200",
	"key": "the-api-key"
}
```

##### Algolia server config

```json
{
	"type": "algolia",
	"appId": "Application-Id",
	"key": "secret-api-key"
}
```
