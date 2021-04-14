# Simple search engine indexer

> ### This extension is in development and could have breaking changes until Directus 9 official releases.

## Supported engines

- MeiliSearch
- ElasticSearch
- Algolia

## Configuration

Default configuration file should be placed under the same directory like the Directus `.env` file with name `searchsync.config.js` or `searchsync.config.js` or could be given by `EXTENSION_SEARCHSYNC_CONFIG_PATH` variable

On docker cotainer it's by default under `/directus` directory.

### Environment variables

- `EXTENSION_SEARCHSYNC_CONFIG_PATH` A .js or .json file path with extension configuration to use, if not set, then extension will look in `CONFIG_PATH` where Directus .env file is placed.

### References

- `server` holds configuration for the search engine
- `reindexOnStart` boolean causing to reindex all documents upon Directus starts
- `collections` object that contain definition of how to index items
- `collections.*.filter` the filter query in format like Directus on which item must match to be indexed (check [Filter Rules
  ](https://docs.directus.io/reference/filter-rules/#filter-rules))
- `collections.*.fields` array of fields that will be indexed in Directus format
- `collections.*.transform` (Could be defined only if config file is .js) a callback to return transformed/formatted data for indexing.

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

// Or functional way
module.exports = ({ services, env, database, getSchema }) => {
	return {
		// ...
	};
};
```

##### Collection transformation callback description

```javascript
/**
 * @param {Object} item
 * @param {{striptags, flattenObject, objectMap}} utils
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
	"host": "http://search:9200/projectindex"
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
