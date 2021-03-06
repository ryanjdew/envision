'use strict';

let entities = fn.collection('http://marklogic.com/entity-services/models').toArray().map(e => e.toObject())
let edges = {}
let nodes = {}

function buildProperties(entityName, entity, definitions) {
	const props = entity.properties

	return Object.keys(props).map(propName => {
		const prop = props[propName]
		const ref = prop['$ref'] || (prop.items && prop.items['$ref'])
		const isExternal = ref && !ref.startsWith('#/definitions')
		if (ref && isExternal) {
			const from = entityName.toLowerCase()
			const to = ref.replace(/.*\/([^\/]+)/, '$1').toLowerCase()
			const edgeName = `${from}-${propName}-${to}`
			const edge = {
				id: edgeName,
				label: propName,
				from: from,
				to: to,
				cardinality: prop.datatype === 'array' ? '1:Many': '1:1'
			}
			edges[edgeName] = edge
			return null;
		}
		let type = null
		let isStructured = false
		if (ref && !isExternal) {
			const otherName = ref.replace(/.*\/([^\/]+)/, '$1')
			type = otherName;
			isStructured = true;
		}
		else if (prop.datatype === 'array' && prop.items && prop.items.datatype) {
			type = prop.items.datatype;
		}
		else {
			type = prop.datatype;
		}

		let newProp = {
			_propId: sem.uuidString(),
			name: propName,
			type: type
		}

		newProp = {
			...newProp,
			isArray: prop.datatype === 'array',
			isStructured: isStructured,
			isRequired: entity.required.indexOf(propName) >= 0,
			isPii: entity.pii.indexOf(propName) >= 0,
			isPrimaryKey: (entity.primaryKey && entity.primaryKey === propName),
			isElementRangeIndex: entity.elementRangeIndex.indexOf(propName) >= 0,
			isRangeIndex: entity.rangeIndex.indexOf(propName) >= 0,
			isWordLexicon: entity.wordLexicon.indexOf(propName) >= 0,
			description: prop.description || null,
			collation: prop.collation || (prop.items && prop.items.collation)
		}

		return newProp
	}).filter(p => p !== null)
}
entities.forEach(e => {
	const entityName = e.info.title
	const entity = e.definitions[entityName]
	const properties = buildProperties(entityName, entity, e.definitions)

	nodes[entityName.toLowerCase()] = {
		label: entityName,
		entityName: entityName,
		type: "entity",
		id: entityName.toLowerCase(),
		version: e.info.version || '0.0.1',
		baseUri: e.info.baseUri || 'http://marklogic.com/envision/',
		description: e.info && e.info.description,
		properties
	}
})

const model = {
	name: `My Hub Model`,
	nodes,
	edges
}

model
