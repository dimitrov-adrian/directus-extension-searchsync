module.exports = {
	server: {
		type: "meilisearch",
		host: "http://search:7700",
		key: "secretkey1234",
	},
	reindexOnStart: true,
	collections: {
		products: {
			filter: {
				status: "published",
			},
			fields: [
				"title",
				"thumbnail.id",
				"thumbnail.name",
				"category.title",
				"description",
			],
			transform: formatter,
		},
		blog_posts: {
			filter: {
				status: "published",
			},
			fields: ["title", "category.title", "description", "tags.tags_id.tag"],
			transform: formatter,
		},
	},
};

function formatter(value, { flattenObject }) {
	value = flattenObject(value);
	return value;
}
