const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const yamlFilePath = path.join(__dirname, '/fixtures/github/make_dispatches.yaml');
const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');
const yamlData = yaml.load(yamlContent);

const schemaFilePath = path.join(__dirname, '/schema/jsonschema.json');
const schema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf8'));

const ajv = new Ajv();
const validate = ajv.compile(schema);

const valid = validate(yamlData);

if (valid) {
  console.log('Successful validation');
} else {
  console.error('Validation error:', validate.errors);
  process.exit(1);
}


