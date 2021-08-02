# Simple search engine indexer

> ### This extension is in development and could have breaking changes until Directus 9 official releases.

## Supported engines

- MeiliSearch
- ElasticSearch
- Algolia

## How to install

### Install as a dependency in `package.json`

```json
{
	"dependencies": {
		"directus-extension-searchsync": "dimitrov-adrian/directus-extension-searchsync#v1.0.0-rc.85"
	}
}
```

Then do `npm install`

### Install as custom extension in `./extensions`

Simple quick install step, just copy and paste in your Directus project root directory.

```bash
# Go your directus extensions directory
cd hooks
curl -LO https://github.com/dimitrov-adrian/directus-extension-searchsync/archive/refs/heads/main.zip
unzip main.zip
cd directus-extension-searchsync-main
npm install
```

## Configuration

Default configuration file should be placed under the same directory like the Directus `.env` file with name `searchsync.config.js` or `searchsync.config.js` or could be given by `EXTENSION_SEARCHSYNC_CONFIG_PATH` variable

On docker cotainer it's by default under `/directus` directory.

### Environment variables

- `EXTENSION_SEARCHSYNC_CONFIG_PATH` A .js or .json file path with extension configuration to use, if not set, then extension will look in `CONFIG_PATH` where Directus .env file is placed.

### References

- `server: object` holds configuration for the search engine
- `reindexOnStart: boolean` boolean causing to reindex all documents upon Directus starts
- `collections: object` object that contain definition of how to index items
- `collections.*.filter: object` the filter query in format like Directus on which item must match to be indexed (check [Filter Rules
  ](https://docs.directus.io/reference/filter-rules/#filter-rules))
- `collections.*.fields: array<string>` array of fields that will be indexed in Directus format
- `collections.*.transform: function` (Could be defined only if config file is .js) a callback to return transformed/formatted data for indexing.
- `collections.*.indexName: string` force collection name when storing in search index
- `collectionField: string` if set, such field with value the collection name will be add to the indexed document

### Examples

#### `searchsync.config.json`

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

#### `searchsync.config.js`

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
				return {
					...flattenObject(item),
					body: striptags(item.body),
					someCustomValue: "Hello World!",
				};
			},
		},
	},
};

// Or functional way
module.exports = ({ env }) => {
	return {
		server: {
			// ...
		},
		collections: {
			// ...
		},
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

#### Search engines config references

##### Meilisearch

```json
{
	"type": "meilisearch",
	"host": "http://search:7700",
	"key": "the-private-key"
}
```

##### Algolia

```json
{
	"type": "algolia",
	"appId": "Application-Id",
	"key": "secret-api-key"
}
```

##### ElasticSearch

New typeless behaviour, use collection names as index name.

```json
{
	"type": "elasticsearch",
	"host": "http://search:9200/"
}
```

##### ElasticSearch for 5.x and 6.x

Old type behaviour, use collection names as types.

```json
{
	"type": "elasticsearch_legacy",
	"host": "http://search:9200/projectindex"
}
```
